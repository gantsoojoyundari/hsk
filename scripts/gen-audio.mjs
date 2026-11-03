// Хятад аудиог урьдчилан MP3 болгож public/audio/-д хадгална.
// Ингэснээр төхөөрөмж дээр хятад дуу хоолой суугаагүй байсан ч апп дуугарна.
//   npm run audio          — шинэ/өөрчлөгдсөн мөрийг л үүсгэнэ
//   npm run audio -- --force — бүгдийг дахин үүсгэнэ
// Microsoft Edge-ийн «Read aloud» neural хоолойг (msedge-tts) ашиглана — интернет хэрэгтэй, API түлхүүр хэрэггүй.

import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { mkdirSync, readFileSync, writeFileSync, existsSync, readdirSync, rmSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";
import { createHash } from "node:crypto";
import { tmpdir } from "node:os";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const readJson = (p) => JSON.parse(readFileSync(join(root, p), "utf8"));
const OUT = join(root, "public", "audio");
const MANIFEST = join(root, "src", "data", "audio-manifest.json");
const FORCE = process.argv.includes("--force");

const VOICE = { 女: "zh-CN-XiaoxiaoNeural", 男: "zh-CN-YunxiNeural" };

const vocab = readJson("src/data/vocab.json");
const listening = readJson("src/data/listening.json");
const grammar = readJson("src/data/grammar.json");
const pinyin = readJson("src/data/pinyin.json");
const sentences = readJson("src/data/sentences.json");

// id → [{ voice, text }]  (нэг файлд олон мөр залгагдана)
const jobs = {};
for (const w of vocab.words) {
  jobs[`vocab/${w.id}`] = [{ voice: VOICE.女, text: w.ko }];
  jobs[`vocab/${w.id}-ex`] = [{ voice: VOICE.女, text: w.ex_ko }];
}
for (const it of listening.items) {
  jobs[`listening/${it.id}`] = it.script.filter((l) => l.t.trim()).map((l) => ({ voice: VOICE[l.s] ?? VOICE.女, text: l.t }));
}
for (const h of pinyin.letters) {
  jobs[`pinyin/${h.id}`] = [{ voice: VOICE.女, text: h.say }];
  jobs[`pinyin/${h.id}-ex`] = [{ voice: VOICE.女, text: h.ex_ko }];
}
for (const st of sentences) jobs[`sentence/${st.id}`] = [{ voice: VOICE.女, text: st.ko }];
for (const g of grammar) {
  g.examples.forEach((e, i) => (jobs[`grammar/${g.id}-${i}`] = [{ voice: VOICE.男, text: e.ko }]));
}

const old = existsSync(MANIFEST) ? JSON.parse(readFileSync(MANIFEST, "utf8")) : {};
const manifest = {};
const hashOf = (parts) => createHash("sha1").update(JSON.stringify(parts)).digest("hex").slice(0, 10);

const tts = { voice: null, client: null };
async function synth(voice, text) {
  if (tts.voice !== voice) {
    tts.client?.close();
    tts.client = new MsEdgeTTS();
    await tts.client.setMetadata(voice, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    tts.voice = voice;
  }
  const dir = join(tmpdir(), `hsk-tts-${process.pid}`);
  mkdirSync(dir, { recursive: true });
  const { audioFilePath } = await tts.client.toFile(dir, text);
  const buf = readFileSync(audioFilePath);
  rmSync(audioFilePath);
  return buf;
}

let made = 0;
let kept = 0;
const ids = Object.keys(jobs);
for (const [n, id] of ids.entries()) {
  const parts = jobs[id];
  const hash = hashOf(parts);
  const file = join(OUT, `${id}.mp3`);
  if (!FORCE && old[id] === hash && existsSync(file)) {
    manifest[id] = hash;
    kept++;
    continue;
  }
  const bufs = [];
  for (const p of parts) {
    for (let attempt = 1; ; attempt++) {
      try {
        bufs.push(await synth(p.voice, p.text));
        break;
      } catch (e) {
        tts.client?.close();
        tts.voice = null;
        if (attempt >= 3) throw new Error(`${id}: ${e.message}`);
      }
    }
  }
  mkdirSync(dirname(file), { recursive: true });
  // MP3 фреймүүдийг шууд залгаж болно — ярилцагч солигдох бүрт хоолой өөрчлөгдөнө.
  writeFileSync(file, Buffer.concat(bufs));
  manifest[id] = hash;
  made++;
  process.stdout.write(`\r${n + 1}/${ids.length} ${id}            `);
}
tts.client?.close();

// Устгагдсан асуултын хуучин файлыг цэвэрлэнэ.
for (const sub of existsSync(OUT) ? readdirSync(OUT) : []) {
  for (const f of readdirSync(join(OUT, sub))) {
    if (!manifest[`${sub}/${f.replace(/\.mp3$/, "")}`]) rmSync(join(OUT, sub, f));
  }
}

writeFileSync(MANIFEST, JSON.stringify(manifest, null, 0) + "\n");
console.log(`\nДууслаа: ${made} шинэ, ${kept} хэвээр. Нийт ${Object.keys(manifest).length} файл.`);
