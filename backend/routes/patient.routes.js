const express = require('express');
const router = express.Router();
const patientController = require('../controllers/patientController');
const authenticate = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const appointmentController = require('../controllers/appointmentController');
const { bookAppointmentValidation } = require('../middlewares/validators');
const prescriptionController = require('../controllers/prescriptionController');

//search doctor
router.get('/search-doctors', authenticate, checkRole(['patient']), patientController.searchDoctors);
//take appointment 
router.post('/appointments', authenticate, checkRole(['patient']), bookAppointmentValidation, appointmentController.bookAppointment);
//View Own Appointments
router.get('/appointments', authenticate, checkRole(['patient']), appointmentController.getOwnAppointments);
//cancel appointments 
router.delete('/appointments/:id', authenticate, checkRole(['patient']), appointmentController.cancelAppointment);
//view prescriptions
router.get('/prescriptions', authenticate, checkRole(['patient']), prescriptionController.getOwnPrescriptions);


module.exports = router;




