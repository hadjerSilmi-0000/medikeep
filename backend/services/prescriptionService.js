const db = require('../config/db');
const Prescription = require('../models/prescription.model');
const Appointment = require('../models/appointment.model');
const Notification = require('../models/notification.model');
const getDoctorIdFromUserId = require('../utils/getDoctorId');

class PrescriptionService {

    async getPatientPrescriptions(userId, paginationOptions) {
        const { page, limit, sortBy, order } = paginationOptions;
        const offset = (page - 1) * limit;

        // Get patient_id using user_id
        const [patientRows] = await db.execute(
            "SELECT id FROM patients WHERE user_id = ?",
            [userId]
        );

        if (patientRows.length === 0) {
            return { prescriptions: [], total: 0 };
        }

        const patientId = patientRows[0].id;

        // Get paginated prescriptions
        const prescriptions = await Prescription.findByPatientIdWithPagination(
            patientId,
            { limit, offset, sortBy, order }
        );

        // Get total count
        const total = await Prescription.countByPatientId(patientId);

        return { prescriptions, total };
    }

    async createPrescription(userId, appointmentId, medication, dosage, notes = '') {
        // Get doctor ID from user ID
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) {
            const error = new Error("You are not authorized as a doctor");
            error.statusCode = 403;
            throw error;
        }

        // Get appointment details
        const appointment = await Appointment.findById(appointmentId);
        if (!appointment) {
            const error = new Error("Appointment not found");
            error.statusCode = 404;
            throw error;
        }

        // Check doctor ownership of appointment
        if (appointment.doctor_id !== doctorId) {
            const error = new Error("You can only add prescriptions for your own appointments");
            error.statusCode = 403;
            throw error;
        }

        // Check if appointment is completed or in progress
        if (appointment.status === 'cancelled') {
            const error = new Error("Cannot add prescription to cancelled appointment");
            error.statusCode = 400;
            throw error;
        }

        // Create prescription
        const prescriptionId = await Prescription.create(
            appointmentId,
            doctorId,
            appointment.patient_id,
            medication,
            dosage,
            notes
        );

        // Get doctor name for notification
        const [doctorRows] = await db.execute(
            'SELECT name FROM users WHERE id = ?',
            [userId]
        );
        const doctorName = doctorRows.length > 0 ? doctorRows[0].name : 'Your Doctor';

        // Get patient user ID for notification
        const patientUserId = await this.getPatientUserId(appointment.patient_id);

        // Create notification for patient
        if (patientUserId) {
            await Notification.create({
                user_id: patientUserId,
                type: 'prescription',
                title: 'New Prescription Added',
                body: `Dr. ${doctorName} has added a new prescription for you.`,
                data: { prescriptionId }
            });
        }

        return { prescriptionId };
    }

    async updatePrescription(userId, prescriptionId, medication, dosage, notes = '') {
        // Get doctor ID from user ID
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) {
            const error = new Error("You are not authorized as a doctor");
            error.statusCode = 403;
            throw error;
        }

        // Find prescription
        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            const error = new Error("Prescription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check doctor ownership
        if (prescription.doctor_id !== doctorId) {
            const error = new Error("You can only edit prescriptions you created");
            error.statusCode = 403;
            throw error;
        }

        // Update prescription
        const success = await Prescription.update(prescriptionId, medication, dosage, notes);
        if (!success) {
            const error = new Error("Failed to update prescription");
            error.statusCode = 500;
            throw error;
        }

        return { success: true };
    }

    async deletePrescription(userId, prescriptionId) {
        // Get doctor ID from user ID
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) {
            const error = new Error("You are not authorized as a doctor");
            error.statusCode = 403;
            throw error;
        }

        // Find prescription
        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            const error = new Error("Prescription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check doctor ownership
        if (prescription.doctor_id !== doctorId) {
            const error = new Error("You can only delete prescriptions you created");
            error.statusCode = 403;
            throw error;
        }

        // Delete prescription
        const success = await Prescription.delete(prescriptionId);
        if (!success) {
            const error = new Error("Failed to delete prescription");
            error.statusCode = 500;
            throw error;
        }

        return { success: true };
    }

    async getDoctorPrescriptions(userId, paginationOptions = {}) {
        const { page = 1, limit = 10, sortBy = 'created_at', order = 'DESC' } = paginationOptions;

        // Get doctor ID from user ID
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) {
            const error = new Error("You are not authorized as a doctor");
            error.statusCode = 403;
            throw error;
        }

        const prescriptions = await Prescription.findByDoctorId(doctorId);
        return { prescriptions, total: prescriptions.length };
    }

    async getPrescriptionById(prescriptionId, userId, userRole) {
        const prescription = await Prescription.findById(prescriptionId);
        if (!prescription) {
            const error = new Error("Prescription not found");
            error.statusCode = 404;
            throw error;
        }

        // Check ownership based on role
        if (userRole === 'doctor') {
            const doctorId = await getDoctorIdFromUserId(userId);
            if (prescription.doctor_id !== doctorId) {
                const error = new Error("Access denied");
                error.statusCode = 403;
                throw error;
            }
        } else if (userRole === 'patient') {
            const [patientRows] = await db.execute(
                "SELECT id FROM patients WHERE user_id = ?",
                [userId]
            );
            if (patientRows.length === 0 || prescription.patient_id !== patientRows[0].id) {
                const error = new Error("Access denied");
                error.statusCode = 403;
                throw error;
            }
        }

        return prescription;
    }

    // Helper method to get patient user ID
    async getPatientUserId(patientId) {
        try {
            const [rows] = await db.execute(
                'SELECT user_id FROM patients WHERE id = ?',
                [patientId]
            );
            return rows.length > 0 ? rows[0].user_id : null;
        } catch (error) {
            console.error('Error getting patient user ID:', error);
            return null;
        }
    }
}

module.exports = new PrescriptionService();