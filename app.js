/* ==========================================================================
   CORTEX-FORENSICS // Main Application Orchestrator
   ========================================================================== */

class CortexApp {
  constructor() {
    this.incidents = INCIDENTS_DATA;
    this.activeIncidentId = "INC-2048";
    this.activeIncident = this.incidents[this.activeIncidentId];
    this.selectedCandidateId = "cand-1";
    this.correlationWindow = "5m";
    this.activeTab = "INVESTIGATE";

    // Component instances
    this.header = new IncidentHeader("app-header", this.handleHeaderAction.bind(this));
    this.dependencyMap = new DependencyMap("dependency-map-container", this.handleNodeSelect.bind(this));
    this.rootCauseRail = new RootCauseRail("root-cause-rail-container", this.selectCandidate.bind(this));
    this.reductionFunnel = new ReductionFunnel("reduction-funnel-container");
    this.timeline = new Timeline("timeline-container", this.handleTimelineEventSelect.bind(this));
    this.aiExplanation = new AIExplanation("ai-explanation-container");
    this.cascadingFailure = new CascadingFailure("cascading-failure-container");
    this.evidencePanel = new EvidencePanel("evidence-panel-container");
    this.remediationPanel = new RemediationPanel("remediation-panel-container");
    this.resolutionModal = new ResolutionModal("modal-root");
    this.cmdPalette = new CommandPalette("cmd-palette-root");

    this.initSoundEffects();
  }

  initSoundEffects() {
    try {
      const AudioContext = window.AudioContext || window.webkitAudioContext;
      if (AudioContext) {
        this.audioCtx = new AudioContext();
      }
    } catch(e) {}
  }

  playSubtleClick() {
    if (!this.audioCtx) return;
    try {
      const osc = this.audioCtx.createOscillator();
      const gain = this.audioCtx.createGain();
      osc.type = 'sine';
      osc.frequency.setValueAtTime(800, this.audioCtx.currentTime);
      osc.frequency.exponentialRampToValueAtTime(200, this.audioCtx.currentTime + 0.03);
      gain.gain.setValueAtTime(0.04, this.audioCtx.currentTime);
      gain.gain.exponentialRampToValueAtTime(0.001, this.audioCtx.currentTime + 0.03);
      osc.connect(gain);
      gain.connect(this.audioCtx.destination);
      osc.start();
      osc.stop(this.audioCtx.currentTime + 0.03);
    } catch(e) {}
  }

  init() {
    this.refreshUI();
    this.startLiveTelemetrySimulation();
  }

  refreshUI() {
    this.activeIncident = this.incidents[this.activeIncidentId];
    if (!this.activeIncident) return;

    const selectedCand = this.activeIncident.candidates.find(c => c.id === this.selectedCandidateId) || this.activeIncident.candidates[0];

    // Render all components
    this.header.render(this.activeIncident, this.activeIncidentId, this.incidents);
    this.dependencyMap.render(this.activeIncident, this.selectedCandidateId);
    this.rootCauseRail.render(this.activeIncident.candidates, this.selectedCandidateId);
    this.reductionFunnel.render(this.activeIncident.reductionStats);
    this.timeline.render(this.activeIncident.timeline, this.correlationWindow);
    this.aiExplanation.render(this.activeIncident.aiNarrative, selectedCand);
    this.cascadingFailure.render(this.activeIncident.cascadingPath);
    this.evidencePanel.render(selectedCand, this.activeIncident.traceWaterfall);
    this.remediationPanel.render(this.activeIncident.remediations);
  }

  selectCandidate(candId) {
    this.playSubtleClick();
    this.selectedCandidateId = candId;
    this.refreshUI();

    const evidenceElem = document.getElementById("evidence-panel-header");
    if (evidenceElem && window.innerWidth < 900) {
      evidenceElem.scrollIntoView({ behavior: 'smooth' });
    }
  }

  handleNodeSelect(nodeId) {
    this.playSubtleClick();
    const matchingCand = this.activeIncident.candidates.find(c => c.service === nodeId);
    if (matchingCand) {
      this.selectCandidate(matchingCand.id);
    } else {
      this.refreshUI();
    }
  }

  handleTimelineEventSelect(eventId) {
    this.playSubtleClick();
    const evt = this.activeIncident.timeline.find(e => e.id === eventId);
    if (evt) {
      const matchingCand = this.activeIncident.candidates.find(c => c.service === evt.service);
      if (matchingCand) {
        this.selectCandidate(matchingCand.id);
      }
    }
  }

  handleHeaderAction(action, value) {
    this.playSubtleClick();
    if (action === 'switch_incident') {
      this.activeIncidentId = value;
      this.activeIncident = this.incidents[value];
      this.selectedCandidateId = this.activeIncident.candidates[0].id;
      this.refreshUI();
    } else if (action === 'ack') {
      this.activeIncident.status = "ACKNOWLEDGED";
      alert(`Incident ${this.activeIncidentId} marked as ACKNOWLEDGED by ${this.activeIncident.owner}`);
      this.refreshUI();
    } else if (action === 'resolve') {
      this.resolutionModal.open(this.activeIncident, 'resolve');
    } else if (action === 'remediate') {
      this.triggerRemediationTask("rem-1", "Apply automated connection pool mitigation");
    }
  }

  triggerRemediationTask(taskId, taskTitle) {
    this.playSubtleClick();
    this.activeIncident.taskTitle = taskTitle;
    this.resolutionModal.open(this.activeIncident, 'remediate');
  }

  setCorrelationWindow(windowSize) {
    this.playSubtleClick();
    this.correlationWindow = windowSize;
    
    const chips = document.querySelectorAll('.correlation-window-selector .window-chip');
    chips.forEach(chip => {
      if (chip.innerText.trim() === windowSize) {
        chip.classList.add('active');
      } else {
        chip.classList.remove('active');
      }
    });

    this.timeline.render(this.activeIncident.timeline, this.correlationWindow);
  }

  setTimelineFilter(filterType) {
    this.playSubtleClick();
    this.timeline.setFilter(filterType);
  }

  switchTab(tabName) {
    this.playSubtleClick();
    this.activeTab = tabName;
    const tabBtns = document.querySelectorAll('.nav-tab-btn');
    tabBtns.forEach(btn => {
      if (btn.innerText.toUpperCase().includes(tabName.toUpperCase())) {
        btn.classList.add('active');
      } else {
        btn.classList.remove('active');
      }
    });

    if (tabName !== 'INVESTIGATE') {
      alert(`Switching view context to [${tabName}]. Investigation workspace remains active.`);
    }
  }

  scrollToEvidence() {
    const el = document.getElementById("evidence-panel-container");
    if (el) el.scrollIntoView({ behavior: 'smooth' });
  }

  openCmdPalette() {
    this.playSubtleClick();
    this.cmdPalette.open();
  }

  closeCmdPalette() {
    this.cmdPalette.close();
  }

  execCmd(cmd) {
    this.cmdPalette.exec(cmd);
  }

  regenerateAI() {
    this.playSubtleClick();
    this.aiExplanation.regenerate();
  }

  copyAISummary() {
    this.aiExplanation.copySummary();
  }

  openResolutionModal(mode) {
    this.resolutionModal.open(this.activeIncident, mode);
  }

  closeResolutionModal() {
    this.resolutionModal.close();
  }

  confirmResolution(mode) {
    this.resolutionModal.confirm(mode);
  }

  startLiveTelemetrySimulation() {
    setInterval(() => {
      const rateElem = document.getElementById("telemetry-ingest-rate");
      if (rateElem) {
        const rate = Math.floor(12400 + Math.random() * 450);
        rateElem.innerText = `${rate.toLocaleString()} ev/s`;
      }
    }, 2000);
  }
}

// Global initialization on DOM ready
document.addEventListener("DOMContentLoaded", () => {
  window.app = new CortexApp();
  window.app.init();
});
