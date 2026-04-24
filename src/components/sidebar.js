/**
 * sidebar.js — Dukaan AI
 * Renders left navigation with mobile backdrop support
 */

var NAV_ITEMS = [
  { panel: 'dashboard', icon: '📊', label: 'Dashboard' },
  { panel: 'inventory', icon: '📦', label: 'Inventory' },
  { panel: 'forecast',  icon: '🔮', label: 'Sales Forecast' },
  { panel: 'loss',      icon: '📉', label: 'Loss Detector' },
];

var NAV_TOOLS = [
  { panel: 'upload', icon: '📁', label: 'Upload Data' },
  { panel: 'ai',     icon: '🤖', label: 'AI Assistant' },
];

function renderSidebar() {
  var el = document.getElementById('app-sidebar');
  if (!el) return;

  var mainItems = NAV_ITEMS.map(function(item) {
    return `<div class="nav-item" data-panel="${item.panel}" onclick="navTo('${item.panel}')">
      <span class="nav-icon">${item.icon}</span> ${item.label}
    </div>`;
  }).join('');

  var toolItems = NAV_TOOLS.map(function(item) {
    var extra = item.panel === 'upload' && isCustomData()
      ? '<span class="nav-data-badge">CSV</span>' : '';
    return `<div class="nav-item" data-panel="${item.panel}" onclick="navTo('${item.panel}')">
      <span class="nav-icon">${item.icon}</span> ${item.label}${extra}
    </div>`;
  }).join('');

  el.innerHTML = `
    <div class="nav-section-label">Main</div>
    ${mainItems}
    <div class="nav-divider"></div>
    <div class="nav-section-label">Tools</div>
    ${toolItems}
  `;
}

/** Navigate and auto-close sidebar on mobile */
function navTo(panel) {
  showPanel(panel);
  if (window.innerWidth <= 768) closeSidebar();
}

/** Refresh upload badge after data change */
function refreshSidebarBadge() {
  var uploadNav = document.querySelector('[data-panel="upload"]');
  if (!uploadNav) return;
  var existing = uploadNav.querySelector('.nav-data-badge');
  if (isCustomData() && !existing) {
    uploadNav.insertAdjacentHTML('beforeend', '<span class="nav-data-badge">CSV</span>');
  } else if (!isCustomData() && existing) {
    existing.remove();
  }
}
