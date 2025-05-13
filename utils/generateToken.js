const jwt = require('jsonwebtoken');
const { jwtSecret } = require('../config/config');

const generateToken = (id) => {
  return jwt.sign({ id }, jwtSecret, {
    expiresIn: '7d' // Changed from JWT_EXPIRE to a proper string format
  });
};

module.exports = generateToken;