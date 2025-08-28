const express = require('express');
const { signup, login } = require('../controllers/authController');
const handleCORS = require('../middleware/cors');

const router = express.Router();

// Apply CORS middleware to all auth routes
router.use(handleCORS);

// POST /api/signup
router.post('/signup', signup);

// POST /api/login
router.post('/login', login);

module.exports = router;
