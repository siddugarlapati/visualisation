const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const cppTopics = [
    {
        id: 'cpp_classes',
        title: 'Classes & Constructors',
        icon: '🏛️',
        code: `class Dog {\npublic:\n  string name;\n  Dog(string n) : name(n) {}\n  void bark() { cout << name << ": Woof!"; }\n};`,
        desc: 'C++ classes encapsulate data and methods. Constructors initialise objects.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Class = Type + Behaviour', explanation: 'class Dog defines struct layout (name) PLUS methods (bark). Access specifiers: public/private/protected control visibility.' });
            engine.graphCreateNode('cls', 'Dog\n(class)', 0, 3, 'frontend');
            await delay(1000);
            onStep({ title: 'Constructor: Dog(string n) : name(n)', explanation: 'Initialiser list ": name(n)" constructs members BEFORE the body runs. More efficient than name=n in the body (avoids double init).' });
            engine.graphCreateNode('ctor', 'Dog("Rex")\nctor called', -4, 0, 'cache');
            engine.graphConnect('cls', 'ctor', true);
            engine.highlight('ctor', 0x10b981);
            await delay(1200);
            onStep({ title: 'Object on stack: Dog d("Rex")', explanation: 'Stack object — destructor called automatically when it goes out of scope. RAII pattern: resource => constructor, release => destructor.' });
            engine.graphCreateNode('obj', 'd\nname="Rex"\n[stack]', 4, 0, 'backend');
            engine.graphConnect('cls', 'obj', true); engine.pulse('obj');
            await delay(1200);
            onStep({ title: 'Rule of Three/Five: if you define destructor, define copy ctor + copy assign too', explanation: 'If you own resources (raw pointer, fd), default copy will shallow-copy the pointer → double-free. Always implement all three (or use smart pointers).' });
        }
    },
    {
        id: 'cpp_inheritance',
        title: 'Inheritance & Virtual',
        icon: '🧬',
        code: `class Animal { public: virtual void speak() = 0; };\nclass Dog : public Animal {\n public: void speak() override { ... }\n};`,
        desc: 'Pure virtual functions define interfaces. virtual + override = runtime polymorphism.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Abstract class: pure virtual func = 0', explanation: 'virtual void speak() = 0 makes Animal abstract — cannot instantiate. Subclasses MUST override or they\'re abstract too.' });
            engine.graphCreateNode('animal', 'Animal\npure virtual\nspeak()=0', 0, 4, 'security');
            await delay(1000);
            for (const [id, label, x] of [['dog', 'Dog\n::speak()', -5], ['cat', 'Cat\n::speak()', 0], ['bird', 'Bird\n::speak()', 5]]) {
                engine.graphCreateNode(id, label, x, 0, 'backend');
                engine.graphConnect('animal', id, false);
                engine.highlight(id, 0x10b981);
                await delay(600);
            }
            onStep({ title: 'vtable: virtual dispatch at runtime', explanation: 'Each class with virtuals has a vtable (array of function pointers). Animal* a = new Dog; a->speak() looks up Dog::speak in Dog\'s vtable. ~1ns overhead.' });
            engine.graphCreateNode('vtable', 'Dog vtable:\n[0]=Dog::speak\n[1]=Dog::move', 6, -3, 'database');
            engine.graphConnect('dog', 'vtable', true);
            engine.highlight('vtable', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'override keyword catches typos', explanation: 'Without override, a typo in the signature creates a NEW function instead of overriding. override forces compile error if no match found.' });
        }
    },
    {
        id: 'cpp_templates',
        title: 'Templates (Generics)',
        icon: '🔧',
        code: `template<typename T>\nT max_val(T a, T b) {\n  return (a > b) ? a : b;\n}\nauto result = max_val(3, 7); // T=int`,
        desc: 'Templates generate type-specific code at compile time. Zero runtime overhead.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Template: generic function blueprint', explanation: 'template<typename T> is a blueprint. When you call max_val(3,7), compiler generates an int-specialised version at compile time.' });
            engine.graphCreateNode('tmpl', 'template<T>\nmax_val(T,T)', 0, 3, 'ml_model');
            await delay(1000);
            const specs = [['int_v', 'max_val<int>\n(3,7)→7', -6, 0, 0x3b82f6], ['dbl_v', 'max_val<double>\n(1.5,2.7)→2.7', 0, 0, 0x10b981], ['str_v', 'max_val<string>\n("b","a")→"b"', 6, 0, 0xfbbf24]];
            for (const [id, label, x, y, color] of specs) {
                engine.graphCreateNode(id, label, x, y, 'backend');
                engine.graphConnect('tmpl', id, true);
                engine.highlight(id, color);
                await delay(700);
            }
            onStep({ title: 'Template specialisation: custom case', explanation: 'template<> max_val<const char*>(...) to handle C-strings specially. Compiler picks the most specialised version.' });
            onStep({ title: 'Concepts (C++20): constrain templates', explanation: 'template<typename T> requires Comparable<T> documents and enforces constraints. Better error messages than SFINAE substitution failures.' });
        }
    },
    {
        id: 'cpp_stl',
        title: 'STL: vector, map, set',
        icon: '📚',
        code: `vector<int> v = {1,2,3};\nv.push_back(4);           // O(1) amortised\nmap<string,int> m;\nm["alice"] = 30;          // O(log n) tree`,
        desc: 'STL containers are generic, tested, optimised. Prefer them over raw arrays.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'vector<int>: dynamic array', explanation: 'Backed by contiguous heap block. push_back: O(1) amortised (doubles capacity). Random access: O(1). Cache-friendly — best default container.' });
            engine.createArrayAPI('vec', [1, 2, 3, 4], -3, 2);
            for (let i = 0; i < 4; i++) { engine.arrayHighlight('vec', i, 0x3b82f6); await delay(200); }
            await delay(600);
            onStep({ title: 'map<string,int>: Red-Black Tree', explanation: 'map keeps keys sorted. lookup/insert/erase: O(log n). Tree nodes scattered in memory — not cache-friendly. Use unordered_map for O(1) avg.' });
            const nodes = [['m_b', '"bob":25', 0, 0], ['m_a', '"alice":30', -4, -3], ['m_c', '"carol":28', 4, -3]];
            for (const [id, label, x, y] of nodes) {
                engine.graphCreateNode(id, label, x, y, 'database');
                if (id !== 'm_b') engine.graphConnect('m_b', id, false);
                engine.highlight(id, 0x10b981);
                await delay(700);
            }
            onStep({ title: 'set<int>: unique sorted values', explanation: 'Like map but stores keys only. find, insert, erase: O(log n). unordered_set for O(1) at the cost of order.' });
        }
    },
    {
        id: 'cpp_smart_pointers',
        title: 'Smart Pointers (RAII)',
        icon: '🔒',
        code: `auto p = make_unique<Dog>("Rex");\n// auto-deleted when p goes out of scope!\nshared_ptr<Dog> s1 = make_shared<Dog>("Buddy");\nshared_ptr<Dog> s2 = s1; // ref count = 2`,
        desc: 'Smart pointers manage lifetime automatically. Prefer over raw new/delete (RAII).',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'RAII: Resource Acquisition Is Initialisation', explanation: 'Bind resource lifetime to object lifetime. Constructor acquires, destructor releases. Exception-safe: destructor always called on scope exit.' });
            engine.graphCreateNode('raii', 'RAII principle:\nctor → acquire\ndtor → release', 0, 3, 'security');
            await delay(1000);
            onStep({ title: 'unique_ptr: sole ownership', explanation: 'unique_ptr<Dog> p = make_unique<Dog>(...). Only one owner. Cannot copy — only move. When p goes out of scope, delete called automatically.' });
            engine.graphCreateNode('uptr', 'unique_ptr<Dog>\n(sole owner)', -4, 0, 'backend');
            engine.graphCreateNode('dog1', 'Dog "Rex"', -4, -3, 'frontend');
            engine.graphConnect('uptr', 'dog1', true);
            engine.highlight('uptr', 0x10b981);
            await delay(1200);
            onStep({ title: 'shared_ptr: reference counted', explanation: 'Multiple owners possible. Internal ref count incremented on copy. When count reaches 0, object deleted. Thread-safe ref count (atomic).' });
            engine.graphCreateNode('sptr1', 'shared_ptr\n[rc=2]', 3, 0, 'cache');
            engine.graphCreateNode('sptr2', 'shared_ptr\n[rc=2]', 7, 0, 'cache');
            engine.graphCreateNode('dog2', 'Dog "Buddy"', 5, -3, 'frontend');
            engine.graphConnect('sptr1', 'dog2', true); engine.graphConnect('sptr2', 'dog2', true);
            engine.highlight('sptr1', 0x3b82f6); engine.highlight('sptr2', 0x3b82f6);
        }
    },
    {
        id: 'cpp_move_semantics',
        title: 'Move Semantics (&&)',
        icon: '🚀',
        code: `vector<int> a = {1,2,3,4,5};\nvector<int> b = std::move(a);\n// a is now empty! b owns the data\n// No copy made — just pointer swap`,
        desc: 'Move avoids expensive deep copies. std::move says "I don\'t need this anymore — take it."',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Copy semantics: expensive O(n) deep copy', explanation: 'vector<int> b = a; allocates new block, copies all n elements. For large data (1M ints), this is milliseconds of wasted work.' });
            engine.graphCreateNode('va', 'vector a\n[1,2,3,4,5]\n(5 ints on heap)', -5, 0, 'backend');
            engine.graphCreateNode('vb_copy', 'vector b (copy)\n[1,2,3,4,5]\nNew allocation!', 5, 0, 'backend');
            engine.graphConnect('va', 'vb_copy', true);
            engine.highlight('vb_copy', 0xef4444);
            await delay(1200);
            onStep({ title: 'Move semantics: O(1) pointer swap', explanation: 'std::move(a) casts to rvalue ref (&&). Move constructor just steals a\'s internal pointer. a becomes empty. Zero allocation!' });
            engine.graphCreateNode('vb_move', 'vector b (moved)\n← same heap block\nO(1)!', 5, -3, 'frontend');
            engine.graphConnect('va', 'vb_move', true);
            engine.highlight('vb_move', 0x10b981);
            engine.highlight('va', 0xef4444);
            await delay(1000);
            onStep({ title: 'Rule: after move, source is valid but unspecified', explanation: 'Don\'t use moved-from objects. Compilers automatically move temporaries (RVO/NRVO). std::move is a cast, not an operation.' });
        }
    },
    {
        id: 'cpp_exceptions',
        title: 'Exceptions & RAII Safety',
        icon: '🛡️',
        code: `try {\n  auto f = make_unique<File>("x.txt");\n  process(*f); // might throw!\n} catch (const exception& e) {\n  cerr << e.what();\n} // f auto-deleted even on throw!`,
        desc: 'Exceptions unwind the stack. RAII (smart pointers) guarantee cleanup on any exit.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Exception: throws std::exception', explanation: 'throw SomeException(...) unwinds the call stack, destroying local objects (calling destructors) until a matching catch is found.' });
            engine.graphCreateNode('try_', 'try block\nprocess(*f)', -4, 2, 'backend');
            engine.graphCreateNode('ex', 'throw\nstd::runtime_error', 0, 0, 'security');
            engine.graphCreateNode('catch_', 'catch(exception&)\ncerr << e.what()', 4, 2, 'frontend');
            engine.graphConnect('try_', 'ex', true);
            engine.graphConnect('ex', 'catch_', true);
            engine.highlight('ex', 0xef4444);
            await delay(1500);
            onStep({ title: 'RAII: unique_ptr destructor called during unwind', explanation: 'Stack unwinding destroys local objects in reverse order. unique_ptr<File>\'s destructor calls delete — file safely closed even on exception!' });
            engine.highlight('try_', 0x10b981);
            engine.highlight('catch_', 0x10b981);
            await delay(1000);
            onStep({ title: 'noexcept: functions that promise not to throw', explanation: 'noexcept hints allow compiler optimisations. If noexcept function throws, std::terminate called immediately. Move ctors should be noexcept.' });
        }
    },
    {
        id: 'cpp_stl_algorithms',
        title: 'STL Algorithms & Lambdas',
        icon: '⚙️',
        code: `vector<int> v = {5,1,3,2,4};\nsort(v.begin(), v.end());\nauto it = find_if(v.begin(), v.end(),\n  [](int x){ return x > 3; });`,
        desc: 'STL algorithms work on iterator ranges. Lambdas provide inline predicates.',
        async play(engine, onStep) {
            engine.reset();
            const arr = [5, 1, 3, 2, 4];
            engine.createArrayAPI('v', arr.slice());
            onStep({ title: 'STL Algorithm: sort(first, last)', explanation: 'sort uses Introsort (quicksort + heapsort + insertion). Average O(n log n). Works on any RandomAccessIterator range.' });
            await delay(1000);
            onStep({ title: 'Lambda: [](int x){ return x > 3; }', explanation: '[] is the capture clause. () is parameters. {} is body. Compiler creates an anonymous functor class — zero overhead vs plain function.' });
            engine.graphCreateNode('lam', 'lambda\n[capture](params)\n  { body }', 0, -3, 'ml_model');
            engine.highlight('lam', 0xfbbf24);
            await delay(1000);
            for (let i = 0; i < arr.length; i++) {
                const sorted = arr.slice().sort((a, b) => a - b);
                engine.arrayHighlight('v', i, 0x10b981);
                await delay(300);
            }
            onStep({ title: 'find_if → returns iterator or end()', explanation: 'Returns iterator to first element satisfying predicate. If not found, returns end(). Always check != end() before dereferencing.' });
        }
    },
];
