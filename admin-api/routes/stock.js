const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('./verifyToken');

// Получить статус запасов для всех товаров
router.get('/status', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.stock,
        p.type,
        p.status,
        CASE 
          WHEN p.stock <= 5 THEN 'low'
          WHEN p.stock = 0 THEN 'out'
          ELSE 'ok'
        END as stock_status
      FROM products p
      ORDER BY p.category, p.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения статуса запасов:', err.message);
    res.status(500).json({ error: 'Не удалось получить статус запасов' });
  }
});

// Обновить запасы после заказа
router.post('/update', verifyToken, async (req, res) => {
  const { product_id, quantity } = req.body;

  if (!product_id || !quantity) {
    return res.status(400).json({ error: 'Требуется ID товара и количество' });
  }

  try {
    // Начать транзакцию
    await db.query('BEGIN');

    // Получить текущие запасы
    const currentStock = await db.query(
      'SELECT stock FROM products WHERE id = $1 FOR UPDATE',
      [product_id]
    );

    if (currentStock.rows.length === 0) {
      await db.query('ROLLBACK');
      return res.status(404).json({ error: 'Товар не найден' });
    }

    const newStock = currentStock.rows[0].stock - quantity;

    if (newStock < 0) {
      await db.query('ROLLBACK');
      return res.status(400).json({ error: 'Недостаточно товара на складе' });
    }

    // Обновить запасы
    await db.query(
      'UPDATE products SET stock = $1, updated_at = NOW() WHERE id = $2',
      [newStock, product_id]
    );

    // Записать изменение запасов
    await db.query(
      `INSERT INTO stock_history (product_id, quantity, type, note)
       VALUES ($1, $2, 'order', 'Уменьшение запасов из-за заказа')`,
      [product_id, -quantity]
    );

    await db.query('COMMIT');
    res.json({ success: true, new_stock: newStock });
  } catch (err) {
    await db.query('ROLLBACK');
    console.error('❌ Ошибка обновления запасов:', err.message);
    res.status(500).json({ error: 'Не удалось обновить запасы' });
  }
});

// Получить историю запасов
router.get('/history', verifyToken, async (req, res) => {
  const { product_id, startDate, endDate } = req.query;

  try {
    let query = `
      SELECT 
        sh.*,
        p.name as product_name,
        p.category
      FROM stock_history sh
      JOIN products p ON sh.product_id = p.id
      WHERE 1=1
    `;
    const params = [];
    let paramCount = 1;

    if (product_id) {
      query += ` AND sh.product_id = $${paramCount}`;
      params.push(product_id);
      paramCount++;
    }

    if (startDate) {
      query += ` AND sh.created_at >= $${paramCount}`;
      params.push(startDate);
      paramCount++;
    }

    if (endDate) {
      query += ` AND sh.created_at <= $${paramCount}`;
      params.push(endDate);
      paramCount++;
    }

    query += ` ORDER BY sh.created_at DESC`;

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения истории запасов:', err.message);
    res.status(500).json({ error: 'Не удалось получить историю запасов' });
  }
});

// Установить уведомления о запасах
router.post('/alerts', verifyToken, async (req, res) => {
  const { product_id, threshold } = req.body;

  if (!product_id || !threshold) {
    return res.status(400).json({ error: 'Требуется ID товара и пороговое значение' });
  }

  try {
    await db.query(
      `INSERT INTO stock_alerts (product_id, threshold)
       VALUES ($1, $2)
       ON CONFLICT (product_id) 
       DO UPDATE SET threshold = $2, updated_at = NOW()`,
      [product_id, threshold]
    );
    res.json({ success: true });
  } catch (err) {
    console.error('❌ Ошибка установки уведомления:', err.message);
    res.status(500).json({ error: 'Не удалось установить уведомление' });
  }
});

// Получить уведомления о низких запасах
router.get('/alerts', verifyToken, async (req, res) => {
  try {
    const result = await db.query(`
      SELECT 
        p.id,
        p.name,
        p.category,
        p.stock,
        sa.threshold
      FROM products p
      JOIN stock_alerts sa ON p.id = sa.product_id
      WHERE p.stock <= sa.threshold
      ORDER BY p.category, p.name
    `);
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Ошибка получения уведомлений:', err.message);
    res.status(500).json({ error: 'Не удалось получить уведомления' });
  }
});

module.exports = router; 