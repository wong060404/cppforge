#include "solution.hpp"

#include <cstdio>
#include <cstring>
#include <stdexcept>

// 故意違規的實作（CI 用），用來證明評測器抓得到壞味道：
//   1. 裸 new 配置緩衝區 → 觸發 staticRules 的 no-raw-new
//   2. 忘記 delete → 觸發 leak_check 的洩漏偵測
//   3. 例外路徑沒有關檔 → 觸發 RAII 測試
// 內容 CI 的規則：這份必須「被擋下來」，否則代表評測器失效。

FileGuard::FileGuard(const std::string& path, const char* mode) : fp_(nullptr) {
  char* buf = new char[64];  // 違規
  std::snprintf(buf, 64, "%s", path.c_str());
  fp_ = std::fopen(buf, mode);
  if (fp_ == nullptr) {
    throw std::runtime_error("open failed");
  }
  // buf 沒有 delete → 洩漏
}

FileGuard::~FileGuard() {
  // 故意忘記 fclose
}

void FileGuard::write(const std::string& text) {
  if (fp_ == nullptr) return;
  std::fwrite(text.data(), 1, text.size(), fp_);
}

bool FileGuard::is_open() const { return fp_ != nullptr; }
