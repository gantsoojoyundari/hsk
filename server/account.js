// Нэр + 4 оронтой кодоор нэвтрэх аккаунт. Имэйл шаардлагагүй.
// Production-д Upstash Redis (Vercel Storage) REST API ашиглана; dev-д санах ойд хадгална.
import { randomBytes, scryptSync, timingSafeEqual } from "node:crypto";

const SESSION_TTL = 60 * 60 * 24 * 365; // 1 жил
const MAX_FAILS = 8; // ингэтэл буруу код оруулбал 15 минут түгжинэ
const LOCK_TTL = 15 * 60;
const MAX_DATA = 900_000; // байт
// topik-sprint, hsk хоёр нэг Redis санг хуваалцана: нэр+код (user:, sess:) нийтлэг, явц нь апп бүрт тусдаа.
const APP = "hsk";

// ---------- Хадгалах сан ----------

function redisEnv() {
  const url = process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN;
  return url && token ? { url, token } : null;
}

const mem = new Map(); // dev fallback: key → { v, exp }

async function cmd(...args) {
  const env = redisEnv();
  if (env) {
    const r = await fetch(env.url, {
      method: "POST",
      headers: { Authorization: `Bearer ${env.token}`, "Content-Type": "application/json" },
      body: JSON.stringify(args),
    });
    const j = await r.json();
    if (j.error) throw new Error(j.error);
    return j.result;
  }
  const [op, key, val] = args;
  const now = Date.now();
  const cur = mem.get(key);
  const live = cur && (!cur.exp || cur.exp > now) ? cur : null;
  switch (op) {
    case "GET":
      return live?.v ?? null;
    case "SET": {
      if (args.includes("NX") && live) return null;
      const exIdx = args.indexOf("EX");
      mem.set(key, { v: val, exp: exIdx > 0 ? now + Number(args[exIdx + 1]) * 1000 : 0 });
      return "OK";
    }
    case "DEL":
      mem.delete(key);
      return 1;
    case "INCR": {
      const n = Number(live?.v ?? 0) + 1;
      mem.set(key, { v: String(n), exp: live?.exp ?? 0 });
      return n;
    }
    case "EXPIRE":
      if (live) live.exp = now + Number(val) * 1000;
      return 1;
    default:
      throw new Error(`unsupported ${op}`);
  }
}

// ---------- Туслах ----------

export function normalizeName(name) {
  return String(name ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
}
const keyOf = (name) => normalizeName(name).toLowerCase();

function hashPin(pin, salt) {
  return scryptSync(String(pin), salt, 32).toString("hex");
}

function validate(name, pin) {
  const n = normalizeName(name);
  if (n.length < 2 || n.length > 24) return "Хэрэглэгчийн нэр 2–24 тэмдэгт байна.";
  if (!/^\d{4}$/.test(String(pin ?? ""))) return "Код 4 оронтой тоо байна.";
  return null;
}

async function newSession(key) {
  const token = randomBytes(24).toString("base64url");
  await cmd("SET", `sess:${token}`, key, "EX", SESSION_TTL);
  return token;
}

async function userFromToken(token) {
  if (!token || typeof token !== "string") return null;
  return cmd("GET", `sess:${token}`);
}

async function readData(key) {
  const raw = await cmd("GET", `data:${APP}:${key}`);
  return raw ? JSON.parse(raw) : null;
}

const ok = (json) => ({ status: 200, json });
const err = (status, error, extra) => ({ status, json: { error, ...extra } });

// ---------- Үйлдлүүд ----------

export async function handleAccount(body = {}, authHeader = "") {
  if (!redisEnv() && process.env.VERCEL) {
    return err(503, "Сервер дээр хадгалах сан холбогдоогүй байна.", { code: "no_storage" });
  }
  const token = authHeader.replace(/^Bearer\s+/i, "") || body.token;
  try {
    switch (body.action) {
      case "register": {
        const bad = validate(body.name, body.pin);
        if (bad) return err(400, bad);
        const name = normalizeName(body.name);
        const key = keyOf(name);
        const salt = randomBytes(16).toString("hex");
        const user = { name, salt, hash: hashPin(body.pin, salt), createdAt: Date.now() };
        const created = await cmd("SET", `user:${key}`, JSON.stringify(user), "NX");
        if (!created) return err(409, "Энэ нэр аль хэдийн бүртгэлтэй байна. Өөр нэр сонгох эсвэл «Нэвтрэх»-ээр орно уу.", { code: "taken" });
        const data = body.data && typeof body.data === "object" ? body.data : null;
        if (data) await cmd("SET", `data:${APP}:${key}`, JSON.stringify(data));
        return ok({ token: await newSession(key), name, data });
      }

      case "login": {
        const bad = validate(body.name, body.pin);
        if (bad) return err(400, bad);
        const key = keyOf(body.name);
        const fails = Number((await cmd("GET", `fail:${key}`)) ?? 0);
        if (fails >= MAX_FAILS) return err(429, "Хэт олон удаа буруу код орууллаа. 15 минутын дараа дахин оролдоно уу.");
        const raw = await cmd("GET", `user:${key}`);
        const user = raw ? JSON.parse(raw) : null;
        if (!user) return err(404, "Ийм нэртэй хэрэглэгч алга. «Бүртгүүлэх»-ээр шинээр үүсгэнэ үү.", { code: "no_user" });
        const match = timingSafeEqual(Buffer.from(hashPin(body.pin, user.salt), "hex"), Buffer.from(user.hash, "hex"));
        if (!match) {
          await cmd("INCR", `fail:${key}`);
          await cmd("EXPIRE", `fail:${key}`, LOCK_TTL);
          return err(401, "Код буруу байна.");
        }
        await cmd("DEL", `fail:${key}`);
        return ok({ token: await newSession(key), name: user.name, data: await readData(key) });
      }

      case "load": {
        const key = await userFromToken(token);
        if (!key) return err(401, "Нэвтрэх хугацаа дууссан.");
        return ok({ data: await readData(key) });
      }

      case "save": {
        const key = await userFromToken(token);
        if (!key) return err(401, "Нэвтрэх хугацаа дууссан.");
        const raw = JSON.stringify(body.data ?? null);
        if (raw.length > MAX_DATA) return err(413, "Өгөгдөл хэт том байна.");
        await cmd("SET", `data:${APP}:${key}`, raw);
        return ok({ saved: true });
      }

      case "delete": {
        const key = await userFromToken(token);
        if (!key) return err(401, "Нэвтрэх хугацаа дууссан.");
        const raw = await cmd("GET", `user:${key}`);
        const user = raw ? JSON.parse(raw) : null;
        if (!user || !/^\d{4}$/.test(String(body.pin ?? ""))) return err(401, "Код буруу байна.");
        const match = timingSafeEqual(Buffer.from(hashPin(body.pin, user.salt), "hex"), Buffer.from(user.hash, "hex"));
        if (!match) return err(401, "Код буруу байна.", { code: "bad_pin" });
        // Аккаунт хоёр апп-д нийтлэг тул хоёр апп-ын явцыг хамт устгана.
        for (const k of [`user:${key}`, "data:topik:" + key, "data:hsk:" + key, `sess:${token}`]) await cmd("DEL", k);
        return ok({ deleted: true });
      }

      case "logout": {
        if (token) await cmd("DEL", `sess:${token}`);
        return ok({ ok: true });
      }

      default:
        return err(400, "Үйлдэл тодорхойгүй.");
    }
  } catch (e) {
    console.error("account error", e);
    return err(500, "Серверийн алдаа. Дахин оролдоно уу.");
  }
}
