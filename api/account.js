import { handleAccount } from "../server/account.js";

// Vercel serverless function: POST /api/account { action: register|login|load|save|logout }
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  let body = req.body;
  if (typeof body === "string") {
    try {
      body = JSON.parse(body);
    } catch {
      body = {};
    }
  }
  const { status, json } = await handleAccount(body ?? {}, req.headers.authorization ?? "");
  res.setHeader("Cache-Control", "no-store");
  res.status(status).json(json);
}
