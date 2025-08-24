const db = require('../config/db');
const Prescription = require('../models/prescription.model');
const Appointment = require('../models/appointment.model');
const Notification = require('../models/notification.model');
const getDoctorIdFromUserId = require('../utils/getDoctorId');
const PDFDocument = require('pdfkit');
const prescriptionService = require('../services/prescriptionService');
const {
    createPrescriptionSchema,
    updatePrescriptionSchema,
    prescriptionParamsSchema
} = require('../validations/prescriptionValidation');

exports.getOwnPrescriptions = async (req, res, next) => {
    try {
        const userId = req.user.id;
        const { page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = req.query;

        const pageNum = parseInt(page);
        const limitNum = parseInt(limit);
        const offset = (pageNum - 1) * limitNum;

        // Validate sort parameters
        const allowedSortFields = ['created_at', 'medication', 'doctor_name'];
        const allowedOrder = ['ASC', 'DESC'];

        const sortField = allowedSortFields.includes(sortBy) ? sortBy : 'created_at';
        const sortOrder = allowedOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

        const result = await prescriptionService.getPatientPrescriptions(
            userId,
            { page: pageNum, limit: limitNum, sortBy: sortField, order: sortOrder }
        );

        res.json({
            success: true,
            data: result.prescriptions,
            pagination: {
                currentPage: pageNum,
                totalPages: Math.ceil(result.total / limitNum),
                totalItems: result.total,
                itemsPerPage: limitNum
            }
        });
    } catch (err) {
        console.error('Get prescriptions error:', err.message);
        next(err);
    }
};

exports.addPrescription = async (req, res, next) => {
    try {
        // Validate request body
        const { error, value } = createPrescriptionSchema.validate(req.body);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: error.details.map(detail => detail.message)
            });
        }

        const { appointment_id, medication, dosage, notes } = value;
        const userId = req.user.id;

        const result = await prescriptionService.createPrescription(
            userId,
            appointment_id,
            medication,
            dosage,
            notes
        );

        res.status(201).json({
            success: true,
            message: "Prescription added successfully",
            data: { prescriptionId: result.prescriptionId }
        });

    } catch (error) {
        console.error("Error adding prescription:", error);
        next(error);
    }
};

exports.editPrescription = async (req, res, next) => {
    try {
        // Validate params
        const { error: paramsError, value: paramsValue } = prescriptionParamsSchema.validate(req.params);
        if (paramsError) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID'
            });
        }

        // Validate request body
        const { error: bodyError, value: bodyValue } = updatePrescriptionSchema.validate(req.body);
        if (bodyError) {
            return res.status(400).json({
                success: false,
                message: 'Validation error',
                errors: bodyError.details.map(detail => detail.message)
            });
        }

        const { prescription_id } = paramsValue;
        const { medication, dosage, notes } = bodyValue;
        const userId = req.user.id;

        await prescriptionService.updatePrescription(
            userId,
            prescription_id,
            medication,
            dosage,
            notes
        );

        res.json({ success: true, message: "Prescription updated successfully" });

    } catch (error) {
        console.error("Error editing prescription:", error);
        next(error);
    }
};

exports.deletePrescription = async (req, res, next) => {
    try {
        // Validate params
        const { error, value } = prescriptionParamsSchema.validate(req.params);
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID'
            });
        }

        const { prescription_id } = value;
        const userId = req.user.id;

        await prescriptionService.deletePrescription(userId, prescription_id);

        res.json({ success: true, message: "Prescription deleted successfully" });

    } catch (error) {
        console.error("Error deleting prescription:", error);
        next(error);
    }
};

exports.getPrescriptionPDF = async (req, res, next) => {
    try {
        // Validate params
        const { error, value } = prescriptionParamsSchema.validate({ prescription_id: req.params.id });
        if (error) {
            return res.status(400).json({
                success: false,
                message: 'Invalid prescription ID'
            });
        }

        const prescriptionId = value.prescription_id;
        const userId = req.user.sub;
        const role = req.user.role;

        // Get prescription with ownership check
        const [rows] = await db.execute(`
            SELECT p.*, 
                   d.user_id AS doctor_user_id,
                   pt.user_id AS patient_user_id,
                   u.name AS doctor_name,
                   up.name AS patient_name
            FROM prescriptions p
            JOIN doctors d ON p.doctor_id = d.id
            JOIN patients pt ON p.patient_id = pt.id
            JOIN users u ON d.user_id = u.id
            JOIN users up ON pt.user_id = up.id
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

        doc.fontSize(18).text('Medical Prescription', { align: 'center' });
        doc.moveDown();
        doc.fontSize(12);
        doc.text(`Doctor: ${prescription.doctor_name}`);
        doc.text(`Patient: ${prescription.patient_name}`);
        doc.text(`Date: ${new Date(prescription.created_at).toLocaleDateString()}`);
        doc.moveDown();
        doc.text(`Medication: ${prescription.medication}`);
        doc.text(`Dosage: ${prescription.dosage}`);
        if (prescription.notes) {
            doc.text(`Notes: ${prescription.notes}`);
        }
        doc.end();

    } catch (error) {
        console.error('PDF generation error:', error);
        next(error);
    }
};