const express = require('express');
const router = express.Router();
const { getDoctorDashboard, addPatient, getLinkedPatients, editPatient, deletePatient } = require('../controllers/doctorController');
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const { validateAddPatient, validateEditPatient, validateGetLinkedPatients, validatePatientUserId } = require('../validations/doctorValidations');

// Dashboard
router.get('/dashboard', authenticate, checkRole(['doctor']), getDoctorDashboard);

// Add patients with validation
router.post('/patients', authenticate, checkRole(['doctor']), validateAddPatient, addPatient);

// View patients with enhanced pagination/filtering validation
router.get('/patients', authenticate, checkRole(['doctor']), validateGetLinkedPatients, getLinkedPatients);

// Edit patients with validation
router.put('/patients/:patientUserId', authenticate, checkRole(['doctor']), validatePatientUserId, validateEditPatient, editPatient);

// Delete patients with validation
router.delete('/patients/:patientUserId', authenticate, checkRole(['doctor']), validatePatientUserId, deletePatient);

module.exports = router;
