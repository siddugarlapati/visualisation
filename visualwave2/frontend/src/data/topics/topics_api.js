const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const apiTopics = [
    {
        id: 'rest_basics',
        title: 'REST API Fundamentals',
        icon: '🔌',
        code: `GET    /api/users        # list all\nGET    /api/users/42     # get one\nPOST   /api/users        # create\nPUT    /api/users/42     # replace\nDELETE /api/users/42     # delete`,
        desc: 'REST uses HTTP methods + nouns for resources. Stateless: each request is self-contained.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'REST: Representational State Transfer', explanation: 'Resources are nouns (/users, /orders). HTTP methods express the verb (GET=read, POST=create, PUT/PATCH=update, DELETE=remove). Stateless — no server sessions.' });
            const methods = [['get', 'GET\n(read)\n200 OK', 0x10b981, 'frontend'], ['post', 'POST\n(create)\n201 Created', 0x3b82f6, 'backend'], ['put', 'PUT\n(update)\n200 OK', 0xfbbf24, 'cache'], ['del', 'DELETE\n(remove)\n204 No Content', 0xef4444, 'security']];
            for (const [i, [id, label, color, type]] of methods.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                engine.highlight(id, color);
                await delay(600);
            }
            onStep({ title: 'Status codes: 2xx OK, 4xx Client error, 5xx Server error', explanation: '200 OK, 201 Created, 204 No Content, 400 Bad Request, 401 Unauthorized, 403 Forbidden, 404 Not Found, 500 Internal Server Error.' });
            await delay(1000);
            onStep({ title: 'Stateless: server holds NO session state', explanation: 'Each request must contain all info needed (auth token in header). Enables horizontal scaling — any server can handle any request.' });
        }
    },
    {
        id: 'rest_auth',
        title: 'Auth: JWT & OAuth2',
        icon: '🔐',
        code: `// JWT: Header.Payload.Signature\nAuthorization: Bearer eyJhbGc...\n// OAuth2: delegated access\nGET /oauth/authorize?response_type=code\n&client_id=APP&redirect_uri=...`,
        desc: 'JWT is stateless auth. OAuth2 delegates login to a provider (Google, GitHub).',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'JWT: three parts, base64url encoded', explanation: 'Header (algorithm) + Payload (claims: user_id, exp) + Signature (HMAC SHA256). Server verifies signature — if valid, trusts payload.' });
            const parts = [['h', 'Header\n{alg:"HS256"}', 0x3b82f6, 'backend'], ['p', 'Payload\n{id:1,exp:...}', 0x10b981, 'backend'], ['s', 'Signature\n(HMAC SHA256)', 0xfbbf24, 'security']];
            for (const [i, [id, label, color, type]] of parts.entries()) {
                engine.graphCreateNode(id, label, -5 + i * 5, 2, type);
                engine.highlight(id, color); await delay(500);
            }
            await delay(600);
            onStep({ title: 'Stateless: server doesn\'t store sessions', explanation: 'Traditional sessions require server-side storage. JWT is self-contained — server only checks signature. Perfect for microservices.' });
            engine.graphCreateNode('verify', 'Server: verify\nsignature → trust', 0, -1, 'database');
            engine.highlight('verify', 0x10b981);
            await delay(1000);
            onStep({ title: 'OAuth2: authorization flow', explanation: 'User → App → Provider (Google) → grants code → App exchanges for access_token → App calls Google API. User never gives password to App.' });
            engine.graphCreateNode('oauth', 'OAuth2 Flow:\nUser → Provider\n→ App gets token', 0, -4, 'cloud');
            engine.highlight('oauth', 0x6366f1);
        }
    },
    {
        id: 'graphql',
        title: 'GraphQL vs REST',
        icon: '◈',
        code: `# REST: multiple requests\nGET /users/1\nGET /users/1/posts\n\n# GraphQL: one request, you decide shape\nquery { user(id:1) { name posts { title } } }`,
        desc: 'GraphQL fetches exactly what you need in one request. Schema defines all available data.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'REST over-fetching: too much data', explanation: 'GET /users/1 returns the full user object even if you only need the name. Mobile clients waste bandwidth downloading unneeded fields.' });
            engine.graphCreateNode('rest_call', 'GET /users/1\n← 30 fields\n(need 3)', -5, 2, 'backend');
            engine.highlight('rest_call', 0xef4444);
            await delay(1000);
            onStep({ title: 'GraphQL: ask for exactly what you need', explanation: 'Client sends a query specifying EXACTLY which fields. Server returns ONLY those fields. One request for nested data (user + their posts).' });
            engine.graphCreateNode('gql', 'query{\n  user(id:1){\n    name\n    posts{title}\n  }\n}', 5, 2, 'frontend');
            engine.graphCreateNode('resp', 'Response:\n{name, posts[title]}\n← only 3 fields!', 5, -1, 'cache');
            engine.graphConnect('gql', 'resp', true);
            engine.highlight('gql', 0x10b981); engine.highlight('resp', 0x10b981);
            await delay(1000);
            onStep({ title: 'Schema: single source of truth', explanation: 'GraphQL schema defines all types, queries, mutations. Strongly typed. Auto-generates documentation. Introspection lets clients discover the API.' });
        }
    },
    {
        id: 'swagger_openapi',
        title: 'Swagger / OpenAPI Spec',
        icon: '📄',
        code: `openapi: 3.0.0\ninfo: { title: User API, version: 1.0 }\npaths:\n  /users/{id}:\n    get:\n      parameters: [{ in: path, name: id }]\n      responses: { 200: { ... } }`,
        desc: 'OpenAPI is a machine-readable API contract. Swagger UI renders it as interactive docs.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'OpenAPI: machine-readable API contract', explanation: 'YAML/JSON file describing every endpoint, parameter, request body, response schema. Both humans and tools can read it.' });
            const layers = [['spec', 'openapi.yaml\n(the spec)', 'database'], ['ui', 'Swagger UI\n(interactive docs)', 'frontend'], ['gen', 'Code Generator\n(client SDKs)', 'backend'], ['test', 'Test Runner\n(contract tests)', 'security']];
            for (const [i, [id, label, type]] of layers.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(layers[0][0], id, true);
                engine.highlight(id, i === 0 ? 0x3b82f6 : 0x10b981);
                await delay(600);
            }
            onStep({ title: 'Swagger UI: try APIs in browser', explanation: 'Swagger UI renders the OpenAPI spec as interactive HTML. Try endpoints, see real responses. Great for developer onboarding.' });
            await delay(1000);
            onStep({ title: 'Schema $ref: reuse models across endpoints', explanation: '$ref: "#/components/schemas/User" reuses the User schema. Define once, reference many times. Generates consistent types in code generators.' });
        }
    },
    {
        id: 'api_rate_limiting',
        title: 'Rate Limiting & Versioning',
        icon: '🚦',
        code: `# Rate limit headers:\nX-RateLimit-Limit: 1000\nX-RateLimit-Remaining: 997\nX-RateLimit-Reset: 1677600000\n\n# Versioning:\nGET /v1/users  # in URL path`,
        desc: 'Rate limiting prevents abuse. Versioning allows breaking changes without breaking clients.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Rate Limiting: throttle requests per client', explanation: 'Count requests per IP/token per time window. When limit exceeded, return 429 Too Many Requests. Sliding window or token bucket algorithms.' });
            engine.graphCreateNode('client', 'Client\n1000 req/hr\nlimit', -5, 2, 'frontend');
            engine.graphCreateNode('rl', 'Rate Limiter\n(Redis counter)', 0, 2, 'cache');
            engine.graphCreateNode('api', 'API Server', 5, 2, 'backend');
            engine.graphConnect('client', 'rl', true); engine.graphConnect('rl', 'api', true);
            await delay(1200);
            onStep({ title: '429 Too Many Requests + Retry-After header', explanation: 'When limit hit: return 429 with Retry-After: 60 (seconds to wait). Good clients back off. Protects server from DoS.' });
            engine.highlight('rl', 0xef4444); engine.pulse('rl');
            await delay(1000);
            onStep({ title: 'API Versioning: URL vs header vs query param', explanation: '/v1/users in URL is most visible. Accept: application/vnd.api+json;version=2 in header. ?version=2 in query. URL versioning is most common.' });
            engine.graphCreateNode('v1', '/v1/users\n(old clients)', -4, -2, 'security');
            engine.graphCreateNode('v2', '/v2/users\n(new clients)', 4, -2, 'frontend');
            engine.highlight('v1', 0xfbbf24); engine.highlight('v2', 0x10b981);
        }
    },
    {
        id: 'websockets',
        title: 'WebSockets & Real-Time',
        icon: '↔️',
        code: `// Full-duplex: server CAN push to client\nconst ws = new WebSocket("wss://api/chat");\nws.onmessage = (e) => console.log(e.data);\nws.send(JSON.stringify({ text: "hello" }));`,
        desc: 'WebSocket: persistent two-way connection. Server can push data without client polling.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'HTTP polling vs WebSocket', explanation: 'HTTP polling: client asks "any new data?" every second. Wasteful. WebSocket: ONE connection, server pushes when data arrives. Used for chat, live feeds, games.' });
            engine.graphCreateNode('client2', 'Browser', -5, 2, 'frontend');
            engine.graphCreateNode('server2', 'Server', 5, 2, 'backend');
            engine.graphConnect('client2', 'server2', true);
            engine.graphConnect('server2', 'client2', true);
            engine.highlight('client2', 0x10b981); engine.highlight('server2', 0x10b981);
            await delay(1200);
            onStep({ title: 'Upgrade: HTTP → WebSocket handshake', explanation: 'Client sends HTTP with Upgrade: websocket header. Server responds 101 Switching Protocols. Now using TCP directly — no HTTP overhead per message.' });
            onStep({ title: 'Socket.IO: rooms, namespaces, auto-reconnect', explanation: 'Socket.IO wraps WebSocket with fallbacks (long-poll), rooms (broadcast groups), and automatic reconnection. Perfect for chat apps and dashboards.' });
        }
    },
    {
        id: 'rest_cors',
        title: 'CORS & Security Headers',
        icon: '🛡️',
        code: `# Server response headers:\nAccess-Control-Allow-Origin: https://myapp.com\nAccess-Control-Allow-Methods: GET,POST\nContent-Security-Policy: default-src 'self'\nX-Frame-Options: DENY`,
        desc: 'CORS controls cross-origin requests. Security headers protect against XSS, clickjacking.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Same-Origin Policy: browser restriction', explanation: 'Browser blocks JS from reading responses from different origins (protocol+domain+port). CORS headers tell browser which cross-origin requests are allowed.' });
            engine.graphCreateNode('browser', 'Browser\n(blocks by default)', -5, 2, 'frontend');
            engine.graphCreateNode('api2', 'api.com\n(different origin)', 5, 2, 'backend');
            engine.graphConnect('browser', 'api2', true);
            engine.highlight('api2', 0xef4444);
            await delay(1200);
            onStep({ title: 'Access-Control-Allow-Origin: allows request', explanation: 'Server sends ACAO header. Browser checks if requesting origin is allowed. Wildcard * allows all (dangerous for authenticated APIs). Preflight OPTIONS request for non-simple requests.' });
            engine.highlight('api2', 0x10b981);
            await delay(1000);
            onStep({ title: 'CSP: Content-Security-Policy prevents XSS', explanation: 'default-src \'self\' blocks loading scripts from external domains. Prevents injected malicious scripts. script-src \'nonce-abc\' for inline scripts.' });
        }
    },
];
