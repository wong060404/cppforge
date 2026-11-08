# 介面修正：頁面不能滾動、看不到題目

> 版本 v0.1 · 使用者回報（附截圖）
> 兩個症狀，兩個不同的根因。

---

## 1. 症狀一：頁面不能滾動

### 看到的現象

中間欄的課文一路延伸到視窗底部就**被切掉**，沒有捲軸；
右邊的編輯器也延伸到畫面外，**評測結果面板完全看不到**。

### 根因（CSS，不是 JS）

```css
.layout {
  display: grid;
  grid-template-columns: 286px minmax(0, 1fr);   /* ← 只有欄，沒有列 */
  height: calc(100vh - 52px);
}
```

grid 的**隱含列是 `auto`**。`height` 雖然固定成視窗高度，但 `auto` 的列會讓子元素
依內容長高 —— 於是：

1. `.lesson` 的高度 = 內容高度（不是視窗高度）
2. 它的 `overflow-y: auto` **永遠不會觸發**（因為沒有「溢出」）
3. `body { overflow: hidden }` 把超出視窗的部分直接裁掉

同一個原因讓 `.codePane` 也被撐開：`grid-template-rows` 的 fr 分配的是「被撐高的高度」，
所以編輯器吃掉全部空間，結果面板被推到畫面外。

### 修法

```css
.layout {
  grid-template-rows: minmax(0, 1fr);   /* ① 明確約束列高 */
}
.workspace, .lesson, .codePane, .results {
  min-height: 0;                        /* ② grid 子元素預設 min-height:auto */
}
```

兩個關鍵點缺一不可：

- `minmax(0, 1fr)` 讓列可以**縮到比內容小**（`1fr` 單獨用時，最小值仍是 `auto`）
- `min-height: 0` 讓 grid item 願意被縮小 —— 這是 CSS grid 最常見的陷阱

---

## 2. 症狀二：看不到題目

### 兩個真正的原因

**(a) 介面檔（題目契約）根本沒有被渲染。**
`interface/*.hpp` 是不可修改的介面，也就是「要實作什麼」的規格。
但 `app.js` 只把它們的名字放進編輯器標籤，**內容從來沒有出現在畫面上**。

**(b) 題目文字埋在長課文的最後**，而課文又不能滾動（症狀一），於是等於看不到。

### 修法：每節開頭加一張「本節任務」卡

| 節點型態 | 任務卡內容 |
|---|---|
| 有 `interface/*.hpp` | 直接展開介面原始碼（附「唯讀」標記），可摺疊 |
| 有任務段落（`你要實作…` / `你要做的事` / `實作：…`） | 說明 + **「跳到題目 ↓」** 按鈕 |
| 都沒有（例如 L0.01） | 「直接修改右側程式碼，讓評測全部通過即可」＋列出會跑哪些 grader |

順手處理的一個坑：課文的任務標題有**六種寫法**
（`你要實作的部分`、`你要實作的三個函式`、`你要實作的 scope guard`、`你要做的事`、
`實作：讓輸出逐字相符`…），所以用「開頭關鍵詞」判斷，而不是硬列完整標題。

---

## 3. 怎麼驗證（我無法看畫面，所以用可執行的檢查）

### 新增 8 項 DOM 冒煙檢查（總數 40 → 48）

```
PASS  課文有「本節任務」卡
PASS  沒有介面檔時任務卡仍有說明文字
PASS  介面檔已渲染進任務卡（含唯讀標記）
PASS  任務卡有「跳到題目」按鈕（這一節有題目段落）
PASS  點「跳到題目」不會丟錯
PASS  版面：.layout 有約束列高（否則子元素撐開、無法滾動）
PASS  版面：.lesson 可縮到視窗內
PASS  版面：.workspace 可縮到視窗內
```

版面那四條是**守著關鍵宣告**的靜態檢查 —— headless 環境沒有版面引擎，
量不到「實際會不會滾動」，但至少能防止「有人把 `grid-template-rows` 刪掉」這種回歸。

### 有介面的節點真的測過

冷啟動時 L0 沒有任何介面檔，所以那條渲染路徑不會被執行到。
我臨時用參考解通過 L0.01 → L1.01，讓 app 載入 **L1.02（有 `tasks.hpp`）**，再跑冒煙：

```
PASS  介面檔已渲染進任務卡（含唯讀標記）
PASS  任務卡有「跳到題目」按鈕（這一節有題目段落）
```

驗完就把資料庫重置了。

---

## 4. 驗證結果

| 驗證 | 結果 |
|---|---|
| UI 冒煙（`--run`，真的執行 app.js） | **48/48** |
| 內容 CI（33 節 × 2 變體 + 22 圖鑑） | **33/33** |
| SRS / 圖鑑自檢 | 全過 |

---

## 5. 誠實的限制

**我沒有看到畫面。** 這個環境的瀏覽器起不來（named pipes 被沙箱擋住），
所以我只能：① 從 CSS 結構推理根因；② 用 DOM 模擬 + 靜態宣告檢查守住行為。

`grid-template-rows: minmax(0, 1fr)` 是 grid 子元素無法滾動的標準修法，
但**實際像素結果需要你重新整理頁面確認**。若還有殘留問題，請告訴我是
「完全不能滾」還是「能滾但內容被切」，這會指向不同的原因。

---

## 6. 補記：「跳到題目」沒反應（使用者第二次回報）

### 根因：NodeList 沒有 `.find()`

```js
// ❌ 真實瀏覽器：TypeError: ...find is not a function → click handler 一進去就炸
const target = box.querySelectorAll("h2").find((h) => h.id === "taskSection");
```

`querySelectorAll` 在瀏覽器回傳 **NodeList**（有 `length`／`item`／`forEach`／迭代器），
**沒有** `find`／`map`／`filter`。所以按鈕完全沒反應。

**為什麼測試沒抓到？** DOM shim 的 `querySelectorAll` 回傳的是**陣列**（有 `.find`）——
shim 比瀏覽器寬鬆，就把這個 bug 藏起來了。

### 修法一：app.js 不再對 NodeList 用陣列方法

```js
let taskHeading = null;
for (const h of [...box.querySelectorAll("h2"), ...box.querySelectorAll("h3")]) {
  if (TASK_HEADING_TEXT.test((h.textContent ?? "").trim())) { h.id = "taskSection"; taskHeading = h; break; }
}
jump.addEventListener("click", () => {
  if (!taskHeading) return;
  if (typeof taskHeading.scrollIntoView === "function") taskHeading.scrollIntoView({ block: "start", behavior: "smooth" });
  else box.scrollTop = taskHeading.offsetTop ?? 0;
});
```

順便把搜尋範圍從「只有 h2」擴大到 h2 + h3（任務段落可能是 `###`）。

### 修法二：shim 改成**忠實的 NodeList**

```js
class NodeList {
  constructor(items) { this._items = items; this.length = items.length; }
  item(i) { return this._items[i] ?? null; }
  forEach(fn, thisArg) { this._items.forEach(fn, thisArg); }
  *[Symbol.iterator]() { yield* this._items; }   // 沒有 find / map / filter
}
```

改完之後**同一個 bug 立刻被測試抓到**：

```
TypeError: lesson.querySelectorAll(...).filter is not a function
```

這才是重點：測試工具比瀏覽器寬鬆，等於在測一個不存在的執行環境。

### 修法三：補上缺的任務段落（審計 33 節的結果）

| 節點 | 問題 | 修法 |
|---|---|---|
| **L1.01** | 沒有介面檔，也**沒有任務段落**（只有散文描述） | 補 `## 你要做的事`（把契約寫成三條步驟） |
| **L0.03** | 有介面檔，但標題是「## 這個節點的設計」 | 改名為 `## 你要做的事` |

### 永久防線：內容 lint 新增一條規則

```
XX: 課文缺少任務段落（建議「## 你要實作的部分」）——「跳到題目」會沒有目標
```

現在 33/33 都有任務段落；未來新增節點若忘記寫，內容 CI 直接擋下。

### 任務標題的實際寫法（8 種，都合法）

```
16× ## 你要實作的部分
 7× ## 你要實作的三個函式
 4× ## 你要做的事
 2× ## 你要實作的兩個函式
 1× ## 你要實作的函式 / 四個函式 / scope guard / 實作：讓輸出逐字相符
```

偵測規則是「**開頭關鍵詞**」：`你要實作…` / `你要做的事` / `實作：…`。
保留描述性標題（「三個函式」比「部分」有資訊量），而不是硬性統一成一句。

### 驗證

| 驗證 | 結果 |
|---|---|
| 任務指示審計 | 33/33 有任務段落，31/33 另有介面檔 |
| UI 冒煙（`--run`） | **48/48** |
| 有介面檔的節點（L1.02 實測） | 任務卡渲染介面 + 跳轉按鈕不再丟錯 ✅ |
| 內容 CI（33 節 + 22 圖鑑 + 新規則） | **33/33 全過** |
