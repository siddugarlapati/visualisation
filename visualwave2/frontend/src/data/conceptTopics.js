/**
 * conceptTopics.js — barrel index
 * Each LANGUAGE has TOPICS with play(engine, onStep) animation functions.
 */
import { cTopics } from './topics/topics_c.js';
import { cppTopics } from './topics/topics_cpp.js';
import { javaTopics } from './topics/topics_java.js';
import { typescriptTopics } from './topics/topics_typescript.js';
import { reactTopics } from './topics/topics_react.js';
import { nodeTopics } from './topics/topics_nodejs.js';
import { sqlTopics } from './topics/topics_sql.js';
import { nosqlTopics } from './topics/topics_nosql.js';
import { apiTopics } from './topics/topics_api.js';
import { bootstrapCssTopics } from './topics/topics_bootstrap_css.js';
import { gitTopics } from './topics/topics_git.js';
import { dockerK8sTopics } from './topics/topics_docker_k8s.js';
import { cloudTopics } from './topics/topics_cloud.js';
import { goTopics, rustTopics } from './topics/topics_go_rust.js';

const delay = (ms) => new Promise(r => setTimeout(r, ms));

// ─────────────────────────────────────────────────────────────
// LANGUAGES
// ─────────────────────────────────────────────────────────────
export const LANGUAGES = [
    { id: 'python', label: 'Python', color: '#3776ab', emoji: '🐍', desc: 'From loops to ML pipelines — 24 topics' },
    { id: 'javascript', label: 'JavaScript', color: '#f7df1e', emoji: '⚡', desc: 'Event loop, closures, async/await' },
    { id: 'typescript', label: 'TypeScript', color: '#3178c6', emoji: '🔷', desc: 'Types, interfaces, generics, utility types' },
    { id: 'react', label: 'React', color: '#61dafb', emoji: '⚛️', desc: 'Components, hooks, Virtual DOM, Redux' },
    { id: 'nodejs', label: 'Node.js', color: '#68a063', emoji: '🟢', desc: 'Event loop, streams, Express, clusters' },
    { id: 'c_lang', label: 'C Language', color: '#a8b9cc', emoji: '🔷', desc: 'Pointers, memory, structs, bit manipulation' },
    { id: 'cpp', label: 'C++', color: '#00599c', emoji: '⚙️', desc: 'OOP, templates, STL, smart pointers, RAII' },
    { id: 'java', label: 'Java', color: '#f89820', emoji: '☕', desc: 'JVM, generics, streams, Spring Boot, GC' },
    { id: 'go', label: 'Go', color: '#00add8', emoji: '🐹', desc: 'Goroutines, channels, interfaces, error handling' },
    { id: 'rust', label: 'Rust', color: '#dea584', emoji: '🦀', desc: 'Ownership, borrowing, lifetimes, zero cost abstractions' },
    { id: 'sql', label: 'SQL & Databases', color: '#336791', emoji: '🗃️', desc: 'SELECT, JOINs, indexes, ACID, normalisation' },
    { id: 'nosql', label: 'NoSQL', color: '#13aa52', emoji: '🍃', desc: 'MongoDB, Redis, Cassandra, CAP theorem' },
    { id: 'api', label: 'REST APIs & Swagger', color: '#85ea2d', emoji: '🔌', desc: 'REST, Auth JWT/OAuth2, GraphQL, OpenAPI' },
    { id: 'bootstrap', label: 'Bootstrap & CSS', color: '#7952b3', emoji: '🎨', desc: 'Grid, flexbox, animations, CSS variables' },
    { id: 'git', label: 'Git', color: '#f05032', emoji: '🌿', desc: 'Commits, branching, rebase, workflows' },
    { id: 'docker_k8s', label: 'Docker & Kubernetes', color: '#2496ed', emoji: '🐳', desc: 'Containers, compose, pods, services, HPA' },
    { id: 'cloud', label: 'Cloud / AWS', color: '#ff9900', emoji: '☁️', desc: 'EC2, S3, Lambda, VPC, RDS, CI/CD' },
    { id: 'dsa', label: 'Data Structures & Algorithms', color: '#10b981', emoji: '🧩', desc: 'Sorting, trees, graphs, DP' },
    { id: 'web', label: 'Web & Networking', color: '#6366f1', emoji: '🌐', desc: 'HTTP, DNS, TCP/IP, WebSockets' },
    { id: 'devops', label: 'DevOps & CI/CD', color: '#e34c26', emoji: '🔄', desc: 'Pipelines, monitoring, IaC' },
];

// ─────────────────────────────────────────────────────────────
// PYTHON TOPICS  (Beginner → Advanced — 25 topics)
// ─────────────────────────────────────────────────────────────
const pythonTopics = [
    // ── Beginner ─────────────────────────────────────────────
    {
        id: 'variables',
        title: 'Variables & Data Types',
        icon: '📦',
        code: `x = 10\npi = 3.14\nname = "Alice"\nactive = True`,
        desc: 'Python is dynamically typed — variables are labels pointing to objects in memory.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Variables are Labels', explanation: 'In Python, variables don\'t hold values — they point to objects. x=10 means "x points to the int object 10" in memory.' });
            const types = [
                { id: 'int_', label: 'x=10\n(int)', color: 0x3b82f6, type: 'backend' },
                { id: 'float_', label: 'pi=3.14\n(float)', color: 0x10b981, type: 'cache' },
                { id: 'str_', label: 'name="Alice"\n(str)', color: 0xfbbf24, type: 'frontend' },
                { id: 'bool_', label: 'active=True\n(bool)', color: 0xec4899, type: 'security' },
                { id: 'none_', label: 'data=None\n(NoneType)', color: 0x94a3b8, type: 'queue' },
            ];
            for (const [i, t] of types.entries()) {
                engine.graphCreateNode(t.id, t.label, -8 + i * 4, 0, t.type);
                engine.highlight(t.id, t.color);
                engine.pulse(t.id);
                onStep({ title: t.label.split('\n')[0], explanation: `type() confirms the type at runtime. Python allocates the object on the heap and returns a reference.` });
                await delay(900);
            }
            onStep({ title: 'id() — Memory Address', explanation: 'id(x) returns the object\'s memory address. CPython caches small ints -5 to 256 — id(1) == id(1) is always True!' });
        }
    },
    {
        id: 'strings',
        title: 'Strings & f-strings',
        icon: '🔤',
        code: `name = "Alice"\nage = 25\ngreeting = f"Hi {name}, you're {age}!"`,
        desc: 'Strings are immutable Unicode sequences. f-strings embed expressions directly.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'String = Immutable Sequence', explanation: 'Python strings are arrays of Unicode code points. They CANNOT be mutated — every operation returns a NEW string object.' });
            engine.createArrayAPI('s', ['H', 'e', 'l', 'l', 'o']);
            await delay(1000);
            onStep({ title: 'Indexing s[0]="H", s[-1]="o"', explanation: 's[0] is "H", s[-1] wraps around to "o". Negative indexing is sugar for s[len(s)-1].' });
            engine.arrayHighlight('s', 0, 0x3b82f6);
            engine.arrayMovePointer('s', 0, 'i=0');
            await delay(800);
            engine.arrayHighlight('s', 4, 0xef4444);
            engine.arrayMovePointer('s', 4, 'i=-1');
            await delay(1000);
            onStep({ title: 'f-string: compile-time expression embedding', explanation: 'f"Hi {name}" is compiled to efficient concatenation. Faster than % and .format(). Any expression works: {2+2}, {obj.method()}.' });
            engine.graphCreateNode('fstr', 'f"Hi {name}"\n→ "Hi Alice"', 0, -3, 'frontend');
            engine.pulse('fstr');
            engine.highlight('fstr', 0x10b981);
        }
    },
    {
        id: 'lists',
        title: 'Lists & Operations',
        icon: '📋',
        code: `nums = [3, 1, 4, 1, 5]\nnums.append(9)\nnums.sort()\nprint(nums[2])  # 3`,
        desc: 'Python\'s dynamic array. Backed by a C array that doubles capacity when full.',
        async play(engine, onStep) {
            engine.reset();
            const arr = [3, 1, 4, 1, 5];
            engine.createArrayAPI('lst', arr.slice());
            onStep({ title: 'List: [3, 1, 4, 1, 5]', explanation: 'Python lists are dynamic arrays. Elements can be any type. Backed by contiguous C array for O(1) random access.' });
            await delay(1000);
            onStep({ title: 'append(9) → O(1) amortised', explanation: 'If internal array is full, Python doubles its capacity. Most appends are O(1), occasional O(n) resize — amortised O(1).' });
            engine.arrayHighlight('lst', arr.length, 0x10b981);
            await delay(1000);
            onStep({ title: '.sort() → Timsort O(n log n)', explanation: 'Python uses Timsort (hybrid merge+insertion sort). Stable, adaptive — extremely fast on nearly-sorted data.' });
            for (let i = 0; i < arr.length; i++) { engine.arrayHighlight('lst', i, 0xfbbf24); await delay(250); }
            onStep({ title: 'Result: Sorted in-place', explanation: 'Use sorted(lst) for a new list without mutating the original. Lists support slicing: lst[1:3], lst[::-1] to reverse.' });
        }
    },
    {
        id: 'dicts',
        title: 'Dictionaries (Hash Maps)',
        icon: '🗂️',
        code: `person = {"name":"Alice","age":25}\nperson["city"] = "Delhi"\nprint(person.get("name"))`,
        desc: 'Key→value mapping backed by a hash table. O(1) average lookup, insert, delete.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Dict = Hash Table', explanation: 'Python dicts use open addressing. hash(key) → bucket index → value stored. O(1) amortised for get/set.' });
            const buckets = [null, null, 'age:25', null, 'name:Alice', null, null, 'city:Delhi'];
            engine.createArrayAPI('hash', buckets);
            await delay(1200);
            onStep({ title: 'hash("name") → bucket 4', explanation: 'Python calls hash("name") → integer → mod bucket_count → index 4. That\'s where "Alice" lives.' });
            engine.arrayHighlight('hash', 4, 0x3b82f6);
            engine.arrayMovePointer('hash', 4, 'key');
            await delay(1000);
            onStep({ title: 'Collision: two keys → same bucket', explanation: 'If two keys hash to same index, Python probes next slots (open addressing). Load factor kept < 2/3 via resizing.' });
            engine.arrayHighlight('hash', 2, 0xfbbf24); engine.arrayHighlight('hash', 7, 0xfbbf24);
            await delay(1000);
            onStep({ title: '.items() iterates key-value pairs', explanation: 'Dicts preserve insertion order (CPython 3.7+). .keys(), .values(), .items() return lightweight view objects.' });
            engine.highlight('hash', 0x10b981);
        }
    },
    {
        id: 'tuples_sets',
        title: 'Tuples & Sets',
        icon: '🔒',
        code: `coords = (10, 20)   # immutable tuple\nunique = {1,2,2,3}  # set → {1,2,3}\n5 in unique          # O(1) lookup!`,
        desc: 'Tuples: immutable sequences. Sets: unordered unique hash-based collections.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Tuple: Immutable Sequence', explanation: 'Tuples are like lists but cannot be modified. Use as dict keys (hashable), function returns, or to signal "don\'t change this".' });
            engine.createArrayAPI('tpl', [10, 20], -4, 2);
            engine.arrayHighlight('tpl', 0, 0x3b82f6); engine.arrayHighlight('tpl', 1, 0x3b82f6);
            await delay(1000);
            onStep({ title: 'Set: Unique Elements via Hash', explanation: '{1,2,2,3} deduplicates automatically. Hash table — O(1) average for "in" check. No ordering guaranteed.' });
            engine.createArrayAPI('setArr', [1, 2, 3], -4, -2);
            for (let i = 0; i < 3; i++) { engine.arrayHighlight('setArr', i, 0x10b981); }
            await delay(1000);
            onStep({ title: 'Set Operations: |, &, -', explanation: 'A | B = union, A & B = intersection, A - B = difference. All implemented efficiently with hash tables.' });
            engine.graphCreateNode('a', 'A={1,2,3}', -4, -5, 'cache');
            engine.graphCreateNode('b', 'B={2,3,4}', 4, -5, 'cache');
            engine.graphConnect('a', 'b', false);
            engine.highlight('a', 0xfbbf24); engine.highlight('b', 0xfbbf24);
        }
    },
    {
        id: 'for_loop',
        title: 'For Loop & range()',
        icon: '🔁',
        code: `for i in range(5):\n    print(i)`,
        desc: 'Iterate through any iterable. range() generates numbers lazily — O(1) memory.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'For Loop: iterate any iterable', explanation: 'Python\'s for loop calls iter() then next() repeatedly. Works on lists, strings, generators, files, etc.' });
            engine.createArrayAPI('arr', [0, 1, 2, 3, 4]);
            await delay(1200);
            for (let i = 0; i < 5; i++) {
                onStep({ title: `i = ${i}`, explanation: `Iteration ${i + 1}/5 — pointer advances to index ${i}. Body executes, then moves to next.` });
                engine.arrayMovePointer('arr', i, 'i');
                engine.arrayHighlight('arr', i, 0x10b981);
                await delay(900);
            }
            onStep({ title: 'StopIteration → loop ends', explanation: 'range(5) generates 0..4, then raises StopIteration. The for loop catches it and exits cleanly.' });
        }
    },
    {
        id: 'while_loop',
        title: 'While Loop',
        icon: '🔄',
        code: `n = 5\nwhile n > 0:\n    print(n)\n    n -= 1`,
        desc: 'Repeat as long as condition is true. Use when iterations count is unknown.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('counter', [5]);
            await delay(800);
            for (let n = 5; n >= 0; n--) {
                if (n > 0) {
                    onStep({ title: `n=${n} → TRUE`, explanation: `n > 0 passes. Body runs, n decremented to ${n - 1}.` });
                    engine.arrayHighlight('counter', 0, 0x10b981);
                    engine.arrayUpdate('counter', 0, n);
                } else {
                    onStep({ title: `n=0 → FALSE → exit`, explanation: 'Condition fails. Loop exits. Use break to exit early, continue to skip iteration.' });
                    engine.arrayHighlight('counter', 0, 0xef4444);
                }
                await delay(1000);
            }
        }
    },
    {
        id: 'functions',
        title: 'Functions & Arguments',
        icon: '🔧',
        code: `def greet(name, greeting="Hello"):\n    return f"{greeting}, {name}!"\n\ngreet("Alice")\ngreet("Bob", "Hi")`,
        desc: 'Functions are first-class objects. Support positional, keyword, default, *args, **kwargs.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'def creates a function object', explanation: 'Functions are objects in Python. def greet(...) creates a function object and binds it to name "greet" in the current scope.' });
            engine.graphCreateNode('fn', 'greet\n(function)', 0, 3, 'ml_model');
            await delay(1000);
            onStep({ title: 'Default argument: greeting="Hello"', explanation: 'Default evaluated ONCE at definition. Mutable defaults like [] are shared across calls — a common Python trap!' });
            engine.graphCreateNode('d', 'greeting\n="Hello"', -4, 0, 'cache');
            engine.graphConnect('fn', 'd', false);
            await delay(1000);
            onStep({ title: 'Call creates new stack frame', explanation: 'Each call allocates a frame with local variables. Frame is destroyed on return. Local variables are then garbage collected.' });
            engine.graphCreateNode('frame', 'frame:\nname="Alice"\ngreeting="Hello"', 4, 0, 'backend');
            engine.graphConnect('fn', 'frame', true);
            engine.highlight('frame', 0x10b981);
            await delay(1000);
            onStep({ title: '*args collects positionals, **kwargs collects keywords', explanation: '*args → tuple of extra positional args. **kwargs → dict of extra keyword args. Enables variadic APIs like print(*items).' });
        }
    },
    {
        id: 'lambda',
        title: 'Lambda, map(), filter()',
        icon: '⚡',
        code: `double = lambda x: x * 2\nlist(map(double, [1,2,3]))    # [2,4,6]\nlist(filter(lambda x:x>2,[1,2,3,4]))  # [3,4]`,
        desc: 'Lambda is an anonymous one-liner. map/filter apply functions lazily to iterables.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('input', [1, 2, 3, 4, 5]);
            onStep({ title: 'Input: [1,2,3,4,5]', explanation: 'We\'ll apply filter (keep items >2) and map (double each), using lambda functions.' });
            await delay(1000);
            onStep({ title: 'filter(lambda x: x>2, nums)', explanation: 'Returns a lazy iterator. Only items satisfying the predicate pass. Evaluated on-demand — no intermediate list created.' });
            for (let i = 0; i < 5; i++) {
                const x = i + 1; const keep = x > 2;
                engine.arrayMovePointer('input', i, 'x');
                engine.arrayHighlight('input', i, keep ? 0x10b981 : 0xef4444);
                onStep({ title: `x=${x} → ${keep ? '✅ keep' : '❌ drop'}`, explanation: keep ? `${x} > 2, included.` : `${x} ≤ 2, filtered out.` });
                await delay(600);
            }
            onStep({ title: 'map(double, nums) → [2,4,6,8,10]', explanation: 'map applies the function lazily. double=lambda x: x*2. Result evaluated only when list() or next() called.' });
            engine.createArrayAPI('result', [2, 4, 6, 8, 10], -3, -3);
        }
    },
    {
        id: 'list_comprehension',
        title: 'List Comprehensions',
        icon: '📋',
        code: `squares = [x*x for x in range(5) if x%2==0]\n# [0, 4, 16]`,
        desc: 'Concise, fast Pythonic one-liner to build lists with optional filtering.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('input', [0, 1, 2, 3, 4]);
            onStep({ title: 'Input: range(5) = [0,1,2,3,4]', explanation: 'Filter even numbers then square them — all in one expression.' });
            await delay(1000);
            const result = [];
            for (let x = 0; x < 5; x++) {
                const isEven = x % 2 === 0;
                engine.arrayMovePointer('input', x, 'x');
                engine.arrayHighlight('input', x, isEven ? 0x10b981 : 0xef4444);
                onStep({ title: `x=${x} → ${isEven ? `✅ include x²=${x * x}` : '❌ skip'}`, explanation: isEven ? `${x}%2==0, x²=${x * x} added to output.` : `${x} is odd, filtered out.` });
                if (isEven) result.push(x * x);
                await delay(800);
            }
            onStep({ title: 'Result: [0, 4, 16]', explanation: 'List comprehension is ~35% faster than for+append due to bytecode optimisation. Also works for dicts: {k:v for k,v in ...}' });
            engine.createArrayAPI('output', result, -3, -3);
        }
    },
    {
        id: 'error_handling',
        title: 'Exception Handling',
        icon: '🛡️',
        code: `try:\n    x = int("abc")\nexcept ValueError as e:\n    print(f"Error: {e}")\nfinally:\n    print("always runs")`,
        desc: 'try/except catches exceptions. finally always runs — ideal for cleanup.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Exception Hierarchy', explanation: 'All exceptions inherit from BaseException. Catching broad Exception misses SystemExit / KeyboardInterrupt.' });
            engine.graphCreateNode('base', 'BaseException', 0, 4, 'security');
            engine.graphCreateNode('exc', 'Exception', 0, 2, 'security');
            engine.graphCreateNode('val', 'ValueError', -4, 0, 'frontend');
            engine.graphCreateNode('type_err', 'TypeError', 0, 0, 'frontend');
            engine.graphCreateNode('key', 'KeyError', 4, 0, 'frontend');
            engine.graphConnect('base', 'exc', false);
            ['val', 'type_err', 'key'].forEach(n => engine.graphConnect('exc', n, false));
            await delay(1500);
            onStep({ title: 'int("abc") → ValueError raised', explanation: 'Python raises ValueError, unwinds the call stack until a matching except clause is found.' });
            engine.highlight('val', 0xef4444); engine.pulse('val');
            await delay(1000);
            onStep({ title: 'except ValueError: → caught!', explanation: 'Exception caught. Error logged. Execution continues after the try block.' });
            engine.highlight('val', 0x10b981);
            await delay(1000);
            onStep({ title: 'finally: runs ALWAYS', explanation: 'finally executes even if exception is unhandled, even on return/break. Perfect for cleanup: close files, release locks.' });
            engine.graphCreateNode('fin', 'finally\nalways!', 0, -3, 'cache');
            engine.highlight('fin', 0x10b981); engine.pulse('fin');
        }
    },
    {
        id: 'recursion',
        title: 'Recursion & Call Stack',
        icon: '🌀',
        code: `def factorial(n):\n    if n == 0: return 1\n    return n * factorial(n-1)`,
        desc: 'Function calling itself. Each call = new stack frame. Base case stops infinite loop.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Recursion: factorial(4)', explanation: 'Each call creates a new stack frame. Python default recursion limit = 1000 (sys.setrecursionlimit to change).' });
            await delay(800);
            const calls = [4, 3, 2, 1, 0];
            calls.forEach((n, i) => {
                setTimeout(() => {
                    engine.graphCreateNode(`f${n}`, `fact(${n})`, -8 + i * 4, 4 - i * 1.5, 'ml_model');
                    if (i > 0) engine.graphConnect(`f${calls[i - 1]}`, `f${n}`, true);
                    engine.pulse(`f${n}`);
                }, i * 800);
            });
            await delay(5000);
            onStep({ title: 'Unwinding: base case n=0 returns 1', explanation: '1→1→2→6→24. Each frame multiplies n × result from child and returns up.' });
            calls.reverse().forEach((n, i) => { setTimeout(() => engine.highlight(`f${n}`, 0x10b981), i * 600); });
        }
    },
    // ── Intermediate ─────────────────────────────────────────
    {
        id: 'oop',
        title: 'OOP: Classes & Objects',
        icon: '🏛️',
        code: `class Dog:\n    def __init__(self, name):\n        self.name = name\n    def bark(self):\n        print(f"{self.name}: Woof!")`,
        desc: 'A class is a blueprint. Objects are instances in memory with their own data.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Class = Blueprint', explanation: '__init__ is the constructor. self refers to the instance being created. Attributes stored on the instance object in memory.' });
            engine.graphCreateNode('cls', 'Dog\n[Class]', 0, 3, 'frontend');
            await delay(1200);
            onStep({ title: 'dog1 = Dog("Rex")', explanation: 'Python calls Dog.__new__ (allocate), then Dog.__init__(dog1,"Rex"). self.name="Rex" stored on dog1.' });
            engine.graphCreateNode('obj1', 'dog1\nname="Rex"', -4, -1, 'backend');
            engine.graphConnect('cls', 'obj1', true); engine.pulse('obj1');
            await delay(1200);
            onStep({ title: 'dog2 = Dog("Buddy") — separate object', explanation: 'Independent instance. Same class, different memory address. Changing dog1.name does NOT affect dog2.' });
            engine.graphCreateNode('obj2', 'dog2\nname="Buddy"', 4, -1, 'backend');
            engine.graphConnect('cls', 'obj2', true); engine.pulse('obj2');
            await delay(1200);
            onStep({ title: 'dog1.bark() → Dog.bark(dog1)', explanation: 'Python automatically passes the instance as self. Method is stored on the class, data on the instance.' });
            engine.highlight('obj1', 0xfbbf24); engine.highlight('cls', 0xfbbf24);
        }
    },
    {
        id: 'inheritance',
        title: 'Inheritance & super()',
        icon: '🧬',
        code: `class Animal:\n    def speak(self): print("...")\n\nclass Dog(Animal):\n    def speak(self):\n        super().speak()\n        print("Woof!")`,
        desc: 'Child class inherits parent attributes/methods. super() accesses the parent.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Inheritance Hierarchy', explanation: 'Dog(Animal) means Dog extends Animal which extends object. Python\'s MRO defines method lookup order.' });
            engine.graphCreateNode('obj_cls', 'object', 0, 5, 'database');
            engine.graphCreateNode('animal', 'Animal\n.speak()', 0, 2, 'cloud');
            engine.graphCreateNode('dog', 'Dog\n.speak() overrides', 0, -1, 'backend');
            engine.graphCreateNode('cat', 'Cat\n.speak()', -5, -1, 'frontend');
            engine.graphConnect('obj_cls', 'animal', false);
            engine.graphConnect('animal', 'dog', false);
            engine.graphConnect('animal', 'cat', false);
            await delay(1500);
            onStep({ title: 'MRO: Dog → Animal → object', explanation: 'Method Resolution Order by C3 linearisation. dog.speak() → check Dog first → found! super() goes next in MRO = Animal.' });
            engine.highlight('dog', 0xfbbf24); engine.highlight('animal', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'super().speak() calls Animal.speak', explanation: 'super() returns a proxy to Animal. Enables cooperative multiple inheritance — essential for Python mixins.' });
            engine.highlight('animal', 0x10b981); engine.pulse('animal');
        }
    },
    {
        id: 'generators',
        title: 'Generators & yield',
        icon: '🔋',
        code: `def count_up(n):\n    for i in range(n):\n        yield i`,
        desc: 'Generators produce values lazily — perfect for large data streams without loading all in RAM.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Generator vs Function', explanation: 'Regular function executes fully and returns. Generator pauses at yield, saving its frame state for the next next() call.' });
            engine.graphCreateNode('gen', 'count_up()\n[suspended at yield]', 0, 2, 'queue');
            await delay(1000);
            for (let i = 0; i < 4; i++) {
                onStep({ title: `next() → yields ${i}`, explanation: `Resumes from saved state, evaluates yield ${i}, suspends again. Memory: O(1) — no list ever created!` });
                engine.graphCreateNode(`v${i}`, `${i}`, -6 + i * 4, -2, 'cache');
                engine.graphConnect('gen', `v${i}`, true);
                engine.pulse(`v${i}`);
                await delay(900);
            }
            onStep({ title: 'StopIteration — range exhausted', explanation: 'Automatically caught by for loops. Generators can be infinite: def counter(): n=0; while True: yield n; n+=1' });
        }
    },
    {
        id: 'decorators',
        title: 'Decorators',
        icon: '🎁',
        code: `@timer\ndef slow_func():\n    time.sleep(1)\n# Equivalent: slow_func = timer(slow_func)`,
        desc: 'Decorators wrap functions to add cross-cutting concerns without modifying the source.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: '@timer = syntactic sugar', explanation: '@timer means slow_func = timer(slow_func). A higher-order function returning a modified version of the original.' });
            engine.graphCreateNode('inner', 'slow_func()', 0, 0, 'frontend');
            engine.graphCreateNode('wrapper', '@timer wrapper()', 0, 3, 'security');
            engine.graphConnect('wrapper', 'inner', true);
            await delay(1000);
            onStep({ title: 'Calling: wrapper() times → calls inner → times', explanation: 'wrapper records start, calls original, records end, prints elapsed. Transparent to the caller.' });
            engine.highlight('wrapper', 0xfbbf24);
            await delay(800);
            engine.highlight('inner', 0x10b981);
            await delay(800);
            engine.highlight('wrapper', 0x10b981);
            onStep({ title: '@functools.wraps preserves __name__/__doc__', explanation: 'Without it, introspection sees "wrapper". @wraps copies metadata from original to wrapper. Essential for library code.' });
        }
    },
    {
        id: 'context_managers',
        title: 'Context Managers (with)',
        icon: '🔐',
        code: `with open("file.txt") as f:\n    data = f.read()\n# File auto-closed even on exception!`,
        desc: '__enter__ sets up, __exit__ tears down. Guaranteed cleanup regardless of exceptions.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: '__enter__ called on "with"', explanation: 'with open("x") calls __enter__ → file descriptor returned. Bound to f. OS resource is now held.' });
            engine.graphCreateNode('os', 'OS Kernel', 0, 4, 'kubernetes');
            engine.graphCreateNode('file', 'file.txt\n(fd=7)', 0, 1, 'database');
            engine.graphCreateNode('code', 'Your Code\nf = file_obj', 0, -2, 'frontend');
            engine.graphConnect('os', 'file', false);
            engine.graphConnect('file', 'code', true);
            engine.pulse('code');
            await delay(1200);
            onStep({ title: 'Body executes', explanation: 'f.read() runs. If an exception occurs here, Python still calls __exit__!' });
            engine.highlight('code', 0x10b981);
            await delay(1000);
            onStep({ title: '__exit__ → file.close()', explanation: '__exit__(exc_type, exc_val, tb) always called. Flushes buffers, releases file descriptor back to OS. Return True to suppress exception.' });
            engine.highlight('file', 0xef4444); engine.highlight('code', 0xef4444);
        }
    },
    {
        id: 'file_io',
        title: 'File I/O',
        icon: '📁',
        code: `with open("data.txt", "r", encoding="utf-8") as f:\n    for line in f:   # lazy generator!\n        process(line)`,
        desc: 'File iteration is lazily generator-based. Safe for huge files with O(1) memory.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'File Modes: r, w, a, rb, r+', explanation: '"r"=read text, "w"=write (overwrites), "a"=append, "rb"/"wb"=binary. Always specify encoding="utf-8" for text.' });
            engine.graphCreateNode('modes', 'r | w | a\nrb | wb | r+', 0, 3, 'frontend');
            await delay(1000);
            onStep({ title: 'Line-by-line: O(1) memory', explanation: 'for line in f reads one line at a time from disk. Never loads the whole file. Safe for 10GB+ files.' });
            engine.graphCreateNode('buf', 'OS Buffer\n(one line)', 0, 0, 'cache');
            engine.graphConnect('modes', 'buf', true);
            engine.pulse('buf');
            await delay(1000);
            onStep({ title: 'json.load / csv.DictReader for structured data', explanation: 'json.load(f) parses JSON from file. csv.DictReader streams CSV rows as dicts. Both avoid loading entire file into RAM.' });
            engine.graphCreateNode('fmts', 'JSON\nCSV\nPickle', 0, -3, 'database');
            engine.graphConnect('buf', 'fmts', true);
            engine.highlight('fmts', 0x10b981);
        }
    },
    // ── Advanced ─────────────────────────────────────────────
    {
        id: 'oop_dunder',
        title: 'Dunder Methods (__magic__)',
        icon: '🪄',
        code: `class Vector:\n    def __add__(self, other): ...\n    def __repr__(self): ...\n    def __len__(self): ...`,
        desc: 'Magic methods customise +, len(), repr(), iteration, comparison and more.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Python Data Model: Dunder Methods', explanation: 'Python calls special __dunder__ methods for built-in operations. This lets custom objects integrate seamlessly with Python syntax.' });
            const methods = [
                ['__init__', 'v = Vector(1,2)', 0x3b82f6],
                ['__add__', 'v1 + v2', 0x10b981],
                ['__repr__', 'repr(v)', 0xfbbf24],
                ['__len__', 'len(v)', 0xec4899],
                ['__iter__', 'for x in v:', 0x6366f1],
            ];
            for (const [i, [name, desc, color]] of methods.entries()) {
                engine.graphCreateNode(name, `${name}\n${desc}`, -8 + i * 4, 0, 'backend');
                engine.highlight(name, color);
                onStep({ title: name, explanation: `${desc} calls ${name} under the hood. Everything in Python works through this protocol.` });
                await delay(700);
            }
            onStep({ title: 'Everything uses dunders!', explanation: 'Even a + b calls a.__add__(b). If not found, tries b.__radd__(a). The entire language is built on this consistent protocol.' });
        }
    },
    {
        id: 'dataclasses',
        title: 'Dataclasses & Type Hints',
        icon: '🏷️',
        code: `from dataclasses import dataclass\n\n@dataclass\nclass Point:\n    x: float\n    y: float = 0.0`,
        desc: '@dataclass auto-generates __init__, __repr__, __eq__. Type hints document types.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: '@dataclass eliminates boilerplate', explanation: 'Without @dataclass you write __init__, __repr__, __eq__ manually. @dataclass generates all from field type annotations.' });
            engine.graphCreateNode('before', 'Manual:\n__init__\n__repr__\n__eq__', -4, 1, 'security');
            engine.graphCreateNode('after', '@dataclass\nx: float\ny: float=0.0', 4, 1, 'backend');
            engine.graphConnect('before', 'after', true);
            engine.highlight('after', 0x10b981);
            await delay(1200);
            onStep({ title: 'Type hints: x: float, y: int', explanation: 'NOT enforced at runtime. Use mypy/pyright for static type checking. Hints enable IDE autocomplete and catch bugs before running.' });
            engine.graphCreateNode('types', 'x: float\nname: str\ndata: list[int]', 0, -2, 'frontend');
            engine.highlight('types', 0x3b82f6);
            await delay(1000);
            onStep({ title: 'frozen=True → immutable + hashable', explanation: '@dataclass(frozen=True) makes instances immutable (TypeError on mutation). Automatically adds __hash__ — usable as dict keys.' });
            engine.graphCreateNode('frozen', 'frozen=True\nhashable dict key!', 0, -4, 'database');
            engine.highlight('frozen', 0x6366f1);
        }
    },
    {
        id: 'abstract_classes',
        title: 'Abstract Classes (ABC)',
        icon: '🔷',
        code: `from abc import ABC, abstractmethod\n\nclass Shape(ABC):\n    @abstractmethod\n    def area(self) -> float: ...\n\nclass Circle(Shape):\n    def area(self): return 3.14 * r*r`,
        desc: 'ABCs define interfaces. Subclasses must implement @abstractmethod or TypeError raised.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Abstract Base Class = Interface', explanation: 'ABC prevents instantiation if any @abstractmethod is not overridden. Guarantees subclasses satisfy the contract.' });
            engine.graphCreateNode('shape', 'Shape(ABC)\n@abstractmethod\narea()', 0, 3, 'security');
            await delay(1000);
            for (const [id, label, x] of [['circle', 'Circle\narea()=πr²', -5], ['rect', 'Rect\narea()=w×h', 0], ['tri', 'Triangle\narea()=½bh', 5]]) {
                engine.graphCreateNode(id, label, x, 0, 'backend');
                engine.graphConnect('shape', id, false);
                engine.highlight(id, 0x10b981);
                await delay(600);
            }
            onStep({ title: 'Polymorphism: same interface, different behaviour', explanation: 'for s in shapes: s.area() works for every shape type. Duck typing + ABC = Pythonic interface design.' });
        }
    },
    {
        id: 'async_await',
        title: 'Async / Await (asyncio)',
        icon: '⚡',
        code: `import asyncio\nasync def fetch(url):\n    await asyncio.sleep(1)  # non-blocking\n    return "data"\n\nasyncio.run(fetch("example.com"))`,
        desc: 'asyncio enables I/O concurrency without threads. Coroutines yield control at await.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'asyncio Event Loop: one thread', explanation: 'Single thread, single event loop. Coroutines voluntarily yield at await. No GIL contention. Perfect for I/O-bound tasks.' });
            engine.graphCreateNode('loop', 'Event Loop', 0, 3, 'kubernetes');
            await delay(800);
            for (const [i, t] of ['fetch(url1)', 'fetch(url2)', 'fetch(url3)'].entries()) {
                engine.graphCreateNode(`t${i}`, t, -6 + i * 6, 0, 'queue');
                engine.graphConnect('loop', `t${i}`, true);
                await delay(400);
            }
            onStep({ title: 'await → suspend coroutine, run others', explanation: 'At await asyncio.sleep(1), coroutine suspends. Event loop runs other ready coroutines. CPU never idles waiting for I/O!' });
            engine.highlight('t0', 0xfbbf24);
            engine.highlight('t1', 0x10b981); engine.highlight('t2', 0x10b981);
            await delay(1000);
            onStep({ title: 'asyncio.gather(*tasks): concurrent execution', explanation: '3 tasks each taking 1s complete in ~1s total (not 3s). gather schedules all, collects results when all done.' });
            ['t0', 't1', 't2'].forEach(id => { engine.highlight(id, 0x10b981); engine.pulse(id); });
            engine.highlight('loop', 0x10b981);
        }
    },
    {
        id: 'sorting_advanced',
        title: 'Sorting: key=, Timsort',
        icon: '🗂️',
        code: `people = [("Alice",30),("Bob",25),("Carol",28)]\npeople.sort(key=lambda x: x[1])`,
        desc: 'key= transforms elements for comparison. Timsort is stable and adaptive O(n log n).',
        async play(engine, onStep) {
            engine.reset();
            const people = ['Alice:30', 'Bob:25', 'Carol:28'];
            engine.createArrayAPI('p', people);
            onStep({ title: 'Sort by age using key=lambda x: x[1]', explanation: 'key= extracts an age value for comparison. Python applies it to each element ONCE (n calls total, not n×log n).' });
            engine.arrayHighlight('p', 0, 0x3b82f6); engine.arrayMovePointer('p', 0, 'key');
            await delay(1000);
            onStep({ title: 'Schwartzian Transform internally', explanation: 'Python builds (key_value, element) pairs, sorts those, strips keys. O(n) key() calls regardless of sort complexity.' });
            for (let i = 0; i < 3; i++) { engine.arrayHighlight('p', i, 0xfbbf24); await delay(400); }
            onStep({ title: 'Result: [Bob:25, Carol:28, Alice:30]', explanation: 'Stable sort preserves equal-key order. sorted() returns new list. .sort() mutates in-place. Both use Timsort O(n log n).' });
            engine.createArrayAPI('sorted_p', ['Bob:25', 'Carol:28', 'Alice:30'], -3, -3);
            for (let i = 0; i < 3; i++) { engine.arrayHighlight('sorted_p', i, 0x10b981); await delay(300); }
        }
    },
    {
        id: 'comprehensions_adv',
        title: 'Dict & Set Comprehensions',
        icon: '🗃️',
        code: `words = ["hi","hello","hey"]\nlengths = {w: len(w) for w in words}\nunique_lens = {len(w) for w in words}`,
        desc: 'Dict comprehensions map keys to values. Set comprehensions produce unique values.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('words', ['hi', 'hello', 'hey']);
            onStep({ title: 'Dict comprehension: {k:v for …}', explanation: 'Builds a dict in one pass. Equivalent to: d={}; for w in words: d[w]=len(w). More Pythonic and slightly faster.' });
            await delay(1000);
            for (const [i, w] of ['hi', 'hello', 'hey'].entries()) {
                engine.arrayMovePointer('words', i, 'w');
                engine.arrayHighlight('words', i, 0x3b82f6);
                onStep({ title: `"${w}" → len=${w.length}`, explanation: `Key="${w}", Value=${w.length} added to dict.` });
                await delay(800);
            }
            onStep({ title: 'Set: {len(w) for w in words} = {2, 5}', explanation: '"hi" and "hey" both have len=2 → deduplicated. Set comprehension returns unique values only.' });
            engine.graphCreateNode('setout', '{2, 5}\n(3 words, 2 unique lengths)', 0, -3, 'queue');
            engine.highlight('setout', 0x10b981);
        }
    },
];


// ─────────────────────────────────────────────────────────────
// JAVASCRIPT TOPICS
// ─────────────────────────────────────────────────────────────
const javascriptTopics = [
    {
        id: 'event_loop',
        title: 'Event Loop',
        icon: '🔁',
        code: `console.log("A");\nsetTimeout(() => console.log("B"), 0);\nconsole.log("C");\n// Output: A C B`,
        desc: 'The event loop runs the call stack, then drains the microtask and callback queues.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Event Loop Architecture', explanation: 'JS is single-threaded. The event loop checks: Is call stack empty? → process next queue item.' });
            engine.graphCreateNode('stack', 'Call Stack', -5, 0, 'queue');
            engine.graphCreateNode('wq', 'Web APIs\n(Timer)', 0, 0, 'cloud');
            engine.graphCreateNode('cbq', 'Callback Queue', 5, 0, 'queue');
            engine.graphCreateNode('loop', 'Event Loop', 0, -3, 'kubernetes');
            engine.graphConnect('stack', 'wq', true);
            engine.graphConnect('wq', 'cbq', true);
            engine.graphConnect('loop', 'stack', true);
            engine.graphConnect('loop', 'cbq', true);
            await delay(1500);

            onStep({ title: 'console.log("A") → Call Stack', explanation: 'Sync code runs immediately. "A" is pushed, executed, popped.' });
            engine.highlight('stack', 0x10b981);
            await delay(1000);

            onStep({ title: 'setTimeout callback → Web API', explanation: 'setTimeout registers the callback with the Browser Timer API (not in JS).' });
            engine.highlight('wq', 0xfbbf24);
            await delay(1000);

            onStep({ title: 'console.log("C") → Call Stack', explanation: 'More sync code. "C" prints. Stack drains to empty.' });
            engine.highlight('stack', 0x10b981);
            await delay(1000);

            onStep({ title: 'Timer fires → Callback Queue', explanation: 'After 0ms, callback moves to callback queue. Event loop sees empty stack → picks it up.' });
            engine.highlight('cbq', 0x6366f1);
            engine.highlight('loop', 0x6366f1);
            engine.pulse('stack');
            onStep({ title: 'Output: A → C → B', explanation: 'This is why setTimeout of 0ms doesn\'t mean "immediately" — it means "after current stack".' });
        }
    },
    {
        id: 'closures',
        title: 'Closures',
        icon: '📦',
        code: `function counter() {\n  let count = 0;\n  return () => ++count;\n}`,
        desc: 'A closure is a function that remembers its lexical scope even after the outer function returns.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Outer Function: counter()', explanation: 'counter() creates a local variable "count" in its scope.' });
            engine.graphCreateNode('outer', 'counter()\nscope: {count:0}', 0, 3, 'frontend');
            await delay(1000);

            onStep({ title: 'Inner Function (closure) returned', explanation: 'The returned arrow function closes over count. Even after counter() finishes, count lives on.' });
            engine.graphCreateNode('inner', 'closure\n(remembers count)', 0, 0, 'security');
            engine.graphConnect('outer', 'inner', true);
            engine.pulse('inner');
            await delay(1000);

            onStep({ title: 'Calling closure() 3 times', explanation: 'Each call increments the SAME count — it\'s shared state captured in the closure environment.' });
            for (let i = 1; i <= 3; i++) {
                engine.graphCreateNode(`call${i}`, `call${i}() → ${i}`, -5 + i * 3, -3, 'cache');
                engine.graphConnect('inner', `call${i}`, true);
                engine.highlight(`call${i}`, 0x10b981);
                await delay(700);
            }
            onStep({ title: 'count = 3', explanation: 'This is the power of closures: private persistent state without global variables.' });
        }
    },
    {
        id: 'promises',
        title: 'Promises & async/await',
        icon: '⏳',
        code: `async function fetchUser(id) {\n  const res = await fetch(\`/users/\${id}\`);\n  return res.json();\n}`,
        desc: 'Promises represent future values. async/await is clean syntax over them.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Promise States', explanation: 'A Promise starts PENDING, then settles to FULFILLED or REJECTED.' });
            engine.graphCreateNode('pending', 'PENDING', -5, 0, 'queue');
            await delay(800);
            engine.graphCreateNode('fulfilled', 'FULFILLED ✅', 2, 2, 'backend');
            engine.graphCreateNode('rejected', 'REJECTED ❌', 2, -2, 'security');
            engine.graphConnect('pending', 'fulfilled', true);
            engine.graphConnect('pending', 'rejected', true);
            await delay(1000);

            onStep({ title: 'await pauses the async function', explanation: 'The function suspends at await, thread is freed for other work. No blocking!' });
            engine.highlight('pending', 0xfbbf24);
            await delay(1000);

            onStep({ title: 'Fetch resolves → FULFILLED', explanation: 'Response arrives. Promise resolves with data. Execution resumes after await.' });
            engine.highlight('fulfilled', 0x10b981);
            engine.pulse('fulfilled');
            await delay(1000);

            onStep({ title: '.then() / .catch() chains', explanation: '.then runs on fulfillment, .catch on rejection. async/await replaces these with try/catch.' });
            engine.graphCreateNode('then', '.then(data)', 6, 2, 'frontend');
            engine.graphConnect('fulfilled', 'then', true);
            engine.highlight('then', 0x10b981);
        }
    },
    {
        id: 'prototype',
        title: 'Prototype Chain',
        icon: '🔗',
        code: `const obj = { x: 1 };\n// obj.__proto__ === Object.prototype`,
        desc: 'Every JS object has a prototype. Property lookup walks the chain.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Object Prototype Chain', explanation: 'obj itself → Object.prototype → null. Property lookup walks up until found or null.' });
            engine.graphCreateNode('obj', 'obj\n{x:1}', -6, 0, 'backend');
            engine.graphCreateNode('objProto', 'Object.prototype\n{toString, hasOwnProperty…}', 0, 0, 'database');
            engine.graphCreateNode('nullNode', 'null', 6, 0, 'security');
            engine.graphConnect('obj', 'objProto', true);
            engine.graphConnect('objProto', 'nullNode', true);
            await delay(1200);

            onStep({ title: 'obj.x → found on obj', explanation: 'x is own property. Returns 1. No chain walk needed.' });
            engine.highlight('obj', 0x10b981);
            await delay(1000);

            onStep({ title: 'obj.toString() → walk chain', explanation: 'toString not on obj. Walk to Object.prototype → found! Calls Object.prototype.toString.' });
            engine.highlight('obj', 0xfbbf24);
            engine.highlight('objProto', 0x10b981);
        }
    },
];

// ─────────────────────────────────────────────────────────────
// DSA TOPICS
// ─────────────────────────────────────────────────────────────
const dsaTopics = [
    {
        id: 'binary_search',
        title: 'Binary Search',
        icon: '🔍',
        code: `def bsearch(arr, target):\n  lo, hi = 0, len(arr)-1\n  while lo <= hi:\n    mid = (lo+hi)//2\n    if arr[mid] == target: return mid\n    elif arr[mid] < target: lo = mid+1\n    else: hi = mid-1`,
        desc: 'Halve the search space each step. O(log n) on sorted arrays.',
        async play(engine, onStep) {
            engine.reset();
            const arr = [2, 5, 8, 12, 16, 23, 38, 56, 72, 91];
            const target = 23;
            engine.createArrayAPI('arr', arr);
            onStep({ title: `Binary Search: find ${target}`, explanation: 'Start with pointers lo=0, hi=9. Each step bisects the remaining range.' });
            engine.arrayMovePointer('arr', 0, 'lo');
            engine.arrayMovePointer('arr', 9, 'hi');
            await delay(1200);

            let lo = 0, hi = 9;
            while (lo <= hi) {
                const mid = Math.floor((lo + hi) / 2);
                engine.arrayMovePointer('arr', mid, 'mid');
                engine.arrayHighlight('arr', mid, 0xfbbf24);
                if (arr[mid] === target) {
                    onStep({ title: `Found! arr[${mid}] = ${target}`, explanation: `${arr[mid]} === ${target}. ✅ Stopping after only ${Math.ceil(Math.log2(arr.length))} comparisons vs ${arr.length} for linear search!` });
                    engine.arrayHighlight('arr', mid, 0x10b981);
                    break;
                } else if (arr[mid] < target) {
                    onStep({ title: `${arr[mid]} < ${target} → search right`, explanation: `Eliminate left half. lo moves to ${mid + 1}. Cut search space in half!` });
                    lo = mid + 1;
                    engine.arrayMovePointer('arr', lo, 'lo');
                } else {
                    onStep({ title: `${arr[mid]} > ${target} → search left`, explanation: `Eliminate right half. hi moves to ${mid - 1}. Cut search space in half!` });
                    hi = mid - 1;
                    engine.arrayMovePointer('arr', hi, 'hi');
                }
                await delay(1100);
            }
        }
    },
    {
        id: 'bubble_sort',
        title: 'Bubble Sort',
        icon: '🫧',
        code: `for i in range(n):\n    for j in range(n-i-1):\n        if arr[j] > arr[j+1]:\n            arr[j],arr[j+1]=arr[j+1],arr[j]`,
        desc: 'Adjacent swaps bubble the largest element to the end each pass. O(n²).',
        async play(engine, onStep) {
            engine.reset();
            const arr = [5, 3, 8, 1, 9, 2];
            engine.createArrayAPI('arr', arr.slice());
            onStep({ title: 'Bubble Sort: [5,3,8,1,9,2]', explanation: 'Each pass compares adjacent elements and swaps if out of order. Largest "bubbles" to end.' });
            await delay(1000);

            const a = arr.slice();
            let swaps = 0;
            for (let i = 0; i < a.length; i++) {
                for (let j = 0; j < a.length - i - 1; j++) {
                    engine.arrayHighlight('arr', j, 0xfbbf24);
                    engine.arrayHighlight('arr', j + 1, 0xfbbf24);
                    await delay(500);
                    if (a[j] > a[j + 1]) {
                        onStep({ title: `Swap ${a[j]} ↔ ${a[j + 1]}`, explanation: `${a[j]} > ${a[j + 1]} — swap! Bubble sort has made ${++swaps} swap(s) so far.` });
                        engine.arraySwap('arr', j, j + 1);
                        [a[j], a[j + 1]] = [a[j + 1], a[j]];
                        await delay(700);
                    }
                    engine.arrayHighlight('arr', j, 0x3b82f6);
                }
                engine.arrayHighlight('arr', a.length - 1 - i, 0x10b981);
            }
            onStep({ title: `Sorted! ${swaps} swaps total.`, explanation: 'All elements in order. O(n²) time — fine for small n, but use QuickSort/MergeSort for large n.' });
        }
    },
    {
        id: 'linked_list',
        title: 'Linked List',
        icon: '🔗',
        code: `class Node:\n    def __init__(self, val):\n        self.val = val\n        self.next = None`,
        desc: 'Nodes connected by pointers. O(1) insert at head, O(n) random access.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Linked List', explanation: 'Nodes store data and a pointer to the next node. No contiguous memory needed.' });
            const vals = [10, 20, 30, 40, 'NULL'];
            const ids = vals.map((v, i) => `nd${i}`);
            for (let i = 0; i < vals.length; i++) {
                engine.graphCreateNode(ids[i], `${vals[i]}`, -8 + i * 4, 0, i === vals.length - 1 ? 'security' : 'backend');
                if (i > 0) engine.graphConnect(ids[i - 1], ids[i], true);
                engine.pulse(ids[i]);
                await delay(700);
            }

            onStep({ title: 'Inserting 15 after Node[10]', explanation: 'Change nd0.next → new node, new node.next → nd1. O(1) — no shifting of elements!' });
            engine.graphCreateNode('new', '15 (NEW)', -4, 3, 'frontend');
            engine.graphConnect('nd0', 'new', true);
            engine.graphConnect('new', 'nd1', true);
            engine.highlight('new', 0x10b981);
            engine.highlight('nd0', 0xfbbf24);
            await delay(1200);

            onStep({ title: 'vs Array: insert is O(n) there!', explanation: 'Arrays need to shift all elements right. Linked lists just redirect two pointers. Trade-off: no O(1) random access.' });
        }
    },
    {
        id: 'bfs',
        title: 'BFS (Breadth-First Search)',
        icon: '🌊',
        code: `from collections import deque\ndef bfs(graph, start):\n    queue = deque([start])\n    while queue:\n        node = queue.popleft()`,
        desc: 'Explore level by level using a queue. Finds shortest path in unweighted graphs.',
        async play(engine, onStep) {
            engine.reset();
            engine.graphResetLayout();
            onStep({ title: 'BFS – Level-Order Traversal', explanation: 'Start at source. Explore all neighbors before going deeper. Uses a Queue.' });
            const positions = { A: [-1, 3], B: [-5, 0], C: [3, 0], D: [-7, -3], E: [-3, -3], F: [1, -3], G: [5, -3] };
            Object.entries(positions).forEach(([id, [x, y]]) => {
                engine.graphCreateNode(id, id, x, y, 'backend');
            });
            const edges = [['A', 'B'], ['A', 'C'], ['B', 'D'], ['B', 'E'], ['C', 'F'], ['C', 'G']];
            edges.forEach(([u, v]) => engine.graphConnect(u, v, false));
            await delay(1500);

            const order = [['A'], ['B', 'C'], ['D', 'E', 'F', 'G']];
            const colors = [0xfbbf24, 0x6366f1, 0x10b981];
            for (let lvl = 0; lvl < order.length; lvl++) {
                onStep({ title: `Level ${lvl}: [${order[lvl].join(', ')}]`, explanation: `Queue processes all level-${lvl} nodes before moving deeper. This guarantees shortest path!` });
                order[lvl].forEach(id => { engine.highlight(id, colors[lvl]); engine.pulse(id); });
                await delay(1200);
            }
            onStep({ title: 'BFS Complete — all nodes visited!', explanation: 'Time O(V+E). Each node and edge processed exactly once. Queue ensures shortest path to each node.' });
        }
    },
    {
        id: 'dynamic_programming',
        title: 'Dynamic Programming',
        icon: '🧠',
        code: `# Fibonacci with memoization\ndp = {}\ndef fib(n):\n    if n in dp: return dp[n]\n    dp[n] = fib(n-1)+fib(n-2)`,
        desc: 'Break problem into overlapping subproblems, cache results to avoid recomputation.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Fibonacci without DP: O(2ⁿ)', explanation: 'Naive recursion recomputes fib(2), fib(3) exponentially many times. Extremely wasteful.' });
            engine.graphCreateNode('f5', 'fib(5)', 0, 4, 'ml_model');
            engine.graphCreateNode('f4a', 'fib(4)', -3, 2, 'ml_model');
            engine.graphCreateNode('f3a', 'fib(3)', 3, 2, 'ml_model');
            engine.graphCreateNode('f3b', 'fib(3)⚠️', -5, 0, 'security');
            engine.graphCreateNode('f2a', 'fib(2)⚠️', -1, 0, 'security');
            engine.graphConnect('f5', 'f4a', true); engine.graphConnect('f5', 'f3a', true);
            engine.graphConnect('f4a', 'f3b', true); engine.graphConnect('f4a', 'f2a', true);
            await delay(1500);

            onStep({ title: 'With Memoization: O(n)', explanation: 'Store computed results. If fib(3) is in memo, return instantly. Only n unique subproblems!' });
            engine.highlight('f3b', 0x10b981);
            engine.highlight('f2a', 0x10b981);
            await delay(1000);

            const dp = [];
            for (let i = 0; i <= 5; i++) dp.push(i < 2 ? i : dp[i - 1] + dp[i - 2]);
            engine.createArrayAPI('memo', dp, -5, -3);
            onStep({ title: `dp[5] = ${dp[5]}`, explanation: 'Bottom-up DP fills the table from base cases up. Zero overhead — each subproblem solved once.' });
            for (let i = 0; i <= 5; i++) {
                engine.arrayHighlight('memo', i, 0x10b981);
                await delay(400);
            }
        }
    },
];

// ─────────────────────────────────────────────────────────────
// WEB TOPICS
// ─────────────────────────────────────────────────────────────
const webTopics = [
    {
        id: 'http',
        title: 'HTTP Request/Response',
        icon: '🌐',
        code: `GET /users/42 HTTP/1.1\nHost: api.example.com\n\n200 OK\nContent-Type: application/json`,
        desc: 'HTTP is a request-response protocol. Client sends request, server responds.',
        async play(engine, onStep) {
            engine.reset();
            engine.graphCreateNode('client', 'Browser\n(Client)', -6, 0, 'frontend');
            engine.graphCreateNode('dns', 'DNS\nResolver', 0, 3, 'cloud');
            engine.graphCreateNode('server', 'API Server', 6, 0, 'backend');
            engine.graphCreateNode('db', 'Database', 6, -3, 'database');
            await delay(800);

            onStep({ title: 'Step 1: DNS Lookup', explanation: 'Browser asks DNS to resolve api.example.com → IP address. Cached after first lookup.' });
            engine.graphConnect('client', 'dns', true);
            engine.highlight('dns', 0xfbbf24);
            engine.pulse('dns');
            await delay(1000);

            onStep({ title: 'Step 2: TCP + TLS Handshake', explanation: 'Browser opens TCP connection to server IP. TLS negotiates encryption keys (HTTPS).' });
            engine.graphConnect('client', 'server', true);
            engine.highlight('client', 0x3b82f6);
            engine.highlight('server', 0x3b82f6);
            await delay(1000);

            onStep({ title: 'Step 3: GET /users/42 → Server', explanation: 'HTTP request sent: method, URL, headers, body. Server receives, routes to handler.' });
            engine.highlight('server', 0xfbbf24);
            engine.graphConnect('server', 'db', true);
            engine.highlight('db', 0xfbbf24);
            await delay(1000);

            onStep({ title: 'Step 4: 200 OK + JSON body', explanation: 'Server queries DB, serializes to JSON, returns response with status 200. Connection reused (HTTP/1.1 keep-alive) or multiplexed (HTTP/2).' });
            engine.highlight('client', 0x10b981);
            engine.highlight('server', 0x10b981);
        }
    },
    {
        id: 'rest_api',
        title: 'REST API Design',
        icon: '🔌',
        code: `GET    /posts       → list\nPOST   /posts       → create\nGET    /posts/:id   → read\nPUT    /posts/:id   → update\nDELETE /posts/:id   → delete`,
        desc: 'REST uses HTTP methods + URLs as a uniform interface for resources.',
        async play(engine, onStep) {
            engine.reset();
            const methods = [
                ['GET', 0x10b981], ['POST', 0x3b82f6], ['PUT', 0xfbbf24], ['DELETE', 0xef4444]
            ];
            onStep({ title: 'REST: Everything is a Resource', explanation: '/posts is a resource. HTTP method (verb) tells the server what to do with it.' });
            engine.graphCreateNode('resource', '/posts', 0, 2, 'database');
            await delay(800);

            for (const [method, color] of methods) {
                engine.graphCreateNode(method, method, method === 'GET' ? -6 : method === 'POST' ? -2 : method === 'PUT' ? 2 : 6, -1, 'backend');
                engine.graphConnect(method, 'resource', true);
                engine.highlight(method, color);
                await delay(600);
            }

            onStep({ title: 'Stateless: each request self-contained', explanation: 'Server stores NO client session. Auth via JWT in every header. Scales horizontally easily.' });
            engine.highlight('resource', 0x6366f1);
        }
    },
];

// ─────────────────────────────────────────────────────────────
// SYSTEMS TOPICS
// ─────────────────────────────────────────────────────────────
const systemsTopics = [
    {
        id: 'memory',
        title: 'Stack vs Heap Memory',
        icon: '🧠',
        code: `int x = 5;         // stack\nint* p = new int;  // heap\ndelete p;          // must free!`,
        desc: 'Stack is auto-managed, fast, small. Heap is manual, large, persistent.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Memory Layout', explanation: 'Process memory is split: Stack (function frames, grows down), Heap (dynamic, grows up), Code segment.' });
            engine.graphCreateNode('stack', 'Stack\n(LIFO frames)', -4, 0, 'queue');
            engine.graphCreateNode('heap', 'Heap\n(dynamic)', 4, 0, 'cloud');
            engine.graphCreateNode('code', 'Code\nSegment', 0, 3, 'frontend');
            await delay(1000);

            onStep({ title: 'Function call → Stack Frame pushed', explanation: 'Variables x, y local to func are allocated on stack. Free the moment function returns. O(1) alloc!' });
            engine.graphCreateNode('frame', 'main()\n{x=5, y=3}', -4, -3, 'backend');
            engine.graphConnect('stack', 'frame', true);
            engine.highlight('frame', 0x10b981);
            await delay(1000);

            onStep({ title: 'new int → Heap allocation', explanation: 'malloc/new asks OS for memory on heap. Returns pointer. Must manually free() or delete — else memory leak!' });
            engine.graphCreateNode('hobj', '*p (4 bytes)', 4, -3, 'database');
            engine.graphConnect('heap', 'hobj', true);
            engine.highlight('hobj', 0xfbbf24);
            await delay(1000);

            onStep({ title: 'delete p → Memory freed', explanation: 'Heap memory returned to allocator. Forgetting causes memory leak. C++ RAII / Rust ownership prevents this automatically.' });
            engine.highlight('hobj', 0xef4444);
        }
    },
    {
        id: 'pointers',
        title: 'Pointers & References',
        icon: '🎯',
        code: `int x = 42;\nint* p = &x;   // p holds address of x\n*p = 100;      // dereference: x is now 100`,
        desc: 'A pointer stores a memory address. Dereferencing (*p) reads/writes at that address.',
        async play(engine, onStep) {
            engine.reset();
            engine.createArrayAPI('mem', [42, '?', '?'], -3, 0);
            onStep({ title: 'int x = 42 at address 0x100', explanation: 'Variable x is placed at some address in memory. The compiler knows where.' });
            engine.arrayHighlight('mem', 0, 0x3b82f6);
            await delay(1000);

            onStep({ title: 'int* p = &x  → p stores address', explanation: 'p is itself a variable holding the address (e.g. 0x100) of x. p occupies a separate memory cell.' });
            engine.arrayHighlight('mem', 1, 0xfbbf24);
            engine.arrayUpdate('mem', 1, '0x100');
            await delay(1000);

            onStep({ title: '*p = 100  → dereference and write', explanation: 'Follow the address in p → go to 0x100 → write 100. x is now 100 even though we didn\'t name it!' });
            engine.arrayHighlight('mem', 0, 0x10b981);
            engine.arrayUpdate('mem', 0, 100);
            onStep({ title: 'This is why pointers are powerful & dangerous!', explanation: 'You can modify any memory location. Wrong pointer = undefined behavior, crashes, security holes.' });
        }
    },
];

// ─────────────────────────────────────────────────────────────
// DEVOPS TOPICS
// ─────────────────────────────────────────────────────────────
const devopsTopics = [
    {
        id: 'docker_build',
        title: 'Docker: Image Layers',
        icon: '🐳',
        code: `FROM node:18\nWORKDIR /app\nCOPY package.json .\nRUN npm install\nCOPY . .\nCMD ["node","server.js"]`,
        desc: 'Each Dockerfile instruction adds a read-only layer. Layers are cached and shared.',
        async play(engine, onStep) {
            engine.reset();
            const layers = [
                ['FROM node:18', 'Base OS + Node runtime — pulled from registry, cached globally.'],
                ['WORKDIR /app', 'Sets working directory — tiny metadata layer.'],
                ['COPY package.json', 'Only package.json — changes rarely so cached for long.'],
                ['RUN npm install', 'Installs dependencies — heavy layer, cached unless package.json changed!'],
                ['COPY . .', 'Your source code — changes every build, always re-runs.'],
                ['CMD node server.js', 'Container entrypoint — metadata only.'],
            ];

            for (let i = 0; i < layers.length; i++) {
                const [cmd, explanation] = layers[i];
                onStep({ title: cmd, explanation });
                engine.graphCreateNode(`l${i}`, `Layer ${i}\n${cmd.split(' ')[0]}`, -6 + i * 2.5, i * 1.2, 'docker');
                if (i > 0) engine.graphConnect(`l${i - 1}`, `l${i}`, true);
                engine.highlight(`l${i}`, 0x2496ed);
                await delay(900);
            }
            onStep({ title: 'Container = Image + Writable Layer', explanation: 'Run `docker run` → adds thin writable layer on top. Stop container → layer discarded. Image unchanged.' });
        }
    },
    {
        id: 'cicd',
        title: 'CI/CD Pipeline',
        icon: '🚀',
        code: `on: [push]\njobs:\n  test: ...\n  build: ...\n  deploy: ...`,
        desc: 'Every push triggers automated testing, building, and deployment.',
        async play(engine, onStep) {
            engine.reset();
            const stages = [
                ['push', 'git push', 'git'],
                ['test', 'Run Tests', 'security'],
                ['build', 'Docker Build', 'docker'],
                ['registry', 'Push to Registry', 'cloud'],
                ['deploy', 'Deploy to K8s', 'kubernetes'],
                ['monitor', 'Monitor & Alert', 'ml_model'],
            ];

            for (let i = 0; i < stages.length; i++) {
                const [id, label, type] = stages[i];
                onStep({
                    title: label, explanation: i === 0 ? 'Developer pushes code. CI/CD pipeline triggered automatically.'
                        : i === 1 ? 'Unit tests, integration tests, linting run in parallel. Fail fast!'
                            : i === 2 ? 'Multi-stage Docker build. Only production artifact packaged.'
                                : i === 3 ? 'Image tagged with git SHA, pushed to container registry.'
                                    : i === 4 ? 'Kubernetes rolling update: new pods replace old ones with zero downtime.'
                                        : 'Prometheus scrapes metrics. Alertmanager fires if SLOs breached.'
                });
                engine.graphCreateNode(id, label, -10 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(stages[i - 1][0], id, true);
                engine.highlight(id, 0x2496ed);
                engine.pulse(id);
                await delay(1000);
            }
            onStep({ title: '🚀 Production deployed!', explanation: 'From git push to production in minutes. Every deployment is reproducible, tested, automated.' });
        }
    },
];

// ─────────────────────────────────────────────────────────────
// EXPORT
// ─────────────────────────────────────────────────────────────
export const TOPICS_BY_LANGUAGE = {
    python: pythonTopics,
    javascript: javascriptTopics,
    typescript: typescriptTopics,
    react: reactTopics,
    nodejs: nodeTopics,
    c_lang: cTopics,
    cpp: cppTopics,
    java: javaTopics,
    go: goTopics,
    rust: rustTopics,
    sql: sqlTopics,
    nosql: nosqlTopics,
    api: apiTopics,
    bootstrap: bootstrapCssTopics,
    git: gitTopics,
    docker_k8s: dockerK8sTopics,
    cloud: cloudTopics,
    dsa: dsaTopics,
    web: webTopics,
    devops: devopsTopics,
};
