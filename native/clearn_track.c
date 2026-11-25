/*
 * clearn_track.c —— 堆内存跟踪（与学习者代码一起链接，学习者源码不做任何修改）。
 *
 * 链接时使用 -Wl,--wrap=malloc,--wrap=calloc,--wrap=realloc,--wrap=free,--wrap=strdup,--wrap=_strdup：
 * 学习者代码里对 malloc 等函数的调用被链接器改为调用这里的 __wrap_xxx，
 * 这里再调用 __real_xxx（真正的实现，由 AddressSanitizer 接管）。
 *
 * 用途：
 *   1. 内存泄漏检测（Windows 上没有 LeakSanitizer）；
 *   2. 统计堆内存峰值，超过上限判为 MLE。
 *
 * 每次分配记录调用者的返回地址（相对映像基址的偏移 RVA），程序结束时写报告；
 * 判题器在沙箱外用 llvm-symbolizer 把 RVA 还原为"文件:行号"，并过滤掉 C 运行库自己的分配。
 *
 * 环境变量：
 *   CLEARN_TRACK_OUT   报告文件路径（JSON）。未设置则不写报告。
 *   CLEARN_HEAP_LIMIT  堆内存上限（字节）。当前已分配量超过它时写报告并以 CLEARN_MLE_EXIT 退出。
 *
 * 报告格式：
 *   {"peak":峰值字节,"current":结束时未释放字节,"allocs":N,"frees":N,"limitExceeded":false,
 *    "sites":[{"rva":"0x14a2","bytes":16,"count":2}, ...]}     // 仅列出结束时仍未释放的分配点
 */
#include <stdio.h>
#include <stdlib.h>
#include <string.h>
#include <stdint.h>
#include <windows.h>

/* 与 server/judge/judge.js 中的 MLE_EXIT_CODE 保持一致（ASCII "MLE" = 0x4D4C45；不用 3：abort() 的退出码也是 3） */
#define CLEARN_MLE_EXIT 0x4D4C45

void *__real_malloc(size_t size);
void *__real_calloc(size_t count, size_t size);
void *__real_realloc(void *ptr, size_t size);
void __real_free(void *ptr);
char *__real_strdup(const char *s);
char *__real__strdup(const char *s);

extern IMAGE_DOS_HEADER __ImageBase;

/* ---------- 存活分配表：开放寻址哈希表，指针 -> (大小, 调用点) ---------- */
typedef struct {
    void *ptr;          /* NULL = 空槽；TOMBSTONE = 已删除 */
    size_t size;
    uintptr_t rva;      /* 调用 malloc 的指令地址（相对映像基址） */
} Entry;

#define TOMBSTONE ((void *)(uintptr_t)1)

static Entry *table = NULL;
static size_t table_cap = 0;     /* 2 的幂 */
static size_t table_used = 0;    /* 含墓碑 */
static size_t live_count = 0;

static size_t cur_bytes = 0, peak_bytes = 0;
static unsigned long long n_allocs = 0, n_frees = 0;
static size_t heap_limit = 0;
static int limit_exceeded = 0;
static const char *report_path = NULL;

static uintptr_t rva_of(void *ret) {
    return (uintptr_t)ret - (uintptr_t)&__ImageBase;
}

static size_t hash_ptr(const void *p) {
    uintptr_t x = (uintptr_t)p;
    x ^= x >> 33;
    x *= (uintptr_t)0xff51afd7ed558ccdULL;
    x ^= x >> 33;
    return (size_t)x;
}

static void table_insert_raw(Entry *t, size_t cap, Entry e) {
    size_t i = hash_ptr(e.ptr) & (cap - 1);
    while (t[i].ptr != NULL && t[i].ptr != TOMBSTONE) i = (i + 1) & (cap - 1);
    t[i] = e;
}

static int table_grow(void) {
    size_t ncap = table_cap ? table_cap * 2 : 1024;
    if (table_cap && live_count * 4 < table_cap) ncap = table_cap; /* 主要是墓碑：原尺寸重建 */
    /* 表本身用 __real_calloc 分配，不计入学习者的堆用量 */
    Entry *nt = __real_calloc(ncap, sizeof *nt);
    if (!nt) return 0;
    for (size_t i = 0; i < table_cap; i++) {
        if (table[i].ptr != NULL && table[i].ptr != TOMBSTONE) table_insert_raw(nt, ncap, table[i]);
    }
    __real_free(table);
    table = nt;
    table_cap = ncap;
    table_used = live_count;
    return 1;
}

static void table_add(void *p, size_t size, uintptr_t rva) {
    if ((table_used + 1) * 2 > table_cap && !table_grow()) return; /* 无法扩容：放弃跟踪这一块 */
    Entry e = { p, size, rva };
    table_insert_raw(table, table_cap, e);
    table_used++;
    live_count++;
}

/* 找到并删除；返回被删除条目的大小，未找到返回 (size_t)-1 */
static size_t table_remove(void *p) {
    if (!table_cap) return (size_t)-1;
    size_t i = hash_ptr(p) & (table_cap - 1);
    while (table[i].ptr != NULL) {
        if (table[i].ptr == p) {
            size_t sz = table[i].size;
            table[i].ptr = TOMBSTONE;
            live_count--;
            return sz;
        }
        i = (i + 1) & (table_cap - 1);
    }
    return (size_t)-1;
}

/* ---------- 报告 ---------- */
typedef struct { uintptr_t rva; size_t bytes; size_t count; } Site;

static void write_report(void) {
    if (!report_path) return;
    FILE *f = fopen(report_path, "w");
    if (!f) return;
    fprintf(f, "{\"peak\":%zu,\"current\":%zu,\"allocs\":%llu,\"frees\":%llu,\"limitExceeded\":%s,\"sites\":[",
            peak_bytes, cur_bytes, n_allocs, n_frees, limit_exceeded ? "true" : "false");
    enum { MAX_SITES = 64 };
    Site sites[MAX_SITES];
    size_t n_sites = 0;
    for (size_t i = 0; i < table_cap; i++) {
        Entry *e = &table[i];
        if (e->ptr == NULL || e->ptr == TOMBSTONE) continue;
        size_t k = 0;
        while (k < n_sites && sites[k].rva != e->rva) k++;
        if (k == n_sites) {
            if (n_sites == MAX_SITES) continue;
            sites[k].rva = e->rva;
            sites[k].bytes = 0;
            sites[k].count = 0;
            n_sites++;
        }
        sites[k].bytes += e->size;
        sites[k].count++;
    }
    for (size_t k = 0; k < n_sites; k++) {
        fprintf(f, "%s{\"rva\":\"0x%llx\",\"bytes\":%zu,\"count\":%zu}", k ? "," : "",
                (unsigned long long)sites[k].rva, sites[k].bytes, sites[k].count);
    }
    fputs("]}\n", f);
    fclose(f);
}

static void at_exit_report(void) { write_report(); }

__attribute__((constructor)) static void clearn_track_init(void) {
    report_path = getenv("CLEARN_TRACK_OUT");
    const char *lim = getenv("CLEARN_HEAP_LIMIT");
    if (lim) heap_limit = (size_t)strtoull(lim, NULL, 10);
    /* 最早注册 → 最后执行：学习者用 atexit 注册的清理函数会先运行 */
    atexit(at_exit_report);
}

static void account_alloc(void *p, size_t size, uintptr_t rva) {
    n_allocs++;
    cur_bytes += size;
    if (cur_bytes > peak_bytes) peak_bytes = cur_bytes;
    table_add(p, size, rva);
    if (heap_limit && cur_bytes > heap_limit) {
        limit_exceeded = 1;
        write_report();
        fflush(stdout);
        _Exit(CLEARN_MLE_EXIT);
    }
}

static void account_free(void *p) {
    size_t sz = table_remove(p);
    if (sz != (size_t)-1) {
        n_frees++;
        cur_bytes -= sz;
    }
}

/* ---------- 包装函数 ---------- */
void *__wrap_malloc(size_t size) {
    void *p = __real_malloc(size);
    if (p) account_alloc(p, size, rva_of(__builtin_return_address(0)));
    return p;
}

void *__wrap_calloc(size_t count, size_t size) {
    void *p = __real_calloc(count, size);
    if (p) account_alloc(p, count * size, rva_of(__builtin_return_address(0)));  /* calloc 成功说明乘积未溢出 */
    return p;
}

void *__wrap_realloc(void *ptr, size_t size) {
    void *p = __real_realloc(ptr, size);
    /* 成功：旧块失效、新块生效；失败（返回 NULL 且 size>0）：旧块保持不变 */
    if (p || size == 0) {
        if (ptr) account_free(ptr);
        if (p) account_alloc(p, size, rva_of(__builtin_return_address(0)));
    }
    return p;
}

void __wrap_free(void *ptr) {
    /* 不认识的指针（例如重复释放）照样交给真正的 free，让 AddressSanitizer 报告错误 */
    if (ptr) account_free(ptr);
    __real_free(ptr);
}

char *__wrap_strdup(const char *s) {
    char *p = __real_strdup(s);
    if (p) account_alloc(p, strlen(p) + 1, rva_of(__builtin_return_address(0)));
    return p;
}

char *__wrap__strdup(const char *s) {
    char *p = __real__strdup(s);
    if (p) account_alloc(p, strlen(p) + 1, rva_of(__builtin_return_address(0)));
    return p;
}
