const db = require('../config/db');
const crypto = require('crypto');
const bcrypt = require("bcrypt");

exports.getDoctorDashboard = async (req, res, next) => {
    try {
        const doctorId = req.user.id;

        // Total unique patients linked to doctor
        const [patients] = await db.execute(
            `SELECT COUNT(DISTINCT patient_id) AS totalPatients
             FROM appointments
             WHERE doctor_id = ?`,
            [doctorId]
        );

        // Upcoming appointments
        const [upcomingAppointments] = await db.execute(
            `SELECT COUNT(*) AS upcomingCount
             FROM appointments
             WHERE doctor_id = ? AND date_time > NOW()`,
            [doctorId]
        );

        // Total prescriptions
        const [prescriptions] = await db.execute(
            `SELECT COUNT(*) AS totalPrescriptions
             FROM prescriptions
             WHERE doctor_id = ?`,
            [doctorId]
        );

        // Today's appointments
        const [todayAppointments] = await db.execute(
            `SELECT a.id, a.date_time, u.name AS patient_name
             FROM appointments a
             JOIN users u ON a.patient_id = u.id
             WHERE a.doctor_id = ? 
             AND DATE(a.date_time) = CURDATE()
             ORDER BY a.date_time ASC`,
            [doctorId]
        );

        res.status(200).json({
            success: true,
            data: {
                totalPatients: patients[0].totalPatients || 0,
                upcomingAppointments: upcomingAppointments[0].upcomingCount || 0,
                totalPrescriptions: prescriptions[0].totalPrescriptions || 0,
                todayAppointments
            }
        });

    } catch (error) {
        next(error);
    }
};
exports.addPatient = async (req, res) => {
    const { name, email, birthdate, gender, phone, address } = req.body;
    const doctorId = req.user.id; // from auth middleware

    try {
        // 1. Check if patient user already exists
        const [existing] = await db.query(
            'SELECT id FROM users WHERE email = ? AND role = "patient"',
            [email]
        );

        let patientUserId;

        if (existing.length > 0) {
            // ✅ Patient account already exists
            patientUserId = existing[0].id;

            // 1.1 Check if patient profile exists
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

        } else {
            // 2. Create temporary account with random password
            const tempPassword = crypto.randomBytes(10).toString('hex');
            const tempPasswordHash = await bcrypt.hash(tempPassword, 10);

            const [userResult] = await db.query(
                'INSERT INTO users (name, email, password, role) VALUES (?, ?, ?, ?)',
                [name, email, tempPasswordHash, 'patient']
            );
            patientUserId = userResult.insertId;

            // 3. Create patient profile
            await db.query(
                'INSERT INTO patients (user_id, birthdate, gender, phone, address) VALUES (?, ?, ?, ?, ?)',
                [patientUserId, birthdate, gender, phone, address]
            );

            // 4. Create activation token for new accounts
            const token = crypto.randomBytes(32).toString('hex');
            const tokenHash = await bcrypt.hash(token, 10);
            const expiresAt = new Date(Date.now() + 1000 * 60 * 60 * 24); // 24h expiry

            await db.query(
                'INSERT INTO account_tokens (user_id, token_hash, type, expires_at) VALUES (?, ?, ?, ?)',
                [patientUserId, tokenHash, 'activate', expiresAt]
            );

            // 5. Send activation link
            console.log(`Activation link: ${process.env.FRONTEND_URL}/activate?token=${token}&id=${patientUserId}`);
        }

        // 6. Check if this patient is already linked to this doctor
        const [alreadyLinked] = await db.query(
            'SELECT id FROM doctor_patient_link WHERE doctor_id = ? AND patient_user_id = ?',
            [doctorId, patientUserId]
        );

        if (alreadyLinked.length > 0) {
            return res.json({ success: false, message: 'Patient already linked to this doctor.' });
        }

        // 7. Link doctor <-> patient
        await db.query(
            'INSERT INTO doctor_patient_link (doctor_id, patient_user_id) VALUES (?, ?)',
            [doctorId, patientUserId]
        );

        return res.json({ success: true, message: 'Patient added and linked to doctor.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
// controllers/doctorController.js
exports.getLinkedPatients = async (req, res) => {
    try {
        const doctorId = req.user.id; // from auth middleware ✅

        // Pagination setup
        const page = Math.max(parseInt(req.query.page || '1', 10), 1);
        const limit = Math.min(Math.max(parseInt(req.query.limit || '10', 10), 1), 100);
        const offset = (page - 1) * limit;

        // Filters
        const search = (req.query.search || '').trim();
        const gender = req.query.gender || null;
        const ageMin = req.query.ageMin ? parseInt(req.query.ageMin, 10) : null;
        const ageMax = req.query.ageMax ? parseInt(req.query.ageMax, 10) : null;

        // Sorting (whitelist)
        const sortMap = {
            name: 'u.name',
            birthdate: 'p.birthdate',
            linked_at: 'dpl.created_at'
        };
        const sortBy = sortMap[req.query.sortBy] || 'u.name';
        const sortOrder = (req.query.sortOrder || 'asc').toLowerCase() === 'desc' ? 'DESC' : 'ASC';

        // Base WHERE clause — restrict to doctor + active link
        const where = ['dpl.doctor_id = ?', 'dpl.is_active = 1'];
        const params = [doctorId];

        // Search by name/email
        if (search) {
            where.push('(u.name LIKE ? OR u.email LIKE ?)');
            const like = `%${search}%`;
            params.push(like, like);
        }

        // Gender filter
        if (gender) {
            where.push('p.gender = ?');
            params.push(gender);
        }

        // Age filter
        if (ageMin !== null && ageMax !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) BETWEEN ? AND ?');
            params.push(ageMin, ageMax);
        } else if (ageMin !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) >= ?');
            params.push(ageMin);
        } else if (ageMax !== null) {
            where.push('TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) <= ?');
            params.push(ageMax);
        }

        const whereSql = where.length ? 'WHERE ' + where.join(' AND ') : '';

        // Count total results
        const countSql = `
            SELECT COUNT(*) AS total
            FROM doctor_patient_link dpl
            JOIN users u ON dpl.patient_user_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            ${whereSql}
        `;
        const [countRows] = await db.query(countSql, params);
        const total = countRows[0].total || 0;
        const totalPages = Math.ceil(total / limit);

        // Fetch paginated data
        const dataSql = `
            SELECT
                u.id AS user_id,
                u.name,
                u.email,
                p.birthdate,
                p.gender,
                p.phone,
                p.address,
                TIMESTAMPDIFF(YEAR, p.birthdate, CURDATE()) AS age,
                dpl.created_at AS linked_at
            FROM doctor_patient_link dpl
            JOIN users u ON dpl.patient_user_id = u.id
            LEFT JOIN patients p ON u.id = p.user_id
            ${whereSql}
            ORDER BY ${sortBy} ${sortOrder}
            LIMIT ? OFFSET ?
        `;
        const dataParams = [...params, limit, offset];
        const [rows] = await db.query(dataSql, dataParams);

        return res.json({
            success: true,
            meta: { total, page, limit, totalPages },
            data: rows
        });

    } catch (err) {
        console.error('getLinkedPatients error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};

exports.editPatient = async (req, res) => {
    const { patientUserId } = req.params; // from route /patients/:patientUserId
    const { name, email, birthdate, gender, phone, address } = req.body;
    const doctorId = req.user.id;

    try {
        // 1. Check if patient is linked to this doctor
        const [link] = await db.query(
            'SELECT * FROM doctor_patient_link WHERE doctor_id = ? AND patient_user_id = ?',
            [doctorId, patientUserId]
        );
        if (link.length === 0) {
            return res.status(403).json({ success: false, message: 'Not authorized to edit this patient.' });
        }

        // 2. Check if new email already exists (and belongs to another user)
        if (email) {
            const [emailExists] = await db.query(
                'SELECT id FROM users WHERE email = ? AND id != ?',
                [email, patientUserId]
            );
            if (emailExists.length > 0) {
                return res.status(400).json({ success: false, message: 'Email already in use.' });
            }
        }

        // 3. Update users table (name, email) if provided
        await db.query(
            'UPDATE users SET name = COALESCE(?, name), email = COALESCE(?, email) WHERE id = ?',
            [name, email, patientUserId]
        );

        // 4. Update patients table (birthdate, gender, phone, address) if provided
        await db.query(
            'UPDATE patients SET birthdate = COALESCE(?, birthdate), gender = COALESCE(?, gender), phone = COALESCE(?, phone), address = COALESCE(?, address) WHERE user_id = ?',
            [birthdate, gender, phone, address, patientUserId]
        );

        return res.json({ success: true, message: 'Patient updated successfully.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ success: false, message: 'Server error.' });
    }
};

exports.deletePatient = async (req, res) => {
    const doctorId = req.user.id; // from auth
    const { patientUserId } = req.params;

    try {
        // 1. Check if link exists & is active
        const [link] = await db.query(
            'SELECT id FROM doctor_patient_link WHERE doctor_id = ? AND patient_user_id = ? AND is_active = 1',
            [doctorId, patientUserId]
        );

        if (link.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient not found in your list.' });
        }

        // 2. Soft unlink
        await db.query(
            'UPDATE doctor_patient_link SET is_active = 0, unlinked_at = NOW() WHERE doctor_id = ? AND patient_user_id = ?',
            [doctorId, patientUserId]
        );

        return res.json({ success: true, message: 'Patient unlinked successfully.' });

    } catch (err) {
        console.error(err);
        return res.status(500).json({ error: 'Server error' });
    }
};
