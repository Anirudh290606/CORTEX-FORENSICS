/* ==========================================================================
   CORTEX-FORENSICS // Contextual Evidence Inspector & Trace Span Waterfall
   ========================================================================== */

class EvidencePanel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(candidate, traceWaterfall) {
    if (!this.container || !candidate) return;

    const details = candidate.details || {};

    this.container.innerHTML = `
      <div class="panel-header" id="evidence-panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V8z"></path><polyline points="14 2 14 8 20 8"></polyline><line x1="16" y1="13" x2="8" y2="13"></line><line x1="16" y1="17" x2="8" y2="17"></line><polyline points="10 9 9 9 8 9"></polyline></svg>
          Contextual Evidence Inspector
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-amber);">
          ${candidate.service} [${candidate.probability}% CONFIDENCE]
        </div>
      </div>

      <div style="padding: 14px; display: flex; flex-direction: column; gap: 12px;">
        
        <!-- Key Anomalous Metrics Box -->
        <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
          <div style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-primary); margin-bottom: 8px;">
            🔍 WHY IS THIS CANDIDATE SUSPECTED?
          </div>
          <ul style="list-style: none; font-size: 11px; line-height: 1.6; color: var(--text-secondary);">
            <li style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: var(--status-critical);">•</span> 
              <span><strong>Latency Spike:</strong> ${details.latencyDelta || 'N/A'} (43s prior to API failure)</span>
            </li>
            <li style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: var(--status-critical);">•</span> 
              <span><strong>Capacity Limit:</strong> ${details.saturation || 'N/A'}</span>
            </li>
            <li style="margin-bottom: 4px; display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: var(--status-critical);">•</span> 
              <span><strong>Trace Analysis:</strong> ${details.tracePropagation || 'N/A'}</span>
            </li>
            <li style="display: flex; align-items: flex-start; gap: 6px;">
              <span style="color: var(--accent-amber);">•</span> 
              <span><strong>Historical Correlation:</strong> ${details.historicalPattern || 'N/A'}</span>
            </li>
          </ul>
        </div>

        <!-- Distributed Trace Waterfall Span Viewer -->
        ${traceWaterfall ? `
          <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 10px;">
              <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: var(--text-primary);">
                ⚡ DISTRIBUTED TRACE WATERFALL (#${traceWaterfall.traceId})
              </span>
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
                      <div 
                        style="
                          position: absolute; 
                          left: ${leftPct}%; 
                          width: ${widthPct}%; 
                          height: 100%; 
                          background: ${isErr ? 'rgba(255, 59, 48, 0.3)' : 'rgba(192, 238, 43, 0.3)'}; 
                          border: 1px solid ${isErr ? 'var(--status-critical)' : 'var(--accent-lime)'};
                          border-radius: 2px;
                        "
                      ></div>
                    </div>
                  </div>
                `;
              }).join('')}
            </div>
          </div>
        ` : ''}

        <!-- Stack Trace & Log Snippet -->
        <div style="background: #08090C; border: 1px solid var(--border-subtle); padding: 10px; border-radius: 2px; font-family: var(--font-mono); font-size: 10px; color: var(--text-secondary);">
          <div style="color: var(--text-muted); margin-bottom: 4px; display: flex; justify-content: space-between;">
            <span>RAW FORENSIC TELEMETRY EXTRACT</span>
            <span style="color: var(--status-critical);">STDERR / SYSLOG</span>
          </div>
          <pre style="white-space: pre-wrap; word-break: break-all; color: var(--status-critical); line-height: 1.4;">
[2026-09-24 14:31:54.450] ERROR [payment-service] db_pool.go:142: acquire connection timeout
  goroutine 4821 [running]:
  github.com/cortex/payment/db.(*Pool).Acquire(0xc000418200)
      /app/db/pool.go:142 +0x21a
  github.com/cortex/payment/service.ProcessPayment(...)
      /app/service/payment.go:88 +0x4f2
  context deadline exceeded (Client.Timeout exceeded while awaiting headers)
          </pre>
        </div>

      </div>
    `;
  }
}
