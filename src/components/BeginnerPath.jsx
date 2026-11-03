import { STEPS } from "../lib/beginner.js";
import { Card, Bar, Bow, cx } from "./ui.jsx";

/** Эхлэгчийн 4 алхам — нээгдсэн, түгжээтэй, явцтай нь. */
export function BeginnerPath({ b }) {
  const progress = {
    hangul: [b.lettersAll, b.lettersTotal],
    vocab: [b.words, b.wordsTotal],
    listening: null,
    sentence: null,
  };
  const lockNote = {
    vocab: `Үндсэн ${b.basicLettersTotal} пиньинь, аялгуугаа сурвал нээгдэнэ (${b.lettersBasic}/${b.basicLettersTotal})`,
    listening: `40 үг сурвал нээгдэнэ (${b.words}/40)`,
    sentence: `60 үг сурвал нээгдэнэ (${b.words}/60)`,
  };
  return (
    <Card className="relative space-y-3">
      <Bow className="absolute -right-2 -top-3 w-10 rotate-12" />
      <div>
        <p className="font-semibold">Эхлэгчийн зам</p>
        <p className="text-sm text-muted">Алхам бүрийг дарааллаар нь. Бүгдийг дуусгавал HSK-ийн дасгалууд нээгдэнэ.</p>
      </div>
      {STEPS.map((s) => {
        const open = b.unlocked[s.id];
        const p = progress[s.id];
        const body = (
          <div className={cx("flex items-center gap-3 rounded-xl p-2", open ? "hover:bg-line/40" : "opacity-50")}>
            <span className={cx("grid size-8 shrink-0 place-items-center rounded-full text-sm font-bold", open ? "bg-accent text-white" : "bg-line text-muted")}>
              {open ? s.n : "🔒"}
            </span>
            <div className="min-w-0 flex-1">
              <p className="text-sm font-medium">{s.title}</p>
              {open && p ? (
                <Bar className="mt-1" value={(p[0] / p[1]) * 100} tone="vocab" />
              ) : (
                <p className="text-xs text-muted">{open ? s.detail : lockNote[s.id]}</p>
              )}
            </div>
            {open && p && <span className="text-xs tabular-nums text-muted">{p[0]}/{p[1]}</span>}
          </div>
        );
        return open ? <a key={s.id} href={s.route} className="block">{body}</a> : <div key={s.id}>{body}</div>;
      })}
    </Card>
  );
}
