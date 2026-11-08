#include "solution.hpp"

// 參考解（CI 用；學員端不可見）
// 這份檔案同時是「內容 CI」的基準：任何題目都要有它能全過所有 grader。

FileGuard::FileGuard(const std::string& path, const char* mode)
    : fp_(std::fopen(path.c_str(), mode)) {
  if (fp_ == nullptr) {
    throw std::runtime_error("FileGuard: cannot open " + path);
  }
}

FileGuard::~FileGuard() {
  if (fp_ != nullptr) {
    std::fclose(fp_);
    fp_ = nullptr;
  }
}

void FileGuard::write(const std::string& text) {
  if (fp_ == nullptr) {
    throw std::runtime_error("FileGuard: write on closed file");
  }
  if (std::fwrite(text.data(), 1, text.size(), fp_) != text.size()) {
    throw std::runtime_error("FileGuard: short write");
  }
  std::fflush(fp_);
}

bool FileGuard::is_open() const { return fp_ != nullptr; }
