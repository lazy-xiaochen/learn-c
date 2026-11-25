---json
{
  "id": "p-s5-stack-vs-heap-1",
  "title": "指针生命周期检查器：栈变量、堆块与悬垂指针",
  "difficulty": "L3",
  "knowledgePoints": ["s5-stack-vs-heap"],
  "special": "pointer-reasoning",
  "judge": { "mode": "stdio", "timeMs": 1000, "compare": "lines" }
}
---

## 题目描述
你在给教学平台写一个**指针生命周期检查器**：它读入一段用简化指令描述的 C 程序执行轨迹，在每次"解引用指针"时判断这个指针指向的对象是否还活着。检查器只做推理，不会真的解引用非法指针，所以它可以在不触发未定义行为的前提下指出悬垂指针。

轨迹里的对象只有两种：

- **栈对象**：用 `decl` 声明，属于当前作用域，离开作用域（`leave`）后失效；
- **堆对象**：用 `new` 申请，属于整个程序，只有 `free` 之后才失效。

指针变量用 `ref`（指向栈对象）、`new`（指向新堆对象）或 `copy`（指向另一个指针当前指向的对象）赋值。指针可以指向另一个作用域里的栈对象——只要那个作用域还没退出，它就是有效的。

### 判定规则
每次执行 `use p` 时，按下面的顺序判断并输出一行：

- `p -> stack`：`p` 指向一个仍然活着的栈对象；
- `p -> heap`：`p` 指向一个还没有释放的堆对象；
- `p -> dangling-stack`：`p` 曾经指向一个栈对象，但该对象所在的作用域已经退出；
- `p -> dangling-heap`：`p` 曾经指向一个堆对象，但该对象已经被 `free`；
- `p -> wild`：`p` 从来没有被赋值过（包括从 wild 指针 `copy` 过来）。

程序结束时（`end`）输出一行 `leak=<块数> <字节数>`，统计所有**已经申请但还没有 free** 的堆对象；即使指向它的指针已经被覆盖或丢失，它仍然算泄漏。

栈对象的失效是**按作用域**的：`leave` 只让当前作用域里声明的栈对象失效，外层作用域的对象仍然有效。堆对象则完全不受 `enter` / `leave` 影响。

## 输入格式
第一行一个整数 `n`：轨迹的事件数。

接下来 `n` 行，每行一个事件，格式为下面之一：

```
enter
leave
decl <name> <size>
new <name> <size>
ref <ptr> <name>
copy <dst> <src>
free <ptr>
use <ptr>
end
```

- `name` 是栈对象名，`ptr` 是指针名，长度不超过 15，只含小写字母、数字和下划线；
- `size` 是对象字节数；
- 栈对象名互不相同；
- 输入保证 `leave` 不会多于 `enter`，`free` 不会作用于没有指向堆对象的指针；
- `end` 是最后一个事件（也可能没有 `use`）。

## 输出格式
按输入顺序，为每个 `use` 输出一行：

```
<ptr> -> <状态>
```

最后输出一行：

```
leak=<块数> <字节数>
```

## 数据范围
- 0 ≤ n ≤ 5000
- 1 ≤ size ≤ 1000000
- 对象数、指针数都不超过 `n`
- 泄漏字节数最大约 5000 × 10⁶ = 5 × 10⁹，超过 `int`，必须用 `long long`

## 示例
### 示例 1
```in
11
decl width 4
ref p width
use p
enter
new buf 16
use buf
leave
use buf
use p
free buf
end
```
```out
p -> stack
buf -> heap
buf -> heap
p -> stack
leak=0 0
```
> `p` 指向外层的 `width`，在 `enter` 之后仍然有效；`buf` 是堆对象，`leave` 只退出作用域，不会释放它，所以离开后 `use buf` 仍然是 `heap`。最后 `free buf` 把堆块释放，结束时没有泄漏。

### 示例 2（边界：离开作用域后的悬垂指针）
```in
11
enter
decl x 4
ref p x
use p
leave
use p
new q 8
copy r q
free q
use r
end
```
```out
p -> stack
p -> dangling-stack
r -> dangling-heap
leak=0 0
```
> `leave` 让 `x` 失效，`p` 于是变成 `dangling-stack`；`q` 被 `free` 之后，别名 `r` 也一起变成 `dangling-heap`。注意悬垂指针本身仍然保存旧地址，检查器只是根据对象的生死给出结论。

## 提示
### 第 1 层
给每个对象记三件事：它是栈还是堆、它在哪个作用域深度声明、它现在是否还活着。指针只需要记"它指向哪个对象"，不需要记地址。

### 第 2 层
`leave` 时，把**当前深度**的所有栈对象标记为失效，然后深度减一；外层对象不要动。`free` 只把堆对象标记为失效，和 `enter` / `leave` 无关。

### 第 3 层
`use` 先看指针有没有被赋值：没有就是 `wild`。有对象之后再看对象类型和存活标志：栈对象死了输出 `dangling-stack`，堆对象死了输出 `dangling-heap`。最后统计泄漏时，要遍历所有堆对象，而不是只统计"还有指针指向"的块——指针被覆盖的块同样泄漏。

## 参考代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXE 5005

typedef struct {
    char name[16];
    int kind;          /* 0 = stack, 1 = heap */
    long long size;
    int depth;
    int alive;
} Obj;

typedef struct {
    char name[16];
    int obj;           /* -1 表示还没有赋值（wild） */
} Ptr;

static Obj objs[MAXE];
static Ptr ptrs[MAXE];
static int obj_count;
static int ptr_count;
static int depth;

static int find_obj(const char *name) {
    for (int i = 0; i < obj_count; i++) {
        if (strcmp(objs[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

static int get_ptr(const char *name) {
    for (int i = 0; i < ptr_count; i++) {
        if (strcmp(ptrs[i].name, name) == 0) {
            return ptrs[i].obj;
        }
    }
    return -1;
}

static void set_ptr(const char *name, int obj) {
    for (int i = 0; i < ptr_count; i++) {
        if (strcmp(ptrs[i].name, name) == 0) {
            ptrs[i].obj = obj;
            return;
        }
    }
    if (ptr_count < MAXE) {
        strcpy(ptrs[ptr_count].name, name);
        ptrs[ptr_count].obj = obj;
        ptr_count++;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXE - 1) {
        return 0;
    }

    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) {
            break;
        }

        if (strcmp(cmd, "enter") == 0) {
            depth++;
        } else if (strcmp(cmd, "leave") == 0) {
            for (int i = 0; i < obj_count; i++) {
                if (objs[i].kind == 0 && objs[i].depth == depth) {
                    objs[i].alive = 0;
                }
            }
            if (depth > 0) {
                depth--;
            }
        } else if (strcmp(cmd, "decl") == 0) {
            char name[16];
            long long size;
            if (scanf("%15s %lld", name, &size) != 2) {
                break;
            }
            if (obj_count < MAXE) {
                strcpy(objs[obj_count].name, name);
                objs[obj_count].kind = 0;
                objs[obj_count].size = size;
                objs[obj_count].depth = depth;
                objs[obj_count].alive = 1;
                obj_count++;
            }
        } else if (strcmp(cmd, "new") == 0) {
            char name[16];
            long long size;
            if (scanf("%15s %lld", name, &size) != 2) {
                break;
            }
            if (obj_count < MAXE) {
                strcpy(objs[obj_count].name, name);
                objs[obj_count].kind = 1;
                objs[obj_count].size = size;
                objs[obj_count].depth = depth;
                objs[obj_count].alive = 1;
                set_ptr(name, obj_count);
                obj_count++;
            }
        } else if (strcmp(cmd, "ref") == 0) {
            char ptr[16];
            char name[16];
            if (scanf("%15s %15s", ptr, name) != 2) {
                break;
            }
            set_ptr(ptr, find_obj(name));
        } else if (strcmp(cmd, "copy") == 0) {
            char dst[16];
            char src[16];
            if (scanf("%15s %15s", dst, src) != 2) {
                break;
            }
            set_ptr(dst, get_ptr(src));
        } else if (strcmp(cmd, "free") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) {
                break;
            }
            int o = get_ptr(ptr);
            if (o >= 0 && objs[o].kind == 1) {
                objs[o].alive = 0;
            }
        } else if (strcmp(cmd, "use") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) {
                break;
            }
            int o = get_ptr(ptr);
            if (o < 0) {
                printf("%s -> wild\n", ptr);
            } else if (objs[o].kind == 0) {
                printf("%s -> %s\n", ptr, objs[o].alive ? "stack" : "dangling-stack");
            } else {
                printf("%s -> %s\n", ptr, objs[o].alive ? "heap" : "dangling-heap");
            }
        } else if (strcmp(cmd, "end") == 0) {
            break;
        }
    }

    int leak_count = 0;
    long long leak_bytes = 0;
    for (int i = 0; i < obj_count; i++) {
        if (objs[i].kind == 1 && objs[i].alive) {
            leak_count++;
            leak_bytes += objs[i].size;
        }
    }
    printf("leak=%d %lld\n", leak_count, leak_bytes);
    return 0;
}
```

## 初始代码
```c file=main.c
#include <stdio.h>
#include <string.h>

#define MAXE 5005

typedef struct {
    char name[16];
    int kind;
    long long size;
    int depth;
    int alive;
} Obj;

typedef struct {
    char name[16];
    int obj;
} Ptr;

static Obj objs[MAXE];
static Ptr ptrs[MAXE];
static int obj_count;
static int ptr_count;
static int depth;

static int find_obj(const char *name) {
    for (int i = 0; i < obj_count; i++) {
        if (strcmp(objs[i].name, name) == 0) {
            return i;
        }
    }
    return -1;
}

static int get_ptr(const char *name) {
    for (int i = 0; i < ptr_count; i++) {
        if (strcmp(ptrs[i].name, name) == 0) {
            return ptrs[i].obj;
        }
    }
    return -1;
}

static void set_ptr(const char *name, int obj) {
    for (int i = 0; i < ptr_count; i++) {
        if (strcmp(ptrs[i].name, name) == 0) {
            ptrs[i].obj = obj;
            return;
        }
    }
    if (ptr_count < MAXE) {
        strcpy(ptrs[ptr_count].name, name);
        ptrs[ptr_count].obj = obj;
        ptr_count++;
    }
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1 || n < 0 || n > MAXE - 1) {
        return 0;
    }

    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) {
            break;
        }

        if (strcmp(cmd, "enter") == 0) {
            depth++;
        } else if (strcmp(cmd, "leave") == 0) {
            /* TODO: 离开作用域时，把当前深度的栈对象标记为失效 */
            if (depth > 0) {
                depth--;
            }
        } else if (strcmp(cmd, "decl") == 0) {
            char name[16];
            long long size;
            if (scanf("%15s %lld", name, &size) != 2) {
                break;
            }
            strcpy(objs[obj_count].name, name);
            objs[obj_count].kind = 0;
            objs[obj_count].size = size;
            objs[obj_count].depth = depth;
            objs[obj_count].alive = 1;
            obj_count++;
        } else if (strcmp(cmd, "new") == 0) {
            char name[16];
            long long size;
            if (scanf("%15s %lld", name, &size) != 2) {
                break;
            }
            strcpy(objs[obj_count].name, name);
            objs[obj_count].kind = 1;
            objs[obj_count].size = size;
            objs[obj_count].depth = depth;
            objs[obj_count].alive = 1;
            set_ptr(name, obj_count);
            obj_count++;
        } else if (strcmp(cmd, "ref") == 0) {
            char ptr[16];
            char name[16];
            if (scanf("%15s %15s", ptr, name) != 2) {
                break;
            }
            set_ptr(ptr, find_obj(name));
        } else if (strcmp(cmd, "copy") == 0) {
            char dst[16];
            char src[16];
            if (scanf("%15s %15s", dst, src) != 2) {
                break;
            }
            set_ptr(dst, get_ptr(src));
        } else if (strcmp(cmd, "free") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) {
                break;
            }
            /* TODO: 把指针指向的堆对象标记为已释放 */
        } else if (strcmp(cmd, "use") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) {
                break;
            }
            int o = get_ptr(ptr);
            if (o < 0) {
                printf("%s -> wild\n", ptr);
            } else {
                printf("%s -> %s\n", ptr, objs[o].kind == 0 ? "stack" : "heap");
            }
        } else if (strcmp(cmd, "end") == 0) {
            break;
        }
    }

    printf("leak=0 0\n");      /* TODO: 统计仍然活着的堆对象 */
    return 0;
}
```

## 复杂度
时间 O(n²)：每个事件都可能线性扫描对象表或指针表（`n ≤ 5000`，最坏约 2500 万次比较，足够快）。
空间 O(n)：对象表和指针表各定长 `MAXE`。

## 常见错误
### 以为离开作用域就会释放堆对象 [WA]
`enter` / `leave` 只影响栈对象。`leave` 之后，堆对象仍然有效，直到 `free`。检查器如果一 `leave` 就把所有对象标记为失效，会把本该是 `heap` 的指针误判成 `dangling-heap`。

```c file=main.c expect=WA
#include <stdio.h>
#include <string.h>

#define MAXE 5005

typedef struct {
    char name[16];
    int kind;
    long long size;
    int depth;
    int alive;
} Obj;
typedef struct { char name[16]; int obj; } Ptr;

static Obj objs[MAXE];
static Ptr ptrs[MAXE];
static int obj_count, ptr_count, depth;

static int get_ptr(const char *name) {
    for (int i = 0; i < ptr_count; i++) if (strcmp(ptrs[i].name, name) == 0) return ptrs[i].obj;
    return -1;
}
static void set_ptr(const char *name, int obj) {
    for (int i = 0; i < ptr_count; i++) if (strcmp(ptrs[i].name, name) == 0) { ptrs[i].obj = obj; return; }
    strcpy(ptrs[ptr_count].name, name);
    ptrs[ptr_count].obj = obj;
    ptr_count++;
}
static int find_obj(const char *name) {
    for (int i = 0; i < obj_count; i++) if (strcmp(objs[i].name, name) == 0) return i;
    return -1;
}

int main(void) {
    int n;
    if (scanf("%d", &n) != 1) return 0;
    for (int e = 0; e < n; e++) {
        char cmd[16];
        if (scanf("%15s", cmd) != 1) break;
        if (strcmp(cmd, "enter") == 0) {
            depth++;
        } else if (strcmp(cmd, "leave") == 0) {
            for (int i = 0; i < obj_count; i++) objs[i].alive = 0;   /* 错：连带堆对象一起杀了 */
            if (depth > 0) depth--;
        } else if (strcmp(cmd, "decl") == 0) {
            char name[16]; long long size;
            if (scanf("%15s %lld", name, &size) != 2) break;
            strcpy(objs[obj_count].name, name);
            objs[obj_count].kind = 0;
            objs[obj_count].size = size;
            objs[obj_count].depth = depth;
            objs[obj_count].alive = 1;
            obj_count++;
        } else if (strcmp(cmd, "new") == 0) {
            char name[16]; long long size;
            if (scanf("%15s %lld", name, &size) != 2) break;
            strcpy(objs[obj_count].name, name);
            objs[obj_count].kind = 1;
            objs[obj_count].size = size;
            objs[obj_count].depth = depth;
            objs[obj_count].alive = 1;
            set_ptr(name, obj_count);
            obj_count++;
        } else if (strcmp(cmd, "ref") == 0) {
            char ptr[16], name[16];
            if (scanf("%15s %15s", ptr, name) != 2) break;
            set_ptr(ptr, find_obj(name));
        } else if (strcmp(cmd, "copy") == 0) {
            char dst[16], src[16];
            if (scanf("%15s %15s", dst, src) != 2) break;
            set_ptr(dst, get_ptr(src));
        } else if (strcmp(cmd, "free") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) break;
            int o = get_ptr(ptr);
            if (o >= 0) objs[o].alive = 0;
        } else if (strcmp(cmd, "use") == 0) {
            char ptr[16];
            if (scanf("%15s", ptr) != 1) break;
            int o = get_ptr(ptr);
            if (o < 0) printf("%s -> wild\n", ptr);
            else if (objs[o].kind == 0) printf("%s -> %s\n", ptr, objs[o].alive ? "stack" : "dangling-stack");
            else printf("%s -> %s\n", ptr, objs[o].alive ? "heap" : "dangling-heap");
        } else if (strcmp(cmd, "end") == 0) {
            break;
        }
    }
    int cnt = 0;
    long long bytes = 0;
    for (int i = 0; i < obj_count; i++) if (objs[i].kind == 1 && objs[i].alive) { cnt++; bytes += objs[i].size; }
    printf("leak=%d %lld\n", cnt, bytes);
    return 0;
}
```

### free 后不标记对象，悬垂堆指针仍判成 heap [WA]
`free` 必须把对应的堆对象标记为失效，否则 `use` 会输出 `heap`。这道题专门考"指针本身没变，但它指向的对象死了"这一层推理。

### 只统计还有指针指向的泄漏 [WA]
泄漏的定义是"申请了但没有 free"，和有没有指针指向无关。指针被覆盖、丢失之后，堆块仍然占着内存。统计时必须遍历所有堆对象，而不是遍历指针表。

### leave 把所有深度的栈对象都标记为失效 [WA]
`leave` 只退出当前作用域，外层作用域的栈对象仍然有效。如果内层函数里 `leave` 把外层的 `width` 也杀了，指向它的指针会被误判成 `dangling-stack`。

## 测试用例
### 01 sample 示例 1
```in
11
decl width 4
ref p width
use p
enter
new buf 16
use buf
leave
use buf
use p
free buf
end
```
```out
p -> stack
buf -> heap
buf -> heap
p -> stack
leak=0 0
```

### 02 sample 示例 2
```in
11
enter
decl x 4
ref p x
use p
leave
use p
new q 8
copy r q
free q
use r
end
```
```out
p -> stack
p -> dangling-stack
r -> dangling-heap
leak=0 0
```

### 03 degenerate 没有任何事件
```in
1
end
```
```out
leak=0 0
```

### 04 trap 指针被覆盖后丢失的堆块
```in
7
new q 8
new q 16
use q
copy r q
free r
use q
end
```
```out
q -> heap
q -> dangling-heap
leak=1 8
```

### 05 trap 外层栈对象在内层仍然有效
```in
11
decl outer 4
ref p outer
enter
decl inner 4
ref q inner
use p
use q
leave
use q
use p
end
```
```out
p -> stack
q -> stack
q -> dangling-stack
p -> stack
leak=0 0
```

### 06 normal 别名、释放与作用域混合
```in
13
new a 24
copy b a
use a
use b
free b
use a
enter
decl x 8
ref p x
use p
leave
use p
end
```
```out
a -> heap
b -> heap
a -> dangling-heap
p -> stack
p -> dangling-stack
leak=0 0
```

### 生成 boundary 800 层嵌套作用域
```js gen
const cases = [];
const depth = 800;
const events = [];
for (let i = 0; i < depth; i++) {
  events.push('enter');
  events.push(`decl s${i} 4`);
  events.push(`ref p${i} s${i}`);
  events.push(`use p${i}`);
}
for (let i = depth - 1; i >= 0; i--) {
  events.push('leave');
  events.push(`use p${i}`);
}
events.push('end');

const out = [];
for (let i = 0; i < depth; i++) out.push(`p${i} -> stack`);
for (let i = depth - 1; i >= 0; i--) out.push(`p${i} -> dangling-stack`);
out.push('leak=0 0');

cases.push({
  kind: 'boundary',
  category: '800 层嵌套作用域，1600 次解引用',
  input: `${events.length}\n${events.join('\n')}\n`,
  output: out.join('\n') + '\n',
});

return cases;
```
