/**
 * header.js — Dukaan AI
 * Renders the top navigation bar with hamburger for mobile
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
        <div class="logo-sub">Smart Retail Intelligence System</div>
      </div>
    </div>
    <div class="header-right">
      <div class="header-date" id="header-date"></div>
      <div class="status-badge">
        <div class="pulse-dot"></div>
        <span class="status-txt">AI ENGINE ACTIVE</span>
      </div>
    </div>
  `;

  updateHeaderDate();
  setInterval(updateHeaderDate, 60000);
}

function updateHeaderDate() {
  var el = document.getElementById('header-date');
  if (!el) return;
  var now = new Date();
  el.textContent = now.toLocaleDateString('en-PK', { weekday:'short', day:'numeric', month:'short' })
    + ' · ' + now.toLocaleTimeString('en-PK', { hour:'2-digit', minute:'2-digit' });
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
