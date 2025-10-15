// routes/userVerify.js
const express = require("express");
const { admin } = require("./admin.js");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// 1️⃣ Rate limiter to prevent brute-force
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 requests per IP per window
  message: { error: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use("/verifyUser", verifyLimiter);

// 2️⃣ Token verification route
router.post("/verifyUser", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;

    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];

    // Verify Firebase token
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // Get role from custom claims (admin or user)
    const role = decoded.admin ? "admin" : "user";

    // Prevent caching sensitive info
    res.setHeader("Cache-Control", "no-store");

    res.json({
      success: true,
      uid,
      email: decoded.email,
      role,
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
