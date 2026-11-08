/**
 * API 與靜態資源的端到端審計（零依賴，只需要伺服器在跑）。
 *
 * 為什麼要有這個測試：內容 CI 驗的是「教材本身對不對」，
 * UI 冒煙驗的是「DOM 邏輯對不對」，但**兩者都不會發現**
 * 「某個端點在壞輸入下回 500」「某個資源 404」「路徑穿越沒擋」這類問題。
 *
 * 用法：
 *   node app/server/index.mjs          # 另開一個終端
 *   node app/test/audit-api.mjs        # 預設打 http://127.0.0.1:4173
 *   node app/test/audit-api.mjs --base http://127.0.0.1:4174
 */

const args = process.argv.slice(2);
const baseIdx = args.indexOf("--base");
const BASE = baseIdx >= 0 ? args[baseIdx + 1] : (process.env.CPPFORGE_URL ?? "http://127.0.0.1:4173");

let pass = 0;
let fail = 0;
const failures = [];

const check = (ok, name, detail = "") => {
  if (ok) {
    pass += 1;
    console.log(`  \u001b[32mPASS\u001b[0m  ${name}${detail ? `  ← ${detail}` : ""}`);
  } else {
    fail += 1;
    failures.push(name + (detail ? ` (${detail})` : ""));
    console.log(`  \u001b[31mFAIL\u001b[0m  ${name}${detail ? `  ← ${detail}` : ""}`);
  }
};

const req = async (path, init) => {
  const r = await fetch(BASE + path, init);
  const text = await r.text();
  let json = null;
  try { json = JSON.parse(text); } catch { /* 非 JSON */ }
  return { status: r.status, type: r.headers.get("content-type") ?? "", text, json };
};

const sendJson = (path, body) => req(path, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: typeof body === "string" ? body : JSON.stringify(body),
});

let serverUp = false;
try {
  const h = await req("/api/health");
  serverUp = h.status === 200;
} catch {
  serverUp = false;
}
if (!serverUp) {
  console.error(`\n伺服器沒有回應：${BASE}\n先在另一個終端執行 node app/server/index.mjs，或用 --base 指定網址。\n`);
  process.exit(2);
}

console.log("\n── 靜態資源 ─────────────────────────────────");
const index = await req("/");
check(index.status === 200 && index.text.includes("<html"), "GET / 回 HTML", `${index.status}`);
check(index.type.includes("text/html"), "HTML content-type 正確", index.type);

const refs = [...index.text.matchAll(/(?:href|src)="(\/[^"]+)"/g)].map((m) => m[1]);
for (const ref of refs) {
  if (ref.startsWith("/vendor/monaco")) continue; // 選用
  const r = await req(ref);
  check(r.status === 200, `資源可取得 ${ref}`, `${r.status}`);
}

const app = await req("/app.js");
check(app.status === 200 && app.text.length > 10000, "app.js 可取得", `${app.text.length} bytes`);
const css = await req("/styles.css");
check(css.status === 200 && css.text.length > 5000, "styles.css 可取得", `${css.text.length} bytes`);
check((await req("/md.js")).status === 200, "md.js 可取得");
check((await req("/no-such-file.js")).status === 404, "不存在的靜態檔回 404");
check([403, 404].includes((await req("/../server/index.mjs")).status), "路徑穿越被擋");
check([403, 404].includes((await req("/%2e%2e/server/index.mjs")).status), "編碼路徑穿越被擋");

console.log("\n── 唯讀 API ─────────────────────────────────");
const health = await req("/api/health");
check(health.status === 200 && health.json?.ok === true, "GET /api/health");

const course = await req("/api/course");
const allNodes = course.json.levels.flatMap((l) => l.nodes);
check(course.status === 200 && allNodes.length > 0, "GET /api/course", `${allNodes.length} 節`);
check(course.json.levels.length === 7, "course 有 7 個等級", `${course.json.levels.length}`);
check(["id", "title", "unlocked", "passed", "minutes"].every((f) => f in allNodes[0]),
  "course 節點欄位齊全", Object.keys(allNodes[0]).join(","));

const stats = await req("/api/stats");
check(stats.status === 200, "GET /api/stats", `${stats.status}`);
check(["passedNodes", "firstTryPassed", "independentRate", "totalAttempts"].every((k) => k in (stats.json ?? {})),
  "stats 有統計欄位", Object.keys(stats.json ?? {}).join(","));

const atlas = await req("/api/atlas");
const entries = atlas.json.entries ?? [];
check(atlas.status === 200 && entries.length > 0, "GET /api/atlas", `${entries.length} 條`);
check(entries.every((e) => (e.related ?? []).length > 0), "圖鑑都連到課程");
check(entries.every((e) => e.symptom && (e.fixes ?? []).length && e.bad && e.good),
  "圖鑑條目欄位完整（symptom/fixes/bad/good）");

const lint = await req("/api/content/lint");
check(lint.status === 200 && lint.json.problems.length === 0, "內容 lint 0 問題", `${lint.json.problems?.length}`);

const doctor = await req("/api/doctor");
check(doctor.status === 200 && typeof doctor.json.ready === "boolean", "GET /api/doctor", `ready=${doctor.json.ready}`);

console.log("\n── 每個節點的內容 API ───────────────────────");
const nodeGap = [];
for (const n of allNodes) {
  const d = await req(`/api/nodes/${n.id}`);
  if (d.status !== 200) { nodeGap.push(`${n.id} status=${d.status}`); continue; }
  const j = d.json;
  const miss = [];
  if (!j.title) miss.push("title");
  if (!j.lesson || j.lesson.length < 50) miss.push("lesson");
  if (!j.starter) miss.push("starter");
  if ((j.objectives ?? []).length < 2) miss.push("objectives");
  if ((j.hints ?? []).length < 2) miss.push("hints");
  if ((j.steps ?? []).length < 2) miss.push("steps");
  if (!(j.drills ?? []).length) miss.push("drills");
  if (!j.graderSummary?.graders?.length) miss.push("graders");
  if (!j.submissionName) miss.push("submissionName");
  if (miss.length) nodeGap.push(`${n.id}:${miss.join(",")}`);
}
check(nodeGap.length === 0, "所有節點的內容 API 欄位完整", nodeGap.slice(0, 3).join(" | "));
check((await req("/api/nodes/L9.99")).status === 404, "不存在的節點回 404");

console.log("\n── 複習 API ─────────────────────────────────");
const review = await req("/api/review?limit=20");
check(review.status === 200 && Array.isArray(review.json.cards), "GET /api/review", `${review.json.cards?.length} 張`);
if (review.json.cards?.length) {
  const c = review.json.cards[0];
  check(c.id !== undefined && c.front && c.back, "卡片有 id/front/back", Object.keys(c).join(","));
}
const rstats = await req("/api/review/stats");
check(rstats.status === 200 && ["total", "due", "learned"].every((k) => typeof rstats.json[k] === "number"),
  "GET /api/review/stats 欄位完整", Object.keys(rstats.json).join(","));
const insights = await req("/api/review/insights");
check(insights.status === 200 && Array.isArray(insights.json.days), "GET /api/review/insights");

check((await sendJson("/api/review/abc", { grade: 3 })).status === 400, "cardId 非整數回 400");
check((await sendJson("/api/review/1", { grade: 9 })).status === 400, "grade 超出範圍回 400");
check((await sendJson("/api/review/1", "{not json")).status === 400, "評分收到壞 JSON 回 400");
check((await sendJson("/api/review/1", "[]")).status === 400, "body 是陣列回 400");

console.log("\n── 評測 API 的邊界 ──────────────────────────");
const nodeId = allNodes[0].id;
const empty = await sendJson(`/api/nodes/${nodeId}/run`, { code: "" });
check(empty.status === 200 && empty.json.report?.passed === false, "空程式碼可評測且不通過");
const syntaxErr = await sendJson(`/api/nodes/${nodeId}/run`, { code: "int main() { not c++ }" });
check(syntaxErr.status === 200 && syntaxErr.json.report?.passed === false, "語法錯誤回報不通過（不是 500）");
check(JSON.stringify(syntaxErr.json).length < 300000, "錯誤輸出有上限", `${JSON.stringify(syntaxErr.json).length} bytes`);
check((await sendJson(`/api/nodes/${nodeId}/run`, "{not json")).status === 400, "評測收到壞 JSON 回 400");
check((await sendJson(`/api/nodes/${nodeId}/run`, { code: 12345 })).status === 400, "code 非字串回 400");
check((await sendJson(`/api/nodes/${nodeId}/run`, { code: "x".repeat(600 * 1024) })).status === 413, "超大 code 回 413");
check((await req(`/api/nodes/${nodeId}/run`)).status !== 200, "GET 評測端點不給用");
check((await sendJson("/api/nodes/L9.99/run", { code: "int main(){}" })).status === 404, "評測不存在的節點回 404");
check((await req("/api/nope")).status === 404, "未知 API 回 404");

console.log("\n── 並發一致性 ───────────────────────────────");
const par = await Promise.all(Array.from({ length: 6 }, () => req("/api/course")));
check(par.every((r) => r.status === 200), "6 個並行請求都成功");
check(new Set(par.map((r) => r.json.levels.length)).size === 1, "並行結果一致");

console.log(`\n結果：${pass} 通過 / ${fail} 失敗`);
if (fail) {
  console.log("\n失敗項目：");
  for (const f of failures) console.log(`  - ${f}`);
}
process.exit(fail === 0 ? 0 : 1);
