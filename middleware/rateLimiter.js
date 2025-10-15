// middleware/rateLimiter.js
const rateLimit = require("express-rate-limit");

const createOrderLimiter = rateLimit({
  windowMs: 60 * 1000, // 1 minute
  max: 20,             // max 20 requests per IP per minute
  message: { error: "Too many requests. Slow down." },
});

module.exports = { createOrderLimiter };
