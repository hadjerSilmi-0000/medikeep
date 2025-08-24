const db = require('../config/db');
const PatientService = require('../services/patientService');
const asyncWrapper = require('../utils/asyncWrapper');

// Search doctors function 
const searchDoctors = asyncWrapper(async (req, res, next) => {
    const searchParams = req.query; // Already validated by middleware

    const result = await PatientService.searchDoctors(searchParams);

    res.json({
        success: true,
        data: result.doctors,
        pagination: result.pagination
    });
});

// Get patient's own profile
const getOwnProfile = asyncWrapper(async (req, res, next) => {
    const userId = req.user.id; // From auth middleware

    const profile = await PatientService.getOwnProfile(userId);

    res.json({
        success: true,
        data: profile
    });
});

// Update patient's own profile
const updateOwnProfile = asyncWrapper(async (req, res, next) => {
    const userId = req.user.id; // From auth middleware
    const updateData = req.body; // Already validated by middleware

    const updatedProfile = await PatientService.updateOwnProfile(userId, updateData);

    res.json({
        success: true,
        message: 'Profile updated successfully',
        data: updatedProfile
    });
});

// Complete patient profile (for first-time setup)
const completeProfile = asyncWrapper(async (req, res, next) => {
    const userId = req.user.id; // From auth middleware
    const profileData = req.body; // Already validated by middleware

    const completedProfile = await PatientService.completeProfile(userId, profileData);

    res.json({
        success: true,
        message: 'Profile completed successfully',
        data: completedProfile
    });
});

// Export all functions
module.exports = {
    searchDoctors,
    getOwnProfile,
    updateOwnProfile,
    completeProfile
};