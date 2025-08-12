const express = require('express');
const router = express.Router();
const { addPrescription, editPrescription, deletePrescription, getPrescriptionPDF } = require('../controllers/prescriptionController');
const authenticate = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

// add prescription
router.post('/', authenticate, checkRole('doctor'), addPrescription);
//edit prescription
router.put('/:prescription_id', authenticate, checkRole(['doctor']), editPrescription);
//delete prescription
router.delete('/:prescription_id', authenticate, checkRole(['doctor']), deletePrescription);
//print view for prescriptions route.
router.get('/:id/pdf', authenticate, checkRole(['doctor', 'patient']), getPrescriptionPDF);


module.exports = router;
