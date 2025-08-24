const db = require('../config/db');

class DoctorModel {
    static async create(doctorData) {
        const { user_id, specialty, bio, phone } = doctorData;

        const [result] = await db.execute(
            'INSERT INTO doctors (user_id, specialty, bio, phone) VALUES (?, ?, ?, ?)',
            [user_id, specialty, bio, phone]
        );

        return result.insertId;
    }

    //Find doctor by user ID
    static async findByUserId(userId) {
        const [rows] = await db.execute(
            `SELECT 
                d.id,
                d.user_id,
                d.specialty,
                d.bio,
                d.phone,
                d.created_at,
                d.updated_at,
                u.name,
                u.email,
                u.role
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             WHERE d.user_id = ?`,
            [userId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    //Find doctor by ID
    static async findById(doctorId) {
        const [rows] = await db.execute(
            `SELECT 
                d.id,
                d.user_id,
                d.specialty,
                d.bio,
                d.phone,
                d.created_at,
                d.updated_at,
                u.name,
                u.email,
                u.role
             FROM doctors d
             JOIN users u ON d.user_id = u.id
             WHERE d.id = ?`,
            [doctorId]
        );

        return rows.length > 0 ? rows[0] : null;
    }

    // Update doctor profile
    static async updateByUserId(userId, updateData) {
        const { specialty, bio, phone } = updateData;

        const [result] = await db.execute(
            'UPDATE doctors SET specialty = COALESCE(?, specialty), bio = COALESCE(?, bio), phone = COALESCE(?, phone), updated_at = NOW() WHERE user_id = ?',
            [specialty, bio, phone, userId]
        );

        return result.affectedRows > 0;
    }

    //Get doctor dashboard statistics
    static async getDashboardStats(doctorId) {
        // Total unique patients linked to doctor
        const [patients] = await db.execute(
            `SELECT COUNT(DISTINCT patient_user_id) AS totalPatients
             FROM doctor_patient_link
             WHERE doctor_id = ? AND is_active = 1`,
            [doctorId]
        );

        // Upcoming appointments
        const [upcomingAppointments] = await db.execute(
            `SELECT COUNT(*) AS upcomingCount
             FROM appointments
             WHERE doctor_id = ? AND date_time > NOW()`,
            [doctorId]
        );

        // Total prescriptions
        const [prescriptions] = await db.execute(
            `SELECT COUNT(*) AS totalPrescriptions
             FROM prescriptions
             WHERE doctor_id = ?`,
            [doctorId]
        );

        // Today's appointments
        const [todayAppointments] = await db.execute(
            `SELECT a.id, a.date_time, u.name AS patient_name
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             WHERE a.doctor_id = ? 
             AND DATE(a.date_time) = CURDATE()
             ORDER BY a.date_time ASC`,
            [doctorId]
        );

        return {
            totalPatients: patients[0].totalPatients || 0,
            upcomingAppointments: upcomingAppointments[0].upcomingCount || 0,
            totalPrescriptions: prescriptions[0].totalPrescriptions || 0,
            todayAppointments
        };
    }

    // Get linked patients with pagination and filters
    static async getLinkedPatients(doctorId, options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            gender = null,
            ageMin = null,
            ageMax = null,
            sortBy = 'name',
            sortOrder = 'asc'
        } = options;

        const offset = (page - 1) * limit;

        // Sorting whitelist
        const sortMap = {
            name: 'u.name',
            birthdate: 'p.birthdate',
            linked_at: 'dpl.created_at'
        };
        const sortColumn = sortMap[sortBy] || 'u.name';
        const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Build WHERE conditions
        const where = ['dpl.doctor_id = ?', 'dpl.is_active = 1'];
        const params = [doctorId];

        // Search filter
        if (search.trim()) {
            where.push('(u.name LIKE ? OR u.email LIKE ?)');
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern);
        }

        // Gender filter
        if (gender) {
            where.push('p.gender = ?');
            params.push(gender);
        }

        // Age filters
        if (ageMin !== null && ageMax !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) BETWEEN ? AND ?');
            params.push(ageMin, ageMax);
        } else if (ageMin !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) >= ?');
            params.push(ageMin);
        } else if (ageMax !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) <= ?');
            params.push(ageMax);
        }

        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM doctor_patient_link dpl
            JOIN users u ON dpl.patient_user_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            ${whereClause}
        `;
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total || 0;
        const totalPages = Math.ceil(total / limit);

        // Get paginated data
        const dataQuery = `
            SELECT
                u.id AS user_id,
                u.name,
                u.email,
                p.birthdate,
                p.gender,
                p.phone,
                p.address,
                TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
                dpl.created_at AS linked_at
            FROM doctor_patient_link dpl
            JOIN users u ON dpl.patient_user_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            ${whereClause}
            ORDER BY ${sortColumn} ${order}
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, limit, offset];
        const [patients] = await db.execute(dataQuery, dataParams);

        return {
            patients,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }

    // Check if patient is linked to doctor
    static async isPatientLinked(doctorId, patientUserId) {
        const [rows] = await db.execute(
            'SELECT id FROM doctor_patient_link WHERE doctor_id = ? AND patient_user_id = ? AND is_active = 1',
            [doctorId, patientUserId]
        );

        return rows.length > 0;
    }
    //Link patient to doctor
    static async linkPatient(doctorId, patientUserId) {
        const [result] = await db.execute(
            'INSERT INTO doctor_patient_link (doctor_id, patient_user_id) VALUES (?, ?)',
            [doctorId, patientUserId]
        );

        return result.affectedRows > 0;
    }


    //Unlink patient from doctor (soft delete)
    static async unlinkPatient(doctorId, patientUserId) {
        const [result] = await db.execute(
            'UPDATE doctor_patient_link SET is_active = 0, unlinked_at = NOW() WHERE doctor_id = ? AND patient_user_id = ?',
            [doctorId, patientUserId]
        );

        return result.affectedRows > 0;
    }
    //Get all doctors with pagination
    static async getAll(options = {}) {
        const {
            page = 1,
            limit = 10,
            search = '',
            specialty = null,
            sortBy = 'name',
            sortOrder = 'asc'
        } = options;

        const offset = (page - 1) * limit;

        // Sorting whitelist
        const sortMap = {
            name: 'u.name',
            specialty: 'd.specialty',
            created_at: 'd.created_at'
        };
        const sortColumn = sortMap[sortBy] || 'u.name';
        const order = sortOrder.toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Build WHERE conditions
        const where = [];
        const params = [];

        // Search filter
        if (search.trim()) {
            where.push('(u.name LIKE ? OR u.email LIKE ? OR d.specialty LIKE ?)');
            const searchPattern = `%${search.trim()}%`;
            params.push(searchPattern, searchPattern, searchPattern);
        }

        // Specialty filter
        if (specialty) {
            where.push('d.specialty = ?');
            params.push(specialty);
        }

        const whereClause = where.length ? 'WHERE ' + where.join(' AND ') : '';

        // Get total count
        const countQuery = `
            SELECT COUNT(*) AS total
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            ${whereClause}
        `;
        const [countResult] = await db.execute(countQuery, params);
        const total = countResult[0].total || 0;
        const totalPages = Math.ceil(total / limit);

        // Get paginated data
        const dataQuery = `
            SELECT
                d.id,
                d.user_id,
                d.specialty,
                d.bio,
                d.phone,
                d.created_at,
                d.updated_at,
                u.name,
                u.email
            FROM doctors d
            JOIN users u ON d.user_id = u.id
            ${whereClause}
            ORDER BY ${sortColumn} ${order}
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, limit, offset];
        const [doctors] = await db.execute(dataQuery, dataParams);

        return {
            doctors,
            pagination: {
                total,
                page,
                limit,
                totalPages,
                hasNext: page < totalPages,
                hasPrev: page > 1
            }
        };
    }
}

module.exports = DoctorModel;