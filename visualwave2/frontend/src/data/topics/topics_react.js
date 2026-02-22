const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const reactTopics = [
    {
        id: 'react_components',
        title: 'Components & Props',
        icon: '⚛️',
        code: `function Greeting({ name }) {\n  return <h1>Hello, {name}!</h1>;\n}\n<Greeting name="Alice" />`,
        desc: 'React components are JS functions returning JSX. Props pass data from parent to child.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Component Tree', explanation: 'React app = tree of components. Parent passes data down via props. Data flows ONE way: parent → child. Child cannot modify parent\'s state.' });
            engine.graphCreateNode('app', 'App\n(root)', 0, 4, 'frontend');
            await delay(800);
            for (const [id, label, x] of [['nav', 'Navbar', -5], ['main', 'Main', 0], ['foot', 'Footer', 5]]) {
                engine.graphCreateNode(id, label, x, 1, 'backend');
                engine.graphConnect('app', id, false); await delay(400);
            }
            for (const [id, label, x, p] of [['greet', 'Greeting\nname="Alice"', -6, -2, 'nav'], ['hero', 'Hero\ntitle="Welcome"', 0, -2, 'main']]) {
                engine.graphCreateNode(id, label, x, -2, 'cache');
                engine.graphConnect(p, id, false); engine.pulse(id); await delay(500);
            }
            onStep({ title: 'Props: read-only in child', explanation: 'Props flow down. A child can NEVER modify props. To pass data up, parent gives child a callback function as a prop.' });
        }
    },
    {
        id: 'react_state',
        title: 'State & useState',
        icon: '🔄',
        code: `function Counter() {\n  const [count, setCount] = useState(0);\n  return (\n    <button onClick={() => setCount(c => c+1)}>\n      {count}\n    </button>\n  );\n}`,
        desc: 'useState declares local state. Calling the setter triggers a re-render.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'useState(0): local component state', explanation: 'useState returns [currentValue, setter]. Initial value is 0. React stores state outside the component function — persists across re-renders.' });
            engine.graphCreateNode('state', 'count = 0\n(React stores this)', 0, 3, 'database');
            await delay(1000);
            for (let i = 1; i <= 3; i++) {
                onStep({ title: `setCount(${i}) → triggers re-render`, explanation: `setCount schedules a re-render. React compares new tree with old (reconciliation). Only changed DOM nodes are updated.` });
                engine.graphCreateNode(`c${i}`, `count = ${i}`, -4 + i * 2, 0, 'backend');
                engine.graphConnect('state', `c${i}`, true);
                engine.highlight(`c${i}`, 0x10b981); engine.pulse(`c${i}`);
                await delay(900);
            }
            onStep({ title: 'Functional update: setCount(c => c+1)', explanation: 'Pass a function to use the latest state value. Direct setCount(count+1) can use stale closure value in async code.' });
        }
    },
    {
        id: 'react_useeffect',
        title: 'useEffect & Lifecycle',
        icon: '🔁',
        code: `useEffect(() => {\n  const sub = subscribe(userId);\n  return () => sub.unsubscribe(); // cleanup\n}, [userId]); // re-run when userId changes`,
        desc: 'useEffect runs side effects after render. Cleanup function prevents memory leaks.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'useEffect: side effects after paint', explanation: 'React renders → paints DOM → THEN runs useEffect. Good for data fetching, subscriptions, timers. Never block rendering with effects.' });
            engine.graphCreateNode('render', '1. render()\nJSX → vDOM', -5, 2, 'frontend');
            engine.graphCreateNode('dom', '2. Commit\nto real DOM', 0, 2, 'backend');
            engine.graphCreateNode('effect', '3. useEffect\n(after paint)', 5, 2, 'queue');
            engine.graphConnect('render', 'dom', true); engine.graphConnect('dom', 'effect', true);
            await delay(1500);
            onStep({ title: 'Dependency array [userId] controls re-runs', explanation: '[] = run once (mount). [userId] = run when userId changes. No array = run every render (usually wrong). React compares deps with Object.is.' });
            engine.highlight('effect', 0x10b981);
            await delay(1000);
            onStep({ title: 'Cleanup function prevents memory leaks', explanation: 'Return a function from useEffect → it runs before unmount and before the next effect run. Cancel fetches, clear intervals, unsubscribe.' });
            engine.graphCreateNode('cleanup', 'cleanup()\n→ unsubscribe', 5, -1, 'security');
            engine.graphConnect('effect', 'cleanup', true); engine.highlight('cleanup', 0xef4444);
        }
    },
    {
        id: 'react_vdom',
        title: 'Virtual DOM & Reconciliation',
        icon: '🌐',
        code: `// React creates a virtual copy of the DOM\n// When state changes:\n// 1. New vDOM created\n// 2. Diff with old vDOM\n// 3. Only changed nodes updated in real DOM`,
        desc: 'React diffs a lightweight JS object tree to minimise expensive real DOM operations.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Virtual DOM: JS object tree', explanation: 'React maintains an in-memory tree of plain JS objects mirroring the DOM. Creating JS objects is 100x faster than creating real DOM nodes.' });
            engine.graphCreateNode('vdom1', 'vDOM (before)\ndiv > h1 + ul', -4, 2, 'cache');
            engine.graphCreateNode('real', 'Real DOM', 0, -1, 'database');
            engine.graphConnect('vdom1', 'real', true);
            await delay(1200);
            onStep({ title: 'State change → new vDOM created', explanation: 'When state changes, React creates a brand NEW vDOM tree. Then it diffs the new vs old vDOM (reconciliation algorithm).' });
            engine.graphCreateNode('vdom2', 'vDOM (after)\ndiv > h1 + ul + li', 4, 2, 'cache');
            engine.highlight('vdom2', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'Diff → only changed nodes updated', explanation: 'React\'s diffing compares trees. Same type → recurse into children. Different type → replace entire subtree. Keys help efficiently reconcile lists.' });
            engine.graphCreateNode('patch', 'patch:\nadd <li>only!', 0, 1, 'frontend');
            engine.graphConnect('vdom2', 'patch', true); engine.graphConnect('patch', 'real', true);
            engine.highlight('patch', 0x10b981);
        }
    },
    {
        id: 'react_hooks_adv',
        title: 'useMemo, useCallback, useRef',
        icon: '⚡',
        code: `const sorted = useMemo(() => arr.sort(), [arr]);\nconst handler = useCallback(() => fn(id),[id]);\nconst inputRef = useRef(null); // DOM ref`,
        desc: 'Memoisation hooks prevent unnecessary recalculation and re-renders.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'useMemo: cache expensive computation', explanation: 'useMemo(() => expensiveCalc(), [dep]) re-runs ONLY when dep changes. Otherwise returns cached result. Great for sorting/filtering large lists.' });
            engine.graphCreateNode('memo', 'useMemo\ncached result', -4, 2, 'cache');
            engine.graphCreateNode('calc', 'expensiveCalc()\n(only on dep change)', -4, -1, 'backend');
            engine.graphConnect('memo', 'calc', true); engine.highlight('memo', 0x10b981);
            await delay(1200);
            onStep({ title: 'useCallback: stable function reference', explanation: 'useCallback(() => fn(id), [id]) returns the SAME function object when deps unchanged. Prevents child re-renders when function is passed as prop.' });
            engine.graphCreateNode('cb', 'useCallback\nstable reference', 4, 2, 'cache');
            engine.highlight('cb', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'useRef: mutable value that doesn\'t re-render', explanation: 'useRef returns {current: ...}. Changing .current does NOT trigger re-render. Use for DOM references, timers, previous values.' });
            engine.graphCreateNode('ref', 'useRef\ninputRef.current\n= <input>', 0, -2, 'database');
            engine.highlight('ref', 0x3b82f6);
        }
    },
    {
        id: 'react_context',
        title: 'Context & State Management',
        icon: '🌲',
        code: `const ThemeCtx = createContext("light");\n<ThemeCtx.Provider value="dark">\n  <Child /> {/* can read dark */}\n</ThemeCtx.Provider>`,
        desc: 'Context avoids prop drilling. Redux/Zustand for complex global state.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Prop drilling: passing through many levels', explanation: 'Without Context, passing theme from App → Layout → Sidebar → Button requires prop at every level. Context skips all intermediate components.' });
            engine.graphCreateNode('app2', 'App\ntheme="dark"', 0, 4, 'frontend');
            for (const [id, label, x, y] of [['lay', 'Layout\ntheme={theme}', 0, 1], ['side', 'Sidebar\ntheme={theme}', 0, -2], ['btn', 'Button\ntheme={theme}', 0, -5]]) {
                engine.graphCreateNode(id, label, x, y, 'backend');
                engine.graphConnect(id === 'lay' ? 'app2' : id === 'side' ? 'lay' : 'side', id, false);
                await delay(500);
            }
            await delay(800);
            onStep({ title: 'Context: global broadcast', explanation: 'ThemeCtx.Provider broadcasts value to ALL descendants. useContext(ThemeCtx) reads it anywhere in the tree. No intermediate props needed.' });
            engine.highlight('app2', 0x10b981); engine.highlight('btn', 0x10b981);
            await delay(1000);
            onStep({ title: 'Redux: predictable state container', explanation: 'Redux = single store + actions + reducers. Actions describe WHAT happened. Reducers describe HOW state changes. DevTools for time-travel debugging.' });
        }
    },
    {
        id: 'react_redux',
        title: 'Redux: Actions & Reducers',
        icon: '🔴',
        code: `const counterSlice = createSlice({\n  initialState: { count: 0 },\n  reducers: {\n    increment: state => { state.count++ }\n  }\n});`,
        desc: 'Redux manages global state. Actions describe events, reducers compute new state.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Redux: one-way data flow', explanation: 'UI dispatches an Action → Reducer computes new State → Store updates → React re-renders. Predictable, debuggable, testable.' });
            engine.graphCreateNode('ui', 'React UI\n(dispatch)', -6, 0, 'frontend');
            engine.graphCreateNode('store', 'Redux Store\n{ count: 0 }', 0, 3, 'database');
            engine.graphCreateNode('reducer', 'Reducer\naction → state', 0, 0, 'backend');
            engine.graphCreateNode('action', 'Action\n{type:"increment"}', 6, 0, 'cache');
            engine.graphConnect('ui', 'action', true);
            engine.graphConnect('action', 'reducer', true);
            engine.graphConnect('reducer', 'store', true);
            engine.graphConnect('store', 'ui', true);
            await delay(1500);
            onStep({ title: 'Reducer: pure function (state, action) → state', explanation: 'Reducers must be pure — no side effects, no mutations. Immer (used by RTK) lets you write "mutating" code that\'s actually immutable under the hood.' });
            engine.highlight('reducer', 0x10b981);
            await delay(1000);
            onStep({ title: 'Redux DevTools: time-travel debugging', explanation: 'Since every state change is recorded as an action, you can replay, rewind, and inspect every state change. Invaluable for debugging complex flows.' });
        }
    },
];
