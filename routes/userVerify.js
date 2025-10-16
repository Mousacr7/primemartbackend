const express = require("express");
const { admin, db } = require("./admin.js");
const rateLimit = require("express-rate-limit");

const router = express.Router();

// Rate limiter to prevent brute-force
const verifyLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 10,             // max 10 requests per IP
  message: { error: "Too many requests. Try again later." },
  standardHeaders: true,
  legacyHeaders: false,
});

router.use("/verifyUser", verifyLimiter);

router.post("/verifyUser", async (req, res) => {
  try {
    const authHeader = req.headers.authorization;
    if (!authHeader || !authHeader.startsWith("Bearer "))
      return res.status(401).json({ error: "No token provided" });

    const token = authHeader.split(" ")[1];
    const decoded = await admin.auth().verifyIdToken(token);
    const uid = decoded.uid;

    // ✅ Fetch admin role from Firestore
    const userDoc = await db.collection("users").doc(uid).get();
    const isAdmin = userDoc.exists && userDoc.data().admin === true;

    res.setHeader("Cache-Control", "no-store");
    res.json({
      success: true,
      uid,
      email: decoded.email,
      role: isAdmin ? "admin" : "user",
    });
  } catch (error) {
    console.error("Error verifying token:", error);
    res.status(401).json({ error: "Invalid or expired token" });
  }
});

module.exports = router;
