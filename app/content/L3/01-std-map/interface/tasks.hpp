#pragma once
// 這個介面不可修改：你只能實作它。
#include <map>
#include <string>
#include <vector>

// 回傳 word 的出現次數；不存在時回傳 0
// 注意：不可以插入新元素（參數是 const）
int count_of(const std::map<std::string, int>& m, const std::string& word);

// 把 word 的計數 +1；若不存在則從 1 開始
void bump(std::map<std::string, int>& m, const std::string& word);

// 依 map 的順序（= key 的字典序）回傳所有 key
std::vector<std::string> keys_in_order(const std::map<std::string, int>& m);

// 回傳出現次數最多的 key；空 map 回傳空字串；並列時取字典序最小者
std::string most_common(const std::map<std::string, int>& m);
