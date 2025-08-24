const db = require('../config/db');

const Prescription = {
    create: async (appointmentId, doctorId, patientId, medication, dosage, notes) => {
        const [result] = await db.execute(
            `INSERT INTO prescriptions 
             (appointment_id, doctor_id, patient_id, medication, dosage, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [appointmentId, doctorId, patientId, medication, dosage, notes]
        );
        return result.insertId;
    },

    findByPatientId: async (patientId) => {
        const [rows] = await db.execute(
            `SELECT * FROM prescriptions WHERE patient_id = ?`,
            [patientId]
        );
        return rows;
    },

    findByPatientIdWithPagination: async (patientId, { limit, offset, sortBy, order }) => {
        const sortField = sortBy === 'doctor_name' ? 'u.name' : `p.${sortBy}`;

        const [rows] = await db.execute(`
            SELECT 
                p.id,
                p.medication,
                p.dosage,
                p.notes,
                p.created_at,
                u.name AS doctor_name
            FROM prescriptions p
            JOIN doctors d ON p.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE p.patient_id = ?
            ORDER BY ${sortField} ${order}
            LIMIT ? OFFSET ?
        `, [patientId, limit, offset]);

        return rows;
    },

    countByPatientId: async (patientId) => {
        const [rows] = await db.execute(
            `SELECT COUNT(*) as total FROM prescriptions WHERE patient_id = ?`,
            [patientId]
        );
        return rows[0].total;
    },

    findById: async (id) => {
        const [rows] = await db.execute(
            "SELECT * FROM prescriptions WHERE id = ?",
            [id]
        );
        return rows[0];
    },
    update: async (id, medication, dosage, notes) => {
        const [result] = await db.execute(
            "UPDATE prescriptions SET medication = ?, dosage = ?, notes = ? WHERE id = ?",
            [medication, dosage, notes, id]
        );
        return result.affectedRows > 0;
    },


    delete: async (id) => {
        const [result] = await db.execute(
            "DELETE FROM prescriptions WHERE id = ?",
            [id]
        );
        return result.affectedRows > 0;
    },

    findByDoctorId: async (doctorId) => {
        const [rows] = await db.execute(
            `SELECT 
                p.*,
                pt.first_name,
                pt.last_name,
                u.name AS patient_name
            FROM prescriptions p
            JOIN patients pt ON p.patient_id = pt.id
            JOIN users u ON pt.user_id = u.id
            WHERE p.doctor_id = ?
            ORDER BY p.created_at DESC`,
            [doctorId]
        );
        return rows;
    }
};

module.exports = Prescription;