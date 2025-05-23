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

module.exports = router;