const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const typescriptTopics = [
    {
        id: 'ts_types',
        title: 'Type System Basics',
        icon: '🔷',
        code: `let name: string = "Alice";\nlet age: number = 25;\nlet active: boolean = true;\nlet data: unknown = null;`,
        desc: 'TypeScript adds static types to JavaScript. Catch bugs at compile time, not runtime.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'TypeScript = JS + Type Annotations', explanation: 'tsc compiles .ts → .js. Type annotations are erased at runtime — zero cost to execution. All benefits at development time.' });
            const types = [['str', 'name: string', 0x3b82f6, 'frontend'], ['num', 'age: number', 0x10b981, 'backend'], ['bool', 'active: boolean', 0xec4899, 'cache'], ['unk', 'data: unknown', 0x94a3b8, 'security']];
            for (const [i, [id, label, color, type]] of types.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                engine.highlight(id, color); engine.pulse(id);
                onStep({ title: label, explanation: `TS enforces this type at compile time. ${id === 'unk' ? 'unknown is safer than any — must narrow before use' : 'Assigning wrong type → compile error, not runtime crash.'}` });
                await delay(800);
            }
            onStep({ title: 'any vs unknown: prefer unknown', explanation: 'any disables all type checks. unknown requires you to narrow the type first (if/typeof/instanceof). Much safer for API responses and casts.' });
        }
    },
    {
        id: 'ts_interfaces',
        title: 'Interfaces & Type Aliases',
        icon: '📋',
        code: `interface User {\n  id: number;\n  name: string;\n  email?: string; // optional\n}\ntype ID = string | number;`,
        desc: 'Interfaces describe object shapes. Type aliases name complex types. Both are erased at runtime.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'interface: describe object shape', explanation: 'interface User declares the shape any User object must have. Optional fields marked with ?. Extra properties allowed only in some contexts.' });
            engine.graphCreateNode('iface', 'User interface\n{ id: number\n  name: string\n  email?: string }', 0, 2, 'security');
            await delay(1200);
            onStep({ title: 'Structural typing: duck typing with types', explanation: 'TS checks shape, not class name. Any object {id:1,name:"Alice"} satisfies User — no need to declare implements User.' });
            engine.graphCreateNode('obj', '{ id:1\n  name:"Alice"\n  email:"a@b.com" }', -4, -2, 'backend');
            engine.graphCreateNode('noobj', '{ id:1 }\n❌ missing name', 4, -2, 'frontend');
            engine.graphConnect('iface', 'obj', true); engine.graphConnect('iface', 'noobj', true);
            engine.highlight('obj', 0x10b981); engine.highlight('noobj', 0xef4444);
            await delay(1000);
            onStep({ title: 'type ID = string | number  → union type', explanation: 'Type aliases name complex types. Union (A|B) means "can be A or B". Intersection (A&B) means "must be both A and B".' });
        }
    },
    {
        id: 'ts_generics',
        title: 'Generics',
        icon: '⚙️',
        code: `function identity<T>(x: T): T { return x; }\nconst wrap = <T>(val: T): T[] => [val];\n// Type inferred at call site:\nidentity(42);  // T = number`,
        desc: 'Generics write type-safe functions/classes that work for any specified type.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Generic function: <T> is a type parameter', explanation: 'identity<T>(x:T):T is a blueprint. When called, TS infers or you specify T. The body is type-checked with T as a placeholder.' });
            engine.graphCreateNode('tmpl', 'identity<T>\n(x:T): T', 0, 3, 'ml_model');
            await delay(1000);
            for (const [id, call, color] of [['n', 'identity(42)\nT=number', 0x3b82f6], ['s', 'identity("hi")\nT=string', 0x10b981], ['b', 'identity(true)\nT=boolean', 0xec4899]]) {
                engine.graphCreateNode(id, call, id === 'n' ? -5 : id === 's' ? 0 : 5, 0, 'backend');
                engine.graphConnect('tmpl', id, true);
                engine.highlight(id, color); await delay(700);
            }
            onStep({ title: 'Constraint: <T extends Comparable>', explanation: '<T extends {length: number}> means T must have a length property. Constrains what types can be used — prevents runtime surprises.' });
        }
    },
    {
        id: 'ts_union_narrow',
        title: 'Union Types & Narrowing',
        icon: '🔍',
        code: `type Shape = Circle | Square;\nfunction area(s: Shape): number {\n  if (s.kind === "circle")\n    return Math.PI * s.radius ** 2;\n  return s.side ** 2;\n}`,
        desc: 'Union types allow multiple types. Narrowing tells TS which branch is which.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Union type: Circle | Square', explanation: 'Shape can be either. TS doesn\'t know WHICH until you narrow it. Must check before accessing circle-only properties like .radius.' });
            engine.graphCreateNode('union', 'Shape\n= Circle | Square', 0, 3, 'queue');
            engine.graphCreateNode('circle', 'Circle\n{ kind:"circle"\n  radius:5 }', -4, 0, 'cache');
            engine.graphCreateNode('square', 'Square\n{ kind:"square"\n  side:4 }', 4, 0, 'database');
            engine.graphConnect('union', 'circle', false); engine.graphConnect('union', 'square', false);
            await delay(1200);
            onStep({ title: 'if (s.kind === "circle") → narrowing', explanation: 'Inside the if block, TS narrows s\'s type to Circle. s.radius is now safe. This is discriminated union — the "kind" field is the discriminant.' });
            engine.highlight('circle', 0x10b981); engine.highlight('square', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'typeof, instanceof, in — narrowing tools', explanation: 'typeof x === "string" narrows to string. x instanceof Date narrows to Date. "radius" in s checks property existence. TS tracks all of these.' });
        }
    },
    {
        id: 'ts_utility',
        title: 'Utility Types',
        icon: '🛠️',
        code: `type PartialUser = Partial<User>;     // all optional\ntype ReadonlyUser = Readonly<User>;   // immutable\ntype NameOnly = Pick<User, "name">;   // subset\ntype NoEmail = Omit<User, "email">;  // exclude`,
        desc: 'Built-in utility types transform types without re-declaring them.',
        async play(engine, onStep) {
            engine.reset();
            engine.graphCreateNode('base', 'User\n{ id, name, email }', 0, 3, 'database');
            await delay(800);
            const utils = [['partial', 'Partial<User>\nall fields optional', -6, 0, 0x3b82f6], ['readonly', 'Readonly<User>\ncannot mutate', -2, 0, 0x10b981], ['pick', 'Pick<User,"name">\nonly name field', 2, 0, 0xfbbf24], ['omit', 'Omit<User,"email">\nall except email', 6, 0, 0xec4899]];
            for (const [id, label, x, y, color] of utils) {
                engine.graphCreateNode(id, label, x, y, 'backend');
                engine.graphConnect('base', id, true);
                engine.highlight(id, color);
                onStep({ title: label.split('\n')[0], explanation: `${label} — all compile-time only. Zero runtime overhead.` });
                await delay(700);
            }
            onStep({ title: 'Record<K,V>, Required<T>, ReturnType<F>', explanation: 'Record<string,number> = dict type. Required<T> makes all optional fields required. ReturnType<typeof fn> infers function return type.' });
        }
    },
    {
        id: 'ts_enums',
        title: 'Enums & Literal Types',
        icon: '🔢',
        code: `enum Direction { Up, Down, Left, Right }\nconst dir: Direction = Direction.Up;\n// const enum: inlined, zero runtime\ntype Status = "active"|"inactive"|"pending";`,
        desc: 'Enums name sets of constants. String literal unions are often preferred.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Numeric enum: Direction.Up = 0', explanation: 'By default, enum values are 0,1,2,3. Can assign explicitly: Up = 1. Compiled to JS object — has runtime presence unlike types.' });
            engine.createArrayAPI('vals', [0, 1, 2, 3]);
            engine.arrayHighlight('vals', 0, 0x3b82f6);
            await delay(1000);
            onStep({ title: 'const enum: zero runtime overhead', explanation: 'const enum Direction {...} causes TypeScript to inline the values directly. Direction.Up → 0 in the output. No JS object generated.' });
            onStep({ title: 'String literal union: "active"|"inactive"', explanation: 'type Status = "active"|"inactive"|"pending" is often better: readable, serialises cleanly to JSON, no runtime object needed.' });
            engine.graphCreateNode('lit', '"active" | "inactive" | "pending"', 0, -3, 'frontend');
            engine.highlight('lit', 0x10b981);
        }
    },
    {
        id: 'ts_decorators',
        title: 'Decorators (Experimental)',
        icon: '🎁',
        code: `@Injectable()\nclass UserService {\n  @Log()\n  getUser(id: number) { ... }\n}`,
        desc: 'Decorators annotate classes/methods for frameworks like Angular and NestJS.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: '@Injectable() class decorator', explanation: '@Injectable() registers UserService as a DI-managed class. Frameworks (Angular, NestJS) inspect these at runtime via reflect-metadata.' });
            engine.graphCreateNode('cls', 'UserService\n@Injectable()', 0, 3, 'backend');
            engine.graphCreateNode('di', 'DI Container\nregistered ✅', 4, 3, 'database');
            engine.graphConnect('cls', 'di', true); engine.highlight('di', 0x10b981);
            await delay(1200);
            onStep({ title: '@Log() method decorator', explanation: '@Log() wraps getUser with logging before/after. Decorator is called with the class prototype, method name, and descriptor — can modify behaviour.' });
            engine.graphCreateNode('meth', 'getUser(id)\n@Log() wraps it', 0, 0, 'frontend');
            engine.graphCreateNode('log', 'before + after\nlogging injected', -4, 0, 'cache');
            engine.graphConnect('cls', 'meth', false); engine.graphConnect('log', 'meth', true);
            engine.highlight('log', 0xfbbf24);
        }
    },
];
