// CppForge: 記憶體洩漏檢查（獨立翻譯單元，連結進測試程式）
//
// 為什麼需要它：Windows 上的 MinGW **不支援** ASan/UBSan/TSan
// （實測 ld 找不到 -lasan / -lubsan / -ltsan），而「忘記釋放」是本課程
// L2/L3 最常見的錯誤。這裡用標準 C++ 攔截全域 operator new/delete 補上。
//
// 為什麼是 .cpp 而不是 header：
//   operator new 是替換函式（replacement function），若用 `-include` 塞進每個
//   TU 會產生 multiple definition；必須全程式只有一份定義。
//
// 用法：g++ tests.cpp submission.cpp leak_check.cpp -o tests.exe
// 退出碼：發現洩漏時回 86（評測器據此判失敗）
//
// 已知限制（課程裡要誠實說明）：
//   - 抓不到「寫出邊界」與 use-after-free 的內容損毀，只能抓「忘了釋放」
//   - 抓不到 C 的 malloc/free（若需覆蓋，另加 interposition）
//   - 記錄表固定容量（8192 塊），超過就不再追蹤

#include <cstdio>
#include <cstdlib>
#include <new>

namespace {

struct alloc_record {
  void* ptr;
  std::size_t size;
};

constexpr std::size_t kMaxRecords = 8192;

alloc_record* table() {
  static alloc_record* t =
      static_cast<alloc_record*>(std::calloc(kMaxRecords, sizeof(alloc_record)));
  return t;
}

std::size_t& live_count() {
  static std::size_t n = 0;
  return n;
}

bool& reported() {
  static bool r = false;
  return r;
}

std::size_t& double_free_count() {
  static std::size_t n = 0;
  return n;
}

void record_alloc(void* p, std::size_t n) {
  if (p == nullptr) return;
  auto* t = table();
  auto& c = live_count();
  if (c < kMaxRecords) {
    t[c].ptr = p;
    t[c].size = n;
    ++c;
  }
}

void record_free(void* p) {
  if (p == nullptr) return;
  auto* t = table();
  auto& c = live_count();
  for (std::size_t i = 0; i < c; ++i) {
    if (t[i].ptr == p) {
      t[i] = t[c - 1];
      --c;
      return;
    }
  }
  // 未登記的指標 = double free（或跨模組配置）。
  // 這裡刻意「不」呼叫 free()：呼叫了就是未定義行為，會讓整個測試程式崩潰，
  // 反而看不到真正的原因。記錄下來，讓評測器回報就好。
  ++double_free_count();
  std::fprintf(stderr, "LEAKCHECK: double free of %p (ignored)\n", p);
}

bool is_tracked(void* p) {
  if (p == nullptr) return false;
  auto* t = table();
  const auto c = live_count();
  for (std::size_t i = 0; i < c; ++i) {
    if (t[i].ptr == p) return true;
  }
  return false;
}

void report() {
  if (reported()) return;
  reported() = true;
  auto* t = table();
  auto& c = live_count();
  const std::size_t doubles = double_free_count();

  if (c == 0 && doubles == 0) {
    std::fprintf(stderr, "LEAKCHECK: clean (0 leaked blocks)\n");
    std::fflush(stderr);
    return;
  }
  if (doubles > 0) {
    std::fprintf(stderr, "LEAKCHECK: %zu double free(s)\n", doubles);
  }
  if (c > 0) {
    std::size_t bytes = 0;
    for (std::size_t i = 0; i < c; ++i) bytes += t[i].size;
    std::fprintf(stderr, "LEAKCHECK: %zu leaked block(s), %zu byte(s)\n", c, bytes);
    for (std::size_t i = 0; i < c && i < 16; ++i) {
      std::fprintf(stderr, "  leaked %p  %zu bytes\n", t[i].ptr, t[i].size);
    }
  }
  std::fflush(stderr);
  std::_Exit(86);  // 不走正常 exit，避免與其他 atexit 互相干擾
}

struct reporter {
  ~reporter() { report(); }
};

reporter g_reporter;

}  // namespace

// ── 全域替換 ──────────────────────────────────────────────────────
void* operator new(std::size_t n) {
  void* p = std::malloc(n ? n : 1);
  if (p == nullptr) throw std::bad_alloc();
  record_alloc(p, n);
  return p;
}

void* operator new[](std::size_t n) {
  void* p = std::malloc(n ? n : 1);
  if (p == nullptr) throw std::bad_alloc();
  record_alloc(p, n);
  return p;
}

void* operator new(std::size_t n, const std::nothrow_t&) noexcept {
  void* p = std::malloc(n ? n : 1);
  record_alloc(p, n);
  return p;
}

void* operator new[](std::size_t n, const std::nothrow_t&) noexcept {
  void* p = std::malloc(n ? n : 1);
  record_alloc(p, n);
  return p;
}

// 統一的釋放流程：先確認這塊記憶體是我們配置的。
// 若不是（= double free），只記錄、不呼叫 free()，避免未定義行為把整個測試炸掉。
void release(void* p) noexcept {
  const bool tracked = is_tracked(p);
  record_free(p);
  if (tracked) {
    std::free(p);
  }
}

void operator delete(void* p) noexcept { release(p); }

void operator delete[](void* p) noexcept { release(p); }

void operator delete(void* p, std::size_t) noexcept { release(p); }

void operator delete[](void* p, std::size_t) noexcept { release(p); }

void operator delete(void* p, const std::nothrow_t&) noexcept { release(p); }

void operator delete[](void* p, const std::nothrow_t&) noexcept { release(p); }
