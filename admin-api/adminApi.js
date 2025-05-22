// adminApi.js
const path = require('path');
require('dotenv').config({ path: path.resolve(__dirname, '../.env') });
const express = require('express');
const db = require('../bot/db/connect');
const app = express();
app.use(express.json());


const cors = require('cors');
app.use(cors({ origin: 'http://localhost:3000' }));

const authRoutes = require('./routes/adminAuth');
const verifyToken = require('./routes/verifyToken'); 
const productRoutes = require('./routes/products');

const orderRoutes = require('./routes/orders');
const orderExtraRoutes = require('./routes/ordersExtra');
const cartRoutes = require('./routes/cart');
const statsRoutes = require('./routes/stats');
const activatorRoutes = require('./routes/activator');
const settingsRoutes = require('./routes/settings');
const referralsRoutes = require("./routes/referrals");
const freekassaCallback = require("./routes/freekassaCallback");
const setupAdminRoute = require('./routes/setupAdmin');


const userRoutes = require('./routes/users');


app.use('/admin', authRoutes);
app.use("/admin", setupAdminRoute); // ✅ Login route
app.use('/admin/products', productRoutes);   // Admin համար՝ POST, կարգավորում
app.use('/products', productRoutes); // Բոտի համար՝ GET        
app.use('/admin/orders', verifyToken, orderRoutes);
app.use('/admin/orders', orderExtraRoutes);
app.use('/cart', cartRoutes);
app.use('/admin/stats', verifyToken, statsRoutes);
app.use('/admin/settings', settingsRoutes);
app.use("/admin", referralsRoutes);             // Ռեֆերալներ
app.use("/api", freekassaCallback);

app.use('/uploads', express.static(path.join(__dirname, '..', 'uploads')));

app.use('/users', userRoutes);

app.use(require('./routes/lang'));


////// redeem
app.use('/activator', activatorRoutes);

// 📥 Բերել պատվերները
app.get('/admin/orders', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM orders ORDER BY time DESC LIMIT 50');
    res.json(result.rows);
  } catch (err) {
    console.error("❌ DB error:", err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// 📥 Բերել միայն ձեռքով մշակվող պատվերները
app.get('/admin/orders/manual', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT DISTINCT orders.*
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE item->>'type' = 'manual'
      ORDER BY time DESC
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Manual orders fetch error:', err.message);
    res.status(500).json({ error: 'Failed to fetch manual orders' });
  }
});

// 📊 Վիճակագրություն Dashboard-ի համար
app.get('/admin/stats', verifyToken, async (req, res) => {
  try {
    const revenueResult = await db.query(`
      SELECT
        SUM((item->>'price')::int * (item->>'qty')::int) AS revenue
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
    `);
    const totalRevenue = parseInt(revenueResult.rows[0].revenue) || 0;

    const orderResult = await db.query("SELECT COUNT(*) AS count FROM orders");
    const totalOrders = parseInt(orderResult.rows[0].count) || 0;

    const userResult = await db.query("SELECT COUNT(*) AS count FROM users");
    const totalUsers = parseInt(userResult.rows[0].count) || 0;

    const categoryResult = await db.query(`
      SELECT
        item->>'category' AS category,
        COUNT(*) AS total,
        SUM((item->>'price')::int * (item->>'qty')::int) AS revenue
      FROM orders,
      LATERAL jsonb_array_elements(products) AS item
      WHERE status = 'delivered'
      GROUP BY item->>'category'
    `);

    const salesByCategory = categoryResult.rows.map(row => ({
      category: row.category,
      total: parseInt(row.total),
      revenue: parseInt(row.revenue)
    }));

    res.json({
      totalRevenue,
      totalOrders,
      totalUsers,
      salesByCategory
    });

  } catch (err) {
    console.error("❌ Stats error:", err);
    res.status(500).json({ error: 'Failed to fetch stats' });
  }
});


// ✅ Լսել պորտ
const PORT = process.env.ADMIN_API_PORT || 3001;
app.listen(PORT, () => {
  console.log(`💠 Admin API running at http://localhost:${PORT}`);
});



