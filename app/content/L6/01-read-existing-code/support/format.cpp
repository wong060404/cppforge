#include "format.hpp"

#include <cmath>
#include <iomanip>
#include <locale>
#include <sstream>

namespace fmt {

std::string fixed(double value, int decimals) {
  std::ostringstream os;
  os.imbue(std::locale::classic());   // 不要讓使用者的地區設定影響小數點
  os << std::fixed << std::setprecision(decimals) << value;
  return os.str();
}

std::string percent(double ratio) {
  return fixed(ratio * 100.0, 1) + "%";
}

}  // namespace fmt
