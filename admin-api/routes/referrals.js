const express = require("express");
const db = require("../../bot/db/connect");
const verifyToken = require("../routes/verifyToken");
const router = express.Router();

// 📥 Получить реферальные данные всех пользователей (правильная двухуровневая логика)
router.get("/referrals", verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        u.telegram_id as referred_by,
        u.username,
        u.first_name,
        u.last_name,
        -- L1: прямые рефералы
        (SELECT COUNT(*) FROM referrals r1 WHERE r1.referred_by = u.telegram_id) as level1_referrals,
        -- L2: рефералы рефералов
        (SELECT COUNT(*) FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)) as level2_referrals,
        -- Всего
        ((SELECT COUNT(*) FROM referrals r1 WHERE r1.referred_by = u.telegram_id) +
         (SELECT COUNT(*) FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id))) as total_referrals,
        -- Заказы всех рефералов (L1 + L2)
        (SELECT COUNT(DISTINCT o1.id) FROM orders o1 WHERE o1.user_id IN (
          SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id
          UNION
          SELECT r2.user_id FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)
        )) as total_orders,
        -- Общая выручка
        (SELECT COALESCE(SUM((item->>'price')::int * (item->>'qty')::int),0) FROM orders o1, LATERAL jsonb_array_elements(o1.products) item WHERE o1.user_id IN (
          SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id
          UNION
          SELECT r2.user_id FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)
        ) AND o1.status != 'unpaid') as total_revenue,
        -- Реферальные баллы (3% с L1, 1% с L2)
        (
          COALESCE((SELECT SUM((item->>'price')::int * (item->>'qty')::int) * 0.03 FROM orders o1, LATERAL jsonb_array_elements(o1.products) item WHERE o1.user_id IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id) AND o1.status != 'unpaid'),0)
          +
          COALESCE((SELECT SUM((item->>'price')::int * (item->>'qty')::int) * 0.01 FROM orders o2, LATERAL jsonb_array_elements(o2.products) item WHERE o2.user_id IN (SELECT r2.user_id FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)) AND o2.status != 'unpaid'),0)
        ) as referral_points
      FROM users u
      WHERE EXISTS (SELECT 1 FROM referrals r WHERE r.referred_by = u.telegram_id)
      ORDER BY total_referrals DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Ошибка при получении рефералов:", err);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

// 📊 Получить сводную статистику по рефералам (правильная двухуровневая логика)
router.get("/referrals/summary", verifyToken, async (req, res) => {
  try {
    // Total L1, L2, and total referrals
    const totalRes = await db.query(`
      SELECT 
        (SELECT COUNT(*) FROM referrals WHERE referred_by IS NOT NULL) as total_referrals,
        (SELECT COUNT(*) FROM referrals r1 WHERE r1.referred_by IS NOT NULL) as level1_count,
        (SELECT COUNT(*) FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by IS NOT NULL)) as level2_count
    `);
    const referralStats = totalRes.rows[0];

    // Top referrers with correct L1/L2/commission breakdown
    const topRes = await db.query(`
      SELECT 
        u.telegram_id as referred_by,
        u.username,
        u.first_name,
        u.last_name,
        (SELECT COUNT(*) FROM referrals r1 WHERE r1.referred_by = u.telegram_id) as level1_invited,
        (SELECT COUNT(*) FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)) as level2_invited,
        ((SELECT COUNT(*) FROM referrals r1 WHERE r1.referred_by = u.telegram_id) +
         (SELECT COUNT(*) FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id))) as total_invited,
        (
          COALESCE((SELECT SUM((item->>'price')::int * (item->>'qty')::int) * 0.03 FROM orders o1, LATERAL jsonb_array_elements(o1.products) item WHERE o1.user_id IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id) AND o1.status = 'delivered'),0)
          +
          COALESCE((SELECT SUM((item->>'price')::int * (item->>'qty')::int) * 0.01 FROM orders o2, LATERAL jsonb_array_elements(o2.products) item WHERE o2.user_id IN (SELECT r2.user_id FROM referrals r2 WHERE r2.referred_by IN (SELECT r1.user_id FROM referrals r1 WHERE r1.referred_by = u.telegram_id)) AND o2.status = 'delivered'),0)
        ) as total_commission
      FROM users u
      WHERE EXISTS (SELECT 1 FROM referrals r WHERE r.referred_by = u.telegram_id)
      ORDER BY total_invited DESC
      LIMIT 5
    `);
    const topReferrers = topRes.rows;

    res.json({
      referralStats,
      topReferrers
    });
  } catch (err) {
    console.error("❌ Ошибка при получении сводной статистики рефералов:", err);
    res.status(500).json({ error: "Ошибка получения статистики" });
  }
});

// 📥 Получить рефералы, где пригласивший = userId (правильная двухуровневая логика)
router.get("/referrals/:userId", verifyToken, async (req, res) => {
  try {
    const { userId } = req.params;
    // L1 referrals
    const l1 = await db.query(`
      SELECT 
        r.user_id,
        u.username,
        u.first_name,
        u.last_name,
        1 as level,
        r.created_at,
        (SELECT COUNT(DISTINCT o.id) FROM orders o WHERE o.user_id = r.user_id) as total_orders,
        (SELECT COALESCE(SUM((item->>'price')::int * (item->>'qty')::int),0) FROM orders o, LATERAL jsonb_array_elements(o.products) item WHERE o.user_id = r.user_id AND o.status != 'unpaid') as total_revenue,
        ROUND((SELECT COALESCE(SUM((item->>'price')::int * (item->>'qty')::int),0) * 0.03 FROM orders o, LATERAL jsonb_array_elements(o.products) item WHERE o.user_id = r.user_id AND o.status != 'unpaid'), 2) as commission
      FROM referrals r
      LEFT JOIN users u ON r.user_id = u.telegram_id
      WHERE r.referred_by = $1
    `, [userId]);
    // L2 referrals (exclude users who are already L1 referrals for this referrer)
    const l2 = await db.query(`
      SELECT 
        r.user_id,
        u.username,
        u.first_name,
        u.last_name,
        2 as level,
        r.created_at,
        (SELECT COUNT(DISTINCT o.id) FROM orders o WHERE o.user_id = r.user_id) as total_orders,
        (SELECT COALESCE(SUM((item->>'price')::int * (item->>'qty')::int),0) FROM orders o, LATERAL jsonb_array_elements(o.products) item WHERE o.user_id = r.user_id AND o.status != 'unpaid') as total_revenue,
        ROUND((SELECT COALESCE(SUM((item->>'price')::int * (item->>'qty')::int),0) * 0.01 FROM orders o, LATERAL jsonb_array_elements(o.products) item WHERE o.user_id = r.user_id AND o.status != 'unpaid'), 2) as commission
      FROM referrals r
      LEFT JOIN users u ON r.user_id = u.telegram_id
      WHERE r.referred_by IN (SELECT user_id FROM referrals WHERE referred_by = $1)
        AND r.user_id NOT IN (SELECT user_id FROM referrals WHERE referred_by = $1)
    `, [userId]);
    const referrals = [...l1.rows, ...l2.rows];
    referrals.sort((a, b) => new Date(b.created_at) - new Date(a.created_at));
    res.json(referrals);
  } catch (err) {
    console.error("❌ Ошибка при получении реферала:", err);
    res.status(500).json({ error: "Ошибка получения данных" });
  }
});

// POST: Register a new referral if not already exists (user can only ever be referred once)
router.post("/referrals", verifyToken, async (req, res) => {
  const { user_id, referred_by, level } = req.body;
  if (!user_id || !referred_by) {
    return res.status(400).json({ error: "user_id and referred_by are required" });
  }
  try {
    // Check if user has ever been referred (at any level)
    const exists = await db.query(
      'SELECT 1 FROM referrals WHERE user_id = $1',
      [user_id]
    );
    if (exists.rowCount > 0) {
      // User already has a referrer, do not add or update
      return res.json({ success: true, created: false, alreadyReferred: true });
    }
    // Create new referral (first and only time)
    await db.query(
      'INSERT INTO referrals (user_id, referred_by, level) VALUES ($1, $2, $3)',
      [user_id, referred_by, level || 1]
    );
    return res.json({ success: true, created: true });
  } catch (err) {
    console.error("❌ Ошибка при создании реферала:", err);
    res.status(500).json({ error: "Ошибка создания реферала" });
  }
});

// GET /admin/referrals/user/:userId → get referred_by for a user
router.get('/referrals/user/:userId', verifyToken, async (req, res) => {
  const { userId } = req.params;
  try {
    const result = await db.query('SELECT referred_by, level FROM referrals WHERE user_id = $1 ORDER BY level ASC', [userId]);
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'No referrer found' });
    }
    res.json(result.rows);
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