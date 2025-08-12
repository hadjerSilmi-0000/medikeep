const db = require('../config/db');
const Prescription = require('../models/prescription.model');
const Appointment = require('../models/appointment.model');
const Notification = require('../models/notification.model');
const getDoctorIdFromUserId = require('../utils/getDoctorId');
const PDFDocument = require('pdfkit');


exports.getOwnPrescriptions = async (req, res) => {
    try {
        const patientId = req.user.id;

        const [prescriptions] = await db.execute(`
            SELECT 
                p.id,
                p.medication,
                p.dosage,
                p.notes,
                p.created_at,
                u.name AS doctor_name
            FROM prescriptions p
            JOIN users u ON p.doctor_id = u.id
            WHERE p.patient_id = ?
            ORDER BY p.created_at DESC
        `, [patientId]);

        res.json({ success: true, data: prescriptions });
    } catch (err) {
        console.error('Get prescriptions error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.addPrescription = async (req, res) => {
    try {
        const { appointment_id, medication, dosage, notes } = req.body;

        if (!appointment_id || !medication || !dosage) {
            return res.status(400).json({ success: false, message: "Required fields missing" });
        }

        // Map user → doctor
        const doctorId = await getDoctorIdFromUserId(req.user.id);
        if (!doctorId) {
            return res.status(403).json({ success: false, message: "You are not a doctor" });
        }

        // Get appointment
        const appointment = await Appointment.findById(appointment_id);
        if (!appointment) {
            return res.status(404).json({ success: false, message: "Appointment not found" });
        }

        // Check ownership
        if (appointment.doctor_id !== doctorId) {
            return res.status(403).json({ success: false, message: "Not your appointment" });
        }

        // Add prescription
        const newPrescriptionId = await Prescription.create(
            appointment_id,
            doctorId,
            appointment.patient_id,
            medication,
            dosage,
            notes || ''
        );

        // Get doctor name
        const [[doctorUser]] = await db.execute(
            'SELECT name FROM users WHERE id = ?',
            [req.user.id]
        );
        const doctorName = doctorUser ? doctorUser.name : 'Your Doctor';

        // 📌 Create notification for patient
        await Notification.create({
            user_id: appointment.patient_user_id || (await getPatientUserId(appointment.patient_id)),
            type: 'prescription',
            title: 'New Prescription Added',
            body: `Dr. ${doctorName} has added a new prescription for you.`,
            data: { prescriptionId: newPrescriptionId }
        });

        res.status(201).json({ success: true, message: "Prescription added successfully" });

    } catch (error) {
        console.error("Error adding prescription:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

// EDIT Prescription
exports.editPrescription = async (req, res) => {
    try {
        const { prescription_id } = req.params;
        const { medication, dosage, notes } = req.body;

        // 1️⃣ Map user → doctor
        const doctorId = await getDoctorIdFromUserId(req.user.id);
        if (!doctorId) {
            return res.status(403).json({ success: false, message: "You are not a doctor" });
        }

        // 2️⃣ Find the prescription
        const prescription = await Prescription.findById(prescription_id);
        if (!prescription) {
            return res.status(404).json({ success: false, message: "Prescription not found" });
        }

        // 3️⃣ Check doctor ownership
        if (prescription.doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "You can only edit prescriptions you created"
            });
        }

        // 4️⃣ Update prescription
        await Prescription.update(prescription_id, medication, dosage, notes || '');

        res.json({ success: true, message: "Prescription updated successfully" });

    } catch (error) {
        console.error("Error editing prescription:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

//  DELETE Prescription
exports.deletePrescription = async (req, res) => {
    try {
        const { prescription_id } = req.params;

        // 1️⃣ Map user → doctor
        const doctorId = await getDoctorIdFromUserId(req.user.id);
        if (!doctorId) {
            return res.status(403).json({ success: false, message: "You are not a doctor" });
        }

        // 2️⃣ Find the prescription
        const prescription = await Prescription.findById(prescription_id);
        if (!prescription) {
            return res.status(404).json({ success: false, message: "Prescription not found" });
        }

        // 3️⃣ Check doctor ownership
        if (prescription.doctor_id !== doctorId) {
            return res.status(403).json({
                success: false,
                message: "You can only delete prescriptions you created"
            });
        }

        // 4️⃣ Delete prescription
        await Prescription.delete(prescription_id);

        res.json({ success: true, message: "Prescription deleted successfully" });

    } catch (error) {
        console.error("Error deleting prescription:", error);
        res.status(500).json({ success: false, message: "Server error" });
    }
};

exports.getPrescriptionPDF = async (req, res) => {
    const prescriptionId = req.params.id;
    const userId = req.user.sub; // from JWT
    const role = req.user.role;

    try {
        // Get prescription with doctor & patient user IDs
        const [rows] = await db.query(`
            SELECT p.*, 
                   d.user_id AS doctor_user_id,
                   pt.user_id AS patient_user_id
            FROM prescriptions p
            JOIN doctors d ON p.doctor_id = d.id
            JOIN patients pt ON p.patient_id = pt.id
            WHERE p.id = ?
        `, [prescriptionId]);

        if (rows.length === 0) {
            return res.status(404).json({ success: false, message: 'Prescription not found' });
        }

        const prescription = rows[0];

        // Ownership check
        if (
            (role === 'doctor' && prescription.doctor_user_id !== userId) &&
            (role === 'patient' && prescription.patient_user_id !== userId)
        ) {
            return res.status(403).json({ success: false, message: 'Access denied' });
        }

        // Generate PDF
        const doc = new PDFDocument();
        res.setHeader('Content-Type', 'application/pdf');
        res.setHeader('Content-Disposition', `attachment; filename=prescription_${prescriptionId}.pdf`);
        doc.pipe(res);

        doc.fontSize(18).text('Prescription', { align: 'center' });
        doc.moveDown();
        doc.text(`Medication: ${prescription.medication}`);
        doc.text(`Dosage: ${prescription.dosage}`);
        doc.text(`Notes: ${prescription.notes}`);
        doc.end();

    } catch (error) {
        console.error(error);
        res.status(500).json({ success: false, message: 'Server error' });
    }
};


