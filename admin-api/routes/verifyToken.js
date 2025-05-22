const jwt = require('jsonwebtoken');
require('dotenv').config();

module.exports = (req, res, next) => {
  const authHeader = req.headers.authorization;

  if (!authHeader?.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'No token provided' });
  }

  const token = authHeader.split(' ')[1];

  // ✅ Հատուկ թողություն բոտի SECRET-ի համար
  if (token === process.env.ADMIN_SECRET) {
    req.user = { role: 'bot' }; // ցանկության դեպքում կարող ես ավելացնել bot user info
    return next();
  }

  // 🔐 Սովորական JWT ստուգում (Admin Panel-ից)
  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.user = decoded; // `{ id, username, role }`
    next();
  } catch (err) {
    return res.status(403).json({ error: 'Invalid or expired token' });
  }
};


