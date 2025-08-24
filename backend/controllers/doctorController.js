const DoctorService = require('../services/doctorService');

exports.getDoctorDashboard = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const dashboardData = await DoctorService.getDashboardStats(doctorId);

        res.status(200).json({
            success: true,
            data: dashboardData
        });

    } catch (error) {
        next(error);
    }
};

exports.addPatient = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const result = await DoctorService.addPatient(doctorId, req.body);

        res.status(201).json({
            success: true,
            message: 'Patient added and linked to doctor successfully.',
            data: { patientUserId: result.patientUserId }
        });

    } catch (error) {
        if (error.message.includes('already linked')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

exports.getLinkedPatients = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const result = await DoctorService.getLinkedPatients(doctorId, req.query);

        res.status(200).json({
            success: true,
            data: result.patients,
            pagination: result.pagination,
            filters: {
                search: req.query.search,
                gender: req.query.gender,
                ageMin: req.query.ageMin,
                ageMax: req.query.ageMax,
                sortBy: req.query.sortBy,
                sortOrder: req.query.sortOrder
            }
        });

    } catch (error) {
        next(error);
    }
};

exports.editPatient = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { patientUserId } = req.params;

        await DoctorService.editPatient(doctorId, patientUserId, req.body);

        res.status(200).json({
            success: true,
            message: 'Patient updated successfully.'
        });

    } catch (error) {
        if (error.message.includes('Not authorized')) {
            return res.status(403).json({
                success: false,
                message: error.message
            });
        }
        if (error.message.includes('Email already in use')) {
            return res.status(400).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};

exports.deletePatient = async (req, res, next) => {
    try {
        const doctorId = req.user.id;
        const { patientUserId } = req.params;

        await DoctorService.deletePatient(doctorId, patientUserId);

        res.status(200).json({
            success: true,
            message: 'Patient unlinked successfully.'
        });

    } catch (error) {
        if (error.message.includes('not found')) {
            return res.status(404).json({
                success: false,
                message: error.message
            });
        }
        next(error);
    }
};