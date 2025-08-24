const db = require('../config/db');
const Appointment = require('../models/appointment.model');
const Notification = require('../models/notification.model');
const sendEmail = require('../utils/sendEmail');

class AppointmentService {
    // Check if doctor exists and has no conflicting appointments
    static async checkDoctorAvailability(doctorId, dateTime, excludeAppointmentId = null) {
        // Make sure doctor exists
        const [doctor] = await db.execute(
            `SELECT id FROM doctors WHERE id = ?`,
            [doctorId]
        );

        if (doctor.length === 0) {
            throw new Error('Doctor not found');
        }

        // Check if there's a conflicting appointment
        const hasConflict = await Appointment.checkConflict(doctorId, dateTime, excludeAppointmentId);
        if (hasConflict) {
            throw new Error('Doctor already has an appointment at this time. Please choose another time slot.');
        }

        return true;
    }

    // Check patient scheduling limits
    static async checkPatientSchedulingLimits(patientId, dateTime) {
        const appointmentDate = new Date(dateTime);

        // Check if patient already has appointment on same day
        const [existingAppointments] = await db.execute(`
            SELECT COUNT(*) as count FROM appointments 
            WHERE patient_id = ? 
            AND DATE(date_time) = DATE(?)
            AND status NOT IN ('cancelled', 'completed')
        `, [patientId, dateTime]);

        if (existingAppointments[0].count > 0) {
            throw new Error('You already have an appointment scheduled for this day. Only one appointment per day is allowed.');
        }

        // Check pending appointments limit (max 3 pending)
        const [pendingCount] = await db.execute(`
            SELECT COUNT(*) as count FROM appointments 
            WHERE patient_id = ? AND status = 'pending'
        `, [patientId]);

        if (pendingCount[0].count >= 3) {
            throw new Error('You have reached the maximum limit of 3 pending appointments. Please cancel or complete existing appointments first.');
        }

        return true;
    }

    // Validate appointment time (business hours, future date, etc.)
    static validateAppointmentTime(dateTime) {
        const appointmentDate = new Date(dateTime);
        const now = new Date();

        // Check if appointment is in the future
        if (appointmentDate <= now) {
            throw new Error('Appointment must be scheduled for a future date and time.');
        }

        // Check if appointment is within business hours (8 AM - 6 PM)
        const hour = appointmentDate.getHours();
        if (hour < 8 || hour >= 18) {
            throw new Error('Appointments can only be scheduled between 8:00 AM and 6:00 PM.');
        }

        // Check if appointment is on weekday (Monday-Friday)
        const dayOfWeek = appointmentDate.getDay();
        if (dayOfWeek === 0 || dayOfWeek === 6) {
            throw new Error('Appointments can only be scheduled on weekdays (Monday-Friday).');
        }

        // Check if appointment is not more than 30 days in advance
        const thirtyDaysFromNow = new Date(now.getTime() + (30 * 24 * 60 * 60 * 1000));
        if (appointmentDate > thirtyDaysFromNow) {
            throw new Error('Appointments cannot be scheduled more than 30 days in advance.');
        }

        return true;
    }

    // Book appointment (for patients)
    static async bookAppointment(patientUserId, { doctor_id, date_time, reason }) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            // Get patient info
            const [patientRows] = await conn.execute(
                'SELECT id, user_id FROM patients WHERE user_id = ?',
                [patientUserId]
            );

            if (patientRows.length === 0) {
                throw new Error('Patient profile not found');
            }

            const patient_id = patientRows[0].id;

            // Validate appointment time
            this.validateAppointmentTime(date_time);

            // Check doctor exists
            const [doctorRows] = await conn.execute(
                'SELECT id, user_id FROM doctors WHERE id = ?',
                [doctor_id]
            );

            if (doctorRows.length === 0) {
                throw new Error('Doctor not found');
            }

            // Check doctor availability (only for conflicts, not schedule availability)
            await this.checkDoctorAvailability(doctor_id, date_time);

            // Check patient scheduling limits
            await this.checkPatientSchedulingLimits(patient_id, date_time);

            // Create appointment
            const [result] = await conn.execute(
                'INSERT INTO appointments (doctor_id, patient_id, date_time, status, reason, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [doctor_id, patient_id, date_time, 'pending', reason]
            );

            const appointmentId = result.insertId;

            // Get doctor info for notification
            const [doctorUserRows] = await conn.execute(
                'SELECT name FROM users WHERE id = ?',
                [doctorRows[0].user_id]
            );
            const doctorName = doctorUserRows.length > 0 ? doctorUserRows[0].name : 'Your Doctor';

            // Create notification
            await Notification.create({
                user_id: patientUserId,
                type: 'appointment',
                title: 'New Appointment Scheduled',
                body: `Your appointment with Dr. ${doctorName} is scheduled for ${new Date(date_time).toLocaleString()}`,
                data: { appointmentId, doctorId: doctor_id, dateTime: date_time }
            });

            await conn.commit();

            return {
                appointmentId,
                message: 'Appointment booked successfully',
                appointmentDetails: {
                    id: appointmentId,
                    doctorName,
                    dateTime: date_time,
                    status: 'pending',
                    reason
                }
            };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Give appointment (for doctors)
    static async giveAppointment(doctorUserId, { patient_id, date_time, reason }) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            // Get doctor info
            const [doctorRows] = await conn.execute(
                'SELECT id FROM doctors WHERE user_id = ?',
                [doctorUserId]
            );
            if (doctorRows.length === 0) throw new Error('Doctor profile not found');
            const doctorId = doctorRows[0].id;

            // Validate appointment time
            this.validateAppointmentTime(date_time);

            // Check conflicts
            await this.checkDoctorAvailability(doctorId, date_time);

            // Get patient info 
            const [patientRows] = await conn.execute(
                `SELECT p.id, p.user_id, u.email 
     FROM patients p 
     JOIN users u ON p.user_id = u.id 
     WHERE p.id = ?`,
                [patient_id]
            );

            if (patientRows.length === 0) throw new Error('Patient not found');

            const patient = patientRows[0];

            // Check patient scheduling limits
            await this.checkPatientSchedulingLimits(patient.id, date_time);

            // Create appointment
            const appointmentReason = reason || 'Appointment from doctor';
            const appointmentStatus = 'pending';

            const [apptResult] = await conn.execute(
                'INSERT INTO appointments (patient_id, doctor_id, date_time, reason, status, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [patient.id, doctorId, date_time, appointmentReason, appointmentStatus]
            );
            const appointmentId = apptResult.insertId;

            //  Create notification with user_id 
            const title = 'New appointment scheduled';
            const body = `You have a new appointment on ${new Date(date_time).toLocaleString()}.`;
            const notifData = JSON.stringify({ appointmentId, date_time, reason: appointmentReason });

            await conn.execute(
                'INSERT INTO notifications (user_id, type, title, body, data, created_at) VALUES (?, ?, ?, ?, ?, NOW())',
                [patient.user_id, 'appointment', title, body, notifData]
            );

            await conn.commit();

            // Send email (non-blocking)
            this.sendAppointmentEmail(patient, date_time, reason).catch(err => {
                console.error('Failed to send appointment email:', err);
            });

            return {
                appointmentId,
                message: 'Appointment created, patient notified',
                data: {
                    appointmentId,
                    patient: { id: patient.user_id, email: patient.email }
                }
            };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Cancel appointment
    static async cancelAppointment(userId, appointmentId, userRole) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            let whereClause, params;

            if (userRole === 'patient') {
                // Get patient_id
                const [patientRows] = await conn.execute(
                    'SELECT id FROM patients WHERE user_id = ?',
                    [userId]
                );

                if (patientRows.length === 0) {
                    throw new Error('Patient profile not found');
                }

                whereClause = 'id = ? AND patient_id = ?';
                params = [appointmentId, patientRows[0].id];
            } else if (userRole === 'doctor') {
                // Get doctor_id
                const [doctorRows] = await conn.execute(
                    'SELECT id FROM doctors WHERE user_id = ?',
                    [userId]
                );

                if (doctorRows.length === 0) {
                    throw new Error('Doctor profile not found');
                }

                whereClause = 'id = ? AND doctor_id = ?';
                params = [appointmentId, doctorRows[0].id];
            } else {
                throw new Error('Invalid user role');
            }

            // Check if appointment exists and get details
            const [appointments] = await conn.execute(
                `SELECT * FROM appointments WHERE ${whereClause}`,
                params
            );

            if (appointments.length === 0) {
                throw new Error('Appointment not found or you do not have permission to cancel it');
            }

            const appointment = appointments[0];

            // Check if appointment can be cancelled (not already completed)
            if (appointment.status === 'completed') {
                throw new Error('Cannot cancel a completed appointment');
            }

            if (appointment.status === 'cancelled') {
                throw new Error('Appointment is already cancelled');
            }

            // Update status to cancelled
            await conn.execute(
                'UPDATE appointments SET status = ? WHERE id = ?',
                ['cancelled', appointmentId]
            );

            await conn.commit();

            return { message: 'Appointment cancelled successfully' };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Update appointment status (doctors only)
    static async updateAppointmentStatus(doctorUserId, appointmentId, newStatus) {
        const conn = await db.getConnection();

        try {
            await conn.beginTransaction();

            // Get doctor_id
            const [doctorRows] = await conn.execute(
                'SELECT id FROM doctors WHERE user_id = ?',
                [doctorUserId]
            );

            if (doctorRows.length === 0) {
                throw new Error('Doctor profile not found');
            }

            const doctorId = doctorRows[0].id;

            // Check if appointment exists and belongs to this doctor
            const [appointments] = await conn.execute(
                'SELECT * FROM appointments WHERE id = ? AND doctor_id = ?',
                [appointmentId, doctorId]
            );

            if (appointments.length === 0) {
                throw new Error('Appointment not found or you do not have permission to update it');
            }

            const appointment = appointments[0];

            // Validate status transition
            const validTransitions = {
                'pending': ['confirmed', 'cancelled'],
                'confirmed': ['completed', 'cancelled'],
                'completed': [], // Cannot change from completed
                'cancelled': [] // Cannot change from cancelled
            };

            if (!validTransitions[appointment.status].includes(newStatus)) {
                throw new Error(`Cannot change appointment status from ${appointment.status} to ${newStatus}`);
            }

            // Update status
            await conn.execute(
                'UPDATE appointments SET status = ? WHERE id = ?',
                [newStatus, appointmentId]
            );

            await conn.commit();

            return { message: 'Appointment status updated successfully' };

        } catch (error) {
            await conn.rollback();
            throw error;
        } finally {
            conn.release();
        }
    }

    // Get appointments with pagination and filtering
    static async getAppointments(userId, userRole, filters) {
        const {
            page = 1,
            limit = 10,
            sortBy = 'date_time',
            order = 'DESC',
            status,
            date_from,
            date_to,
            search,
            specialty,
            upcoming,
            past
        } = filters;

        const offset = (page - 1) * limit;
        let userIdField, joinClause, selectFields;
        let dbQueryParams = [];
        let whereConditions = []; // always initialize!

        if (userRole === 'patient') {
            // Get patient profile id
            const [patientRows] = await db.execute(
                'SELECT id FROM patients WHERE user_id = ?',
                [userId]
            );

            if (patientRows.length === 0) {
                throw new Error('Patient profile not found');
            }

            const patientId = patientRows[0].id;
            userIdField = 'a.patient_id';

            joinClause = `
            JOIN doctors d ON a.doctor_id = d.id
            JOIN users u ON d.user_id = u.id
        `;

            selectFields = `
            a.id, 
            a.date_time, 
            a.status, 
            a.reason,
            a.created_at,
            u.name AS doctor_name, 
            d.specialty,
            CASE 
                WHEN a.date_time > NOW() THEN 'upcoming'
                ELSE 'past'
            END as appointment_type
        `;

            // Base condition
            whereConditions.push(`${userIdField} = ?`);
            dbQueryParams.push(patientId);

            // Extra filters
            if (status) {
                whereConditions.push('a.status = ?');
                dbQueryParams.push(status);
            }
            if (specialty) {
                whereConditions.push('d.specialty LIKE ?');
                dbQueryParams.push(`%${specialty}%`);
            }
            if (upcoming === 'true') {
                whereConditions.push('a.date_time > NOW()');
            }
            if (past === 'true') {
                whereConditions.push('a.date_time < NOW()');
            }
            if (date_from) {
                whereConditions.push('DATE(a.date_time) >= ?');
                dbQueryParams.push(date_from);
            }
            if (date_to) {
                whereConditions.push('DATE(a.date_time) <= ?');
                dbQueryParams.push(date_to);
            }
            if (search) {
                whereConditions.push('(u.name LIKE ? OR a.reason LIKE ? OR d.specialty LIKE ?)');
                dbQueryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }

        } else if (userRole === 'doctor') {
            // Get doctor profile id
            const [doctorRows] = await db.execute(
                'SELECT id FROM doctors WHERE user_id = ?',
                [userId]
            );

            if (doctorRows.length === 0) {
                throw new Error('Doctor profile not found');
            }

            const doctorId = doctorRows[0].id;
            userIdField = 'a.doctor_id';

            joinClause = `
            JOIN patients p ON a.patient_id = p.id
            JOIN users u ON p.user_id = u.id
        `;

            selectFields = `
            a.id, 
            a.date_time, 
            a.status, 
            a.reason,
            a.created_at,
            u.name AS patient_name,
            p.phone AS patient_phone,
            u.email AS patient_email,
            CASE 
                WHEN a.date_time > NOW() THEN 'upcoming'
                ELSE 'past'
            END as appointment_type
        `;

            // Base condition
            whereConditions.push(`${userIdField} = ?`);
            dbQueryParams.push(doctorId);

            // Extra filters
            if (status) {
                whereConditions.push('a.status = ?');
                dbQueryParams.push(status);
            }
            if (upcoming === 'true') {
                whereConditions.push('a.date_time > NOW()');
            }
            if (past === 'true') {
                whereConditions.push('a.date_time < NOW()');
            }
            if (date_from) {
                whereConditions.push('DATE(a.date_time) >= ?');
                dbQueryParams.push(date_from);
            }
            if (date_to) {
                whereConditions.push('DATE(a.date_time) <= ?');
                dbQueryParams.push(date_to);
            }
            if (search) {
                whereConditions.push('(u.name LIKE ? OR a.reason LIKE ? OR p.phone LIKE ?)');
                dbQueryParams.push(`%${search}%`, `%${search}%`, `%${search}%`);
            }
        }

        // 🛠 Ensure WHERE is never empty
        const whereClause = whereConditions.length > 0
            ? 'WHERE ' + whereConditions.join(' AND ')
            : '';

        // Validate sortBy to prevent SQL injection
        const validSortColumns = ['date_time', 'status', 'created_at', 'id'];
        const safeSortBy = validSortColumns.includes(sortBy) ? sortBy : 'date_time';
        const safeOrder = ['ASC', 'DESC'].includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

        // Get appointments
        const appointmentQuery = `
        SELECT ${selectFields}
        FROM appointments a
        ${joinClause}
        ${whereClause}
        ORDER BY a.${safeSortBy} ${safeOrder}
        LIMIT ? OFFSET ?
    `;

        const [appointments] = await db.execute(
            appointmentQuery,
            [...dbQueryParams, parseInt(limit), offset]
        );

        // Get total count
        const countQuery = `
        SELECT COUNT(*) as total
        FROM appointments a
        ${joinClause}
        ${whereClause}
    `;
        const [countResult] = await db.execute(countQuery, dbQueryParams);
        const total = countResult[0].total;

        // Get summary stats
        const statsQuery = `
        SELECT 
            COUNT(*) as total_appointments,
            SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pending,
            SUM(CASE WHEN status = 'confirmed' THEN 1 ELSE 0 END) as confirmed,
            SUM(CASE WHEN status = 'completed' THEN 1 ELSE 0 END) as completed,
            SUM(CASE WHEN status = 'cancelled' THEN 1 ELSE 0 END) as cancelled,
            SUM(CASE WHEN date_time > NOW() THEN 1 ELSE 0 END) as upcoming,
            SUM(CASE WHEN date_time < NOW() THEN 1 ELSE 0 END) as past
        FROM appointments a
        ${joinClause}
        ${whereClause}
    `;
        const [statsResult] = await db.execute(statsQuery, dbQueryParams);

        return {
            appointments,
            pagination: {
                page: parseInt(page),
                limit: parseInt(limit),
                total,
                pages: Math.ceil(total / limit),
                hasNext: page * limit < total,
                hasPrev: page > 1
            },
            stats: statsResult[0],
            filters: {
                status,
                date_from,
                date_to,
                search,
                specialty,
                upcoming,
                past,
                sortBy: safeSortBy,
                order: safeOrder
            }
        };
    }

    // Send appointment email
    static async sendAppointmentEmail(patientUser, dateTime, reason) {
        const emailHtml = `
            <p>Hi ${patientUser.name || ''},</p>
            <p>Your doctor scheduled a new appointment:</p>
            <ul>
                <li>Date: ${new Date(dateTime).toLocaleString()}</li>
                <li>Reason: ${reason || 'N/A'}</li>
            </ul>
            <p><a href="${process.env.FRONTEND_URL || '#'}">View in app</a></p>
        `;

        await sendEmail({
            to: patientUser.email,
            subject: 'New Appointment Scheduled',
            text: `Your appointment on ${new Date(dateTime).toLocaleString()}. Reason: ${reason || 'N/A'}`,
            html: emailHtml
        });
    }
}

module.exports = AppointmentService;