/* ==========================================================================
   CORTEX-FORENSICS // Service Dependency & Causality Map (Interactive SVG)
   ========================================================================== */

class DependencyMap {
  constructor(containerId, onNodeSelect) {
    this.container = document.getElementById(containerId);
    this.onNodeSelect = onNodeSelect;
    this.selectedNodeId = null;
    this.currentData = null;
  }

  render(incidentData, selectedCandidateId) {
    this.currentData = incidentData;
    if (!this.container) return;

    const nodes = incidentData.nodes || [];
    const edges = incidentData.edges || [];
    const selectedCandidate = incidentData.candidates.find(c => c.id === selectedCandidateId) || incidentData.candidates[0];

    // Compute layout positions for nodes in a clean causality grid
    const nodePositions = this.calculateNodePositions(nodes, edges);

    let svgHtml = `
      <svg id="svg-dependency-map" viewBox="0 0 800 360" preserveAspectRatio="xMidYMid meet">
        <defs>
          <!-- Arrow Markers -->
          <marker id="arrow-normal" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#5C6472"/>
          </marker>
          <marker id="arrow-degraded" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF9F1C"/>
          </marker>
          <marker id="arrow-critical" viewBox="0 0 10 10" refX="22" refY="5" markerWidth="6" markerHeight="6" orient="auto-start-reverse">
            <path d="M 0 0 L 10 5 L 0 10 z" fill="#FF3B30"/>
          </marker>

          <!-- Glow Filters -->
          <filter id="glow-root" x="-30%" y="-30%" width="160%" height="160%">
            <feGaussianBlur stdDeviation="6" result="blur" />
            <feComposite in="SourceGraphic" in2="blur" operator="over" />
          </filter>
        </defs>

        <!-- Dynamic Grid Lines Background -->
        <g opacity="0.15">
          ${Array.from({length: 8}, (_, i) => `<line x1="${(i+1)*100}" y1="0" x2="${(i+1)*100}" y2="360" stroke="#FFF" stroke-width="0.5" stroke-dasharray="2 4"/>`).join('')}
          ${Array.from({length: 5}, (_, i) => `<line x1="0" y1="${(i+1)*70}" x2="800" y2="${(i+1)*70}" stroke="#FFF" stroke-width="0.5" stroke-dasharray="2 4"/>`).join('')}
        </g>

        <!-- Edges (Dependency Lines with Directed Arrows & Flow Dots) -->
        <g class="edges-group">
          ${edges.map(edge => {
            const sourcePos = nodePositions[edge.source];
            const targetPos = nodePositions[edge.target];
            if (!sourcePos || !targetPos) return '';

            let edgeColor = '#3A404D';
            let strokeDash = '';
            let marker = 'url(#arrow-normal)';
            let isPropagation = false;

            if (edge.flow.includes('ROOT') || edge.flow.includes('PROPAGATION')) {
              edgeColor = edge.flow.includes('ROOT') ? '#FF3B30' : '#FF9F1C';
              marker = edge.flow.includes('ROOT') ? 'url(#arrow-critical)' : 'url(#arrow-degraded)';
              isPropagation = true;
            }

            const isHighlighted = selectedCandidate && (edge.source === selectedCandidate.service || edge.target === selectedCandidate.service);
            const strokeWidth = isHighlighted ? '2.5' : (isPropagation ? '1.8' : '1');

            return `
              <g class="edge-path-item">
                <line 
                  x1="${sourcePos.x}" y1="${sourcePos.y}" 
                  x2="${targetPos.x}" y2="${targetPos.y}" 
                  stroke="${edgeColor}" 
                  stroke-width="${strokeWidth}" 
                  stroke-dasharray="${strokeDash}"
                  marker-end="${marker}"
                  opacity="${isHighlighted ? '1' : '0.7'}"
                />
                ${isPropagation ? `
                  <circle r="3" fill="${edgeColor}">
                    <animateMotion 
                      path="M ${sourcePos.x} ${sourcePos.y} L ${targetPos.x} ${targetPos.y}" 
                      dur="${edge.flow.includes('ROOT') ? '1.2s' : '2.2s'}" 
                      repeatCount="indefinite" 
                    />
                  </circle>
                ` : ''}
              </g>
            `;
          }).join('')}
        </g>

        <!-- Nodes Group -->
        <g class="nodes-group">
          ${nodes.map(node => {
            const pos = nodePositions[node.id] || { x: 400, y: 180 };
            const isRoot = node.status === 'root_cause';
            const isDegraded = node.status === 'degraded';
            const isCritical = node.status === 'critical';
            const isSelected = this.selectedNodeId === node.id || (selectedCandidate && selectedCandidate.service === node.id);

            let nodeColor = '#3A404D';
            let borderStroke = '#5C6472';
            let badgeBg = '#1E2330';
            let badgeText = 'HEALTHY';

            if (isRoot) {
              nodeColor = '#FF3B30';
              borderStroke = '#FF3B30';
              badgeBg = 'rgba(255, 59, 48, 0.2)';
              badgeText = 'ROOT CAUSE';
            } else if (isCritical) {
              nodeColor = '#FF3B30';
              borderStroke = 'rgba(255, 59, 48, 0.6)';
              badgeBg = 'rgba(255, 59, 48, 0.15)';
              badgeText = 'CRITICAL';
            } else if (isDegraded) {
              nodeColor = '#FF9F1C';
              borderStroke = 'rgba(255, 159, 28, 0.6)';
              badgeBg = 'rgba(255, 159, 28, 0.15)';
              badgeText = 'DEGRADED';
            }

            return `
              <g 
                class="node-group ${isRoot ? 'node-root-cause' : ''} ${isSelected ? 'node-selected' : ''}" 
                transform="translate(${pos.x}, ${pos.y})" 
                style="cursor: pointer;"
                onclick="window.dependencyMapInstance.handleNodeClick('${node.id}')"
              >
                <!-- Root Pulsing Aura -->
                ${isRoot ? `
                  <circle r="36" fill="none" stroke="#FF3B30" stroke-width="1.5" opacity="0.6">
                    <animate attributeName="r" values="30;46;30" dur="2s" repeatCount="indefinite"/>
                    <animate attributeName="opacity" values="0.8;0;0.8" dur="2s" repeatCount="indefinite"/>
                  </circle>
                ` : ''}

                <!-- Selected Indicator Ring -->
                ${isSelected ? `
                  <rect x="-70" y="-28" width="140" height="56" fill="none" stroke="#FF9F1C" stroke-width="1.5" stroke-dasharray="4 2" rx="3"/>
                ` : ''}

                <!-- Node Body Box -->
                <rect 
                  x="-64" y="-24" width="128" height="48" rx="2" 
                  fill="${isSelected ? '#1A1E29' : '#12151C'}" 
                  stroke="${borderStroke}" 
                  stroke-width="${isRoot || isSelected ? '2' : '1'}"
                  ${isRoot ? 'filter="url(#glow-root)"' : ''}
                />

                <!-- Left Status Accent Bar -->
                <rect x="-64" y="-24" width="4" height="48" rx="1" fill="${nodeColor}" />

                <!-- Node Title -->
                <text x="-52" y="-6" fill="#F2F0E9" font-family="'JetBrains Mono', monospace" font-size="11" font-weight="700">
                  ${node.name.length > 14 ? node.name.substring(0, 12) + '..' : node.name}
                </text>

                <!-- Metrics / Role Tag -->
                <text x="-52" y="12" fill="${isRoot ? '#FF3B30' : (isDegraded ? '#FF9F1C' : '#9DA4B0')}" font-family="'JetBrains Mono', monospace" font-size="9">
                  ${node.role || badgeText}
                </text>

                <!-- Status Badge Pill -->
                <g transform="translate(24, 10)">
                  <rect x="-14" y="-8" width="28" height="12" rx="1" fill="${badgeBg}" />
                  <circle cx="-8" cy="-2" r="2" fill="${nodeColor}"/>
                  <text x="-3" y="1" fill="${nodeColor}" font-family="'JetBrains Mono', monospace" font-size="7" font-weight="700">
                    ${isRoot ? 'RC' : (isCritical ? 'ERR' : (isDegraded ? 'WARN' : 'OK'))}
                  </text>
                </g>
              </g>
            `;
          }).join('')}
        </g>
      </svg>
    `;

    this.container.innerHTML = svgHtml;
    window.dependencyMapInstance = this;
  }

  handleNodeClick(nodeId) {
    this.selectedNodeId = nodeId;
    if (this.onNodeSelect) {
      this.onNodeSelect(nodeId);
    }
    this.render(this.currentData, null);
  }

  calculateNodePositions(nodes, edges) {
    // Deterministic position layout for consistent causality flow (Left-to-Right or Top-to-Bottom)
    const positions = {
      "payment-db": { x: 120, y: 180 },
      "payment-worker": { x: 120, y: 300 },
      "kafka-event-bus": { x: 280, y: 300 },
      "payment-service": { x: 300, y: 180 },
      "inventory-service": { x: 300, y: 60 },
      "checkout-api": { x: 480, y: 180 },
      "auth-service": { x: 480, y: 60 },
      "api-gateway": { x: 680, y: 180 },
      "notification-service": { x: 680, y: 300 },
      "user-session-cache": { x: 140, y: 180 },
      "user-profile-service": { x: 500, y: 280 },
      "search-index": { x: 520, y: 320 }
    };

    // Fallback for any unmapped node
    let currentX = 150;
    nodes.forEach(node => {
      if (!positions[node.id]) {
        positions[node.id] = { x: currentX, y: 180 };
        currentX += 140;
      }
    });

    return positions;
  }
}
