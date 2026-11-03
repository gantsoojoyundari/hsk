import { useEffect, useRef, useState } from "react";
import { useStore } from "../lib/store.js";
import { pinyin } from "pinyin-pro";

const HANZI = /[㐀-鿿]/;
/** 汉字 → тэмдэгтэй пиньинь ("你好" → "nǐ hǎo"). Үг бүрийг контекстоор нь (多音字) зөв уншина. */
export const toPinyin = (text) => pinyin(text, { nonZh: "consecutive" }).replace(/\s+([。？！，、；：”）])/g, "$1");

export function cx(...a) {
  return a.filter(Boolean).join(" ");
}

/** Theme-ийн чимэглэл: ягаан тууз (Saved Pictures\Gato_ Hello kitty.jpg-ээс). */
export function Bow({ className }) {
  return (
    <svg viewBox="0 0 64 40" className={cx("inline-block shrink-0", className)} aria-hidden="true">
      <g stroke="var(--color-ink)" strokeWidth="3" strokeLinejoin="round" fill="var(--color-bow)">
        <path d="M30 20C20 4 6 2 4 12s6 22 26 8z" />
        <path d="M34 20c10-16 24-18 26-8s-6 22-26 8z" />
        <ellipse cx="32" cy="20" rx="7" ry="8" />
      </g>
      <path d="M12 12c4-2 9 0 12 5M52 12c-4-2-9 0-12 5" stroke="var(--color-ink)" strokeWidth="2.5" fill="none" strokeLinecap="round" opacity=".6" />
    </svg>
  );
}

/** Зөв хариулсан бол «Зөв!»-ийг ms хугацаанд харуулаад өөрөө дараагийнх руу шилжинэ. */
export function useAutoNext(active, fn, ms = 1000) {
  const ref = useRef(fn);
  ref.current = fn;
  useEffect(() => {
    if (!active) return;
    const t = setTimeout(() => ref.current(), ms);
    return () => clearTimeout(t);
  }, [active, ms]);
}

/** Хятад текст + доор нь пиньинь (Тохиргоо → «Пиньинь»-ээр унтраана). */
export function Ko({ text, className, galigClassName }) {
  const on = useStore((s) => s.settings.galig !== false);
  return (
    <span className={cx("inline-flex flex-col", className)}>
      <span className="ko" lang="zh-CN">{text}</span>
      {on && HANZI.test(text) && <span className={cx("text-[0.72em] font-normal text-muted", galigClassName)}>{toPinyin(text)}</span>}
    </span>
  );
}

/** Сахал — гарчгийн доорх жижиг чимэглэл. */
export function Whiskers({ className }) {
  return (
    <svg viewBox="0 0 40 16" className={cx("inline-block shrink-0", className)} aria-hidden="true">
      <path d="M2 4l14 3M1 12l15-2M38 4l-14 3M39 12l-15-2" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" fill="none" />
    </svg>
  );
}

// Tailwind-д динамик анги үүсгэхгүйн тулд хэсэг бүрийн ангийг бүтнээр нь бичнэ.
export const TONE = {
  listening: { text: "text-listening", bg: "bg-listening", soft: "bg-listening-soft", border: "border-listening" },
  writing: { text: "text-writing", bg: "bg-writing", soft: "bg-writing-soft", border: "border-writing" },
  reading: { text: "text-reading", bg: "bg-reading", soft: "bg-reading-soft", border: "border-reading" },
  vocab: { text: "text-vocab", bg: "bg-vocab", soft: "bg-vocab-soft", border: "border-vocab" },
  mistakes: { text: "text-bad", bg: "bg-bad", soft: "bg-line", border: "border-bad" },
  mock: { text: "text-ink", bg: "bg-ink", soft: "bg-line", border: "border-ink" },
};

export function Page({ title, back, children, action }) {
  return (
    <div className="mx-auto w-full max-w-xl px-4 pb-28 pt-4">
      {(title || back) && (
        <header className="mb-4 flex items-center gap-2">
          {back && (
            <a href={back} className="-ml-2 rounded-lg p-2 text-muted hover:bg-line" aria-label="Буцах">
              <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
                <path d="M15 18l-6-6 6-6" />
              </svg>
            </a>
          )}
          <h1 className="flex flex-1 items-center gap-2 text-xl font-semibold tracking-tight">
            {title}
            <Bow className="w-5 rotate-12" />
          </h1>
          {action}
        </header>
      )}
      {children}
    </div>
  );
}

export function Card({ className, children, ...rest }) {
  return (
    <div className={cx("rounded-2xl border border-line bg-surface p-4", className)} {...rest}>
      {children}
    </div>
  );
}

export function Button({ variant = "primary", className, ...rest }) {
  const styles = {
    primary: "bg-accent text-white hover:opacity-90",
    ghost: "bg-transparent text-ink hover:bg-line",
    outline: "border border-line bg-surface text-ink hover:bg-line",
  };
  return (
    <button
      className={cx(
        "inline-flex min-h-11 items-center justify-center gap-2 rounded-xl px-4 text-sm font-medium transition disabled:cursor-not-allowed disabled:opacity-40",
        styles[variant],
        className,
      )}
      {...rest}
    />
  );
}

export function Pill({ tone, children, className }) {
  const t = TONE[tone];
  return (
    <span className={cx("inline-flex items-center rounded-full px-2 py-0.5 text-xs font-medium", t ? `${t.soft} ${t.text}` : "bg-line text-muted", className)}>
      {children}
    </span>
  );
}

export function Bar({ value, tone = "mock", className }) {
  const t = TONE[tone];
  return (
    <div className={cx("h-2 w-full overflow-hidden rounded-full bg-line", className)}>
      <div className={cx("h-full rounded-full transition-all", t.bg)} style={{ width: `${Math.max(0, Math.min(100, value))}%` }} />
    </div>
  );
}

export function Empty({ children }) {
  return <p className="rounded-2xl border border-dashed border-line p-6 text-center text-sm text-muted">{children}</p>;
}

/** Секундээр тоолох таймер. remaining 0 болоход onExpire дуудна. */
export function useCountdown(seconds, onExpire, running = true) {
  const [left, setLeft] = useState(seconds);
  const cb = useRef(onExpire);
  cb.current = onExpire;
  useEffect(() => setLeft(seconds), [seconds]);
  useEffect(() => {
    if (!running) return;
    const id = setInterval(() => {
      setLeft((l) => {
        if (l <= 1) {
          clearInterval(id);
          setTimeout(() => cb.current?.(), 0);
          return 0;
        }
        return l - 1;
      });
    }, 1000);
    return () => clearInterval(id);
  }, [running, seconds]);
  return left;
}

export function Clock({ seconds, warnAt = 60 }) {
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return (
    <span className={cx("font-mono text-sm tabular-nums", seconds <= warnAt ? "text-bad" : "text-muted")}>
      {String(m).padStart(2, "0")}:{String(s).padStart(2, "0")}
    </span>
  );
}
