module.exports = function checkRole(allowedRoles = []) {
    return (req, res, next) => {
        if (!req.user || !allowedRoles.includes(req.user.role)) {
            return res.status(403).json({
                success: false,
                message: 'Forbidden: You are not allowed to access this resource',
            });
        }
        next();
    };
};

