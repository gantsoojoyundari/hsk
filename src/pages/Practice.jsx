import { useStore } from "../lib/store.js";
import { beginnerState } from "../lib/beginner.js";
import { BeginnerPath } from "../components/BeginnerPath.jsx";
import listening from "../data/listening.json";
import reading from "../data/reading.json";
import grammar from "../data/grammar.json";
import writing from "../data/writing.json";
import { Page, Card, TONE, cx } from "../components/ui.jsx";

export default function Practice() {
  const mistakes = useStore((s) => s.mistakes).filter((m) => !m.resolved).length;
  const b = beginnerState(useStore());
  const rows = [
    { href: "#/listening", ko: "听力", mn: "Сонсгол", note: `${listening.items.length} асуулт · хурд 0.8–1.2x`, tone: "listening" },
    { href: "#/reading", ko: "阅读", mn: "Унших", note: `${reading.items.length} асуулт · төрлөөр, хугацаатай`, tone: "reading" },
    { href: "#/writing", ko: "书写", mn: "Бичих", note: `${writing.length} даалгавар · шууд шалгах + AI`, tone: "writing" },
    { href: "#/grammar", ko: "语法", mn: "Дүрмийн сан", note: `${grammar.length} хэв маяг · харьцуулалт, дасгал`, tone: "writing" },
  ];
  return (
    <Page title="Дадлага">
      {!b.graduated && (
        <div className="mb-5">
          <BeginnerPath b={b} />
          <p className="mt-4 text-sm font-semibold text-muted">HSK шалгалтын дадлага (эхлэгчийн замын дараа)</p>
        </div>
      )}
      <div className={cx("space-y-2", !b.graduated && "opacity-60")}>
        {rows.map((r) => (
          <a key={r.href} href={r.href} className="block">
            <Card className="flex items-center gap-4 hover:bg-line/40">
              <div className={cx("ko grid size-12 shrink-0 place-items-center rounded-xl text-lg font-bold", TONE[r.tone].soft, TONE[r.tone].text)} lang="zh-CN">
                {r.ko.slice(0, 1)}
              </div>
              <div className="min-w-0 flex-1">
                <div className="font-semibold">
                  <span className="ko" lang="zh-CN">{r.ko}</span> · {r.mn}
                </div>
                <div className="text-sm text-muted">{r.note}</div>
              </div>
              <span className="text-muted">›</span>
            </Card>
          </a>
        ))}
        <a href="#/mistakes" className="block">
          <Card className="flex items-center gap-4 hover:bg-line/40">
            <div className="grid size-12 shrink-0 place-items-center rounded-xl bg-line text-lg">📕</div>
            <div className="flex-1">
              <div className="font-semibold">Алдааны дэвтэр</div>
              <div className="text-sm text-muted">{mistakes} шийдээгүй алдаа</div>
            </div>
            <span className="text-muted">›</span>
          </Card>
        </a>
      </div>
    </Page>
  );
}
