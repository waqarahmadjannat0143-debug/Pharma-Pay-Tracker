import { Router } from "express";
import jwt from "jsonwebtoken";
import { JWT_SECRET } from "../middlewares/authMiddleware";

const router = Router();

const ADMIN_USERNAME = process.env.ADMIN_USERNAME || "admin";
const ADMIN_PASSWORD = process.env.ADMIN_PASSWORD || "medpay@2024";

router.post("/login", (req, res) => {
  const { username, password } = req.body;
  if (username !== ADMIN_USERNAME || password !== ADMIN_PASSWORD) {
    res.status(401).json({ error: "Invalid credentials" });
    return;
  }
  const token = jwt.sign({ username }, JWT_SECRET, { expiresIn: "30d" });
  res.json({ token, username });
});

router.post("/logout", (_req, res) => {
  res.json({ success: true, message: "Logged out" });
});

export default router;
