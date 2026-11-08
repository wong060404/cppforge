# 移除關卡鎖定 + 進度與草稿不丟

> 要求：「不要把關卡上鎖…讓用戶自由訪問」「更新時不想刷新網頁後丟失原本的進度和我在每一關留下的 code」

---

## 1. 關卡鎖定：整個移除

| 位置 | 改前 | 改後 |
|---|---|---|
| `content.mjs` `courseTree` | `unlocked = 先修全通過` | **`unlocked: true`**（永遠可存取） |
| `content.mjs` `loadNode` | 同上 | **`unlocked: true`** |
| `index.mjs` `POST /run` | 先修未完成 → `403 NODE_LOCKED` | **不檢查**，任何一節都能評測 |
| `app.js` 側邊欄 | 未解鎖 → `disabled` + 🔒 + tooltip | **全部可點**，沒有鎖的樣式 |
| `app.js` 執行按鈕 / `Ctrl+Enter` | 受 `unlocked` 限制 | 只看「有沒有開節點」 |
| `app.js` 開場選節點 | 只挑解鎖的 | 回到上次那一節，否則第一個未通過的 |

**先修關係還在，但只剩提示用途**：API 改成 `suggestsFirst`（哪些先修你還沒通過），
側邊欄顯示「· 建議先看過」與 tooltip，**不影響能不能開或執行**。

```json
// GET /api/course 的節點
{
  "id": "L6.03",
  "unlocked": true,                       // 永遠 true
  "suggestsFirst": ["L6.02"],             // 只是建議
  "passed": false
}
```

### 連帶調整：複習卡改為「碰過才建卡」
原本 `syncContentCards()` 只為**已解鎖**的節點建卡（避免複習沒讀過的內容）。
現在全部解鎖，若照舊就會在第一次開啟時**一次產生 105 張到期卡** —— 複習變成清庫存。

改成只為「按過執行（attempts > 0）或已通過」的節點建卡：複習永遠是你真的練過的東西。

---

## 2. 進度與程式碼：為什麼以前會丟，現在不會

### 以前會丟的兩個真正原因

1. **資料庫放在 `%TEMP%`** —— 這個環境的 `%TEMP%` 會被換掉（實際發生過一次），
   目錄一換，`cppforge.db` 就整個消失。已改用 `CPPFORGE_DB` 指到穩定的位置。
2. **我每次重啟都刪 DB** —— 開發時為了乾淨狀態而 `Remove-Item cppforge.db`，
   等於把你的進度清空。這個做法已經停止。

### 現在的設計

```
進度 / 評測紀錄 / 複習排程  →  SQLite（CPPFORGE_DB，預設 %LOCALAPPDATA%\CppForge\cppforge.db）
每一節的程式碼草稿        →  ① localStorage（打字時零延遲）
                             ② SQLite 的 drafts 表（停止打字 1.2 秒後自動存）
上次停在哪一節            →  localStorage cppforge:lastNode
```

**為什麼草稿要存兩份**：localStorage 綁在「這個瀏覽器的這個 origin」——
清快取、換瀏覽器、或換了埠（origin 就變了）都會整批消失。
伺服器那份跟著進度走，換機器也還在。

**開啟節點時取哪一份**：兩份都讀，取較新的那份；只在本機有就用本機，
只在伺服器有就用伺服器，並回寫本機。按「還原」會同時清掉兩份（否則重新整理又會被舊草稿蓋回來）。

### 新的 API

```
POST /api/nodes/:id/draft   { code: string }  → { ok, savedAt }
GET  /api/nodes/:id                            → 多了 draft / draftAt
```

邊界處理與 `/run` 一致：`code` 非字串 → 400、超過 512 KB → 413、節點不存在 → 404。

---

## 3. 實測（不是推論）

| 驗證 | 結果 |
|---|---|
| 40 節 `unlocked` 全為 `true` | ✅ |
| 側邊欄 0 個 `disabled` 按鈕 | ✅ |
| **直接**開最後一節 `L6.03` 並執行（不經過前面任何一節） | ✅ 200，不再 403 |
| 在編輯器打字 → 1.2 秒後草稿進 DB | ✅ `draft` 長度正確 |
| **重啟伺服器後**：進度（8 節通過）還在 | ✅ |
| **重啟伺服器後**：L0.01 / L2.03 的草稿還在 | ✅ |
| 內容 CI（40 節 × 2 變體 + 22 圖鑑） | ✅ 全過 |
| API 審計 | ✅ 42/42 |
| 真實 DOM 審計（41 項，含自由存取與草稿） | ✅ 41/41 |
| UI 冒煙 / SRS / 圖鑑自檢 | ✅ 全過 |

> 真實 DOM 審計新增三項：沒有任何節點 disabled、可以直接開最後一節並執行、
> 編輯器內容會自動存到伺服器。

---

## 4. 更新程式時怎麼保住資料

更新只會換 `app/`、`docs/` 等程式碼；資料庫不在 repo 裡（`.data/` 已列入 `.gitignore`），
所以 `git pull` 不可能動到它。

如果你把資料放在專案內（`CPPFORGE_DB=<repo>/.data/cppforge.db`），備份就是複製那個檔案：

```powershell
Copy-Item .data\cppforge.db "$env:USERPROFILE\Desktop\cppforge-backup.db"
```

還原時把它放回去、重啟即可 —— `drafts` 與 `progress` 都在同一個檔案裡。

---

## 5. 注意：兩支審計測試會寫入真實資料

`app/test/audit-api.mjs` 與 `app/test/audit-dom.mjs` 都是「真的打 API」，
所以它們會**改到你的資料**：

| 測試 | 會做什麼 | 影響 |
|---|---|---|
| `audit-api.mjs` | 送幾次評測（空程式碼、語法錯誤） | `attempts` 增加、複習卡排程被動到 |
| `audit-dom.mjs` | 按「還原」、在編輯器打測試字串、送一次評測 | 該節草稿被清空／覆蓋、增加一次失敗紀錄 |

**想在不碰真實進度的情況下跑**，用一個暫存資料庫：

```powershell
$env:CPPFORGE_DB = "$env:TEMP\cppforge-audit.db"
node app/server/index.mjs          # 這個實例用的是乾淨的暫存 DB
node app/test/audit-api.mjs
```

`verify-content.mjs`、`srs.test.mjs`、`atlas.test.mjs` 不會動資料（前者的評測走暫存目錄）。

---

## 6. 這一輪刻意沒有做的事

- **沒有**保留「鎖」的開關（例如 `CPPFORGE_LOCK=1`）。如果你之後想要「老師模式」的強制順序，
  那是另一個功能，不是把鎖加回來就好：還要處理「已解鎖但被你跳過的節點」怎麼顯示。
- **沒有**把先修關係從內容裡拿掉 —— 它是排序與教學設計的依據，只是不再當門檻。
- **沒有**改複習的排程權重；只是換了「哪些節點會建卡」。
- **沒有**做「匯出／匯入進度」的 UI。目前備份就是複製那個 `.db` 檔（見 §4）。
