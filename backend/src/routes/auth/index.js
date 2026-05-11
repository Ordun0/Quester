// backend/src/routes/auth/index.js

const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');

// Health check para auth routes
router.get('/', (req, res) => {
  res.json({ message: 'Auth routes working', timestamp: new Date().toISOString() });
});

// Registro
router.post('/register', authController.register);

// Login
router.post('/login', authController.login);

module.exports = router;