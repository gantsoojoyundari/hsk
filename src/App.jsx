import { useEffect, useState } from "react";
import { useStore } from "./lib/store.js";
import { cx } from "./components/ui.jsx";
import Onboarding from "./pages/Onboarding.jsx";
import Login from "./pages/Login.jsx";
import { useSession } from "./lib/account.js";
import Home from "./pages/Home.jsx";
import Vocab from "./pages/Vocab.jsx";
import Practice from "./pages/Practice.jsx";
import Grammar from "./pages/Grammar.jsx";
import Listening from "./pages/Listening.jsx";
import Reading from "./pages/Reading.jsx";
import Writing from "./pages/Writing.jsx";
import Mock from "./pages/Mock.jsx";
import Mistakes from "./pages/Mistakes.jsx";
import Progress from "./pages/Progress.jsx";
import Plan from "./pages/Plan.jsx";
import Settings from "./pages/Settings.jsx";
import Pinyin from "./pages/Pinyin.jsx";
import Sentences from "./pages/Sentences.jsx";
import EasyListening from "./pages/EasyListening.jsx";
import DailyTest from "./pages/DailyTest.jsx";

const ROUTES = {
  "": Home,
  vocab: Vocab,
  practice: Practice,
  grammar: Grammar,
  listening: Listening,
  reading: Reading,
  writing: Writing,
  mock: Mock,
  mistakes: Mistakes,
  progress: Progress,
  plan: Plan,
  settings: Settings,
  pinyin: Pinyin,
  hangul: Pinyin,
  sentences: Sentences,
  "easy-listening": EasyListening,
  "daily-test": DailyTest,
};

function useHashRoute() {
  const read = () => window.location.hash.replace(/^#\/?/, "").split("?")[0];
  const [route, setRoute] = useState(read);
  useEffect(() => {
    const on = () => {
      setRoute(read());
      window.scrollTo(0, 0);
    };
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return route;
}

const NAV = [
  { href: "#/", route: "", label: "Өнөөдөр", icon: "M3 11l9-8 9 8M5 10v10h14V10" },
  { href: "#/vocab", route: "vocab", label: "Үг", icon: "M4 5h16v14H4zM8 9h8M8 13h5" },
  { href: "#/practice", route: "practice", label: "Дадлага", icon: "M12 20l9-5-9-5-9 5 9 5zM3 10l9-5 9 5" },
  { href: "#/mock", route: "mock", label: "Шалгалт", icon: "M9 4h6M12 8v5l3 2M5 13a7 7 0 1014 0 7 7 0 00-14 0" },
  { href: "#/progress", route: "progress", label: "Явц", icon: "M4 20V10M10 20V4M16 20v-7M22 20H2" },
];

const PRACTICE_ROUTES = ["pinyin", "hangul", "sentences", "easy-listening", "practice", "grammar", "listening", "reading", "writing", "mistakes"];

export default function App() {
  const session = useSession();
  return session ? <Main key={session.name} /> : <Login />;
}

function Main() {
  const profile = useStore((s) => s.profile);
  const diagnostic = useStore((s) => s.diagnostic);
  const route = useHashRoute();

  if (!profile || !diagnostic?.seen) return <Onboarding />;

  const Screen = ROUTES[route] ?? Home;
  const active = PRACTICE_ROUTES.includes(route) ? "practice" : route === "plan" || route === "settings" ? "" : route;

  return (
    <div className="min-h-dvh">
      <Screen />
      <nav className="fixed inset-x-0 bottom-0 z-20 border-t border-line bg-surface/95 pb-[env(safe-area-inset-bottom)] backdrop-blur">
        <div className="mx-auto grid max-w-xl grid-cols-5">
          {NAV.map((n) => (
            <a
              key={n.route}
              href={n.href}
              className={cx("flex flex-col items-center gap-0.5 py-2 text-[11px]", active === n.route ? "text-ink" : "text-muted")}
            >
              <svg width="22" height="22" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={active === n.route ? 2.2 : 1.6} strokeLinecap="round" strokeLinejoin="round">
                <path d={n.icon} />
              </svg>
              {n.label}
            </a>
          ))}
        </div>
      </nav>
    </div>
  );
}
