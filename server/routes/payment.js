// Payment routes: create a Stars invoice link, and list packages.
import { Router } from "express";
import { validateInitData } from "../middleware/validateInitData.js";
import { PACKAGES } from "../services/users.js";
import { createInvoiceLink } from "../services/payments.js";

const router = Router();

router.post("/create-invoice", validateInitData, async (req, res) => {
  const { packageId } = req.body || {};
  const pkg = PACKAGES.find((p) => p.id === packageId);
  if (!pkg) {
    return res.status(400).json({ error: "invalid_package" });
  }
  try {
    const invoiceLink = await createInvoiceLink(req.telegramUser.id, packageId);
    return res.json({ invoiceLink, package: pkg });
  } catch (err) {
    console.error("[Payment] create invoice failed:", err);
    return res.status(500).json({ error: "payment_failed" });
  }
});

router.get("/packages", (req, res) => {
  res.json(PACKAGES);
});

export default router;
