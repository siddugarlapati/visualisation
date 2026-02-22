const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const goTopics = [
    {
        id: 'go_goroutines',
        title: 'Goroutines & Channels',
        icon: '🐹',
        code: `go func() { // goroutine: ~2KB stack!\n  result := heavyCalc()\n  ch <- result\n}()\nval := <-ch // receive (blocks)`,
        desc: 'Goroutines are lightweight threads (~2KB). Channels connect goroutines safely.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Goroutine: lightweight thread', explanation: 'go func(){...}() spawns a goroutine. Initial stack: ~2KB (vs OS thread ~2MB). Go multiplexes goroutines onto OS threads. Millions can run concurrently!' });
            const goroutines = ['g1 (fetch)', 'g2 (parse)', 'g3 (compute)', 'g4 (write)'];
            for (const [i, label] of goroutines.entries()) {
                engine.graphCreateNode(`g${i}`, label, -6 + i * 4, 0, 'backend');
                engine.highlight(`g${i}`, 0x10b981); engine.pulse(`g${i}`);
                await delay(400);
            }
            await delay(600);
            onStep({ title: 'Channel: type-safe FIFO pipe between goroutines', explanation: 'ch := make(chan int). ch <- 42 sends (blocks if unbuffered). val := <-ch receives (blocks until data). Channels prevent race conditions.' });
            engine.graphCreateNode('ch', 'chan int\n(channel)', 0, -3, 'queue');
            engine.graphConnect('g0', 'ch', true); engine.graphConnect('ch', 'g3', true);
            engine.highlight('ch', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'select: multiplex channels', explanation: 'select { case v := <-ch1: ... case v := <-ch2: ... } picks whichever channel is ready. Like switch but for channel operations. Use with timeout via time.After.' });
        }
    },
    {
        id: 'go_interfaces',
        title: 'Interfaces (Implicit)',
        icon: '🔷',
        code: `type Writer interface { Write([]byte) (int, error) }\n// Any type with Write() satisfies Writer!\n// No "implements" keyword needed`,
        desc: 'Go interfaces are implicit: any type with the right methods satisfies them. Duck typing.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Interface satisfied implicitly', explanation: 'No implements keyword. If type T has all methods of interface I, it satisfies I implicitly. This decouples interface from implementation.' });
            engine.graphCreateNode('iface', 'Writer interface\nWrite([]byte)\n(int, error)', 0, 3, 'security');
            await delay(1000);
            const types = [['file', 'os.File\nhas Write() ✅', 'frontend'], ['buf', 'bytes.Buffer\nhas Write() ✅', 'backend'], ['http', 'http.ResponseWriter\nhas Write() ✅', 'cache'], ['custom', 'MyLogger\nhas Write() ✅', 'database']];
            for (const [i, [id, label, type]] of types.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                engine.graphConnect('iface', id, false);
                engine.highlight(id, 0x10b981); await delay(600);
            }
            onStep({ title: 'Accept interfaces, return structs', explanation: 'Functions should accept interfaces (flexible for callers) and return concrete types (explicit about what you actually give back). Key Go idiom.' });
        }
    },
    {
        id: 'go_error_handling',
        title: 'Error Handling',
        icon: '🛡️',
        code: `result, err := divide(10, 0)\nif err != nil {\n  return fmt.Errorf("calc failed: %w", err)\n}\n// No exceptions — errors are values`,
        desc: 'Go errors are plain values (interface{ Error() string }). Must be checked explicitly.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Errors are values, not exceptions', explanation: 'Functions return (value, error). Caller MUST check. No hidden control flow like exceptions. Explicit, visible, boring — and that\'s a feature.' });
            engine.createArrayAPI('ret', ['result', 'err'], -3, 2);
            engine.arrayHighlight('ret', 0, 0x10b981); engine.arrayHighlight('ret', 1, 0xfbbf24);
            await delay(1200);
            onStep({ title: 'if err != nil: explicit handling', explanation: 'This pattern appears frequently. golangci-lint can catch unchecked errors. The explicitness forces you to think about failures at each step.' });
            onStep({ title: 'fmt.Errorf("%w", err): wrap with context', explanation: '%w wraps the original error. errors.Is() and errors.As() can unwrap to check the original type. errors.Is(err, ErrNotFound) traverses the chain.' });
            engine.graphCreateNode('wrap', 'wrapped error:\n"calc failed: divide by zero"', 0, -2, 'security');
            engine.highlight('wrap', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'panic/recover: only for unrecoverable issues', explanation: 'panic is like throwing. recover() in defer catches it. Use very rarely — out of bounds, nil pointer dereference. Don\'t use for normal error flow.' });
        }
    },
    {
        id: 'go_defer',
        title: 'defer, panic, recover',
        icon: '⏱️',
        code: `func readFile() error {\n  f, err := os.Open("x.txt")\n  if err != nil { return err }\n  defer f.Close()  // runs when func returns\n  // ... use f ...\n}`,
        desc: 'defer schedules a call to run when the function returns. LIFO order.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'defer: cleanup when function exits', explanation: 'defer f.Close() runs when readFile returns — whether by return, panic, or runtime.Goexit. Order: LIFO (last defer runs first). RAII equivalent in Go.' });
            engine.graphCreateNode('fn', 'readFile()', 0, 3, 'frontend');
            engine.graphCreateNode('open', 'os.Open("x.txt")\nf opened', 0, 0, 'backend');
            engine.graphCreateNode('deferred', 'defer f.Close()\n(registered, runs later)', 0, -2, 'cache');
            engine.graphCreateNode('ret', 'return\n→ f.Close() runs!', 0, -4, 'database');
            engine.graphConnect('fn', 'open', true);
            engine.graphConnect('open', 'deferred', true);
            engine.graphConnect('deferred', 'ret', true);
            engine.highlight('deferred', 0xfbbf24); engine.highlight('ret', 0x10b981);
            await delay(1500);
            onStep({ title: 'Multiple defers: LIFO order', explanation: 'If you defer A, B, C they run as C, B, A. Like a stack. Common: unlock mutex, close file, call wg.Done — all guaranteed via defer.' });
        }
    },
    {
        id: 'go_slices',
        title: 'Slices & Maps',
        icon: '📊',
        code: `s := []int{1, 2, 3}\ns = append(s, 4)      // may reallocate!\nt := s[1:3]            // slice of slice: [2,3]\n\nm := map[string]int{"a": 1}\nm["b"] = 2`,
        desc: 'Slices are dynamic views into arrays. Maps are hash tables. Both are reference types.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Slice: header + backing array', explanation: 'Slice = {ptr, len, cap}. s[1:3] shares the SAME backing array — no copy! Modifying t modifies s. append() may allocate new array if cap exceeded.' });
            engine.createArrayAPI('arr', [1, 2, 3, 4, 5]);
            engine.arrayHighlight('arr', 0, 0x94a3b8);
            engine.arrayHighlight('arr', 1, 0x3b82f6); engine.arrayHighlight('arr', 2, 0x3b82f6); engine.arrayHighlight('arr', 3, 0x94a3b8); engine.arrayHighlight('arr', 4, 0x94a3b8);
            onStep({ title: 's[1:3] = indices 1,2 (len=2, cap=3)', explanation: 'The slice header points into the array at index 1. len=2, cap from index 1 to end of array. Append to t would affect the original array!' });
            engine.arrayMovePointer('arr', 1, 'start');
            await delay(1000);
            onStep({ title: 'Map: hash table, not ordered', explanation: 'map[string]int is a hash map. O(1) average lookup. Iteration order is random (by design). Check key existence: v, ok := m["key"].' });
            engine.graphCreateNode('map_', 'map[string]int\n{"a":1,"b":2}', 0, -3, 'database');
            engine.highlight('map_', 0x10b981);
        }
    },
    {
        id: 'go_concurrency_patterns',
        title: 'Concurrency Patterns',
        icon: '🔀',
        code: `// Fan-out: one producer, multiple consumers\n// Fan-in: multiple producers → one consumer\n// Pipeline: stages connected by channels\nvar wg sync.WaitGroup\nwg.Add(3); go work(&wg); wg.Wait()`,
        desc: 'Go concurrency patterns: fan-out/in, pipeline, worker pool using channels and sync.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Fan-out: distribute work to goroutines', explanation: 'One producer sends work items. Multiple goroutines receive from the same channel. OS scheduler balances work. Each goroutine processes independently.' });
            engine.graphCreateNode('prod', 'Producer\n(gen tasks)', -6, 0, 'frontend');
            engine.graphCreateNode('ch2', 'chan Task', -2, 0, 'queue');
            for (let i = 0; i < 3; i++) {
                engine.graphCreateNode(`w${i}`, `Worker ${i + 1}`, 2 + i * 4, 0, 'backend');
                engine.graphConnect('ch2', `w${i}`, true);
            }
            engine.graphConnect('prod', 'ch2', true);
            await delay(1200);
            onStep({ title: 'sync.WaitGroup: wait for all goroutines', explanation: 'wg.Add(n) before launching. wg.Done() in each goroutine (via defer). wg.Wait() blocks until all Done(). Safe to use across goroutines.' });
            engine.graphCreateNode('wg', 'WaitGroup\nwait for all 3', 4, -3, 'security');
            engine.highlight('wg', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'context.Context: cancellation propagation', explanation: 'ctx, cancel := context.WithTimeout(ctx, 5*time.Second). Pass ctx to goroutines. When timeout or cancel() called, ctx.Done() closes. Goroutines should check this.' });
        }
    },
];

export const rustTopics = [
    {
        id: 'rust_ownership',
        title: 'Ownership & Move',
        icon: '🦀',
        code: `let s1 = String::from("hello");\nlet s2 = s1;  // s1 MOVED to s2\n// println!("{}", s1); // ERROR: s1 is gone!\nprintln!("{}", s2);   // ✅`,
        desc: 'Rust ownership: each value has ONE owner. Moving transfers ownership. No GC needed.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Ownership: ONE owner at a time', explanation: 'Each value in Rust has exactly one owner. When ownership is transferred (moved), the old variable becomes invalid. Enforced at compile time.' });
            engine.graphCreateNode('s1', 's1\n"hello"\n[stack ptr]', -4, 2, 'frontend');
            engine.graphCreateNode('heap', '"hello"\n[heap data]', 0, 2, 'database');
            engine.graphConnect('s1', 'heap', true); engine.highlight('heap', 0x3b82f6);
            await delay(1200);
            onStep({ title: 'let s2 = s1 → MOVE: s1 invalidated', explanation: 'The heap pointer is moved to s2. s1 is invalidated — the compiler prevents use-after-move. No double-free because only s2\'s drop() runs.' });
            engine.graphCreateNode('s2', 's2\n"hello"\n[stack ptr]', 4, 2, 'backend');
            engine.graphConnect('s2', 'heap', true);
            engine.highlight('s1', 0xef4444);
            engine.highlight('s2', 0x10b981);
            await delay(1000);
            onStep({ title: 'Drop: destructor called when owner goes out of scope', explanation: 'When s2 goes out of scope, Rust calls drop(s2) which frees the heap memory. No GC needed. Deterministic, zero-cost cleanup at compile time.' });
        }
    },
    {
        id: 'rust_borrowing',
        title: 'Borrowing & References',
        icon: '📎',
        code: `let s = String::from("hello");\nlet r1 = &s;       // immutable borrow\nlet r2 = &s;       // OK - multiple immutable refs\n// let r3 = &mut s; // ERROR: can't mix!`,
        desc: 'References borrow values without taking ownership. Rules: multiple readers OR one writer.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Borrow: use without owning', explanation: '&s borrows the string immutably. The original owner s keeps ownership. Borrower can read but not modify. Borrow is a pointer, but Rust guarantees it\'s valid.' });
            engine.graphCreateNode('owner', 's (owner)\n"hello"', 0, 3, 'database');
            engine.graphCreateNode('r1_', '&s (r1)\nimmutable ref', -4, 0, 'cache');
            engine.graphCreateNode('r2_', '&s (r2)\nimmutable ref', 4, 0, 'cache');
            engine.graphConnect('owner', 'r1_', false); engine.graphConnect('owner', 'r2_', false);
            engine.highlight('r1_', 0x3b82f6); engine.highlight('r2_', 0x3b82f6);
            await delay(1200);
            onStep({ title: 'Multiple &s OK, &mut s exclusive', explanation: 'Many immutable references allowed simultaneously. ONLY ONE mutable reference allowed at a time. Cannot mix: if you have &mut, no other reference can exist.' });
            engine.graphCreateNode('mut_err', '&mut s ← ERROR!\n(immut refs exist)', 0, -2, 'security');
            engine.highlight('mut_err', 0xef4444);
            await delay(1000);
            onStep({ title: 'Borrow checker: enforces these rules at compile time', explanation: 'The borrow checker is Rust\'s compiler feature that performs static analysis to enforce ownership/borrowing rules. Zero runtime overhead — all checks at compile time!' });
        }
    },
    {
        id: 'rust_lifetimes',
        title: 'Lifetimes',
        icon: "⏳",
        code: `fn longest<'a>(x: &'a str, y: &'a str) -> &'a str {\n  if x.len() > y.len() { x } else { y }\n}\n// 'a says: output lives as long as shortest input`,
        desc: 'Lifetimes ensure references stay valid. Compiler infers most — annotations only when ambiguous.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Lifetime: how long a reference is valid', explanation: 'Every reference has a lifetime — the scope during which it\'s valid. Usually inferred by compiler (elision rules). Annotations needed when compiler can\'t infer.' });
            engine.graphCreateNode('x', 'x: &str\n(lifetime \'a)', -4, 2, 'backend');
            engine.graphCreateNode('y', 'y: &str\n(lifetime \'a)', 4, 2, 'backend');
            engine.graphCreateNode('ret', 'returns &str\n(lifetime \'a)', 0, -1, 'frontend');
            engine.graphConnect('x', 'ret', true); engine.graphConnect('y', 'ret', true);
            engine.highlight('ret', 0x10b981);
            await delay(1200);
            onStep({ title: '\'a means: output lives as long as shortest input', explanation: 'We return either x or y. Caller doesn\'t know which. \'a annotation tells Rust: return is valid for whichever lifetime is shorter. Prevents dangling references.' });
            onStep({ title: 'Static lifetime: \'static lives forever', explanation: '\'static means valid for the entire program duration. String literals are \'static. Use sparingly — most data has bounded scope.' });
        }
    },
    {
        id: 'rust_enums',
        title: 'Enums, Option & Result',
        icon: '🔢',
        code: `// Option: value or None\nlet x: Option<i32> = Some(42);\nlet y: Option<i32> = None;\n\n// Result: success or error\nlet r: Result<i32, String> = Ok(10);\nlet e: Result<i32, String> = Err("bad".into());`,
        desc: 'Option and Result are enums that force explicit null and error handling.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Option<T>: explicit nullable', explanation: 'No null in Rust. Option<T> is Some(value) or None. Compiler forces you to handle None. Eliminates null pointer exceptions — the "billion dollar mistake".' });
            engine.graphCreateNode('some', 'Some(42)\n(has value)', -4, 2, 'backend');
            engine.graphCreateNode('none', 'None\n(no value)', 4, 2, 'security');
            engine.highlight('some', 0x10b981); engine.highlight('none', 0xef4444);
            await delay(1200);
            onStep({ title: 'Result<T,E>: explicit success/failure', explanation: 'Result<T,E> is Ok(value) or Err(error). Forces handling both paths. ? operator propagates errors upward (early return if Err). Elegant error chaining.' });
            engine.graphCreateNode('ok_', 'Ok(10)', -4, -1, 'frontend');
            engine.graphCreateNode('err_', 'Err("bad")', 4, -1, 'frontend');
            engine.highlight('ok_', 0x10b981); engine.highlight('err_', 0xfbbf24);
            await delay(1000);
            onStep({ title: '? operator: propagate errors ergonomically', explanation: 'file.read()? returns Ok value or early-returns Err from the outer function. Much cleaner than if err != nil pattern. Compose multiple fallible operations neatly.' });
        }
    },
    {
        id: 'rust_traits',
        title: 'Traits: Rust Interfaces',
        icon: '🔷',
        code: `trait Area { fn area(&self) -> f64; }\nimpl Area for Circle {\n  fn area(&self) -> f64 { PI * self.r * self.r }\n}\nfn print_area(shape: &impl Area) { ... }`,
        desc: 'Traits define shared behaviour. impl Trait syntax for generics. Zero-cost abstraction.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Trait: like an interface with power', explanation: 'trait Area { fn area() } defines a contract. Implement with impl Area for Circle. Traits enable generic programming with zero-cost abstraction.' });
            engine.graphCreateNode('trait_', 'trait Area\nfn area(&self)->f64', 0, 3, 'security');
            await delay(1000);
            for (const [id, label, x] of [['circ', 'Circle\nimpl Area', '#= πr²', -5], ['rect2', 'Rectangle\nimpl Area\n= w×h', 0], ['tri2', 'Triangle\nimpl Area\n= ½bh', 5]].map(([id, l, x]) => [id, l, x])) {
                engine.graphCreateNode(id, label, x, 0, 'backend');
                engine.graphConnect('trait_', id, false);
                engine.highlight(id, 0x10b981); await delay(600);
            }
            onStep({ title: 'impl Trait vs dyn Trait: static vs dynamic dispatch', explanation: 'impl Trait = monomorphisation at compile time (zero cost, but larger binary). dyn Trait = vtable dispatch at runtime (tiny overhead, smaller binary). Choose by use case.' });
            onStep({ title: 'Derive macros: auto-implement traits', explanation: '#[derive(Debug, Clone, PartialEq)] generates implementations automatically. Rust\'s macro system generates correct, optimised code at compile time.' });
        }
    },
];
