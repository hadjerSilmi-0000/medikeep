const db = require('../config/db');

class Patient {
    // Get patient profile by user_id (JOIN users and patients tables)
    static async findByUserId(userId) {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    u.id as user_id,
                    u.name,
                    u.email,
                    u.created_at,
                    p.id as patient_id,
                    p.birthdate,
                    p.gender,
                    p.phone,
                    p.address
                FROM users u
                LEFT JOIN patients p ON u.id = p.user_id
                WHERE u.id = ? AND u.role = 'patient'
            `, [userId]);

            return rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in findByUserId: ${error.message}`);
        }
    }

    // Create patient profile (insert into patients table)
    static async createProfile(userId, patientData) {
        try {
            const { birthdate, gender, phone, address } = patientData;

            const [result] = await db.execute(`
                INSERT INTO patients (user_id, birthdate, gender, phone, address)
                VALUES (?, ?, ?, ?, ?)
            `, [userId, birthdate, gender, phone, address]);

            return result.insertId;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Patient profile already exists');
            }
            throw new Error(`Database error in createProfile: ${error.message}`);
        }
    }

    // Update patient profile
    static async updateProfile(userId, patientData) {
        try {
            const { birthdate, gender, phone, address } = patientData;

            const [result] = await db.execute(`
                UPDATE patients 
                SET birthdate = ?, gender = ?, phone = ?, address = ?
                WHERE user_id = ?
            `, [birthdate, gender, phone, address, userId]);

            return result.affectedRows > 0;
        } catch (error) {
            throw new Error(`Database error in updateProfile: ${error.message}`);
        }
    }

    // Check if patient profile exists
    static async profileExists(userId) {
        try {
            const [rows] = await db.execute(`
                SELECT id FROM patients WHERE user_id = ?
            `, [userId]);

            return rows.length > 0;
        } catch (error) {
            throw new Error(`Database error in profileExists: ${error.message}`);
        }
    }

    // Update user info (name, email) - for profile completion
    static async updateUserInfo(userId, userData) {
        try {
            const { name, email } = userData;

            const [result] = await db.execute(`
                UPDATE users 
                SET name = ?, email = ?
                WHERE id = ? AND role = 'patient'
            `, [name, email, userId]);

            return result.affectedRows > 0;
        } catch (error) {
            if (error.code === 'ER_DUP_ENTRY') {
                throw new Error('Email already exists');
            }
            throw new Error(`Database error in updateUserInfo: ${error.message}`);
        }
    }

    // Get patient's basic info for appointments/prescriptions
    static async getPatientBasicInfo(userId) {
        try {
            const [rows] = await db.execute(`
                SELECT 
                    u.id,
                    u.name,
                    u.email,
                    p.phone,
                    p.birthdate,
                    p.gender
                FROM users u
                LEFT JOIN patients p ON u.id = p.user_id
                WHERE u.id = ? AND u.role = 'patient'
            `, [userId]);

            return rows[0] || null;
        } catch (error) {
            throw new Error(`Database error in getPatientBasicInfo: ${error.message}`);
        }
    }
}

module.exports = Patient;