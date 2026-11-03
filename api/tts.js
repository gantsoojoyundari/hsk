import { synthesize } from "../server/tts.js";

// Vercel serverless function: GET /api/tts?text=...&v=f|m
export default async function handler(req, res) {
  const buf = await synthesize(String(req.query.text ?? ""), String(req.query.v ?? "f")).catch(() => null);
  if (!buf) return res.status(404).end();
  res.setHeader("Content-Type", "audio/mpeg");
  res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
  res.status(200).send(buf);
}
