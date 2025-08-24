// services/notificationService.js
const Notification = require('../models/notification.model');
const db = require('../config/db');
const nodemailer = require('nodemailer');

class NotificationService {
    constructor() {
        // Initialize email transporter (Ethereal Email)
        this.emailTransporter = null;
        this.initializeEmailTransporter();
    }

    // Initialize email transporter for Ethereal Email
    async initializeEmailTransporter() {
        try {
            // You should move these to environment variables
            this.emailTransporter = nodemailer.createTransport({
                host: 'smtp.ethereal.email',
                port: 587,
                auth: {
                    user: process.env.ETHEREAL_EMAIL || 'your-ethereal-email',
                    pass: process.env.ETHEREAL_PASSWORD || 'your-ethereal-password'
                }
            });
        } catch (error) {
            console.error('Failed to initialize email transporter:', error);
        }
    }

    // Get all notifications for a user with pagination
    async getUserNotifications(userId, page = 1, limit = 10, sortBy = 'created_at', order = 'DESC') {
        try {
            const offset = (page - 1) * limit;
            const validSortColumns = ['id', 'type', 'title', 'created_at', 'is_read'];
            const validOrder = ['ASC', 'DESC'];

            // Validate sort parameters
            const sortColumn = validSortColumns.includes(sortBy) ? sortBy : 'created_at';
            const sortOrder = validOrder.includes(order.toUpperCase()) ? order.toUpperCase() : 'DESC';

            // Get total count for pagination
            const [countResult] = await db.execute(
                'SELECT COUNT(*) as total FROM notifications WHERE user_id = ?',
                [userId]
            );
            const totalRecords = countResult[0].total;

            // Get notifications with pagination
            const [notifications] = await db.execute(
                `SELECT * FROM notifications 
             WHERE user_id = ? 
             ORDER BY ${sortColumn} ${sortOrder} 
             LIMIT ? OFFSET ?`,
                [userId, parseInt(limit), parseInt(offset)]
            );

            // Safe JSON parser
            const safeParse = (data) => {
                if (!data) return null;
                try {
                    return JSON.parse(data);
                } catch {
                    return data; // return raw text if not valid JSON
                }
            };

            const parsedNotifications = notifications.map(notification => ({
                ...notification,
                data: safeParse(notification.data)
            }));

            return {
                success: true,
                data: parsedNotifications,
                pagination: {
                    currentPage: parseInt(page),
                    totalPages: Math.ceil(totalRecords / limit),
                    totalRecords: totalRecords,
                    hasNextPage: page < Math.ceil(totalRecords / limit),
                    hasPrevPage: page > 1
                }
            };
        } catch (error) {
            console.error('Error fetching user notifications:', error);
            throw new Error('Failed to fetch notifications');
        }
    }

    // Mark notification as read
    async markNotificationAsRead(notificationId, userId = null) {
        try {
            let query = 'UPDATE notifications SET is_read = 1 WHERE id = ?';
            let params = [notificationId];

            // If userId provided, ensure user owns the notification
            if (userId) {
                query += ' AND user_id = ?';
                params.push(userId);
            }

            const [result] = await db.execute(query, params);

            if (result.affectedRows === 0) {
                throw new Error('Notification not found or access denied');
            }

            return { success: true, message: 'Notification marked as read' };
        } catch (error) {
            console.error('Error marking notification as read:', error);
            throw error;
        }
    }

    // Mark all notifications as read for a user
    async markAllAsRead(userId) {
        try {
            const [result] = await db.execute(
                'UPDATE notifications SET is_read = 1 WHERE user_id = ? AND is_read = 0',
                [userId]
            );

            return {
                success: true,
                message: `${result.affectedRows} notifications marked as read`
            };
        } catch (error) {
            console.error('Error marking all notifications as read:', error);
            throw new Error('Failed to mark notifications as read');
        }
    }

    // Create and send notification
    async createAndSendNotification({
        userId,
        type,
        title,
        body,
        data = null,
        sendEmail = false,
        userEmail = null
    }) {
        try {
            // Create in-app notification
            const notificationId = await Notification.create({
                user_id: userId,
                type,
                title,
                body,
                data
            });

            // Send email notification if requested
            if (sendEmail && userEmail && this.emailTransporter) {
                await this.sendEmailNotification({
                    to: userEmail,
                    subject: title,
                    body: body,
                    type: type,
                    data: data
                });
            }

            return {
                success: true,
                notificationId,
                message: 'Notification created successfully'
            };
        } catch (error) {
            console.error('Error creating notification:', error);
            throw new Error('Failed to create notification');
        }
    }

    // Send email notification
    async sendEmailNotification({ to, subject, body, type, data }) {
        try {
            if (!this.emailTransporter) {
                console.warn('Email transporter not initialized');
                return { success: false, message: 'Email service not available' };
            }

            const htmlBody = this.generateEmailTemplate(body, type, data);

            const mailOptions = {
                from: process.env.FROM_EMAIL || 'noreply@yourapp.com',
                to: to,
                subject: subject,
                text: body,
                html: htmlBody
            };

            const info = await this.emailTransporter.sendMail(mailOptions);

            return {
                success: true,
                messageId: info.messageId,
                previewUrl: nodemailer.getTestMessageUrl(info) // For Ethereal Email
            };
        } catch (error) {
            console.error('Error sending email:', error);
            throw new Error('Failed to send email notification');
        }
    }

    // Generate HTML email template based on notification type
    generateEmailTemplate(body, type, data) {
        const baseTemplate = `
            <!DOCTYPE html>
            <html>
            <head>
                <meta charset="UTF-8">
                <title>Notification</title>
                <style>
                    body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
                    .container { max-width: 600px; margin: 0 auto; padding: 20px; }
                    .header { background-color: #007bff; color: white; padding: 20px; text-align: center; }
                    .content { padding: 20px; background-color: #f8f9fa; }
                    .footer { text-align: center; padding: 10px; font-size: 12px; color: #6c757d; }
                </style>
            </head>
            <body>
                <div class="container">
                    <div class="header">
                        <h2>${this.getTypeTitle(type)}</h2>
                    </div>
                    <div class="content">
                        <p>${body}</p>
                        ${this.getTypeSpecificContent(type, data)}
                    </div>
                    <div class="footer">
                        <p>This is an automated notification. Please do not reply to this email.</p>
                    </div>
                </div>
            </body>
            </html>
        `;
        return baseTemplate;
    }

    // Get title based on notification type
    getTypeTitle(type) {
        const titles = {
            'appointment': 'Appointment Notification',
            'prescription': 'Prescription Notification',
            'reminder': 'Reminder',
            'system': 'System Notification'
        };
        return titles[type] || 'Notification';
    }

    // Get type-specific content for email
    getTypeSpecificContent(type, data) {
        if (!data) return '';

        switch (type) {
            case 'appointment':
                if (data.appointmentId) {
                    return `<p><strong>Appointment Details:</strong> Reference ID #${data.appointmentId}</p>`;
                }
                break;
            case 'prescription':
                if (data.prescriptionId) {
                    return `<p><strong>Prescription ID:</strong> #${data.prescriptionId}</p>`;
                }
                break;
            default:
                return '';
        }
        return '';
    }

    // Get notification statistics for a user
    async getNotificationStats(userId) {
        try {
            const [stats] = await db.execute(`
                SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_read = 0 THEN 1 ELSE 0 END) as unread,
                    SUM(CASE WHEN is_read = 1 THEN 1 ELSE 0 END) as read
                FROM notifications 
                WHERE user_id = ?
            `, [userId]);

            return {
                success: true,
                stats: stats[0]
            };
        } catch (error) {
            console.error('Error fetching notification stats:', error);
            throw new Error('Failed to fetch notification statistics');
        }
    }
}

module.exports = new NotificationService();