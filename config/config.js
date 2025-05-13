require('dotenv').config();

module.exports = {
  mongoURI: process.env.MONGODB_URI,
  jwtSecret: process.env.JWT_SECRET || '32955f22eb89eb17d1f0babf2f8f4e04e0d1ca0026636af28a1680f5d1df098f',
  jwtExpire: '7d' // Ensure this is a proper format
};