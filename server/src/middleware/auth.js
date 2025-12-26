const jwt = require('jsonwebtoken');

const authenticateToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  const token = authHeader && authHeader.split(' ')[1];

  if (!token) {
    return res.status(401).json({ success: false, message: 'Token required' });
  }

  jwt.verify(token, process.env.JWT_SECRET, (err, payload) => {
    if (err) {
      return res.status(401).json({ success: false, message: 'Invalid token' });
    }

    req.user = {
      userId: payload.userId,
      organizationId: payload.organizationId || null,
      role: payload.role
    };

    next();
  });
};

module.exports = { authenticateToken };
