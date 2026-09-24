/* ==========================================================================
   CORTEX-FORENSICS // Cascading Failure Visualization Component
   ========================================================================== */

class CascadingFailure {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  render(cascadingPath) {
    if (!this.container || !cascadingPath) return;

    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M13 2L3 14h9l-1 8 10-12h-9l1-8z"></path></svg>
          Cascading Failure Vector Path
        </div>
        <div style="font-family: var(--font-mono); font-size: 10px; color: var(--status-critical);">
          PROPAGATION SPEED: ~26s
        </div>
      </div>

      <div style="padding: 14px;">
        <div class="cascading-chain">
          ${cascadingPath.map((step, idx) => `
            <div class="cascade-node-row ${step.type === 'ROOT' ? 'root' : ''}">
              <span class="cascade-type-badge ${step.type}">${step.type}</span>
              <div style="flex: 1;">
                <span class="font-mono" style="font-weight: 700; color: ${step.type === 'ROOT' ? 'var(--status-critical)' : 'var(--text-primary)'}">
                  ${step.service}
                </span>
                <div style="font-size: 10px; color: var(--text-muted); font-family: var(--font-mono); margin-top: 1px;">
                  ${step.desc}
                </div>
              </div>
            </div>

            ${idx < cascadingPath.length - 1 ? `
              <div class="cascade-connector">
                <svg width="12" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><line x1="12" y1="0" x2="12" y2="24"></line><polyline points="6 18 12 24 18 18"></polyline></svg>
              </div>
            ` : ''}
          `).join('')}
        </div>
      </div>
    `;
  }
}
