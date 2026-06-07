/**
 * dashboard.js — Dukaan AI v2.0
 * Premium dynamic dashboard — staggered metric cards, live alerts, sparkline chart
 */

function renderDashboardPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-dashboard" class="panel active">

      <!-- PAGE HEADER -->
      <div class="page-header-row">
        <div>
          <div class="page-title">Dashboard</div>
          <div class="page-sub" id="dash-date">Loading overview…</div>
        </div>
        <button class="refresh-btn" onclick="buildDashboard()" id="dash-refresh-btn" title="Refresh dashboard">
          <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="23 4 23 10 17 10"/><polyline points="1 20 1 14 7 14"/><path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/></svg>
          Refresh
        </button>
      </div>

      <!-- METRIC CARDS -->
      <div class="four-col" id="dash-metrics"></div>

      <!-- ALERTS -->
      <div class="section-label">Live Alerts</div>
      <div class="alerts-grid" id="dash-alerts"></div>

      <!-- CHART -->
      <div class="section-label">Weekly Sales Trend</div>
      <div class="chart-card" style="height:230px; padding:20px 20px 12px">
        <canvas id="trendChart" style="height:185px"></canvas>
      </div>

    </div>
  `;
}

function buildDashboard() {
  // Spin the refresh icon
  var btn = document.getElementById('dash-refresh-btn');
  if (btn) {
    btn.classList.add('spinning');
    setTimeout(function(){ btn.classList.remove('spinning'); }, 700);
  }

  // Date line
  var dateEl = document.getElementById('dash-date');
  if (dateEl) {
    dateEl.innerHTML =
      '<span>' + todayStr() + '</span>' +
      ' <span style="color:var(--text3);font-size:10px;font-family:var(--mono)">· Updated ' +
      new Date().toLocaleTimeString('en-PK', { hour: '2-digit', minute: '2-digit', second: '2-digit' }) +
      '</span>';
  }

  /* ---- COMPUTE METRICS ---- */
  var totalProducts  = INVENTORY.length;
  var reorderAlerts  = INVENTORY.filter(function(p){ return p.stock <= p.reorder; }).length;
  var lossProducts   = INVENTORY.filter(function(p){ return p.price < p.cost; }).length;
  var critProducts   = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; }).length;
  var weeklyRev      = INVENTORY.reduce(function(sum, p){ return sum + (p.price * p.daily * 7); }, 0);
  var avgMargin      = Math.round(INVENTORY.reduce(function(s,p){ return s + marginPct(p); }, 0) / totalProducts);

  var metrics = [
    {
      val: totalProducts,
      lbl: 'Total Products',
      delta: totalProducts + ' active SKUs',
      deltaClass: 'up',
      accent: 'accent-blue',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"/></svg>',
      iconColor: 'var(--blue)'
    },
    {
      val: reorderAlerts > 0 ? reorderAlerts : '✓',
      lbl: 'Reorder Alerts',
      delta: reorderAlerts > 0 ? '⚠ Action needed' : 'All stock healthy',
      deltaClass: reorderAlerts > 0 ? 'dn' : 'up',
      accent: reorderAlerts > 0 ? 'accent-amber' : 'accent-green',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 0 0 6 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 0 1-3.46 0"/></svg>',
      iconColor: reorderAlerts > 0 ? 'var(--amber)' : 'var(--green)'
    },
    {
      val: formatRs(weeklyRev),
      lbl: 'Est. Weekly Revenue',
      delta: 'Avg margin ' + avgMargin + '%',
      deltaClass: avgMargin >= 15 ? 'up' : 'dn',
      accent: 'accent-green',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><line x1="12" y1="1" x2="12" y2="23"/><path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6"/></svg>',
      iconColor: 'var(--green)'
    },
    {
      val: critProducts > 0 ? critProducts : lossProducts > 0 ? lossProducts : '✓',
      lbl: critProducts > 0 ? 'Critical Stock' : 'Loss Products',
      delta: critProducts > 0 ? '⚠ Reorder immediately' : lossProducts > 0 ? '⚠ Review pricing' : 'All profitable',
      deltaClass: (critProducts > 0 || lossProducts > 0) ? 'loss' : 'up',
      accent: (critProducts > 0 || lossProducts > 0) ? 'accent-red' : 'accent-green',
      icon: '<svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><polygon points="10.29 3.86 1.82 18 22.18 18 13.71 3.86 10.29 3.86"/><line x1="12" y1="9" x2="12" y2="13"/><line x1="12" y1="17" x2="12.01" y2="17"/></svg>',
      iconColor: (critProducts > 0 || lossProducts > 0) ? 'var(--red)' : 'var(--green)'
    }
  ];

  var metricsEl = document.getElementById('dash-metrics');
  if (metricsEl) {
    metricsEl.innerHTML = metrics.map(function(m, i) {
      return `<div class="metric-card ${m.accent}" style="animation: fadeIn 0.4s ${i * 0.08}s both">
        <div class="metric-card-icon" style="color:${m.iconColor}">${m.icon}</div>
        <div class="metric-val">${m.val}</div>
        <div class="metric-lbl">${m.lbl}</div>
        <div class="metric-delta ${m.deltaClass}">${m.delta}</div>
      </div>`;
    }).join('');
  }

  /* ---- DYNAMIC ALERTS ---- */
  var alerts = [];

  INVENTORY.forEach(function(p) {
    var dl = daysLeft(p);
    if (dl <= 3) {
      alerts.push({
        type: 'danger', kind: 'STOCK CRITICAL', product: p.name,
        detail: 'Only ' + dl + ' day' + (dl !== 1 ? 's' : '') + ' of stock remaining — reorder immediately!',
        badge: 'Reorder Today', badgeClass: 'badge-danger'
      });
    }
  });

  INVENTORY.forEach(function(p) {
    var dl = daysLeft(p);
    if (dl > 3 && dl <= 7) {
      alerts.push({
        type: 'warning', kind: 'LOW STOCK', product: p.name,
        detail: 'Stock runs out in ' + dl + ' days — plan your reorder.',
        badge: 'Plan Reorder', badgeClass: 'badge-warning'
      });
    }
  });

  INVENTORY.forEach(function(p) {
    if (p.price < p.cost) {
      alerts.push({
        type: 'warning', kind: 'LOSS ALERT', product: p.name,
        detail: 'Cost: Rs ' + p.cost + ' — Price: Rs ' + p.price + ' (−' + Math.abs(marginPct(p)) + '% margin)',
        badge: 'Review Pricing', badgeClass: 'badge-warning'
      });
    }
  });

  var topEarner = INVENTORY.slice().sort(function(a,b){ return marginPct(b) - marginPct(a); })[0];
  if (topEarner && marginPct(topEarner) > 20) {
    alerts.push({
      type: 'success', kind: 'TOP EARNER', product: topEarner.name,
      detail: marginPct(topEarner) + '% margin — consider stocking more for higher returns.',
      badge: 'Stock Up', badgeClass: 'badge-success'
    });
  }

  var days = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'];
  var today = days[new Date().getDay()];
  alerts.push({
    type: 'info', kind: 'AI TIP', product: today + ' Tip',
    detail: 'Friday and weekends see higher demand for Soap, Oil, and Beverages. Pre-stock accordingly.',
    badge: 'Pre-Stock', badgeClass: 'badge-info'
  });

  alerts.push({
    type: 'info', kind: 'SEASON BOOST', product: 'Seasonal Planning',
    detail: 'Seasonal demand spike expected — pre-stock high-demand items to avoid stockouts.',
    badge: 'Pre-stock Ready', badgeClass: 'badge-info'
  });

  alerts = alerts.slice(0, 6);

  var alertsEl = document.getElementById('dash-alerts');
  if (alertsEl) {
    alertsEl.innerHTML = alerts.map(function(a, i) {
      return `<div class="alert-card ${a.type}" style="animation: slideInRight 0.35s ${i * 0.07}s both">
        <div class="alert-type">${a.kind}</div>
        <div class="alert-product">${a.product}</div>
        <div class="alert-detail">${a.detail}</div>
        <span class="badge ${a.badgeClass}">${a.badge}</span>
      </div>`;
    }).join('');
  }

  renderTrendChart();

  // Update header alert pill only (do NOT re-render sidebar — that resets nav active state)
  if (typeof updateHeaderStats === 'function') updateHeaderStats();
}
