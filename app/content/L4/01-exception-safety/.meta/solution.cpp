// 參考解（內容 CI 用；學員端不可見）
#include "tasks.hpp"

#include <utility>

ScopeGuard::ScopeGuard(std::function<void()> action) noexcept
    : action_(std::move(action)), active_(true) {}

ScopeGuard::~ScopeGuard() noexcept {
  // ① 只有仍作用中才執行；② 執行前先關掉，避免 action 內又觸發自己
  if (active_ && action_) {
    active_ = false;
    try {
      action_();
    } catch (...) {
      // 解構函式不能讓例外逃出去
    }
  }
}

ScopeGuard::ScopeGuard(ScopeGuard&& other) noexcept
    : action_(std::move(other.action_)), active_(other.active_) {
  other.active_ = false;   // 來源交棒後必須變成非作用中
}

ScopeGuard& ScopeGuard::operator=(ScopeGuard&& other) noexcept {
  if (this != &other) {
    action_ = std::move(other.action_);
    active_ = other.active_;
    other.active_ = false;
  }
  return *this;
}

void ScopeGuard::release() noexcept { active_ = false; }

bool ScopeGuard::active() const noexcept { return active_; }

ScopeGuard make_guard(std::function<void()> action) {
  return ScopeGuard(std::move(action));
}
