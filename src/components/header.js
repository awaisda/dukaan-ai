/**
 * header.js — Dukaan AI v2.0
 * Premium top nav — live clock, animated status, search trigger
 */

function renderHeader() {
  var el = document.getElementById('app-header');
  if (!el) return;

  el.innerHTML = `
    <div class="logo-area">
      <button class="hamburger" id="nav-toggle" aria-label="Toggle menu" onclick="toggleSidebar()">
        <span></span><span></span><span></span>
      </button>
      <div class="logo-icon">D</div>
      <div>
        <div class="logo-name">Dukaan AI</div>
        <div class="logo-sub">Smart Retail Intelligence</div>
      </div>
    </div>

    <div class="header-center" id="header-center"></div>

    <div class="header-right">
      <div class="header-clock" id="header-clock"></div>
      <div class="status-badge" title="AI Engine is running">
        <div class="pulse-dot"></div>
        <span class="status-txt">AI ENGINE ACTIVE</span>
      </div>
    </div>
  `;

  updateHeaderClock();
  setInterval(updateHeaderClock, 1000);
  updateHeaderStats();
  setInterval(updateHeaderStats, 60000);
}

function updateHeaderClock() {
  var el = document.getElementById('header-clock');
  if (!el) return;
  var now = new Date();
  var date = now.toLocaleDateString('en-PK', { weekday: 'short', day: 'numeric', month: 'short' });
  var time = now.toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' });
  el.innerHTML = `<span style="color:var(--text3)">${date}</span>&nbsp;·&nbsp;<span style="font-family:var(--mono);color:var(--text2)">${time}</span>`;
}

function updateHeaderStats() {
  var center = document.getElementById('header-center');
  if (!center || typeof INVENTORY === 'undefined') return;
  var critCount = INVENTORY.filter(function(p){ return typeof daysLeft === 'function' && daysLeft(p) <= 3; }).length;
  if (critCount > 0) {
    center.innerHTML = `<div class="header-alert-pill" onclick="navTo('inventory')" title="View critical stock alerts">
      <span style="color:var(--red)">⚠</span>
      <span>${critCount} critical stock alert${critCount > 1 ? 's' : ''}</span>
    </div>`;
  } else {
    center.innerHTML = '';
  }
}

function toggleSidebar() {
  var sidebar  = document.getElementById('app-sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var btn      = document.getElementById('nav-toggle');
  if (!sidebar) return;
  var isOpen = sidebar.classList.toggle('open');
  if (backdrop) backdrop.classList.toggle('show', isOpen);
  if (btn)      btn.classList.toggle('open', isOpen);
}

function closeSidebar() {
  var sidebar  = document.getElementById('app-sidebar');
  var backdrop = document.getElementById('sidebar-backdrop');
  var btn      = document.getElementById('nav-toggle');
  if (sidebar)  sidebar.classList.remove('open');
  if (backdrop) backdrop.classList.remove('show');
  if (btn)      btn.classList.remove('open');
}
