// 支援檔案：模擬「隊友已經寫好的模組」。
// 這個檔案會一起被編譯與連結，但學員不需要（也不應該）修改它。
#include "tasks.hpp"

int rect_area(int w, int h) {
  return w * h;
}

int rect_perimeter(int w, int h) {
  return 2 * (w + h);
}
