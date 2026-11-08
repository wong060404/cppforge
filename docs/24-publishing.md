# 發佈到 GitHub

> 這份文件記錄 CppForge 如何上到 GitHub，以及在別台機器上怎麼跑起來。

---

## 0. 已發佈 ✅

**<https://github.com/wong060404/cppforge>**（public，預設分支 `main`）

| 項目 | 值 |
|---|---|
| 遠端 commit | `1bd2996`（與本機 HEAD 一致） |
| 遠端檔案數 | 305 |
| 內容 | 40 個節點、25 份文件、完整的伺服器／前端／lib |
| 已排除 | `app/.vendor/`（Monaco 27 MB）、`*.db`、`*.exe`、`*.o` |

驗證方式：用**未認證**的公開 API 比對推送結果（commit sha、檔案清單、
README 可讀取、`.vendor` 與產物確實不在遠端）。

### 怎麼推的（給未來參考）

這台機器的 `git push` 會被 Git Credential Manager 擋住 ——
GCM 需要 named pipe，而沙箱不允許（`sh.exe: couldn't create signal pipe`）。
繞法是**把憑證放進 URL**，這樣 git 就不會啟動 helper：

```powershell
git -c credential.helper= push "https://<user>:<token>@github.com/<user>/<repo>.git" main:main
```

> token 不會寫進 `.git/config`（remote 仍是乾淨網址），但會出現在指令列，
> 所以用完應立刻到 GitHub 撤銷。

---

## 1. Repo 準備過程（已完成）

| 項目 | 狀態 |
|---|---|
| Git repo | ✅ 已初始化（分支 `main`） |
| 提交 | 2 個：專案本体、發佈文件 |
| 追蹤的檔案大小 | 0.84 MB（`.git` 約 0.5 MB） |
| 脫敏 | ✅ 機器專屬路徑已換成 `<FORGE_HOME>` / `<TEMP>` / `<CS2310_DIR>` |
| 排除 | `app/.vendor/`（Monaco 27 MB 建置產物）、`node_modules/`、`*.db`、`*.exe`、`*.o`、暫存腳本 |
| 換行 | `.gitattributes` 統一 LF（`*.cmd` 用 CRLF） |

### 本機環境的兩個坑

1. **`git clone` 與需要認證的 `git` 操作會失敗** —— 它們會啟動 `sh.exe` 或
   Credential Manager，而兩者都需要 named pipe（沙箱阻擋）。
   公開 repo 的唯讀操作（`git ls-remote`）不受影響。
2. **`git push` 一定要把憑證放在 URL**（見上面 §0），否則會走 GCM 而失敗。

---

## 2. 之後要更新的話

repo 已存在，`origin` 也接好了，所以日常更新就是：

```powershell
cd cppforge
git add -A
git commit -m "你的訊息"
git push            # 在你自己的一般 PowerShell 視窗執行（GCM 有憑證）
```

> **注意**：在這台機器的受限環境（沙箱）裡 `git push` 會失敗，因為 GCM 需要
> named pipe。若要在那個環境推，必須用 §0 的「憑證放在 URL」寫法。

### 如果在別台機器重新開始

```powershell
git clone https://github.com/wong060404/cppforge.git
cd cppforge
node app/server/index.mjs
```

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
