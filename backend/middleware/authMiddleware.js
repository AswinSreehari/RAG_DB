const authMiddleware = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ message: 'Unauthorized: No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // Simple token verification against env variable
  if (token !== process.env.API_SECRET_TOKEN) {
    return res.status(403).json({ message: 'Forbidden: Invalid token' });
  }

  next();
};

module.exports = authMiddleware;
