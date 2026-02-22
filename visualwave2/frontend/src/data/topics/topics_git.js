const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const gitTopics = [
    {
        id: 'git_basics',
        title: 'Git: Commits & History',
        icon: '📝',
        code: `git init\ngit add .\ngit commit -m "Initial commit"\ngit log --oneline`,
        desc: 'Git stores snapshots (commits) of your project. Every commit points to its parent.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Git: distributed version control', explanation: 'Every clone is a full copy of history. No central single point of failure. Branches are cheap (just a pointer to a commit). Git stores snapshots, not diffs.' });
            const commits = [['c0', 'A1b2c\n"Init"'], ['c1', 'D3e4f\n"Add login"'], ['c2', 'G5h6i\n"Fix bug"'], ['c3', 'J7k8l\n"New feat"']];
            for (const [i, [id, label]] of commits.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 5, 0, 'database');
                if (i > 0) engine.graphConnect(commits[i - 1][0], id, true);
                engine.highlight(id, 0x3b82f6); engine.pulse(id);
                onStep({ title: `Commit: ${label.split('\n')[1]}`, explanation: `Each commit has a SHA hash, parent reference, author, message, and a tree object pointing to the snapshot of all files.` });
                await delay(900);
            }
            onStep({ title: 'HEAD: pointer to current position', explanation: 'HEAD usually points to a branch name (main). git checkout moves HEAD. Detached HEAD = HEAD points to specific commit, not a branch.' });
            engine.graphCreateNode('head', 'HEAD\n↓\nmain', 7, -2, 'frontend');
            engine.graphConnect('head', 'c3', false); engine.highlight('head', 0x10b981);
        }
    },
    {
        id: 'git_branches',
        title: 'Branching & Merging',
        icon: '🌿',
        code: `git checkout -b feature/login  # create + switch\ngit commit -m "Login form"\ngit checkout main\ngit merge feature/login        # fast-forward`,
        desc: 'Branches are cheap pointers to commits. Merge integrates branches.',
        async play(engine, onStep) {
            engine.reset();
            engine.graphCreateNode('m1', 'main: A', -4, 2, 'backend');
            engine.graphCreateNode('m2', 'main: B', 0, 2, 'backend');
            engine.graphConnect('m1', 'm2', true);
            await delay(1000);
            onStep({ title: 'git branch feature: new pointer', explanation: 'Branch creation is instant — just writes a file with commit SHA. feature/login branch starts at same commit as main.' });
            engine.graphCreateNode('f1', 'feature: C', -2, -1, 'cache');
            engine.graphCreateNode('f2', 'feature: D', 2, -1, 'cache');
            engine.graphConnect('m2', 'f1', true); engine.graphConnect('f1', 'f2', true);
            engine.highlight('f1', 0x10b981); engine.highlight('f2', 0x10b981);
            await delay(1200);
            onStep({ title: 'git merge: three-way merge', explanation: 'Git finds common ancestor (B), compares both branches. If no conflicts: creates merge commit with two parents. Fast-forward if no divergence.' });
            engine.graphCreateNode('merge', 'Merge commit\n(two parents)', 6, 2, 'database');
            engine.graphConnect('m2', 'merge', true); engine.graphConnect('f2', 'merge', true);
            engine.highlight('merge', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'Conflict: same line changed in both branches', explanation: 'Git marks <<<< ==== >>>> in file. You manually choose which change to keep. Then git add + git commit to finish merge.' });
        }
    },
    {
        id: 'git_rebase',
        title: 'Rebase vs Merge',
        icon: '🔄',
        code: `# Rebase: linear history\ngit checkout feature\ngit rebase main\n# Replay feature commits on top of latest main`,
        desc: 'Rebase rewrites history for a linear log. Merge preserves it with merge commits.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Before: feature branches off main at B', explanation: 'Main has moved to C,D since feature branched. Feature has commits E,F based on old B.' });
            engine.graphCreateNode('b', 'B (base)', -4, 2, 'database');
            engine.graphCreateNode('c', 'C (main)', 0, 2, 'database');
            engine.graphCreateNode('d', 'D (main)', 4, 2, 'database');
            engine.graphCreateNode('e', 'E (feat)', -2, -1, 'cache');
            engine.graphCreateNode('f', 'F (feat)', 2, -1, 'cache');
            engine.graphConnect('b', 'c', true); engine.graphConnect('c', 'd', true);
            engine.graphConnect('b', 'e', true); engine.graphConnect('e', 'f', true);
            await delay(1500);
            onStep({ title: 'After rebase: feature replayed on top of D', explanation: 'git rebase main replays E,F on top of D. Commits get new SHA hashes. Linear history — no merge commit. NEVER rebase shared branches!' });
            engine.graphCreateNode('e2', "E' (rebased)", 6, -1, 'cache');
            engine.graphCreateNode('f2', "F' (rebased)", 10, -1, 'cache');
            engine.graphConnect('d', 'e2', true); engine.graphConnect('e2', 'f2', true);
            engine.highlight('e2', 0x10b981); engine.highlight('f2', 0x10b981);
            engine.highlight('e', 0xef4444); engine.highlight('f', 0xef4444);
            await delay(1000);
            onStep({ title: 'Golden rule: never rebase public branches!', explanation: 'Rebasing rewrites history. If others have the old commits, their histories diverge. Only rebase local/private branches.' });
        }
    },
    {
        id: 'git_reset_revert',
        title: 'Reset, Revert & Cherry-pick',
        icon: '⏪',
        code: `git reset --soft HEAD~1  # undo commit, keep staged\ngit reset --hard HEAD~1  # undo commit + discard\ngit revert abc123        # new commit that undoes\ngit cherry-pick def456   # apply single commit`,
        desc: 'Reset rewrites history. Revert is safe for shared branches. Cherry-pick copies a commit.',
        async play(engine, onStep) {
            engine.reset();
            const commits = [['a', 'A'], ['b', 'B'], ['c', 'C'], ['d', 'D (bad!)']];
            for (const [i, [id, label]] of commits.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, 'database');
                if (i > 0) engine.graphConnect(commits[i - 1][0], id, true);
                engine.highlight(id, i === 3 ? 0xef4444 : 0x3b82f6);
                await delay(400);
            }
            await delay(600);
            onStep({ title: 'git reset --hard HEAD~1: delete commit D', explanation: 'HEAD moves back to C. D is gone from history. --soft keeps changes staged, --mixed keeps them unstaged, --hard discards everything. DANGEROUS on shared branches!' });
            engine.highlight('d', 0xef4444); engine.pulse('d');
            await delay(1000);
            onStep({ title: 'git revert abc123: safer alternative', explanation: 'Creates a NEW commit E that UNDOES D\'s changes. D stays in history. Safe on shared branches because you\'re adding, not removing history.' });
            engine.graphCreateNode('e', 'E (reverts D)', 10, 0, 'frontend');
            engine.graphConnect('d', 'e', true); engine.highlight('e', 0x10b981);
            await delay(1000);
            onStep({ title: 'git cherry-pick: apply a specific commit', explanation: 'Apply commit from another branch without merging the whole branch. Great for backporting hotfixes to release branches.' });
        }
    },
    {
        id: 'git_workflows',
        title: 'Git Workflows: GitHub Flow',
        icon: '🔀',
        code: `# GitHub Flow:\n1. Create feature branch from main\n2. Commit + Push\n3. Open Pull Request\n4. Code review\n5. Merge to main\n6. Deploy from main`,
        desc: 'GitHub Flow: simple, trunk-based. Feature branch → PR → merge → deploy.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'GitHub Flow: simplest team workflow', explanation: 'main is always deployable. All work in short-lived feature branches. PRs enable code review. Simple and effective for most teams.' });
            const steps = [['main', 'main\n(deployable)', 'cloud'], ['branch', 'feature\nbranch', 'cache'], ['pr', 'Pull Request\n(code review)', 'frontend'], ['merge', 'Merge\nto main', 'backend'], ['deploy', 'Deploy ✅', 'kubernetes']];
            for (const [i, [id, label, type]] of steps.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(steps[i - 1][0], id, true);
                engine.highlight(id, 0x10b981); await delay(700);
            }
            await delay(500);
            onStep({ title: 'GitFlow: structured for release-based projects', explanation: 'GitFlow adds develop, release, hotfix branches. More complex. Good for versioned software with release cycles. Overhead for CI/CD teams.' });
            onStep({ title: 'Trunk-Based Development: commit to main daily', explanation: 'Short-lived branches (<1 day). Feature flags hide incomplete work. Enables continuous integration. Used by Google, Facebook at scale.' });
        }
    },
    {
        id: 'git_stash',
        title: 'Stash, Tags & Hooks',
        icon: '🗃️',
        code: `git stash             # save WIP, clean workdir\ngit stash pop         # restore WIP\ngit tag v1.0.0 HEAD   # create release tag\n# .git/hooks/pre-commit runs before every commit`,
        desc: 'Stash saves WIP temporarily. Tags mark releases. Hooks automate checks.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'git stash: shelve uncommitted changes', explanation: 'git stash saves tracked changes to a stack and restores clean working directory. git stash pop reapplies the latest stash. git stash list shows all stashes.' });
            engine.graphCreateNode('wip', 'WIP changes\n(half-done feature)', -4, 2, 'backend');
            engine.graphCreateNode('stash', 'Stash stack\n[0: WIP]', 4, 2, 'cache');
            engine.graphConnect('wip', 'stash', true); engine.highlight('stash', 0xfbbf24);
            await delay(1200);
            onStep({ title: 'git tag v1.0.0: pin a commit', explanation: 'Tags are permanent pointers to commits. Lightweight tag = just a pointer. Annotated tag = object with message, GPG signature. Used for releases.' });
            engine.graphCreateNode('tag', 'Tag: v1.0.0\n→ commit sha', 0, -2, 'database');
            engine.highlight('tag', 0x10b981);
            await delay(1000);
            onStep({ title: 'Git Hooks: pre-commit, pre-push automation', explanation: 'Bash scripts in .git/hooks/ run on git events. pre-commit: lint, format, test. pre-push: test suite. commit-msg: enforce message format. Husky manages hooks in JS projects.' });
        }
    },
];
