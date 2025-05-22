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

// 📥 Получить баллы одного пользователя
router.get("/referrals/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    const result = await db.query(`
      SELECT * FROM referrals
      WHERE user_id = $1
    `, [userId]);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Ошибка при получении реферала:", err);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

module.exports = router;