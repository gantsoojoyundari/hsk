import { gradeWriting } from "../server/grade.js";

// Vercel serverless function: POST /api/grade
export default async function handler(req, res) {
  if (req.method !== "POST") return res.status(405).end();
  const body = typeof req.body === "string" ? JSON.parse(req.body) : req.body;
  const { status, json } = await gradeWriting(body ?? {});
  res.status(status).json(json);
}
