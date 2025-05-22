const express = require('express');
const router = express.Router();
const db = require('../../bot/db/connect');
const verifyToken = require('../routes/verifyToken');
const multer = require('multer');
const path = require('path');
const sharp = require('sharp'); 
const fs = require('fs'); // ✅ Ավելացված է

const sendProductPreview = require('../utils/sendProductPreview'); 

// ✅ Setup for storing uploaded images
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, 'uploads/'); // make sure this folder exists
  },
  filename: (req, file, cb) => {
    const ext = path.extname(file.originalname);
    const uniqueName = Date.now() + '-' + Math.round(Math.random() * 1e5) + ext;
    cb(null, uniqueName);
  },
});

const upload = multer({ storage });


/////////////
// 📦 Բերում ենք բոլոր ապրանքները ըստ category
router.get('/', async (req, res) => {
  const { category } = req.query;

  try {
    let query = 'SELECT * FROM products WHERE status = $1';
    let params = ['active'];

    if (category) {
      query += ' AND category = $2';
      params.push(category);
    }

    const result = await db.query(query, params);
    res.json(result.rows);
  } catch (err) {
    console.error("❌ Products fetch error:", err.message);
    res.status(500).json({ error: 'Failed to fetch products' });
  }
});


// 🔐 Ավելացնել նոր ապրանք (admin-ից)

router.post('/', verifyToken, upload.single('image'), async (req, res) => {
  const {
    name,
    price,
    stock,
    category,
    type,
    status,
    telegramId,
    isPreview // ⬅️ Ավելացվել է
  } = req.body;

  const image = req.file?.filename || null;

  if (image) {
    const imagePath = path.join(__dirname, '..', '..', 'uploads', image);
    await sharp(imagePath)
      .resize(800, 800, { fit: 'inside' })
      .toFile(imagePath + '_resized.jpg');
    fs.unlinkSync(imagePath);
    fs.renameSync(imagePath + '_resized.jpg', imagePath);
  }

  if (!name || !price || !stock || !category) {
    return res.status(400).json({
      error: 'Պակասող դաշտեր։ name, price, stock, category պարտադիր են',
    });
  }

  try {
    // ✅ Եթե preview է՝ ուղարկում ենք Telegram ու դուրս ենք գալիս
    if (telegramId && image && isPreview === 'true') {
      const caption = `🆕 Նոր ապրանքի նախադիտում:\n\n📦 Անուն: *${name}*\n💰 Գին: *${price}₽*\n🗂 Կատեգորիա: *${category}*\n🧩 Տեսակ: *${type === 'auto' ? 'Ավտոմատ' : 'Մանուալ'}*`;

      const imagePath = path.join(__dirname, '..', '..', 'uploads', image);

      try {
        await sendProductPreview(telegramId, image, caption);
      } catch (err) {
      console.error("❌ Preview ուղարկման սխալ:", err.message);
      }

  // ✅ Ջնջում ենք նկարը preview-ից հետո
  try {
    if (fs.existsSync(imagePath)) {
      fs.unlinkSync(imagePath);
    }
  } catch (err) {
    console.warn("⚠️ Չհաջողվեց ջնջել preview նկարը:", err.message);
  }

  return res.json({ previewSent: true });
}


    // ✅ Իրական ապրանքի ավելացում բազա
    await db.query(
      `INSERT INTO products (name, price, stock, category, image, type, status)
       VALUES ($1, $2, $3, $4, $5, $6, $7)`,
      [name, price, stock, category, image, type || 'manual', status || 'active']
    );

    // ✅ Ուղարկում ենք Telegram իրական ավելացման դեպքում
    if (telegramId && image) {
      const caption = `🆕 Նոր ապրանք ավելացվել է:\n\n📦 Անուն: *${name}*\n💰 Գին: *${price}₽*\n🗂 Կատեգորիա: *${category}*\n🧩 Տեսակ: *${type === 'auto' ? 'Ավտոմատ' : 'Մանուալ'}*`;
      await sendProductPreview(telegramId, image, caption);
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product insert error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});



// 🔧 Խմբագրել ապրանք ըստ ID (admin-ից)
router.put('/:id', verifyToken, upload.single('image'), async (req, res) => {
  const { name, price, stock, category, type, status } = req.body;
  const image = req.file?.filename || null;
  const { id } = req.params;

  if (!name || !price || !stock || !category) {
    return res.status(400).json({
      error: 'Պակասող դաշտեր։ name, price, stock, category պարտադիր են',
    });
  }

  try {
    if (image) {
      const imagePath = path.join(__dirname, '..', '..', 'uploads', image);
      await sharp(imagePath)
        .resize(800, 800, { fit: 'inside' })
        .toFile(imagePath + '_resized.jpg');
      fs.unlinkSync(imagePath);
      fs.renameSync(imagePath + '_resized.jpg', imagePath);

      await db.query(
        `UPDATE products
         SET name = $1, price = $2, stock = $3, category = $4, image = $5, type = $6, status = $7
         WHERE id = $8`,
        [name, price, stock, category, image, type || 'manual', status || 'active', id]
      );
    } else {
      await db.query(
        `UPDATE products
         SET name = $1, price = $2, stock = $3, category = $4, type = $5, status = $6
         WHERE id = $7`,
        [name, price, stock, category, type || 'manual', status || 'active', id]
      );
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product update error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// 📦 Admin Panel – get all products
router.get('/admin', verifyToken, async (req, res) => {
  try {
    const result = await db.query('SELECT * FROM products ORDER BY id DESC');
    res.json(result.rows);
  } catch (err) {
    console.error('❌ Fetch all products error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// ❌ Ջնջել ապրանք ըստ ID
router.delete('/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    // Սկզբում վերցնում ենք նկարի անունը, եթե կա
    const result = await db.query('SELECT image FROM products WHERE id = $1', [id]);

    if (result.rowCount === 0) {
      return res.status(404).json({ error: 'Ապրանքը չի գտնվել' });
    }

    const imageName = result.rows[0].image;

    // Ջնջում ենք ապրանքը բազայից
    await db.query('DELETE FROM products WHERE id = $1', [id]);

    // Եթե կա նկար՝ ջնջում ենք նաև ֆայլը
    if (imageName) {
      const imagePath = path.join(__dirname, '..', '..', 'uploads', imageName);
      if (fs.existsSync(imagePath)) {
        fs.unlinkSync(imagePath);
      }
    }

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Product delete error:', err.message);
    res.status(500).json({ error: 'Database error' });
  }
});

// 📤 Preview product in Telegram
router.post('/preview/:id', verifyToken, async (req, res) => {
  const { id } = req.params;

  try {
    const result = await db.query('SELECT * FROM products WHERE id = $1', [id]);
    const product = result.rows[0];

    if (!product) {
      return res.status(404).json({ error: 'Ապրանքը չի գտնվել' });
    }

    await sendProductPreview(product);

    res.json({ success: true });
  } catch (err) {
    console.error('❌ Preview error:', err.message);
    res.status(500).json({ error: 'Preview failed' });
  }
});



module.exports = router;




