// CppForge：極簡 Markdown 渲染器（零依賴）
//
// 為什麼自己寫：課文是唯一的「內容格式」，不需要完整 CommonMark；
// 引入 marked/markdown-it 只為了渲染靜態課文並不划算，而且會多一個 npm 依賴。
//
// 支援：標題、段落、無序/有序清單、圍欄程式碼、引用、分隔線、表格、
//       行內程式碼、粗體、斜體、連結。
// 不支援（刻意）：巢狀清單、HTML 區塊、腳註。

const escapeHtml = (s) =>
  s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;")
   .replace(/"/g, "&quot;");

/** 行內語法。先抽出程式碼片段，避免被其它規則破壞。 */
function inline(text) {
  const codes = [];
  let out = text.replace(/`([^`]+)`/g, (_, code) => {
    codes.push(code);
    return `\u0000${codes.length - 1}\u0000`;
  });

  out = escapeHtml(out);

  out = out
    .replace(/\[([^\]]+)\]\(([^)\s]+)\)/g, (_, label, href) => {
      const safe = /^(https?:|#|\/)/.test(href) ? href : "#";
      return `<a href="${safe}" target="_blank" rel="noreferrer">${label}</a>`;
    })
    .replace(/\*\*([^*]+)\*\*/g, "<strong>$1</strong>")
    .replace(/(^|[\s(])\*([^*\n]+)\*/g, "$1<em>$2</em>");

  out = out.replace(/\u0000(\d+)\u0000/g, (_, i) => `<code>${escapeHtml(codes[Number(i)])}</code>`);
  return out;
}

function codeBlock(lang, lines) {
  const label = lang ? `<span class="badge">${escapeHtml(lang)}</span>` : "";
  return `<div class="codeBlock"><div class="cbHead">${label}<span>程式碼</span></div>`
    + `<pre><code>${escapeHtml(lines.join("\n"))}</code></pre></div>`;
}

function tableBlock(header, rows) {
  const th = header.map((c) => `<th>${inline(c.trim())}</th>`).join("");
  const body = rows
    .map((r) => `<tr>${r.map((c) => `<td>${inline(c.trim())}</td>`).join("")}</tr>`)
    .join("");
  return `<table><thead><tr>${th}</tr></thead><tbody>${body}</tbody></table>`;
}

export function renderMarkdown(src) {
  const lines = String(src ?? "").replace(/\r\n/g, "\n").split("\n");
  const out = [];
  let i = 0;

  while (i < lines.length) {
    const line = lines[i];

    // 圍欄程式碼
    const fence = /^```(\w*)\s*$/.exec(line);
    if (fence) {
      const lang = fence[1];
      const body = [];
      i += 1;
      while (i < lines.length && !/^```\s*$/.test(lines[i])) body.push(lines[i++]);
      i += 1;
      out.push(codeBlock(lang, body));
      continue;
    }

    if (/^\s*$/.test(line)) { i += 1; continue; }

    // 標題
    const h = /^(#{1,6})\s+(.*)$/.exec(line);
    if (h) {
      const level = h[1].length;
      out.push(`<h${level}>${inline(h[2])}</h${level}>`);
      i += 1;
      continue;
    }

    // 分隔線
    if (/^\s*([-*_])\1{2,}\s*$/.test(line)) { out.push("<hr>"); i += 1; continue; }

    // 引用
    if (/^\s*>\s?/.test(line)) {
      const body = [];
      while (i < lines.length && /^\s*>\s?/.test(lines[i])) {
        body.push(lines[i].replace(/^\s*>\s?/, ""));
        i += 1;
      }
      out.push(`<blockquote>${inline(body.join(" "))}</blockquote>`);
      continue;
    }

    // 表格（| a | b |  +  |---|---|）
    if (/^\s*\|/.test(line) && i + 1 < lines.length && /^\s*\|[\s:|-]+\|?\s*$/.test(lines[i + 1])) {
      const split = (l) => l.replace(/^\s*\|/, "").replace(/\|\s*$/, "").split("|");
      const header = split(line);
      i += 2;
      const rows = [];
      while (i < lines.length && /^\s*\|/.test(lines[i])) rows.push(split(lines[i++]));
      out.push(tableBlock(header, rows));
      continue;
    }

    // 清單
    const ul = /^\s*[-*+]\s+/;
    const ol = /^\s*\d+[.)]\s+/;
    if (ul.test(line) || ol.test(line)) {
      const ordered = ol.test(line);
      const marker = ordered ? ol : ul;
      const items = [];
      while (i < lines.length && marker.test(lines[i])) {
        let text = lines[i].replace(marker, "");
        i += 1;
        // 續行：縮排 2 空白以上、且不是新的清單項目
        while (i < lines.length && /^\s{2,}\S/.test(lines[i])
               && !marker.test(lines[i]) && !/^\s*$/.test(lines[i])) {
          text += " " + lines[i].trim();
          i += 1;
        }
        items.push(text);
      }
      const tag = ordered ? "ol" : "ul";
      out.push(`<${tag}>${items.map((t) => `<li>${inline(t)}</li>`).join("")}</${tag}>`);
      continue;
    }

    // 段落
    const para = [];
    while (i < lines.length && !/^\s*$/.test(lines[i])
           && !/^```/.test(lines[i]) && !/^#{1,6}\s/.test(lines[i])
           && !/^\s*[-*+]\s+/.test(lines[i]) && !/^\s*\d+[.)]\s+/.test(lines[i])
           && !/^\s*>\s?/.test(lines[i]) && !/^\s*\|/.test(lines[i])) {
      para.push(lines[i]);
      i += 1;
    }
    if (para.length) out.push(`<p>${inline(para.join(" "))}</p>`);
    else i += 1;
  }

  return out.join("\n");
}

export { escapeHtml };
