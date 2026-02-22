const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const nosqlTopics = [
    {
        id: 'nosql_vs_sql',
        title: 'SQL vs NoSQL',
        icon: '⚖️',
        code: `// SQL: rigid schema, ACID\nusers TABLE: id|name|age\n\n// NoSQL: flexible schema\n{ id:1, name:"Alice", hobbies:["code","gym"] }`,
        desc: 'SQL: relational, schema-first, ACID. NoSQL: flexible, scale-out, eventual consistency.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'SQL: relational, schema-first', explanation: 'Tables with fixed columns. Joins across tables. ACID transactions. Best for structured, relational data with complex queries.' });
            engine.graphCreateNode('sql', 'SQL DB\nfixed schema\nACID joins', -5, 2, 'database');
            engine.highlight('sql', 0x3b82f6);
            await delay(1000);
            onStep({ title: 'NoSQL: 4 main types', explanation: 'Document (MongoDB), Key-Value (Redis), Wide Column (Cassandra), Graph (Neo4j). Each optimised for different access patterns.' });
            const types = [['mongo', 'Document\nMongoDB', -6, -2], ['redis', 'Key-Value\nRedis', -2, -2], ['cass', 'Wide-Col\nCassandra', 2, -2], ['neo', 'Graph\nNeo4j', 6, -2]];
            for (const [id, label, x, y] of types) {
                engine.graphCreateNode(id, label, x, y, 'cache');
                engine.highlight(id, 0x10b981); await delay(500);
            }
            onStep({ title: 'CAP Theorem: pick 2 of 3', explanation: 'Consistent + Available + Partition Tolerant — only 2 possible for distributed systems. MongoDB: CA. Cassandra: AP. Redis: CP in cluster mode.' });
        }
    },
    {
        id: 'mongodb',
        title: 'MongoDB: Documents & Collections',
        icon: '🍃',
        code: `db.users.insertOne({\n  name: "Alice",\n  tags: ["admin","editor"],\n  address: { city: "Mumbai" }\n});\ndb.users.find({ "address.city": "Mumbai" });`,
        desc: 'MongoDB stores JSON-like BSON documents. Collections group documents like tables.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Document: flexible JSON blob', explanation: 'Each document can have different fields. No schema enforced by default. Arrays and nested objects first-class. BSON adds types (Date, ObjectId, Binary).' });
            engine.graphCreateNode('doc', '{\n  name:"Alice"\n  tags:[admin]\n  address:{city:"Mumbai"}\n}', 0, 2, 'database');
            engine.pulse('doc');
            await delay(1200);
            onStep({ title: 'Collection = table, document = row', explanation: 'db.users is the users collection. No schema enforcement means you can insert anything. Use JSON Schema validation to add optional enforcement.' });
            onStep({ title: 'Query: find({ "address.city":"Mumbai" })', explanation: 'Dot notation queries nested fields. Without index = O(n) full collection scan. Create compound indexes for frequent query patterns.' });
            engine.graphCreateNode('idx', 'Index:\naddress.city', 0, -2, 'cache');
            engine.graphConnect('doc', 'idx', true); engine.highlight('idx', 0x10b981);
            await delay(1000);
            onStep({ title: 'Aggregation Pipeline: $match, $group, $project', explanation: '[$match, $group, $sort] is like SQL WHERE + GROUP BY + ORDER BY. Each stage processes the documents stream — memory-efficient.' });
        }
    },
    {
        id: 'redis_kv',
        title: 'Redis: Key-Value Store',
        icon: '⚡',
        code: `SET user:1:name "Alice"     # string\nEXPIRE user:1:name 3600    # TTL = 1hr\nLPUSH queue:tasks "job1"   # list\nSADD tags:alice "admin"    # set`,
        desc: 'Redis is an in-memory key-value store. Sub-millisecond reads. Ideal for caching and sessions.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Redis: everything in RAM', explanation: 'Data lives in memory → microsecond reads. Persists to disk via RDB snapshots or AOF logs. Used for caching, sessions, real-time leaderboards.' });
            engine.graphCreateNode('mem', 'RAM\n~GB of data', 0, 3, 'cache');
            await delay(800);
            const types = [['str', 'String\nSET/GET', -6, 0, 0x3b82f6], ['list', 'List\nLPUSH/RPOP', -2, 0, 0x10b981], ['set', 'Set\nSADD/SMEMBER', 2, 0, 0xfbbf24], ['hmap', 'Hash\nHSET/HGET', 6, 0, 0xec4899]];
            for (const [id, label, x, y, color] of types) {
                engine.graphCreateNode(id, label, x, y, 'cache');
                engine.graphConnect('mem', id, false);
                engine.highlight(id, color);
                onStep({ title: label.split('\n')[0], explanation: `${label} — O(1) ops for string/hash, O(1) push/pop for list, O(1) membership for set.` });
                await delay(600);
            }
            onStep({ title: 'EXPIRE: TTL-based cache invalidation', explanation: 'EXPIRE user:1:session 1800 auto-deletes the key after 30 minutes. Key expires on Redis server — client gets nil. No app code needed to expire.' });
        }
    },
    {
        id: 'cassandra',
        title: 'Cassandra: Wide Column Store',
        icon: '📦',
        code: `CREATE TABLE events (\n  user_id UUID,\n  ts TIMESTAMP,\n  event TEXT,\n  PRIMARY KEY ((user_id), ts)\n) WITH CLUSTERING ORDER BY (ts DESC);`,
        desc: 'Cassandra is designed for massive write throughput. Partition key determines which node stores data.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Partition Key: determines data node', explanation: 'user_id is the partition key. Cassandra hashes it → assigns to one of N nodes. All events for user_id=X are on the same node. Queries must include partition key.' });
            engine.graphCreateNode('n1', 'Node 1\nuser_ids A-F', -6, 0, 'kubernetes');
            engine.graphCreateNode('n2', 'Node 2\nuser_ids G-M', 0, 0, 'kubernetes');
            engine.graphCreateNode('n3', 'Node 3\nuser_ids N-Z', 6, 0, 'kubernetes');
            await delay(1000);
            onStep({ title: 'Replication Factor 3: data on 3 nodes', explanation: 'RF=3 means data written to 3 nodes. Can survive 2 node failures. Write to ANY node — coordinator replicates to others async.' });
            engine.graphConnect('n1', 'n2', false); engine.graphConnect('n2', 'n3', false); engine.graphConnect('n1', 'n3', false);
            engine.highlight('n1', 0x3b82f6); engine.highlight('n2', 0x3b82f6); engine.highlight('n3', 0x3b82f6);
            await delay(1000);
            onStep({ title: 'Best for: write-heavy time series', explanation: 'Cassandra: 1M+ writes/sec on commodity hardware. Great for IoT, events, logs, metrics. Bad for ad-hoc queries without partition key.' });
        }
    },
    {
        id: 'cap_theorem',
        title: 'CAP Theorem & Consistency',
        icon: '🔺',
        code: `// CAP: pick 2 of 3\nC = Consistent (all nodes same data)\nA = Available (always responds)\nP = Partition Tolerant (survives splits)\n\n// Cassandra: AP  | MongoDB: CP\n// PostgreSQL: CA (single node)`,
        desc: 'Distributed systems can only guarantee 2 of 3 CAP properties.',
        async play(engine, onStep) {
            engine.reset();
            engine.graphCreateNode('cap', 'CAP Theorem', 0, 3, 'security');
            const props = [['c', 'Consistent\n(all nodes\nsame data)', -5, 0, 0x3b82f6], ['a', 'Available\n(always\nresponds)', 0, -3, 0x10b981], ['p', 'Partition\nTolerant\n(net splits)', 5, 0, 0xfbbf24]];
            for (const [id, label, x, y, color] of props) {
                engine.graphCreateNode(id, label, x, y, 'frontend');
                engine.graphConnect('cap', id, false);
                engine.highlight(id, color); await delay(600);
            }
            onStep({ title: 'P is unavoidable in distributed systems', explanation: 'Network partitions WILL happen. So the real choice is: when there\'s a partition, do you sacrifice C (availability preferred) or A (consistency preferred)?' });
            onStep({ title: 'AP systems: Cassandra, DynamoDB', explanation: 'During partition, all nodes respond with their (potentially stale) data. Eventual consistency — all nodes converge eventually. Tunable with QUORUM reads.' });
            engine.highlight('a', 0x10b981); engine.highlight('p', 0x10b981);
            onStep({ title: 'CP systems: MongoDB, HBase, ZooKeeper', explanation: 'During partition, some nodes refuse to respond to maintain consistency. Better for financial data, inventory where stale reads are dangerous.' });
        }
    },
];
