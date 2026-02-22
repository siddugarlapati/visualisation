const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const bootstrapCssTopics = [
    {
        id: 'css_box_model',
        title: 'Box Model',
        icon: '📦',
        code: `/* Box: content + padding + border + margin */\n.box {\n  width: 200px;    /* content */\n  padding: 20px;\n  border: 2px solid;\n  margin: 10px;\n}`,
        desc: 'Every HTML element is a box: content, padding, border, margin. box-sizing changes calculation.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Every element is a rectangular box', explanation: 'Content area + padding (inner space) + border (outline) + margin (outer space). Default: width = content only. Total painted = content+padding+border.' });
            const layers = [['margin', 'Margin\n(outer space)', 0x94a3b8, 'cloud'], ['border', 'Border\n2px solid', 0xef4444, 'security'], ['padding', 'Padding\n20px', 0xfbbf24, 'cache'], ['content', 'Content\n200×100px', 0x10b981, 'frontend']];
            for (const [i, [id, label, color, type]] of layers.entries()) {
                engine.graphCreateNode(id, label, -3 + i * 2, -i, type);
                engine.highlight(id, color);
                onStep({ title: id, explanation: label + '. Each layer wraps around the one inside it.' });
                await delay(700);
            }
            onStep({ title: 'box-sizing: border-box (recommended)', explanation: 'box-sizing: border-box makes width include padding+border. Much more intuitive. Set globally: *, *::before, *::after { box-sizing: border-box; }' });
        }
    },
    {
        id: 'css_flexbox',
        title: 'Flexbox Layout',
        icon: '📐',
        code: `.container {\n  display: flex;\n  justify-content: space-between;\n  align-items: center;\n}\n.item { flex: 1; }`,
        desc: 'Flexbox: one-dimensional layout. justify-content = main axis, align-items = cross axis.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Flex container: display: flex', explanation: 'Parent becomes flex container. Children become flex items, arranged in a row by default. No float, no clearfix needed.' });
            engine.graphCreateNode('cont', 'flex container', 0, 3, 'frontend');
            for (let i = 0; i < 4; i++) {
                engine.graphCreateNode(`item${i}`, `item ${i + 1}`, -6 + i * 4, 0, 'backend');
                engine.graphConnect('cont', `item${i}`, false); await delay(400);
            }
            await delay(600);
            onStep({ title: 'justify-content: space-between, center, flex-end', explanation: 'justify-content controls items along the main axis (row = horizontal). space-between: even gaps. center: centred. flex-end: right-aligned.' });
            engine.highlight('cont', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'align-items: stretch, center (cross axis)', explanation: 'align-items controls the cross axis (row = vertical). center vertically centres items. stretch fills the container height. Flex makes vertically centering trivial!' });
            onStep({ title: 'flex-wrap: nowrap vs wrap', explanation: 'flex-wrap: wrap lets items overflow to next line. Combine with flex: 0 0 calc(33% - gap) for responsive grids without breakpoints.' });
        }
    },
    {
        id: 'css_grid',
        title: 'CSS Grid Layout',
        icon: '🔲',
        code: `.container {\n  display: grid;\n  grid-template-columns: repeat(3, 1fr);\n  grid-template-rows: auto;\n  gap: 16px;\n}`,
        desc: 'Grid: two-dimensional layout. Define rows AND columns. Items placed on the grid explicitly.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Grid: 2D layout power', explanation: 'Unlike Flexbox (1D), Grid controls both rows AND columns simultaneously. Perfect for page layouts, image galleries, dashboards.' });
            for (let r = 0; r < 2; r++) {
                for (let c = 0; c < 3; c++) {
                    const id = `cell${r * 3 + c}`;
                    engine.graphCreateNode(id, `cell ${r * 3 + c + 1}`, -4 + c * 4, 1 - r * 3, 'frontend');
                    engine.highlight(id, 0x3b82f6);
                    await delay(200);
                }
            }
            onStep({ title: 'repeat(3, 1fr): 3 equal columns', explanation: '1fr = one fraction of remaining space. repeat(3,1fr) = 3 equal columns. grid-template-columns: 200px 1fr 2fr = fixed + flexible + double-flexible.' });
            await delay(1000);
            onStep({ title: 'grid-column: 1/-1 → span full width', explanation: 'grid-column: 1 / -1 makes an item span from first to last column. grid-area: header assigns the item to a named template area.' });
            engine.highlight('cell0', 0xfbbf24); engine.highlight('cell1', 0xfbbf24); engine.highlight('cell2', 0xfbbf24);
        }
    },
    {
        id: 'bootstrap_grid',
        title: 'Bootstrap: 12-Column Grid',
        icon: '🎨',
        code: `<div class="row">\n  <div class="col-md-8">Main</div>\n  <div class="col-md-4">Sidebar</div>\n</div>\n<!-- col-md-8: 8/12 = 66% on ≥md screens -->`,
        desc: 'Bootstrap divides the row into 12 columns. Responsive breakpoints: sm/md/lg/xl/xxl.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Bootstrap: 12-column grid system', explanation: 'row divides into 12 equal columns. col-md-8 takes 8/12 (66%). Must add up to 12 (or less). Uses CSS Flexbox under the hood.' });
            for (let i = 0; i < 12; i++) {
                engine.graphCreateNode(`col${i}`, `${i + 1}`, -11 + i * 2, 2, 'cache');
                engine.highlight(`col${i}`, i < 8 ? 0x3b82f6 : 0xfbbf24);
                await delay(100);
            }
            await delay(600);
            onStep({ title: 'Responsive breakpoints: xs/sm/md/lg/xl/xxl', explanation: 'col-12 (all screens) + col-md-8 (≥768px) stack the rules. Mobile-first: start with smallest breakpoint, add larger overrides.' });
            onStep({ title: 'col-auto: shrink to content width', explanation: 'col-auto takes only as much space as needed. Use alongside col or col-{n} to mix fixed and flexible columns in one row.' });
        }
    },
    {
        id: 'css_animations',
        title: 'CSS Animations & Transitions',
        icon: '✨',
        code: `@keyframes slide {\n  from { transform: translateX(-100px); opacity:0; }\n  to   { transform: translateX(0); opacity:1; }\n}\n.card { animation: slide 0.4s ease-out; }`,
        desc: '@keyframes defines animation steps. transition creates smooth property changes on state.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: '@keyframes: define animation steps', explanation: '@keyframes defines from→to or percentage-based steps. The browser interpolates between keyframes. GPU-accelerated with transform/opacity.' });
            engine.graphCreateNode('k0', 'from:\ntranslateX(-100)\nopacity:0', -4, 2, 'security');
            engine.graphCreateNode('k100', 'to:\ntranslateX(0)\nopacity:1', 4, 2, 'frontend');
            engine.graphConnect('k0', 'k100', true);
            engine.highlight('k0', 0xef4444); engine.highlight('k100', 0x10b981);
            await delay(1200);
            onStep({ title: 'transition: animate on property CHANGE', explanation: 'transition: opacity 0.3s ease on :hover smoothly animates. Triggered by state changes (hover, focus, class toggle). No @keyframes needed.' });
            engine.graphCreateNode('trans', '.btn:hover {\n  background: blue;\n  transition: 0.3s;\n}', 0, -2, 'cache');
            engine.highlight('trans', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'GPU: transform & opacity for 60fps', explanation: 'transform (translate, scale, rotate) and opacity run on the GPU compositor — 60fps guaranteed. left/top/margin trigger layout: slow. Always use transform instead!' });
        }
    },
    {
        id: 'css_variables',
        title: 'CSS Variables & Theming',
        icon: '🎨',
        code: `:root {\n  --primary: #3b82f6;\n  --spacing: 8px;\n}\n.btn {\n  background: var(--primary);\n  padding: var(--spacing);\n}`,
        desc: 'CSS custom properties (variables) enable consistent theming and dark mode toggling.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: ':root: define global variables', explanation: ':root is the highest scope. Variables cascade like CSS properties. Defined as --name: value. Read with var(--name). Runtime-mutable via JS.' });
            engine.graphCreateNode('root', ':root\n--primary: #3b82f6\n--spacing: 8px', 0, 3, 'database');
            await delay(1000);
            onStep({ title: 'var(--primary) reads the value', explanation: 'var(--primary, #000) has a fallback. Variables cascade — component-scoped variables override :root ones. Perfect for theming and design tokens.' });
            for (const [id, label, x] of [['btn', 'btn\nbg: var(--primary)', -4], ['input', 'input\npadding: var(--spacing)', 0], ['card', 'card\nborder: var(--primary)', 4]]) {
                engine.graphCreateNode(id, label, x, 0, 'frontend');
                engine.graphConnect('root', id, true); engine.highlight(id, 0x3b82f6); await delay(500);
            }
            onStep({ title: 'Dark mode: one class swap!', explanation: '[data-theme="dark"] { --primary: #60a5fa; } Just add data-theme="dark" to <html>. All elements using --primary update instantly.' });
            engine.graphCreateNode('dark', '[data-theme="dark"]\n--primary: light\n(one line change!)', 0, -2, 'backend');
            engine.highlight('dark', 0x6366f1);
        }
    },
    {
        id: 'bootstrap_components',
        title: 'Bootstrap Components',
        icon: '🧩',
        code: `<!-- Button -->\n<button class="btn btn-primary">Submit</button>\n<!-- Modal trigger -->\n<button data-bs-toggle="modal"\n        data-bs-target="#myModal">Open</button>`,
        desc: 'Bootstrap provides pre-built components: buttons, navbars, modals, toasts, cards, forms.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Bootstrap: utility-first + components', explanation: 'Bootstrap 5 comes with pre-styled components (buttons, cards, nav, modals) + utility classes (mt-3, d-flex, text-center). Responsive out-of-box.' });
            const comps = [['btn', 'btn\n(button styles)', 'frontend'], ['nav', 'navbar\n(responsive)', 'backend'], ['modal', 'modal\n(overlay)', 'cache'], ['card', 'card\n(content block)', 'database'], ['form', 'form\n(inputs+validation)', 'security']];
            for (const [i, [id, label, type]] of comps.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                engine.highlight(id, 0x3b82f6); await delay(500);
            }
            await delay(500);
            onStep({ title: 'data-bs-* attributes: JavaScript-free interactions', explanation: 'data-bs-toggle="modal" with data-bs-target="#id" opens modals. data-bs-toggle="collapse", "tooltip", "dropdown" work similarly. No JS needed.' });
            onStep({ title: 'Utility classes: spacing, display, text', explanation: 'mt-3 = margin-top 3 (1rem), p-2 = padding 2, d-flex = display flex, text-center, fw-bold, fs-5. Hundreds of utilities — avoids writing custom CSS.' });
        }
    },
];
