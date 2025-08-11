import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import cors from "cors";
import { products } from "./Projects.js"; // must be .js for ES modules

dotenv.config();

const app = express();

// Check required environment variables
if (!process.env.SECRET_STRIPE_KEY || !process.env.FRONTEND_URL) {
  console.error("❌ Missing environment variables. Please set SECRET_STRIPE_KEY and FRONTEND_URL.");
  process.exit(1);
}

app.use(cors({
  origin: process.env.FRONTEND_URL.replace(/\/$/, ""), // remove trailing slash just in case
}));
app.use(express.json());

const stripe = new Stripe(process.env.SECRET_STRIPE_KEY);

// Secure price calculation
const calculatePrice = (item) => {
  const product = products.find(p => p.id === item.id);
  if (!product) throw new Error("Product not found");

  let price = product.price;

  if (item.selectedSize === "128GB") price += 250;
  if (item.selectedSize === "256GB") price += 500;
  if (item.selectedSize === "32GB") price -= 200;

  if (item.selectedRam === "16GB") price += 200;
  if (item.selectedRam === "4GB") price -= 200;

  return price;
};

app.post("/create-checkout-session", async (req, res) => {
  try {
    console.log("=== Incoming Checkout Session Request ===");
    console.log("Request Headers:", req.headers);
    console.log("Request Body:", JSON.stringify(req.body, null, 2));

    if (!req.body.items || !Array.isArray(req.body.items)) {
      console.error("❌ Invalid items array in request");
      return res.status(400).json({ error: "Invalid items array" });
    }

    const lineItems = req.body.items.map(item => {
      const product = products.find(p => p.id === item.id);
      if (!product) throw new Error(`Product not found: ${item.id}`);

      const price = calculatePrice(item);

      return {
        price_data: {
          currency: "usd",
          product_data: {
            name: product.name,
            images: [product.image[0]]
          },
          unit_amount: Math.round(price * 100)
        },
        quantity: item.quantity,
      };
    });

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/`, // Redirect to homepage on cancel

    });

    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});

// Listen on provided PORT for Render
const PORT = process.env.PORT || 4000;
app.listen(PORT, () => {
  console.log(`✅ Server is running on port ${PORT}`);
});
