const express = require('express');
const router = express.Router();
const {
    addPrescription,
    editPrescription,
    deletePrescription,
    getPrescriptionPDF,
    getOwnPrescriptions
} = require('../controllers/prescriptionController');
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');

// Get patient's own prescriptions with pagination
router.get('/my-prescriptions', authenticate, checkRole('patient'), getOwnPrescriptions);

// Add prescription (doctors only)
router.post('/', authenticate, checkRole('doctor'), addPrescription);

// Edit prescription (doctors only)
router.put('/:prescription_id', authenticate, checkRole(['doctor']), editPrescription);

// Delete prescription (doctors only)
router.delete('/:prescription_id', authenticate, checkRole(['doctor']), deletePrescription);

// Get prescription PDF (doctors and patients)
router.get('/:id/pdf', authenticate, checkRole(['doctor', 'patient']), getPrescriptionPDF);

module.exports = router;