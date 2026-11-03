import { useState } from "react";
import { AudioPlayer, Transcript } from "./Audio.jsx";
import { cx, Ko } from "./ui.jsx";

const CIRCLED = ["①", "②", "③", "④"];

/**
 * Олон сонголттой асуулт. mode:
 *  - "practice": сонгомогц зөв/буруу + тайлбар (+ сонсголд transcript) харуулна
 *  - "exam": зөвхөн сонголтыг тэмдэглэнэ, хариуг хожим харуулна
 *  - "review": хариу, тайлбар шууд нээлттэй (шалгалтын дараах тойм)
 */
export function Question({ item, mode = "practice", chosen: chosenProp, onChoose, number, maxPlays }) {
  const [local, setLocal] = useState(null);
  const chosen = chosenProp !== undefined ? chosenProp : local;
  const revealed = mode === "review" || (mode === "practice" && chosen != null);

  function choose(i) {
    if (mode === "review" || (mode === "practice" && chosen != null)) return;
    setLocal(i);
    onChoose?.(i, i === item.answer);
  }

  return (
    <div className="space-y-3">
      {item.script && <AudioPlayer item={item} maxPlays={maxPlays} />}
      <p className="ko text-[15px] font-medium leading-relaxed" lang="zh-CN">
        {number != null && <span className="mr-1 text-muted">{number}.</span>}
        {item.question}
      </p>
      {item.passage && (
        <div className="ko whitespace-pre-line rounded-xl border border-line bg-bg p-3 text-[15px] leading-7" lang="zh-CN">
          {item.passage}
        </div>
      )}
      <div className="grid gap-2">
        {item.options.map((opt, i) => {
          const isAnswer = revealed && i === item.answer;
          const isWrong = revealed && i === chosen && i !== item.answer;
          return (
            <button
              key={i}
              onClick={() => choose(i)}
              className={cx(
                "flex min-h-12 items-start gap-2 rounded-xl border px-3 py-2.5 text-left text-[15px] transition",
                isAnswer && "border-good bg-writing-soft",
                isWrong && "border-bad bg-reading-soft",
                !revealed && chosen === i && "border-ink bg-line",
                !isAnswer && !isWrong && !(chosen === i && !revealed) && "border-line bg-surface hover:bg-line",
              )}
            >
              <span className="ko shrink-0 text-muted">{CIRCLED[i]}</span>
              <Ko text={opt} />
            </button>
          );
        })}
      </div>
      {revealed && (
        <div className="space-y-2">
          <p className={cx("text-sm font-medium", chosen === item.answer ? "text-good" : "text-bad")}>
            {chosen == null ? "Хариулаагүй" : chosen === item.answer ? "Зөв!" : `Буруу — зөв хариулт ${CIRCLED[item.answer]}`}
          </p>
          <p className="text-sm leading-relaxed text-muted">{item.explain_mn}</p>
          {item.script && (
            <details className="text-sm">
              <summary className="cursor-pointer py-1 font-medium text-listening">Transcript харах</summary>
              <Transcript item={item} />
            </details>
          )}
        </div>
      )}
    </div>
  );
}
