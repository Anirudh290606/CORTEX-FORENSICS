/* ==========================================================================
   CORTEX-FORENSICS // Event Correlation Noise Reduction Funnel
   ========================================================================== */

class ReductionFunnel {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(stats) {
    if (!this.container || !stats) return;

    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polygon points="22 3 2 3 10 12.46 10 19 14 21 14 12.46 22 3"></polygon></svg>
          Signal Noise Reduction Pipeline
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">
          COMPRESSION RATIO: <span class="text-lime" style="font-weight: 700;">99.98% NOISE FILTERED</span>
        </div>
      </div>

      <div class="reduction-funnel-panel">
        <div class="reduction-funnel-container">
          
          <div class="funnel-step" title="Total raw telemetry events ingested">
            <div class="count">${stats.rawEvents.toLocaleString()}</div>
            <div class="step-title">Raw Events Ingested</div>
          </div>

          <div class="funnel-arrow">➔</div>

          <div class="funnel-step" title="Correlated events across trace IDs & timestamps">
            <div class="count text-cyan">${stats.correlatedEvents.toLocaleString()}</div>
            <div class="step-title">Correlated Signals</div>
          </div>

          <div class="funnel-arrow">➔</div>

          <div class="funnel-step" title="Statistical deviations outside 3-sigma threshold">
            <div class="count text-amber">${stats.anomalies}</div>
            <div class="step-title">Anomalies Detected</div>
          </div>

          <div class="funnel-arrow">➔</div>

          <div class="funnel-step" title="Services with abnormal error/latency telemetry">
            <div class="count text-amber">${stats.affectedServices}</div>
            <div class="step-title">Affected Services</div>
          </div>

          <div class="funnel-arrow">➔</div>

          <div class="funnel-step" style="border-color: var(--status-critical); background: rgba(255, 59, 48, 0.08);" title="Leading Root Cause Hypothesis">
            <div class="count text-critical" style="font-size: 13px;">${stats.leadingHypothesis}</div>
            <div class="step-title" style="color: var(--status-critical);">Primary Root Cause</div>
          </div>

        </div>
      </div>
    `;
  }
}
