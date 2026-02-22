const delay = (ms) => new Promise(r => setTimeout(r, ms));

export const cloudTopics = [
    {
        id: 'aws_ec2',
        title: 'AWS EC2 & Instance Types',
        icon: '☁️',
        code: `# Launch a t3.micro (free tier)\naws ec2 run-instances \\\n  --image-id ami-0abcdef12345\\\n  --instance-type t3.micro\\\n  --key-name my-key\\\n  --security-group-ids sg-xxx`,
        desc: 'EC2 provides virtual machines on AWS. Choose instance type for CPU/memory/GPU balance.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'EC2: Virtual Machines in the Cloud', explanation: 'EC2 creates VMs (instances) on AWS hardware. You choose OS (AMI), instance type (CPU/RAM), storage (EBS), and networking (VPC/SG).' });
            const types = [['t3', 't3.micro\n2vCPU 1GB\n(general)', 'cache'], ['c6', 'c6g.large\n2vCPU 4GB\n(compute)', 'backend'], ['r6', 'r6i.xlarge\n4vCPU 32GB\n(memory)', 'database'], ['p3', 'p3.2xlarg\n8vCPU GPU\n(ML)', 'ml_model']];
            for (const [i, [id, label, type]] of types.entries()) {
                engine.graphCreateNode(id, label, -6 + i * 4, 0, type);
                engine.highlight(id, 0x3b82f6); await delay(600);
            }
            onStep({ title: 'Security Groups: stateful firewall', explanation: 'SG rules allow inbound/outbound traffic. Return traffic automatically allowed (stateful). Inbound: allow port 80/443 from 0.0.0.0/0, port 22 from your IP only.' });
            engine.graphCreateNode('sg', 'Security Group\nPort 80 ✅\nPort 22 → MY_IP only', 0, -3, 'security');
            engine.highlight('sg', 0xfbbf24);
        }
    },
    {
        id: 'aws_s3',
        title: 'AWS S3: Object Storage',
        icon: '🪣',
        code: `# Put object\naws s3 cp myfile.jpg s3://my-bucket/images/\n# Public URL:\nhttps://my-bucket.s3.amazonaws.com/images/myfile.jpg`,
        desc: 'S3 stores objects (files) in buckets. 11-nines durability. Perfect for static assets and backups.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'S3: Object Storage (not file system!)', explanation: 'No directories — just keys (paths) and values (files). Flat namespace. 5TB max per object. 99.999999999% (11 nines) durability via multi-AZ replication.' });
            engine.graphCreateNode('bucket', 'my-bucket\n(S3 bucket)', 0, 3, 'database');
            const objects = [['img', 'images/\nphoto.jpg', 'frontend'], ['vid', 'videos/\nclip.mp4', 'backend'], ['backup', 'backups/\ndb.dump', 'security']];
            for (const [i, [id, label, type]] of objects.entries()) {
                engine.graphCreateNode(id, label, -4 + i * 4, 0, type);
                engine.graphConnect('bucket', id, false);
                engine.highlight(id, 0x3b82f6); await delay(500);
            }
            await delay(600);
            onStep({ title: 'Presigned URLs: temporary access', explanation: 'Generate a time-limited URL for private objects. User downloads directly from S3 — bypasses your server. Secure, scalable, saves bandwidth cost.' });
            engine.graphCreateNode('url', 'Presigned URL\n(expires in 3600s)', 0, -2, 'cache');
            engine.highlight('url', 0x10b981);
        }
    },
    {
        id: 'aws_lambda',
        title: 'AWS Lambda: Serverless',
        icon: 'λ',
        code: `exports.handler = async (event) => {\n  const name = event.queryStringParameters?.name;\n  return {\n    statusCode: 200,\n    body: \`Hello, \${name}!\`\n  };\n};`,
        desc: 'Lambda runs code without managing servers. Pay per invocation (first 1M free). Auto-scales.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'Serverless: AWS manages everything', explanation: 'Upload your function. AWS handles servers, OS, runtime, scaling, HA. You pay only when it runs (~$0.0000002 per request). Zero idle cost.' });
            engine.graphCreateNode('trigger', 'Trigger:\n(API GW / S3 / SQS)', -5, 2, 'cloud');
            engine.graphCreateNode('lambda', 'λ Lambda\n(your function\nruns here)', 0, 2, 'ml_model');
            engine.graphCreateNode('out', 'Output:\n(response / side-effect)', 5, 2, 'frontend');
            engine.graphConnect('trigger', 'lambda', true); engine.graphConnect('lambda', 'out', true);
            engine.highlight('lambda', 0x10b981);
            await delay(1200);
            onStep({ title: 'Cold start: first invocation is slow', explanation: 'Lambda initialises container on first call (~100ms-1s). Subsequent calls reuse warm container (~ms). Provisioned Concurrency keeps containers warm (costs money).' });
            onStep({ title: 'Lambda@Edge: run functions at CDN edge', explanation: 'Deploy Lambda@Edge to 400+ CloudFront edge locations worldwide. Modify requests/responses near users. Great for A/B testing, auth, personalisation.' });
        }
    },
    {
        id: 'aws_vpc',
        title: 'AWS VPC & Networking',
        icon: '🔒',
        code: `VPC: 10.0.0.0/16\n  Public subnet:  10.0.1.0/24  ← Internet Gateway\n  Private subnet: 10.0.2.0/24  ← NAT Gateway\n  DB subnet:      10.0.3.0/24  ← No internet access`,
        desc: 'VPC is a private network in AWS. Public subnets face internet. Private subnets don\'t.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'VPC: your private network in AWS', explanation: 'Virtual Private Cloud isolates your resources. You define IP range (CIDR), subnets, routing, and access. Default VPC provided — but create custom for production.' });
            engine.graphCreateNode('igw', 'Internet\nGateway', 0, 4, 'cloud');
            engine.graphCreateNode('pub', 'Public Subnet\n10.0.1.0/24\n(EC2, ALB)', -4, 1, 'frontend');
            engine.graphCreateNode('priv', 'Private Subnet\n10.0.2.0/24\n(App servers)', 0, -1, 'backend');
            engine.graphCreateNode('db', 'DB Subnet\n10.0.3.0/24\n(RDS, no internet)', 4, -3, 'database');
            engine.graphConnect('igw', 'pub', true);
            engine.graphConnect('pub', 'priv', true);
            engine.graphConnect('priv', 'db', true);
            engine.highlight('db', 0x10b981); engine.highlight('pub', 0xfbbf24);
            await delay(1500);
            onStep({ title: 'NAT Gateway: private subnet can reach internet', explanation: 'Private subnet EC2s can\'t receive incoming internet. But with NAT Gateway in public subnet, they CAN initiate outbound (pull packages, call APIs).' });
        }
    },
    {
        id: 'aws_rds',
        title: 'AWS RDS & Managed Databases',
        icon: '🗄️',
        code: `# RDS: managed PostgreSQL\nRDS manages: backups, patching, HA,\n              read replicas, failover\n\n# Multi-AZ: primary + standby\n# Read Replica: scale reads horizontally`,
        desc: 'RDS manages database servers — backups, patching, HA failover. You just use SQL.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'RDS: managed relational database', explanation: 'AWS handles: OS patching, DB engine updates, automated backups (35 days), Multi-AZ failover. You focus on SQL and schema, not ops.' });
            engine.graphCreateNode('primary', 'RDS Primary\n(Multi-AZ)\nus-east-1a', -4, 2, 'database');
            engine.graphCreateNode('standby', 'Standby\n(sync replica)\nus-east-1b', 4, 2, 'database');
            engine.graphConnect('primary', 'standby', false);
            engine.highlight('primary', 0x3b82f6); engine.highlight('standby', 0xfbbf24);
            await delay(1200);
            onStep({ title: 'Multi-AZ: automatic failover in ~1 min', explanation: 'Synchronous replication to standby. If primary fails, DNS flips to standby in ~60s. Your app reconnects automatically. Zero data loss.' });
            onStep({ title: 'Read Replicas: scale read throughput', explanation: 'Asynchronous reads replicated to 1-5 read replicas. Direct read queries to replicas — reduces load on primary. Promote to standalone DB if needed.' });
            engine.graphCreateNode('rr1', 'Read Replica 1', -6, -1, 'cache');
            engine.graphCreateNode('rr2', 'Read Replica 2', 6, -1, 'cache');
            engine.graphConnect('primary', 'rr1', true); engine.graphConnect('primary', 'rr2', true);
            engine.highlight('rr1', 0x10b981); engine.highlight('rr2', 0x10b981);
        }
    },
    {
        id: 'aws_cicd',
        title: 'CI/CD Pipeline',
        icon: '🔄',
        code: `# GitHub Actions workflow:\non: [push]\njobs:\n  test: ...runs pytest...\n  build: ...docker build...\n  deploy: ...kubectl apply...`,
        desc: 'CI/CD automates build, test, and deploy on every commit. GitHub Actions, Jenkins, GitLab CI.',
        async play(engine, onStep) {
            engine.reset();
            onStep({ title: 'CI/CD: automate the path to production', explanation: 'Every git push triggers an automated pipeline. CI: run tests, linting, security scans. CD: build image, push to registry, deploy to K8s. Catch bugs before users do.' });
            const stages = [['push', 'git push', 'frontend'], ['ci', 'CI: test + lint', 'backend'], ['build', 'docker build\n+ push ECR', 'cache'], ['staging', 'Deploy\nstaging', 'cloud'], ['prod', 'Deploy\nproduction', 'kubernetes']];
            for (const [i, [id, label, type]] of stages.entries()) {
                engine.graphCreateNode(id, label, -8 + i * 4, 0, type);
                if (i > 0) engine.graphConnect(stages[i - 1][0], id, true);
                engine.highlight(id, 0x3b82f6); await delay(600);
            }
            engine.graphCreateNode('gate', '✅ Manual\napproval gate', 8, -3, 'security');
            engine.graphConnect('staging', 'gate', false); engine.graphConnect('gate', 'prod', true);
            engine.highlight('gate', 0xfbbf24);
            onStep({ title: 'Blue/Green: zero-downtime deployment', explanation: 'Maintain two identical environments (blue=current, green=new). Switch traffic to green when ready. Instant rollback: just switch back to blue.' });
        }
    },
];
