const jwt = require('jsonwebtoken');
const { v4: uuidv4 } = require('uuid');
require('dotenv').config();


function generateAccessToken(userId, role) {
    const jti = uuidv4(); // Unique ID for this token

    const payload = {
        sub: userId,
        role,
        jti,
    };

    const token = jwt.sign(payload, process.env.ACCESS_TOKEN_SECRET, {
        expiresIn: '30m',
    });

    return { token, jti };
}


const generateRefreshToken = (user) => {
    return jwt.sign(
        { id: user.id, role: user.role },
        process.env.REFRESH_TOKEN_SECRET,
        { expiresIn: process.env.REFRESH_TOKEN_EXPIRY || '7d' }
    );
};

module.exports = {
    generateAccessToken,
    generateRefreshToken
};
