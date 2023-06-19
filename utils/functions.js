const jwt = require('jsonwebtoken');
const accessTokenExpiryTime = '1d';
const refreshTokenExpiryTime = '7d';

exports.generateAccessToken = (user) => {
    console.log(" User ",user)

    return jwt.sign(user, process.env.JWT_ACCESS_TOKEN_SECRET, { expiresIn: accessTokenExpiryTime });
}

exports.generateRefreshToken = (user) => {
    return jwt.sign(user, process.env.JWT_REFRESH_TOKEN_SECRET, { expiresIn: refreshTokenExpiryTime });
}
