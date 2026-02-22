const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const cTopics = [
    {
        id: 'c_pointers',
        title: 'Pointers & Memory Addresses',
        icon: '🎯',
        code: `int x = 42;\nint *p = &x;   // p holds address of x\n*p = 100;      // dereference: x is now 100\nprintf("%d", x); // 100`,
        desc: 'A pointer stores a memory address. Dereferencing (*p) reads/writes that address.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('mem', [42, '?', '?'], -3, 0);
            onStep({ title: 'int x = 42 at address 0x100', explanation: 'Variable x is placed at some address in memory. Its value is 42.' });
            engine.arrayHighlight('mem', 0, 0x3b82f6);
            await delay(1000);
            onStep({ title: 'int *p = &x  →  p stores 0x100', explanation: 'p is a pointer variable. &x returns the address of x. p now holds 0x100 — the address where x lives.' });
            engine.arrayHighlight('mem', 1, 0xfbbf24);
            engine.arrayUpdate('mem', 1, '0x100');
            await delay(1000);
            onStep({ title: '*p = 100  →  dereference and write', explanation: '"Go to address in p → go to 0x100 → write 100 there." x is now 100 without naming it directly!' });
            engine.arrayHighlight('mem', 0, 0x10b981);
            engine.arrayUpdate('mem', 0, 100);
            await delay(1000);
            onStep({ title: 'Pointer arithmetic: p+1 → next int', explanation: 'p+1 advances by sizeof(int) bytes (usually 4). Used to traverse arrays. Wrong pointer = segfault or UB!' });
        }
    },
    {
        id: 'c_memory',
        title: 'Stack vs Heap (malloc/free)',
        icon: '🧠',
        code: `int arr[5];              // stack\nint *p = malloc(5 * sizeof(int)); // heap\nfree(p);                 // must free!`,
        desc: 'Stack is auto-managed. Heap requires malloc/free. Forgetting free = memory leak.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Stack allocation: int arr[5]', explanation: 'Stack frames are LIFO. arr is allocated when function enters. Freed automatically when function returns. O(1) alloc.' });
            engine.graphCreateNode('stack', 'Stack\n[grows down]', -5, 2, 'queue');
            engine.graphCreateNode('frame', 'main() frame\nint arr[5]', -5, -1, 'backend');
            engine.graphConnect('stack', 'frame', true);
            engine.highlight('frame', 0x10b981);
            await delay(1200);
            onStep({ title: 'Heap: malloc(5 * sizeof(int))', explanation: 'malloc() asks OS for 20 bytes on the heap. Returns pointer or NULL on failure. Persists until free().' });
            engine.graphCreateNode('heap', 'Heap\n[grows up]', 5, 2, 'cloud');
            engine.graphCreateNode('block', '20 bytes\nheap block', 5, -1, 'database');
            engine.graphConnect('heap', 'block', true);
            engine.highlight('block', 0xfbbf24);
            await delay(1200);
            onStep({ title: 'free(p)  →  memory returned to OS', explanation: 'Must call free() exactly once. double-free = UB. Forgetting free = memory leak (process keeps growing).' });
            engine.highlight('block', 0xef4444);
            await delay(1000);
            onStep({ title: 'Valgrind / AddressSanitizer detect leaks', explanation: 'Run with -fsanitize=address to catch use-after-free, buffer overflows, memory leaks at runtime.' });
        }
    },
    {
        id: 'c_structs',
        title: 'Structs & Unions',
        icon: '🏗️',
        code: `struct Point { int x; int y; };\nstruct Point p = {3, 4};\nprintf("%d %d", p.x, p.y);`,
        desc: 'Structs group related data. Unions share memory — only one member valid at a time.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'struct = composite data type', explanation: 'struct Point groups x and y. sizeof(Point) = 8 bytes (2 ints × 4). Members stored contiguously in memory.' });
            engine.createArrayAPI('s', [3, 4], -3, 0);
            engine.arrayHighlight('s', 0, 0x3b82f6);
            engine.arrayHighlight('s', 1, 0xec4899);
            await delay(1200);
            onStep({ title: 'p.x = 3, p.y = 4', explanation: 'Dot notation accesses members. Arrow notation (->) for pointer-to-struct: ptr->x is (*ptr).x.' });
            engine.arrayMovePointer('s', 0, 'x');
            engine.arrayMovePointer('s', 1, 'y');
            await delay(1000);
            onStep({ title: 'struct padding for alignment', explanation: 'Compiler adds padding bytes to align members to their natural boundaries. struct {char a; int b;} = 8 bytes, not 5!' });
            engine.graphCreateNode('pad', 'char a (1B)\n[3B padding]\nint b (4B)\n= 8 bytes total', 0, -3, 'security');
            engine.highlight('pad', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'union: all members share address', explanation: 'sizeof(union) = size of largest member. Writing one member and reading another is defined only for type-punning.' });
            engine.graphCreateNode('uni', 'union:\nx (float)\ny (int)\n← same 4 bytes!', 4, 0, 'cache');
            engine.highlight('uni', 0x6366f1);
        }
    },
    {
        id: 'c_arrays',
        title: 'Arrays & Strings',
        icon: '📊',
        code: `int arr[5] = {10, 20, 30, 40, 50};\nchar name[] = "Alice";  // null-terminated\nprintf("%s", name);`,
        desc: 'Arrays are contiguous memory blocks. C strings = char arrays ending in \\0.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('arr', [10, 20, 30, 40, 50]);
            onStep({ title: 'int arr[5] — contiguous memory', explanation: '5 ints × 4 bytes = 20 bytes in one contiguous block. arr[i] = *(arr + i). Array name decays to pointer to first element.' });
            for (let i = 0; i < 5; i++) { engine.arrayHighlight('arr', i, 0x3b82f6); await delay(250); }
            await delay(600);
            onStep({ title: 'char name[] = "Alice" — null-terminated', explanation: '"Alice" stores [A,l,i,c,e,\\0] — 6 bytes. The \\0 (NUL) byte marks the end. strlen() counts until \\0, not including it.' });
            engine.createArrayAPI('str', ['A', 'l', 'i', 'c', 'e', '\\0'], -3, -3);
            for (let i = 0; i < 6; i++) { engine.arrayHighlight('str', i, i === 5 ? 0xef4444 : 0x10b981); await delay(200); }
            await delay(600);
            onStep({ title: 'Buffer overflow: writing past end crashes/exploits', explanation: 'arr[5] is out of bounds. Writing there overwrites adjacent memory — stack smashing. Use strncpy not strcpy. Key: always check bounds!' });
        }
    },
    {
        id: 'c_file_io',
        title: 'File I/O (stdio)',
        icon: '📁',
        code: `FILE *f = fopen("data.txt", "r");\nif (!f) exit(1);\nfscanf(f, "%d", &x);\nfclose(f);`,
        desc: 'fopen returns a FILE* handle. Always check NULL and always fclose when done.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'fopen("data.txt","r") asks OS for fd', explanation: 'OS returns a file descriptor int. C wraps it in FILE* struct with buffer, position, mode. Returns NULL on failure — always check!' });
            engine.graphCreateNode('os', 'OS Kernel\nfd table', 0, 4, 'kubernetes');
            engine.graphCreateNode('file', 'data.txt\n(fd=3)', 0, 1, 'database');
            engine.graphConnect('os', 'file', false);
            await delay(1200);
            onStep({ title: 'Buffered I/O: reads in 4KB chunks', explanation: 'stdio buffers reads for performance. fread/fscanf fill the buffer once, then serve from memory. fflush() forces write to OS.' });
            engine.graphCreateNode('buf', 'stdio buffer\n4096 bytes', 0, -2, 'cache');
            engine.graphConnect('file', 'buf', true);
            engine.pulse('buf');
            await delay(1000);
            onStep({ title: 'fclose(f) → flush + release fd', explanation: 'fclose writes pending buffer, then releases the fd back to OS. Missing fclose = data loss or fd leak (max ~1024 open files).' });
            engine.highlight('file', 0xef4444);
            engine.highlight('buf', 0xef4444);
        }
    },
    {
        id: 'c_preprocessor',
        title: 'Preprocessor & Macros',
        icon: '⚙️',
        code: `#define PI 3.14159\n#define MAX(a,b) ((a)>(b)?(a):(b))\n#ifdef DEBUG\n  printf("debug mode\\n");\n#endif`,
        desc: 'Preprocessor runs before compilation: handles #define, #include, #ifdef directives.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Compilation Phases: 4 stages', explanation: 'Source → Preprocessor → Compiler → Assembler → Linker. The preprocessor (cpp) runs BEFORE the compiler sees any code.' });
            const stages = [['src', 'source.c', 'frontend'], ['pre', 'preprocessed\n.i file', 'backend'], ['asm', 'assembly\n.s file', 'cache'], ['obj', 'object\n.o file', 'database'], ['exe', 'executable', 'kubernetes']];
            for (const [i, [id, label, type]] of stages.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(stages[i - 1][0], id, true);
                engine.pulse(id);
                await delay(600);
            }
            await delay(500);
            onStep({ title: '#define PI 3.14159 → text substitution', explanation: 'The preprocessor replaces every occurrence of PI with 3.14159 before compilation. No type checking — use const double PI instead for safety.' });
            onStep({ title: '#ifdef DEBUG → conditional compilation', explanation: '#ifdef includes or excludes blocks based on whether a macro is defined. Compile with -DDEBUG to enable. Zero runtime cost!' });
            engine.highlight('pre', 0x10b981);
        }
    },
    {
        id: 'c_functions_scope',
        title: 'Functions & Scope',
        icon: '🔧',
        code: `int add(int a, int b) { return a + b; }\n// C passes by value — caller's vars unchanged\nvoid swap(int *a, int *b) {\n  int t=*a; *a=*b; *b=t; }`,
        desc: 'C is pass-by-value. Pass pointers to modify caller\'s variables.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'C is ALWAYS pass-by-value', explanation: 'add(x, y) copies x and y into new local variables a and b. Changing a inside add() does NOT change x in the caller.' });
            engine.graphCreateNode('caller', 'main()\nx=3, y=4', -4, 2, 'frontend');
            engine.graphCreateNode('fn', 'add(a=3, b=4)\n[copies!]', 4, 2, 'backend');
            engine.graphConnect('caller', 'fn', true);
            engine.highlight('fn', 0xfbbf24);
            await delay(1200);
            onStep({ title: 'To modify: pass pointer (int *a)', explanation: 'swap(&x, &y) passes the addresses of x and y. Inside swap, *a = value at x\'s address. This is "pass by reference" in C.' });
            engine.graphCreateNode('swapfn', 'swap(*a, *b)\n← addresses', 4, -1, 'security');
            engine.graphConnect('caller', 'swapfn', true);
            engine.highlight('swapfn', 0x10b981);
            await delay(1000);
            onStep({ title: 'Call stack grows with each function call', explanation: 'Each call pushes a frame (args + locals + return address). Too-deep recursion overflows the stack → segfault.' });
        }
    },
    {
        id: 'c_bit_manipulation',
        title: 'Bit Manipulation',
        icon: '🔢',
        code: `int x = 0b1010;    // 10\nx |= (1 << 2);    // set bit 2 → 14\nx &= ~(1 << 3);   // clear bit 3 → 6\nint bit = (x >> 1) & 1; // read bit 1`,
        desc: 'Bitwise ops manipulate individual bits. Essential for flags, hardware, compression.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('bits', [1, 0, 1, 0], -3, 0);
            onStep({ title: 'x = 0b1010 = 10 in binary', explanation: 'MSB to LSB: bit3=1, bit2=0, bit1=1, bit0=0. Each bit is a power of 2: 8+0+2+0=10.' });
            for (let i = 0; i < 4; i++) engine.arrayHighlight('bits', i, 0x3b82f6);
            await delay(1200);
            onStep({ title: 'x |= (1 << 2)  →  SET bit 2', explanation: '1 << 2 = 0b0100. OR with x: 1010 | 0100 = 1110 = 14. OR sets bits, AND clears, XOR toggles.' });
            engine.arrayHighlight('bits', 1, 0x10b981);
            engine.arrayUpdate('bits', 1, 1);
            await delay(1000);
            onStep({ title: 'x &= ~(1 << 3)  →  CLEAR bit 3', explanation: '~(1<<3) = 0111. AND with 1110: 1110 & 0111 = 0110 = 6. Tilde (~) flips all bits.' });
            engine.arrayHighlight('bits', 0, 0xef4444);
            engine.arrayUpdate('bits', 0, 0);
            await delay(1000);
            onStep({ title: '(x >> 1) & 1  →  READ a bit', explanation: 'Shift right by 1, then AND with 1 to isolate that bit. Returns 0 or 1. Used for flags, status registers, protocol parsing.' });
        }
    },
];
