const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require("body-parser");
const path = require("path");
const bcrypt = require('bcryptjs');

const app = express();
const PORT = 3000;

app.use(cors());
app.use(bodyParser.urlencoded({ extended: true }));
app.use(bodyParser.json());

// Logging middleware
app.use((req, res, next) => {
  console.log(`[${req.method}] ${req.url}`, req.body);
  next();
});

// Serve frontend
app.use(express.static(path.join(__dirname, "../frontend")));

// MySQL connection
const db = mysql.createConnection({
  host: 'database-1.cv66cws063vo.ap-northeast-1.rds.amazonaws.com',
  user: 'admin',
  password: 'manikanta1234',
  database: 'meeshow'
});

db.connect(err => {
  if (err) {
    console.error('❌ DB connection failed:', err);
    process.exit(1);
  }
  console.log('✅ Connected to MySQL database');
});

// ===================== HEALTH CHECK =====================
app.get('/health', (req, res) => res.status(200).send('OK'));
app.get('/ready', (req, res) => {
  db.ping(err => {
    if (err) return res.status(500).send('DB error');
    res.status(200).send('READY');
  });
});

// ===================== HOME =====================
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/signup.html"));
});

// ===================== SIGNUP =====================
app.post('/signup', async (req, res) => {
  const { fullname, mobile, password, confirmPassword } = req.body;

  if (!fullname || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  try {
    const hashedPassword = await bcrypt.hash(password, 10);

    const sql = 'INSERT INTO signup (fullname, mobile, password) VALUES (?, ?, ?)';
    db.query(sql, [fullname, mobile, hashedPassword], (err, result) => {
      if (err) {
        console.error("Signup DB error:", err);
        return res.status(500).json({ error: err.sqlMessage || "Database error" });
      }
      res.status(200).json({ message: 'Signup successful' });
    });
  } catch (err) {
    res.status(500).json({ error: 'Server error' });
  }
});

// ===================== LOGIN =====================
app.post('/login', (req, res) => {
  const { mobile, password } = req.body;

  if (!mobile || !password) return res.status(400).json({ error: 'Mobile number and password required' });

  const sql = 'SELECT * FROM signup WHERE mobile = ?';
  db.query(sql, [mobile], async (err, results) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    if (results.length === 0) return res.status(401).json({ error: 'Invalid mobile number or password' });

    const user = results[0];
    const match = await bcrypt.compare(password, user.password);
    if (!match) return res.status(401).json({ error: 'Invalid mobile number or password' });

    res.status(200).json({ 
      message: 'Login successful', 
      user: { id: user.id, fullname: user.fullname, mobile: user.mobile } 
    });
  });
});

// ===================== CONTACT =====================
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) return res.status(400).json({ error: 'All fields are required' });

  const sql = 'INSERT INTO contact (name, email, message) VALUES (?, ?, ?)';
  db.query(sql, [name, email, message], (err, result) => {
    if (err) return res.status(500).json({ error: 'Database error' });

    res.status(200).json({ message: 'Message received successfully!' });
  });
});

// ===================== START SERVER =====================
app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});



