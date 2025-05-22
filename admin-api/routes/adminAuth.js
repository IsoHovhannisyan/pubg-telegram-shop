const express = require("express");
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const db = require("../../bot/db/connect");
require("dotenv").config();

const router = express.Router();

// ✅ Login համակարգ
router.post("/login", async (req, res) => {
  const { username, password } = req.body;

  try {
    const result = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
    const admin = result.rows[0];

    if (!admin) {
      return res.status(401).json({ error: "⛔ Սխալ օգտանուն" });
    }

    const isMatch = await bcrypt.compare(password, admin.password);
    if (!isMatch) {
      return res.status(401).json({ error: "⛔ Սխալ գաղտնաբառ" });
    }

    const token = jwt.sign({ id: admin.id, role: "admin" }, process.env.JWT_SECRET, {
      expiresIn: "2h"
    });

    res.json({ token });
  } catch (err) {
    console.error("❌ Login error:", err.message);
    res.status(500).json({ error: "💥 Սերվերի սխալ" });
  }
});

module.exports = router;



