// CppForge: 極簡測試框架（單檔、零依賴、輸出格式穩定可解析）
//
// 為什麼不直接用 Catch2 / doctest：
//   1. 內容要在「離線、免安裝」的前提下可驗證，多一個第三方標頭就多一個風險；
//   2. 批改器要能穩定解析結果（TESTS: N passed, M failed）；
//   3. 這個標頭同時是教材 —— 學員會讀它，200 行比 2 萬行更適合當第一份測試框架。
//
// 設計重點：失敗訊息要**看得見實際值**。
//   如果型別有 operator<<（或它是數字/enum），失敗時會印出兩邊的值：
//     tests.cpp:19  a.y() == 6 不成立（實際 4，期望 6）
//   沒有 operator<< 的型別（例如 std::vector）則退回只印條件字串。
//   這就是 L2.05「運算子重載」那節的複利 —— 型別自己決定怎麼被印出來。
//
// 用法：
//   #include "cf_test.hpp"
//   CF_TEST("說明") { CF_EXPECT_EQ(1 + 1, 2); }
//   CF_EXPECT_NEAR(0.1 + 0.2, 0.3, 1e-9);
//   int main() { return cf::run_all(); }
//
// 輸出（批改器靠這行判分）：
//   TESTS: <passed> passed, <failed> failed

#ifndef CPPFORGE_CF_TEST_HPP
#define CPPFORGE_CF_TEST_HPP

#include <cmath>
#include <cstdio>
#include <exception>
#include <ostream>
#include <sstream>
#include <string>
#include <type_traits>
#include <vector>

namespace cf {

struct test_case {
  const char* name;
  void (*fn)();
};

inline std::vector<test_case>& registry() {
  static std::vector<test_case> r;
  return r;
}

// 每個測試的失敗訊息先緩衝，等測試跑完再一起印（輸出才好讀、好解析）
inline std::vector<std::string>& current_failures() {
  static std::vector<std::string> v;
  return v;
}

struct registrar {
  registrar(const char* name, void (*fn)()) { registry().push_back({name, fn}); }
};

// 只顯示檔名，不顯示路徑（避免把使用者的暫存資料夾路徑洩漏到教學訊息裡）
inline const char* basename_of(const char* p) {
  const char* last = p;
  for (const char* s = p; *s; ++s) {
    if (*s == '/' || *s == '\\') last = s + 1;
  }
  return last;
}

// ── 把值變成可讀字串 ────────────────────────────────────────────────
// 這裡用到 C++20 的 concept：`os << v` 若能編譯，就代表這個型別可以印。
// 這是「用 requires 偵測介面」最標準的入門範例。
namespace detail {

template <class T>
concept streamable = requires(std::ostream& os, const T& v) { os << v; };

constexpr const char* kUnprintable = "<無法列印>";

template <class T>
inline std::string show_impl(const T& v) {
  if constexpr (std::is_enum_v<T>) {
    // enum class 不會自動轉成整數，但除錯時看到數值仍然有用
    return "enum(" + std::to_string(static_cast<long long>(v)) + ")";
  } else if constexpr (streamable<T>) {
    std::ostringstream os;
    os << v;
    return os.str();
  } else {
    return kUnprintable;
  }
}

}  // namespace detail

// bool 要印 true/false 而不是 1/0（ostream 預設是 1/0）
inline std::string show(bool v) { return v ? "true" : "false"; }

// 空指標直接解參考會炸，先擋掉
inline std::string show(const char* s) { return s ? std::string(s) : std::string("(null)"); }

template <class T>
inline std::string show(const T& v) {
  return detail::show_impl(v);
}

// ── 失敗訊息 ────────────────────────────────────────────────────────
inline std::string locate(const char* file, int line) {
  return std::string(basename_of(file)) + ":" + std::to_string(line);
}

inline void add_failure(const char* file, int line, const std::string& what) {
  current_failures().push_back(locate(file, line) + "  " + what);
}

template <class A, class B>
inline void add_eq_failure(const char* file, int line,
                           const char* a_expr, const char* b_expr,
                           const A& a, const B& b) {
  std::string msg = locate(file, line) + "  " + a_expr + " == " + b_expr + " 不成立";
  const std::string sa = show(a);
  const std::string sb = show(b);
  // 只有「至少一邊印得出來」才附加值，避免出現「實際 <無法列印>，期望 <無法列印>」的噪音
  if (sa != detail::kUnprintable || sb != detail::kUnprintable) {
    msg += "（實際 " + sa + "，期望 " + sb + "）";
  }
  current_failures().push_back(msg);
}

template <class A, class B>
inline void add_near_failure(const char* file, int line,
                             const char* a_expr, const char* b_expr, double eps,
                             const A& a, const B& b) {
  std::ostringstream os;
  os << "  兩者差距超過 " << eps << "（實際 " << show(a) << "，期望 " << show(b) << "）";
  current_failures().push_back(locate(file, line) + "  " + a_expr + " ≈ " + b_expr + os.str());
}

// ── 容器的比對 ──────────────────────────────────────────────────────
// 為什麼需要：std::vector 沒有 operator<<，所以 CF_EXPECT_EQ 失敗時
// 只能說「不相等」，學員看不到內容。這裡把容器攤開成 [a, b, c]。
//
// 注意：不能替 std::vector 加 operator<<（那要放進 namespace std，是未定義行為），
// 所以改用專門的巨集，而不是讓 CF_EXPECT_EQ 自動支援容器。
template <class C>
inline std::string dump_range(const C& c) {
  std::string out = "[";
  bool first = true;
  for (const auto& v : c) {
    if (!first) out += ", ";
    first = false;
    out += show(v);
  }
  out += "]";
  return out;
}

template <class C1, class C2>
inline void add_range_failure(const char* file, int line,
                              const char* a_expr, const char* b_expr,
                              const C1& a, const C2& b) {
  std::ostringstream os;
  os << "（實際 " << dump_range(a) << "，期望 " << dump_range(b) << "）";
  if (a.size() != b.size()) {
    os << "  元素個數也不同：" << a.size() << " vs " << b.size();
  }
  current_failures().push_back(locate(file, line) + "  " + a_expr + " == " + b_expr + os.str());
}

inline int run_all() {
  const int total = static_cast<int>(registry().size());
  int failed = 0;
  std::printf("RUN  %d test(s)\n", total);
  for (const auto& t : registry()) {
    current_failures().clear();
    try {
      t.fn();
    } catch (const std::exception& e) {
      add_failure("<exception>", 0, std::string("未捕捉的例外: ") + e.what());
    } catch (...) {
      add_failure("<exception>", 0, "未捕捉的未知例外");
    }
    if (current_failures().empty()) {
      std::printf("[ ok ] %s\n", t.name);
    } else {
      std::printf("[FAIL] %s\n", t.name);
      for (const auto& f : current_failures()) std::printf("       %s\n", f.c_str());
      ++failed;
    }
  }
  std::printf("TESTS: %d passed, %d failed\n", total - failed, failed);
  std::fflush(stdout);
  return failed == 0 ? 0 : 1;
}

}  // namespace cf

#define CF_CAT2(a, b) a##b
#define CF_CAT(a, b) CF_CAT2(a, b)
#define CF_TEST(name)                                                   \
  static void CF_CAT(cf_test_fn_, __LINE__)();                          \
  static ::cf::registrar CF_CAT(cf_test_reg_, __LINE__)(                \
      name, &CF_CAT(cf_test_fn_, __LINE__));                            \
  static void CF_CAT(cf_test_fn_, __LINE__)()

#define CF_EXPECT(cond)                                                 \
  do {                                                                  \
    if (!(cond)) ::cf::add_failure(__FILE__, __LINE__, "條件不成立: " #cond); \
  } while (0)

// 用 const& 綁定，避免對非可複製型別做多餘的複製（暫存物件會被延長壽命）
#define CF_EXPECT_EQ(actual, expected)                                  \
  do {                                                                  \
    const auto& cf_a = (actual);                                        \
    const auto& cf_e = (expected);                                      \
    if (!(cf_a == cf_e)) {                                              \
      ::cf::add_eq_failure(__FILE__, __LINE__, #actual, #expected, cf_a, cf_e); \
    }                                                                   \
  } while (0)

// 容器比對：失敗時把兩邊的元素都印出來。
// 比 == 更嚴格的用途是「順序也要對」—— 這正是測 map 走訪順序需要的。
#define CF_EXPECT_EQ_RANGE(actual, expected)                             \
  do {                                                                  \
    const auto& cf_a = (actual);                                        \
    const auto& cf_e = (expected);                                      \
    bool cf_same = (cf_a.size() == cf_e.size());                        \
    if (cf_same) {                                                      \
      auto cf_ia = cf_a.begin();                                        \
      auto cf_ie = cf_e.begin();                                        \
      for (; cf_ia != cf_a.end(); ++cf_ia, ++cf_ie) {                   \
        if (!(*cf_ia == *cf_ie)) { cf_same = false; break; }            \
      }                                                                 \
    }                                                                   \
    if (!cf_same) {                                                     \
      ::cf::add_range_failure(__FILE__, __LINE__, #actual, #expected, cf_a, cf_e); \
    }                                                                   \
  } while (0)

// 浮點數不要用 ==，用這個
#define CF_EXPECT_NEAR(actual, expected, eps)                           \
  do {                                                                  \
    const auto cf_a = (actual);                                         \
    const auto cf_e = (expected);                                       \
    if (!(std::fabs(static_cast<double>(cf_a) - static_cast<double>(cf_e)) <= (eps))) { \
      ::cf::add_near_failure(__FILE__, __LINE__, #actual, #expected,     \
                             static_cast<double>(eps), cf_a, cf_e);      \
    }                                                                   \
  } while (0)

#define CF_EXPECT_THROW(expr, ex_type)                                   \
  do {                                                                  \
    bool cf_threw = false;                                              \
    try { (void)(expr); } catch (const ex_type&) { cf_threw = true; }   \
    if (!cf_threw) {                                                    \
      ::cf::add_failure(__FILE__, __LINE__,                             \
                        std::string(#expr) + " 應該丟出 " + #ex_type + "，但沒有"); \
    }                                                                   \
  } while (0)

#endif  // CPPFORGE_CF_TEST_HPP
