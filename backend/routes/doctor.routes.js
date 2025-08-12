const express = require('express');
const router = express.Router();
const { getDoctorDashboard, addPatient, getLinkedPatients, editPatient, deletePatient } = require('../controllers/doctorController');
const authenticate = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

// dashboard
router.get('/dashboard', authenticate, checkRole(['doctor']), getDoctorDashboard);
//add patients
router.post('/patients', authenticate, checkRole(['doctor']), addPatient);
//view patients adding by the dr
router.get('/patients', authenticate, checkRole(['doctor']), getLinkedPatients);
//edit patients
router.put('/patients/:patientUserId', authenticate, checkRole(['doctor']), editPatient);
//delete patients
router.delete('/patients/:patientUserId', authenticate, checkRole(['doctor']), deletePatient);

module.exports = router;
