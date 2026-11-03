// Нэр + 4 оронтой кодоор нэвтрэх. Аккаунт, явц нь сервер дээр хадгалагдана → аль ч төхөөрөмжөөс нэвтэрнэ.
// Төхөөрөмж дээр кэш хадгалдаг тул интернэтгүй үед ч ажиллаж, холбогдмогц сервер рүү илгээнэ.
import { useSyncExternalStore } from "react";
import { openUser, replaceState, closeUser, cachedData, legacyData, clearLegacy, getState } from "./store.js";
import { applyTheme } from "./theme.js";

const SESSION_KEY = "hsk-sprint:session";
const LOCAL_ACCOUNTS = "hsk-sprint:accounts"; // өмнөх (зөвхөн төхөөрөмж дээрх) хувилбарын аккаунтууд
let session = readSession();
let status = "idle"; // idle | saving | saved | offline | local
const listeners = new Set();
const emit = () => listeners.forEach((l) => l());

function readJson(key) {
  try {
    return JSON.parse(localStorage.getItem(key));
  } catch {
    return null;
  }
}
function writeJson(key, value) {
  try {
    if (value == null) localStorage.removeItem(key);
    else localStorage.setItem(key, JSON.stringify(value));
  } catch {
    /* хувийн цонх гэх мэт */
  }
}

function readSession() {
  const s = readJson(SESSION_KEY);
  return s?.name && s?.token ? s : null;
}
function writeSession(s) {
  session = s;
  writeJson(SESSION_KEY, s);
  emit();
}

const normalizeName = (name) => String(name ?? "").normalize("NFC").trim().replace(/\s+/g, " ");
const userKey = (name) => normalizeName(name).toLowerCase();

async function call(action, payload = {}, opts = {}) {
  let r;
  try {
    r = await fetch("/api/account", {
      method: "POST",
      headers: { "Content-Type": "application/json", ...(session ? { Authorization: `Bearer ${session.token}` } : {}) },
      body: JSON.stringify({ action, ...payload }),
      ...opts,
    });
  } catch {
    const e = new Error("Интернэт холболтоо шалгана уу.");
    e.status = 0;
    throw e;
  }
  let json = {};
  try {
    json = await r.json();
  } catch {
    /* ignore */
  }
  if (!r.ok) {
    const e = new Error(json.error || "Сервертэй холбогдож чадсангүй.");
    e.status = r.status;
    e.code = json.code;
    throw e;
  }
  return json;
}

// ---------- Сервер рүү хадгалах (debounce) ----------

let timer = null;
let pending = false;

function setStatus(s) {
  status = s;
  emit();
}

async function flush(keepalive = false) {
  clearTimeout(timer);
  if (!pending || !session) return;
  pending = false;
  setStatus("saving");
  try {
    await call("save", { data: getState() }, keepalive ? { keepalive: true } : {});
    setStatus("saved");
  } catch (e) {
    pending = true;
    if (e.code === "no_storage") return setStatus("local");
    if (e.status === 401) return expire();
    setStatus("offline");
    timer = setTimeout(() => flush(), 15000);
  }
}

function schedule() {
  pending = true;
  clearTimeout(timer);
  timer = setTimeout(() => flush(), 1200);
}

if (typeof window !== "undefined") {
  addEventListener("pagehide", () => flush(true));
  document.addEventListener("visibilitychange", () => document.visibilityState === "hidden" && flush(true));
  addEventListener("online", () => flush());
}

// ---------- Нэвтрэх / бүртгүүлэх ----------

function newer(a, b) {
  return (a?.updatedAt ?? 0) > (b?.updatedAt ?? 0);
}

function activate(res) {
  const key = userKey(res.name);
  const local = cachedData(key);
  // Энэ төхөөрөмж дээр илүү сүүлийн явц байвал (жишээ нь интернэтгүй үед хийсэн) түүнийг үлдээнэ.
  const useLocal = local?.profile && (!res.data || newer(local, res.data));
  openUser(key, useLocal ? local : res.data, schedule);
  applyTheme();
  writeSession({ name: res.name, token: res.token });
  if (useLocal) schedule();
}

async function pinHash(pin, salt) {
  const buf = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(`${salt}:${pin}`));
  return [...new Uint8Array(buf)].map((b) => b.toString(16).padStart(2, "0")).join("");
}

/** Энэ төхөөрөмж дээр хадгалагдсан аккаунт (код таарвал). */
async function localAccount(name, pin) {
  const acc = (readJson(LOCAL_ACCOUNTS) ?? {})[userKey(name)];
  if (!acc) return null;
  return (await pinHash(pin, acc.salt)) === acc.hash ? acc : null;
}

// Сервер дээрх сан холбогдоогүй үеийн нөөц: аккаунтыг төхөөрөмж дээр түр хадгална.
// Сан холбогдсоны дараа нэвтрэхэд login() нь түүнийг сервер рүү автоматаар шилжүүлнэ.
async function localRegister(name, pin, data) {
  const n = normalizeName(name);
  const accounts = readJson(LOCAL_ACCOUNTS) ?? {};
  if (accounts[userKey(n)]) throw new Error("Энэ нэр аль хэдийн бүртгэлтэй байна. Өөр нэр сонгох эсвэл «Нэвтрэх»-ээр орно уу.");
  const salt = crypto.randomUUID();
  accounts[userKey(n)] = { name: n, salt, hash: await pinHash(pin, salt), createdAt: Date.now() };
  writeJson(LOCAL_ACCOUNTS, accounts);
  activate({ name: n, token: "local", data });
}

export async function register(name, pin, { importLocal }) {
  const key = userKey(name);
  const data = cachedData(key)?.profile ? cachedData(key) : importLocal ? legacyData() : null;
  try {
    const res = await call("register", { name, pin, data });
    activate({ ...res, data: res.data ?? data });
  } catch (e) {
    if (e.code !== "no_storage") throw e;
    await localRegister(name, pin, data);
  }
  if (importLocal && data && data === legacyData()) clearLegacy();
}

export async function login(name, pin) {
  try {
    activate(await call("login", { name, pin }));
  } catch (e) {
    const acc = (e.code === "no_user" || e.code === "no_storage") && (await localAccount(name, pin));
    if (!acc) {
      if (e.code === "no_storage") throw new Error("Ийм нэртэй хэрэглэгч алга эсвэл код буруу байна.");
      throw e;
    }
    const data = cachedData(userKey(acc.name));
    if (e.code === "no_storage") return activate({ name: acc.name, token: "local", data });
    // Төхөөрөмж дээр л байсан аккаунтыг сервер рүү автоматаар шилжүүлнэ.
    const res = await call("register", { name: acc.name, pin, data });
    activate({ ...res, data: res.data ?? data });
  }
}

/** Аккаунтыг бүрмөсөн устгана (код шаардана): сервер + энэ төхөөрөмж дээрх кэш. */
export async function deleteAccount(pin) {
  if (!session) return;
  const key = userKey(session.name);
  const acc = (readJson(LOCAL_ACCOUNTS) ?? {})[key];
  if (session.token === "local" || acc) {
    if (acc && !(await localAccount(session.name, pin))) throw new Error("Код буруу байна.");
  }
  if (session.token !== "local") {
    try {
      await call("delete", { pin });
    } catch (e) {
      if (e.code !== "no_storage" || !acc) throw e;
    }
  }
  const accounts = readJson(LOCAL_ACCOUNTS) ?? {};
  delete accounts[key];
  writeJson(LOCAL_ACCOUNTS, accounts);
  clearTimeout(timer);
  pending = false;
  expire();
  writeJson(`hsk-sprint:u:${key}`, null);
  applyTheme("light");
}

function expire() {
  writeSession(null);
  closeUser();
}

export async function logout() {
  await flush().catch(() => {});
  call("logout").catch(() => {});
  expire();
  applyTheme("light");
}

/** Апп ачаалахад: кэшээс шууд нээгээд, дараа нь серверийн хувилбартай тулгана. */
export function restore() {
  if (!session) return;
  const key = userKey(session.name);
  openUser(key, cachedData(key), schedule);
  applyTheme();
  call("load")
    .then(({ data }) => {
      const local = getState();
      if (data && newer(data, local)) {
        replaceState(data);
        applyTheme();
      } else if (newer(local, data)) schedule();
    })
    .catch((e) => {
      if (e.code === "no_storage") setStatus("local");
      else if (e.status === 401) expire();
      else setStatus("offline");
    });
}

export function hasLegacyData() {
  return !!legacyData();
}

const sub = (l) => (listeners.add(l), () => listeners.delete(l));
const snap = () => session;
export function useSession() {
  return useSyncExternalStore(sub, snap);
}
const statusSnap = () => status;
export function useSyncStatus() {
  return useSyncExternalStore(sub, statusSnap);
}
