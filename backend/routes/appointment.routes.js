const express = require('express');
const router = express.Router();
const {
    bookAppointment,
    getOwnAppointments,
    getDoctorAppointments,
    cancelAppointment,
    updateAppointmentStatus,
    giveAppointment
} = require('../controllers/appointmentController');
const { authenticate } = require('../middlewares/authMiddleware');
const checkRole = require('../middlewares/roleMiddleware');
const { validate } = require('../middlewares/validators');
const {
    bookAppointmentSchema,
    giveAppointmentSchema,
    updateStatusSchema,
    getAppointmentsSchema,
    appointmentIdSchema
} = require('../validations/appointmentValidations');

// Patient routes
router.post('/book', authenticate, checkRole(['patient']), validate(bookAppointmentSchema, 'body'), bookAppointment);

router.get('/my-appointments', authenticate, checkRole(['patient']), validate(getAppointmentsSchema, 'query'), getOwnAppointments);

router.put('/cancel/:id', authenticate, checkRole(['patient']), validate(appointmentIdSchema, 'params'), cancelAppointment);

// Doctor routes
router.post('/give', authenticate, checkRole(['doctor']), validate(giveAppointmentSchema, 'body'), giveAppointment);

router.get('/doctor-appointments', authenticate, checkRole(['doctor']), validate(getAppointmentsSchema, 'query'), getDoctorAppointments);

router.put('/status/:id', authenticate, checkRole(['doctor']), validate(appointmentIdSchema, 'params'), validate(updateStatusSchema, 'body'), updateAppointmentStatus);

module.exports = router;