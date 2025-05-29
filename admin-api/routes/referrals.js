const express = require("express");
const db = require("../../bot/db/connect");
const verifyToken = require("../routes/verifyToken");
const router = express.Router();

// 📥 Получить реферальные данные всех пользователей
router.get("/referrals", verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        r.referred_by,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT r.user_id) as total_referrals,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(
          CASE 
            WHEN o.status = 'delivered' THEN 
              (SELECT SUM((item->>'price')::int * (item->>'qty')::int) 
               FROM jsonb_array_elements(o.products) AS item)
            ELSE 0 
          END
        ) as total_revenue
      FROM referrals r
      LEFT JOIN users u ON r.referred_by = u.telegram_id
      LEFT JOIN orders o ON r.user_id = o.user_id
      GROUP BY r.referred_by, u.username, u.first_name, u.last_name
      ORDER BY total_referrals DESC
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
    const totalRes = await db.query(`SELECT COUNT(DISTINCT user_id) FROM referrals`);
    const totalReferrals = parseInt(totalRes.rows[0].count, 10);

    // Топ-5 рефереров (по referred_by)
    const topRes = await db.query(`
      SELECT 
        r.referred_by,
        COUNT(DISTINCT r.user_id) as invited_count,
        SUM(
          CASE 
            WHEN o.status = 'delivered' THEN 
              (SELECT SUM((item->>'price')::int * (item->>'qty')::int) 
               FROM jsonb_array_elements(o.products) AS item)
            ELSE 0 
          END
        ) as total_revenue
      FROM referrals r
      LEFT JOIN orders o ON r.user_id = o.user_id
      GROUP BY r.referred_by
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
      SELECT 
        r.*,
        u.username,
        u.first_name,
        u.last_name,
        COUNT(DISTINCT o.id) as total_orders,
        SUM(
          CASE 
            WHEN o.status = 'delivered' THEN 
              (SELECT SUM((item->>'price')::int * (item->>'qty')::int) 
               FROM jsonb_array_elements(o.products) AS item)
            ELSE 0 
          END
        ) as total_revenue
      FROM referrals r
      LEFT JOIN users u ON r.user_id = u.telegram_id
      LEFT JOIN orders o ON r.user_id = o.user_id
      WHERE r.referred_by = $1
      GROUP BY r.id, u.username, u.first_name, u.last_name
      ORDER BY r.created_at DESC
    `, [userId]);

    // Calculate commission based on referral level
    const referrals = result.rows.map(ref => {
      const commissionRate = ref.level === 1 ? 0.03 : 0.01; // 3% for level 1, 1% for level 2
      const commission = Math.round(ref.total_revenue * commissionRate);
      return {
        ...ref,
        commission_rate: commissionRate * 100,
        commission
      };
    });

    res.json(referrals);
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

// GET /admin/referrals/user/:userId → get referred_by for a user
router.get('/referrals/user/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query('SELECT referred_by FROM referrals WHERE user_id = $1 ORDER BY level ASC LIMIT 1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No referrer found' });
    }
    res.json({ referred_by: result.rows[0].referred_by });
  } catch (err) {
    console.error('❌ Error fetching referrer:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// GET /admin/referrals/points/:userId → get referral points for a user
router.get('/points/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query('SELECT referral_points FROM users WHERE telegram_id = $1', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'User not found' });
    }
    res.json({ referral_points: result.rows[0].referral_points || 0 });
  } catch (err) {
    console.error('❌ Error fetching referral points:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

module.exports = router;