/* ==========================================================================
   CORTEX-FORENSICS // AI Incident Narrative & Explanation Component
   ========================================================================== */

class AIExplanation {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isRegenerating = false;
  }

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
            <span class="ai-spark-tag">
              <span class="status-dot lime pulse"></span> SYNTHESIZED INCIDENT CAUSALITY
            </span>
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted);">CONFIDENCE: 94%</span>
          </div>

          <div id="ai-narrative-content-body" style="font-family: var(--font-sans); color: var(--text-primary);">
            ${narrativeText}
          </div>

          <div style="display: flex; align-items: center; justify-content: space-between; margin-top: 14px; padding-top: 10px; border-top: 1px dashed var(--border-subtle);">
            <button class="btn-tech" style="padding: 4px 10px; font-size: 10px;" onclick="window.app.copyAISummary()">
              <svg width="10" height="10" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><rect x="9" y="9" width="13" height="13" rx="2" ry="2"></rect><path d="M5 15H4a2 2 0 0 1-2-2V4a2 2 0 0 1 2-2h9a2 2 0 0 1 2 2v1"></path></svg>
              Copy Incident Summary
            </button>

            <button class="btn-tech btn-accent" style="padding: 4px 10px; font-size: 10px;" onclick="window.app.scrollToEvidence()">
              View Supporting Evidence ➔
            </button>
          </div>
        </div>
      </div>
    `;
  }

  regenerate() {
    this.isRegenerating = true;
    const bodyElem = document.getElementById("ai-narrative-content-body");
    if (bodyElem) {
      bodyElem.innerHTML = `<span class="font-mono text-amber" style="animation: pulse-dot 1s infinite;">Re-evaluating cross-service traces, metrics correlation window, and lock trees...</span>`;
    }

    setTimeout(() => {
      this.isRegenerating = false;
      if (window.app && window.app.activeIncident) {
        const selectedCand = window.app.activeIncident.candidates.find(c => c.id === window.app.selectedCandidateId);
        this.render(window.app.activeIncident.aiNarrative, selectedCand);
      }
    }, 1000);
  }

  copySummary() {
    if (window.app && window.app.activeIncident) {
      navigator.clipboard.writeText(window.app.activeIncident.aiNarrative);
      alert("Incident summary copied to clipboard!");
    }
  }
}
