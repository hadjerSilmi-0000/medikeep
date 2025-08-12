const db = require('../config/db');

exports.getDoctorAnalytics = async (req, res) => {
    try {
        // Debug: Check what's in req.user
        console.log("Full req.user object:", req.user);
        console.log("Available properties:", Object.keys(req.user || {}));

        if (!req.user) {
            return res.status(401).json({ success: false, message: 'User not authenticated' });
        }

        const role = req.user.role;

        if (role !== 'doctor') {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Try different possible property names for user ID
        let userId = req.user.sub || req.user.id || req.user.userId || req.user.user_id;

        console.log("Found userId:", userId, "Type:", typeof userId);

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token',
                debug: { userObject: req.user }
            });
        }

        // Convert to integer if it's a string
        if (typeof userId === 'string') {
            userId = parseInt(userId);
        }

        // Query to find doctor by user_id
        const [doctorRows] = await db.query(
            'SELECT id, user_id FROM doctors WHERE user_id = ?',
            [userId]
        );

        console.log("Query result:", doctorRows);
        console.log("Number of doctors found:", doctorRows.length);

        if (doctorRows.length === 0) {
            return res.status(404).json({
                success: false,
                message: 'Doctor not found'
            });
        }

        const doctorId = doctorRows[0].id;
        console.log("Doctor ID used:", doctorId);

        // Query analytics
        const [[{ patientCount }]] = await db.query(
            'SELECT COUNT(DISTINCT patient_id) AS patientCount FROM appointments WHERE doctor_id = ?',
            [doctorId]
        );

        const [[{ upcomingAppointments }]] = await db.query(
            'SELECT COUNT(*) AS upcomingAppointments FROM appointments WHERE doctor_id = ? AND date_time >= CURDATE()',
            [doctorId]
        );

        const [[{ prescriptionCount }]] = await db.query(
            'SELECT COUNT(*) AS prescriptionCount FROM prescriptions WHERE doctor_id = ?',
            [doctorId]
        );

        res.json({
            success: true,
            data: {
                patientCount,
                upcomingAppointments,
                prescriptionCount
            }
        });

    } catch (error) {
        console.error('Error in getDoctorAnalytics:', error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};