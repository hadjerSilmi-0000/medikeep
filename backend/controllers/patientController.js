const db = require('../config/db');

exports.searchDoctors = async (req, res) => {
    try {
        const { name = '', specialty = '' } = req.query;

        const [doctors] = await db.execute(
            `SELECT u.id, u.name, d.specialty
             FROM users u
             JOIN doctors d ON u.id = d.user_id
             WHERE u.role = 'doctor'
             AND u.name LIKE ?
             AND d.specialty LIKE ?`,
            [`%${name}%`, `%${specialty}%`]
        );

        res.json({ success: true, data: doctors });
    } catch (err) {
        console.error('Search doctors error:', err);
        res.status(500).json({ success: false, message: 'Internal server error' });
    }
};
