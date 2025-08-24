const db = require('../config/db');

const Appointment = {
    create: async ({ patient_id, doctor_id, date_time, reason, status = 'pending' }) => {
        const sql = `
            INSERT INTO appointments (patient_id, doctor_id, date_time, reason, status, created_at)
            VALUES (?, ?, ?, ?, ?, NOW())
        `;
        const [result] = await db.execute(sql, [patient_id, doctor_id, date_time, reason, status]);
        return result.insertId;
    },

    findById: async (id) => {
        const [rows] = await db.execute('SELECT * FROM appointments WHERE id = ? LIMIT 1', [id]);
        return rows[0] || null;
    },

    findByPatientId: async (patientId, options = {}) => {
        const { limit = 10, offset = 0, sortBy = 'date_time', order = 'DESC' } = options;

        const sql = `
            SELECT 
                a.id, 
                a.date_time, 
                a.status, 
                a.reason,
                a.created_at,
                u.name AS doctor_name, 
                d.specialty
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE a.patient_id = ?
            ORDER BY ${sortBy} ${order}
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.execute(sql, [patientId, limit, offset]);
        return rows;
    },

    findByDoctorId: async (doctorId, options = {}) => {
        const { limit = 10, offset = 0, sortBy = 'date_time', order = 'DESC' } = options;

        const sql = `
            SELECT 
                a.id, 
                a.date_time, 
                a.status, 
                a.reason,
                a.created_at,
                u.name AS patient_name,
                p.phone AS patient_phone
            FROM appointments a
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
            WHERE a.doctor_id = ?
            ORDER BY ${sortBy} ${order}
            LIMIT ? OFFSET ?
        `;

        const [rows] = await db.execute(sql, [doctorId, limit, offset]);
        return rows;
    },

    cancel: async (appointmentId, patientId) => {
        const sql = `
            UPDATE appointments
            SET status = 'cancelled'
            WHERE id = ? AND patient_id = ?
        `;
        const [result] = await db.execute(sql, [appointmentId, patientId]);
        return result.affectedRows > 0;
    },

    updateStatus: async (appointmentId, status) => {
        const sql = `UPDATE appointments SET status = ? WHERE id = ?`;
        const [result] = await db.execute(sql, [status, appointmentId]);
        return result.affectedRows > 0;
    },

    checkConflict: async (doctorId, dateTime, excludeId = null) => {
        let sql = `
            SELECT id FROM appointments 
            WHERE doctor_id = ? AND date_time = ? AND status != 'cancelled'
        `;
        const params = [doctorId, dateTime];

        if (excludeId) {
            sql += ` AND id != ?`;
            params.push(excludeId);
        }

        const [rows] = await db.execute(sql, params);
        return rows.length > 0;
    },

    countByPatientId: async (patientId) => {
        const sql = `SELECT COUNT(*) as total FROM appointments WHERE patient_id = ?`;
        const [rows] = await db.execute(sql, [patientId]);
        return rows[0].total;
    },

    countByDoctorId: async (doctorId) => {
        const sql = `SELECT COUNT(*) as total FROM appointments WHERE doctor_id = ?`;
        const [rows] = await db.execute(sql, [doctorId]);
        return rows[0].total;
    }
};

module.exports = Appointment;