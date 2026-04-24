/**
 * router.js — Dukaan AI
 * Panel / tab navigation
 */

var PANELS = ['dashboard', 'inventory', 'forecast', 'loss', 'ai', 'upload'];

function showPanel(name) {
  // Hide all panels
  PANELS.forEach(function(p) {
    var el = document.getElementById('panel-' + p);
    if (el) el.classList.remove('active');
  });

  // Show selected
  var target = document.getElementById('panel-' + name);
  if (target) target.classList.add('active');

  // Update sidebar active state
  document.querySelectorAll('.nav-item').forEach(function(item) {
    item.classList.toggle('active', item.dataset.panel === name);
  });

  // Scroll main to top
  var main = document.getElementById('app-main');
  if (main) main.scrollTop = 0;

  // Panel-specific init hooks
  if (name === 'dashboard') buildDashboard();
  if (name === 'inventory') buildInventoryTable();
  if (name === 'loss')      buildLossPanel();
  if (name === 'upload')    resetUploadState();
}
