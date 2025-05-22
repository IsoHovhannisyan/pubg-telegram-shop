// admin-api/routes/setupAdmin.js

const express = require("express");
const bcrypt = require("bcrypt");
const db = require("../../bot/db/connect");
require("dotenv").config();

const router = express.Router();

// ✅ Միայն մեկ անգամ օգտագործելու համար՝ ստեղծել admin
router.get("/setup-admin", async (req, res) => {
  try {
    const username = process.env.ADMIN_USERNAME;
    const rawPassword = process.env.ADMIN_PASSWORD;

    const existing = await db.query("SELECT * FROM admins WHERE username = $1", [username]);
    if (existing.rows.length > 0) {
      return res.status(400).json({ error: "Admin already exists" });
    }

    const hashed = await bcrypt.hash(rawPassword, 10);
    await db.query("INSERT INTO admins (username, password) VALUES ($1, $2)", [username, hashed]);

    res.json({ success: true, message: "✅ Admin created successfully" });
  } catch (err) {
    console.error("❌ Admin setup error:", err.message);
    res.status(500).json({ error: "Failed to create admin" });
  }
});

module.exports = router;
