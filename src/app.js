/**
 * app.js — Dukaan AI
 * Application entry point
 */

(function init() {
  // 1. Render structural components
  renderHeader();
  renderSidebar();

  // 2. Render all panels
  renderDashboardPanel();
  renderInventoryPanel();
  renderForecastPanel();
  renderLossPanel();
  renderAiChatPanel();
  renderUploadPanel();

  // 3. Initialize charts and activate default view
  showPanel('dashboard');

  console.log('[Dukaan AI] App initialized ✅ — ' + INVENTORY.length + ' products loaded');
})();
