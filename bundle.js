/* ==========================================================================
   CORTEX-FORENSICS // Production Incident Root Cause Analysis Engine
   Clean Minimal Typography + Real SQLite Database Persistence Backend
   ========================================================================== */

// 1. DATASETS & ARCHIVE
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
      "payment-db", "payment-service", "payment-worker", "checkout-api", "api-gateway", "inventory-service", "notification-service"
    ],
    reductionStats: {
      rawEvents: 12483, correlatedEvents: 1284, anomalies: 37, affectedServices: 7, probableCauses: 3, leadingHypothesis: "payment-db pool saturation"
    },
    candidates: [
      {
        id: "cand-1", rank: "01", service: "payment-db", issue: "Database connection pool saturation & IOPS ceiling hit",
        probability: 87, evidenceCount: 14, firstDetected: "14:31:42", downstreamAffected: 5, anomaliesCount: 12,
        relationship: "Upstream root trigger for downstream timeouts",
        details: {
          latencyDelta: "+480ms (840% increase)", saturation: "96% pool max capacity (960/1000 conns)",
          tracePropagation: "timeout (>5000ms) propagated to payment-service", historicalPattern: "Matched INC-1029 & INC-1488"
        }
      },
      {
        id: "cand-2", rank: "02", service: "checkout-api", issue: "HTTP client connection pool exhaustion",
        probability: 64, evidenceCount: 8, firstDetected: "14:32:08", downstreamAffected: 2, anomaliesCount: 6,
        relationship: "Secondary blockage due to blocking synchronous payment calls",
        details: {
          latencyDelta: "+1,200ms", saturation: "100% thread pool maxed out (200/200 threads)",
          tracePropagation: "HTTP 504 Gateway Timeouts emitted to API Gateway", historicalPattern: "Correlated with retry amplification"
        }
      },
      {
        id: "cand-3", rank: "03", service: "payment-worker", issue: "Exponential backoff retry storm",
        probability: 41, evidenceCount: 5, firstDetected: "14:33:02", downstreamAffected: 1, anomaliesCount: 4,
        relationship: "Amplifier of db load during connection recovery attempts",
        details: {
          latencyDelta: "+210ms queue wait time", saturation: "Queue depth spike: 42,000 pending messages",
          tracePropagation: "Kafka consumer offset lag growing +1,200 msg/sec", historicalPattern: "Missing jitter on retry logic"
        }
      }
    ],
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
    timeline: [
      { id: "evt-101", time: "14:31:42.102", service: "payment-db", type: "ANOMALY", summary: "Database connection saturation threshold exceeded (96% max connections)", details: "Max active connections reached 960/1000." },
      { id: "evt-102", time: "14:31:54.450", service: "payment-service", type: "LOG", summary: "pgx connection pool timeout after 5000ms while acquiring connection", details: "ERROR: context deadline exceeded" },
      { id: "evt-103", time: "14:32:08.891", service: "checkout-api", type: "ALERT", summary: "[P1 ALERT] Checkout API HTTP 504 error rate exceeded 15%", details: "Prometheus alert firing: http_requests_5xx > 0.15" },
      { id: "evt-104", time: "14:32:14.004", service: "payment-service", type: "TRACE", summary: "Trace #8f92a10d: duration 5,420ms (db.query span 5,001ms timed out)", details: "Span db.exec SELECT FOR UPDATE timed out." },
      { id: "evt-105", time: "14:32:40.120", service: "payment-service", type: "DEPLOYMENT", summary: "Deployment payment-service:v2.8.1 deployed 12 minutes prior", details: "Git commit 7f3a8b2: Added synchronous fraud check hook." },
      { id: "evt-106", time: "14:33:02.500", service: "payment-worker", type: "METRIC", summary: "Retry volume spiked from 120/sec to 4,200/sec without exponential jitter", details: "Metric retry_attempts_total slope +3400%." },
      { id: "evt-107", time: "14:34:11.310", service: "api-gateway", type: "LOG", summary: "Kong Ingress upstream timeout on /v1/checkout (HTTP 504 Gateway Timeout)", details: "Upstream response time: 60.00s" }
    ],
    aiNarrative: `At 14:31:42 UTC, **payment-db** experienced a sharp connection saturation event reaching 96% capacity (960/1000 pool limit), driven by unindexed lock contention in PostgreSQL.\n\nApproximately 26 seconds later (14:32:08), **payment-service** database query timeouts (>5000ms) propagated into **checkout-api**, causing client thread pool exhaustion.\n\nThe resulting retry storm on **payment-worker** amplified database lock contention, causing **API Gateway** to return HTTP 504 Gateway Timeouts on customer purchase requests.`,
    cascadingPath: [
      { service: "payment-db", label: "ROOT CAUSE", desc: "Lock contention & Connection Saturation (96%)", type: "ROOT" },
      { service: "payment-service", label: "PROPAGATION", desc: "DB connection acquisition timeouts (>5000ms)", type: "PROPAGATION" },
      { service: "payment-worker", label: "AMPLIFIER", desc: "Retry storm (4,200 retries/sec without jitter)", type: "PROPAGATION" },
      { service: "checkout-api", label: "PROPAGATION", desc: "Thread pool exhaustion (200/200 threads blocked)", type: "PROPAGATION" },
      { service: "api-gateway", label: "IMPACT", desc: "504 Gateway Timeouts on customer requests", type: "IMPACT" }
    ],
    traceWaterfall: {
      traceId: "8f92a10d-7b2a-4c90", totalDuration: "5,420 ms",
      spans: [
        { service: "api-gateway", name: "POST /v1/checkout", start: 0, duration: 5420, status: "error" },
        { service: "checkout-api", name: "CheckoutService.ProcessOrder", start: 12, duration: 5400, status: "error" },
        { service: "payment-service", name: "PaymentService.ChargeAccount", start: 35, duration: 5360, status: "error" },
        { service: "payment-db", name: "pg_query: SELECT FOR UPDATE ON accounts", start: 42, duration: 5001, status: "timeout" },
        { service: "payment-worker", name: "KafkaProducer.PublishRetry", start: 5045, duration: 310, status: "ok" }
      ]
    },
    remediations: [
      { id: "rem-1", rank: "01", title: "Scale Payment DB connection pool limit & terminate idle locks", confidence: 94, reason: "Releases 450+ blocked connection slots held by long transactions", command: "kubectl exec -it payment-db-0 -- psql -c 'SELECT pg_terminate_backend(pid) FROM pg_stat_activity WHERE state = \"idle in transaction\";'", impact: "Immediate reduction in database connection pressure" },
      { id: "rem-2", rank: "02", title: "Temporarily apply rate-limiting & backoff jitter on payment-worker", confidence: 88, reason: "Prevents retry storm from re-saturating DB during recovery", command: "kubectl set env deployment/payment-worker RETRY_JITTER=true MAX_RETRIES=2", impact: "Reduces ingress retry traffic by 85%" },
      { id: "rem-3", rank: "03", title: "Roll back payment-service deployment to v2.8.0", confidence: 76, reason: "Disables synchronous fraud check lock overhead introduced in v2.8.1", command: "helm rollback payment-service 142", impact: "Eliminates row lock contention on account updates" }
    ]
  },
  "INC-3091": {
    id: "INC-3091", title: "Redis Cluster Memory Eviction Failure & Auth Token Degradation", severity: "HIGH", status: "INVESTIGATING", startTime: "2026-09-24 10:15:30 UTC", duration: "42m 10s", owner: "Security / Platform Team (Maya Patel)", affectedServicesCount: 5,
    affectedServices: ["user-session-cache", "auth-service", "api-gateway", "user-profile-service", "notification-service"],
    reductionStats: { rawEvents: 8940, correlatedEvents: 720, anomalies: 19, affectedServices: 5, probableCauses: 2, leadingHypothesis: "user-session-cache maxmemory policy misconfiguration" },
    candidates: [
      { id: "cand-301", rank: "01", service: "user-session-cache", issue: "OOM maxmemory reached with noeviction policy", probability: 91, evidenceCount: 11, firstDetected: "10:14:55", downstreamAffected: 4, anomaliesCount: 9, relationship: "Primary cause of auth token generation rejections", details: { latencyDelta: "+310ms", saturation: "100% RAM allocation (16GB/16GB)", tracePropagation: "Command SETEX returning OOM command not allowed", historicalPattern: "Configuration drift after Helm release v3.1.0" } }
    ],
    nodes: [
      { id: "api-gateway", name: "API Gateway", status: "degraded", role: "IMPACT", metrics: "401 Rate: 18%" },
      { id: "auth-service", name: "Auth Service", status: "critical", role: "PROPAGATION", metrics: "CPU: 98% | Latency: 920ms" },
      { id: "user-session-cache", name: "Redis Session Cache", status: "root_cause", role: "ROOT", metrics: "Mem: 100% | OOM Errors" }
    ],
    edges: [
      { source: "user-session-cache", target: "auth-service", flow: "ROOT -> PROPAGATION", latency: "920ms" },
      { source: "auth-service", target: "api-gateway", flow: "PROPAGATION -> IMPACT", latency: "450ms" }
    ],
    timeline: [
      { id: "evt-301", time: "10:14:55.012", service: "user-session-cache", type: "ANOMALY", summary: "Redis memory used_memory_human reached 16.00G ceiling", details: "maxmemory-policy set to noeviction rejected session write commands." }
    ],
    aiNarrative: `At 10:14:55 UTC, **user-session-cache** reached 100% memory allocation (16GB ceiling). Due to a recent configuration change setting policy to **noeviction**, Redis began rejecting session keys.`,
    cascadingPath: [
      { service: "user-session-cache", label: "ROOT CAUSE", desc: "OOM Memory limit hit (noeviction policy)", type: "ROOT" },
      { service: "auth-service", label: "PROPAGATION", desc: "RSA verification CPU spike (98%)", type: "PROPAGATION" }
    ],
    traceWaterfall: { traceId: "3091-a1b2-c3d4", totalDuration: "980 ms", spans: [{ service: "api-gateway", name: "GET /api/v1/user/me", start: 0, duration: 980, status: "error" }] },
    remediations: [
      { id: "rem-301", rank: "01", title: "Change Redis maxmemory-policy to volatile-lru", confidence: 96, reason: "Allows Redis to safely evict expired session keys under memory pressure", command: "redis-cli -h user-session-cache CONFIG SET maxmemory-policy volatile-lru", impact: "Frees ~3.4GB of expired sessions immediately" }
    ]
  }
};

const ALL_SERVICES_MATRIX = [
  { id: "payment-db", name: "Payment Database", type: "PostgreSQL 15.4", status: "CRITICAL", health: 12, conns: "960/1000", cpu: "94%", latency: "5,200ms", owner: "Data Platform" },
  { id: "checkout-api", name: "Checkout Service", type: "Go Microservice", status: "CRITICAL", health: 24, threads: "200/200", cpu: "88%", latency: "5,450ms", owner: "Checkout Squad" },
  { id: "payment-service", name: "Payment Service", type: "Java Spring Boot", status: "CRITICAL", health: 30, pool: "100/100", cpu: "91%", latency: "5,200ms", owner: "Payment Squad" },
  { id: "payment-worker", name: "Payment Worker", type: "Python Celery", status: "DEGRADED", health: 58, retries: "4.2k/s", cpu: "76%", latency: "210ms", owner: "Payment Squad" },
  { id: "api-gateway", name: "API Gateway", type: "Kong / Envoy", status: "DEGRADED", health: 62, error5xx: "14.2%", cpu: "64%", latency: "1,820ms", owner: "Edge Infra" }
];

const INCIDENT_POSTMORTEMS = [
  { id: "INC-1994", title: "Kafka Consumer Partition Rebalance Deadlock", date: "2026-08-14", duration: "34m", impact: "High", cause: "Rebalance timeout during pod rollout", author: "Alex Chen", status: "RESOLVED" },
  { id: "INC-1488", title: "PostgreSQL Lock Escalation on Account Table", date: "2026-07-04", duration: "52m", impact: "Critical", cause: "Missing index on payment foreign key constraint", author: "Maya Patel", status: "RESOLVED" }
];

// 2. HEADER COMPONENT
class IncidentHeader {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(incident, activeIncidentId, availableIncidents) {
    if (!this.container || !incident) return;
    const isAck = incident.status === "ACKNOWLEDGED";
    const isResolved = incident.status === "RESOLVED";

    this.container.innerHTML = `
      <div class="incident-identity">
        <div class="incident-id-badge">${incident.id}</div>
        <div class="incident-title-block">
          <h1>
            ${incident.title}
            <span class="severity-pill ${incident.severity.toLowerCase()}">${incident.severity}</span>
          </h1>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 3px;">
            <span class="status-dot ${isResolved ? 'lime' : (isAck ? 'amber' : 'red pulse')}"></span> 
            <strong style="color: ${isResolved ? 'var(--status-healthy)' : (isAck ? 'var(--accent-amber)' : 'var(--status-critical)')}">${incident.status}</strong> &nbsp;·&nbsp; 
            Started ${incident.startTime} &nbsp;·&nbsp; 
            <span class="text-amber">${incident.affectedServicesCount} services affected</span>
          </div>
        </div>
      </div>
      <div class="incident-meta-group">
        <div class="meta-metric">
          <span class="label">Incident Switcher</span>
          <select id="incident-select-dropdown" style="background: var(--bg-darkest); color: var(--text-primary); border: 1px solid var(--border-strong); font-family: var(--font-mono); font-size: 11px; padding: 3px 8px; border-radius: 2px; outline: none; cursor: pointer;">
            ${Object.keys(availableIncidents).map(key => `
              <option value="${key}" ${key === activeIncidentId ? 'selected' : ''}>
                ${key} - ${availableIncidents[key].title.substring(0, 26)}...
              </option>
            `).join('')}
          </select>
        </div>
        <div class="meta-metric">
          <span class="label">Active Owner</span>
          <span class="value" style="font-size: 12px;">${incident.owner}</span>
        </div>
        <div class="meta-metric">
          <span class="label">Duration</span>
          <span class="value text-amber">${incident.duration}</span>
        </div>
      </div>
      <div class="incident-actions">
        <button class="btn-tech ${isAck ? 'btn-accent' : ''}" onclick="window.app.handleHeaderAction('ack')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          ${isAck ? '✓ Acknowledged' : 'Acknowledge'}
        </button>
        <button class="btn-tech btn-accent" onclick="window.app.handleHeaderAction('remediate')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          Remediate
        </button>
        <button class="btn-tech btn-success" onclick="window.app.handleHeaderAction('resolve')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          ${isResolved ? '✓ Resolved' : 'Resolve'}
        </button>
      </div>
    `;

    const dropdown = document.getElementById('incident-select-dropdown');
    if (dropdown) {
      dropdown.addEventListener('change', (e) => {
        window.app.handleHeaderAction('switch_incident', e.target.value);
      });
    }
  }
}

// 3. DEPENDENCY MAP
class DependencyMap {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(incidentData, selectedCandidateId) {
    if (!this.container) return;
    const nodes = incidentData.nodes || [];
    const edges = incidentData.edges || [];
    const selectedCandidate = incidentData.candidates.find(c => c.id === selectedCandidateId) || incidentData.candidates[0];
    const nodePositions = this.calculateNodePositions(nodes);

    let svgHtml = `
      <svg id="svg-dependency-map" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
        <defs>
          <marker id="arrow-normal" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#5C6472"/></marker>
          <marker id="arrow-degraded" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#F59E0B"/></marker>
          <marker id="arrow-critical" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse"><path d="M 0 0 L 10 5 L 0 10 z" fill="#EF4444"/></marker>
          <filter id="glow-root" x="-30%" y="-30%" width="160%" height="160%"><feGaussianBlur stdDeviation="6" result="blur"/><feComposite in="SourceGraphic" in2="blur" operator="over"/></filter>
        </defs>
        <g opacity="0.15">
          ${Array.from({length: 8}, (_, i) => `<line x1="${(i+1)*100}" y1="0" x2="${(i+1)*100}" y2="360" stroke="#FFF" stroke-width="0.5" stroke-dasharray="2 4"/>`).join('')}
          ${Array.from({length: 5}, (_, i) => `<line x1="0" y1="${(i+1)*70}" x2="800" y2="${(i+1)*70}" stroke="#FFF" stroke-width="0.5" stroke-dasharray="2 4"/>`).join('')}
        </g>
        <g class="edges-group">
          ${edges.map(edge => {
            const sourcePos = nodePositions[edge.source];
            const targetPos = nodePositions[edge.target];
            if (!sourcePos || !targetPos) return '';
            let edgeColor = '#3A404D';
            let marker = 'url(#arrow-normal)';
            let isPropagation = false;
            if (edge.flow.includes('ROOT') || edge.flow.includes('PROPAGATION')) {
              edgeColor = edge.flow.includes('ROOT') ? '#EF4444' : '#F59E0B';
              marker = edge.flow.includes('ROOT') ? 'url(#arrow-critical)' : 'url(#arrow-degraded)';
              isPropagation = true;
            }
            const isHighlighted = selectedCandidate && (edge.source === selectedCandidate.service || edge.target === selectedCandidate.service);
            return `
              <g class="edge-path-item">
                <line x1="${sourcePos.x}" y1="${sourcePos.y}" x2="${targetPos.x}" y2="${targetPos.y}" stroke="${edgeColor}" stroke-width="${isHighlighted ? '2.5' : (isPropagation ? '1.8' : '1')}" marker-end="${marker}" opacity="${isHighlighted ? '1' : '0.7'}"/>
                ${isPropagation ? `<circle r="3" fill="${edgeColor}"><animateMotion path="M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}" dur="${edge.flow.includes('ROOT') ? '1.2s' : '2.2s'}" repeatCount="indefinite" /></circle>` : ''}
              </g>
            `;
          }).join('')}
        </g>
        <g class="nodes-group">
          ${nodes.map(node => {
            const pos = nodePositions[node.id] || { x: 400, y: 180 };
            const isRoot = node.status === 'root_cause';
            const isDegraded = node.status === 'degraded';
            const isCritical = node.status === 'critical';
            const isSelected = selectedCandidate && selectedCandidate.service === node.id;
            let nodeColor = '#3A404D';
            let borderStroke = '#5C6472';
            let badgeBg = '#1E2330';
            let badgeText = 'HEALTHY';

            if (isRoot) { nodeColor = '#EF4444'; borderStroke = '#EF4444'; badgeBg = 'rgba(239, 68, 68, 0.2)'; badgeText = 'ROOT CAUSE'; }
            else if (isCritical) { nodeColor = '#EF4444'; borderStroke = 'rgba(239, 68, 68, 0.6)'; badgeBg = 'rgba(239, 68, 68, 0.15)'; badgeText = 'CRITICAL'; }
            else if (isDegraded) { nodeColor = '#F59E0B'; borderStroke = 'rgba(245, 158, 11, 0.6)'; badgeBg = 'rgba(245, 158, 11, 0.15)'; badgeText = 'DEGRADED'; }

            return `
              <g class="node-group ${isRoot ? 'node-root-cause' : ''} ${isSelected ? 'node-selected' : ''}" transform="translate(${pos.x}, ${pos.y})" style="cursor: pointer;" onclick="window.app.handleNodeSelect('${node.id}')">
                ${isRoot ? `<circle r="36" fill="none" stroke="#EF4444" stroke-width="1.5" opacity="0.6"><animate attributeName="r" values="30;46;30" dur="2s" repeatCount="indefinite"/><animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/></circle>` : ''}
                ${isSelected ? `<rect x="-70" y="-28" width="140" height="56" fill="none" stroke="#F59E0B" stroke-width="1.5" stroke-dasharray="4 2" rx="3"/>` : ''}
                <rect x="-64" y="-24" width="128" height="48" rx="2" fill="${isSelected ? '#1A1E29' : '#12151C'}" stroke="${borderStroke}" stroke-width="${isRoot || isSelected ? '2' : '1'}" ${isRoot ? 'filter="url(#glow-root)"' : ''}/>
                <rect x="-64" y="-24" width="4" height="48" rx="1" fill="${nodeColor}" />
                <text x="-52" y="-6" fill="#F3F4F6" font-family="ui-monospace, monospace" font-size="11" font-weight="700">${node.name.length > 14 ? node.name.substring(0, 12) + '..' : node.name}</text>
                <text x="-52" y="12" fill="${isRoot ? '#EF4444' : (isDegraded ? '#F59E0B' : '#9CA3AF')}" font-family="ui-monospace, monospace" font-size="9">${node.role || badgeText}</text>
                <g transform="translate(24, 10)">
                  <rect x="-14" y="-8" width="28" height="12" rx="1" fill="${badgeBg}" />
                  <circle cx="-8" cy="-2" r="2" fill="${nodeColor}"/>
                  <text x="-3" y="1" fill="${nodeColor}" font-family="ui-monospace, monospace" font-size="7" font-weight="700">${isRoot ? 'RC' : (isCritical ? 'ERR' : (isDegraded ? 'WARN' : 'OK'))}</text>
                </g>
              </g>
            `;
          }).join('')}
        </g>
      </svg>
    `;
    this.container.innerHTML = svgHtml;
  }
  calculateNodePositions(nodes) {
    const positions = {
      "payment-db": { x: 120, y: 180 }, "payment-worker": { x: 120, y: 300 }, "kafka-event-bus": { x: 280, y: 300 },
      "payment-service": { x: 300, y: 180 }, "inventory-service": { x: 300, y: 60 }, "checkout-api": { x: 480, y: 180 },
      "auth-service": { x: 480, y: 60 }, "api-gateway": { x: 680, y: 180 }, "notification-service": { x: 680, y: 300 },
      "user-session-cache": { x: 140, y: 180 }, "user-profile-service": { x: 500, y: 280 }, "search-index": { x: 520, y: 320 }
    };
    let currentX = 150;
    nodes.forEach(node => { if (!positions[node.id]) { positions[node.id] = { x: currentX, y: 180 }; currentX += 140; } });
    return positions;
  }
}

// 4. ROOT CAUSE RAIL
class RootCauseRail {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(candidates, selectedCandidateId) {
    if (!this.container || !candidates) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
          Root Cause Confidence Rail
          <span style="color: var(--text-muted); font-weight: normal; margin-left: 8px;">(${candidates.length} Correlated Candidates)</span>
        </div>
        <div class="panel-actions"><span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">SORT BY: CONFIDENCE SCORE</span></div>
      </div>
      <div class="candidates-rail-grid">
        ${candidates.map(cand => {
          const isSelected = cand.id === selectedCandidateId;
          const isTopRank = cand.rank === "01";
          return `
            <div class="candidate-card ${isSelected ? 'selected' : ''}" onclick="window.app.selectCandidate('${cand.id}')">
              <div class="candidate-rank-header">
                <span class="candidate-rank">${cand.rank} CANDIDATE</span>
                <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: ${isTopRank ? 'var(--status-critical)' : 'var(--accent-amber)'};">${cand.probability}% PROBABILITY</span>
              </div>
              <div class="candidate-name">
                <span class="font-mono text-amber">${cand.service}</span>
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: normal; margin-top: 2px;">${cand.issue}</div>
              </div>
              <div class="confidence-bar-wrapper">
                <div class="confidence-label-row"><span>CONFIDENCE MATRIX</span><span>${cand.evidenceCount} EVIDENCE SIGNALS</span></div>
                <div class="confidence-track"><div class="confidence-fill" style="width: ${cand.probability}%; ${isTopRank ? 'background: linear-gradient(90deg, var(--accent-amber), var(--status-critical));' : 'background: var(--accent-amber);'}"></div></div>
              </div>
              <div class="candidate-metrics-row">
                <div><span style="color: var(--text-muted);">1st Detected:</span> <span style="color: var(--text-primary);">${cand.firstDetected}</span></div>
                <div><span style="color: var(--text-muted);">Reach:</span> <span class="text-amber">${cand.downstreamAffected} Services</span></div>
                <div><span style="color: var(--text-muted);">Anomalies:</span> <span style="color: var(--text-primary);">${cand.anomaliesCount}</span></div>
              </div>
              <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 6px;"><span style="color: var(--accent-amber);">➔</span> ${cand.relationship}</div>
            </div>
          `;
        }).join('')}
      </div>
    `;
  }
}

// 5. REDUCTION FUNNEL
class ReductionFunnel {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(stats) {
    if (!this.container || !stats) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Signal Noise Reduction Pipeline
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">COMPRESSION RATIO: <span class="text-lime" style="font-weight: 700;">99.98% NOISE FILTERED</span></div>
      </div>
      <div class="reduction-funnel-panel">
        <div class="reduction-funnel-container">
          <div class="funnel-step"><div class="count">${stats.rawEvents.toLocaleString()}</div><div class="step-title">Raw Events Ingested</div></div>
          <div class="funnel-arrow">➔</div>
          <div class="funnel-step"><div class="count text-cyan">${stats.correlatedEvents.toLocaleString()}</div><div class="step-title">Correlated Signals</div></div>
          <div class="funnel-arrow">➔</div>
          <div class="funnel-step"><div class="count text-amber">${stats.anomalies}</div><div class="step-title">Anomalies Detected</div></div>
          <div class="funnel-arrow">➔</div>
          <div class="funnel-step"><div class="count text-amber">${stats.affectedServices}</div><div class="step-title">Affected Services</div></div>
          <div class="funnel-arrow">➔</div>
          <div class="funnel-step" style="border-color: var(--status-critical); background: rgba(239, 68, 68, 0.08);"><div class="count text-critical" style="font-size: 13px;">${stats.leadingHypothesis}</div><div class="step-title" style="color: var(--status-critical);">Primary Root Cause</div></div>
        </div>
      </div>
    `;
  }
}

// 6. TIMELINE
class Timeline {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.activeFilter = "ALL";
    this.correlationWindow = "5m";
  }
  render(events, correlationWindow) {
    if (!this.container || !events) return;
    this.correlationWindow = correlationWindow || "5m";
    const filteredEvents = events.filter(evt => this.activeFilter === "ALL" || evt.type === this.activeFilter);
    const eventTypes = ["ALL", "ALERT", "ANOMALY", "LOG", "METRIC", "TRACE", "DEPLOYMENT"];
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Chronological Forensic Timeline
          <span style="color: var(--text-muted); font-size: 10px; margin-left: 8px;">(Correlation Window: ${this.correlationWindow})</span>
        </div>
        <div class="panel-actions" style="gap: 4px;">
          ${eventTypes.map(t => `
            <button class="window-chip ${this.activeFilter === t ? 'active' : ''}" style="padding: 2px 6px; font-size: 9px;" onclick="window.app.setTimelineFilter('${t}')">${t}</button>
          `).join('')}
        </div>
      </div>
      <div class="timeline-container">
        <div class="timeline-list">
          ${filteredEvents.length === 0 ? `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono);">No correlated timeline events match filter [${this.activeFilter}]</div>` : filteredEvents.map(evt => `
            <div class="timeline-event-row type-${evt.type}" onclick="window.app.handleTimelineEventSelect('${evt.id}')">
              <span class="event-time">${evt.time}</span>
              <span class="event-badge ${evt.type}">${evt.type}</span>
              <span class="event-msg"><strong style="color: var(--accent-amber); margin-right: 6px;">[${evt.service}]</strong> ${evt.summary}</span>
              <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" style="color: var(--text-muted);"><polyline points="9 18 15 12 9 6"></polyline></svg>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }
  setFilter(filterType) {
    this.activeFilter = filterType;
    if (window.app && window.app.activeIncident) {
      this.render(window.app.activeIncident.timeline, this.correlationWindow);
    }
  }
}

// 7. AI EXPLANATION
class AIExplanation {
  constructor(containerId) { this.container = document.getElementById(containerId); this.isRegenerating = false; }
  render(narrativeText, candidate) {
    if (!this.container) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"></path></svg>
          AI Root Cause Narrative
        </div>
        <div class="panel-actions">
          <button class="btn-tech" style="padding: 3px 8px; font-size: 10px;" onclick="window.app.regenerateAI()">
            <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="23 4 23 10 17 10"></polyline><path d="M20.49 15a9 9 0 1 1-2.12-9.36L23 10"></path></svg>
            ${this.isRegenerating ? 'Analyzing...' : 'Regenerate'}
          </button>
        </div>
      </div>
      <div style="padding: 14px;">
        <div class="ai-narrative-box">
          <div class="ai-narrative-header">
            <span class="ai-spark-tag"><span class="status-dot lime pulse"></span> SYNTHESIZED INCIDENT CAUSALITY</span>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">CONFIDENCE: 94%</span>
          </div>
          <div id="ai-narrative-content-body" style="font-family: var(--font-sans); color: var(--text-primary);">${narrativeText}</div>
          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border-subtle);">
            <button class="btn-tech" style="padding: 4px 10px; font-size: 10px;" onclick="window.app.copyAISummary()">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Incident Summary
            </button>
            <button class="btn-tech btn-accent" style="padding: 4px 10px; font-size: 10px;" onclick="window.app.scrollToEvidence()">View Supporting Evidence ➔</button>
          </div>
        </div>
      </div>
    `;
  }
  regenerate() {
    this.isRegenerating = true;
    const bodyElem = document.getElementById("ai-narrative-content-body");
    if (bodyElem) bodyElem.innerHTML = `<span class="font-mono text-amber" style="animation: pulse-dot 1s infinite;">Re-evaluating cross-service traces, metrics correlation window, and lock trees...</span>`;
    setTimeout(() => {
      this.isRegenerating = false;
      if (window.app && window.app.activeIncident) {
        const selectedCand = window.app.activeIncident.candidates.find(c => c.id === window.app.selectedCandidateId);
        this.render(window.app.activeIncident.aiNarrative, selectedCand);
        window.app.showToast("AI Narrative Synthesized", "Fresh correlation tree updated with 3-sigma confidence.", "info");
      }
    }, 1000);
  }
  copySummary() {
    if (window.app && window.app.activeIncident) {
      navigator.clipboard.writeText(window.app.activeIncident.aiNarrative);
      window.app.showToast("Summary Copied", "Incident causality narrative copied to clipboard!", "success");
    }
  }
}

// 8. CASCADING FAILURE
class CascadingFailure {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(cascadingPath) {
    if (!this.container || !cascadingPath) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Cascading Failure Vector Path
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--status-critical);">PROPAGATION SPEED: ~26s</div>
      </div>
      <div style="padding: 14px;">
        <div class="cascading-chain">
          ${cascadingPath.map((step, idx) => `
            <div class="cascade-node-row ${step.type === 'ROOT' ? 'root' : ''}">
              <span class="cascade-type-badge ${step.type}">${step.type}</span>
              <div style="flex: 1;">
                <span class="font-mono" style="font-weight: 700; color: ${step.type === 'ROOT' ? 'var(--status-critical)' : 'var(--text-primary)'}">${step.service}</span>
                <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 1px;">${step.desc}</div>
              </div>
            </div>
            ${idx < cascadingPath.length - 1 ? `<div class="cascade-connector"><svg width="12" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><line x1="12" y1="0" x2="12" y2="24"></line><polyline points="6 18 12 24 18 18"></polyline></svg></div>` : ''}
          `).join('')}
        </div>
      </div>
    `;
  }
}

// 9. EVIDENCE PANEL
class EvidencePanel {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(candidate, traceWaterfall) {
    if (!this.container || !candidate) return;
    const details = candidate.details || {};
    this.container.innerHTML = `
      <div class="panel-header" id="evidence-panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline></svg>
          Contextual Evidence Inspector
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber);">${candidate.service} [${candidate.probability}% CONFIDENCE]</div>
      </div>
      <div style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
        <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
          <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">🔍 WHY IS THIS CANDIDATE SUSPECTED?</div>
          <ul style="list-style: none; font-size: 11px; line-height: 1.6; color: var(--text-secondary);">
            <li style="margin-bottom: 4px;"><span style="color: var(--status-critical);">•</span> <strong>Latency Spike:</strong> ${details.latencyDelta || 'N/A'}</li>
            <li style="margin-bottom: 4px;"><span style="color: var(--status-critical);">•</span> <strong>Capacity Limit:</strong> ${details.saturation || 'N/A'}</li>
            <li style="margin-bottom: 4px;"><span style="color: var(--status-critical);">•</span> <strong>Trace Analysis:</strong> ${details.tracePropagation || 'N/A'}</li>
            <li><span style="color: var(--accent-amber);">•</span> <strong>Historical Correlation:</strong> ${details.historicalPattern || 'N/A'}</li>
          </ul>
        </div>
        ${traceWaterfall ? `
          <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-primary);">⚡ DISTRIBUTED TRACE WATERFALL (#${traceWaterfall.traceId})</span>
              <span class="font-mono text-amber" style="font-size: 10px;">Total: ${traceWaterfall.totalDuration}</span>
            </div>
            <div style="display: flex; flex-direction: column; gap: 6px;">
              ${traceWaterfall.spans.map(span => {
                const widthPct = Math.max(15, Math.min(100, (span.duration / 5420) * 100));
                const leftPct = (span.start / 5420) * 100;
                const isErr = span.status === 'error' || span.status === 'timeout';
                return `
                  <div style="font-family: var(--font-mono); font-size: 10px;">
                    <div style="display: flex; justify-content: space-between; color: var(--text-muted); margin-bottom: 2px;">
                      <span>${span.service} ➔ ${span.name}</span>
                      <span style="color: ${isErr ? 'var(--status-critical)' : 'var(--status-healthy)'}">${span.duration}ms (${span.status})</span>
                    </div>
                    <div style="width: 100%; height: 16px; background: rgba(255,255,255,0.04); position: relative; border-radius: 2px;">
                      <div style="position: absolute; left: ${leftPct}%; width: ${widthPct}%; height: 100%; background: ${isErr ? 'rgba(239, 68, 68, 0.3)' : 'rgba(16, 185, 129, 0.3)'}; border: 1px solid ${isErr ? 'var(--status-critical)' : 'var(--accent-lime)'}; border-radius: 2px;"></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}
        <div style="background: #08090C; border: 1px solid var(--border-subtle); padding: 10px; border-radius: 2px; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary);">
          <div style="color: var(--text-muted); margin-bottom: 4px; display: flex; justify-content: space-between;"><span>RAW FORENSIC TELEMETRY EXTRACT</span><span style="color: var(--status-critical);">STDERR / SYSLOG</span></div>
          <pre style="white-space: pre-wrap; word-break: break-all; color: var(--status-critical); line-height: 1.4;">[2026-09-24 14:31:54.450] ERROR [payment-service] db_pool.go:142: acquire connection timeout\n  goroutine 4821 [running]:\n  github.com/cortex/payment/db.(*Pool).Acquire()\n  context deadline exceeded (Client.Timeout exceeded while awaiting headers)</pre>
        </div>
      </div>
    `;
  }
}

// 10. REMEDIATION PANEL
class RemediationPanel {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  render(remediations) {
    if (!this.container || !remediations) return;
    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          Recommended Mitigation Actions
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-lime);">PREDICTED RECOVERY: 98%</div>
      </div>
      <div style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        ${remediations.map(rem => `
          <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span class="font-mono text-amber" style="font-weight: 700; font-size: 11px;">${rem.rank} — ${rem.title}</span>
              <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-lime); font-weight: 700;">${rem.confidence}% CONFIDENCE</span>
            </div>
            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;"><strong>Rationale:</strong> ${rem.reason}</div>
            ${rem.command ? `<div style="background: #08090B; border: 1px stroke var(--border-subtle); padding: 6px 8px; font-family: var(--font-mono); font-size: 10px; color: var(--text-primary); margin-bottom: 8px; border-radius: 2px;"><span style="color: var(--accent-amber);">$</span> ${rem.command}</div>` : ''}
            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px dashed var(--border-subtle);">
              <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted);">Expected: ${rem.impact}</span>
              <button class="btn-tech btn-accent" style="padding: 3px 8px; font-size: 10px;" onclick="window.app.triggerRemediationTask('${rem.id}', '${rem.title.replace(/'/g, "\\'")}')">Execute Mitigation ➔</button>
            </div>
          </div>
        `).join('')}
      </div>
    `;
  }
}

// 11. RESOLUTION MODAL
class ResolutionModal {
  constructor(containerId) { this.container = document.getElementById(containerId); }
  open(incident, mode = 'resolve') {
    if (!this.container || !incident) return;
    const isResolve = mode === 'resolve';
    this.container.innerHTML = `
      <div class="modal-overlay active" id="res-modal-overlay">
        <div class="modal-card" style="width: 680px;">
          <div class="modal-header">
            <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <span class="status-dot ${isResolve ? 'lime' : 'amber'}"></span>
              ${isResolve ? 'RESOLVE INCIDENT & PUBLISH POST-MORTEM' : 'DISPATCH AUTOMATED MITIGATION PIPELINE'}
            </div>
            <button class="btn-tech" style="padding: 2px 6px;" onclick="window.app.closeResolutionModal()">✕</button>
          </div>
          <div class="modal-body" id="resolution-modal-body-content">
            ${isResolve ? `
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">Confirm root cause verification and publish official post-mortem report for <strong class="text-amber">${incident.id}</strong>.</div>
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">CONFIRMED ROOT CAUSE SERVICE</label>
                <select id="modal-confirmed-root-cause" style="width: 100%; background: var(--bg-darkest); color: var(--text-primary); border: 1px solid var(--border-strong); font-family: var(--font-mono); padding: 8px; border-radius: 2px;">
                  ${incident.candidates.map(c => `<option value="${c.service}">${c.service} - ${c.issue} (${c.probability}% probability)</option>`).join('')}
                </select>
              </div>
              <div style="margin-bottom: 14px;">
                <label style="display: block; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">INVESTIGATION & RESOLUTION SUMMARY</label>
                <textarea id="modal-resolution-notes" rows="5" style="width: 100%; background: var(--bg-darkest); color: var(--text-primary); border: 1px solid var(--border-strong); font-family: var(--font-mono); font-size: 11px; padding: 8px; border-radius: 2px;">${incident.aiNarrative}</textarea>
              </div>
            ` : `
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 12px;">Executing automated mitigation task against Kubernetes cluster:</div>
              <div style="background: #08090B; border: 1px solid var(--border-amber); padding: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); border-radius: 2px; height: 180px; overflow-y: auto;" id="terminal-exec-output">
                <div style="color: var(--accent-amber);">$ kubectl apply -f mitigation-policy.yaml</div>
                <div style="color: var(--text-muted);">[1/3] Terminating 450+ blocked db locks... <span class="text-lime">SUCCESS</span></div>
                <div style="color: var(--text-muted);">[2/3] Scaling max_connections parameter to 1500... <span class="text-lime">IN_PROGRESS</span></div>
              </div>
            `}
          </div>
          <div class="modal-footer" id="resolution-modal-footer">
            <button class="btn-tech" onclick="window.app.closeResolutionModal()">Cancel</button>
            <button class="btn-tech btn-accent" onclick="window.app.confirmResolution('${mode}')">${isResolve ? 'Confirm & Publish Post-Mortem' : 'Execute Task Now'}</button>
          </div>
        </div>
      </div>
    `;

    if (mode === 'remediate') {
      this.runLiveTerminalExecution();
    }
  }

  runLiveTerminalExecution() {
    const term = document.getElementById("terminal-exec-output");
    if (!term) return;
    setTimeout(() => {
      term.innerHTML += `<div style="color: var(--text-muted);">[2/3] Scaling max_connections parameter to 1500... <span class="text-lime">SUCCESS</span></div>`;
    }, 800);
    setTimeout(() => {
      term.innerHTML += `<div style="color: var(--text-muted);">[3/3] Restoring connection pool throughput... <span class="text-lime">COMPLETE</span></div>`;
      term.innerHTML += `<div style="color: var(--accent-lime); margin-top: 8px; font-weight: 700;">✓ MITIGATION COMPLETED. SQLITE DATABASE PERSISTED.</div>`;
    }, 1600);
  }

  close() { const overlay = document.getElementById("res-modal-overlay"); if (overlay) overlay.classList.remove("active"); }

  confirm(mode) {
    if (mode === 'resolve') {
      if (window.app && window.app.activeIncident) {
        window.app.activeIncident.status = "RESOLVED";
        window.app.activeIncident.duration += " (RESOLVED)";
        
        // Execute Real API POST to Python + SQLite
        fetch('/api/resolve', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ incidentId: window.app.activeIncidentId, notes: "Root cause verified and patched." })
        }).then(res => res.json()).then(data => {
          if (data.dbUpdated) {
            window.app.showToast("DATABASE MUTATED (SQLite)", `SQL UPDATE committed to cortex_forensics.db: status='RESOLVED'`, "success");
          }
        }).catch(() => {});

        window.app.refreshUI();
      }
    } else {
      fetch('/api/remediate', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: window.app.activeIncidentId, taskTitle: "Scale DB pool capacity" })
      }).then(res => res.json()).then(data => {
        if (data.dbUpdated) {
          window.app.showToast("DATABASE MUTATED (SQLite)", `SQL INSERT INTO remediation_tasks committed to cortex_forensics.db`, "success");
        }
      }).catch(() => {});

      if (window.app && window.app.activeIncident) {
        window.app.activeIncident.nodes.forEach(n => { if (n.id === 'payment-db') n.status = 'degraded'; });
        window.app.refreshUI();
      }
    }
    this.close();
  }
}

// 12. COMMAND PALETTE
class CommandPalette {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isOpen = false;
    this.commands = [
      { id: '/ack', label: '/acknowledge', desc: 'Acknowledge active incident & mutate SQLite DB', icon: '⚡', category: 'ACTION' },
      { id: '/resolve', label: '/resolve', desc: 'Open resolution workflow & commit SQL post-mortem', icon: '✅', category: 'ACTION' },
      { id: '/remediate', label: '/remediate', desc: 'Dispatch automated Kubernetes mitigation & update SQL', icon: '🛠️', category: 'ACTION' },
      { id: '/window-30s', label: '/correlation-window 30s', desc: 'Set event correlation window to 30 seconds', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-1m', label: '/correlation-window 1m', desc: 'Set event correlation window to 1 minute', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-5m', label: '/correlation-window 5m', desc: 'Set event correlation window to 5 minutes', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-15m', label: '/correlation-window 15m', desc: 'Set event correlation window to 15 minutes', icon: '⏱️', category: 'WINDOW' },
      { id: '/inspect-payment-db', label: '/inspect payment-db', desc: 'Inspect payment-db connection locks & traces', icon: '🎯', category: 'SERVICE' },
      { id: '/export-brief', label: '/export-brief', desc: 'Copy executive incident brief to clipboard', icon: '📄', category: 'EXPORT' }
    ];
    this.currentFiltered = [...this.commands];
    this.initKeyboardListener();
  }
  initKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);
      if (isCmdK || isSlash) {
        e.preventDefault(); e.stopPropagation(); this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) { this.close(); }
    }, true);
  }
  toggle() { if (this.isOpen) this.close(); else this.open(); }
  open() {
    if (!this.container) return;
    this.isOpen = true;
    this.currentFiltered = [...this.commands];
    this.renderModal(this.currentFiltered);
    setTimeout(() => {
      const input = document.getElementById("cmd-palette-input");
      if (input) {
        input.value = ""; input.focus();
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && this.currentFiltered.length > 0) {
            e.preventDefault(); this.exec(this.currentFiltered[0].id);
          }
        });
      }
    }, 50);
  }
  close() { this.isOpen = false; const overlay = document.getElementById("cmd-palette-overlay"); if (overlay) overlay.classList.remove("active"); }
  renderModal(cmdList) {
    this.container.innerHTML = `
      <div class="modal-overlay active" id="cmd-palette-overlay" onclick="if(event.target.id==='cmd-palette-overlay') window.app.closeCmdPalette()">
        <div class="cmd-palette-box" onclick="event.stopPropagation()">
          <div class="cmd-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input type="text" class="cmd-input" id="cmd-palette-input" placeholder="Search actions, services, or correlation filters... (e.g. /resolve, payment-db, 15m)" oninput="window.app.cmdPalette.handleSearch(this.value)"/>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); padding: 2px 6px; background: var(--bg-panel); border-radius: 2px;">ESC to close</span>
          </div>
          <div class="cmd-list" id="cmd-palette-list">${this.renderListItems(cmdList)}</div>
        </div>
      </div>
    `;
  }
  renderListItems(cmdList) {
    if (!cmdList || cmdList.length === 0) return `<div style="padding: 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px;">No matching forensic commands found.</div>`;
    return cmdList.map((c, idx) => `
      <div class="cmd-item ${idx === 0 ? 'selected' : ''}" onclick="window.app.execCmd('${c.id}')">
        <span>${c.icon} <strong>${c.label}</strong> — ${c.desc}</span>
        <span class="font-mono text-muted" style="font-size: 9px; padding: 1px 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">${c.category}</span>
      </div>
    `).join('');
  }
  handleSearch(query) {
    const listElem = document.getElementById("cmd-palette-list");
    if (!listElem) return;
    const q = (query || "").toLowerCase().trim();
    if (!q) { this.currentFiltered = [...this.commands]; listElem.innerHTML = this.renderListItems(this.currentFiltered); return; }
    this.currentFiltered = this.commands.filter(c => c.label.toLowerCase().includes(q) || c.desc.toLowerCase().includes(q) || c.id.toLowerCase().includes(q) || c.category.toLowerCase().includes(q));
    listElem.innerHTML = this.renderListItems(this.currentFiltered);
  }
  exec(cmdId) {
    this.close();
    if (cmdId === '/ack') window.app.handleHeaderAction('ack');
    else if (cmdId === '/resolve') window.app.handleHeaderAction('resolve');
    else if (cmdId === '/remediate') window.app.handleHeaderAction('remediate');
    else if (cmdId.startsWith('/window-')) {
      const windowVal = cmdId.replace('/window-', '');
      window.app.setCorrelationWindow(windowVal === '30s' ? '30 sec' : (windowVal === '1m' ? '1 min' : (windowVal === '5m' ? '5 min' : '15 min')));
    }
    else if (cmdId === '/inspect-payment-db') window.app.selectCandidate('cand-1');
    else if (cmdId === '/export-brief') window.app.copyAISummary();
  }
}

// 13. MAIN ORCHESTRATOR
class CortexApp {
  constructor() {
    this.incidents = INCIDENTS_DATA;
    this.activeIncidentId = "INC-2048";
    this.activeIncident = this.incidents[this.activeIncidentId];
    this.selectedCandidateId = "cand-1";
    this.correlationWindow = "5m";
    this.activeTab = "INVESTIGATE";

    this.header = new IncidentHeader("app-header");
    this.dependencyMap = new DependencyMap("dependency-map-container");
    this.rootCauseRail = new RootCauseRail("root-cause-rail-container");
    this.reductionFunnel = new ReductionFunnel("reduction-funnel-container");
    this.timeline = new Timeline("timeline-container");
    this.aiExplanation = new AIExplanation("ai-explanation-container");
    this.cascadingFailure = new CascadingFailure("cascading-failure-container");
    this.evidencePanel = new EvidencePanel("evidence-panel-container");
    this.remediationPanel = new RemediationPanel("remediation-panel-container");
    this.resolutionModal = new ResolutionModal("modal-root");
    this.cmdPalette = new CommandPalette("cmd-palette-root");

    this.initToastSystem();
  }

  initToastSystem() {
    let container = document.getElementById("cortex-toast-container");
    if (!container) {
      container = document.createElement("div");
      container.id = "cortex-toast-container";
      container.style.cssText = "position: fixed; top: 60px; right: 20px; z-index: 100000; display: flex; flex-direction: column; gap: 8px; pointer-events: none;";
      document.body.appendChild(container);
    }
  }

  showToast(title, message, type = "info") {
    const container = document.getElementById("cortex-toast-container");
    if (!container) return;

    const toast = document.createElement("div");
    let borderColor = "var(--accent-amber)";
    let icon = "⚡";
    if (type === "success") { borderColor = "var(--status-healthy)"; icon = "✓"; }
    else if (type === "critical") { borderColor = "var(--status-critical)"; icon = "⚠"; }

    toast.style.cssText = `
      background: #14171E; border: 1px solid ${borderColor}; border-left: 4px solid ${borderColor};
      padding: 10px 14px; border-radius: 2px; font-family: var(--font-mono); font-size: 11px;
      color: #F3F4F6; box-shadow: 0 4px 15px rgba(0,0,0,0.6); pointer-events: auto; min-width: 300px;
      animation: fadeIn 0.2s ease;
    `;

    toast.innerHTML = `
      <div style="font-weight: 700; color: ${borderColor}; display: flex; align-items: center; justify-content: space-between;">
        <span>${icon} ${title.toUpperCase()}</span>
        <span style="font-size: 9px; opacity: 0.6;">SQLITE DB</span>
      </div>
      <div style="margin-top: 3px; color: var(--text-secondary); font-size: 10px;">${message}</div>
    `;

    container.appendChild(toast);
    setTimeout(() => {
      toast.style.opacity = "0";
      toast.style.transition = "opacity 0.3s ease";
      setTimeout(() => toast.remove(), 300);
    }, 3500);
  }

  init() {
    this.refreshUI();
    this.startLiveTelemetrySimulation();
    this.fetchDbStatus();
  }

  fetchDbStatus() {
    fetch('/api/db-status')
      .then(res => res.json())
      .then(data => {
        const badge = document.getElementById("sqlite-db-status-badge");
        if (badge) {
          badge.innerText = `SQLite DB: ONLINE (${data.audit_logs_count} SQL logs)`;
        }
      }).catch(() => {});
  }

  refreshUI() {
    this.activeIncident = this.incidents[this.activeIncidentId];
    if (!this.activeIncident) return;
    const selectedCand = this.activeIncident.candidates.find(c => c.id === this.selectedCandidateId) || this.activeIncident.candidates[0];

    this.header.render(this.activeIncident, this.activeIncidentId, this.incidents);

    if (this.activeTab === "INVESTIGATE") {
      this.renderInvestigateStage(selectedCand);
    } else if (this.activeTab === "SERVICES") {
      this.renderServicesMatrixStage();
    } else if (this.activeTab === "EVENT STREAM") {
      this.renderEventStreamStage();
    } else if (this.activeTab === "HISTORY") {
      this.renderHistoryArchiveStage();
    }
  }

  renderInvestigateStage(selectedCand) {
    const leftStage = document.querySelector(".workspace-left-stage");
    if (!leftStage) return;

    leftStage.innerHTML = `
      <div id="root-cause-rail-container" class="forensic-panel"></div>
      <div class="forensic-panel">
        <div class="panel-header">
          <div class="panel-title">
            <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="18" cy="5" r="3"></circle><circle cx="6" cy="12" r="3"></circle><circle cx="18" cy="19" r="3"></circle><line x1="8.59" y1="13.51" x2="15.42" y2="17.49"></line><line x1="15.41" y1="6.51" x2="8.59" y2="10.49"></line></svg>
            Interactive Service Causality Map
            <span style="color: var(--text-muted); font-size: 10px; margin-left: 8px;">(Click node to inspect telemetry)</span>
          </div>
          <div class="panel-actions font-mono" style="font-size: 10px; color: var(--text-muted);">FLOW: ROOT ➔ PROPAGATION ➔ IMPACT</div>
        </div>
        <div id="dependency-map-container" class="graph-stage-container"></div>
        <div class="graph-legend">
          <div class="legend-item"><span class="status-dot red pulse"></span> Root Cause Candidate</div>
          <div class="legend-item"><span class="status-dot amber"></span> Degraded Service</div>
          <div class="legend-item"><span class="status-dot" style="background:#5C6472;"></span> Healthy Service</div>
          <div class="legend-item" style="color: var(--accent-amber);">➔ Directed Telemetry Vector</div>
        </div>
      </div>
      <div id="reduction-funnel-container" class="forensic-panel"></div>
      <div id="timeline-container" class="forensic-panel"></div>
    `;

    this.dependencyMap.container = document.getElementById("dependency-map-container");
    this.rootCauseRail.container = document.getElementById("root-cause-rail-container");
    this.reductionFunnel.container = document.getElementById("reduction-funnel-container");
    this.timeline.container = document.getElementById("timeline-container");

    this.dependencyMap.render(this.activeIncident, this.selectedCandidateId);
    this.rootCauseRail.render(this.activeIncident.candidates, this.selectedCandidateId);
    this.reductionFunnel.render(this.activeIncident.reductionStats);
    this.timeline.render(this.activeIncident.timeline, this.correlationWindow);
    this.aiExplanation.render(this.activeIncident.aiNarrative, selectedCand);
    this.cascadingFailure.render(this.activeIncident.cascadingPath);
    this.evidencePanel.render(selectedCand, this.activeIncident.traceWaterfall);
    this.remediationPanel.render(this.activeIncident.remediations);
  }

  renderServicesMatrixStage() {
    const leftStage = document.querySelector(".workspace-left-stage");
    if (!leftStage) return;

    leftStage.innerHTML = `
      <div class="forensic-panel" style="padding: 16px;">
        <div class="panel-header" style="margin-bottom: 14px; background: transparent; padding: 0;">
          <div class="panel-title" style="font-size: 12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><rect x="2" y="2" width="20" height="8" rx="2" ry="2"></rect><rect x="2" y="14" width="20" height="8" rx="2" ry="2"></rect></svg>
            SERVICE MESH HEALTH MATRIX (15 MICROSERVICES)
          </div>
          <span class="font-mono text-lime" style="font-size: 10px;">SQLITE DB SYNCED</span>
        </div>

        <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(240px, 1fr)); gap: 12px;">
          ${ALL_SERVICES_MATRIX.map(s => {
            const isCrit = s.status === 'CRITICAL';
            const isDeg = s.status === 'DEGRADED';
            const statusColor = isCrit ? 'var(--status-critical)' : (isDeg ? 'var(--accent-amber)' : 'var(--status-healthy)');

            return `
              <div style="background: var(--bg-dark); border: 1px solid var(--border-subtle); border-left: 3px solid ${statusColor}; padding: 12px; border-radius: 2px;">
                <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                  <span class="font-mono" style="font-weight: 700; color: var(--text-primary);">${s.name}</span>
                  <span class="font-mono" style="font-size: 9px; font-weight: 700; color: ${statusColor}; background: rgba(255,255,255,0.05); padding: 2px 5px; border-radius: 2px;">${s.status}</span>
                </div>
                <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); margin-bottom: 8px;">${s.type} &nbsp;·&nbsp; Owner: ${s.owner}</div>
                <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary); padding-top: 6px; border-top: 1px stroke var(--border-subtle);">
                  <span>CPU: ${s.cpu}</span>
                  <span>Latency: ${s.latency}</span>
                  <span class="text-amber">${s.conns || s.threads || s.rps || 'OK'}</span>
                </div>
              </div>
            `;
          }).join('')}
        </div>
      </div>
    `;
  }

  renderEventStreamStage() {
    const leftStage = document.querySelector(".workspace-left-stage");
    if (!leftStage) return;

    leftStage.innerHTML = `
      <div class="forensic-panel" style="padding: 16px;">
        <div class="panel-header" style="margin-bottom: 12px; background: transparent; padding: 0;">
          <div class="panel-title" style="font-size: 12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-cyan)" stroke-width="2"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"></polyline></svg>
            LIVE TELEMETRY INGEST STREAM (REAL-TIME LOGS & METRICS)
          </div>
          <span class="font-mono text-cyan" style="font-size: 10px;">RATE: 12,480 ev/s</span>
        </div>

        <div style="background: #060709; border: 1px solid var(--border-subtle); padding: 12px; font-family: var(--font-mono); font-size: 11px; max-height: 480px; overflow-y: auto;">
          <div style="color: var(--text-muted); margin-bottom: 8px; display: flex; justify-content: space-between; border-bottom: 1px stroke var(--border-subtle); padding-bottom: 4px;">
            <span>TIMESTAMP / HOST</span>
            <span>LEVEL / LOG MESSAGE</span>
          </div>
          <div id="live-stream-log-rows">
            <div style="color: var(--status-critical); margin-bottom: 4px;">[14:35:01.204] payment-db :: [ERROR] pgx pool limit reached 960/1000 active connections</div>
            <div style="color: var(--accent-amber); margin-bottom: 4px;">[14:35:01.180] checkout-api :: [WARN] thread pool saturation 98% (196/200 worker threads)</div>
            <div style="color: var(--accent-cyan); margin-bottom: 4px;">[14:35:01.112] api-gateway :: [INFO] GET /v1/checkout HTTP 504 duration=60000ms</div>
          </div>
        </div>
      </div>
    `;
  }

  renderHistoryArchiveStage() {
    const leftStage = document.querySelector(".workspace-left-stage");
    if (!leftStage) return;

    leftStage.innerHTML = `
      <div class="forensic-panel" style="padding: 16px;">
        <div class="panel-header" style="margin-bottom: 14px; background: transparent; padding: 0;">
          <div class="panel-title" style="font-size: 12px;">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="var(--accent-lime)" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
            HISTORICAL POST-MORTEM ARCHIVE
          </div>
          <span class="font-mono text-lime" style="font-size: 10px;">SQLITE PERSISTED ARCHIVE</span>
        </div>

        <div style="display: flex; flex-direction: column; gap: 10px;">
          ${INCIDENT_POSTMORTEMS.map(p => `
            <div style="background: var(--bg-dark); border: 1px solid var(--border-subtle); padding: 14px; border-radius: 2px;">
              <div style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 6px;">
                <span class="font-mono text-amber" style="font-weight: 700; font-size: 12px;">${p.id} — ${p.title}</span>
                <span class="font-mono text-lime" style="font-size: 10px;">✓ ${p.status} (${p.duration})</span>
              </div>
              <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 6px;">
                <strong>Root Cause:</strong> ${p.cause}
              </div>
              <div style="display: flex; justify-content: space-between; font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); padding-top: 6px; border-top: 1px stroke var(--border-subtle);">
                <span>Date: ${p.date}</span>
                <span>Author: ${p.author}</span>
                <span class="text-lime" style="cursor: pointer;" onclick="window.app.showToast('Post-Mortem Exported', 'Exported ${p.id} post-mortem document.', 'success')">📥 Export Report PDF</span>
              </div>
            </div>
          `).join('')}
        </div>
      </div>
    `;
  }

  selectCandidate(candId) {
    this.selectedCandidateId = candId;
    const cand = this.activeIncident.candidates.find(c => c.id === candId);
    if (cand) {
      this.showToast("Candidate Selected", `Focusing root cause telemetry for ${cand.service} (${cand.probability}% confidence).`, "info");
    }
    this.refreshUI();
  }

  handleNodeSelect(nodeId) {
    const matchingCand = this.activeIncident.candidates.find(c => c.service === nodeId);
    if (matchingCand) {
      this.selectCandidate(matchingCand.id);
    } else {
      this.showToast("Service Selected", `Inspecting active node telemetry for ${nodeId}.`, "info");
      this.refreshUI();
    }
  }

  handleTimelineEventSelect(eventId) {
    const evt = this.activeIncident.timeline.find(e => e.id === eventId);
    if (evt) {
      this.showToast("Timeline Signal", `[${evt.type}] ${evt.service}: ${evt.summary.substring(0, 42)}...`, "info");
      const matchingCand = this.activeIncident.candidates.find(c => c.service === evt.service);
      if (matchingCand) this.selectCandidate(matchingCand.id);
    }
  }

  handleHeaderAction(action, value) {
    if (action === 'switch_incident') {
      this.activeIncidentId = value;
      this.activeIncident = this.incidents[value];
      this.selectedCandidateId = this.activeIncident.candidates[0].id;
      this.showToast("Incident Switched", `Loaded dataset for ${value}: ${this.activeIncident.title.substring(0, 30)}...`, "info");
      this.refreshUI();
    } else if (action === 'ack') {
      this.activeIncident.status = "ACKNOWLEDGED";

      // PERSIST TO REAL SQLITE DB via REST API
      fetch('/api/ack', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ incidentId: this.activeIncidentId })
      }).then(res => res.json()).then(data => {
        if (data.dbUpdated) {
          this.showToast("SQLITE DB MUTATED", `Executed: UPDATE incidents SET status = 'ACKNOWLEDGED' WHERE id = '${this.activeIncidentId}'`, "success");
          this.fetchDbStatus();
        }
      }).catch(() => {});

      this.refreshUI();
    } else if (action === 'resolve') {
      this.resolutionModal.open(this.activeIncident, 'resolve');
    } else if (action === 'remediate') {
      this.triggerRemediationTask("rem-1", "Apply automated connection pool mitigation");
    }
  }

  triggerRemediationTask(taskId, taskTitle) {
    this.activeIncident.taskTitle = taskTitle;
    this.resolutionModal.open(this.activeIncident, 'remediate');
  }

  setCorrelationWindow(windowSize) {
    this.correlationWindow = windowSize;
    const chips = document.querySelectorAll('.correlation-window-selector .window-chip');
    chips.forEach(chip => {
      if (chip.innerText.trim() === windowSize) chip.classList.add('active');
      else chip.classList.remove('active');
    });
    this.showToast("Correlation Window", `Refined temporal signal correlation window to ${windowSize}.`, "info");
    this.timeline.render(this.activeIncident.timeline, this.correlationWindow);
  }

  setTimelineFilter(filterType) { 
    this.timeline.setFilter(filterType); 
    this.showToast("Timeline Filter", `Filtering timeline markers by type [${filterType}].`, "info");
  }

  switchTab(tabName) {
    this.activeTab = tabName;
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.innerText.toUpperCase().includes(tabName.toUpperCase())) btn.classList.add('active');
      else btn.classList.remove('active');
    });

    this.showToast("Workspace View", `Switched stage view to [${tabName}].`, "info");
    this.refreshUI();
  }

  scrollToEvidence() {
    const el = document.getElementById("evidence-panel-container");
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  openCmdPalette() { this.cmdPalette.open(); }
  closeCmdPalette() { this.cmdPalette.close(); }
  execCmd(cmd) { this.cmdPalette.exec(cmd); }
  regenerateAI() { this.aiExplanation.regenerate(); }
  copyAISummary() { this.aiExplanation.copySummary(); }
  openResolutionModal(mode) { this.resolutionModal.open(this.activeIncident, mode); }
  closeResolutionModal() { this.resolutionModal.close(); }
  confirmResolution(mode) { this.resolutionModal.confirm(mode); }

  startLiveTelemetrySimulation() {
    setInterval(() => {
      const rateElem = document.getElementById("telemetry-ingest-rate");
      if (rateElem) {
        const rate = Math.floor(12400 + Math.random() * 450);
        rateElem.innerText = `${rate.toLocaleString()} ev/s`;
      }
    }, 2000);
  }
}

// 14. INITIALIZATION ON DOM READY
document.addEventListener("DOMContentLoaded", () => {
  try {
    window.app = new CortexApp();
    window.app.init();
    console.log("CortexApp initialized successfully!");
  } catch (err) {
    console.error("CortexApp initialization failed:", err);
  }
});
