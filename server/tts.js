// Дурын хятад текстийг (хэрэглэгчийн оруулсан текст, шинэ үг) Edge neural хоолойгоор MP3 болгоно.
// Урьдчилан үүсгэсэн public/audio/-д байхгүй үед л ашиглагдана. Үр дүнг tmp-д кэшлэнэ.
import { MsEdgeTTS, OUTPUT_FORMAT } from "msedge-tts";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const VOICES = { f: "zh-CN-XiaoxiaoNeural", m: "zh-CN-YunxiNeural" };
const CACHE = join(tmpdir(), "hsk-sprint-tts");

export async function synthesize(text, voice = "f") {
  if (typeof text !== "string" || !text.trim() || text.length > 600) return null;
  const v = VOICES[voice] ?? VOICES.f;
  mkdirSync(CACHE, { recursive: true });
  const file = join(CACHE, `${createHash("sha1").update(v + "|" + text).digest("hex")}.mp3`);
  if (existsSync(file)) return readFileSync(file);

  const tts = new MsEdgeTTS();
  try {
    await tts.setMetadata(v, OUTPUT_FORMAT.AUDIO_24KHZ_48KBITRATE_MONO_MP3);
    const dir = join(CACHE, `job-${process.pid}-${Date.now()}`);
    mkdirSync(dir, { recursive: true });
    const { audioFilePath } = await tts.toFile(dir, text);
    const buf = readFileSync(audioFilePath);
    rmSync(dir, { recursive: true, force: true });
    writeFileSync(file, buf);
    return buf;
  } finally {
    tts.close();
  }
}
