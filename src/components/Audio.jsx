import { useEffect, useRef, useState } from "react";
import { cx } from "./ui.jsx";
import { clipUrl } from "../lib/sound.js";

// MP3 (npm run audio) байхгүй үед браузерын хятад TTS-ээр уншуулна.
// Асуултад `audio` (mp3 зам) нэмбэл <audio> ашиглана — бодит бичлэгт шилжихэд UI өөрчлөгдөхгүй.

export const SPEEDS = [0.8, 0.9, 1, 1.1, 1.2];

function zhVoices() {
  if (typeof speechSynthesis === "undefined") return [];
  return speechSynthesis.getVoices().filter((v) => v.lang?.toLowerCase().startsWith("zh"));
}

export function useChineseVoices() {
  const [voices, setVoices] = useState(zhVoices);
  useEffect(() => {
    if (typeof speechSynthesis === "undefined") return;
    const on = () => setVoices(zhVoices());
    speechSynthesis.addEventListener("voiceschanged", on);
    on();
    return () => speechSynthesis.removeEventListener("voiceschanged", on);
  }, []);
  return voices;
}

export function AudioPlayer({ item: raw, maxPlays = Infinity, onPlaysChange, tone = "listening" }) {
  // npm run audio-оор үүсгэсэн MP3 байвал түүнийг ашиглана.
  const item = raw.audio ? raw : { ...raw, audio: clipUrl(`listening/${raw.id}`) };
  const voices = useChineseVoices();
  const [speed, setSpeed] = useState(1);
  const [playing, setPlaying] = useState(false);
  const [plays, setPlays] = useState(0);
  const audioRef = useRef(null);
  const lines = item.script.filter((l) => l.t.trim());
  const supported = typeof speechSynthesis !== "undefined";

  useEffect(() => () => supported && speechSynthesis.cancel(), [supported, item.id]);
  useEffect(() => {
    setPlays(0);
    setPlaying(false);
  }, [item.id]);
  // Асуулт нээгдэхэд нэг удаа өөрөө тоглоно (бодит шалгалт шиг) — дараа нь «Дахин сонсох».
  useEffect(() => {
    if (!item.audio) return;
    const t = setTimeout(() => play(), 300);
    return () => clearTimeout(t);
  }, [item.id]); // eslint-disable-line react-hooks/exhaustive-deps

  function play() {
    if (plays >= maxPlays) return;
    const n = plays + 1;
    setPlays(n);
    onPlaysChange?.(n);

    if (item.audio && audioRef.current) {
      audioRef.current.playbackRate = speed;
      audioRef.current.currentTime = 0;
      audioRef.current.play().catch(() => setPlaying(false));
      return;
    }
    if (!supported) return;
    speechSynthesis.cancel();
    setPlaying(true);
    // Хоёр дуу хоолой байвал хүйсээр ялгана, нэг л байвал pitch-ээр ялгана.
    const female = voices.find((v) => /female|xiaoxiao|huihui|yaoyao|ting-ting|tingting|女/i.test(v.name)) ?? voices[0];
    const male = voices.find((v) => v !== female && /male|yunxi|kangkang|男/i.test(v.name)) ?? voices.find((v) => v !== female);
    lines.forEach((line, i) => {
      const u = new SpeechSynthesisUtterance(line.t);
      u.lang = "zh-CN";
      u.rate = speed;
      const isMale = line.s === "男";
      u.voice = (isMale ? male : female) ?? null;
      if (!male) u.pitch = isMale ? 0.75 : 1.2;
      if (i === lines.length - 1) u.onend = u.onerror = () => setPlaying(false);
      speechSynthesis.speak(u);
    });
  }

  function stop() {
    if (item.audio) audioRef.current?.pause();
    else if (supported) speechSynthesis.cancel();
    setPlaying(false);
  }

  const left = maxPlays === Infinity ? null : maxPlays - plays;

  return (
    <div className="rounded-2xl bg-listening-soft p-3">
      {item.audio && <audio ref={audioRef} src={item.audio} onPlay={() => setPlaying(true)} onEnded={() => setPlaying(false)} />}
      <div className="flex items-center gap-3">
        <button
          onClick={playing ? stop : play}
          disabled={!playing && left === 0}
          className={cx(
            "grid size-12 shrink-0 place-items-center rounded-full text-white disabled:opacity-40",
            tone === "listening" ? "bg-listening" : "bg-ink",
          )}
          aria-label={playing ? "Зогсоох" : plays ? "Дахин сонсох" : "Тоглуулах"}
        >
          {playing ? (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><rect x="6" y="5" width="4" height="14" rx="1" /><rect x="14" y="5" width="4" height="14" rx="1" /></svg>
          ) : (
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor"><path d="M8 5v14l11-7z" /></svg>
          )}
        </button>
        <div className="min-w-0 flex-1 text-sm">
          <div className="font-medium text-listening">{playing ? "Тоглуулж байна…" : plays ? "Дахин сонсох" : "Сонсох"}</div>
          <div className="text-xs text-muted">
            {left != null ? `${left} удаа үлдсэн` : `${plays} удаа сонссон`}
          </div>
        </div>
        <label className="flex items-center gap-1 text-xs text-muted">
          Хурд
          <select
            value={speed}
            onChange={(e) => setSpeed(Number(e.target.value))}
            className="rounded-lg border border-line bg-surface px-1.5 py-1 text-ink"
          >
            {SPEEDS.map((s) => (
              <option key={s} value={s}>{s}x</option>
            ))}
          </select>
        </label>
      </div>
      {!item.audio && supported && voices.length === 0 && (
        <p className="mt-2 text-xs text-muted">
          Төхөөрөмж дээр хятад дуу хоолой олдсонгүй. Тохиргоо → Хэл → «中文(简体)» дуу хоолой суулгавал илүү зөв дуудна.
        </p>
      )}
      {!item.audio && !supported && <p className="mt-2 text-xs text-bad">Энэ браузер дуу унших боломжгүй. Transcript-ийг уншина уу.</p>}
    </div>
  );
}

export function Transcript({ item }) {
  return (
    <div className="ko space-y-1 rounded-xl bg-bg p-3 text-sm" lang="zh-CN">
      {item.script
        .filter((l) => l.t.trim())
        .map((l, i) => (
          <p key={i}>
            <span className="mr-1 font-semibold text-muted">{l.s}:</span>
            {l.t}
          </p>
        ))}
    </div>
  );
}
