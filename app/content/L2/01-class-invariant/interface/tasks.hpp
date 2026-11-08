#pragma once
// 這個介面不可修改：你只能實作它。
//
// 不變式（invariant）：任何時候都必須滿足 0 <= value_ <= max_

class Counter {
 public:
  // max_value <= 0 時丟 std::invalid_argument
  explicit Counter(int max_value);

  // 增加 1；已達上限則維持在上限（不丟例外，滿了是合法狀態）
  void increment();

  // 增加 n；n < 0 丟 std::invalid_argument；結果超過上限則夾到上限
  void add(int n);

  int value() const;
  int max_value() const;
  bool is_full() const;

 private:
  int value_ = 0;
  int max_ = 0;
};
