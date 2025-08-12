const db = require('../config/db');
const { validationResult } = require('express-validator');
const Appointment = require('../models/appointment.model');
const Notification = require('../models/notification.model');
const sendEmail = require('../utils/sendEmail');
const getDoctorIdFromUserId = require('../utils/getDoctorId');

exports.bookAppointment = async (req, res) => {
    try {
        const errors = validationResult(req);
        if (!errors.isEmpty()) {
            return res.status(400).json({ success: false, message: 'Validation failed', errors: errors.array() });
        }

        const { doctor_id, date_time, reason } = req.body;

        // ✅ Get patient ID using user ID
        const [patientRows] = await db.execute('SELECT id, user_id FROM patients WHERE user_id = ?', [req.user.id]);
        if (patientRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient profile not found' });
        }

        const patient_id = patientRows[0].id;
        const patient_user_id = patientRows[0].user_id;

        // ✅ Check if doctor exists and get their name
        const [doctorRows] = await db.execute(
            'SELECT id, user_id FROM doctors WHERE id = ?',
            [doctor_id]
        );
        if (doctorRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Doctor not found' });
        }

        const doctor_user_id = doctorRows[0].user_id;
        const [[doctorUser]] = await db.execute('SELECT name FROM users WHERE id = ?', [doctor_user_id]);
        const doctorName = doctorUser ? doctorUser.name : 'Your Doctor';

        // ✅ Insert appointment
        const [result] = await db.execute(
            'INSERT INTO appointments (doctor_id, patient_id, date_time, status, reason) VALUES (?, ?, ?, ?, ?)',
            [doctor_id, patient_id, date_time, 'pending', reason]
        );

        const newAppointmentId = result.insertId;

        // 📌 Create Notification for patient
        await Notification.create({
            user_id: patient_user_id,
            type: 'appointment',
            title: 'New Appointment Scheduled',
            body: `Your appointment with Dr. ${doctorName} is scheduled for ${date_time}`,
            data: { appointmentId: newAppointmentId }
        });

        return res.status(201).json({ success: true, message: 'Appointment booked successfully' });

    } catch (err) {
        console.error('Book appointment error:', err.message);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.getOwnAppointments = async (req, res) => {
    try {
        // Step 1: Get patient_id from patients table
        const [patientRows] = await db.execute(
            'SELECT id FROM patients WHERE user_id = ?',
            [req.user.id]
        );

        if (patientRows.length === 0) {
            return res.status(404).json({ success: false, message: 'Patient profile not found' });
        }

        const patient_id = patientRows[0].id;

        // Step 2: Query appointments with correct joins
        const [appointments] = await db.execute(`
            SELECT 
                a.id, 
                a.date_time, 
                a.status, 
                a.reason,
                u.name AS doctor_name, 
                d.specialty
            FROM appointments a
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
            WHERE a.patient_id = ?
            ORDER BY a.date_time DESC
        `, [patient_id]);

        res.json({ success: true, data: appointments });

    } catch (err) {
        console.error('Get appointments error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};


exports.cancelAppointment = async (req, res) => {
    try {
        const appointmentId = req.params.id;
        const userId = req.user.id;

        // 1. Get patient_id from patients table using the logged-in user's ID
        const [patientRows] = await db.execute(
            'SELECT id FROM patients WHERE user_id = ?',
            [userId]
        );

        if (patientRows.length === 0) {
            return res.status(403).json({ success: false, message: 'Patient profile not found' });
        }

        const patientId = patientRows[0].id;

        // 2. Check if appointment exists and belongs to this patient
        const [appointments] = await db.execute(
            'SELECT * FROM appointments WHERE id = ? AND patient_id = ?',
            [appointmentId, patientId]
        );

        if (appointments.length === 0) {
            return res.status(404).json({ success: false, message: 'Appointment not found' });
        }

        // 3. Update status to 'cancelled'
        await db.execute(
            'UPDATE appointments SET status = ? WHERE id = ?',
            ['cancelled', appointmentId]
        );

        res.json({ success: true, message: 'Appointment cancelled successfully' });
    } catch (err) {
        console.error('Cancel appointment error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};

exports.giveAppointment = async (req, res) => {
    const conn = await db.getConnection();
    try {
        const userId = req.user.id; // user.id from JWT
        const doctorId = await getDoctorIdFromUserId(userId);
        if (!doctorId) {
            conn.release();
            return res.status(403).json({ success: false, message: 'You are not a doctor' });
        }

        const { patient_user_id, date_time, reason } = req.body;
        if (!patient_user_id || !date_time) {
            conn.release();
            return res.status(400).json({ success: false, message: 'patient_user_id and date_time required' });
        }

        // Check patient user exists and get email
        const [patientRows] = await conn.execute('SELECT id, name, email FROM users WHERE id = ? AND role = ?', [patient_user_id, 'patient']);
        if (!patientRows.length) {
            conn.release();
            return res.status(404).json({ success: false, message: 'Patient user not found' });
        }
        const patientUser = patientRows[0];

        // Transaction: create appointment -> notification -> send email
        await conn.beginTransaction();

        // Insert appointment
        const [apptResult] = await conn.execute(
            `INSERT INTO appointments (patient_id, doctor_id, date_time, reason, status, created_at)
       VALUES (?, ?, ?, ?, ?, NOW())`,
            [patientUser.id, doctorId, date_time, reason || 'Appointment from doctor', 'pending']
        );
        const appointmentId = apptResult.insertId;

        // Notification for patient (in-app)
        const title = 'New appointment scheduled';
        const body = `You have a new appointment on ${new Date(date_time).toLocaleString()}.`;
        const notifData = { appointmentId, date_time, reason };

        const [notifResult] = await conn.execute(
            `INSERT INTO notifications (user_id, type, title, body, data, created_at)
       VALUES (?, 'appointment', ?, ?, ?, NOW())`,
            [patientUser.id, title, body, JSON.stringify(notifData)]
        );

        await conn.commit();

        // Send email (do not block DB commit — but here we await for reliability; you can make it fire-and-forget)
        try {
            const emailHtml = `
        <p>Hi ${patientUser.name || ''},</p>
        <p>Your doctor scheduled a new appointment:</p>
        <ul>
          <li>Date: ${date_time}</li>
          <li>Reason: ${reason || 'N/A'}</li>
        </ul>
        <p><a href="${process.env.FRONTEND_URL || '#'}">View in app</a></p>
      `;
            await sendEmail({
                to: patientUser.email,
                subject: 'New Appointment Scheduled',
                text: `Your appointment on ${date_time}. Reason: ${reason || 'N/A'}`,
                html: emailHtml
            });
        } catch (mailErr) {
            // Email failed — log but do not rollback appointment (optionally retry in background)
            console.error('Failed to send appointment email:', mailErr);
        }

        conn.release();

        return res.status(201).json({
            success: true,
            message: 'Appointment created, patient notified',
            data: { appointmentId, patient: { id: patientUser.id, email: patientUser.email }, notificationId: notifResult.insertId }
        });

    } catch (err) {
        await conn.rollback().catch(() => { });
        conn.release();
        console.error('giveAppointment error', err);
        return res.status(500).json({ success: false, message: 'Server error' });
    }
};
