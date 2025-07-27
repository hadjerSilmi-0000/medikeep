const app = require('./app');
const db = require('./config/db');
require('dotenv').config();


const PORT = process.env.PORT || 5000;

// Test database query on startup
const testDatabaseQuery = async () => {
    try {
        const [rows] = await db.execute('SELECT COUNT(*) as count FROM users');
        console.log(`Database test successful. Current user count: ${rows[0].count}`);
    } catch (error) {
        console.error('Database test query failed:', error.message);
    }
};


// Start server
app.listen(PORT, async () => {
    console.log(`MediKeep server running on http://localhost:${PORT}`);
    await testDatabaseQuery();
});