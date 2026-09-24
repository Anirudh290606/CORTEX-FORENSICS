/* ==========================================================================
   CORTEX-FORENSICS // Interactive Command Palette Component
   Shortcuts: Ctrl+K, Alt+K, Cmd+K, or Slash '/' key
   ========================================================================== */

class CommandPalette {
  constructor(containerId) {
    this.container = document.getElementById(containerId);
    this.isOpen = false;
    
    // Command Registry
    this.commands = [
      { id: '/ack', label: '/acknowledge', desc: 'Acknowledge active incident & notify team', icon: '⚡', category: 'ACTION' },
      { id: '/resolve', label: '/resolve', desc: 'Open resolution workflow & post-mortem generator', icon: '✅', category: 'ACTION' },
      { id: '/remediate', label: '/remediate', desc: 'Dispatch automated Kubernetes mitigation task', icon: '🛠️', category: 'ACTION' },
      { id: '/window-30s', label: '/correlation-window 30s', desc: 'Set event correlation window to 30 seconds', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-1m', label: '/correlation-window 1m', desc: 'Set event correlation window to 1 minute', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-5m', label: '/correlation-window 5m', desc: 'Set event correlation window to 5 minutes', icon: '⏱️', category: 'WINDOW' },
      { id: '/window-15m', label: '/correlation-window 15m', desc: 'Set event correlation window to 15 minutes', icon: '⏱️', category: 'WINDOW' },
      { id: '/inspect-payment-db', label: '/inspect payment-db', desc: 'Inspect payment-db connection locks & traces', icon: '🎯', category: 'SERVICE' },
      { id: '/inspect-checkout-api', label: '/inspect checkout-api', desc: 'Inspect checkout-api thread pool saturation', icon: '🎯', category: 'SERVICE' },
      { id: '/export-brief', label: '/export-brief', desc: 'Copy executive incident brief to clipboard', icon: '📄', category: 'EXPORT' },
      { id: '/regenerate-ai', label: '/regenerate-analysis', desc: 'Trigger fresh AI root cause re-synthesis', icon: '🤖', category: 'AI' }
    ];

    this.currentFiltered = [...this.commands];
    this.initKeyboardListener();
  }

  initKeyboardListener() {
    window.addEventListener('keydown', (e) => {
      const isCmdK = (e.ctrlKey || e.metaKey || e.altKey) && e.key.toLowerCase() === 'k';
      const isSlash = e.key === '/' && !['INPUT', 'TEXTAREA', 'SELECT'].includes(document.activeElement.tagName);

      if (isCmdK || isSlash) {
        e.preventDefault();
        e.stopPropagation();
        this.toggle();
      } else if (e.key === 'Escape' && this.isOpen) {
        this.close();
      }
    }, true); // Capture phase overrides browser default address bar search
  }

  toggle() {
    if (this.isOpen) this.close();
    else this.open();
  }

  open() {
    if (!this.container) return;
    this.isOpen = true;
    this.currentFiltered = [...this.commands];

    this.renderModal(this.currentFiltered);

    setTimeout(() => {
      const input = document.getElementById("cmd-palette-input");
      if (input) {
        input.value = "";
        input.focus();
        input.addEventListener('keydown', (e) => {
          if (e.key === 'Enter' && this.currentFiltered.length > 0) {
            e.preventDefault();
            this.exec(this.currentFiltered[0].id);
          }
        });
      }
    }, 50);
  }

  close() {
    this.isOpen = false;
    const overlay = document.getElementById("cmd-palette-overlay");
    if (overlay) overlay.classList.remove("active");
  }

  renderModal(cmdList) {
    this.container.innerHTML = `
      <div 
        class="modal-overlay active" 
        id="cmd-palette-overlay" 
        onclick="if(event.target.id==='cmd-palette-overlay') window.app.closeCmdPalette()"
      >
        <div class="cmd-palette-box" onclick="event.stopPropagation()">
          <div class="cmd-input-wrapper">
            <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="var(--accent-amber)" stroke-width="2"><circle cx="11" cy="11" r="8"></circle><line x1="21" y1="21" x2="16.65" y2="16.65"></line></svg>
            <input 
              type="text" 
              class="cmd-input" 
              id="cmd-palette-input"
              placeholder="Search actions, services, or correlation filters... (e.g. /resolve, payment-db, 15m)"
              oninput="window.app.cmdPalette.handleSearch(this.value)"
            />
            <span style="font-family: var(--font-mono); font-size: 10px; color: var(--text-muted); padding: 2px 6px; background: var(--bg-panel); border-radius: 2px;">ESC to close</span>
          </div>

          <div class="cmd-list" id="cmd-palette-list">
            ${this.renderListItems(cmdList)}
          </div>
        </div>
      </div>
    `;
  }

  renderListItems(cmdList) {
    if (!cmdList || cmdList.length === 0) {
      return `
        <div style="padding: 20px; text-align: center; color: var(--text-muted); font-family: var(--font-mono); font-size: 12px;">
          No matching forensic commands found. Try searching "/resolve", "payment-db", or "window".
        </div>
      `;
    }

    return cmdList.map((c, idx) => `
      <div 
        class="cmd-item ${idx === 0 ? 'selected' : ''}" 
        onclick="window.app.execCmd('${c.id}')"
      >
        <span>${c.icon} <strong>${c.label}</strong> — ${c.desc}</span>
        <span class="font-mono text-muted" style="font-size: 9px; padding: 1px 4px; background: rgba(255,255,255,0.05); border-radius: 2px;">${c.category}</span>
      </div>
    `).join('');
  }

  handleSearch(query) {
    const listElem = document.getElementById("cmd-palette-list");
    if (!listElem) return;
    const q = (query || "").toLowerCase().trim();

    if (!q) {
      this.currentFiltered = [...this.commands];
      listElem.innerHTML = this.renderListItems(this.currentFiltered);
      return;
    }

    this.currentFiltered = this.commands.filter(c => 
      c.label.toLowerCase().includes(q) || 
      c.desc.toLowerCase().includes(q) || 
      c.id.toLowerCase().includes(q) ||
      c.category.toLowerCase().includes(q)
    );

    listElem.innerHTML = this.renderListItems(this.currentFiltered);
  }

  exec(cmdId) {
    this.close();
    if (cmdId === '/ack') {
      window.app.handleHeaderAction('ack');
    } else if (cmdId === '/resolve') {
      window.app.handleHeaderAction('resolve');
    } else if (cmdId === '/remediate') {
      window.app.handleHeaderAction('remediate');
    } else if (cmdId.startsWith('/window-')) {
      const windowVal = cmdId.replace('/window-', '');
      const windowStr = windowVal === '30s' ? '30 sec' : (windowVal === '1m' ? '1 min' : (windowVal === '5m' ? '5 min' : '15 min'));
      window.app.setCorrelationWindow(windowStr);
    } else if (cmdId === '/inspect-payment-db') {
      window.app.selectCandidate('cand-1');
    } else if (cmdId === '/inspect-checkout-api') {
      window.app.selectCandidate('cand-2');
    } else if (cmdId === '/export-brief') {
      window.app.copyAISummary();
    } else if (cmdId === '/regenerate-ai') {
      window.app.regenerateAI();
    }
  }
}
