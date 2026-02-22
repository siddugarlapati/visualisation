const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const nodeTopics = [
    {
        id: 'node_eventloop',
        title: 'Node.js Event Loop',
        icon: '🔁',
        code: `console.log("A");  // sync\nsetTimeout(()=>console.log("B"),0); // macro\nPromise.resolve().then(()=>console.log("C")); // micro\nconsole.log("D");\n// Output: A D C B`,
        desc: 'Node.js is single-threaded with an event loop. Microtasks (Promises) drain before macrotasks.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Event Loop Architecture', explanation: 'JS is single-threaded. Event loop checks: call stack empty? → drain microtask queue → pick next macrotask.' });
            engine.graphCreateNode('stack', 'Call Stack', -6, 0, 'queue');
            engine.graphCreateNode('micro', 'Microtask Queue\n(Promise.then)', 0, 0, 'cache');
            engine.graphCreateNode('macro', 'Macrotask Queue\n(setTimeout, I/O)', 6, 0, 'queue');
            engine.graphCreateNode('loop', 'Event Loop', 0, -3, 'kubernetes');
            engine.graphConnect('loop', 'stack', true); engine.graphConnect('micro', 'loop', true); engine.graphConnect('macro', 'loop', true);
            await delay(1500);
            for (const [step, target, explanation] of [
                ['A: console.log sync', 'stack', 'Push to call stack, execute immediately, pop.'],
                ['D: console.log sync', 'stack', 'Same. Stack drains to empty.'],
                ['C: Promise.then (microtask)', 'micro', 'Microtask queue drained BEFORE any macrotask. Promise callbacks here.'],
                ['B: setTimeout (macrotask)', 'macro', 'Macrotask runs last — next iteration of the event loop.'],
            ]) {
                onStep({ title: step, explanation });
                engine.highlight(target, 0x10b981); engine.pulse(target);
                await delay(1000);
            }
        }
    },
    {
        id: 'node_streams',
        title: 'Streams & Piping',
        icon: '🌊',
        code: `const fs = require("fs");\nfs.createReadStream("huge.csv")\n  .pipe(csvParser())\n  .pipe(transformStream)\n  .pipe(res); // to HTTP response`,
        desc: 'Streams process data chunk by chunk — perfect for large files without loading all in RAM.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Why Streams? Memory efficiency', explanation: 'Without streams: readFile loads 1GB into RAM. With streams: 64KB chunk → process → discard. Memory stays constant.' });
            engine.graphCreateNode('file', 'huge.csv\n(1 GB on disk)', -7, 0, 'database');
            engine.graphCreateNode('chunk', 'chunk\n(64KB)', -3, 0, 'cache');
            engine.graphCreateNode('parse', 'CSV parser\nstream', 1, 0, 'backend');
            engine.graphCreateNode('transform', 'Transform\nstream', 5, 0, 'backend');
            engine.graphCreateNode('res', 'HTTP\nResponse', 9, 0, 'frontend');
            for (const [from, to] of [['file', 'chunk'], ['chunk', 'parse'], ['parse', 'transform'], ['transform', 'res']]) {
                engine.graphConnect(from, to, true); await delay(500);
            }
            await delay(500);
            ['chunk', 'parse', 'transform'].forEach(id => { engine.pulse(id); engine.highlight(id, 0x10b981); });
            onStep({ title: 'Backpressure: .pipe() throttles automatically', explanation: '.pipe() handles backpressure — if the consumer is slow, the producer pauses. Prevents OOM. Manual implementation with .read()/.write().' });
            engine.highlight('res', 0x3b82f6);
        }
    },
    {
        id: 'node_express',
        title: 'Express & Middleware',
        icon: '🚂',
        code: `app.use(helmet());\napp.use(cors());\napp.get("/users", authMiddleware, (req,res)=>{\n  res.json(getUsers());\n});`,
        desc: 'Express is a minimal HTTP framework. Middleware functions process requests in a chain.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Express middleware pipeline', explanation: 'Each middleware calls next() to pass to the next one. Any middleware can respond early (auth fail, validation). Order matters!' });
            const mw = [['helmet', 'helmet()\n(security headers)', 'security'], ['cors', 'cors()\n(CORS headers)', 'cloud'], ['auth', 'authMiddleware\n(verify JWT)', 'frontend'], ['handler', 'route handler\n(business logic)', 'backend'], ['res', 'Response\nto client', 'frontend']];
            for (const [i, [id, label, type]] of mw.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(mw[i - 1][0], id, true);
                engine.pulse(id); await delay(600);
            }
            await delay(500);
            onStep({ title: 'Auth middleware: verify JWT → next() or 401', explanation: 'authMiddleware decodes JWT, checks expiry. If invalid: res.status(401).json({error:"Unauthorized"}). next() never called — chain stops.' });
            engine.highlight('auth', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'Error middleware: (err, req, res, next)', explanation: '4-argument middleware catches errors from any previous middleware. throw new Error() or next(err) anywhere bubbles to here.' });
        }
    },
    {
        id: 'node_modules',
        title: 'CommonJS vs ES Modules',
        icon: '📦',
        code: `// CommonJS (require)\nconst fs = require("fs");\nmodule.exports = { helper };\n// ES Modules (import)\nimport { readFile } from "fs/promises";\nexport const util = 42;`,
        desc: 'Node.js supports both CommonJS (require) and ESM (import/export). ESM is the modern standard.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'CommonJS: synchronous require()', explanation: 'require() loads modules synchronously and caches them in require.cache. Fine for server startup. Cannot tree-shake — bundlers ship everything.' });
            engine.graphCreateNode('cjs', 'CommonJS\nrequire()\nmodule.exports', -4, 2, 'backend');
            engine.graphCreateNode('cache', 'require.cache\n{mod: exports}', -4, -1, 'database');
            engine.graphConnect('cjs', 'cache', true); engine.highlight('cache', 0x3b82f6);
            await delay(1200);
            onStep({ title: 'ES Modules: static, async, tree-shakeable', explanation: 'import is static — analysable at parse time. Bundlers (webpack/Rollup) can tree-shake unused exports. Top-level await is supported in ESM.' });
            engine.graphCreateNode('esm', 'ES Modules\nimport/export\nstatic analysis ✅', 4, 2, 'frontend');
            engine.graphCreateNode('tree', 'Tree shaking\n(dead code removed)', 4, -1, 'cache');
            engine.graphConnect('esm', 'tree', true); engine.highlight('tree', 0x10b981);
            await delay(1000);
            onStep({ title: 'package.json "type":"module" enables ESM', explanation: 'Add "type":"module" to package.json. .mjs/.cjs extensions force the module type regardless. Named exports are more ESM-friendly.' });
        }
    },
    {
        id: 'node_async_patterns',
        title: 'Callbacks → Promises → async/await',
        icon: '⏳',
        code: `// Callback hell:\nfs.readFile("a", cb1(err, a) => {\n  fs.readFile("b", cb2(err, b) => { ... })\n});\n// async/await:\nconst a = await fs.promises.readFile("a");\nconst b = await fs.promises.readFile("b");`,
        desc: 'Async patterns evolved: callbacks → Promises → async/await for flat, readable code.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Callback hell: deeply nested', explanation: 'Each async op needs a callback. If the next op depends on the result, nest deeper. Error handling repeated at every level. Impossible to read.' });
            engine.graphCreateNode('cb1', 'readFile("a")\n callback', -5, 2, 'backend');
            engine.graphCreateNode('cb2', '  readFile("b")\n  callback', -3, 0, 'backend');
            engine.graphCreateNode('cb3', '    readFile("c")\n    callback', -1, -2, 'backend');
            engine.graphConnect('cb1', 'cb2', true); engine.graphConnect('cb2', 'cb3', true);
            engine.highlight('cb3', 0xef4444);
            await delay(1500);
            onStep({ title: 'Promise chain: flat, composable', explanation: '.then().then().catch() is flat. Errors propagate to nearest .catch(). But chains get verbose for complex flows.' });
            engine.graphCreateNode('p1', 'readFile("a")\n.then()', 3, 2, 'cache');
            engine.graphCreateNode('p2', '.then()\n→ readFile("b")', 5, 0, 'cache');
            engine.graphCreate = null;
            engine.graphConnect('p1', 'p2', true); engine.highlight('p2', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'async/await: synchronous-looking async code', explanation: 'await suspends the async function. Error handling with try/catch. Reads like synchronous code. Use Promise.all for parallel awaits.' });
        }
    },
    {
        id: 'node_cluster',
        title: 'Cluster & Worker Threads',
        icon: '🖧',
        code: `const cluster = require("cluster");\nif (cluster.isPrimary) {\n  for (let i=0; i<4; i++) cluster.fork();\n} else { app.listen(3000); }`,
        desc: 'Node.js is single-threaded but cluster forks OS processes. Worker threads for CPU tasks.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Node.js: one thread per process', explanation: 'A single Node.js process uses ONE CPU core. On a 8-core machine, 7 cores idle. Cluster mode forks the process for each core.' });
            engine.graphCreateNode('primary', 'Primary Process\n(cluster.master)', 0, 3, 'kubernetes');
            await delay(1000);
            for (let i = 0; i < 4; i++) {
                engine.graphCreateNode(`w${i}`, `Worker ${i + 1}\napp.listen(3000)`, -6 + i * 4, 0, 'backend');
                engine.graphConnect('primary', `w${i}`, true);
                engine.pulse(`w${i}`); await delay(400);
            }
            onStep({ title: 'OS load-balances across workers', explanation: 'All workers share the same port. OS round-robins incoming connections (Linux). Workers are separate processes — crash isolation. Zero shared memory.' });
            engine.highlight('primary', 0x10b981);
            await delay(1000);
            onStep({ title: 'Worker Threads for CPU-bound tasks', explanation: 'worker_threads module shares memory via SharedArrayBuffer. Good for image processing, crypto, compression — things blocked by the event loop.' });
        }
    },
];
