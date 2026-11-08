#pragma once
// 學員不可修改這個介面檔，只能實作 solution.cpp。
#include <cstdio>
#include <stdexcept>
#include <string>

// 練習目標：用 RAII 包裝一個檔案資源。
// 要求：
//   1. 建構失敗（開不了檔）要丟例外，不能留下半開狀態
//   2. 解構時一定要關閉，包含「提早 return」與「拋例外離開 scope」兩條路徑
//   3. 禁止複製（檔案所有權唯一），複製行為請用 `= delete` 明確表達
//   4. write() 在已關閉時丟例外，而不是靜默失敗
class FileGuard {
 public:
  explicit FileGuard(const std::string& path, const char* mode = "w");
  ~FileGuard();

  FileGuard(const FileGuard&) = delete;
  FileGuard& operator=(const FileGuard&) = delete;

  void write(const std::string& text);
  bool is_open() const;

 private:
  std::FILE* fp_;
};
