export const LEVELS = ['L1', 'L2', 'L3', 'L4', 'L5'];
export const LEVEL_NAME = { L1: '入门', L2: '基础', L3: '进阶', L4: '核心', L5: '面试级' };

export const VERDICT = {
  AC: { text: '通过', tone: 'ok' },
  WA: { text: '答案错误', tone: 'err' },
  TLE: { text: '运行超时', tone: 'warn' },
  MLE: { text: '内存超限', tone: 'warn' },
  RE: { text: '运行错误', tone: 'err' },
  CE: { text: '编译错误', tone: 'err' },
  UB: { text: '未定义行为', tone: 'err' },
  LEAK: { text: '内存泄漏', tone: 'warn' },
  OK: { text: '运行结束', tone: 'ok' },
};

export const SPECIAL_NAME = {
  'pointer-reasoning': '指针关系推理',
  'memory-layout': '内存布局',
  'ub-analysis': 'UB 辨析',
  'ds-implementation': '手写数据结构',
  'link-diagnosis': '编译链接诊断',
  'expr-reasoning': '表达式求值推理',
  'type-reasoning': '类型大小与范围推理',
  'interface-impl': '按接口实现函数',
};

export const KP_STATUS = {
  new: { text: '未开始', tone: '' },
  learning: { text: '学习中', tone: 'accent' },
  mastered: { text: '已掌握', tone: 'ok' },
};
