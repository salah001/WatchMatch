// roleMiddleware.js
const checkRole = (requiredRole) => {
  return (req, res, next) => {
console.log('🧠 User in checkRole:', req.user);
    const user = req.user;

    if (!user || !user.roles || !user.roles.includes(requiredRole)) {
      return res.status(403).json({ message: "Access denied. Insufficient permissions." });
    }

    next();
  };
};

module.exports = { checkRole };
