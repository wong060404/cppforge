// 起始碼：三個函式都「看起來對」，但都有一個型別相關的錯誤。
// 提示：先問每個 `/` 兩邊是什麼型別。
#include "tasks.hpp"

int int_average(int a, int b) {
  // 各自除以 2 再加起來：這樣會把兩邊的小數分別丟掉兩次
  return a / 2 + b / 2;
}

double real_average(int a, int b) {
  return (a + b) / 2;
}

int percent(int part, int whole) {
  return part / whole * 100;
}
