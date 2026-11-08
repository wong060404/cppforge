// CppForge POC: 沙箱監管程式（sandbox.exe）
//
// 為什麼要自己寫一個 supervisor，而不是在 Node 裡計時：
//   Node 只能「等逾時然後 taskkill」，無法阻止：記憶體炸彈、fork 炸彈、
//   大量子行程、以及「殺父不死子」。Windows Job Object 是唯一可靠的機制，
//   而它需要 Win32 API —— 我們手上就有編譯器，直接編一個。
//
// 強制限制：
//   - CPU/牆鐘逾時（逾時則終止整個 job 樹）
//   - 行程記憶體上限（Job Object ProcessMemoryLimit）
//   - 行程數量上限（ActiveProcessLimit，防 fork 炸彈）
//   - 每行程使用者時間上限（防 CPU 燒機）
//   - UI 限制（禁用桌面/剪貼簿/關機）
//   - stdout/stderr 總量上限（防輸出洪水，讀取端丟棄多餘資料）
//   - KILL_ON_JOB_CLOSE：supervisor 一死，所有子行程跟著死
//
// 尚未涵蓋（誠實記錄，見 POC 報告）：
//   - 網路封鎖（需 WFP / 防火牆規則）
//   - 檔案系統寫入範圍（需低完整性權杖 + ACL）
//
// 用法：
//   sandbox.exe --exe <path> --timeout-ms 5000 --mem-mb 512 --procs 4
//               --out <file> --err <file> --out-cap 1048576 --json <file> [--args ...]

#include <windows.h>

#include <cstdio>
#include <cstring>
#include <string>
#include <vector>

namespace {

struct options {
  std::wstring exe;
  std::vector<std::wstring> args;
  DWORD timeoutMs = 5000;
  DWORD memMb = 512;
  DWORD procs = 4;
  DWORD outCap = 1 << 20;
  std::wstring stdinFile;
  std::wstring outFile;
  std::wstring errFile;
  std::wstring jsonFile;
};

unsigned long long parseU64(const wchar_t* s) {
  unsigned long long v = 0;
  for (; s && *s; ++s) {
    if (*s < L'0' || *s > L'9') break;
    v = v * 10 + static_cast<unsigned long long>(*s - L'0');
  }
  return v;
}

bool parseArgs(int argc, wchar_t** argv, options& o, std::string& err) {
  for (int i = 1; i < argc; ++i) {
    const std::wstring a = argv[i];
    auto next = [&](const wchar_t* what) -> const wchar_t* {
      if (i + 1 >= argc) {
        err = std::string("missing value for ") + std::string(what == nullptr ? "?" : "option");
        return nullptr;
      }
      return argv[++i];
    };
    if (a == L"--exe") {
      const wchar_t* v = next(L"--exe");
      if (!v) return false;
      o.exe = v;
    } else if (a == L"--timeout-ms") {
      const wchar_t* v = next(L"--timeout-ms");
      if (!v) return false;
      o.timeoutMs = static_cast<DWORD>(parseU64(v));
    } else if (a == L"--mem-mb") {
      const wchar_t* v = next(L"--mem-mb");
      if (!v) return false;
      o.memMb = static_cast<DWORD>(parseU64(v));
    } else if (a == L"--procs") {
      const wchar_t* v = next(L"--procs");
      if (!v) return false;
      o.procs = static_cast<DWORD>(parseU64(v));
    } else if (a == L"--out-cap") {
      const wchar_t* v = next(L"--out-cap");
      if (!v) return false;
      o.outCap = static_cast<DWORD>(parseU64(v));
    } else if (a == L"--out") {
      const wchar_t* v = next(L"--out");
      if (!v) return false;
      o.outFile = v;
    } else if (a == L"--err") {
      const wchar_t* v = next(L"--err");
      if (!v) return false;
      o.errFile = v;
    } else if (a == L"--stdin") {
      const wchar_t* v = next(L"--stdin");
      if (!v) return false;
      o.stdinFile = v;
    } else if (a == L"--json") {
      const wchar_t* v = next(L"--json");
      if (!v) return false;
      o.jsonFile = v;
    } else if (a == L"--args") {
      for (++i; i < argc; ++i) o.args.emplace_back(argv[i]);
      break;
    } else {
      err = "unknown option";
      return false;
    }
  }
  if (o.exe.empty()) { err = "--exe is required"; return false; }
  return true;
}

// 單一輸出管道的讀取器：寫入檔案直到上限，之後只計數不寫。
struct stream_reader {
  HANDLE pipe = nullptr;
  HANDLE file = INVALID_HANDLE_VALUE;
  DWORD cap = 0;
  unsigned long long total = 0;
  bool truncated = false;
};

DWORD WINAPI reader_thread(LPVOID param) {
  auto* r = static_cast<stream_reader*>(param);
  char buf[8192];
  for (;;) {
    DWORD got = 0;
    const BOOL ok = ReadFile(r->pipe, buf, sizeof(buf), &got, nullptr);
    if (!ok || got == 0) break;
    r->total += got;
    if (r->file != INVALID_HANDLE_VALUE) {
      DWORD writable = 0;
      if (r->total <= r->cap) {
        writable = got;
      } else if (r->total - got < r->cap) {
        writable = static_cast<DWORD>(r->cap - (r->total - got));
      } else {
        r->truncated = true;
      }
      if (writable > 0) {
        DWORD written = 0;
        WriteFile(r->file, buf, writable, &written, nullptr);
      }
      if (writable < got) r->truncated = true;
    }
  }
  return 0;
}

std::string jsonEscape(const std::string& s) {
  std::string out;
  out.reserve(s.size() + 8);
  for (char c : s) {
    if (c == '"' || c == '\\') { out += '\\'; out += c; }
    else if (c == '\n') out += "\\n";
    else if (c == '\r') out += "\\r";
    else if (c == '\t') out += "\\t";
    else out += c;
  }
  return out;
}

}  // namespace

int wmain(int argc, wchar_t** argv) {
  options o;
  std::string perr;
  if (!parseArgs(argc, argv, o, perr)) {
    std::fprintf(stderr, "sandbox: %s\n", perr.c_str());
    return 2;
  }

  HANDLE job = CreateJobObjectW(nullptr, nullptr);
  if (!job) return 3;

  // 限制：記憶體 / 行程數 / 每行程 CPU 時間 / 逾時即殺 / job 關閉即殺
  JOBOBJECT_EXTENDED_LIMIT_INFORMATION limit{};
  limit.BasicLimitInformation.LimitFlags =
      JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE | JOB_OBJECT_LIMIT_PROCESS_MEMORY |
      JOB_OBJECT_LIMIT_ACTIVE_PROCESS | JOB_OBJECT_LIMIT_PROCESS_TIME |
      JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
  limit.BasicLimitInformation.ActiveProcessLimit = o.procs;
  limit.ProcessMemoryLimit = static_cast<SIZE_T>(o.memMb) * 1024ULL * 1024ULL;
  // 100ns 單位；給 2 倍牆鐘時間當 CPU 上限，避免正常程式被誤殺
  limit.BasicLimitInformation.PerProcessUserTimeLimit.QuadPart =
      static_cast<LONGLONG>(o.timeoutMs) * 10000LL * 2;
  SetInformationJobObject(job, JobObjectExtendedLimitInformation, &limit, sizeof(limit));

  // UI 限制：禁止碰桌面、剪貼簿、關機等
  JOBOBJECT_BASIC_UI_RESTRICTIONS ui{};
  ui.UIRestrictionsClass = JOB_OBJECT_UILIMIT_DESKTOP | JOB_OBJECT_UILIMIT_DISPLAYSETTINGS |
                           JOB_OBJECT_UILIMIT_EXITWINDOWS | JOB_OBJECT_UILIMIT_GLOBALATOMS |
                           JOB_OBJECT_UILIMIT_READCLIPBOARD | JOB_OBJECT_UILIMIT_WRITECLIPBOARD |
                           JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS | JOB_OBJECT_UILIMIT_HANDLES;
  SetInformationJobObject(job, JobObjectBasicUIRestrictions, &ui, sizeof(ui));

  // 建立輸出/輸入管道
  SECURITY_ATTRIBUTES sa{};
  sa.nLength = sizeof(sa);
  sa.bInheritHandle = TRUE;

  HANDLE outRead = nullptr, outWrite = nullptr, errRead = nullptr, errWrite = nullptr;
  if (!CreatePipe(&outRead, &outWrite, &sa, 0)) return 4;
  if (!CreatePipe(&errRead, &errWrite, &sa, 0)) return 4;
  SetHandleInformation(outRead, HANDLE_FLAG_INHERIT, 0);
  SetHandleInformation(errRead, HANDLE_FLAG_INHERIT, 0);

  // stdin：有指定檔案就餵檔案（供 stdin/stdout 類題型），否則接 NUL（立即 EOF）
  HANDLE nul = INVALID_HANDLE_VALUE;
  if (!o.stdinFile.empty()) {
    nul = CreateFileW(o.stdinFile.c_str(), GENERIC_READ, FILE_SHARE_READ, &sa,
                      OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (nul == INVALID_HANDLE_VALUE) {
      std::fprintf(stderr, "sandbox: cannot open stdin file %lu\n", GetLastError());
      return 7;
    }
  } else {
    nul = CreateFileW(L"NUL", GENERIC_READ, FILE_SHARE_READ | FILE_SHARE_WRITE,
                      &sa, OPEN_EXISTING, 0, nullptr);
  }

  STARTUPINFOW si{};
  si.cb = sizeof(si);
  si.dwFlags = STARTF_USESTDHANDLES;
  si.hStdInput = nul;
  si.hStdOutput = outWrite;
  si.hStdError = errWrite;

  // 組命令列
  std::wstring cmd = L"\"" + o.exe + L"\"";
  for (const auto& a : o.args) cmd += L" \"" + a + L"\"";

  PROCESS_INFORMATION pi{};
  const DWORD flags = CREATE_SUSPENDED | CREATE_NO_WINDOW | CREATE_NEW_PROCESS_GROUP;
  if (!CreateProcessW(o.exe.c_str(), cmd.data(), nullptr, nullptr, TRUE, flags, nullptr,
                      nullptr, &si, &pi)) {
    std::fprintf(stderr, "sandbox: CreateProcess failed %lu\n", GetLastError());
    return 5;
  }

  if (!AssignProcessToJobObject(job, pi.hProcess)) {
    std::fprintf(stderr, "sandbox: AssignProcessToJobObject failed %lu\n", GetLastError());
    TerminateProcess(pi.hProcess, 9);
    return 6;
  }

  // 關掉父端寫入，讓子行程結束時管道 EOF
  CloseHandle(outWrite);
  CloseHandle(errWrite);

  stream_reader outR{outRead, INVALID_HANDLE_VALUE, o.outCap};
  stream_reader errR{errRead, INVALID_HANDLE_VALUE, o.outCap};
  if (!o.outFile.empty()) {
    outR.file = CreateFileW(o.outFile.c_str(), GENERIC_WRITE, FILE_SHARE_READ, nullptr,
                            CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  }
  if (!o.errFile.empty()) {
    errR.file = CreateFileW(o.errFile.c_str(), GENERIC_WRITE, FILE_SHARE_READ, nullptr,
                            CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
  }

  HANDLE tOut = CreateThread(nullptr, 0, reader_thread, &outR, 0, nullptr);
  HANDLE tErr = CreateThread(nullptr, 0, reader_thread, &errR, 0, nullptr);

  ResumeThread(pi.hThread);
  CloseHandle(pi.hThread);

  const ULONGLONG t0 = GetTickCount64();
  const DWORD wait = WaitForSingleObject(pi.hProcess, o.timeoutMs);
  const bool timedOut = (wait == WAIT_TIMEOUT);
  if (timedOut) TerminateJobObject(job, 1);

  DWORD exitCode = 0;
  GetExitCodeProcess(pi.hProcess, &exitCode);

  JOBOBJECT_EXTENDED_LIMIT_INFORMATION after{};
  QueryInformationJobObject(job, JobObjectExtendedLimitInformation, &after, sizeof(after),
                            nullptr);
  const ULONGLONG elapsed = GetTickCount64() - t0;

  // 等讀取執行緒收尾
  if (tOut) WaitForSingleObject(tOut, 3000);
  if (tErr) WaitForSingleObject(tErr, 3000);
  if (tOut) CloseHandle(tOut);
  if (tErr) CloseHandle(tErr);
  if (outR.file != INVALID_HANDLE_VALUE) CloseHandle(outR.file);
  if (errR.file != INVALID_HANDLE_VALUE) CloseHandle(errR.file);
  CloseHandle(outRead);
  CloseHandle(errRead);
  if (nul != INVALID_HANDLE_VALUE) CloseHandle(nul);
  CloseHandle(pi.hProcess);

  // TerminateJobObject 會改寫 exitCode，保留「是否逾時」的資訊
  std::string json = "{";
  json += "\"exitCode\":" + std::to_string(static_cast<unsigned long>(exitCode));
  json += ",\"exitCodeHex\":\"" + [&] {
    char b[16];
    std::snprintf(b, sizeof(b), "0x%08lX", static_cast<unsigned long>(exitCode));
    return std::string(b);
  }() + "\"";
  json += ",\"timedOut\":" + std::string(timedOut ? "true" : "false");
  json += ",\"elapsedMs\":" + std::to_string(static_cast<unsigned long long>(elapsed));
  json += ",\"peakMemoryBytes\":" +
          std::to_string(static_cast<unsigned long long>(after.PeakProcessMemoryUsed));
  json += ",\"memLimitBytes\":" +
          std::to_string(static_cast<unsigned long long>(o.memMb) * 1024ULL * 1024ULL);
  json += ",\"stdoutBytes\":" + std::to_string(outR.total);
  json += ",\"stderrBytes\":" + std::to_string(errR.total);
  json += ",\"stdoutTruncated\":" + std::string(outR.truncated ? "true" : "false");
  json += ",\"stderrTruncated\":" + std::string(errR.truncated ? "true" : "false");
  json += ",\"stderrPreview\":\"" + jsonEscape("") + "\"";
  json += "}";

  if (!o.jsonFile.empty()) {
    HANDLE f = CreateFileW(o.jsonFile.c_str(), GENERIC_WRITE, FILE_SHARE_READ, nullptr,
                           CREATE_ALWAYS, FILE_ATTRIBUTE_NORMAL, nullptr);
    if (f != INVALID_HANDLE_VALUE) {
      DWORD written = 0;
      WriteFile(f, json.data(), static_cast<DWORD>(json.size()), &written, nullptr);
      CloseHandle(f);
    }
  }
  std::fprintf(stdout, "%s\n", json.c_str());

  CloseHandle(job);
  return static_cast<int>(exitCode);
}
