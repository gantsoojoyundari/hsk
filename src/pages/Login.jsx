import { useState } from "react";
import { login, register, hasLegacyData } from "../lib/account.js";
import { Bow, Button, Card, Whiskers, cx } from "../components/ui.jsx";

const input = "w-full rounded-xl border border-line bg-surface p-3 text-base outline-none focus:border-ink";

export default function Login() {
  const [mode, setMode] = useState("login");
  const [name, setName] = useState("");
  const [pin, setPin] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const legacy = hasLegacyData();
  const [importLocal, setImportLocal] = useState(true);

  const isReg = mode === "register";
  const digits = (v) => v.replace(/\D/g, "").slice(0, 4);

  async function submit(e) {
    e.preventDefault();
    setError("");
    if (name.trim().length < 2) return setError("Хэрэглэгчийн нэрээ оруулна уу (2+ тэмдэгт).");
    if (pin.length !== 4) return setError("Код 4 оронтой тоо байна.");
    setBusy(true);
    try {
      if (isReg) await register(name, pin, { importLocal: legacy && importLocal });
      else await login(name, pin);
    } catch (err) {
      setError(err.message);
      setBusy(false);
    }
  }

  return (
    <div className="mx-auto flex min-h-dvh w-full max-w-sm flex-col justify-center px-4 py-10">
      <div className="mb-6 text-center">
        <Bow className="mb-2 w-14" />
        <h1 className="text-2xl font-semibold tracking-tight">HSK Sprint</h1>
        <Whiskers className="mt-1 w-8 text-muted" />
        <p className="mt-2 text-sm text-muted">Хэрэглэгчийн нэр, 4 оронтой кодоороо нэвтэрнэ. TOPIK, HSK хоёр апп-д нэг л аккаунт — аль ч төхөөрөмжөөс үргэлжлүүлнэ.</p>
      </div>

      <Card>
        <div className="mb-4 flex rounded-xl bg-line p-1 text-sm">
          {[
            ["login", "Нэвтрэх"],
            ["register", "Бүртгүүлэх"],
          ].map(([k, label]) => (
            <button
              key={k}
              type="button"
              onClick={() => (setMode(k), setError(""))}
              className={cx("flex-1 rounded-lg py-2", mode === k && "bg-surface font-medium shadow-sm")}
            >
              {label}
            </button>
          ))}
        </div>

        <form onSubmit={submit} className="space-y-3">
          <label className="block space-y-1">
            <span className="text-sm font-medium">Хэрэглэгчийн нэр</span>
            <input className={input} value={name} onChange={(e) => setName(e.target.value)} autoComplete="username" maxLength={24} placeholder="жишээ нь Сараа" />
          </label>
          <label className="block space-y-1">
            <span className="text-sm font-medium">Код (4 оронтой)</span>
            <input
              className={cx(input, "tracking-[0.3em]")}
              type="password"
              inputMode="numeric"
              autoComplete={isReg ? "new-password" : "current-password"}
              maxLength={4}
              value={pin}
              onChange={(e) => setPin(digits(e.target.value))}
              placeholder="••••"
            />
          </label>
          {isReg && legacy && (
            <label className="flex items-start gap-2 text-sm">
              <input type="checkbox" className="mt-1" checked={importLocal} onChange={(e) => setImportLocal(e.target.checked)} />
              <span>Энэ төхөөрөмж дээрх өмнөх явцыг энэ аккаунтад шилжүүлэх</span>
            </label>
          )}
          {error && <p className="rounded-xl bg-line p-3 text-sm text-bad">{error}</p>}
          <Button type="submit" className="w-full" disabled={busy}>
            {busy ? "Түр хүлээнэ үү…" : isReg ? "Бүртгүүлэх" : "Нэвтрэх"}
          </Button>
        </form>
      </Card>

      <p className="mt-4 text-center text-xs text-muted">
        {isReg ? "Кодоо мартвал сэргээх боломжгүй тул сайн санаарай." : "Бүртгэлгүй бол «Бүртгүүлэх»-ийг дарна уу."}
      </p>
    </div>
  );
}
