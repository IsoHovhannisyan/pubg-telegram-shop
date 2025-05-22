// ✅ Supabase-ից ստանալու և թարմացնելու API route — settings.js

const express = require("express");
const router = express.Router();
const verifyToken = require("./verifyToken");
const db = require("../../bot/db/connect");

// ✅ Գործածենք միայն մեկ տող `settings` աղյուսակում, id = 1

// 📥 Ստանալ կարգավորումները
router.get("/shop-status", verifyToken, async (req, res) => {
  try {
    const result = await db.query("SELECT * FROM settings WHERE id = 1");
    if (result.rows.length === 0) {
      return res.status(404).json({ error: "Настройки не найдены." });
    }
    res.json(result.rows[0]);
  } catch (err) {
    console.error("❌ Ошибка получения настроек:", err.message);
    res.status(500).json({ error: "Не удалось получить настройки." });
  }
});

// 📤 Թարմացնել կարգավորումները
router.post("/shop-status", verifyToken, async (req, res) => {
  const { shop_open, orders_enabled, shop_closed_message, orders_disabled_message } = req.body;

  try {
    await db.query(
      `UPDATE settings SET 
        shop_open = $1,
        orders_enabled = $2,
        shop_closed_message = $3,
        orders_disabled_message = $4
      WHERE id = 1`,
      [
        Boolean(shop_open),
        Boolean(orders_enabled),
        shop_closed_message || "🛠 Магазин временно закрыт.",
        orders_disabled_message || "❗️Извините, заказы временно не принимаются."
      ]
    );
    res.json({ success: true });
  } catch (err) {
    console.error("❌ Ошибка обновления настроек:", err.message);
    res.status(500).json({ error: "Не удалось сохранить настройки." });
  }
});

module.exports = router;
