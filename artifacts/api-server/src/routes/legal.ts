import { Router } from "express";

const router = Router();
const supportEmail = "drforex83@gmail.com";

function page(title: string, content: string) {
  return `<!doctype html>
<html lang="en">
<head>
  <meta charset="utf-8" />
  <meta name="viewport" content="width=device-width,initial-scale=1" />
  <title>${title} | MedPay</title>
  <style>
    :root{color-scheme:light;font-family:Inter,system-ui,-apple-system,BlinkMacSystemFont,"Segoe UI",sans-serif;color:#0f172a;background:#f8fafc}
    *{box-sizing:border-box}body{margin:0;padding:32px 18px}.page{max-width:780px;margin:auto}.brand{display:flex;align-items:center;gap:12px;margin-bottom:24px}.mark{display:grid;place-items:center;width:42px;height:42px;border-radius:13px;background:#2563eb;color:#fff;font-size:23px;font-weight:800}.brand strong{font-size:22px}.brand span{display:block;color:#64748b;font-size:12px}.card{background:#fff;border:1px solid #e2e8f0;border-radius:16px;padding:clamp(22px,5vw,42px);box-shadow:0 10px 35px rgba(15,23,42,.06)}h1{font-size:clamp(28px,5vw,40px);margin:0 0 8px}h2{font-size:18px;margin:28px 0 8px}p,li{color:#475569;line-height:1.7}a{color:#2563eb;font-weight:650}.date{font-size:13px;color:#64748b;margin-bottom:26px}.notice{padding:16px;border-radius:12px;background:#eff6ff;border:1px solid #bfdbfe}.danger{background:#fef2f2;border-color:#fecaca}footer{color:#94a3b8;font-size:12px;text-align:center;margin-top:20px}@media(max-width:520px){body{padding:18px 12px}.card{padding:22px}}
  </style>
</head>
<body><main class="page"><div class="brand"><div class="mark">₹</div><div><strong>MedPay</strong><span>Payment Manager</span></div></div><article class="card">${content}</article><footer>MedPay Payment Manager</footer></main></body>
</html>`;
}

router.get("/privacy", (_req, res) => {
  res
    .set("Cache-Control", "public, max-age=3600")
    .type("html")
    .send(
      page(
        "Privacy Policy",
        `<h1>Privacy Policy</h1>
        <p class="date">Effective 4 September 2026</p>
        <p>MedPay is a business ledger and payment-management service for pharmacies and other businesses. This policy explains how MedPay handles account and business data.</p>
        <h2>Data we collect</h2><p>We store the account details you provide (name, business name, email, username and a securely hashed password) and the business records you enter, including stores, agencies, invoices, payments, notes, receipt numbers and backup data.</p>
        <h2>How we use data</h2><p>Data is used only to authenticate users, isolate each business workspace, calculate balances, and provide dashboards, reports, monthly registers, backup and restore. MedPay does not sell personal or business data and does not use it for advertising.</p>
        <h2>Storage, security and sharing</h2><p>Data is transmitted over HTTPS and stored with infrastructure providers required to operate MedPay. Passwords are stored as one-way hashes. Authenticated ownership checks isolate business workspaces. We do not share records with third parties except service providers needed to run MedPay or when legally required.</p>
        <h2>Retention and deletion</h2><p>Records remain while an account is active. Workspace owners can permanently delete the account and associated stores, invoices, payments and allocations inside MedPay under <strong>Account &amp; Plan</strong>. Users who cannot sign in can use the <a href="/delete-account">account-deletion request page</a>. Deletion is permanent.</p>
        <h2>Your responsibility</h2><p>Do not enter unnecessary patient medical information. MedPay is not a clinical record system, bank, lender or payment processor.</p>
        <h2>Contact</h2><p>Privacy questions: <a href="mailto:${supportEmail}">${supportEmail}</a></p>`,
      ),
    );
});

router.get("/delete-account", (_req, res) => {
  const subject = encodeURIComponent("MedPay account deletion request");
  const body = encodeURIComponent(
    "Please delete my MedPay account and workspace.\n\nRegistered email: \nUsername: \nBusiness name: ",
  );
  res
    .set("Cache-Control", "public, max-age=3600")
    .type("html")
    .send(
      page(
        "Delete Account",
        `<h1>Delete your MedPay account</h1>
        <p class="date">For MedPay Payment Manager accounts</p>
        <div class="notice"><strong>Fastest option:</strong> Sign in to MedPay, open <strong>Account &amp; Plan</strong>, enter your current password, then choose <strong>Delete account and all data</strong>.</div>
        <h2>If you cannot sign in</h2><p>You can request deletion without reinstalling the app. Send the request from the email registered with your MedPay account and include your username and business name.</p>
        <p><a href="mailto:${supportEmail}?subject=${subject}&body=${body}">Email an account-deletion request</a></p>
        <p>Support email: <a href="mailto:${supportEmail}">${supportEmail}</a></p>
        <div class="notice danger"><strong>What is deleted:</strong> account details, workspace, stores, agencies, invoices, payments and payment allocations. Deletion is permanent, so export a backup first if you need a copy. Identity verification may be required to prevent unauthorized deletion.</div>`,
      ),
    );
});

export default router;
