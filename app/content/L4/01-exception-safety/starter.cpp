// 起始碼：三個地方漏了，而且各自會讓不同的測試失敗。
// 提示：解構時沒看「是否已取消」、移動建構子沒清空來源、移動賦值也沒清空來源。
#include "tasks.hpp"

#include <utility>

ScopeGuard::ScopeGuard(std::function<void()> action) noexcept
    : action_(std::move(action)), active_(true) {}

ScopeGuard::~ScopeGuard() noexcept {
  // 沒有檢查 active_ —— 呼叫 release() 之後還是會執行
  if (action_) {
    action_();
  }
}

ScopeGuard::ScopeGuard(ScopeGuard&& other) noexcept
    : action_(std::move(other.action_)), active_(other.active_) {
  // 少了 other.active_ = false → 兩個 guard 都會執行
}

ScopeGuard& ScopeGuard::operator=(ScopeGuard&& other) noexcept {
  if (this != &other) {
    action_ = std::move(other.action_);
    active_ = other.active_;
    // 這裡也少了 other.active_ = false
  }
  return *this;
}

void ScopeGuard::release() noexcept { active_ = false; }

bool ScopeGuard::active() const noexcept { return active_; }

ScopeGuard make_guard(std::function<void()> action) {
  return ScopeGuard(std::move(action));
}
