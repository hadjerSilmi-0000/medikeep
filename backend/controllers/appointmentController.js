const asyncWrapper = require('../utils/asyncWrapper');
const AppointmentService = require('../services/appointmentService');
const getDoctorIdFromUserId = require('../utils/getDoctorId');

exports.bookAppointment = asyncWrapper(async (req, res) => {
    const result = await AppointmentService.bookAppointment(req.user.id, req.body);

    return res.status(201).json({
        success: true,
        message: result.message,
        data: result.appointmentDetails
    });
});

exports.getOwnAppointments = asyncWrapper(async (req, res) => {
    const result = await AppointmentService.getAppointments(req.user.id, 'patient', req.query);

    res.json({
        success: true,
        data: result.appointments,
        pagination: result.pagination,
        stats: result.stats,
        filters: result.filters
    });
});

exports.getDoctorAppointments = asyncWrapper(async (req, res) => {
    const result = await AppointmentService.getAppointments(req.user.id, 'doctor', req.query);

    res.json({
        success: true,
        data: result.appointments,
        pagination: result.pagination,
        stats: result.stats,
        filters: result.filters
    });
});

exports.cancelAppointment = asyncWrapper(async (req, res) => {
    const appointmentId = req.params.id;
    const userRole = req.user.role; // Assuming role is available in req.user

    const result = await AppointmentService.cancelAppointment(req.user.id, appointmentId, userRole);

    res.json({
        success: true,
        message: result.message
    });
});

exports.updateAppointmentStatus = asyncWrapper(async (req, res) => {
    const appointmentId = req.params.id;
    const { status } = req.body;

    const result = await AppointmentService.updateAppointmentStatus(req.user.id, appointmentId, status);

    res.json({
        success: true,
        message: result.message
    });
});

exports.giveAppointment = asyncWrapper(async (req, res) => {
    const { patient_id, date_time, reason } = req.body;

    const result = await AppointmentService.giveAppointment(req.user.id, {
        patient_id,
        date_time,
        reason
    });

    return res.status(201).json({
        success: true,
        message: result.message,
        data: result.data
    });
});



