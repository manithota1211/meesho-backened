const express = require('express');
const mysql = require('mysql2');
const cors = require('cors');
const bodyParser = require("body-parser");
const path = require("path");

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

app.use(express.static(path.join(__dirname, "../frontend")));

const db = mysql.createConnection({
  host: 'three-tier-db.clkgoqqswysz.us-west-1.rds.amazonaws.com',
  user: 'admin',
  password: 'swarupa123',
  database: 'meesho'
});

db.connect((err) => {
  if (err) {
    console.error('❌ DB connection failed:', err);
    return;
  }
  console.log('✅ Connected to MySQL database');
});

app.get('/health', (req, res) => {
  res.status(200).send('OK');
});

app.get('/ready', (req, res) => {
  db.ping((err) => {
    if (err) {
      return res.status(500).send('DB error');
    }
    res.status(200).send('READY');
  });
});

app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "../frontend/signup.html"));
});

// ===================== SIGNUP =====================
app.post('/signup', (req, res) => {
  const { fullname, email, password, confirmPassword } = req.body;

  if (!fullname || !email || !password || !confirmPassword) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ error: 'Passwords do not match' });
  }

  const sql = 'INSERT INTO signup (fullname, email, password) VALUES (?, ?, ?)';
  db.query(sql, [fullname, email, password], (err, result) => {
    if (err) {
      console.error("Signup DB error:", err);
      return res.status(500).json({ error: err.sqlMessage || "Database error" });
    }

    res.status(200).json({ message: 'Signup successful' });
  });
});

// ===================== LOGIN =====================
app.post('/login', (req, res) => {
  const { email, password } = req.body;

  const sql = 'SELECT * FROM signup WHERE email = ? AND password = ?';
  db.query(sql, [email, password], (err, results) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    if (results.length > 0) {
      res.status(200).json({ message: 'Login successful', user: results[0] });
    } else {
      res.status(401).json({ error: 'Invalid email or password' });
    }
  });
});

// ===================== CONTACT =====================
app.post('/contact', (req, res) => {
  const { name, email, message } = req.body;

  if (!name || !email || !message) {
    return res.status(400).json({ error: 'All fields are required' });
  }

  const sql = 'INSERT INTO contact (name, email, message) VALUES (?, ?, ?)';
  db.query(sql, [name, email, message], (err, result) => {
    if (err) {
      return res.status(500).json({ error: 'Database error' });
    }

    res.status(200).json({ message: 'Message received successfully!' });
  });
});

app.listen(PORT, '0.0.0.0', () => {
  console.log(`🚀 Server running at http://0.0.0.0:${PORT}`);
});
