CREATE TABLE IF NOT EXISTS settings (
  id INT PRIMARY KEY,
  shop_open BOOLEAN DEFAULT true,
  orders_enabled BOOLEAN DEFAULT true,
  shop_closed_message TEXT DEFAULT "🛠 Магазин временно недоступен.",
  orders_disabled_message TEXT DEFAULT "❗️Извините, в данный момент заказы недоступны.",
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Insert default settings
INSERT INTO settings (id) VALUES (1)
ON DUPLICATE KEY UPDATE id = id; 