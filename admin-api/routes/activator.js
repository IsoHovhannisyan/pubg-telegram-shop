const express = require("express");
const router = express.Router();
const fetch = require("node-fetch");
const verifyToken = require("./verifyToken");

router.post("/redeem", verifyToken, async (req, res) => {
  const { playerId, codeType } = req.body;

  try {
    const response = await fetch("https://synet.syntex-dev.ru/redeemDb", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ACTIVATOR_API_TOKEN}`
      },
      body: JSON.stringify({ playerId, codeType })
    });

    const data = await response.json();
    res.json(data);
  } catch (err) {
    console.error("❌ Redeem error:", err.message);
    res.status(500).json({ error: "Redeem failed" });
  }
});


// ✅ Նոր route՝ test_uc կոդերը history-ից
router.get("/list-codes", async (req, res) => {
  try {
    const response = await fetch("https://synet.syntex-dev.ru/history", {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${process.env.ACTIVATOR_API_TOKEN}`
      }
    });

    const data = await response.json();

    if (!Array.isArray(data)) {
      console.error("❌ Invalid response format: data is not an array");
      return res.status(500).json({ error: "Invalid response format from server" });
    }

    // Ֆիլտրում ենք միայն test_uc կոդերը
    const testCodes = data.filter((item) => item && item.productName === "test_uc");

    res.json({ testCodes });
  } catch (err) {
    console.error("❌ Error getting code history:", err.message);
    res.status(500).json({ error: "Failed to fetch code history" });
  }
});

module.exports = router;


