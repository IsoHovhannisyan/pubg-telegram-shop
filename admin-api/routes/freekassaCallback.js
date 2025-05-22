const express = require("express");
const router = express.Router();

// ⚠️ Пример простой Freekassa callback (можно доработать под sig проверку)
router.post("/freekassa/callback", async (req, res) => {
  try {
    const { MERCHANT_ORDER_ID, AMOUNT, SIGN } = req.body;
    // Проверка подписи и логика обновления заказа здесь
    console.log("💰 Freekassa callback received:", req.body);
    res.send("YES");
  } catch (err) {
    console.error("❌ Ошибка Freekassa callback:", err);
    res.status(500).send("FAIL");
  }
});

module.exports = router;