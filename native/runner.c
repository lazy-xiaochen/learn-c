/*
 * runner.c —— 判题沙箱启动器（Windows）
 *
 * 在一个 Windows Job Object 中运行学习者编译出的程序，并施加资源限制：
 *   - CPU 时间上限（每 20ms 轮询 Job 的 CPU 用时）+ 墙钟时间上限
 *   - 内存上限（Job 的 ProcessMemoryLimit，限制已提交内存）
 *   - 进程数上限 = 1（程序无法再启动任何子进程，system()/popen() 等会失败）
 *   - 禁止访问剪贴板、修改系统参数、注销/关机等 UI 操作
 *   - stdout / stderr 经管道读取，超过上限立即终止程序（防止无限输出撑爆磁盘）
 *   - 关闭 runner 时 Job 内进程一并被杀（KILL_ON_JOB_CLOSE）
 *
 * 用法：
 *   runner.exe [选项] -- 程序路径 [程序参数...]
 *     --time-ms N     CPU 时间上限（毫秒，默认 1000）
 *     --wall-ms N     墙钟时间上限（毫秒，默认 time-ms*2+500）
 *     --mem-mb N      内存上限（MB，默认 256）
 *     --out-limit N   stdout/stderr 各自的字节上限（默认 65536）
 *     --stdin PATH    标准输入文件（默认 NUL）
 *     --stdout PATH   标准输出写入的文件（必填）
 *     --stderr PATH   标准错误写入的文件（必填）
 *     --cwd PATH      工作目录（默认当前目录）
 *     --low-il 0|1    以低完整性级别运行（只能写入工作目录），默认 0
 *
 * 结果以一行 JSON 打印到 runner 自己的 stdout，例如：
 *   {"status":"exited","exitCode":0,"wallMs":12,"cpuMs":0,"peakMemKB":1520,...}
 *   status 取值：exited / timeout / memory / output / error
 *
 * 构建：clang -std=c17 -O2 -Wall -Wextra -municode runner.c -o runner.exe
 */
#define WIN32_LEAN_AND_MEAN
#include <windows.h>
#include <sddl.h>
#include <aclapi.h>
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <wchar.h>

/* ---------- 失败时输出 JSON 并退出 ---------- */
static void fail(const char *msg) {
    printf("{\"status\":\"error\",\"error\":\"%s\",\"win32\":%lu}\n", msg, (unsigned long)GetLastError());
    fflush(stdout);
    exit(2);
}

/* ---------- 宽字符串构建器：拼接子进程命令行 ---------- */
typedef struct {
    wchar_t *buf;
    size_t len, cap;
} WBuf;

static void wb_putc(WBuf *b, wchar_t c) {
    if (b->len + 2 > b->cap) {
        size_t ncap = b->cap ? b->cap * 2 : 256;
        wchar_t *nb = realloc(b->buf, ncap * sizeof *nb);
        if (!nb) fail("out of memory");
        b->buf = nb;
        b->cap = ncap;
    }
    b->buf[b->len++] = c;
    b->buf[b->len] = L'\0';
}

/* 按 CommandLineToArgvW 的规则给一个参数加引号 */
static void wb_arg(WBuf *b, const wchar_t *s) {
    if (b->len) wb_putc(b, L' ');
    if (*s && !wcspbrk(s, L" \t\n\v\"")) {
        while (*s) wb_putc(b, *s++);
        return;
    }
    wb_putc(b, L'"');
    for (;;) {
        size_t bs = 0;
        while (*s == L'\\') { s++; bs++; }
        if (*s == L'\0') {
            for (size_t i = 0; i < bs * 2; i++) wb_putc(b, L'\\');
            break;
        }
        if (*s == L'"') {
            for (size_t i = 0; i < bs * 2 + 1; i++) wb_putc(b, L'\\');
        } else {
            for (size_t i = 0; i < bs; i++) wb_putc(b, L'\\');
        }
        wb_putc(b, *s++);
    }
    wb_putc(b, L'"');
}

/* ---------- 输出泵：从管道读取，写入文件，超限即终止 Job ---------- */
typedef struct {
    HANDLE src;              /* 管道读端 */
    HANDLE dst;              /* 目标文件 */
    HANDLE job;
    ULONGLONG limit;
    ULONGLONG written;
    volatile LONG truncated;
} Pump;

static DWORD WINAPI pump_main(LPVOID arg) {
    Pump *p = (Pump *)arg;
    char buf[16384];
    DWORD n = 0;
    while (ReadFile(p->src, buf, sizeof buf, &n, NULL) && n > 0) {
        ULONGLONG room = p->limit - p->written; /* 不变式：written <= limit */
        DWORD keep = ((ULONGLONG)n > room) ? (DWORD)room : n;
        if (keep > 0) {
            DWORD done = 0;
            WriteFile(p->dst, buf, keep, &done, NULL);
            p->written += keep;
        }
        if (keep < n) {
            InterlockedExchange(&p->truncated, 1);
            TerminateJobObject(p->job, 1);
            break;
        }
    }
    return 0;
}

/* ---------- 低完整性级别 ---------- */
static HANDLE make_low_token(void) {
    HANDLE cur = NULL, dup = NULL;
    if (!OpenProcessToken(GetCurrentProcess(),
                          TOKEN_DUPLICATE | TOKEN_QUERY | TOKEN_ADJUST_DEFAULT | TOKEN_ASSIGN_PRIMARY, &cur))
        fail("OpenProcessToken failed");
    if (!DuplicateTokenEx(cur, 0, NULL, SecurityImpersonation, TokenPrimary, &dup))
        fail("DuplicateTokenEx failed");
    CloseHandle(cur);
    PSID sid = NULL;
    if (!ConvertStringSidToSidW(L"S-1-16-4096", &sid)) fail("ConvertStringSidToSid failed"); /* Low Mandatory Level */
    TOKEN_MANDATORY_LABEL tml;
    ZeroMemory(&tml, sizeof tml);
    tml.Label.Attributes = SE_GROUP_INTEGRITY;
    tml.Label.Sid = sid;
    if (!SetTokenInformation(dup, TokenIntegrityLevel, &tml, (DWORD)(sizeof tml + GetLengthSid(sid))))
        fail("SetTokenInformation(IntegrityLevel) failed");
    LocalFree(sid);
    return dup;
}

/* 给目录打上"低完整性"标签（子文件/子目录继承），低完整性进程才能在其中创建和写入文件 */
static void label_dir_low(const wchar_t *dir) {
    wchar_t here[MAX_PATH];
    if (!dir) {
        if (!GetCurrentDirectoryW(MAX_PATH, here)) fail("GetCurrentDirectory failed");
        dir = here;
    }
    PSECURITY_DESCRIPTOR sd = NULL;
    PACL sacl = NULL;
    BOOL present = FALSE, defaulted = FALSE;
    if (!ConvertStringSecurityDescriptorToSecurityDescriptorW(L"S:(ML;OICI;NW;;;LW)", SDDL_REVISION_1, &sd, NULL))
        fail("ConvertStringSecurityDescriptor failed");
    if (!GetSecurityDescriptorSacl(sd, &present, &sacl, &defaulted)) fail("GetSecurityDescriptorSacl failed");
    DWORD rc = SetNamedSecurityInfoW((LPWSTR)dir, SE_FILE_OBJECT, LABEL_SECURITY_INFORMATION, NULL, NULL, NULL, sacl);
    LocalFree(sd);
    if (rc != ERROR_SUCCESS) {
        SetLastError(rc);
        fail("SetNamedSecurityInfo(label) failed");
    }
}

static ULONGLONG parse_u64(const wchar_t *s) {
    wchar_t *end = NULL;
    unsigned long long v = wcstoull(s, &end, 10);
    if (!end || *end != L'\0') fail("bad numeric option");
    return v;
}

static HANDLE open_out_file(const wchar_t *path) {
    HANDLE h = CreateFileW(path, GENERIC_WRITE, FILE_SHARE_READ, NULL, CREATE_ALWAYS,
                           FILE_ATTRIBUTE_NORMAL, NULL);
    if (h == INVALID_HANDLE_VALUE) fail("cannot create output file");
    return h;
}

int wmain(int argc, wchar_t **argv) {
    ULONGLONG time_ms = 1000, wall_ms = 0, mem_mb = 256, out_limit = 65536;
    const wchar_t *in_path = NULL, *out_path = NULL, *err_path = NULL, *cwd = NULL;
    int low_il = 0;

    int i = 1;
    for (; i < argc; i++) {
        const wchar_t *opt = argv[i];
        if (wcscmp(opt, L"--") == 0) { i++; break; }
        if (i + 1 >= argc) fail("missing option value");
        const wchar_t *val = argv[++i];
        if      (wcscmp(opt, L"--time-ms") == 0)   time_ms = parse_u64(val);
        else if (wcscmp(opt, L"--wall-ms") == 0)   wall_ms = parse_u64(val);
        else if (wcscmp(opt, L"--mem-mb") == 0)    mem_mb = parse_u64(val);
        else if (wcscmp(opt, L"--out-limit") == 0) out_limit = parse_u64(val);
        else if (wcscmp(opt, L"--stdin") == 0)     in_path = val;
        else if (wcscmp(opt, L"--stdout") == 0)    out_path = val;
        else if (wcscmp(opt, L"--stderr") == 0)    err_path = val;
        else if (wcscmp(opt, L"--cwd") == 0)       cwd = val;
        else if (wcscmp(opt, L"--low-il") == 0)    low_il = parse_u64(val) != 0;
        else fail("unknown option");
    }
    if (i >= argc) fail("no program given");
    if (!out_path || !err_path) fail("--stdout and --stderr are required");
    if (wall_ms == 0) wall_ms = time_ms * 2 + 500;

    /* 子进程继承此错误模式：崩溃时不弹出 Windows 错误对话框 */
    SetErrorMode(SEM_FAILCRITICALERRORS | SEM_NOGPFAULTERRORBOX | SEM_NOOPENFILEERRORBOX);

    /* ---------- 1. 创建 Job 并设置限制 ---------- */
    HANDLE job = CreateJobObjectW(NULL, NULL);
    if (!job) fail("CreateJobObject failed");

    JOBOBJECT_EXTENDED_LIMIT_INFORMATION li;
    ZeroMemory(&li, sizeof li);
    /* 注意：不使用 JOB_OBJECT_LIMIT_PROCESS_TIME。实测在嵌套 Job（例如从已处于 Job 中的
     * 终端/IDE 启动）时它不会触发，所以 CPU 时间改为在等待循环中主动轮询。 */
    li.BasicLimitInformation.LimitFlags =
        JOB_OBJECT_LIMIT_PROCESS_MEMORY |
        JOB_OBJECT_LIMIT_ACTIVE_PROCESS |
        JOB_OBJECT_LIMIT_KILL_ON_JOB_CLOSE |
        JOB_OBJECT_LIMIT_DIE_ON_UNHANDLED_EXCEPTION;
    li.BasicLimitInformation.ActiveProcessLimit = 1;
    li.ProcessMemoryLimit = (SIZE_T)(mem_mb * 1024 * 1024);
    if (!SetInformationJobObject(job, JobObjectExtendedLimitInformation, &li, sizeof li))
        fail("SetInformationJobObject(limits) failed");

    JOBOBJECT_BASIC_UI_RESTRICTIONS ui;
    ui.UIRestrictionsClass =
        JOB_OBJECT_UILIMIT_DESKTOP | JOB_OBJECT_UILIMIT_DISPLAYSETTINGS |
        JOB_OBJECT_UILIMIT_EXITWINDOWS | JOB_OBJECT_UILIMIT_GLOBALATOMS |
        JOB_OBJECT_UILIMIT_HANDLES | JOB_OBJECT_UILIMIT_READCLIPBOARD |
        JOB_OBJECT_UILIMIT_SYSTEMPARAMETERS | JOB_OBJECT_UILIMIT_WRITECLIPBOARD;
    if (!SetInformationJobObject(job, JobObjectBasicUIRestrictions, &ui, sizeof ui))
        fail("SetInformationJobObject(ui) failed");

    HANDLE port = CreateIoCompletionPort(INVALID_HANDLE_VALUE, NULL, 0, 1);
    if (!port) fail("CreateIoCompletionPort failed");
    JOBOBJECT_ASSOCIATE_COMPLETION_PORT acp;
    acp.CompletionKey = job;
    acp.CompletionPort = port;
    if (!SetInformationJobObject(job, JobObjectAssociateCompletionPortInformation, &acp, sizeof acp))
        fail("SetInformationJobObject(port) failed");

    /* ---------- 2. 准备标准输入输出 ---------- */
    SECURITY_ATTRIBUTES sa_inherit = { sizeof sa_inherit, NULL, TRUE };

    HANDLE h_in = CreateFileW(in_path ? in_path : L"NUL", GENERIC_READ, FILE_SHARE_READ, &sa_inherit,
                              OPEN_EXISTING, FILE_ATTRIBUTE_NORMAL, NULL);
    if (h_in == INVALID_HANDLE_VALUE) fail("cannot open stdin file");

    HANDLE out_rd, out_wr, err_rd, err_wr;
    if (!CreatePipe(&out_rd, &out_wr, &sa_inherit, 0)) fail("CreatePipe(stdout) failed");
    if (!CreatePipe(&err_rd, &err_wr, &sa_inherit, 0)) fail("CreatePipe(stderr) failed");
    SetHandleInformation(out_rd, HANDLE_FLAG_INHERIT, 0);
    SetHandleInformation(err_rd, HANDLE_FLAG_INHERIT, 0);

    Pump pout = { out_rd, open_out_file(out_path), job, out_limit, 0, 0 };
    Pump perr = { err_rd, open_out_file(err_path), job, out_limit, 0, 0 };

    /* ---------- 3. 创建子进程（挂起状态），只继承三个标准句柄 ---------- */
    WBuf cmd = { NULL, 0, 0 };
    for (int k = i; k < argc; k++) wb_arg(&cmd, argv[k]);

    STARTUPINFOEXW si;
    ZeroMemory(&si, sizeof si);
    si.StartupInfo.cb = sizeof si;
    si.StartupInfo.dwFlags = STARTF_USESTDHANDLES;
    si.StartupInfo.hStdInput = h_in;
    si.StartupInfo.hStdOutput = out_wr;
    si.StartupInfo.hStdError = err_wr;

    HANDLE inherit_list[3] = { h_in, out_wr, err_wr };
    SIZE_T attr_size = 0;
    InitializeProcThreadAttributeList(NULL, 1, 0, &attr_size);
    si.lpAttributeList = (LPPROC_THREAD_ATTRIBUTE_LIST)HeapAlloc(GetProcessHeap(), 0, attr_size);
    if (!si.lpAttributeList) fail("HeapAlloc failed");
    if (!InitializeProcThreadAttributeList(si.lpAttributeList, 1, 0, &attr_size))
        fail("InitializeProcThreadAttributeList failed");
    if (!UpdateProcThreadAttribute(si.lpAttributeList, 0, PROC_THREAD_ATTRIBUTE_HANDLE_LIST,
                                   inherit_list, sizeof inherit_list, NULL, NULL))
        fail("UpdateProcThreadAttribute failed");

    PROCESS_INFORMATION pi;
    const DWORD cflags = CREATE_SUSPENDED | CREATE_NO_WINDOW | EXTENDED_STARTUPINFO_PRESENT;
    if (low_il) {
        /* 低完整性级别：程序只能写入被标记为"低"的位置（即工作目录），
         * 无法修改用户文件、注册表等，防止错误的 fopen/remove 破坏学习者的电脑。 */
        label_dir_low(cwd);
        HANDLE tok = make_low_token();
        if (!CreateProcessAsUserW(tok, argv[i], cmd.buf, NULL, NULL, TRUE, cflags, NULL, cwd, &si.StartupInfo, &pi))
            fail("CreateProcessAsUser failed");
        CloseHandle(tok);
    } else if (!CreateProcessW(argv[i], cmd.buf, NULL, NULL, TRUE, cflags, NULL, cwd, &si.StartupInfo, &pi)) {
        fail("CreateProcess failed");
    }

    if (!AssignProcessToJobObject(job, pi.hProcess)) {
        TerminateProcess(pi.hProcess, 1);
        fail("AssignProcessToJobObject failed");
    }

    /* 父进程关闭子进程端句柄，这样子进程退出后管道才会关闭 */
    CloseHandle(h_in);
    CloseHandle(out_wr);
    CloseHandle(err_wr);

    HANDLE threads[2];
    threads[0] = CreateThread(NULL, 0, pump_main, &pout, 0, NULL);
    threads[1] = CreateThread(NULL, 0, pump_main, &perr, 0, NULL);
    if (!threads[0] || !threads[1]) fail("CreateThread failed");

    LARGE_INTEGER freq, t0, t1;
    QueryPerformanceFrequency(&freq);
    QueryPerformanceCounter(&t0);
    ResumeThread(pi.hThread);

    /* ---------- 4. 等待：处理 Job 通知直到进程全部结束或超时 ---------- */
    int timed_out = 0, mem_hit = 0, proc_hit = 0, cpu_hit = 0, all_exited = 0;
    const ULONGLONG cpu_limit_100ns = time_ms * 10000ULL;
    ULONGLONG deadline = GetTickCount64() + wall_ms;
    for (;;) {
        /* 主动轮询 CPU 时间（用户态 + 内核态） */
        JOBOBJECT_BASIC_ACCOUNTING_INFORMATION poll;
        if (QueryInformationJobObject(job, JobObjectBasicAccountingInformation, &poll, sizeof poll, NULL) &&
            (ULONGLONG)(poll.TotalUserTime.QuadPart + poll.TotalKernelTime.QuadPart) > cpu_limit_100ns) {
            cpu_hit = 1;
            TerminateJobObject(job, 1);
            break;
        }
        ULONGLONG now = GetTickCount64();
        if (now >= deadline) {
            timed_out = 1;
            TerminateJobObject(job, 1);
            break;
        }
        DWORD wait = (DWORD)(deadline - now);
        if (wait > 20) wait = 20; /* 轮询间隔 20ms */
        DWORD msg = 0;
        ULONG_PTR key = 0;
        LPOVERLAPPED ov = NULL;
        if (!GetQueuedCompletionStatus(port, &msg, &key, &ov, wait)) {
            if (ov == NULL && GetLastError() == WAIT_TIMEOUT) continue;
            fail("GetQueuedCompletionStatus failed");
        }
        if (msg == JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT || msg == JOB_OBJECT_MSG_JOB_MEMORY_LIMIT) mem_hit = 1;
        else if (msg == JOB_OBJECT_MSG_ACTIVE_PROCESS_LIMIT) proc_hit = 1;
        else if (msg == JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO) { all_exited = 1; break; }
    }

    /* 因超时主动终止时，队列里可能还有未处理的通知（如内存超限），读完它们 */
    while (!all_exited) {
        DWORD msg = 0;
        ULONG_PTR key = 0;
        LPOVERLAPPED ov = NULL;
        if (!GetQueuedCompletionStatus(port, &msg, &key, &ov, 500)) break;
        if (msg == JOB_OBJECT_MSG_PROCESS_MEMORY_LIMIT || msg == JOB_OBJECT_MSG_JOB_MEMORY_LIMIT) mem_hit = 1;
        else if (msg == JOB_OBJECT_MSG_ACTIVE_PROCESS_LIMIT) proc_hit = 1;
        else if (msg == JOB_OBJECT_MSG_ACTIVE_PROCESS_ZERO) all_exited = 1;
    }

    WaitForSingleObject(pi.hProcess, 5000);
    QueryPerformanceCounter(&t1);
    WaitForMultipleObjects(2, threads, TRUE, 5000);

    /* ---------- 5. 收集结果 ---------- */
    DWORD exit_code = 0;
    GetExitCodeProcess(pi.hProcess, &exit_code);

    JOBOBJECT_BASIC_ACCOUNTING_INFORMATION acct;
    ZeroMemory(&acct, sizeof acct);
    QueryInformationJobObject(job, JobObjectBasicAccountingInformation, &acct, sizeof acct, NULL);
    JOBOBJECT_EXTENDED_LIMIT_INFORMATION li_out;
    ZeroMemory(&li_out, sizeof li_out);
    QueryInformationJobObject(job, JobObjectExtendedLimitInformation, &li_out, sizeof li_out, NULL);

    ULONGLONG wall = (ULONGLONG)((t1.QuadPart - t0.QuadPart) * 1000 / freq.QuadPart);
    ULONGLONG cpu = (ULONGLONG)(acct.TotalUserTime.QuadPart + acct.TotalKernelTime.QuadPart) / 10000;
    ULONGLONG peak_kb = (ULONGLONG)li_out.PeakProcessMemoryUsed / 1024;
    int out_trunc = pout.truncated != 0, err_trunc = perr.truncated != 0;

    const char *status = "exited";
    if (out_trunc || err_trunc) status = "output";
    else if (mem_hit) status = "memory";
    else if (timed_out || cpu_hit) status = "timeout";

    printf("{\"status\":\"%s\",\"exitCode\":%lu,\"wallMs\":%llu,\"cpuMs\":%llu,\"peakMemKB\":%llu,"
           "\"stdoutBytes\":%llu,\"stderrBytes\":%llu,\"stdoutTruncated\":%s,\"stderrTruncated\":%s,"
           "\"wallTimeout\":%s,\"cpuTimeout\":%s,\"memoryLimitHit\":%s,\"processLimitHit\":%s}\n",
           status, (unsigned long)exit_code, wall, cpu, peak_kb,
           pout.written, perr.written,
           out_trunc ? "true" : "false", err_trunc ? "true" : "false",
           timed_out ? "true" : "false", cpu_hit ? "true" : "false",
           mem_hit ? "true" : "false", proc_hit ? "true" : "false");
    fflush(stdout);

    CloseHandle(pout.dst);
    CloseHandle(perr.dst);
    CloseHandle(pi.hThread);
    CloseHandle(pi.hProcess);
    CloseHandle(job); /* KILL_ON_JOB_CLOSE：确保没有残留进程 */
    return 0;
}
