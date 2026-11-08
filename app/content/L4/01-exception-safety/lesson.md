# 例外安全：解構函式在錯誤路徑上也會跑

前 23 節裡，「不要洩漏」都是靠 RAII。這一節要問：**為什麼 RAII 在錯誤路徑上也成立？**

答案是 stack unwinding。

## Stack unwinding

```cpp
void work() {
  Resource r;            // 建構
  may_throw();           // 拋出例外
}                        // ← 例外離開 scope，r 的解構函式被呼叫
```

標準保證：例外離開 scope 時，**所有已完成建構的區域物件**都會依反向順序解構。
不只拋例外，`return`、`break`、`goto` 離開 scope 也一樣。

所以這兩種寫法不是「風格差異」，而是**正確性差異**：

```cpp
// ❌ 每個出口都要記得做一次，總有一天會漏
int f() {
  lock();
  if (bad) { unlock(); return -1; }
  if (worse) { unlock(); return -2; }
  unlock(); return 0;
}

// ✅ 只有一個地方負責清理
int f() {
  ScopeGuard g([] { unlock(); });
  if (bad) return -1;
  if (worse) return -2;
  return 0;
}
```

第二種寫法就算中間拋出例外、就算未來有人加了第三個 `return`，`unlock()` 都只會執行一次且不會漏。

## 解構函式不能拋例外

```cpp
{ Resource a; throw std::runtime_error("boom"); }
```

`a` 在 unwinding 期間解構。如果它又拋一個例外，就有**兩個例外同時在飛** ——
標準規定這會呼叫 `std::terminate`，程式直接結束。

所以解構函式隱含 `noexcept`（除非你明確寫 `noexcept(false)`，那幾乎永遠是錯的）。
實務規則：**解構函式裡的清理動作必須不拋例外**；若真的可能拋，就自己 `try { ... } catch (...) { }` 吞掉並記錄。

## 三種例外安全保證

| 保證 | 意思 | 例子 |
|---|---|---|
| **nothrow** | 絕不拋例外 | `~vector`、`swap`、解構函式 |
| **strong** | 失敗時物件回到操作前的狀態 | `vector::push_back`（配置失敗時原 vector 不變） |
| **basic** | 不洩漏、不破壞不變式，但狀態可能改變 | 多數容器的批量操作 |

實務上：**先做到 basic（不洩漏），再往 strong 努力**，而 `nothrow` 留給解構與 `swap`。

## 你要實作的 scope guard

```cpp
class ScopeGuard {
 public:
  explicit ScopeGuard(std::function<void()> action) noexcept;
  ~ScopeGuard() noexcept;          // 若仍作用中，執行 action
  void release() noexcept;         // 取消（之後不再執行）
  bool active() const noexcept;
  // 只能移動，不能複製
};

ScopeGuard make_guard(std::function<void()> action);   // 移動語意練習
```

起始碼三個地方漏了，而且各自會讓**不同的測試**失敗：

| 漏掉的地方 | 症狀 |
|---|---|
| 解構時不看旗標 | 呼叫 `release()` 之後，清理還是執行了 |
| move constructor 不清來源 | 同一段清理被執行**兩次** |
| move assignment 不清來源 | 被移走的 guard 仍然 `active() == true` |
