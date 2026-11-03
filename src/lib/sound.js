// Урьдчилан үүсгэсэн MP3 (npm run audio → public/audio/) байвал түүнийг тоглуулна,
// байхгүй бол браузерын TTS руу буцна. Windows дээр хятад хоолой ихэвчлэн суугаагүй байдаг тул MP3 гол зам.
import manifest from "../data/audio-manifest.json";

export const clipUrl = (id) => (manifest[id] ? `${import.meta.env.BASE_URL}audio/${id}.mp3?v=${manifest[id]}` : null);

let current = null;

export function stopAll() {
  current?.pause();
  current = null;
  if (typeof speechSynthesis !== "undefined") speechSynthesis.cancel();
}

/**
 * ids-ийг дараалан тоглуулна. Манифестад хараахан ороогүй (дөнгөж үүссэн) файлыг ч шууд оролдоно —
 * файл үнэхээр байхгүй (404) үед л fallbackText-ийг браузерын TTS-ээр уншина.
 */
export function playClips(ids, fallbackText, rate = 1) {
  stopAll();
  const urls = ids.map((id) => clipUrl(id) ?? `${import.meta.env.BASE_URL}audio/${id}.mp3`);
  let i = 0;
  const next = () => {
    if (i >= urls.length) return;
    const a = new Audio(urls[i++]);
    a.playbackRate = rate;
    a.onended = next;
    a.onerror = () => {
      if (current === a) speakTts(fallbackText, rate);
    };
    current = a;
    a.play().catch(() => {});
  };
  next();
}

/** Дурын текстийг серверийн Edge хоолойгоор (/api/tts) уншина; бүтэхгүй бол браузерын TTS. */
export function speakText(text, rate = 1) {
  stopAll();
  speakTts(text, rate);
}

function speakTts(fallbackText, rate) {
  if (!fallbackText) return;
  const a = new Audio(`${import.meta.env.BASE_URL}api/tts?text=${encodeURIComponent(fallbackText)}`);
  a.playbackRate = rate;
  a.onerror = () => {
    if (current === a) browserTts(fallbackText, rate);
  };
  current = a;
  a.play().catch(() => {});
}

function browserTts(fallbackText, rate) {
  if (typeof speechSynthesis === "undefined" || !fallbackText) return;
  const u = new SpeechSynthesisUtterance(fallbackText);
  u.lang = "zh-CN";
  u.rate = 0.9 * rate;
  speechSynthesis.speak(u);
}
