require("dotenv").config();
const express = require("express");
const cors = require("cors");
const paymentRoutes = require("./routes/paymentRoutes.js");
const userVerifyRoute = require("./routes/userVerify.js");

const app = express();

// CORS
app.use(cors({ origin: process.env.FRONTEND_URL.replace(/\/$/, "") }));

// Parse JSON (except webhook raw body)
app.use(express.json());

// Routes
app.use("/api", userVerifyRoute);
app.use("/api", paymentRoutes);

const PORT = process.env.PORT || 4000;
app.listen(PORT, () => console.log(`✅ Server running on port ${PORT}`));
