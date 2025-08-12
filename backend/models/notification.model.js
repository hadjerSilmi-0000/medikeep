// models/notification.model.js
const db = require('../config/db');

const Notification = {
    create: async ({ user_id, type, title, body, data = null }) => {
        const sql = `
      INSERT INTO notifications (user_id, type, title, body, data, created_at)
      VALUES (?, ?, ?, ?, ?, NOW())
    `;
        const [result] = await db.execute(sql, [user_id, type, title, body, JSON.stringify(data)]);
        return result.insertId;
    },

    markRead: async (id) => {
        const sql = `UPDATE notifications SET is_read = 1 WHERE id = ?`;
        const [result] = await db.execute(sql, [id]);
        return result.affectedRows;
    }
};

module.exports = Notification;
