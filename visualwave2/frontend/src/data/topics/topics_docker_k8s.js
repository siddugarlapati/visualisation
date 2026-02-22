const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const dockerK8sTopics = [
    {
        id: 'docker_containers',
        title: 'Docker: Containers vs VMs',
        icon: '🐳',
        code: `FROM node:18-alpine\nWORKDIR /app\nCOPY package*.json ./\nRUN npm ci\nCOPY . .\nEXPOSE 3000\nCMD ["node", "server.js"]`,
        desc: 'Containers share the OS kernel. Lighter than VMs. Docker packages app + dependencies.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'VM vs Container: overhead comparison', explanation: 'VM: full OS per app (GBs, minutes to start). Container: shares host kernel, just app + libs (MBs, seconds to start). Same isolation, far lighter.' });
            engine.graphCreateNode('vm', 'VM:\nfull OS per app\nGB + slow boot', -5, 2, 'database');
            engine.graphCreateNode('ct', 'Container:\nshared kernel\nMB + fast!', 5, 2, 'cache');
            engine.highlight('vm', 0xef4444); engine.highlight('ct', 0x10b981);
            await delay(1200);
            onStep({ title: 'Dockerfile: layered image building', explanation: 'Each RUN/COPY adds an immutable layer. Layers are cached! Unchanged layers reuse cache → fast rebuilds. Put rarely-changing layers (COPY package.json) first.' });
            const layers = [['l0', 'FROM node\n(base)', 'database'], ['l1', 'COPY package\n(deps)', 'backend'], ['l2', 'RUN npm ci\n(cached)', 'cache'], ['l3', 'COPY .\n(app code)', 'frontend'], ['l4', 'CMD\n(entrypoint)', 'kubernetes']];
            for (const [i, [id, label, type]] of layers.entries()) {
                engine.graphCreateNode(id, label, -3 + i, -i, type);
                engine.highlight(id, 0x3b82f6); engine.pulse(id); await delay(500);
            }
            onStep({ title: 'Image vs Container: class vs instance', explanation: 'Image is the blueprint (immutable). Container is a running instance created from image. Many containers can run from one image.' });
        }
    },
    {
        id: 'docker_networking',
        title: 'Docker Networking & Volumes',
        icon: '🌐',
        code: `docker run -p 3000:3000 \\\n           -v ./data:/app/data \\\n           --network app-net \\\n           myapp`,
        desc: '-p maps ports. -v mounts volumes for persistent data. --network links containers.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Port mapping: -p host:container', explanation: '-p 3000:3000 maps host port 3000 to container port 3000. From outside, connect to localhost:3000. Inside container it\'s 3000.' });
            engine.graphCreateNode('host_port', 'Host\nlocalhost:3000', -5, 2, 'frontend');
            engine.graphCreateNode('ct_port', 'Container\n:3000', 5, 2, 'backend');
            engine.graphConnect('host_port', 'ct_port', true); engine.highlight('ct_port', 0x10b981);
            await delay(1200);
            onStep({ title: 'Volume: persistent data outside container', explanation: '-v ./data:/app/data mounts a host dir into the container. Data survives container restarts. Use named volumes (docker volume create) for portability.' });
            engine.graphCreateNode('vol', 'Volume\n./data ↔ /app/data\n(persists!)', 0, -1, 'database');
            engine.highlight('vol', 0xfbbf24);
            await delay(1000);
            onStep({ title: 'docker network: container-to-container comms', explanation: 'Containers on the same network DNS-resolve each other by name. app calls db:5432 — Docker resolves "db" to the PostgreSQL container IP. Zero config!' });
            engine.graphCreateNode('db_ct', 'db\n(postgres)', -5, -2, 'database');
            engine.graphCreateNode('app_ct', 'app\n(node)', 5, -2, 'backend');
            engine.graphConnect('app_ct', 'db_ct', false); engine.highlight('db_ct', 0x3b82f6);
        }
    },
    {
        id: 'docker_compose',
        title: 'Docker Compose',
        icon: '🎼',
        code: `services:\n  app:\n    build: .\n    ports: ["3000:3000"]\n    depends_on: [db]\n  db:\n    image: postgres:15\n    environment:\n      POSTGRES_PASSWORD: secret`,
        desc: 'Compose defines multi-container apps as YAML. One command to start everything.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'docker compose up: start all services', explanation: 'One command starts app, db, redis, nginx — all defined in docker-compose.yml. Creates a network, pulls images, starts in dependency order.' });
            const svcs = [['nginx', 'nginx\n(reverse proxy)', 'frontend'], ['app2', 'app\n(node)', 'backend'], ['db2', 'db\n(postgres)', 'database'], ['redis2', 'redis\n(cache)', 'cache']];
            for (const [i, [id, label, type]] of svcs.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                engine.pulse(id); engine.highlight(id, 0x10b981); await delay(500);
            }
            engine.graphConnect('nginx', 'app2', true);
            engine.graphConnect('app2', 'db2', false);
            engine.graphConnect('app2', 'redis2', false);
            await delay(800);
            onStep({ title: 'depends_on: startup ordering', explanation: 'depends_on: [db] starts db before app. But doesn\'t wait for db to be READY (use healthcheck + condition: service_healthy for that).' });
            onStep({ title: 'docker compose watch: hot reload in dev', explanation: 'docker compose watch rebuilds/restarts services when source files change. Great for development workflow without manual restart.' });
        }
    },
    {
        id: 'k8s_pods',
        title: 'Kubernetes: Pods & Deployments',
        icon: '☸️',
        code: `apiVersion: apps/v1\nkind: Deployment\nmetadata: { name: myapp }\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n      - image: myapp:1.0\n        ports: [{containerPort:3000}]`,
        desc: 'Pod = smallest unit (1+ containers). Deployment manages replicas and rolling updates.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Kubernetes: container orchestration', explanation: 'K8s automates deployment, scaling, and management of containerised apps. Self-healing: restarts failed pods. Load balancing, scaling built-in.' });
            engine.graphCreateNode('cluster', 'K8s Cluster', 0, 4, 'kubernetes');
            await delay(800);
            onStep({ title: 'Deployment: desired state = 3 replicas', explanation: 'You declare desired state (3 pods). K8s continuously reconciles actual vs desired. Pod dies? K8s creates a new one. Node dies? Pods rescheduled elsewhere.' });
            for (let i = 0; i < 3; i++) {
                engine.graphCreateNode(`pod${i}`, `Pod ${i + 1}\nmyapp:1.0`, -4 + i * 4, 0, 'backend');
                engine.graphConnect('cluster', `pod${i}`, false);
                engine.pulse(`pod${i}`); await delay(500);
            }
            await delay(600);
            onStep({ title: 'Rolling update: zero-downtime deploy', explanation: 'New version deployed pod-by-pod. K8s replaces one pod at a time. Traffic routed to healthy pods throughout. Rollback: kubectl rollout undo.' });
            engine.graphCreateNode('new', 'Pod 1\nmyapp:2.0\n(new)', -4, -3, 'frontend');
            engine.graphConnect('pod0', 'new', true); engine.highlight('new', 0x10b981); engine.highlight('pod0', 0xef4444);
        }
    },
    {
        id: 'k8s_services',
        title: 'Services & Ingress',
        icon: '🌐',
        code: `kind: Service\nspec:\n  type: ClusterIP\n  selector: {app: myapp}\n  ports: [{port:80, targetPort:3000}]\n---\nkind: Ingress  # routes external traffic`,
        desc: 'Service provides stable DNS + load balancing for pods. Ingress routes external HTTP traffic.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Service: stable endpoint for changing pods', explanation: 'Pod IPs change when pods restart. Service provides a stable DNS name (myapp.default.svc.cluster.local) and load-balanced virtual IP. Selector matches pods by labels.' });
            engine.graphCreateNode('svc', 'Service\nmyapp:80\n(stable IP)', 0, 3, 'cloud');
            for (let i = 0; i < 3; i++) {
                engine.graphCreateNode(`p${i}`, `Pod ${i + 1}\n:3000`, -4 + i * 4, 0, 'backend');
                engine.graphConnect('svc', `p${i}`, true); engine.highlight(`p${i}`, 0x3b82f6); await delay(400);
            }
            await delay(600);
            onStep({ title: 'ClusterIP vs NodePort vs LoadBalancer', explanation: 'ClusterIP: internal only. NodePort: exposes on node IP:port. LoadBalancer: cloud creates an L4 load balancer (AWS ELB). Ingress handles L7 (HTTP routing).' });
            engine.graphCreateNode('ingress', 'Ingress\n/api → myapp\n/web → frontend', 0, -3, 'frontend');
            engine.graphConnect('ingress', 'svc', true); engine.highlight('ingress', 0x10b981);
            await delay(1000);
            onStep({ title: 'Ingress: host/path routing without multiple LBs', explanation: 'Ingress routes app.com/api to backend service, app.com/ to frontend service. One cloud LB + Ingress controller (nginx) handles all routing. Cost-effective.' });
        }
    },
    {
        id: 'k8s_scaling',
        title: 'HPA: Auto-scaling',
        icon: '📈',
        code: `kind: HorizontalPodAutoscaler\nspec:\n  scaleTargetRef:\n    name: myapp\n  minReplicas: 2\n  maxReplicas: 10\n  metrics:\n  - type: Resource\n    resource: {name: cpu, target: {averageUtilization: 70}}`,
        desc: 'HPA scales pods automatically based on CPU/memory or custom metrics.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'HPA: scale pods based on CPU usage', explanation: 'When CPU > 70%, HPA adds pods. K8s Metrics Server collects usage. Scales between minReplicas (2) and maxReplicas (10). Evaluates every 15 seconds.' });
            engine.graphCreateNode('hpa', 'HPA\nCPU > 70%?', 0, 3, 'kubernetes');
            const pods = 2;
            for (let i = 0; i < pods; i++) {
                engine.graphCreateNode(`p${i}`, `Pod ${i + 1}`, -2 + i * 4, 0, 'backend');
                engine.graphConnect('hpa', `p${i}`, false);
            }
            await delay(1200);
            onStep({ title: 'Traffic spike → CPU rises → 5 pods', explanation: 'High load detected. HPA creates 3 more pods. K8s schedules them on available nodes. Load balancer automatically includes new pods.' });
            for (let i = pods; i < 5; i++) {
                engine.graphCreateNode(`np${i}`, `Pod ${i + 1}\n(new)`, -8 + i * 4, -3, 'cache');
                engine.graphConnect('hpa', `np${i}`, true);
                engine.highlight(`np${i}`, 0x10b981); await delay(400);
            }
            await delay(800);
            onStep({ title: 'Scale down: cooldown period prevents thrashing', explanation: 'After load drops, HPA waits ~5 minutes (stabilization window) before scaling down. Prevents oscillation from rapid scale up/down.' });
        }
    },
    {
        id: 'k8s_configmaps',
        title: 'ConfigMaps & Secrets',
        icon: '🔒',
        code: `# ConfigMap: non-sensitive config\nkind: ConfigMap\ndata:\n  DB_HOST: "postgres.default"\n---\n# Secret: base64-encoded sensitive data\nkind: Secret\ndata:\n  DB_PASS: cGFzc3dvcmQ=  # base64`,
        desc: 'ConfigMaps inject config. Secrets inject sensitive data. Both mounted as env vars or files.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'ConfigMap: externalise configuration', explanation: 'Store non-sensitive config (DB host, feature flags) in ConfigMap. Mount as env vars or files. Change config without rebuilding the image.' });
            engine.graphCreateNode('cm', 'ConfigMap\nDB_HOST\nAPI_URL\nFEATURE_FLAG', -4, 2, 'database');
            engine.graphCreateNode('pod_cm', 'Pod\nenv: DB_HOST\nfrom ConfigMap', 4, 2, 'backend');
            engine.graphConnect('cm', 'pod_cm', true); engine.highlight('pod_cm', 0x10b981);
            await delay(1200);
            onStep({ title: 'Secret: for passwords, tokens, certificates', explanation: 'Secrets stored base64-encoded (not encrypted by default!). Use etcd encryption at rest in production. Or external secrets managers (AWS Secrets Manager, Vault).' });
            engine.graphCreateNode('sec', 'Secret\nDB_PASSWORD\n(encrypted in etcd)', -4, -1, 'security');
            engine.graphCreateNode('pod_sec', 'Pod\nenv: DB_PASS\nfrom Secret', 4, -1, 'backend');
            engine.graphConnect('sec', 'pod_sec', true);
            engine.highlight('sec', 0xfbbf24); engine.highlight('pod_sec', 0x10b981);
        }
    },
];
