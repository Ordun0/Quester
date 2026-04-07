const express = require('express');
const router = express.Router();
const authController = require('../../controllers/authController');

console.log('📍 Loading auth routes...');
console.log('📍 authController.forgotPassword:', typeof authController.forgotPassword);
console.log('📍 authController.resetPassword:', typeof authController.resetPassword);

router.post('/register', authController.register);
router.post('/login', authController.login);
router.post('/forgot-password', authController.forgotPassword);
router.post('/reset-password', authController.resetPassword);

console.log('📍 Total routes:', router.stack.length);

module.exports = router;