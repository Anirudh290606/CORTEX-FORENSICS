/* ==========================================================================
   CORTEX-FORENSICS // Root Cause Confidence Rail Component
   Visual Centerpiece for Ranked Root Cause Candidates
   ========================================================================== */

class RootCauseRail {
  constructor(containerId, onSelectCandidate) {
    this.container = document.getElementById(containerId);
    this.onSelectCandidate = onSelectCandidate;
  }

  render(candidates, selectedCandidateId) {
    if (!this.container || !candidates) return;

    let html = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><crosshair cx="12" cy="12" r="3"></crosshair><line x1="12" y1="2" x2="12" y2="6"></line><line x1="12" y1="18" x2="12" y2="22"></line><line x1="2" y1="12" x2="6" y2="12"></line><line x1="18" y1="12" x2="22" y2="12"></line></svg>
          Root Cause Confidence Rail
          <span style="color: var(--text-muted); font-weight: normal; margin-left: 8px;">(${candidates.length} Correlated Candidates)</span>
        </div>
        <div class="panel-actions">
          <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">SORT BY: CONFIDENCE SCORE</span>
        </div>
      </div>

      <div class="candidates-rail-grid">
        ${candidates.map(cand => {
          const isSelected = cand.id === selectedCandidateId;
          const isTopRank = cand.rank === "01";

          return `
            <div 
              class="candidate-card ${isSelected ? 'selected' : ''}" 
              onclick="window.app.selectCandidate('${cand.id}')"
            >
              <div class="candidate-rank-header">
                <span class="candidate-rank">${cand.rank} CANDIDATE</span>
                <span style="font-family: var(--font-mono); font-size: 11px; font-weight: 700; color: ${isTopRank ? 'var(--status-critical)' : 'var(--accent-amber)'};">
                  ${cand.probability}% PROBABILITY
                </span>
              </div>

              <div class="candidate-name">
                <span class="font-mono text-amber">${cand.service}</span>
                <div style="font-size: 11px; color: var(--text-secondary); font-weight: normal; margin-top: 2px;">
                  ${cand.issue}
                </div>
              </div>

              <!-- Confidence Track -->
              <div class="confidence-bar-wrapper">
                <div class="confidence-label-row">
                  <span>CONFIDENCE MATRIX</span>
                  <span>${cand.evidenceCount} EVIDENCE SIGNALS</span>
                </div>
                <div class="confidence-track">
                  <div class="confidence-fill" style="width: ${cand.probability}%; ${isTopRank ? 'background: linear-gradient(90deg, var(--accent-amber), var(--status-critical));' : 'background: var(--accent-amber);'}"></div>
                </div>
              </div>

              <!-- Telemetry Metadata Metrics Row -->
              <div class="candidate-metrics-row">
                <div title="First Detected Timestamp">
                  <span style="color: var(--text-muted);">1st Detected:</span> 
                  <span style="color: var(--text-primary);">${cand.firstDetected}</span>
                </div>
                <div title="Downstream Services Impacted">
                  <span style="color: var(--text-muted);">Reach:</span> 
                  <span class="text-amber">${cand.downstreamAffected} Services</span>
                </div>
                <div title="Correlated Anomalies">
                  <span style="color: var(--text-muted);">Anomalies:</span> 
                  <span style="color: var(--text-primary);">${cand.anomaliesCount}</span>
                </div>
              </div>

              <div style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted); margin-top: 6px;">
                <span style="color: var(--accent-amber);">➔</span> ${cand.relationship}
              </div>
            </div>
          `;
        }).join('')}
      </div>
    `;

    this.container.innerHTML = html;
  }
}
