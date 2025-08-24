const db = require('../config/db');

const Notification = {
    // Create a new notification (existing method - kept as is)
    create: async ({ user_id, type, title, body, data }) => {
        const [result] = await db.execute(
            `INSERT INTO notifications (user_id, type, title, body, data, is_read, created_at)
             VALUES (?, ?, ?, ?, ?, 0, NOW())`,
            [user_id, type, title, body, data ? JSON.stringify(data) : null]
        );
        return result.insertId;
    },

    // Mark notification as read (existing method - kept as is)
    markRead: async (id) => {
        const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    },

    // Find notification by ID (new method for validation)
    findById: async (id) => {
        const sql = `SELECT * FROM notifications WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);

        if (result.length === 0) {
            return null;
        }

        const notification = result[0];
        // Parse JSON data field
        if (notification.data) {
            try {
                notification.data = JSON.parse(notification.data);
            } catch (error) {
                console.error('Error parsing notification data:', error);
                notification.data = null;
            }
        }

        return notification;
    },

    // Find notification by ID and user ID (for security)
    findByIdAndUser: async (id, userId) => {
        const sql = `SELECT * FROM notifications WHERE id = ? AND user_id = ?`;
        const [result] = await db.execute(sql, [id, userId]);

        if (result.length === 0) {
            return null;
        }

        const notification = result[0];
        // Parse JSON data field
        if (notification.data) {
            try {
                notification.data = JSON.parse(notification.data);
            } catch (error) {
                console.error('Error parsing notification data:', error);
                notification.data = null;
            }
        }

        return notification;
    },

    // Delete notification (soft delete - add if needed in future)
    delete: async (id) => {
        const sql = `DELETE FROM notifications WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    },

    // Get unread count for a user
    getUnreadCount: async (userId) => {
        const sql = `SELECT COUNT(*) as count FROM notifications WHERE user_id = ? AND is_read = 0`;
        const [result] = await db.execute(sql, [userId]);
        return result[0].count;
    },

    // Bulk mark as read
    bulkMarkRead: async (notificationIds, userId = null) => {
        let sql = `UPDATE notifications SET is_read = 1 WHERE id IN (${notificationIds.map(() => '?').join(',')})`;
        let params = notificationIds;

        if (userId) {
            sql += ` AND user_id = ?`;
            params.push(userId);
        }

        const [result] = await db.execute(sql, params);
        return result.affectedRows;
    }
};

module.exports = Notification;