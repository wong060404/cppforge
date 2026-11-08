# 發佈到 GitHub

> 這份文件說明怎麼把 CppForge 推上 GitHub，以及在別台機器上怎麼跑起來。

---

## 1. 目前狀態（本機已完成的部分）

| 項目 | 狀態 |
|---|---|
| Git repo | ✅ 已初始化（分支 `main`） |
| 初始提交 | ✅ `CppForge：從零到職場級的 C++ 訓練系統`（304 個檔案 / 23,933 行） |
| 追蹤的檔案大小 | 0.84 MB（`.git` 0.5 MB） |
| 脫敏 | ✅ 機器專屬路徑已換成 `<FORGE_HOME>` / `<TEMP>` |
| 排除 | `app/.vendor/`（Monaco 27 MB 建置產物）、`node_modules/`、`*.db`、`*.exe`、`*.o`、暫存腳本 |
| 換行 | `.gitattributes` 統一 LF（`*.cmd` 用 CRLF） |

**還沒做的**：建立 GitHub 上的遠端 repo、`git push`。
原因：這台機器沒有 `gh` CLI、沒有 `GITHUB_TOKEN`、沒有 SSH key，
而且 PowerShell 的 HTTPS 是壞的（schannel 憑證問題），無法互動式登入。

---

## 2. 你要做的三步

### 步驟 1：在 GitHub 建一個空 repo

到 <https://github.com/new>：

- **Repository name**：`cppforge`（或你喜歡的名字）
- **Visibility**：Public 或 Private（都可以）
- **不要**勾 "Add a README file"、不要加 .gitignore、不要加 license
  （本機已經有內容了，遠端必須是空的）

### 步驟 2：接上遠端並推送

在 `cppforge/` 目錄下：

```powershell
git remote add origin https://github.com/<你的帳號>/cppforge.git
git push -u origin main
```

第一次 push 會跳出視窗要求登入（Git Credential Manager）。
登入後憑證會存在 Windows 認證管理員，之後不必再輸入。

> 如果你已經登入過 GitHub Desktop 或 VS Code，GCM 可能已經有憑證，
> 這一步會直接成功。

### 步驟 3（可選）：確認推上去的內容

```powershell
git log --oneline          # 應該看到一個 commit
git ls-tree -r --name-only HEAD | Measure-Object -Line   # 304 行
```

到 GitHub 網頁上確認 `README.md` 有正常顯示（含表格與程式碼區塊）。

---

## 3. 在別台機器上跑起來

```powershell
git clone https://github.com/<你的帳號>/cppforge.git
cd cppforge
node app/server/index.mjs          # 需要 Node.js 24+
```

開啟 <http://127.0.0.1:4173>，然後點 **「環境檢查」→「安裝工具鏈」**（65 MB，一次）。

### 編輯器（可選）

`app/.vendor/` 是 Monaco 的建置產物（27 MB），刻意不進版控。
沒有它也能用 —— 會自動退回純文字編輯器。要拿回 Monaco：

```powershell
cd app/.vendor
npm install        # 依 package.json 安裝 monaco-editor@0.57
```

---

## 4. 這個 repo 裡有什麼（給第一次看的人）

| 路徑 | 內容 |
|---|---|
| `app/content/**` | 40 節課，每節一個資料夾（`node.json` / `lesson.md` / `starter.cpp` / `tests.cpp` / `interface/` / `.meta/solution.cpp`） |
| `app/server/` | HTTP 服務、評分引擎、內容載入、錯誤圖鑑、SRS 排程、doctor |
| `app/web/` | 三欄介面（原生 ES modules，零框架） |
| `app/test/` | UI 冒煙測試（含自製 DOM shim）、SRS、圖鑑自檢 |
| `lib/` | 沙箱（Win32 Job Object）、洩漏檢查、測試框架 `cf_test.hpp`、路徑解析 |
| `poc/` | 早期技術驗證的腳本與量測報告（可獨立執行） |
| `docs/` | 24 份設計與驗證文件（框架、POC 報告、每個里程碑、概念對照、驗收清單） |

---

## 5. 建議（不影響發佈）

- **加 LICENSE**：目前沒有授權檔，等於「保留所有權利」。若要公開讓別人用，
  建議加 `MIT`（最寬鬆）或 `GPL-3.0`。這是你的決定，我沒有預設。
- **加 CI**：GitHub Actions 上跑 `node app/server/verify-content.mjs` 即可
  （需要先安裝工具鏈，或只跑 lint 部分）。
- **加截圖**：README 若能放一張介面截圖，說服力會高很多 ——
  但我在這個環境無法開瀏覽器截圖，需要你補。
