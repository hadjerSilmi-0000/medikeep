const db = require('../config/db');

async function getDoctorIdFromUserId(userId) {
    const sql = `SELECT id FROM doctors WHERE user_id = ? LIMIT 1`;
    const [rows] = await db.query(sql, [userId]);
    return rows.length ? rows[0].id : null;
}

module.exports = getDoctorIdFromUserId;
