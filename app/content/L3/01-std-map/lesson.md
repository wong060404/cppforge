# std::map：查表、迭代、以及 operator[] 的陷阱

`std::map<Key, Value>` 是「有序的鍵值表」。它底層通常是平衡二元樹（紅黑樹），所以：

- 查詢、插入、刪除都是 **O(log n)**
- 走訪時**依 key 排序**，不是插入順序

## 三種「查」的方式，三種行為

```cpp
std::map<std::string, int> m{{"a", 1}};

int x = m["zzz"];        // ⚠ 插入 "zzz" -> 0，m 變成 2 個元素
int y = m.at("zzz");     // 丟 std::out_of_range
auto it = m.find("zzz"); // 回傳 m.end()（不插入、不拋例外）
```

| 寫法 | key 不存在時 | 能用在 const map 上 |
|---|---|---|
| `m[k]` | **插入預設值** | 不行 |
| `m.at(k)` | 丟例外 | 可以 |
| `m.find(k)` | 回傳 `end()` | 可以 |

**只想查就用 `find` 或 `at`。** `operator[]` 是「我要寫入或累加」的語法糖 —— 它同時代表「如果沒有就建立」。

這個陷阱的代價很具體：你在一個百萬筆的 map 上跑一千次「查詢」，最後 map 多了一千筆垃圾，`size()` 悄悄變大，而程式看起來完全正常。

## insert 不覆蓋

```cpp
m.insert({"a", 9});    // "a" 已存在 → 維持 1，不會變成 9
m["a"] = 9;            // 這才是覆蓋
m["a"] += 1;           // 這是累加
```

`insert` 的語意是「**如果沒有，才加入**」；它回傳的 `pair<iterator, bool>` 裡的 `bool` 就是「有沒有真的加入」。用 `insert` 來計數（`m.insert({word, 1})`）是典型錯誤：第一次有效，之後全部無效。

## 迭代與結構化綁定

```cpp
for (const auto& [key, value] : m) {   // C++17 結構化綁定
  ...
}
```

走訪 `map` 時 **key 是 `const`**（不能改，改了會破壞排序），value 可以改。若真的需要改 key，只能 erase + insert。

## 「最多」的取法：靠排序省一次比較

```cpp
std::string best;
int bestCount = -1;
for (const auto& [k, v] : m) {
  if (v > bestCount) { bestCount = v; best = k; }
}
```

用**嚴格大於**（`>`）而不是 `>=`，因為 map 已經依 key 排序，
所以「並列時取字典序最小」是免費的 —— 第一個遇到的就會留下來。

這是一個小但真實的技巧：**利用容器的既有順序，可以省掉額外的比較**。

## 你要實作的部分

```cpp
int count_of(const std::map<std::string, int>& m, const std::string& word);
//   回傳次數；不存在回傳 0；不得插入新元素

void bump(std::map<std::string, int>& m, const std::string& word);
//   計數 +1；不存在則從 1 開始

std::vector<std::string> keys_in_order(const std::map<std::string, int>& m);
//   依 map 的順序回傳所有 key

std::string most_common(const std::map<std::string, int>& m);
//   次數最多的 key；空 map 回傳 ""；並列取字典序最小
```

起始碼三個地方漏了：`count_of` 用了 `count()`（只給 0/1）、`bump` 用了 `insert`（不會累加）、`keys_in_order` 收集了 value 而不是 key。

> `most_common()` 在起始碼裡是**對的**—— 它示範「利用 map 的 sort」這件事，
> 也是本節最重要的一行：`if (v > bestCount)`。
