const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require('bcrypt');
const DoctorModel = require('../models/doctor.model');

class DoctorService {

    static async getDashboardStats(doctorId) {
        try {
            return await DoctorModel.getDashboardStats(doctorId);
        } catch (error) {
            throw new Error(`Failed to fetch dashboard stats: ${error.message}`);
        }
    }

    static async addPatient(doctorId, patientData) {
        const { name, email, birthdate, gender, phone, address } = patientData;

        try {
            // Check if patient user already exists
            const [existing] = await db.query(
                'SELECT id FROM users WHERE email = ? AND role = "patient"',
                [email]
            );

            let patientUserId;

            if (existing.length > 0) {
                patientUserId = existing[0].id;
                await this._ensurePatientProfile(patientUserId, { birthdate, gender, phone, address });
            } else {
                patientUserId = await this._createNewPatient({ name, email, birthdate, gender, phone, address });
            }

            // Check if patient is already linked
            const isAlreadyLinked = await DoctorModel.isPatientLinked(doctorId, patientUserId);
            if (isAlreadyLinked) {
                throw new Error('Patient already linked to this doctor');
            }

            // Link patient to doctor
            const linkSuccess = await DoctorModel.linkPatient(doctorId, patientUserId);
            if (!linkSuccess) {
                throw new Error('Failed to link patient to doctor');
            }

            return { patientUserId, isNewAccount: existing.length === 0 };

        } catch (error) {
            throw new Error(`Failed to add patient: ${error.message}`);
        }
    }

    static async _ensurePatientProfile(patientUserId, profileData) {
        const { birthdate, gender, phone, address } = profileData;

        // Check if patient profile exists
        const [patientProfile] = await db.query(
            'SELECT id FROM patients WHERE user_id = ?',
            [patientUserId]
        );

        if (patientProfile.length === 0) {
            await db.query(
                'INSERT INTO patients (user_id, birthdate, gender, phone, address) VALUES (?, ?, ?, ?, ?)',
                [patientUserId, birthdate, gender, phone, address]
            );
        }
    }

    static async _createNewPatient(patientData) {
        const { name, email, birthdate, gender, phone, address } = patientData;

        // Generate temporary password
        const tempPassword = crypto.randomBytes(10).toString('hex');
        const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

        // Create user account
        const [userResult] = await db.query(
            'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
            [name, email, tempPasswordHash, 'patient']
        );
        const patientUserId = userResult.insertId;

        // Create patient profile
        await db.query(
            'INSERT INTO patients (user_id, birthdate, gender, phone, address) VALUES (?, ?, ?, ?, ?)',
            [patientUserId, birthdate, gender, phone, address]
        );

        // Create activation token
        await this._createActivationToken(patientUserId);

        return patientUserId;
    }

    static async _createActivationToken(patientUserId) {
        const token = crypto.randomBytes(32).toString('hex');
        const tokenHash = await bcrypt.hash(token, 10);
        const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h expiry

        await db.query(
            'INSERT INTO account_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, ?)',
            [patientUserId, tokenHash, 'activate', expiresAt]
        );

        // Log activation link for development
        console.log(`Activation link: ${process.env.FRONTEND_URL}/activate?token=${token}&id=${patientUserId}`);
    }

    static async getLinkedPatients(doctorId, options) {
        try {
            return await DoctorModel.getLinkedPatients(doctorId, options);
        } catch (error) {
            throw new Error(`Failed to fetch linked patients: ${error.message}`);
        }
    }

    static async editPatient(doctorId, patientUserId, updateData) {
        const { name, email, birthdate, gender, phone, address } = updateData;

        try {
            // Check if patient is linked to this doctor
            const isLinked = await DoctorModel.isPatientLinked(doctorId, patientUserId);
            if (!isLinked) {
                throw new Error('Not authorized to edit this patient');
            }

            // Validate email uniqueness if provided
            if (email) {
                await this._validateEmailUniqueness(email, patientUserId);
            }

            // Update user information
            if (name || email) {
                await db.query(
                    'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
                    [name, email, patientUserId]
                );

            }
            // Update patient profile
            if (birthdate || gender || phone || address) {
                await db.query(
                    'UPDATE patients SET birthdate = COALESCE(?, birthdate), gender = COALESCE(?, gender), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE user_id = ?',
                    [birthdate, gender, phone, address, patientUserId]
                );
            }

            return true;

        } catch (error) {
            throw new Error(`Failed to edit patient: ${error.message}`);
        }
    }

    static async _validateEmailUniqueness(email, excludeUserId) {
        const [emailExists] = await db.query(
            'SELECT id FROM users WHERE email = ? AND id != ?',
            [email, excludeUserId]
        );

        if (emailExists.length > 0) {
            throw new Error('Email already in use by another user');
        }
    }

    static async deletePatient(doctorId, patientUserId) {
        try {
            // Check if patient is linked to this doctor
            const isLinked = await DoctorModel.isPatientLinked(doctorId, patientUserId);
            if (!isLinked) {
                throw new Error('Patient not found in your list');
            }

            // Unlink patient from doctor
            const unlinkSuccess = await DoctorModel.unlinkPatient(doctorId, patientUserId);
            if (!unlinkSuccess) {
                throw new Error('Failed to unlink patient from doctor');
            }

            return true;

        } catch (error) {
            throw new Error(`Failed to delete patient: ${error.message}`);
        }
    }

    static async createDoctorProfile(userId, profileData) {
        try {
            return await DoctorModel.create({ user_id: userId, ...profileData });
        } catch (error) {
            throw new Error(`Failed to create doctor profile: ${error.message}`);
        }
    }

    static async getDoctorProfile(userId) {
        try {
            return await DoctorModel.findByUserId(userId);
        } catch (error) {
            throw new Error(`Failed to fetch doctor profile: ${error.message}`);
        }
    }

    static async updateDoctorProfile(userId, updateData) {
        try {
            const success = await DoctorModel.updateByUserId(userId, updateData);
            if (!success) {
                throw new Error('Doctor profile not found');
            }
            return true;
        } catch (error) {
            throw new Error(`Failed to update doctor profile: ${error.message}`);
        }
    }

    static async getAllDoctors(options) {
        try {
            return await DoctorModel.getAll(options);
        } catch (error) {
            throw new Error(`Failed to fetch doctors: ${error.message}`);
        }
    }
}

module.exports = DoctorService;