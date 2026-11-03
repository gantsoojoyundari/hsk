import { analyzeText } from "../server/analyze.js";

// Vercel serverless function: POST /api/analyze
export const config = { maxDuration: 300 };

export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { status, json } = await analyzeText(body ?? {});
  res.status(status).json(json);
}
