const express = require('express');
const router = express.Router();
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const { authenticateToken } = require('../../authMiddleware');

// POST /api/auth/login
router.post('/login', async (req, res) => {
  const { email, password } = req.body;
  try {
    const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
    const user = result.rows[0];

    if (!user) return res.status(400).json({ message: 'User not found' });

    const isMatch = await bcrypt.compare(password, user.password);
    if (!isMatch) return res.status(401).json({ message: 'Invalid password' });

    const token = jwt.sign({ userId: user.id }, process.env.JWT_SECRET, { expiresIn: '7d' });

    res.json({
      token,
      user: {
        userId: user.id,
        name: user.name,
        email: user.email,
        is_owner: user.is_owner
      }
    });
  } catch (err) {
    console.error("Login error:", err);
    res.status(500).json({ message: 'Server error' });
  }
});

// @route   GET /auth/me
// @desc    Return current authenticated user
// @access  Private
router.get('/me', authenticateToken, (req, res) => {
  // Send back the user info (excluding password)
  const { password, ...userWithoutPassword } = req.user;
  res.json(userWithoutPassword);
});

module.exports = router;
