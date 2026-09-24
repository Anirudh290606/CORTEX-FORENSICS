/* ==========================================================================
   CORTEX-FORENSICS // Incident Header & Status Component
   ========================================================================== */

class IncidentHeader {
  constructor(containerId, onActionTrigger) {
    this.container = document.getElementById(containerId);
    this.onActionTrigger = onActionTrigger;
  }

  render(incident, activeIncidentId, availableIncidents) {
    if (!this.container || !incident) return;

    this.container.innerHTML = `
      <div class="incident-identity">
        <div class="incident-id-badge">${incident.id}</div>
        
        <div class="incident-title-block">
          <h1>
            ${incident.title}
            <span class="severity-pill ${incident.severity.toLowerCase()}">${incident.severity}</span>
          </h1>
          <div style="font-family: var(--font-mono); font-size: 11px; color: var(--text-muted); margin-top: 3px;">
            <span class="status-dot red pulse"></span> ${incident.status} &nbsp;·&nbsp; 
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
                ${key} - ${availableIncidents[key].title.substring(0, 28)}...
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
          <span class="value text-amber" id="live-incident-duration">${incident.duration}</span>
        </div>
      </div>

      <div class="incident-actions">
        <button class="btn-tech" onclick="window.app.handleHeaderAction('ack')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><polyline points="20 6 9 17 4 12"></polyline></svg>
          Acknowledge
        </button>

        <button class="btn-tech btn-accent" onclick="window.app.handleHeaderAction('remediate')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M14.7 6.3a1 1 0 0 0 0 1.4l1.6 1.6a1 1 0 0 0 1.4 0l3.77-3.77a6 6 0 0 1-7.94 7.94l-6.91 6.91a2.12 2.12 0 0 1-3-3l6.91-6.91a6 6 0 0 1 7.94-7.94l-3.76 3.76z"></path></svg>
          Remediate
        </button>

        <button class="btn-tech btn-success" onclick="window.app.handleHeaderAction('resolve')">
          <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><path d="M22 11.08V12a10 10 0 1 1-5.93-9.14"></path><polyline points="22 4 12 14.01 9 11.01"></polyline></svg>
          Resolve
        </button>
      </div>
    `;

    // Dropdown change listener
    const dropdown = document.getElementById('incident-select-dropdown');
    if (dropdown) {
      dropdown.addEventListener('change', (e) => {
        if (this.onActionTrigger) {
          this.onActionTrigger('switch_incident', e.target.value);
        }
      });
    }
  }
}
