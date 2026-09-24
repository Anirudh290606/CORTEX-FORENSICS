/* ==========================================================================
   CORTEX-FORENSICS // Chronological Incident Investigation Timeline
   ========================================================================== */

class Timeline {
  constructor(containerId, onEventSelect) {
    this.container = document.getElementById(containerId);
    this.onEventSelect = onEventSelect;
    this.activeFilter = "ALL";
    this.correlationWindow = "5m";
  }

  render(events, correlationWindow) {
    if (!this.container || !events) return;
    this.correlationWindow = correlationWindow || "5m";

    // Filter events based on active type filter
    const filteredEvents = events.filter(evt => {
      if (this.activeFilter === "ALL") return true;
      return evt.type === this.activeFilter;
    });

    const eventTypes = ["ALL", "ALERT", "ANOMALY", "LOG", "METRIC", "TRACE", "DEPLOYMENT"];

    this.container.innerHTML = `
      <div class="panel-header">
        <div class="panel-title">
          <svg class="icon-tag" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2"><circle cx="12" cy="12" r="10"></circle><polyline points="12 6 12 12 16 14"></polyline></svg>
          Chronological Forensic Timeline
          <span style="color: var(--text-muted); font-size: 10px; margin-left: 8px;">(Correlation Window: ${this.correlationWindow})</span>
        </div>
        
        <!-- Filter Tabs -->
        <div class="panel-actions" style="gap: 4px;">
          ${eventTypes.map(t => `
            <button 
              class="window-chip ${this.activeFilter === t ? 'active' : ''}" 
              style="padding: 2px 6px; font-size: 9px;"
              onclick="window.app.setTimelineFilter('${t}')"
            >
              ${t}
            </button>
          `).join('')}
        </div>
      </div>

      <div class="timeline-container">
        <div class="timeline-list">
          ${filteredEvents.length === 0 ? `
            <div style="padding: 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono);">
              No correlated timeline events match filter [${this.activeFilter}]
            </div>
          ` : filteredEvents.map(evt => `
            <div 
              class="timeline-event-row type-${evt.type}" 
              onclick="window.app.handleTimelineEventSelect('${evt.id}')"
            >
              <span class="event-time">${evt.time}</span>
              <span class="event-badge ${evt.type}">${evt.type}</span>
              <span class="event-msg">
                <strong style="color: var(--accent-amber); margin-right: 6px;">[${evt.service}]</strong>
                ${evt.summary}
              </span>
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
