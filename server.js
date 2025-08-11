import express from "express";
import dotenv from "dotenv";
import Stripe from "stripe";
import cors from "cors";
import { products } from "./Projects.js";// must be .js if ES modules

dotenv.config();

const app = express();
app.use(cors({
  origin: process.env.FRONTEND_URL ,
  methods: ["GET", "POST"],
  allowedHeaders: ["Content-Type"]
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
      console.log(`Processing item: ${JSON.stringify(item)}`);

      const product = products.find(p => p.id === item.id);
      if (!product) {
        console.error(`❌ Product not found for id: ${item.id}`);
        throw new Error(`Product not found: ${item.id}`);
      }

      const price = calculatePrice(item);
      console.log(`✅ Price calculated for ${product.name}: $${price}`);

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

    console.log("✅ All line items processed successfully");
    console.log("Line Items:", JSON.stringify(lineItems, null, 2));

    const session = await stripe.checkout.sessions.create({
      payment_method_types: ["card"],
      mode: "payment",
      line_items: lineItems,
      success_url: `${process.env.FRONTEND_URL}/success`,
      cancel_url: `${process.env.FRONTEND_URL}/cancel`,
    });

    console.log("✅ Stripe session created:", session.id);
    res.json({ url: session.url });
  } catch (error) {
    console.error("❌ Stripe checkout error:", error);
    res.status(500).json({ error: error.message });
  }
});
