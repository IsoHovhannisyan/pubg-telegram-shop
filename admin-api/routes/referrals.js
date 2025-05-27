const express = require("express");
const db = require("../../bot/db/connect");
const verifyToken = require("../routes/verifyToken");
const router = express.Router();

// 📥 Получить реферальные данные всех пользователей
router.get("/referrals", verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT * FROM referrals
      ORDER BY created_at DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Ошибка при получении рефералов:", err);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

// 📊 Получить сводную статистику по рефералам
router.get("/referrals/summary", verifyToken, async (req, res) => {
  try {
    // Всего рефералов
    const totalRes = await db.query(`SELECT COUNT(*) FROM referrals`);
    const totalReferrals = parseInt(totalRes.rows[0].count, 10);

    // Топ-5 рефереров (по referred_by)
    const topRes = await db.query(`
      SELECT referred_by, COUNT(*) as invited_count
      FROM referrals
      GROUP BY referred_by
      ORDER BY invited_count DESC
      LIMIT 5
    `);
    const topReferrers = topRes.rows;

    res.json({
      totalReferrals,
      topReferrers
    });
  } catch (err) {
    console.error("❌ Ошибка при получении сводной статистики рефералов:", err);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// 📥 Получить рефералы, где пригласивший = userId
router.get("/referrals/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(`
      SELECT * FROM referrals
      WHERE referred_by = $1
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Ошибка при получении реферала:", err);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

// POST: Register a new referral if not already exists
router.post("/referrals", verifyToken, async (req, res) => {
  const { user_id, referred_by, level } = req.body;
  if (!user_id || !referred_by) {
    return res.status(400).json({ error: "user_id and referred_by are required" });
  }
  try {
    // Check if referral already exists
    const exists = await db.query('SELECT 1 FROM referrals WHERE user_id = $1', [user_id]);
    if (exists.rowCount === 0) {
      await db.query('INSERT INTO referrals (user_id, referred_by, level) VALUES ($1, $2, $3)', [user_id, referred_by, level || 1]);
      return res.json({ success: true, created: true });
    } else {
      return res.json({ success: true, created: false });
    }
  } catch (err) {
    console.error("❌ Ошибка при создании реферала:", err);
    res.status(500).json({ error: "Ошибка создания реферала" });
  }
});

module.exports = router;