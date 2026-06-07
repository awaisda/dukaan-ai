/**
 * sidebar.js — Dukaan AI v2.0
 * Premium left navigation — animated items, live stock counter, tooltip hints
 */

var NAV_ITEMS = [
  {
    panel: 'dashboard',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="7" height="7" rx="1"/><rect x="14" y="3" width="7" height="7" rx="1"/><rect x="3" y="14" width="7" height="7" rx="1"/><rect x="14" y="14" width="7" height="7" rx="1"/></svg>',
    label: 'Dashboard',
    desc: 'Overview & alerts'
  },
  {
    panel: 'inventory',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/><polyline points="3.27 6.96 12 12.01 20.73 6.96"/><line x1="12" y1="22.08" x2="12" y2="12"/></svg>',
    label: 'Inventory',
    desc: 'Stock levels'
  },
  {
    panel: 'forecast',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>',
    label: 'Sales Forecast',
    desc: 'AI predictions'
  },
  {
    panel: 'loss',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
    label: 'Loss Detector',
    desc: 'Margin analysis'
  },
];

var NAV_TOOLS = [
  {
    panel: 'upload',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polyline points="16 16 12 12 8 16"/><line x1="12" y1="12" x2="12" y2="21"/><path d="M20.39 18.39A5 5 0 0 0 18 9h-1.26A8 8 0 1 0 3 16.3"/></svg>',
    label: 'Upload Data',
    desc: 'Import CSV'
  },
  {
    panel: 'ai',
    icon: '<svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15a2 2 0 0 1-2 2H7l-4 4V5a2 2 0 0 1 2-2h14a2 2 0 0 1 2 2z"/></svg>',
    label: 'AI Assistant',
    desc: 'Chat & insights'
  },
];

function renderSidebar() {
  var el = document.getElementById('app-sidebar');
  if (!el) return;

  // Compute live alert count for inventory badge
  var critCount = typeof INVENTORY !== 'undefined'
    ? INVENTORY.filter(function(p){ return typeof daysLeft === 'function' && daysLeft(p) <= 7; }).length
    : 0;

  var mainItems = NAV_ITEMS.map(function(item, i) {
    var badge = '';
    if (item.panel === 'inventory' && critCount > 0) {
      badge = `<span class="nav-alert-badge">${critCount}</span>`;
    }
    return `<div class="nav-item" data-panel="${item.panel}" onclick="navTo('${item.panel}')"
      style="animation-delay:${i * 0.04}s"
      title="${item.desc}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
      ${badge}
    </div>`;
  }).join('');

  var toolItems = NAV_TOOLS.map(function(item, i) {
    var extra = item.panel === 'upload' && typeof isCustomData === 'function' && isCustomData()
      ? '<span class="nav-data-badge">CSV</span>' : '';
    return `<div class="nav-item" data-panel="${item.panel}" onclick="navTo('${item.panel}')"
      style="animation-delay:${(NAV_ITEMS.length + i) * 0.04}s"
      title="${item.desc}">
      <span class="nav-icon">${item.icon}</span>
      <span class="nav-label">${item.label}</span>
      ${extra}
    </div>`;
  }).join('');

  // Footer stats
  var totalProds = typeof INVENTORY !== 'undefined' ? INVENTORY.length : 0;

  el.innerHTML = `
    <div class="nav-section-label">Main</div>
    ${mainItems}
    <div class="nav-divider"></div>
    <div class="nav-section-label">Tools</div>
    ${toolItems}
    <div class="nav-footer">
      <div class="nav-footer-stat">
        <span style="color:var(--text3);font-size:9px">PRODUCTS</span>
        <span style="color:var(--green);font-family:var(--mono);font-size:11px;font-weight:700">${totalProds}</span>
      </div>
      <div class="nav-footer-stat">
        <span style="color:var(--text3);font-size:9px">ALERTS</span>
        <span style="color:${critCount > 0 ? 'var(--amber)' : 'var(--green)'};font-family:var(--mono);font-size:11px;font-weight:700">${critCount}</span>
      </div>
    </div>
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
  var custom = typeof isCustomData === 'function' && isCustomData();
  if (custom && !existing) {
    uploadNav.insertAdjacentHTML('beforeend', '<span class="nav-data-badge">CSV</span>');
  } else if (!custom && existing) {
    existing.remove();
  }
}
