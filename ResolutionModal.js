/* ==========================================================================
   CORTEX-FORENSICS // Incident Resolution & Post-Mortem Workflow Modal
   ========================================================================== */

class ResolutionModal {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
  }

  open(incident, mode = 'resolve') {
    if (!this.container || !incident) return;

    const isResolve = mode === 'resolve';

    this.container.innerHTML = `
      <div class="modal-overlay active" id="res-modal-overlay">
        <div class="modal-card">
          <div class="modal-header">
            <div style="font-family: var(--font-mono); font-size: 13px; font-weight: 700; color: var(--text-primary); display: flex; align-items: center; gap: 8px;">
              <span class="status-dot ${isResolve ? 'lime' : 'amber'}"></span>
              ${isResolve ? 'RESOLVE INCIDENT & GENERATE POST-MORTEM' : 'EXECUTE REMEDIATION TASK'}
            </div>
            <button class="btn-tech" style="padding: 2px 6px;" onclick="window.app.closeResolutionModal()">✕</button>
          </div>

          <div class="modal-body">
            ${isResolve ? `
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
                You are marking incident <strong class="text-amber">${incident.id}</strong> as <strong>RESOLVED</strong>. 
                Confirm the confirmed root cause and resolution summary below.
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                  CONFIRMED ROOT CAUSE SERVICE
                </label>
                <select id="modal-confirmed-root-cause" style="width: 100%; background: var(--bg-darkest); color: var(--text-primary); border: 1px solid var(--border-strong); font-family: var(--font-mono); padding: 8px; border-radius: 2px;">
                  ${incident.candidates.map(c => `
                    <option value="${c.service}">${c.service} - ${c.issue} (${c.probability}% probability)</option>
                  `).join('')}
                </select>
              </div>

              <div style="margin-bottom: 14px;">
                <label style="display: block; font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-bottom: 4px;">
                  INVESTIGATION & RESOLUTION NOTES
                </label>
                <textarea id="modal-resolution-notes" rows="4" style="width: 100%; background: var(--bg-darkest); color: var(--text-primary); border: 1px solid var(--border-strong); font-family: var(--font-mono); font-size: 11px; padding: 8px; border-radius: 2px;" placeholder="Add final resolution notes, remediation steps taken, and prevention action items...">${incident.aiNarrative}</textarea>
              </div>

              <div style="background: rgba(192, 238, 43, 0.05); border: 1px solid var(--accent-lime); padding: 10px; border-radius: 2px; font-family: var(--font-mono); font-size: 11px; color: var(--text-primary);">
                <span class="text-lime" style="font-weight: 700;">✓ POST-MORTEM DRAFT AUTOMATICALLY GENERATED</span>
                <div style="font-size: 10px; color: var(--text-muted); margin-top: 2px;">
                  Post-mortem document will be published to PagerDuty / Confluence / Slack #incidents channel upon confirmation.
                </div>
              </div>
            ` : `
              <div style="font-size: 12px; color: var(--text-secondary); margin-bottom: 16px;">
                Dispatching automated mitigation pipeline to Kubernetes Cluster context...
              </div>

              <div style="background: #08090B; border: 1px solid var(--border-amber); padding: 12px; font-family: var(--font-mono); font-size: 11px; color: var(--text-primary); border-radius: 2px;">
                <div style="color: var(--accent-amber); margin-bottom: 6px;">[REMEDIATION TASK DISPATCHED]</div>
                <div>Action: ${incident.taskTitle || 'Apply configuration fix'}</div>
                <div>Status: <span class="text-lime">IN_PROGRESS</span></div>
                <div style="margin-top: 8px; color: var(--text-muted); font-size: 10px;">
                  Executing canary patch rollouts... Connection pool limits updated.
                </div>
              </div>
            `}
          </div>

          <div class="modal-footer">
            <button class="btn-tech" onclick="window.app.closeResolutionModal()">Cancel</button>
            <button class="btn-tech btn-accent" onclick="window.app.confirmResolution('${mode}')">
              ${isResolve ? 'Confirm & Resolve Incident' : 'Dispatch Remediation Task'}
            </button>
          </div>
        </div>
      </div>
    `;
  }

  close() {
    const overlay = document.getElementById("res-modal-overlay");
    if (overlay) {
      overlay.classList.remove("active");
    }
  }

  confirm(mode) {
    if (mode === 'resolve') {
      if (window.app && window.app.activeIncident) {
        window.app.activeIncident.status = "RESOLVED";
        window.app.activeIncident.duration += " (RESOLVED)";
        alert("Incident successfully resolved! Post-mortem report published.");
        window.app.refreshUI();
      }
    } else {
      alert("Remediation task successfully dispatched to Kubernetes cluster!");
    }
    this.close();
  }
}
