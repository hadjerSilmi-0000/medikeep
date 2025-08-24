const db = require('../config/db');
const getDoctorIdFromUserId = require('../utils/getDoctorId');

class AnalyticsService {
    constructor() {
        // In-memory cache for expensive queries
        this.cache = new Map();
        this.cacheExpiry = new Map();
        this.cacheDuration = 5 * 60 * 1000; // 5 minutes
    }

    // Helper method for caching
    getCacheKey(prefix, params = {}) {
        return `${prefix}_${JSON.stringify(params)}`;
    }

    isExpired(key) {
        const expiry = this.cacheExpiry.get(key);
        return !expiry || Date.now() > expiry;
    }

    setCache(key, data) {
        this.cache.set(key, data);
        this.cacheExpiry.set(key, Date.now() + this.cacheDuration);

        // Clean old cache entries
        setTimeout(() => {
            if (this.isExpired(key)) {
                this.cache.delete(key);
                this.cacheExpiry.delete(key);
            }
        }, this.cacheDuration);
    }

    getCache(key) {
        if (this.isExpired(key)) {
            this.cache.delete(key);
            this.cacheExpiry.delete(key);
            return null;
        }
        return this.cache.get(key);
    }

    async getDoctorAnalytics(userId) {
        const cacheKey = this.getCacheKey('doctor_analytics', { userId });
        const cached = this.getCache(cacheKey);
        if (cached) {
            return cached;
        }

        // Convert to integer if it's a string
        const userIdInt = typeof userId === 'string' ? parseInt(userId) : userId;

        // Get doctor ID
        const doctorId = await getDoctorIdFromUserId(userIdInt);
        if (!doctorId) {
            const error = new Error('Doctor not found');
            error.statusCode = 404;
            throw error;
        }

        // Parallel queries for better performance
        const [
            patientCountResult,
            upcomingAppointmentsResult,
            prescriptionCountResult,
            todayAppointmentsResult,
            completedAppointmentsResult,
            monthlyStatsResult
        ] = await Promise.all([
            // Unique patients count
            db.execute(
                'SELECT COUNT(DISTINCT patient_id) AS patientCount FROM appointments WHERE doctor_id = ?',
                [doctorId]
            ),
            // Upcoming appointments
            db.execute(
                'SELECT COUNT(*) AS upcomingAppointments FROM appointments WHERE doctor_id = ? AND date_time >= NOW() AND status != "cancelled"',
                [doctorId]
            ),
            // Total prescriptions
            db.execute(
                'SELECT COUNT(*) AS prescriptionCount FROM prescriptions WHERE doctor_id = ?',
                [doctorId]
            ),
            // Today's appointments
            db.execute(
                'SELECT COUNT(*) AS todayAppointments FROM appointments WHERE doctor_id = ? AND DATE(date_time) = CURDATE() AND status != "cancelled"',
                [doctorId]
            ),
            // Completed appointments
            db.execute(
                'SELECT COUNT(*) AS completedAppointments FROM appointments WHERE doctor_id = ? AND status = "completed"',
                [doctorId]
            ),
            // Monthly stats for last 6 months
            db.execute(`
                SELECT 
                    DATE_FORMAT(date_time, '%Y-%m') as month,
                    COUNT(*) as appointments,
                    COUNT(CASE WHEN status = 'completed' THEN 1 END) as completed
                FROM appointments 
                WHERE doctor_id = ? AND date_time >= DATE_SUB(NOW(), INTERVAL 6 MONTH)
                GROUP BY DATE_FORMAT(date_time, '%Y-%m')
                ORDER BY month DESC
            `, [doctorId])
        ]);

        const analytics = {
            patientCount: patientCountResult[0][0].patientCount,
            upcomingAppointments: upcomingAppointmentsResult[0][0].upcomingAppointments,
            prescriptionCount: prescriptionCountResult[0][0].prescriptionCount,
            todayAppointments: todayAppointmentsResult[0][0].todayAppointments,
            completedAppointments: completedAppointmentsResult[0][0].completedAppointments,
            monthlyStats: monthlyStatsResult[0]
        };

        this.setCache(cacheKey, analytics);
        return analytics;
    }

    async getPatientAnalytics(userId) {
        const cacheKey = this.getCacheKey('patient_analytics', { userId });
        const cached = this.getCache(cacheKey);
        if (cached) {
            return cached;
        }

        // Get patient ID
        const [patientRows] = await db.execute(
            'SELECT id FROM patients WHERE user_id = ?',
            [userId]
        );

        if (patientRows.length === 0) {
            const error = new Error('Patient not found');
            error.statusCode = 404;
            throw error;
        }

        const patientId = patientRows[0].id;

        // Parallel queries
        const [
            totalAppointmentsResult,
            upcomingAppointmentsResult,
            prescriptionCountResult,
            lastAppointmentResult,
            doctorsVisitedResult
        ] = await Promise.all([
            // Total appointments
            db.execute(
                'SELECT COUNT(*) AS totalAppointments FROM appointments WHERE patient_id = ?',
                [patientId]
            ),
            // Upcoming appointments
            db.execute(
                'SELECT COUNT(*) AS upcomingAppointments FROM appointments WHERE patient_id = ? AND date_time >= NOW() AND status != "cancelled"',
                [patientId]
            ),
            // Total prescriptions
            db.execute(
                'SELECT COUNT(*) AS prescriptionCount FROM prescriptions WHERE patient_id = ?',
                [patientId]
            ),
            // Last appointment
            db.execute(`
                SELECT a.date_time, u.name as doctor_name, a.status
                FROM appointments a
                JOIN doctors d ON a.doctor_id = d.id
                JOIN users u ON d.user_id = u.id
                WHERE a.patient_id = ?
                ORDER BY a.date_time DESC
                LIMIT 1
            `, [patientId]),
            // Unique doctors visited
            db.execute(
                'SELECT COUNT(DISTINCT doctor_id) AS doctorsVisited FROM appointments WHERE patient_id = ?',
                [patientId]
            )
        ]);

        const analytics = {
            totalAppointments: totalAppointmentsResult[0][0].totalAppointments,
            upcomingAppointments: upcomingAppointmentsResult[0][0].upcomingAppointments,
            prescriptionCount: prescriptionCountResult[0][0].prescriptionCount,
            lastAppointment: lastAppointmentResult[0][0] || null,
            doctorsVisited: doctorsVisitedResult[0][0].doctorsVisited
        };

        this.setCache(cacheKey, analytics);
        return analytics;
    }



    async getDashboardStats(userId, role) {
        // Route to appropriate analytics based on role
        switch (role) {
            case 'doctor':
                return this.getDoctorAnalytics(userId);
            case 'patient':
                return this.getPatientAnalytics(userId);
            default:
                const error = new Error('Invalid role');
                error.statusCode = 400;
                throw error;
        }
    }

    // Method to clear cache (useful for testing or when data changes)
    clearCache(pattern = null) {
        if (pattern) {
            for (const [key] of this.cache) {
                if (key.includes(pattern)) {
                    this.cache.delete(key);
                    this.cacheExpiry.delete(key);
                }
            }
        } else {
            this.cache.clear();
            this.cacheExpiry.clear();
        }
    }
}

module.exports = new AnalyticsService();