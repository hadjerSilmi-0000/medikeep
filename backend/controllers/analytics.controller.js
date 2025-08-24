const analyticsService = require('../services/analyticsService');

exports.getDoctorAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.sub || req.user.id || req.user.userId || req.user.user_id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const analytics = await analyticsService.getDoctorAnalytics(userId);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Error in getDoctorAnalytics:', error);
        next(error);
    }
};

exports.getPatientAnalytics = async (req, res, next) => {
    try {
        const userId = req.user.sub || req.user.id || req.user.userId || req.user.user_id;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const analytics = await analyticsService.getPatientAnalytics(userId);

        res.json({
            success: true,
            data: analytics
        });

    } catch (error) {
        console.error('Error in getPatientAnalytics:', error);
        next(error);
    }
};

exports.getDashboardStats = async (req, res, next) => {
    try {
        const userId = req.user.sub || req.user.id || req.user.userId || req.user.user_id;
        const role = req.user.role;

        if (!userId) {
            return res.status(400).json({
                success: false,
                message: 'User ID not found in token'
            });
        }

        const stats = await analyticsService.getDashboardStats(userId, role);

        res.json({
            success: true,
            data: stats
        });

    } catch (error) {
        console.error('Error in getDashboardStats:', error);
        next(error);
    }
};