const express = require("express");
const mysql = require("mysql2");
const cors = require("cors");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const path = require("path");
const axios = require("axios");

const app = express();
const port = 3000;

// ✅ Middleware
app.use(cors());
app.use(express.json());
app.use(express.static(path.join(__dirname, "public"))); // Serve static files from /public

// ✅ MySQL Connection (AWS RDS)
const db = mysql.createConnection({
  host: "rds-1.clkgoqqswysz.us-west-1.rds.amazonaws.com",
  user: "admin",
  password: "santoor123",
  database: "meesho",
  port: 3306,
});

// ✅ Log connection details
console.log("🔍 Connecting to:", db.config.host, db.config.port);

// ✅ Connect to RDS
db.connect((err) => {
  if (err) throw err;
  console.log("✅ Connected to RDS!");
});

// ✅ Health check route
app.get("/", (req, res) => {
  console.log("📥 GET / request received");
  res.send("✅ Meesho Clone backend is running");
});

// ✅ Call private EC2 test
app.get("/call-private", async (req, res) => {
  try {
    const response = await axios.get("http://10.0.2.229:3000/ping");
    res.json({ message: "Success from private EC2", data: response.data });
  } catch (error) {
    console.error("❌ Error contacting private EC2:", error.message);
    res.status(500).json({ message: "Failed to contact private EC2" });
  }
});

// ✅ Signup route
app.post("/api/signup", async (req, res) => {
  const { name, email, mobile, password, confirmPassword } = req.body;

  console.log("📥 Signup request:", req.body);

  if (!name || !email || !mobile || !password || !confirmPassword) {
    return res.status(400).json({ message: "All fields are required" });
  }

  if (password !== confirmPassword) {
    return res.status(400).json({ message: "Passwords do not match" });
  }

  try {
    const checkQuery = "SELECT * FROM users WHERE email = ? OR mobile = ?";
    db.query(checkQuery, [email, mobile], async (err, results) => {
      if (err) {
        console.error("❌ DB check error:", err);
        return res.status(500).json({ message: "Database error during check" });
      }

      if (results.length > 0) {
        return res.status(400).json({ message: "User already exists" });
      }

      const hashedPassword = await bcrypt.hash(password, 10);
      const insertQuery = "INSERT INTO users (name, email, mobile, password) VALUES (?, ?, ?, ?)";
      db.query(insertQuery, [name, email, mobile, hashedPassword], (err, result) => {
        if (err) {
          console.error("❌ DB insert error:", err);
          return res.status(500).json({ message: "Error creating user" });
        }

        console.log("✅ User inserted:", { name, email, mobile });
        res.status(201).json({
          message: "User registered successfully",
          user: { name, email, mobile }
        });
      });
    });
  } catch (error) {
    console.error("❌ Unexpected signup error:", error);
    res.status(500).json({ message: "Signup failed" });
  }
});

// ✅ Login route
app.post("/api/login", (req, res) => {
  const { name, password } = req.body;

  console.log("🔐 Login attempt for:", name);

  const query = "SELECT * FROM users WHERE name = ?";
  db.query(query, [name], async (err, results) => {
    if (err) {
      console.error("❌ Login DB error:", err);
      return res.status(500).json({ message: "Database error during login" });
    }

    if (results.length === 0) {
      return res.status(401).json({ message: "Invalid name or password" });
    }

    const user = results[0];
    const isPasswordValid = await bcrypt.compare(password, user.password);

    if (!isPasswordValid) {
      return res.status(401).json({ message: "Invalid name or password" });
    }

    const token = jwt.sign({ id: user.id }, "secretkey", { expiresIn: "1h" });

    console.log("✅ Login successful for:", name);

    res.json({
      message: "Login successful",
      token,
      user: {
        id: user.id,
        name: user.name,
        email: user.email,
        mobile: user.mobile
      }
    });
  });
});

// ✅ Contact form submission
app.post("/api/contact", (req, res) => {
  const { name, email, message } = req.body;

  console.log("📩 Contact form submitted:", req.body);

  if (!name || !email || !message) {
    return res.status(400).json({ message: "All fields are required" });
  }

  const insertQuery = "INSERT INTO contacts (name, email, message) VALUES (?, ?, ?)";

  db.query(insertQuery, [name, email, message], (err, result) => {
    if (err) {
      console.error("❌ DB insert error (contact):", err);
      return res.status(500).json({ message: "Error saving contact message" });
    }

    console.log("✅ Contact message saved:", result.insertId);
    res.status(201).json({ message: "Message submitted successfully" });
  });
});

// ✅ Start the server
app.listen(port, '0.0.0.0', () => {
  console.log(`🚀 Server running on http://0.0.0.0:${port}`);
});
