// 校验知识体系文件 content/curriculum.json：
//   1. 结构：字段齐全、ID 唯一且格式正确、stage/group 存在
//   2. 依赖：prerequisites 指向存在的知识点、无环（拓扑可排序）、不依赖更后阶段
//   3. 覆盖：docs/REQUIREMENTS.md 第二节中点名的每一个主题，都被至少一个知识点的 covers 覆盖
//   4. 输出：知识点总数与各阶段/分组/难度分布
// 运行：node scripts/check-curriculum.mjs
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const cur = JSON.parse(fs.readFileSync(path.join(root, 'content', 'curriculum.json'), 'utf8'));

/**
 * 需求第二节逐项列出的主题（按阶段）。每一项都必须出现在该阶段某个知识点的 covers 中。
 * 这里的文字与 curriculum.json 中 covers 的写法一一对应。
 */
const REQUIRED = {
  s1: [
    '开发环境', '编译流程', '预处理', '编译', '汇编', '链接',
    'main 的签名', 'main 的返回值', '#include 的两种形式', '#include 搜索路径差异',
    'char', 'short', 'int', 'long', 'float', 'double', '表示范围', 'sizeof 运算符',
    '变量', '常量', 'const', '#define', '字面量后缀',
    '算术运算符', '关系运算符', '逻辑运算符', '位运算', '赋值运算符', '逗号运算符', '优先级与结合性',
    'a & b == c', 'i = i++',
    'printf 格式说明符', 'printf 返回值', 'scanf 格式说明符', 'scanf 返回值', '缓冲区问题',
    'if/else', 'switch', 'fall-through', 'for', 'while', 'do-while', 'break', 'continue', 'goto',
    '函数声明与定义', '值传递', '作用域', '生命周期', '递归的栈展开',
  ],
  s2: [
    '一维数组', '一维数组的内存布局', '二维数组', '二维数组的内存布局', '数组名退化为指针',
    'sizeof(arr) 在函数内外差异', '变长数组（VLA）',
    'C 字符串的本质', 'char[] 与 char * 的区别', 'strlen', 'strcpy', 'strcat', 'strcmp',
    'strlen/strcpy/strcat/strcmp 的安全版本与非安全版本', '字符串字面量的存储位置',
    'sizeof("hello") 与 strlen("hello") 的区别', 'char *s = "abc"; s[0]=\'x\' 的未定义行为',
    '指针的声明与解引用', '指针算术', '类型大小对步长的影响',
    'const int *p', 'int * const p', 'const int * const p',
    '多级指针', '函数指针', '回调', 'void * 的转换规则', '野指针', '悬垂指针',
    '指针与数组的等价与不等价', '&arr 与 arr 的类型差异', 'arr 在 sizeof 和 & 下的行为',
  ],
  s3: [
    '调用约定', '参数压栈顺序', '返回值传递方式', 'cdecl 与 stdcall 的差异',
    '递归的执行栈', '栈帧布局', '展示每一层栈帧的 n 值和返回地址', '尾递归的优化条件',
    'static 函数', 'static 局部变量的作用域和存储期', 'extern 与多文件编译', '头文件卫士',
    '链接属性', '内部链接与外部链接', 'inline 的语义',
  ],
  s4: [
    'struct 的定义', 'struct 的初始化', 'struct 的嵌套', '结构体指针成员', '自引用（链表节点的定义基础）',
    'typedef 的正确用法与陷阱', 'union 的内存共享语义', '类型双关（type punning）的合法/未定义边界',
    'enum 的本质是 int', '内存对齐规则', 'offsetof 宏', '#pragma pack 的效果',
    '位域的内存布局', '位域的不可移植性', '结构体值传递的代价', '结构体指针传递',
    'sizeof 和 offsetof 验证不同对齐设置', '调整成员顺序可以减小结构体大小',
  ],
  s5: [
    'malloc', 'calloc', 'realloc', 'free', '返回值检查', '内存泄漏的检测思路', '悬垂指针的产生与避免',
    'free 后重复释放', 'realloc 失败时的安全模式', '栈与堆的本质区别', '分配速度', '生命周期', '大小限制', '碎片问题',
    '未定义行为', '数组越界读写', '有符号整数溢出', '空指针解引用', '未初始化变量读取', 'i = i++',
    'printf 格式说明符与参数类型不匹配', 'memcpy 重叠区域', '字符串字面量修改', '函数返回局部变量的地址',
    '-O0 vs -O2', '能跑不等于正确',
  ],
  s6: [
    'fopen', 'fclose', 'fread', 'fwrite', 'fprintf', 'fscanf', 'fgets', 'fputs', '返回值语义',
    '文本模式与二进制模式的差异', '换行处理', 'fseek', 'ftell', 'rewind',
    '标准流', 'stdin', 'stdout', 'stderr', '重定向',
    '宏定义', '对象宏', '函数宏', '宏展开的陷阱', '缺少括号导致的优先级错误', '多次求值副作用',
    '# 运算符', '## 运算符', '条件编译', '#if', '#ifdef', '#ifndef', '#elif', '#else', '#endif',
    '#include 的尖括号与双引号搜索策略', '预定义宏', '__FILE__', '__LINE__', '__DATE__', '__func__',
  ],
  s7: [
    '单向链表', '双向链表', '增删查改', '链表反转', '栈（数组实现）', '栈（链表实现）',
    '循环数组', '队列（链表实现）', '哈希表（链地址法）', '二叉搜索树的基本操作',
    '快速排序', '归并排序', '二分查找', '循环队列的 front/rear 条件判断',
    '面试：内存布局', '面试：static/extern/volatile/const 的作用', '面试：指针与数组的区别',
    '面试：结构体对齐', '面试：malloc 与 free 的配对', '面试：编译链接过程',
  ],
};

const errors = [];
const warn = [];
const err = (m) => errors.push(m);

// ---------- 1. 结构 ----------
const stages = new Map(cur.stages.map((s) => [s.id, s]));
const groups = new Map();
for (const s of cur.stages) for (const g of s.groups) groups.set(g.id, s.id);
const kps = cur.knowledgePoints;
const byId = new Map();
const ID_RE = /^s[1-7]-[a-z0-9]+(-[a-z0-9]+)*$/;
const REQUIRED_FIELDS = ['id', 'title', 'stage', 'group', 'difficulty', 'summary', 'covers', 'prerequisites', 'associated_problem_ids', 'memoryDiagram'];
kps.forEach((k, i) => {
  if (typeof k !== 'object' || k === null) return err(`第 ${i} 项不是对象：${JSON.stringify(k)}`);
  for (const f of REQUIRED_FIELDS) if (!(f in k)) err(`${k.id || '#' + i} 缺少字段 ${f}`);
  if (!ID_RE.test(k.id)) err(`ID 格式不正确：${k.id}`);
  if (byId.has(k.id)) err(`ID 重复：${k.id}`);
  byId.set(k.id, k);
  if (!stages.has(k.stage)) err(`${k.id} 的 stage 不存在：${k.stage}`);
  if (!k.id.startsWith(k.stage + '-')) err(`${k.id} 的 ID 前缀与 stage ${k.stage} 不一致`);
  if (groups.get(k.group) !== k.stage) err(`${k.id} 的 group ${k.group} 不属于 ${k.stage}`);
  if (!/^L[1-5]$/.test(k.difficulty)) err(`${k.id} 的 difficulty 不合法：${k.difficulty}`);
  if (!k.summary || k.summary.length < 20) err(`${k.id} 的 summary 过短（只有标题或一句话的占位不允许）`);
  if (!Array.isArray(k.covers) || !k.covers.length) err(`${k.id} 的 covers 为空`);
});
for (const s of cur.stages) {
  for (const g of s.groups) if (!kps.some((k) => k.group === g.id)) err(`分组 ${g.id} 没有任何知识点`);
}

// ---------- 2. 依赖 ----------
const stageOrder = (id) => stages.get(byId.get(id)?.stage)?.order ?? 99;
for (const k of kps) {
  for (const p of k.prerequisites) {
    if (!byId.has(p)) err(`${k.id} 的前置知识点不存在：${p}`);
    else if (p === k.id) err(`${k.id} 依赖自身`);
    else if (stageOrder(p) > stageOrder(k.id)) err(`${k.id}（阶段 ${stageOrder(k.id)}）依赖了更后阶段的 ${p}（阶段 ${stageOrder(p)}）`);
  }
}
// 拓扑排序检查环
const indeg = new Map(kps.map((k) => [k.id, 0]));
for (const k of kps) for (const p of k.prerequisites) if (byId.has(p)) indeg.set(k.id, indeg.get(k.id) + 1);
const queue = [...indeg].filter(([, d]) => d === 0).map(([id]) => id);
let visited = 0;
const dependents = new Map(kps.map((k) => [k.id, []]));
for (const k of kps) for (const p of k.prerequisites) if (dependents.has(p)) dependents.get(p).push(k.id);
while (queue.length) {
  const id = queue.shift();
  visited++;
  for (const d of dependents.get(id)) {
    indeg.set(d, indeg.get(d) - 1);
    if (indeg.get(d) === 0) queue.push(d);
  }
}
if (visited !== kps.length) err(`前置依赖存在环：${[...indeg].filter(([, d]) => d > 0).map(([id]) => id).join(', ')}`);
// 同阶段内依赖了排在后面的知识点：允许（学习顺序由拓扑序决定），但提示
const pos = new Map(kps.map((k, i) => [k.id, i]));
for (const k of kps) for (const p of k.prerequisites) if (pos.get(p) > pos.get(k.id)) warn.push(`${k.id} 依赖了排在它后面的 ${p}（侧栏顺序与学习顺序不一致）`);

// ---------- 3. 覆盖 ----------
const missing = [];
for (const [sid, topics] of Object.entries(REQUIRED)) {
  const coversInStage = new Set(kps.filter((k) => k.stage === sid).flatMap((k) => k.covers));
  for (const t of topics) if (!coversInStage.has(t)) missing.push(`${sid}: ${t}`);
}
if (missing.length) err(`以下需求主题没有被任何知识点覆盖：\n  - ${missing.join('\n  - ')}`);

// ---------- 4. 统计 ----------
console.log(`知识点总数：${kps.length}\n`);
console.log('阶段 | 名称 | 知识点数 | 难度分布 | 需画内存图');
for (const s of cur.stages) {
  const list = kps.filter((k) => k.stage === s.id);
  const diff = ['L1', 'L2', 'L3', 'L4', 'L5'].map((d) => `${d}:${list.filter((k) => k.difficulty === d).length}`).join(' ');
  console.log(`${s.order} | ${s.title} | ${list.length} | ${diff} | ${list.filter((k) => k.memoryDiagram).length}`);
  for (const g of s.groups) console.log(`    - ${g.title}：${list.filter((k) => k.group === g.id).length}`);
}
const reqTotal = Object.values(REQUIRED).reduce((a, b) => a + b.length, 0);
console.log(`\n需求主题覆盖：${reqTotal - missing.length} / ${reqTotal}`);
if (warn.length) console.log(`\n提示（${warn.length}）：\n  - ${warn.join('\n  - ')}`);
if (errors.length) {
  console.error(`\n❌ 校验失败（${errors.length} 个问题）：\n- ${errors.join('\n- ')}`);
  process.exit(1);
}
console.log('\n✅ 校验通过');
