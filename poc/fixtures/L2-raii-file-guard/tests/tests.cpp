// 隱藏測試（學員看不到這份檔案，這正是「自動批改」的價值）
#include "cf_test.hpp"
#include "solution.hpp"

#include <fstream>
#include <sstream>
#include <stdexcept>
#include <string>
#include <type_traits>

namespace {

constexpr const char* kPath = "cf_raii_test.txt";

std::string slurp(const std::string& path) {
  std::ifstream in(path, std::ios::binary);
  std::ostringstream ss;
  ss << in.rdbuf();
  return ss.str();
}

void remove_file(const char* p) { std::remove(p); }

}  // namespace

CF_TEST("開檔 → 寫入 → 內容可讀回") {
  remove_file(kPath);
  {
    FileGuard g(kPath);
    CF_EXPECT(g.is_open());
    g.write("hello raii");
  }
  CF_EXPECT_EQ(slurp(kPath), std::string("hello raii"));
}

CF_TEST("清除建構後 is_open() 為 true") {
  FileGuard g(kPath);
  CF_EXPECT_EQ(g.is_open(), true);
}

CF_TEST("開不了檔要丟例外（不能靜默失敗）") {
  CF_EXPECT_THROW(FileGuard("/no-such-dir-xyz/a.txt"), std::runtime_error);
}

CF_TEST("提早 return 也會關閉檔案") {
  remove_file(kPath);
  {
    FileGuard g(kPath);
    g.write("early");
  }  // 解構
  CF_EXPECT_EQ(slurp(kPath), std::string("early"));
}

CF_TEST("拋例外離開 scope 也會關閉檔案") {
  remove_file(kPath);
  try {
    FileGuard g(kPath);
    g.write("boom");
    throw std::runtime_error("simulated failure");
  } catch (const std::runtime_error&) {
    // 預期路徑
  }
  CF_EXPECT_EQ(slurp(kPath), std::string("boom"));
}

CF_TEST("禁止複製（所有權唯一）") {
  static_assert(!std::is_copy_constructible_v<FileGuard>, "FileGuard must not be copyable");
  static_assert(!std::is_copy_assignable_v<FileGuard>, "FileGuard must not be copy-assignable");
  CF_EXPECT(true);
}

CF_TEST("多次寫入會累積") {
  remove_file(kPath);
  {
    FileGuard g(kPath);
    g.write("a");
    g.write("b");
    g.write("c");
  }
  CF_EXPECT_EQ(slurp(kPath), std::string("abc"));
}

int main() { return cf::run_all(); }
