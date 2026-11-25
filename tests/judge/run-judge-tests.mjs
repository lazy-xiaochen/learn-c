// 判题器端到端测试：每种判题状态、每项安全限制都用真实 C 程序验证。
// 运行：npm run test:judge
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { judgeSubmission, runCode } from '../../server/judge/judge.js';

const AB_TESTS = [
  { input: '1 2\n', output: '3\n' },
  { input: '-5 5\n', output: '0\n', hidden: true, category: '边界：结果为 0' },
  { input: '1000000 2000000\n', output: '3000000\n', hidden: true, category: '较大数值' },
];
const main = (src) => ({ 'main.c': src });

const AB_OK = `#include <stdio.h>
int main(void) {
    int a, b;
    if (scanf("%d %d", &a, &b) != 2) return 1;
    printf("%d\\n", a + b);
    return 0;
}
`;

test('AC：正确代码', async () => {
  const r = await judgeSubmission({ files: main(AB_OK), tests: AB_TESTS });
  assert.equal(r.verdict, 'AC', JSON.stringify(r, null, 1));
  assert.equal(r.passed, 3);
  assert.deepEqual(r.compile.diagnostics, []);
});

test('WA：答案错误，隐藏用例不泄露数据', async () => {
  const r = await judgeSubmission({ files: main(AB_OK.replace('a + b', 'a - b')), tests: AB_TESTS });
  assert.equal(r.verdict, 'WA');
  assert.equal(r.cases[0].verdict, 'WA');
  assert.equal(r.cases[0].diff.expected, '3');
  const hidden = r.cases[1];
  assert.equal(hidden.hidden, true);
  assert.equal(hidden.input, undefined);
  assert.equal(hidden.expected, undefined);
  assert.equal(hidden.actual, undefined);
  assert.equal(hidden.diff, undefined);
  assert.equal(hidden.category, '边界：结果为 0');
});

test('WA：只差格式时给出格式提示', async () => {
  // 期望 "1 2" 在同一行，程序却分两行输出
  const src = AB_OK.replace('printf("%d\\n", a + b);', 'printf("%d\\n%d\\n", a, b);');
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '1 2', output: '1 2' }] });
  assert.equal(r.verdict, 'WA');
  assert.equal(r.cases[0].reason, 'format');
});

test('AC：行末空格与末尾空行被忽略', async () => {
  const src = AB_OK.replace('printf("%d\\n", a + b);', 'printf("%d   \\n\\n\\n", a + b);');
  const r = await judgeSubmission({ files: main(src), tests: [AB_TESTS[0]] });
  assert.equal(r.verdict, 'AC');
});

test('CE：编译错误，带中文解释', async () => {
  const r = await judgeSubmission({ files: main('#include <stdio.h>\nint main(void) {\n    printf("hi\\n")\n    return 0;\n}\n'), tests: AB_TESTS });
  assert.equal(r.verdict, 'CE');
  const e = r.compile.diagnostics.find((d) => d.level === 'error');
  assert.ok(e, r.compile.output);
  assert.equal(e.line, 3);
  assert.match(e.hint, /分号/);
  assert.match(r.compile.output, /expected ';'/);
  assert.doesNotMatch(r.compile.output, /c-learn-judge/); // 不暴露临时目录
});

test('CE：链接错误（未定义的函数）', async () => {
  const r = await judgeSubmission({
    files: { 'main.c': '#include "util.h"\nint main(void) { return add(1, 2) == 3 ? 0 : 1; }\n', 'util.h': 'int add(int a, int b);\n' },
    tests: [{ input: '', output: '' }],
  });
  assert.equal(r.verdict, 'CE');
  assert.ok(r.compile.diagnostics.some((d) => d.linker && /add/.test(d.message)), r.compile.output);
});

test('多文件编译 AC', async () => {
  const r = await judgeSubmission({
    files: {
      'main.c': '#include <stdio.h>\n#include "util.h"\nint main(void) { printf("%d\\n", add(40, 2)); return 0; }\n',
      'util.h': '#ifndef UTIL_H\n#define UTIL_H\nint add(int a, int b);\n#endif\n',
      'util.c': '#include "util.h"\nint add(int a, int b) { return a + b; }\n',
    },
    tests: [{ input: '', output: '42' }],
  });
  assert.equal(r.verdict, 'AC', r.compile.output);
});

test('安全：拒绝 system() 与 <windows.h>', async () => {
  const r = await judgeSubmission({ files: main('#include <stdlib.h>\nint main(void) { system("dir"); return 0; }\n'), tests: AB_TESTS });
  assert.equal(r.verdict, 'CE');
  assert.equal(r.compile.security, true);
  assert.match(r.compile.output, /system/);
  const r2 = await judgeSubmission({ files: main('#include <windows.h>\nint main(void) { return 0; }\n'), tests: AB_TESTS });
  assert.equal(r2.verdict, 'CE');
  assert.match(r2.compile.output, /windows\.h/);
  // 注释和字符串里出现 system 不应误判
  const r3 = await judgeSubmission({ files: main('#include <stdio.h>\n// system("x")\nint main(void) { puts("system(1)"); return 0; }\n'), tests: [{ input: '', output: 'system(1)' }] });
  assert.equal(r3.verdict, 'AC', r3.compile.output);
});

test('安全：绕过黑名单（函数指针）也无法创建子进程', async () => {
  // 用宏拼接绕过文本黑名单 —— 第二道防线 Job Object 阻止创建进程
  const src = `#include <stdio.h>
#include <stdlib.h>
#define CAT(a, b) a##b
int main(void) {
    int (*f)(const char *) = CAT(sys, tem);
    int r = f("echo PWNED");
    printf("%d\\n", r);
    return 0;
}
`;
  const r = await runCode({ files: main(src) });
  assert.doesNotMatch(r.stdout, /PWNED/);
  assert.match(r.stdout, /-1/);
});

test('TLE：死循环', async () => {
  const r = await judgeSubmission({ files: main('int main(void) { volatile unsigned x = 0; for (;;) x++; }\n'), tests: [AB_TESTS[0]] });
  assert.equal(r.verdict, 'TLE');
  assert.equal(r.cases[0].reason, 'cpu');
});

test('TLE：等待不存在的输入（scanf 返回值未检查导致死循环）', async () => {
  const src = `#include <stdio.h>
int main(void) {
    int x, sum = 0;
    while (scanf("%d", &x) != 0) sum += x;   /* 错误：EOF 时返回 -1，不是 0 */
    printf("%d\\n", sum);
    return 0;
}
`;
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '1 2 3', output: '6' }] });
  assert.equal(r.verdict, 'TLE');
});

test('MLE：堆内存超过 256MB', async () => {
  const src = `#include <stdio.h>
#include <stdlib.h>
#include <string.h>
int main(void) {
    for (int i = 0; i < 100; i++) {
        char *p = malloc(16u << 20);
        if (!p) return 0;
        memset(p, 1, 16u << 20);
    }
    return 0;
}
`;
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '', output: '' }] });
  assert.equal(r.verdict, 'MLE');
  assert.equal(r.cases[0].reason, 'heap');
});

test('RE：AddressSanitizer 堆越界，定位到源码行', async () => {
  const src = `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    int *a = malloc(5 * sizeof *a);
    if (!a) return 1;
    for (int i = 0; i <= 5; i++) a[i] = i;
    printf("%d\\n", a[0]);
    free(a);
    return 0;
}
`;
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '', output: '0' }] });
  assert.equal(r.verdict, 'RE');
  const s = r.cases[0].sanitizer;
  assert.equal(s.kind, 'heap-buffer-overflow');
  assert.equal(s.title, '堆内存越界访问');
  assert.deepEqual([s.location.file, s.location.line], ['main.c', 6]);
  assert.match(s.explanation, /写入 4 字节/);
  // 报告里不能出现临时目录（其中含有用户名）
  assert.doesNotMatch(s.raw, /c-learn-judge|AppData/);
  assert.match(s.raw, /in main main\.c:6/);
});

test('RE：释放后使用、重复释放、返回局部变量地址', async () => {
  const cases = [
    ['#include <stdio.h>\n#include <stdlib.h>\nint main(void) { int *p = malloc(sizeof *p); if (!p) return 1; *p = 1; free(p); printf("%d\\n", *p); return 0; }\n', 'heap-use-after-free'],
    ['#include <stdlib.h>\nint main(void) { int *p = malloc(4); free(p); free(p); return 0; }\n', 'double-free'],
    ['#include <stdio.h>\nint *f(void) { int x = 42; int *p = &x; return p; }\nint main(void) { int *p = f(); printf("%d\\n", *p); return 0; }\n', 'stack-use-after-return'],
  ];
  for (const [src, kind] of cases) {
    const r = await runCode({ files: main(src) });
    assert.equal(r.verdict, 'RE', `${kind}: ${JSON.stringify(r).slice(0, 400)}`);
    assert.equal(r.sanitizer.kind, kind);
  }
});

test('RE：无限递归栈溢出', async () => {
  const r = await runCode({ files: main('int f(int n) { volatile char buf[64]; buf[0] = (char)n; return f(n + 1) + buf[0]; }\nint main(void) { return f(0); }\n') });
  assert.equal(r.verdict, 'RE');
  assert.equal(r.sanitizer.kind, 'stack-overflow');
});

test('RE：main 返回非 0', async () => {
  const r = await judgeSubmission({ files: main('int main(void) { return 7; }\n'), tests: [{ input: '', output: '' }] });
  assert.equal(r.verdict, 'RE');
  assert.match(r.cases[0].message, /退出码是 7/);
});

test('UB：有符号整数溢出、空指针、除以零', async () => {
  const cases = [
    ['#include <stdio.h>\n#include <limits.h>\nint main(void) { int x; if (scanf("%d", &x) != 1) return 1; printf("%d\\n", x + 1); return 0; }\n', `${2147483647}`, '有符号整数溢出', 3],
    ['#include <stdio.h>\nint main(void) { int *p = NULL; int k; if (scanf("%d", &k) != 1) return 1; if (k) p = &k; printf("%d\\n", *p); return 0; }\n', '0', '空指针解引用', 2],
    ['#include <stdio.h>\nint main(void) { int a, b; if (scanf("%d %d", &a, &b) != 2) return 1; printf("%d\\n", a / b); return 0; }\n', '1 0', '除以零', 2],
  ];
  for (const [src, input, title, line] of cases) {
    const r = await runCode({ files: main(src), stdin: input });
    assert.equal(r.verdict, 'UB', `${title}: ${JSON.stringify(r).slice(0, 500)}`);
    assert.equal(r.sanitizer.title, title);
    assert.equal(r.sanitizer.location.line, line);
  }
});

test('LEAK：要求检查泄漏的题目', async () => {
  const src = `#include <stdio.h>
#include <stdlib.h>
typedef struct Node { int v; struct Node *next; } Node;
int main(void) {
    Node *head = NULL;
    for (int i = 0; i < 3; i++) {
        Node *n = malloc(sizeof *n);
        if (!n) return 1;
        n->v = i; n->next = head; head = n;
    }
    for (Node *p = head; p; p = p->next) printf("%d ", p->v);
    printf("\\n");
    free(head);
    return 0;
}
`;
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '', output: '2 1 0' }], checkLeaks: true });
  assert.equal(r.verdict, 'LEAK');
  assert.equal(r.cases[0].leaks[0].line, 7);
  assert.equal(r.cases[0].leaks[0].count, 2);
  const r2 = await judgeSubmission({ files: main(src), tests: [{ input: '', output: '2 1 0' }], checkLeaks: false });
  assert.equal(r2.verdict, 'AC');
});

test('输出超过 64KB 被截断', async () => {
  const r = await runCode({ files: main('#include <stdio.h>\nint main(void) { for (;;) puts("spam"); }\n') });
  assert.equal(r.stdoutTruncated, true);
  assert.equal(r.verdict, 'WA');
  assert.ok(r.stdout.length <= 64 * 1024);
});

test('运行：-O0 与 -O2 行为不同（UB 演示用）', async () => {
  // 有符号溢出：-O2 下编译器假设 i + 1 > i 恒成立
  const src = `#include <stdio.h>
#include <limits.h>
int check(int i) { return i + 1 > i; }
int main(void) { printf("%d\\n", check(INT_MAX)); return 0; }
`;
  const o0 = await runCode({ files: main(src), options: { opt: '-O0', sanitize: false } });
  const o2 = await runCode({ files: main(src), options: { opt: '-O2', sanitize: false } });
  assert.equal(o0.stdout.trim(), '0');
  assert.equal(o2.stdout.trim(), '1');
});

test('静态扫描：malloc/scanf 返回值、%s 无宽度、realloc 自赋值、未初始化', async () => {
  const src = `#include <stdio.h>
#include <stdlib.h>
int main(void) {
    int n;
    int sum;
    char name[16];
    scanf("%d", &n);
    scanf("%s", name);
    int *a = malloc(n * sizeof *a);
    a = realloc(a, 2 * n * sizeof *a);
    sum += n;
    printf("%d %s\\n", sum, name);
    free(a);
    return 0;
}
`;
  const r = await runCode({ files: main(src), stdin: '3 bob' });
  const rules = new Set(r.staticIssues.map((x) => `${x.rule}@${x.line}`));
  for (const want of ['scanf-return-unused@7', 'scanf-unbounded-string@8', 'unchecked-alloc@9', 'realloc-self-assign@10', 'uninitialized@11']) {
    assert.ok(rules.has(want), `缺少 ${want}，实际：${[...rules].join(', ')}`);
  }
  // 正确代码不应有静态警告
  const ok = await runCode({ files: main(AB_OK), stdin: '1 2' });
  assert.deepEqual(ok.staticIssues, []);
});

test('安全：程序只能写自己的工作目录（低完整性级别）', async () => {
  const fs = await import('node:fs');
  const os = await import('node:os');
  const path = await import('node:path');
  // 在用户目录下放一个"受害"文件，学习者程序试图覆盖和删除它
  const victim = path.join(os.tmpdir(), `clearn-victim-${process.pid}.txt`);
  fs.writeFileSync(victim, 'keep');
  const p = victim.replace(/\\/g, '/');
  const src = `#include <stdio.h>
int main(void) {
    FILE *f = fopen("${p}", "w");
    printf("write:%s\\n", f ? "yes" : "no");
    if (f) fclose(f);
    printf("remove:%s\\n", remove("${p}") == 0 ? "yes" : "no");
    FILE *g = fopen("local.txt", "w");
    printf("local:%s\\n", g ? "yes" : "no");
    if (g) fclose(g);
    return 0;
}
`;
  try {
    const r = await runCode({ files: main(src) });
    assert.equal(r.stdout, 'write:no\nremove:no\nlocal:yes\n', JSON.stringify(r).slice(0, 400));
    assert.equal(fs.readFileSync(victim, 'utf8'), 'keep');
  } finally {
    fs.rmSync(victim, { force: true });
  }
});

test('文件读写题：提供输入文件、检查输出文件', async () => {
  const src = `#include <stdio.h>
int main(void) {
    FILE *in = fopen("data.txt", "r");
    if (!in) { perror("data.txt"); return 1; }
    FILE *out = fopen("result.txt", "w");
    if (!out) { fclose(in); return 1; }
    int x, sum = 0;
    while (fscanf(in, "%d", &x) == 1) sum += x;
    fprintf(out, "%d\\n", sum);
    fclose(in);
    fclose(out);
    printf("done\\n");
    return 0;
}
`;
  const tests = [
    { input: '', output: 'done', files: { 'data.txt': '1 2 3\n' }, expectFiles: [{ name: 'result.txt', content: '6\n' }] },
    { input: '', output: 'done', files: { 'data.txt': '' }, expectFiles: [{ name: 'result.txt', content: '0\n' }], hidden: true, category: '空文件' },
  ];
  const r = await judgeSubmission({ files: main(src), tests });
  assert.equal(r.verdict, 'AC', JSON.stringify(r.cases, null, 1));
  // 忘记写文件 → WA，并提示文件不存在
  const r2 = await judgeSubmission({ files: main(src.replace('"result.txt"', '"reslut.txt"')), tests });
  assert.equal(r2.verdict, 'WA');
  assert.equal(r2.cases[0].reason, 'file-missing');
  // 缺少输入文件 → 程序 return 1 → RE
  const r3 = await judgeSubmission({ files: main(src.replace('"data.txt", "r"', '"date.txt", "r"')), tests });
  assert.equal(r3.verdict, 'RE');
});

test('文件读写题：逐字节比较（文本模式下 \\n 被写成 \\r\\n）', async () => {
  const mk = (mode) => `#include <stdio.h>
int main(void) {
    FILE *f = fopen("out.bin", "${mode}");
    if (!f) return 1;
    fputs("a\\nb\\n", f);
    fclose(f);
    return 0;
}
`;
  const tests = [{ input: '', output: '', expectFiles: [{ name: 'out.bin', content: 'a\nb\n', compare: 'bytes' }] }];
  assert.equal((await judgeSubmission({ files: main(mk('wb')), tests })).verdict, 'AC');
  const text = await judgeSubmission({ files: main(mk('w')), tests });
  assert.equal(text.verdict, 'WA');
  assert.equal(text.cases[0].fileDiff.actualBytes, 6); // Windows 文本模式：每个 \n 变成 \r\n
});

test('函数实现题：隐藏测试驱动 + 泄漏检查', async () => {
  const harnessFiles = {
    'stack.h': '#ifndef STACK_H\n#define STACK_H\ntypedef struct Stack Stack;\nStack *stack_new(void);\nint stack_push(Stack *s, int v);\nint stack_pop(Stack *s, int *out);\nvoid stack_free(Stack *s);\n#endif\n',
    'harness.c': `#include <stdio.h>
#include "stack.h"
int main(void) {
    Stack *s = stack_new();
    if (!s) return 1;
    int n, v;
    if (scanf("%d", &n) != 1) return 1;
    for (int i = 0; i < n; i++) { if (scanf("%d", &v) != 1) return 1; stack_push(s, v); }
    while (stack_pop(s, &v)) printf("%d ", v);
    printf("\\n");
    stack_free(s);
    return 0;
}
`,
  };
  const good = `#include <stdlib.h>
#include "stack.h"
typedef struct Node { int v; struct Node *next; } Node;
struct Stack { Node *top; };
Stack *stack_new(void) { Stack *s = malloc(sizeof *s); if (s) s->top = NULL; return s; }
int stack_push(Stack *s, int v) { Node *n = malloc(sizeof *n); if (!n) return 0; n->v = v; n->next = s->top; s->top = n; return 1; }
int stack_pop(Stack *s, int *out) { Node *n = s->top; if (!n) return 0; *out = n->v; s->top = n->next; free(n); return 1; }
void stack_free(Stack *s) { int v; while (stack_pop(s, &v)) {} free(s); }
`;
  const tests = [{ input: '3 1 2 3', output: '3 2 1' }, { input: '0', output: '', hidden: true, category: '空栈' }];
  const r = await judgeSubmission({ files: { 'solution.c': good }, harnessFiles, tests, checkLeaks: true });
  assert.equal(r.verdict, 'AC', r.compile.output + JSON.stringify(r.cases));
  // stack_free 只释放结构体、不释放剩余节点 → 这里节点都已弹出，所以改成 pop 时不 free 节点
  const leaky = good.replace('s->top = n->next; free(n);', 's->top = n->next;');
  const r2 = await judgeSubmission({ files: { 'solution.c': leaky }, harnessFiles, tests, checkLeaks: true });
  assert.equal(r2.verdict, 'LEAK');
  assert.ok(r2.cases[0].leaks.some((l) => l.file === 'solution.c' && l.line === 6), JSON.stringify(r2.cases[0].leaks));
  // 不能用同名文件替换测试驱动
  const r3 = await judgeSubmission({ files: { 'solution.c': good, 'harness.c': 'int main(void){return 0;}' }, harnessFiles, tests });
  assert.equal(r3.verdict, 'CE');
});

test('判题器不能替学习者包含头文件：没有 #include <stdlib.h> 时调用 malloc/llabs 必须编译失败', async () => {
  for (const call of ['malloc(4)', 'llabs(-3LL)', 'calloc(1, 4)']) {
    const r = await runCode({ files: main(`#include <stdio.h>\nint main(void) { void *p = (void *)(long long)${call}; printf("%p\\n", p); return 0; }\n`) });
    assert.equal(r.verdict, 'CE', `${call}: ${r.verdict}`);
  }
});

test('泄漏检查只统计学习者代码，不把 C 运行库启动时的内部分配算作泄漏', async () => {
  const src = '#include <stdio.h>\n#include <stdlib.h>\nint main(void) { char *s = malloc(8); if (!s) return 1; free(s); puts("ok"); return 0; }\n';
  const r = await judgeSubmission({ files: main(src), tests: [{ input: '', output: 'ok' }], checkLeaks: true });
  assert.equal(r.verdict, 'AC', JSON.stringify(r.cases));
});
