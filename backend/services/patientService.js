const Patient = require('../models/patient.model');
const db = require('../config/db');

class PatientService {
    // Get patient's own profile
    static async getOwnProfile(userId) {
        try {
            const patient = await Patient.findByUserId(userId);

            if (!patient) {
                throw new Error('Patient not found');
            }

            // Format the response
            return {
                user: {
                    id: patient.user_id,
                    name: patient.name,
                    email: patient.email,
                    created_at: patient.created_at
                },
                profile: {
                    id: patient.patient_id,
                    birthdate: patient.birthdate,
                    gender: patient.gender,
                    phone: patient.phone,
                    address: patient.address
                },
                isProfileComplete: this.isProfileComplete(patient)
            };
        } catch (error) {
            throw error;
        }
    }

    // Update patient's own profile
    static async updateOwnProfile(userId, updateData) {
        try {
            const { name, email, birthdate, gender, phone, address } = updateData;

            // Check if patient exists
            const existingPatient = await Patient.findByUserId(userId);
            if (!existingPatient) {
                throw new Error('Patient not found');
            }

            // Update user info if provided
            if (name || email) {
                const userUpdateData = {};
                if (name) userUpdateData.name = name;
                if (email) userUpdateData.email = email;

                await Patient.updateUserInfo(userId, userUpdateData);
            }

            // Update patient profile if provided
            if (birthdate || gender || phone || address) {
                const patientUpdateData = {
                    birthdate: birthdate || existingPatient.birthdate,
                    gender: gender || existingPatient.gender,
                    phone: phone || existingPatient.phone,
                    address: address || existingPatient.address
                };

                const profileExists = await Patient.profileExists(userId);

                if (profileExists) {
                    await Patient.updateProfile(userId, patientUpdateData);
                } else {
                    await Patient.createProfile(userId, patientUpdateData);
                }
            }

            // Return updated profile
            return await this.getOwnProfile(userId);
        } catch (error) {
            throw error;
        }
    }

    // Complete patient profile (for first-time setup)
    static async completeProfile(userId, profileData) {
        try {
            const { name, email, birthdate, gender, phone, address } = profileData;

            // Check if patient exists
            const existingPatient = await Patient.findByUserId(userId);
            if (!existingPatient) {
                throw new Error('Patient not found');
            }

            // Check if profile already complete
            if (this.isProfileComplete(existingPatient)) {
                throw new Error('Profile is already complete');
            }

            // Update user info if provided
            if (name || email) {
                const userUpdateData = {};
                if (name) userUpdateData.name = name;
                if (email) userUpdateData.email = email;

                await Patient.updateUserInfo(userId, userUpdateData);
            }

            // Create or update patient profile
            const patientData = { birthdate, gender, phone, address };

            const profileExists = await Patient.profileExists(userId);

            if (profileExists) {
                await Patient.updateProfile(userId, patientData);
            } else {
                await Patient.createProfile(userId, patientData);
            }

            // Return completed profile
            return await this.getOwnProfile(userId);
        } catch (error) {
            throw error;
        }
    }

    // Search doctors
    static async searchDoctors(searchParams = {}) {
        try {
            const { name = '', specialty = '', page = 1, limit = 10 } = searchParams;

            // Calculate offset for pagination
            const offset = (page - 1) * limit;

            // FIXED: Only select columns that exist in your database
            const searchQuery = `
                SELECT u.id, u.name, d.specialty, d.bio, d.phone as doctor_phone
                FROM users u
                JOIN doctors d ON u.id = d.user_id
                WHERE u.role = 'doctor'
                AND u.name LIKE ?
                AND d.specialty LIKE ?
                ORDER BY u.name ASC
                LIMIT ? OFFSET ?
            `;

            const countQuery = `
                SELECT COUNT(*) as total
                FROM users u
                JOIN doctors d ON u.id = d.user_id
                WHERE u.role = 'doctor'
                AND u.name LIKE ?
                AND d.specialty LIKE ?
            `;

            // Execute both queries
            const [doctors] = await db.execute(searchQuery, [
                `%${name}%`,
                `%${specialty}%`,
                parseInt(limit),
                parseInt(offset)
            ]);

            const [countResult] = await db.execute(countQuery, [
                `%${name}%`,
                `%${specialty}%`
            ]);

            const total = countResult[0].total;
            const totalPages = Math.ceil(total / limit);

            return {
                doctors,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages,
                    totalRecords: total,
                    hasNext: page < totalPages,
                    hasPrev: page > 1
                }
            };
        } catch (error) {
            throw new Error(`Error searching doctors: ${error.message}`);
        }
    }

    // Helper method to check if profile is complete
    static isProfileComplete(patient) {
        if (!patient) return false;

        return !!(
            patient.name &&
            patient.email &&
            patient.birthdate &&
            patient.gender &&
            patient.phone
        );
    }

    // Helper method to format patient data for responses
    static formatPatientResponse(patient) {
        return {
            id: patient.user_id,
            name: patient.name,
            email: patient.email,
            profile: {
                birthdate: patient.birthdate,
                gender: patient.gender,
                phone: patient.phone,
                address: patient.address
            },
            isComplete: this.isProfileComplete(patient)
        };
    }

    // Get patient basic info for other services (appointments, prescriptions)
    static async getPatientBasicInfo(userId) {
        try {
            const patient = await Patient.getPatientBasicInfo(userId);

            if (!patient) {
                throw new Error('Patient not found');
            }

            return patient;
        } catch (error) {
            throw error;
        }
    }
}

module.exports = PatientService;