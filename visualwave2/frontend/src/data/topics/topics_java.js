const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const javaTopics = [
    {
        id: 'java_jvm',
        title: 'JVM & How Java Runs',
        icon: '☕',
        code: `// javac: .java → .class bytecode\n// java: JVM interprets + JIT compiles\njavac HelloWorld.java\njava HelloWorld`,
        desc: 'Java compiles to bytecode; JVM interprets then JIT-compiles to native code at runtime.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Write Once, Run Anywhere', explanation: 'Java compiles to bytecode (.class) — not machine code. Any JVM on any platform runs it. The JVM is the runtime abstraction layer.' });
            const stages = [['src', '.java', 'frontend'], ['bc', '.class\nbytecode', 'database'], ['jvm', 'JVM\ninterpret', 'backend'], ['jit', 'JIT native', 'kubernetes'], ['cpu', 'CPU runs', 'cloud']];
            for (const [i, [id, label, type]] of stages.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(stages[i - 1][0], id, true);
                engine.pulse(id); await delay(600);
            }
            onStep({ title: 'JIT: hot code compiled to native', explanation: 'JVM profiles which code runs often. JIT compiles those loops/methods to native machine code → as fast as C. HotSpot JVM does this in milliseconds.' });
            engine.highlight('jit', 0x10b981);
        }
    },
    {
        id: 'java_oop',
        title: 'OOP: Classes & Interfaces',
        icon: '🏛️',
        code: `interface Drawable { void draw(); }\nclass Circle implements Drawable {\n  @Override public void draw(){...}\n}`,
        desc: 'Java: single inheritance, multiple interface implementation. @Override catches typos.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Interface = Pure Contract', explanation: 'interface declares method signatures only. Classes implementing it MUST provide bodies. Java\'s way of safe multiple "inheritance" of behaviour.' });
            engine.graphCreateNode('iface', 'Drawable\n(interface)', 0, 4, 'security');
            await delay(1000);
            for (const [id, label, x] of [['circle', 'Circle', -5], ['rect', 'Rectangle', 0], ['line', 'Line', 5]]) {
                engine.graphCreateNode(id, label + '\nimplements\nDrawable', x, 0, 'backend');
                engine.graphConnect('iface', id, false);
                engine.highlight(id, 0x10b981); await delay(600);
            }
            onStep({ title: 'abstract class: partial implementation', explanation: 'abstract class can have method bodies AND abstract methods. More flexible than interface but limits to single inheritance.' });
        }
    },
    {
        id: 'java_generics',
        title: 'Generics & Collections',
        icon: '📚',
        code: `List<String> names = new ArrayList<>();\nnames.add("Alice");\nMap<String, Integer> m = new HashMap<>();\nm.put("Alice", 95);`,
        desc: 'Generics = compile-time type safety. Collections: ArrayList, HashMap, HashSet.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'ArrayList<String>: dynamic array', explanation: 'Backed by Object[]. add() O(1) amortised. get(i) O(1). Not thread-safe — use CopyOnWriteArrayList for concurrent reads.' });
            engine.createArrayAPI('lst', ['Alice', 'Bob', 'Carol'], -3, 2);
            for (let i = 0; i < 3; i++) { engine.arrayHighlight('lst', i, 0x3b82f6); await delay(300); }
            await delay(600);
            onStep({ title: 'HashMap<K,V>: O(1) average', explanation: 'Java 8+: buckets with >8 items become RB Trees (O(log n) worst). Not ordered, not thread-safe. Use ConcurrentHashMap in threads.' });
            engine.graphCreateNode('hm', 'HashMap\n{Alice:95,Bob:87}', 0, -2, 'database');
            engine.highlight('hm', 0x10b981);
            await delay(1000);
            onStep({ title: 'Type erasure: generics are compile-time only', explanation: 'At runtime, List<String> becomes raw List. No List<int> — use List<Integer> (boxing incurs ~4x memory and ~5x time vs int[]).' });
        }
    },
    {
        id: 'java_streams',
        title: 'Streams API & Lambdas',
        icon: '🌊',
        code: `List<String> result = names.stream()\n  .filter(n -> n.startsWith("A"))\n  .map(String::toUpperCase)\n  .collect(Collectors.toList());`,
        desc: 'Streams process collections lazily with composable functional-style operations.',
        async play(engine, onStep) {
            engine.reset();
            const names = ['Alice', 'Bob', 'Anna', 'Carl'];
            engine.createArrayAPI('src', names);
            onStep({ title: 'Stream pipeline: lazy evaluation', explanation: 'filter() and map() are intermediate — nothing computed yet. collect() is terminal — only THEN does data flow through the pipeline.' });
            await delay(1000);
            for (const [i, n] of names.entries()) {
                const keep = n.startsWith('A');
                engine.arrayMovePointer('src', i, 'n');
                engine.arrayHighlight('src', i, keep ? 0x10b981 : 0xef4444);
                onStep({ title: `"${n}" → ${keep ? '✅ keep' : '❌ drop'}`, explanation: keep ? 'Starts with A.' : 'Filtered out.' });
                await delay(700);
            }
            engine.createArrayAPI('result', ['ALICE', 'ANNA'], -3, -3);
            onStep({ title: 'parallelStream(): automatic multi-core', explanation: 'parallelStream() uses ForkJoinPool. Great for independent, CPU-bound work on large lists. Avoid for I/O-bound or ordered tasks.' });
        }
    },
    {
        id: 'java_concurrency',
        title: 'Threads & Thread Pools',
        icon: '⚡',
        code: `ExecutorService pool = Executors.newFixedThreadPool(4);\nFuture<Integer> f = pool.submit(() -> compute());\nint result = f.get();`,
        desc: 'Thread pools reuse threads for efficiency. Future<T> represents an async result.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Thread per task is expensive', explanation: 'new Thread().start() creates OS thread: ~1ms + 256KB stack. For 10K tasks = 10GB RAM. Use thread pools instead.' });
            engine.graphCreateNode('main', 'main thread', 0, 3, 'frontend');
            await delay(800);
            for (let i = 0; i < 4; i++) {
                engine.graphCreateNode(`w${i}`, `Worker ${i + 1}`, -6 + i * 4, 0, 'backend');
                engine.graphConnect('main', `w${i}`, true);
                engine.pulse(`w${i}`); await delay(400);
            }
            onStep({ title: 'Future<T>: non-blocking result', explanation: 'submit() returns Future immediately. f.get() blocks until ready. Use CompletableFuture.supplyAsync() for non-blocking chaining.' });
            engine.graphCreateNode('future', 'Future<Integer>\nf.get() blocks', 0, -3, 'queue');
            engine.highlight('future', 0xfbbf24);
        }
    },
    {
        id: 'java_spring',
        title: 'Spring Boot & DI',
        icon: '🌱',
        code: `@RestController\n@RequestMapping("/api")\nclass UserController {\n  @GetMapping("/users/{id}")\n  User getUser(@PathVariable Long id){...}\n}`,
        desc: '@RestController maps HTTP to Java. Spring IoC wires dependencies automatically.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Spring IoC: Dependency Injection', explanation: 'Spring creates and wires beans (@Component, @Service, @Repository). @Autowired injects them. No new — Spring manages object lifecycle.' });
            engine.graphCreateNode('client', 'HTTP Client', -6, 0, 'frontend');
            engine.graphCreateNode('ctrl', '@RestController', 0, 0, 'backend');
            engine.graphCreateNode('svc', '@Service', 0, -3, 'queue');
            engine.graphCreateNode('repo', '@Repository', 0, -6, 'database');
            engine.graphConnect('client', 'ctrl', true);
            engine.graphConnect('ctrl', 'svc', false);
            engine.graphConnect('svc', 'repo', false);
            await delay(1500);
            onStep({ title: 'GET /api/users/{id} → getUser()', explanation: '@GetMapping binds HTTP GET to method. Spring extracts {id} from URL via @PathVariable. Returns object → Jackson serialises to JSON.' });
            engine.highlight('ctrl', 0x10b981);
        }
    },
    {
        id: 'java_gc',
        title: 'Garbage Collection',
        icon: '♻️',
        code: `Dog d = new Dog(); // heap object\nd = null;          // eligible for GC\n// GC reclaims it automatically`,
        desc: 'JVM GC automatically frees unreachable heap objects. Generational collection for efficiency.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Heap: Young Gen + Old Gen', explanation: 'Most objects die young (generational hypothesis). Young gen minor GC runs fast (ms). Survivors promoted to Old gen. Old gen full GC is rare but slow.' });
            engine.graphCreateNode('young', 'Young Gen\nEden+S0+S1', -5, 2, 'cache');
            engine.graphCreateNode('old', 'Old Gen\n(tenured)', 0, 2, 'database');
            engine.graphCreateNode('meta', 'Metaspace\n(classes)', 5, 2, 'frontend');
            engine.graphConnect('young', 'old', true);
            await delay(1200);
            onStep({ title: 'G1 GC: low-latency default (Java 9+)', explanation: 'G1 divides heap into equal regions, collects highest-garbage regions first. Predictable ~200ms pauses. Tune with -XX:MaxGCPauseMillis=200.' });
            engine.highlight('young', 0xfbbf24); engine.highlight('old', 0x10b981);
        }
    },
];
