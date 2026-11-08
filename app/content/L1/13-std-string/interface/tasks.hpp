#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <string>
#include <vector>

// 用 sep 連接 parts；空 vector 回傳空字串
std::string join(const std::vector<std::string>& parts, const std::string& sep);

// 計算 c 在 s 中出現的次數（大小寫敏感）
std::size_t count_char(const std::string& s, char c);

// 移除前後的空白/Tab/換行；全是空白時回傳空字串
std::string trim(const std::string& s);
