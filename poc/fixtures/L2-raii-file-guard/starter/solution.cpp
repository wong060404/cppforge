#include "solution.hpp"

// ─────────────────────────────────────────────────────────────
// 你的任務：把下面四個函式補完，讓所有測試通過。
//
// 提示（先自己想，卡住再看）：
//   1. 建構函式用初始化列表開啟檔案；開不起來就 throw
//   2. 解構函式裡如果 fp_ 不是 nullptr 就 fclose
//   3. write 要先檢查檔案是否還開著
//   4. 關閉後把 fp_ 設回 nullptr，否則會重複 fclose（未定義行為）
// ─────────────────────────────────────────────────────────────

FileGuard::FileGuard(const std::string& path, const char* mode) {
  (void)path;
  (void)mode;
  fp_ = nullptr;  // TODO: 真的開啟檔案
}

FileGuard::~FileGuard() {
  // TODO: 釋放資源
}

void FileGuard::write(const std::string& text) {
  (void)text;  // TODO: 寫入並 flush
}

bool FileGuard::is_open() const {
  return fp_ != nullptr;
}
