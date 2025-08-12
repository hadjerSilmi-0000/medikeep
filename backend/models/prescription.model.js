const db = require('../config/db');

const Prescription = {
    create: (appointmentId, doctorId, patientId, medication, dosage, notes) => {
        return db.execute(
            `INSERT INTO prescriptions 
             (appointment_id, doctor_id, patient_id, medication, dosage, notes)
             VALUES (?, ?, ?, ?, ?, ?)`,
            [appointmentId, doctorId, patientId, medication, dosage, notes]
        );
    },

    findByPatientId: (patientId) => {
        return db.execute(
            `SELECT * FROM prescriptions WHERE patient_id = ?`,
            [patientId]
        );
    },
    // Find prescription by ID
    findById(id) {
        return db.query("SELECT * FROM prescriptions WHERE id = ?", [id])
            .then(([rows]) => rows[0]);
    },

    // Update prescription
    update(id, medication, dosage, notes) {
        return db.query(
            "UPDATE prescriptions SET medication = ?, dosage = ?, notes = ? WHERE id = ?",
            [medication, dosage, notes, id]
        );
    },

    // Delete prescription
    delete(id) {
        return db.query("DELETE FROM prescriptions WHERE id = ?", [id]);
    },

};

module.exports = Prescription;
