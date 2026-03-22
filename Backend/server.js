const path = require('path');
require('dotenv').config({ path: path.join(__dirname, '.env') });
const express = require('express');
const cors = require('cors');
const mysql = require('mysql2/promise');

const app = express();
app.use(cors());
app.use(express.json());

const dbPool = mysql.createPool({
  host: process.env.DB_HOST || 'localhost',
  user: process.env.DB_USER || 'root',
  password: process.env.DB_PASSWORD || '',
  database: process.env.DB_NAME || 'kitchen_stories',
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0
});

// Helper for formatting date differences conceptually
const formatRelativeTime = (date) => {
  const diffDays = Math.floor((new Date() - new Date(date)) / (1000 * 60 * 60 * 24));
  if (diffDays === 0) return 'Today';
  if (diffDays === 1) return 'Yesterday';
  if (diffDays < 7) return `${diffDays} days ago`;
  const weeks = Math.floor(diffDays / 7);
  return `${weeks} week${weeks !== 1 ? 's' : ''} ago`;
};

// Format date strictly to MM/DD/YYYY, hh:mm:ss for uniformity if needed
const formatAbsoluteTime = (date) => {
    return new Date(date).toLocaleString("en-IN");
};

const parseTimeForDB = (timeStr) => {
  if (!timeStr) return timeStr;
  const match = timeStr.match(/^(\d{1,2}):(\d{2})\s*(AM|PM)$/i);
  if (!match) return timeStr;
  let [ , h, m, mod ] = match;
  let hours = parseInt(h, 10);
  if (hours === 12) hours = 0;
  if (mod.toUpperCase() === 'PM') hours += 12;
  return `${hours.toString().padStart(2, '0')}:${m}:00`;
};

const formatTimeFromDB = (timeStr) => {
  if (!timeStr) return timeStr;
  const [h, m] = timeStr.toString().split(':');
  if (!h || !m) return timeStr;
  let hours = parseInt(h, 10);
  const mod = hours >= 12 ? 'PM' : 'AM';
  hours = hours % 12 || 12;
  return `${hours.toString().padStart(2, '0')}:${m} ${mod}`;
};

// --- Auth API ---
app.post('/api/login', async (req, res) => {
  const { username, password } = req.body;
  try {
    const [rows] = await dbPool.query('SELECT * FROM users WHERE username = ? AND password = ?', [username, password]);
    if (rows.length > 0) {
      const user = rows[0];
      delete user.password;
      res.json({ success: true, user });
    } else {
      res.status(401).json({ success: false, message: 'Invalid username or password' });
    }
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

app.post('/api/signup', async (req, res) => {
  const { username, password, name } = req.body;
  try {
    const [existing] = await dbPool.query('SELECT * FROM users WHERE username = ?', [username]);
    if (existing.length > 0) {
      return res.status(400).json({ success: false, message: 'Username already exists' });
    }
    const [result] = await dbPool.query(
      'INSERT INTO users (username, password, name, role) VALUES (?, ?, ?, ?)',
      [username, password, name, 'customer']
    );
    res.json({ success: true, user: { id: result.insertId, username, name, role: 'customer' } });
  } catch (error) {
    res.status(500).json({ success: false, error: error.message });
  }
});

// --- Menu API ---
app.get('/api/menu', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT id, name, category, price, description as `desc`, image, veg_status as veg FROM menu_items');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/menu', async (req, res) => {
  const { name, category, price, desc, image, veg } = req.body;
  try {
    const [result] = await dbPool.query(
      'INSERT INTO menu_items (name, category, price, description, image, veg_status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, category, price, desc, image, veg]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/menu/:id', async (req, res) => {
  const { price } = req.body;
  try {
    await dbPool.query('UPDATE menu_items SET price = ? WHERE id = ?', [price, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/menu/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM menu_items WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Specials API ---
app.get('/api/specials', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT id, name, price, description as `desc`, image, tag, veg_status as veg FROM specials');
    res.json(rows);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/specials', async (req, res) => {
  const { name, price, desc, image, tag, veg } = req.body;
  try {
    const [result] = await dbPool.query(
      'INSERT INTO specials (name, price, description, image, tag, veg_status) VALUES (?, ?, ?, ?, ?, ?)',
      [name, price, desc, image, tag, veg]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/specials/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM specials WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Reviews API ---
app.get('/api/reviews', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM reviews ORDER BY date_posted DESC');
    const formatted = rows.map(r => ({
      ...r,
      date: formatRelativeTime(r.date_posted)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reviews', async (req, res) => {
  const { name, rating, text, dish } = req.body;
  try {
    const [result] = await dbPool.query(
      'INSERT INTO reviews (name, rating, text, dish, date_posted) VALUES (?, ?, ?, ?, NOW())',
      [name, rating, text, dish]
    );
    res.json({ success: true, id: result.insertId });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.delete('/api/reviews/:id', async (req, res) => {
  try {
    await dbPool.query('DELETE FROM reviews WHERE id = ?', [req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Orders API ---
app.get('/api/orders', async (req, res) => {
  try {
    const [orders] = await dbPool.query('SELECT * FROM orders ORDER BY order_time DESC');
    const [items] = await dbPool.query('SELECT * FROM order_items');
    
    const formatted = orders.map(o => ({
      orderId: o.id,
      username: o.username,
      name: o.name,
      total: o.total,
      status: o.status,
      time: formatAbsoluteTime(o.order_time),
      items: items.filter(i => i.order_id === o.id).map(i => ({
        id: i.item_id,
        name: i.item_name,
        price: i.price,
        qty: i.quantity
      }))
    }));
    
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/orders', async (req, res) => {
  const { orderId, username, name, items, total, status } = req.body;
  try {
    const connection = await dbPool.getConnection();
    try {
      await connection.beginTransaction();
      await connection.query(
        'INSERT INTO orders (id, username, name, total, status, order_time) VALUES (?, ?, ?, ?, ?, NOW())',
        [orderId, username, name, total, status]
      );
      
      for (const item of items) {
        await connection.query(
          'INSERT INTO order_items (order_id, item_id, item_name, price, quantity) VALUES (?, ?, ?, ?, ?)',
          [orderId, item.id, item.name, item.price, item.qty]
        );
      }
      
      await connection.commit();
      res.json({ success: true });
    } catch (e) {
      await connection.rollback();
      throw e;
    } finally {
      connection.release();
    }
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/orders/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await dbPool.query('UPDATE orders SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

// --- Reservations API ---
app.get('/api/reservations', async (req, res) => {
  try {
    const [rows] = await dbPool.query('SELECT * FROM reservations ORDER BY booked_at DESC');
    const formatted = rows.map(r => ({
      resId: r.id,
      username: r.username,
      name: r.name,
      phone: r.phone,
      date: r.reservation_date,
      time: formatTimeFromDB(r.reservation_time),
      guests: r.guests,
      occasion: r.occasion,
      seating: r.seating,
      notes: r.notes,
      status: r.status,
      bookedAt: formatAbsoluteTime(r.booked_at)
    }));
    res.json(formatted);
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post('/api/reservations', async (req, res) => {
  const { resId, username, name, phone, date, time, guests, occasion, seating, notes, status } = req.body;
  try {
    const dbTime = parseTimeForDB(time);
    await dbPool.query(
      'INSERT INTO reservations (id, username, name, phone, reservation_date, reservation_time, guests, occasion, seating, notes, status, booked_at) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, NOW())',
      [resId, username, name, phone, date, dbTime, guests, occasion, seating, notes, status]
    );
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.put('/api/reservations/:id/status', async (req, res) => {
  const { status } = req.body;
  try {
    await dbPool.query('UPDATE reservations SET status = ? WHERE id = ?', [status, req.params.id]);
    res.json({ success: true });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

const PORT = process.env.PORT || 5000;
app.listen(PORT, () => {
  console.log(`Server running on port ${PORT}`);
});
