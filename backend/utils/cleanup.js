const db = require('../config/db');

// Every 12 hours: Delete expired blacklisted tokens & refresh tokens
const cleanExpiredTokens = async () => {
    try {
        await db.execute('DELETE FROM token_blacklist WHERE expires_at < NOW()');
        await db.execute('DELETE FROM refresh_tokens WHERE expires_at < NOW()');
        console.log(' Expired tokens cleaned');
    } catch (err) {
        console.error('Cleanup failed:', err.message);
    }
};

module.exports = cleanExpiredTokens;
