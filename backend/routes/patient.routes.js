const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const appointmentController = require('../controllers/appointmentController');
const { bookAppointmentValidation } = require('../middlewares/validators');
const prescriptionController = require('../controllers/prescriptionController');

// Import patient validations
const {
    validateSearchDoctors,
    validateUpdateProfile,
    validateCompleteProfile
} = require('../validations/patientValidation');

// Search doctors 
router.get('/search-doctors', authenticate, checkRole(['patient']), validateSearchDoctors, patientController.searchDoctors);
// Take appointment
router.post('/appointments', authenticate, checkRole(['patient']), bookAppointmentValidation, appointmentController.bookAppointment);
// View Own Appointments
router.get('/appointments', authenticate, checkRole(['patient']), appointmentController.getOwnAppointments);
// Cancel appointments
router.delete('/appointments/:id', authenticate, checkRole(['patient']), appointmentController.cancelAppointment);
// View prescription
router.get('/prescriptions', authenticate, checkRole(['patient']), prescriptionController.getOwnPrescriptions);
// Get patient's own profile
router.get('/profile', authenticate, checkRole(['patient']), patientController.getOwnProfile);
// Update patient's own profile
router.put('/profile', authenticate, checkRole(['patient']), validateUpdateProfile, patientController.updateOwnProfile);
// Complete patient profile 
router.post('/profile/complete', authenticate, checkRole(['patient']), validateCompleteProfile, patientController.completeProfile);

module.exports = router;
