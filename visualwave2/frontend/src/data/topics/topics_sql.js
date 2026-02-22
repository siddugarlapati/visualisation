const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const sqlTopics = [
    {
        id: 'sql_select',
        title: 'SELECT, WHERE, ORDER BY',
        icon: '🔍',
        code: `SELECT name, email FROM users\nWHERE age > 25\n  AND city = 'Mumbai'\nORDER BY name ASC\nLIMIT 10;`,
        desc: 'SELECT retrieves data. WHERE filters rows. ORDER BY sorts. LIMIT caps result set.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Table: users', explanation: 'A table is rows (records) and columns (fields). Primary key (PK) uniquely identifies each row.' });
            engine.createArrayAPI('rows', ['Alice,30', 'Bob,22', 'Carol,35', 'Dave,28'], -3, 2);
            for (let i = 0; i < 4; i++) engine.arrayHighlight('rows', i, 0x3b82f6);
            await delay(1200);
            onStep({ title: 'WHERE age > 25 → filter rows', explanation: 'Database engine scans the table (or uses index) and keeps only rows satisfying the predicate. Reduces rows for ORDER BY and LIMIT.' });
            engine.arrayHighlight('rows', 1, 0xef4444); // Bob 22 filtered
            engine.arrayHighlight('rows', 0, 0x10b981);
            engine.arrayHighlight('rows', 2, 0x10b981);
            engine.arrayHighlight('rows', 3, 0x10b981);
            await delay(1000);
            onStep({ title: 'ORDER BY name ASC → sort result', explanation: 'Sort is O(n log n). Without ORDER BY, ROW order is NOT guaranteed in SQL. Always specify ORDER BY if order matters.' });
            await delay(800);
            onStep({ title: 'LIMIT 10 → cap result set', explanation: 'Prevents returning millions of rows. DB can stop early with LIMIT on ranges with indexes. Always paginate with LIMIT+OFFSET.' });
        }
    },
    {
        id: 'sql_joins',
        title: 'JOINs: INNER, LEFT, RIGHT',
        icon: '🔗',
        code: `SELECT u.name, o.total\nFROM users u\nINNER JOIN orders o ON u.id = o.user_id\nWHERE o.total > 1000;`,
        desc: 'JOINs combine rows from multiple tables on a matching key.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'INNER JOIN: only matching rows', explanation: 'Returns rows where the ON condition matches in BOTH tables. Users with no orders and orders with no users are excluded.' });
            engine.graphCreateNode('users', 'users\nid|name\n1|Alice\n2|Bob', -5, 0, 'database');
            engine.graphCreateNode('orders', 'orders\nid|user_id|total\n1|1|{2000}\n2|1|{500}\n3|3|{1500}', 5, 0, 'database');
            engine.graphConnect('users', 'orders', false);
            await delay(1200);
            onStep({ title: 'ON u.id = o.user_id → match condition', explanation: 'Alice (id=1) matches orders 1 and 2. Bob (id=2) has no orders → excluded in INNER JOIN. Order 3 (user_id=3) has no user → excluded.' });
            engine.graphCreateNode('result', 'result:\nAlice | 2000\nAlice | 500', 0, -3, 'frontend');
            engine.graphConnect('users', 'result', true); engine.graphConnect('orders', 'result', true);
            engine.highlight('result', 0x10b981);
            await delay(1000);
            onStep({ title: 'LEFT JOIN: all left rows, nullable right', explanation: 'LEFT JOIN keeps ALL users, even with no orders. Missing order fields are NULL. RIGHT JOIN is the mirror. Use LEFT JOIN to find users with NO orders: WHERE o.id IS NULL.' });
        }
    },
    {
        id: 'sql_indexes',
        title: 'Indexes & Query Performance',
        icon: '⚡',
        code: `CREATE INDEX idx_users_email ON users(email);\n-- Before: O(n) full table scan\n-- After:  O(log n) B-tree lookup\nEXPLAIN SELECT * FROM users WHERE email=?`,
        desc: 'Indexes speed up reads at the cost of slower writes and more storage.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Full table scan: O(n)', explanation: 'Without index, DB reads every row to find email="alice@x.com". Slow for millions of rows.' });
            engine.createArrayAPI('rows', ['row1', 'row2', 'row3', 'row4', 'row5']);
            for (let i = 0; i < 5; i++) { engine.arrayHighlight('rows', i, 0xfbbf24); await delay(300); }
            await delay(600);
            onStep({ title: 'B-Tree index: O(log n)', explanation: 'Index is a B-Tree sorted by email. Lookup navigates the tree (height ~log₂(rows)). 1M rows → ~20 comparisons vs 1M scans!' });
            const btree = [['root', 'alice@\n(root)', 0, 3], ['l1', '< alice', - 4, 0], ['r1', '> alice', 4, 0], ['found', 'alice@x.com\n✅ FOUND!', 4, -3]];
            for (const [id, label, x, y] of btree) {
                engine.graphCreateNode(id, label, x, y, 'database');
                if (id === 'l1' || id === 'r1') engine.graphConnect('root', id, false);
                if (id === 'found') engine.graphConnect('r1', id, true);
                engine.pulse(id); await delay(600);
            }
            engine.highlight('found', 0x10b981);
            onStep({ title: 'EXPLAIN: inspect query plan', explanation: 'EXPLAIN SELECT shows whether the optimizer uses index (index seek) or table scan. Use this to diagnose slow queries.' });
        }
    },
    {
        id: 'sql_acid',
        title: 'Transactions & ACID',
        icon: '🔐',
        code: `BEGIN;\n  UPDATE accounts SET balance=balance-100 WHERE id=1;\n  UPDATE accounts SET balance=balance+100 WHERE id=2;\nCOMMIT; -- both or neither!`,
        desc: 'ACID guarantees data integrity: Atomic, Consistent, Isolated, Durable.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Atomicity: all-or-nothing', explanation: 'Both balance updates succeed or both are rolled back. No partial state where one account loses money and the other doesn\'t gain it.' });
            engine.graphCreateNode('acc1', 'Account 1\nbalance: 1000', -4, 2, 'database');
            engine.graphCreateNode('acc2', 'Account 2\nbalance: 500', 4, 2, 'database');
            await delay(1200);
            engine.graphCreateNode('tx', 'Transaction\nBEGIN…COMMIT', 0, 2, 'backend');
            engine.graphConnect('tx', 'acc1', false); engine.graphConnect('tx', 'acc2', false);
            engine.highlight('tx', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'Consistency: constraints preserved', explanation: 'After transaction, DB must satisfy all constraints (FKs, CHECK, NOT NULL). If any violation, transaction rolls back.' });
            onStep({ title: 'Isolation: transactions don\'t interfere', explanation: 'Isolation levels: READ COMMITTED, REPEATABLE READ, SERIALIZABLE. Higher = fewer anomalies (dirty reads, phantom reads) but more locking.' });
            onStep({ title: 'Durability: committed data survives crash', explanation: 'COMMIT writes to WAL (Write-Ahead Log) on disk before returning success. Even if server crashes, data is recoverable from the log.' });
            engine.highlight('acc1', 0x10b981); engine.highlight('acc2', 0x10b981);
        }
    },
    {
        id: 'sql_normalization',
        title: 'Normalisation (1NF–3NF)',
        icon: '🗂️',
        code: `-- Unnormalized: orders with repeated customer data\n-- 1NF: atomic values, no repeating groups\n-- 2NF: remove partial dependencies\n-- 3NF: remove transitive dependencies`,
        desc: 'Normalization eliminates data redundancy and update anomalies.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Unnormalised: customer + orders in one table', explanation: 'Storing customer name in every order row wastes space and causes update anomalies — changing customer name requires updating all their orders.' });
            engine.graphCreateNode('ugly', 'orders\nid|cust_name|cust_email|product', 0, 3, 'security');
            engine.highlight('ugly', 0xef4444);
            await delay(1200);
            onStep({ title: '1NF: atomic values, no repeating groups', explanation: 'Each cell holds one value. No columns like "product1, product2". Each product gets its own row.' });
            onStep({ title: '2NF: remove partial dependencies', explanation: 'Every non-key column must depend on the ENTIRE primary key, not just part of it. Separate customer data into customers table.' });
            engine.graphCreateNode('customers', 'customers\n(id, name, email)', -4, 0, 'database');
            engine.graphCreateNode('orders2', 'orders\n(id, cust_id, product)', 4, 0, 'database');
            engine.graphConnect('customers', 'orders2', false);
            engine.highlight('customers', 0x10b981); engine.highlight('orders2', 0x10b981);
            await delay(1000);
            onStep({ title: '3NF: no transitive dependencies', explanation: 'No non-key field depends on another non-key field. If city→zipcode, extract to a zips table. Balance: don\'t over-normalise (join cost).' });
        }
    },
    {
        id: 'sql_subqueries',
        title: 'Subqueries & CTEs',
        icon: '🧩',
        code: `-- Correlated subquery:\nSELECT name FROM users u\nWHERE age > (SELECT AVG(age) FROM users);\n-- CTE (readable):\nWITH avg_age AS (SELECT AVG(age) FROM users)\nSELECT name FROM users, avg_age WHERE age > avg_age.avg;`,
        desc: 'Subqueries nest queries. CTEs (WITH) make complex queries readable.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Subquery: inner query first', explanation: 'The inner SELECT AVG(age) runs first, returns a scalar (e.g. 28.5). Outer query uses this value. Executed once for non-correlated subqueries.' });
            engine.graphCreateNode('inner', 'SELECT AVG(age)\nFROM users\n→ 28.5', -4, 2, 'cache');
            engine.graphCreateNode('outer', 'SELECT name\nWHERE age > 28.5', 4, 2, 'backend');
            engine.graphConnect('inner', 'outer', true);
            engine.highlight('inner', 0xfbbf24); engine.highlight('outer', 0x10b981);
            await delay(1200);
            onStep({ title: 'CTE (WITH clause): named subquery', explanation: 'WITH avg_age AS (...) names the result. Main query can refer to it by name. DBs materialise or inline CTEs based on optimizer. Much more readable.' });
            engine.graphCreateNode('cte', 'WITH avg_age AS\n(SELECT AVG(age))', 0, -1, 'frontend');
            engine.pulse('cte');
            await delay(1000);
            onStep({ title: 'Recursive CTE: tree traversal', explanation: 'WITH RECURSIVE can traverse hierarchical data (org charts, comments tree) without application-level recursion. Very powerful for graph-like queries.' });
        }
    },
    {
        id: 'sql_stored_procs',
        title: 'Views & Stored Procedures',
        icon: '📋',
        code: `CREATE VIEW active_users AS\n  SELECT * FROM users WHERE active=TRUE;\n\nCREATE PROCEDURE get_user(IN uid INT)\nBEGIN\n  SELECT * FROM users WHERE id=uid;\nEND;`,
        desc: 'Views are saved queries. Stored procedures are pre-compiled SQL programs on the server.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'VIEW: saved query, virtual table', explanation: 'SELECT * FROM active_users runs the underlying query automatically. Not cached by default — re-executes each time. Simplifies access control.' });
            engine.graphCreateNode('view', 'active_users\n(VIEW)', 0, 3, 'frontend');
            engine.graphCreateNode('query', 'SELECT * FROM users\nWHERE active=TRUE', 0, 0, 'backend');
            engine.graphConnect('view', 'query', true);
            engine.highlight('query', 0xfbbf24);
            await delay(1200);
            onStep({ title: 'Materialized View: cached result', explanation: 'MATERIALIZED VIEW stores the query result. Fast reads but must be refreshed (REFRESH MATERIALIZED VIEW). Great for expensive aggregations.' });
            onStep({ title: 'Stored Procedure: server-side business logic', explanation: 'Pre-compiled, runs inside DB. Reduces network round trips. But: harder to test/version, tight coupling to DB. Use sparingly.' });
            engine.graphCreateNode('sp', 'Stored Procedure\nget_user(uid)\npre-compiled', -4, -2, 'database');
            engine.highlight('sp', 0x10b981);
        }
    },
];
