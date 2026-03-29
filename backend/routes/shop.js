const express = require('express');
const db = require('../config/db');

const router = express.Router();

// Simple health check for shop routes
router.get('/shop/health', (req, res) => {
  res.json({ status: 'ok', route: 'shop' });
});

// =========================================================
// SHOP: PRODUCTS & ORDERS
// =========================================================
// Seller creates product
router.post('/products', (req, res) => {
  const { seller_id, name, description, price, stock, category, main_image_path } = req.body;

  if (!seller_id || !name || !price) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const query = `
    INSERT INTO products (seller_id, name, description, price, stock, category, main_image_path)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `;

  db.query(
    query,
    [seller_id, name, description || '', price, stock || 0, category || null, main_image_path || null],
    (err, result) => {
      if (err) {
        console.error('Error creating product:', err);
        return res.status(500).json({ error: 'Database error' });
      }
      return res.status(201).json({ message: 'Product created successfully', id: result.insertId });
    },
  );
});

// Get all products or by seller
router.get('/products', (req, res) => {
  const { sellerId } = req.query;
  const base = 'SELECT * FROM products';
  const query = sellerId ? `${base} WHERE seller_id = ? ORDER BY id DESC` : `${base} ORDER BY id DESC`;
  const params = sellerId ? [sellerId] : [];

  db.query(query, params, (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });
    return res.json(results);
  });
});

// Player creates order with items
router.post('/orders', (req, res) => {
  const { player_id, seller_id, items } = req.body; // items: [{ product_id, quantity }]

  if (!player_id || !seller_id || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Missing required fields' });
  }

  const productIds = items.map((i) => i.product_id);
  const placeholders = productIds.map(() => '?').join(',');

  const productsQuery = `SELECT id, price FROM products WHERE id IN (${placeholders})`;

  db.query(productsQuery, productIds, (err, productRows) => {
    if (err) {
      console.error('Error fetching products:', err);
      return res.status(500).json({ error: 'Database error' });
    }

    const priceMap = {};
    productRows.forEach((p) => {
      priceMap[p.id] = p.price;
    });

    let total = 0;
    const orderItems = [];

    for (const item of items) {
      const unitPrice = priceMap[item.product_id];
      if (!unitPrice) {
        return res.status(400).json({ error: `Invalid product ${item.product_id}` });
      }
      const qty = item.quantity || 1;
      total += unitPrice * qty;
      orderItems.push({ product_id: item.product_id, quantity: qty, unit_price: unitPrice });
    }

    const insertOrder = `
      INSERT INTO orders (player_id, seller_id, status_id, total_amount)
      VALUES (?, ?, 1, ?)
    `; // 1 = pending

    db.query(insertOrder, [player_id, seller_id, total], (orderErr, orderResult) => {
      if (orderErr) {
        console.error('Error creating order:', orderErr);
        return res.status(500).json({ error: 'Database error' });
      }

      const orderId = orderResult.insertId;
      const itemValues = orderItems.map((i) => [orderId, i.product_id, i.quantity, i.unit_price]);

      const insertItems = `
        INSERT INTO order_items (order_id, product_id, quantity, unit_price)
        VALUES ?
      `;

      db.query(insertItems, [itemValues], (itemsErr) => {
        if (itemsErr) {
          console.error('Error creating order items:', itemsErr);
          return res.status(500).json({ error: 'Database error' });
        }

        return res.status(201).json({ message: 'Order created successfully', orderId });
      });
    });
  });
});

// Player: get own orders
router.get('/orders/:playerId', (req, res) => {
  const { playerId } = req.params;

  const query = `
    SELECT 
      o.id AS orderId,
      o.total_amount,
      os.status_name,
      o.created_at,
      s.shop_name
    FROM orders o
    JOIN order_status os ON o.status_id = os.id
    JOIN sellers s ON o.seller_id = s.id
    WHERE o.player_id = ?
    ORDER BY o.created_at DESC
  `;

  db.query(query, [playerId], (err, results) => {
    if (err) {
      console.error('Error fetching orders:', err);
      return res.status(500).json({ error: 'Database error' });
    }
    return res.json(results);
  });
});

module.exports = router;
