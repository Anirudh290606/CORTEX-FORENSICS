/* ==========================================================================
   CORTEX-FORENSICS // Remediation Suggestions Panel Component
   ========================================================================== */

class RemediationPanel {
  constructor(containerId, onExecuteTask) {
    this.container = document.getElementById(containerId);
    this.onExecuteTask = onExecuteTask;
  }

  render(remediations) {
    if (!this.container || !remediations) return;

    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          Recommended Mitigation Actions
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-lime);">
          PREDICTED RECOVERY: 98%
        </div>
      </div>

      <div style="padding: 14px; display: flex; flex-direction: column; gap: 10px;">
        ${remediations.map(rem => `
          <div style="background: var(--bg-panel); border: 1px solid var(--border-subtle); padding: 12px; border-radius: 2px;">
            
            <div style="display: flex; align-items: center; justify-content: space-between; margin-bottom: 6px;">
              <span class="font-mono text-amber" style="font-weight: 700; font-size: 11px;">
                ${rem.rank} — ${rem.title}
              </span>
              <span style="font-family: var(--font-mono); font-size: 10px; color: var(--accent-lime); font-weight: 700;">
                ${rem.confidence}% CONFIDENCE
              </span>
            </div>

            <div style="font-size: 11px; color: var(--text-secondary); margin-bottom: 8px;">
              <strong>Rationale:</strong> ${rem.reason}
            </div>

            ${rem.command ? `
              <div style="background: #08090B; border: 1px stroke var(--border-subtle); padding: 6px 8px; font-family: var(--font-mono); font-size: 10px; color: var(--text-primary); margin-bottom: 8px; border-radius: 2px;">
                <span style="color: var(--accent-amber);">$</span> ${rem.command}
              </div>
            ` : ''}

            <div style="display: flex; align-items: center; justify-content: space-between; padding-top: 6px; border-top: 1px dashed var(--border-subtle);">
              <span style="font-size: 10px; font-family: var(--font-mono); color: var(--text-muted);">
                Expected: ${rem.impact}
              </span>
              <button 
                class="btn-tech btn-accent" 
                style="padding: 3px 8px; font-size: 10px;"
                onclick="window.app.triggerRemediationTask('${rem.id}', '${rem.title.replace(/'/g, "\\'")}')"
              >
                Create Remediation Task ➔
              </button>
            </div>

          </div>
        `).join('')}
      </div>
    `;
  }
}
