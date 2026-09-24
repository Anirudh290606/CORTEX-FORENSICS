/* ==========================================================================
   CORTEX-FORENSICS // Observability & Incident Simulation Dataset
   ========================================================================== */

const INCIDENTS_DATA = {
  "INC-2048": {
    id: "INC-2048",
    title: "Payment processing degradation & Checkout timeout cascade",
    severity: "CRITICAL",
    status: "INVESTIGATING",
    startTime: "2026-09-24 14:32:08 UTC",
    duration: "18m 42s",
    owner: "DevOps / On-Call SRE (Alex Chen)",
    affectedServicesCount: 7,
    affectedServices: [
      "payment-db",
      "payment-service",
      "payment-worker",
      "checkout-api",
      "api-gateway",
      "inventory-service",
      "notification-service"
    ],
    
    // Funnel Noise Reduction
    reductionStats: {
      rawEvents: 12483,
      correlatedEvents: 1284,
      anomalies: 37,
      affectedServices: 7,
      probableCauses: 3,
      leadingHypothesis: "payment-db pool saturation"
    },

    // Ranked Root Cause Candidates
    candidates: [
      {
        id: "cand-1",
        rank: "01",
        service: "payment-db",
        issue: "Database connection pool saturation & IOPS ceiling hit",
        probability: 87,
        evidenceCount: 14,
        firstDetected: "14:31:42",
        downstreamAffected: 5,
        anomaliesCount: 12,
        relationship: "Upstream root trigger for downstream timeouts",
        details: {
          latencyDelta: "+480ms (840% increase)",
          saturation: "96% pool max capacity (960/1000 conns)",
          trace propagation: "timeout (>5000ms) propagated to payment-service",
          historicalPattern: "Matched INC-1029 (2026-04-12) & INC-1488 (2026-07-04)"
        }
      },
      {
        id: "cand-2",
        rank: "02",
        service: "checkout-api",
        issue: "HTTP client connection pool exhaustion",
        probability: 64,
        evidenceCount: 8,
        firstDetected: "14:32:08",
        downstreamAffected: 2,
        anomaliesCount: 6,
        relationship: "Secondary blockage due to blocking synchronous payment calls",
        details: {
          latencyDelta: "+1,200ms",
          saturation: "100% thread pool maxed out (200/200 threads)",
          tracePropagation: "HTTP 504 Gateway Timeouts emitted to API Gateway",
          historicalPattern: "Correlated with retry amplification"
        }
      },
      {
        id: "cand-3",
        rank: "03",
        service: "payment-worker",
        issue: "Exponential backoff retry storm",
        probability: 41,
        evidenceCount: 5,
        firstDetected: "14:33:02",
        downstreamAffected: 1,
        anomaliesCount: 4,
        relationship: "Amplifier of db load during connection recovery attempts",
        details: {
          latencyDelta: "+210ms queue wait time",
          saturation: "Queue depth spike: 42,000 pending messages",
          tracePropagation: "Kafka consumer offset lag growing +1,200 msg/sec",
          historicalPattern: "Missing jitter on retry logic"
        }
      }
    ],

    // Service Dependency Map (Causality Graph)
    nodes: [
      { id: "api-gateway", name: "API Gateway", status: "degraded", role: "IMPACT", metrics: "5xx: 14.2% | Latency: 1.8s" },
      { id: "checkout-api", name: "Checkout Service", status: "critical", role: "PROPAGATION", metrics: "Errors: 28.5% | Thread: 100%" },
      { id: "payment-service", name: "Payment Service", status: "critical", role: "PROPAGATION", metrics: "Latency: 5.2s | Timeout: 42%" },
      { id: "payment-db", name: "Payment Database", status: "root_cause", role: "ROOT", metrics: "Conns: 96% | IOPS: 98%" },
      { id: "payment-worker", name: "Payment Worker", status: "degraded", role: "PROPAGATION", metrics: "Retries: 4,200/s | Lag: 42k" },
      { id: "inventory-service", name: "Inventory Service", status: "healthy", role: "ISOLATED", metrics: "Errors: 0.01% | Latency: 14ms" },
      { id: "auth-service", name: "Auth Service", status: "healthy", role: "ISOLATED", metrics: "Errors: 0.00% | Latency: 8ms" },
      { id: "notification-service", name: "Notification Service", status: "healthy", role: "ISOLATED", metrics: "Queue: Normal" },
      { id: "kafka-event-bus", name: "Kafka Event Bus", status: "degraded", role: "PROPAGATION", metrics: "Lag: High" }
    ],

    edges: [
      { source: "payment-db", target: "payment-service", flow: "ROOT -> PROPAGATION", latency: "5,200ms" },
      { source: "payment-service", target: "checkout-api", flow: "PROPAGATION -> PROPAGATION", latency: "5,450ms" },
      { source: "checkout-api", target: "api-gateway", flow: "PROPAGATION -> IMPACT", latency: "1,820ms" },
      { source: "payment-service", target: "payment-worker", flow: "PROPAGATION -> AMPLIFIER", latency: "210ms" },
      { source: "payment-worker", target: "kafka-event-bus", flow: "PROPAGATION", latency: "18ms" },
      { source: "inventory-service", target: "checkout-api", flow: "NORMAL", latency: "12ms" },
      { source: "auth-service", target: "api-gateway", flow: "NORMAL", latency: "6ms" }
    ],

    // Chronological Investigation Timeline
    timeline: [
      {
        id: "evt-101",
        time: "14:31:42.102",
        service: "payment-db",
        type: "ANOMALY",
        summary: "Database connection saturation threshold exceeded (96% max connections)",
        details: "Max active connections reached 960/1000. Active queries blocked on pg_stat_activity lock."
      },
      {
        id: "evt-102",
        time: "14:31:54.450",
        service: "payment-service",
        type: "LOG",
        summary: "pgx connection pool timeout after 5000ms while acquiring connection",
        details: "ERROR: context deadline exceeded (Client.Timeout exceeded while awaiting headers)"
      },
      {
        id: "evt-103",
        time: "14:32:08.891",
        service: "checkout-api",
        type: "ALERT",
        summary: "[P1 ALERT] Checkout API HTTP 504 error rate exceeded 15%",
        details: "Prometheus alert firing: job='checkout-api' metric='http_requests_5xx' > 0.15 for 2m"
      },
      {
        id: "evt-104",
        time: "14:32:14.004",
        service: "payment-service",
        type: "TRACE",
        summary: "Trace #8f92a10d: duration 5,420ms (db.query span 5,001ms timed out)",
        details: "Span db.exec SELECT FOR UPDATE ON accounts timed out."
      },
      {
        id: "evt-105",
        time: "14:32:40.120",
        service: "payment-service",
        type: "DEPLOYMENT",
        summary: "Deployment payment-service:v2.8.1 deployed 12 minutes prior",
        details: "Git commit 7f3a8b2: Added automatic synchronous fraud verification hook before DB transaction commit."
      },
      {
        id: "evt-106",
        time: "14:33:02.500",
        service: "payment-worker",
        type: "METRIC",
        summary: "Retry volume spiked from 120/sec to 4,200/sec without exponential jitter",
        details: "Metric retry_attempts_total slope +3400% over 60 seconds."
      },
      {
        id: "evt-107",
        time: "14:34:11.310",
        service: "api-gateway",
        type: "LOG",
        summary: "Kong Ingress upstream timeout on /v1/checkout (HTTP 504 Gateway Timeout)",
        details: "Client IP: 192.168.4.12 - Upstream response time: 60.00s"
      }
    ],

    // AI Narrative Explanation
    aiNarrative: `At 14:31:42 UTC, **payment-db** experienced a sharp connection saturation event reaching 96% capacity (960/1000 pool limit), driven by unindexed lock contention in PostgreSQL. 

Approximately 26 seconds later (14:32:08), **payment-service** database query acquiring timeouts (>5000ms) propagated into **checkout-api**, causing client thread pool exhaustion. 

The resulting retry storm on **payment-worker** amplified database lock contention, causing **API Gateway** to return HTTP 504 Gateway Timeouts on customer purchase requests.`,

    // Cascading Failure Path
    cascadingPath: [
      { service: "payment-db", label: "ROOT CAUSE", desc: "Lock contention & Connection Saturation (96%)", type: "ROOT" },
      { service: "payment-service", label: "PROPAGATION", desc: "DB connection acquisition timeouts (>5000ms)", type: "PROPAGATION" },
      { service: "payment-worker", label: "AMPLIFIER", desc: "Retry storm (4,200 retries/sec without jitter)", type: "PROPAGATION" },
      { service: "checkout-api", label: "PROPAGATION", desc: "Thread pool exhaustion (200/200 threads blocked)", type: "PROPAGATION" },
      { service: "api-gateway", label: "IMPACT", desc: "504 Gateway Timeouts on customer requests", type: "IMPACT" }
    ],

    // Trace Span Waterfall Mock Data
    traceWaterfall: {
      traceId: "8f92a10d-7b2a-4c90",
      totalDuration: "5,420 ms",
      spans: [
        { service: "api-gateway", name: "POST /v1/checkout", start: 0, duration: 5420, status: "error" },
        { service: "checkout-api", name: "CheckoutService.ProcessOrder", start: 12, duration: 5400, status: "error" },
        { service: "payment-service", name: "PaymentService.ChargeAccount", start: 35, duration: 5360, status: "error" },
        { service: "payment-db", name: "pg_query: SELECT FOR UPDATE ON accounts", start: 42, duration: 5001, status: "timeout" },
        { service: "payment-worker", name: "KafkaProducer.PublishRetry", start: 5045, duration: 310, status: "ok" }
      ]
    },

    // Remediation Suggestions
    remediations: [
      {
        id: "rem-1",
        rank: "01",
        title: "Scale Payment DB connection pool limit & terminate idle locks",
        confidence: 94,
        reason: "Releases 450+ blocked connection slots held by long transactions",
        command: "kubectl exec -it payment-db-0 -- psql -c 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \"idle in transaction\";'",
        impact: "Immediate reduction in database connection pressure"
      },
      {
        id: "rem-2",
        rank: "02",
        title: "Temporarily apply rate-limiting & backoff jitter on payment-worker",
        confidence: 88,
        reason: "Prevents retry storm from re-saturating DB during recovery",
        command: "kubectl set env deployment/payment-worker RETRY_JITTER=true MAX_RETRIES=2",
        impact: "Reduces ingress retry traffic by 85%"
      },
      {
        id: "rem-3",
        rank: "03",
        title: "Roll back payment-service deployment to v2.8.0",
        confidence: 76,
        reason: "Disables synchronous fraud check lock overhead introduced in v2.8.1",
        command: "helm rollback payment-service 142",
        impact: "Eliminates row lock contention on account updates"
      }
    ]
  },

  "INC-3091": {
    id: "INC-3091",
    title: "Redis Cluster Memory Eviction Failure & Auth Token Degradation",
    severity: "HIGH",
    status: "INVESTIGATING",
    startTime: "2026-09-24 10:15:30 UTC",
    duration: "42m 10s",
    owner: "Security / Platform Team (Maya Patel)",
    affectedServicesCount: 5,
    affectedServices: [
      "user-session-cache",
      "auth-service",
      "api-gateway",
      "user-profile-service",
      "notification-service"
    ],
    reductionStats: {
      rawEvents: 8940,
      correlatedEvents: 720,
      anomalies: 19,
      affectedServices: 5,
      probableCauses: 2,
      leadingHypothesis: "user-session-cache maxmemory policy misconfiguration"
    },
    candidates: [
      {
        id: "cand-301",
        rank: "01",
        service: "user-session-cache",
        issue: "OOM maxmemory reached with noeviction policy",
        probability: 91,
        evidenceCount: 11,
        firstDetected: "10:14:55",
        downstreamAffected: 4,
        anomaliesCount: 9,
        relationship: "Primary cause of auth token generation rejections",
        details: {
          latencyDelta: "+310ms",
          saturation: "100% RAM allocation (16GB/16GB)",
          tracePropagation: "Command SETEX returning OOM command not allowed",
          historicalPattern: "Configuration drift after Helm release v3.1.0"
        }
      },
      {
        id: "cand-302",
        rank: "02",
        service: "auth-service",
        issue: "JWT verification fallback fallback saturation",
        probability: 52,
        evidenceCount: 6,
        firstDetected: "10:15:30",
        downstreamAffected: 2,
        anomaliesCount: 5,
        relationship: "Secondary CPU spike caused by DB fallback verification",
        details: {
          latencyDelta: "+890ms",
          saturation: "CPU 98% utilization",
          tracePropagation: "Database query fallback for token validation",
          historicalPattern: "Correlated with cache bypass load"
        }
      }
    ],
    nodes: [
      { id: "api-gateway", name: "API Gateway", status: "degraded", role: "IMPACT", metrics: "401 Rate: 18%" },
      { id: "auth-service", name: "Auth Service", status: "critical", role: "PROPAGATION", metrics: "CPU: 98% | Latency: 920ms" },
      { id: "user-session-cache", name: "Redis Session Cache", status: "root_cause", role: "ROOT", metrics: "Mem: 100% | OOM Errors" },
      { id: "user-profile-service", name: "User Profile Service", status: "degraded", role: "IMPACT", metrics: "Latency: 450ms" },
      { id: "notification-service", name: "Notification Service", status: "healthy", role: "ISOLATED", metrics: "Healthy" }
    ],
    edges: [
      { source: "user-session-cache", target: "auth-service", flow: "ROOT -> PROPAGATION", latency: "920ms" },
      { source: "auth-service", target: "api-gateway", flow: "PROPAGATION -> IMPACT", latency: "450ms" },
      { source: "auth-service", target: "user-profile-service", flow: "PROPAGATION", latency: "380ms" }
    ],
    timeline: [
      {
        id: "evt-301",
        time: "10:14:55.012",
        service: "user-session-cache",
        type: "ANOMALY",
        summary: "Redis memory used_memory_human reached 16.00G ceiling",
        details: "maxmemory-policy set to noeviction rejected session write commands."
      },
      {
        id: "evt-302",
        time: "10:15:30.400",
        service: "auth-service",
        type: "ALERT",
        summary: "[P2 ALERT] Auth Service CPU utilization > 95%",
        details: "High crypto validation load due to cache miss fallback."
      }
    ],
    aiNarrative: `At 10:14:55 UTC, **user-session-cache** reached 100% memory allocation (16GB ceiling). Due to a recent configuration change setting policy to **noeviction**, Redis began rejecting session keys. **auth-service** fell back to expensive cryptographic RSA signature verifications, driving CPU utilization to 98% and causing 401 Unauthorized errors across the platform.`,
    cascadingPath: [
      { service: "user-session-cache", label: "ROOT CAUSE", desc: "OOM Memory limit hit (noeviction policy)", type: "ROOT" },
      { service: "auth-service", label: "PROPAGATION", desc: "RSA verification CPU spike (98%)", type: "PROPAGATION" },
      { service: "api-gateway", label: "IMPACT", desc: "HTTP 401 Unauthorized rate spike (18%)", type: "IMPACT" }
    ],
    traceWaterfall: {
      traceId: "3091-a1b2-c3d4",
      totalDuration: "980 ms",
      spans: [
        { service: "api-gateway", name: "GET /api/v1/user/me", start: 0, duration: 980, status: "error" },
        { service: "auth-service", name: "Auth.ValidateSession", start: 20, duration: 940, status: "error" },
        { service: "user-session-cache", name: "Redis.GET session:892", start: 30, duration: 15, status: "error" }
      ]
    },
    remediations: [
      {
        id: "rem-301",
        rank: "01",
        title: "Change Redis maxmemory-policy to volatile-lru",
        confidence: 96,
        reason: "Allows Redis to safely evict expired session keys under memory pressure",
        command: "redis-cli -h user-session-cache CONFIG SET maxmemory-policy volatile-lru",
        impact: "Frees ~3.4GB of expired sessions immediately"
      }
    ]
  },

  "INC-4102": {
    id: "INC-4102",
    title: "Kubernetes Ingress Proxy Memory Leak & OOMKilled Loop",
    severity: "CRITICAL",
    status: "INVESTIGATING",
    startTime: "2026-09-24 08:00:12 UTC",
    duration: "1h 12m",
    owner: "Core Infra / Platform SRE",
    affectedServicesCount: 12,
    affectedServices: [
      "api-gateway",
      "checkout-api",
      "inventory-service",
      "auth-service",
      "search-index",
      "payment-service"
    ],
    reductionStats: {
      rawEvents: 24190,
      correlatedEvents: 3100,
      anomalies: 84,
      affectedServices: 12,
      probableCauses: 2,
      leadingHypothesis: "envoy-proxy-ingress memory buffer leak"
    },
    candidates: [
      {
        id: "cand-401",
        rank: "01",
        service: "api-gateway",
        issue: "Envoy Ingress proxy pod OOMKilled restart loop",
        probability: 95,
        evidenceCount: 18,
        firstDetected: "07:58:10",
        downstreamAffected: 11,
        anomaliesCount: 15,
        relationship: "Single point of entry failure for all external traffic",
        details: {
          latencyDelta: "Complete Outage (502 Bad Gateway)",
          saturation: "Memory limit 4Gi exceeded (Kernel OOM Killer invoked)",
          tracePropagation: "TCP connection resets on all ingress pods",
          historicalPattern: "Correlated with Canary deployment Envoy v1.24.2"
        }
      }
    ],
    nodes: [
      { id: "api-gateway", name: "API Gateway (Envoy)", status: "root_cause", role: "ROOT", metrics: "OOMKilled | Restarts: 14" },
      { id: "checkout-api", name: "Checkout Service", status: "degraded", role: "IMPACT", metrics: "Unreachable" },
      { id: "auth-service", name: "Auth Service", status: "degraded", role: "IMPACT", metrics: "Unreachable" }
    ],
    edges: [
      { source: "api-gateway", target: "checkout-api", flow: "ROOT -> IMPACT", latency: "N/A" },
      { source: "api-gateway", target: "auth-service", flow: "ROOT -> IMPACT", latency: "N/A" }
    ],
    timeline: [
      {
        id: "evt-401",
        time: "07:58:10.000",
        service: "api-gateway",
        type: "DEPLOYMENT",
        summary: "Canary release envoy-proxy-ingress:v1.24.2 promoted to 50% traffic",
        details: "Enabled HTTP/3 QUIC buffer streaming feature flag."
      },
      {
        id: "evt-402",
        time: "08:00:12.100",
        service: "api-gateway",
        type: "ALERT",
        summary: "[CRITICAL] KubePodCrashLooping: ingress-envoy-79f4c56-x92zk OOMKilled",
        details: "Container envoy killed by cgroup memory limit (4096Mi)."
      }
    ],
    aiNarrative: `At 07:58:10 UTC, a canary deployment promoted **envoy-proxy-ingress:v1.24.2** to 50% of production traffic. An unmanaged HTTP/3 buffer leak caused container memory to grow rapidly until Kubernetes cgroup limits triggered **OOMKilled** signals. As pods crashed, traffic shifted to remaining pods, creating a cascading CrashLoopBackOff across all ingress nodes.`,
    cascadingPath: [
      { service: "api-gateway", label: "ROOT CAUSE", desc: "Envoy v1.24.2 HTTP/3 buffer leak & OOMKilled", type: "ROOT" },
      { service: "checkout-api", label: "IMPACT", desc: "502 Bad Gateway (Ingress pod unavailable)", type: "IMPACT" },
      { service: "auth-service", label: "IMPACT", desc: "502 Bad Gateway (Ingress pod unavailable)", type: "IMPACT" }
    ],
    traceWaterfall: {
      traceId: "4102-f8e9-d7c6",
      totalDuration: "0 ms (Connection Refused)",
      spans: [
        { service: "api-gateway", name: "Ingress TCP Handshake", start: 0, duration: 5, status: "error" }
      ]
    },
    remediations: [
      {
        id: "rem-401",
        rank: "01",
        title: "Immediate Rollback Envoy Ingress Deployment to v1.24.1",
        confidence: 99,
        reason: "Stops HTTP/3 memory buffer leak and restores stable proxy version",
        command: "kubectl rollout undo deployment/envoy-proxy-ingress -n ingress-system",
        impact: "Restores ingress traffic within ~45 seconds"
      }
    ]
  }
};
