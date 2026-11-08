#pragma once
// 這個介面不可修改：你只能實作它。
#include <cstddef>
#include <string>
#include <vector>

// 回傳字串長度（不可複製整個字串）
std::size_t length_of(const std::string& s);

// 在字串尾端加上一個 '!'（必須改到呼叫者的變數）
void add_bang(std::string& s);

// 交換兩個整數（必須改到呼叫者的變數）
void swap_ints(int& a, int& b);

// 回傳所有元素的總和（不可複製 vector）
long long total_of(const std::vector<int>& v);
