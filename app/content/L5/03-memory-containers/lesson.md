# 記憶體與容器選擇

`push_back` 看起來是「加一個元素」，但它背後可能是**配置新記憶體 + 搬移全部元素**。
這一節講三件事：什麼時候會發生、怎麼避免、以及為什麼「選對容器」比「微調程式碼」有效。

## `push_back` 的真實成本

```
容量 1 → push（重新配置到 2，搬 1 個）
容量 2 → push（重新配置到 4，搬 2 個）
容量 4 → push（重新配置到 8，搬 4 個）
...
```

n 次 push 的總搬移量約 n（等比級數）→ **攤銷 O(1)**。
但如果**你早就知道大小**，這些搬移全是浪費：

```cpp
std::vector<long long> out;
out.reserve(n);          // ← 一次配置好
for (std::size_t i = 0; i < n; ++i) out.push_back(...);   // 不再重新配置
```

## `reserve` vs `resize`

| | 改變個數？ | 元素狀態 |
|---|---|---|
| `reserve(n)` | ❌ 只改容量 | 沒有元素（要自己 push） |
| `resize(n)` | ✅ 改成 n 個 | 新增的是預設值（0 / 空字串） |

「先配置、再填值」用 `reserve`；「直接要 n 個元素」用 `resize`。

## 就地修改 vs 回傳新容器

```cpp
void sort_in_place(std::vector<int>& v);                  // 就地：省一次配置
std::vector<int> evens(const std::vector<int>& v);        // 新容器：輸入是 const
```

介面簽章就決定了語意：`&` 表示「我要改你的」，`const&` + 回傳值表示「我給你新的」。
**不要兩者混用** —— 「回傳新容器但其實也改了輸入」是最糟的介面。

## 為什麼不要 `std::list`

`std::list` 的每個節點都是獨立配置，走訪時：

- 每次跳轉都是**隨機記憶體存取**（cache miss）
- 每個節點多兩個指標（前後各 8 bytes）

現代 CPU 的記憶體階層讓「連續記憶體」快得多。實測上，除了「大量在中間插入/刪除且不走訪」
之外，`vector` 幾乎總是更快 —— 常常快 5 到 10 倍。

> 規則：**預設用 `vector`**。需要有序的去重集合用 `set`；需要 O(1) 查找用
> `unordered_map`；`list` 幾乎不該出現在應用程式碼裡。

## 也不要手動 `new`

```cpp
int* p = new int[n];   // ❌ 誰釋放？例外時怎麼辦？
std::vector<int> v(n); // ✅
```

L2.02/L2.03 已經講過為什麼。這裡再強調一次的原因：**`new` 是唯一能讓你在
「沒有寫錯任何一行」的情況下洩漏記憶體的東西**。

## 你要實作的部分

```cpp
std::vector<long long> squares(std::size_t n);      // 0², 1², ..., (n-1)²；必須 reserve
std::vector<int> evens(const std::vector<int>& v);   // 保持順序；必須 reserve
void sort_in_place(std::vector<int>& v);             // 由小到大，就地
```

起始碼三個地方不合格：`squares` 沒有 `reserve`、`evens` 的 condition 寫成奇數、
`sort_in_place` 排成由大到小。

> 本節的靜態規則會檢查：有沒有用 `reserve`（必須）、有沒有用 `std::list`（禁止）、
> 有沒有手動 `new`/`delete`（禁止）。
