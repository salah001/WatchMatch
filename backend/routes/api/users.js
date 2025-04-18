const express = require('express');
const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const db = require('../../db');
const authMiddleware = require('../../authMiddleware');
const { authenticateToken } = require('../../authMiddleware');
const { checkRole } = require('../../roleMiddleware');


const router = express.Router();

// User Registration (Signup)
router.post('/register', async (req, res) => {
    const { name, email, password, role } = req.body;

    // Validate role
    if (!role || !['owner', 'user'].includes(role)) {
        return res.status(400).json({ error: 'Invalid role. Must be "owner" or "user".' });
    }

    // Validate required fields
    if (!name || !email || !password) {
        return res.status(400).json({ error: 'Missing required fields.' });
    }
	
    try {

	// Check if user already exists
        const userCheck = await db.query('SELECT * FROM users WHERE email = $1', [email]);
        if (userCheck.rows.length > 0) {
          return res.status(400).json({ message: 'User already exists!' });
        }

        // Hash the password
        const salt = await bcrypt.genSalt(10);
        const hashedPassword = await bcrypt.hash(password, salt);

        // Store user in DB
        const newUser = await db.query(
            `INSERT INTO users (name, email, password, roles, activeRole, tokenVersion, created_at) VALUES ($1, $2, $3, $4, $5, $6, NOW()) 
		RETURNING id, name, email, roles, activeRole, tokenVersion;`, [name, email, hashedPassword, [role], role, 0]
        );

	const user = newUser.rows[0];

        // Create a JWT token
        const token = jwt.sign({ userId: user.id, tokenVersion: user.tokenversion }, process.env.JWT_SECRET, {expiresIn: '1h'}
        );

	// Respond with the new user and the token
        res.status(201).json({user , token});

    } catch (err) {
        console.error(err);
        res.status(500).send("Error creating user");
    }
});

// User Login
router.post('/login', async (req, res) => {
    const { email, password } = req.body;
    console.log('🔐 Login Attempt:', { email, password });
    try {

	// Check if user exists
        const result = await db.query('SELECT * FROM users WHERE email = $1', [email]);
	console.log('DB Query Result:', result.rows); 

        if (result.rows.length === 0) return res.status(400).json({ message: "User not found" });

        const user = result.rows[0];
	
	// Ensure roles is an array
        const roles = Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles);

        // Check password
        const isMatch = await bcrypt.compare(password, user.password);
        if (!isMatch) return res.status(400).json({ message: "Invalid credentials" });

        // Generate JWT
        const token = jwt.sign({ userId: user.id, tokenVersion: user.tokenversion }, process.env.JWT_SECRET, { expiresIn: "1h" });

	// Log token generated
    	console.log('Generated JWT token:', token);

        res.json({
  		token,
  		user: {
		id: user.id,
    		userId: user.id,
    		name: user.name,
    		email: user.email,
    		roles,
    		activeRole: user.activerole // note lowercase field name in JS object
  		}
	});
    } catch (err) {
        console.error(err);
        res.status(500).send("Error logging in");
    }
});

//User Logout
// Force Log Out by Updating tokenVersion
router.post('/logout', async (req, res) => {
    const userId = req.user.id; 

    try {
        // Increment tokenVersion to invalidate the current tokens
        await db.query('UPDATE users SET tokenVersion = tokenVersion + 1 WHERE id = $1', [userId]);

        res.status(200).json({ message: "Successfully logged out." });
    } catch (err) {
        console.error(err);
        res.status(500).json({ message: "Error logging out." });
    }
});

router.post('/switch-role', authenticateToken, async (req, res) => {
  const userId = req.user.id; 
  const { newRole } = req.body;

  const userResult = await db.query('SELECT roles FROM users WHERE id = $1', [userId]);

  if (userResult.rows.length === 0) {
    return res.status(400).json({ message: "User not found" });
  }

  const user = userResult.rows[0];

  // Ensure roles is an array
  const roles = Array.isArray(user.roles) ? user.roles : JSON.parse(user.roles);

  if (!roles.includes(newRole)) {
    return res.status(400).json({ message: "User does not have that role." });
  }
  await db.query('UPDATE users SET activeRole = $1 WHERE id = $2', [newRole, userId]);
  res.json({ message: "Role updated", activeRole: newRole });
});


router.get('/profile', authenticateToken, async (req, res) => {
  const userId = req.user.id;
  const userResult = await db.query('SELECT id, name, email, roles, activeRole FROM users WHERE id = $1', [userId]);

  if (userResult.rows.length === 0) {
    return res.status(404).json({ message: "User not found" });
  }

  res.json(userResult.rows[0]);
});



module.exports = router;