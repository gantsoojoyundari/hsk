import { useStore, markTask, recordAttempt } from "../lib/store.js";
import { today } from "../lib/dates.js";
import { WordQuiz } from "../components/WordQuiz.jsx";
import { pickOldMix } from "../lib/srs.js";
import vocab from "../data/vocab.json";

/** Өдрийн шалгалт: өнөөдөр үзсэн үгсээс. Дуусгавал «Өдрийн шалгалт» даалгавар биелнэ. */
export default function DailyTest() {
  const todays = useStore((s) => s.log[today()]?.words ?? []);
  const srs = useStore((s) => s.srs);
  // Өнөөдрийн үгс + өмнөх өдрүүдийн үгсээс энд тэндээс 4.
  const old = pickOldMix(vocab.words, srs, { now: today(), n: 4, exclude: todays, salt: "test" });
  const words = [...todays.slice(-6), ...old];
  return (
    <WordQuiz
      key={words.length ? "on" : "off"}
      ids={words}
      title="Өдрийн шалгалт"
      onFinish={(score, total) => {
        recordAttempt("vocab", score, total, "daily-test");
        markTask(`${today()}:dailytest`);
        location.hash = "#/";
      }}
    />
  );
}
