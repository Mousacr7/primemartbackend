require("dotenv").config();
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes.js");
const userVerifyRoute = require("./routes/userVerify.js");

const app = express();

// ✅ Fix Render proxy + express-rate-limit issue
app.set("trust proxy", 1);

// ✅ Configure CORS correctly (allow frontend URL + handle undefined case)
app.use(
  cors({
    origin: process.env.FRONTEND_URL
      ? process.env.FRONTEND_URL.replace(/\/$/, "")
      : "*", // fallback for local testing
    methods: ["GET", "POST", "PUT", "DELETE"],
    credentials: true,
  })
);

// ✅ Parse JSON safely (handle Stripe webhook separately if you add it later)
app.use(express.json());

// ✅ Routes
app.use("/api", userVerifyRoute);
app.use("/api", paymentRoutes);

// ✅ Health check endpoint
app.get("/", (req, res) => {
  res.send("✅ PrimeMart Backend is running...");
});

// ✅ Start server
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
