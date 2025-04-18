const jwt = require('jsonwebtoken');
const db = require('./db'); // Adjust based on your DB setup


const authenticateToken  = async (req, res, next) => {

console.log("🔐 [authMiddleware] Running authenticateToken...");
    const token = req.header('Authorization')?.replace('Bearer ', '');

    if (!token) {
        return res.status(401).json({ message: "Access denied. No token provided." });
    }

    try {
        const decoded = jwt.verify(token, process.env.JWT_SECRET);
	console.log('🔓 here Token decoded:', decoded); // 👈 Add this

        // Fetch the user from the DB using the userId in the token
        const userResult = await db.query('SELECT * FROM users WHERE id = $1', [decoded.userId]);

	if (userResult.rows.length === 0) {
            return res.status(401).json({ message: 'User not found.' });
        }

	const user = userResult.rows[0];
	console.log('🔎 DB user result:', user);
	// Check if the tokenVersion from the decoded token matches the one in the DB
        if (user.tokenversion !== decoded.tokenVersion) {
            return res.status(401).json({ message: 'Session expired. Please log in again.' });
        }

	// Attach the user object to the request for later use
        req.user = user;
	
	// Proceed with the next middleware or route handler
        next();

    } catch (error) {
	console.error("❌ Invalid token error:", error);
    	console.log("🔐 Token received:", token); // 👈 Add this
        res.status(401).json({ message: "Invalid token." });
    }
};

module.exports = { authenticateToken };