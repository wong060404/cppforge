#pragma once
// 這個介面不可修改：你只能實作它。
#include <string>
#include <vector>

// 把 a / b 的商與餘數寫進參考參數（b != 0 保證成立）
void divmod(int a, int b, int& quotient, int& remainder);

// 把 s 重複 times 次串起來；times <= 0 時回傳空字串
std::string repeat(const std::string& s, int times);

// 把 v 的每個元素就地乘以 factor
void scale_in_place(std::vector<int>& v, int factor);
