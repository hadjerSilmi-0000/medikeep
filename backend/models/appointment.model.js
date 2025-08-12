const db = require('../config/db');

const Appointment = {
    create: (patientId, doctorId, dateTime, reason) => {
        return db.execute(
            `INSERT INTO appointments (patient_id, doctor_id, date_time, reason)
             VALUES (?, ?, ?, ?)`,
            [patientId, doctorId, dateTime, reason]
        );
    },

    findByPatientId: (patientId) => {
        return db.execute(
            `SELECT a.*, d.name AS doctor_name
             FROM appointments a
             JOIN users d ON a.doctor_id = d.id
             WHERE a.patient_id = ?
             ORDER BY a.date_time DESC`,
            [patientId]
        );
    },

    cancel: (appointmentId, patientId) => {
        return db.execute(
            `UPDATE appointments
             SET status = 'cancelled'
             WHERE id = ? AND patient_id = ?`,
            [appointmentId, patientId]
        );
    },

    findById: async (id) => {
        const sql = `SELECT * FROM appointments WHERE id = ?`;
        const [rows] = await db.execute(sql, [id]);
        return rows.length ? rows[0] : null;
    },
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
    }
};

module.exports = Appointment;
