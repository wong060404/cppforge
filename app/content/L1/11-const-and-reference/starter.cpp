// 起始碼：唯讀的兩個函式是對的；就地修改的兩個各有一個錯。
// 提示：一個「改了但沒寫回」，一個「先覆蓋才想交換」。
#include "tasks.hpp"

std::size_t length_of(const std::string& s) {
  return s.size();
}

void add_bang(std::string& s) {
  std::string result = s;
  result.push_back('!');
  // 少了把 result 寫回 s
}

void swap_ints(int& a, int& b) {
  a = b;
  b = a;
}

long long total_of(const std::vector<int>& v) {
  long long sum = 0;
  for (int x : v) {
    sum += x;
  }
  return sum;
}
