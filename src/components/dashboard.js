/**
 * dashboard.js — Dukaan AI
 * Fully dynamic dashboard — all metrics & alerts from INVENTORY data
 */

function renderDashboardPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-dashboard" class="panel active">
      <div class="page-title">Dashboard</div>
      <div class="page-sub" id="dash-date">Aaj ka overview</div>

      <!-- METRICS -->
      <div class="four-col" id="dash-metrics"></div>

      <!-- ALERTS -->
      <div class="section-label">Live Alerts</div>
      <div class="alerts-grid" id="dash-alerts"></div>

      <!-- CHART -->
      <div class="section-label">Weekly Sales Trend</div>
      <div class="chart-card" style="height:230px">
        <canvas id="trendChart" style="height:185px"></canvas>
      </div>
    </div>
  `;
}

function buildDashboard() {
  document.getElementById('dash-date').textContent = 'Aaj ka overview — ' + todayStr();

  /* ---- METRICS ---- */
  var totalProducts = INVENTORY.length;
  var reorderAlerts = INVENTORY.filter(function(p){ return p.stock <= p.reorder; }).length;
  var lossProducts  = INVENTORY.filter(function(p){ return p.price < p.cost; }).length;

  // Estimate weekly revenue: sum(price * daily * 7) for profitable items
  var weeklyRev = INVENTORY.reduce(function(sum, p){
    return sum + (p.price * p.daily * 7);
  }, 0);

  var metricsEl = document.getElementById('dash-metrics');
  if (metricsEl) {
    metricsEl.innerHTML = `
      <div class="metric-card">
        <div class="metric-val">${totalProducts}</div>
        <div class="metric-lbl">Total Products</div>
        <div class="metric-delta up">▲ ${totalProducts} active SKUs</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color:${reorderAlerts>0?'var(--amber)':'var(--green)'}">${reorderAlerts}</div>
        <div class="metric-lbl">Reorder Alerts</div>
        <div class="metric-delta ${reorderAlerts>0?'dn':'up'}">${reorderAlerts>0?'⚠ Action needed':'✓ Stock healthy'}</div>
      </div>
      <div class="metric-card">
        <div class="metric-val">${formatRs(weeklyRev)}</div>
        <div class="metric-lbl">Est. Weekly Revenue</div>
        <div class="metric-delta up">▲ Based on daily sales</div>
      </div>
      <div class="metric-card">
        <div class="metric-val" style="color:${lossProducts>0?'var(--red)':'var(--green)'}">${lossProducts}</div>
        <div class="metric-lbl">Loss Products</div>
        <div class="metric-delta ${lossProducts>0?'loss':'up'}">${lossProducts>0?'⚠ Review pricing':'✓ All profitable'}</div>
      </div>
    `;
  }

  /* ---- DYNAMIC ALERTS ---- */
  var alerts = [];

  // Critical stock alerts
  INVENTORY.forEach(function(p) {
    var dl = daysLeft(p);
    if (dl <= 3) {
      alerts.push({ type:'danger', kind:'STOCK CRITICAL', product: p.name,
        detail: 'Sirf ' + dl + ' din ka stock bacha — turant reorder karo!',
        badge: 'Reorder Today', badgeClass: 'badge-danger' });
    }
  });

  // Low stock alerts
  INVENTORY.forEach(function(p) {
    var dl = daysLeft(p);
    if (dl > 3 && dl <= 7) {
      alerts.push({ type:'warning', kind:'LOW STOCK', product: p.name,
        detail: dl + ' din baad stock khatam — reorder plan karo',
        badge: 'Plan Reorder', badgeClass: 'badge-warning' });
    }
  });

  // Loss alerts
  INVENTORY.forEach(function(p) {
    if (p.price < p.cost) {
      alerts.push({ type:'warning', kind:'LOSS ALERT', product: p.name,
        detail: 'Cost: Rs ' + p.cost + ' — Price: Rs ' + p.price + ' (−' + Math.abs(marginPct(p)) + '% margin)',
        badge: 'Review Pricing', badgeClass: 'badge-warning' });
    }
  });

  // High margin products (top earners)
  var topEarner = INVENTORY.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); })[0];
  if (topEarner && marginPct(topEarner) > 20) {
    alerts.push({ type:'success', kind:'TOP EARNER', product: topEarner.name,
      detail: marginPct(topEarner) + '% margin — is product ki stock barhaao',
      badge: 'Stock Up', badgeClass: 'badge-success' });
  }

  // Friday tip
  alerts.push({ type:'info', kind:'AI TIP', product: todayName() + ' Tip',
    detail: 'Juma aur weekend pe Soap, Oil aur Beverage demand zyada hoti hai',
    badge: 'Pre-Stock', badgeClass: 'badge-info' });

  // Season tip
  alerts.push({ type:'info', kind:'SEASON BOOST', product: 'Ramadan Items',
    detail: 'Dates, Rooh Afza, Oil demand high — pre-stock ready rakhein',
    badge: 'Pre-stock Ready', badgeClass: 'badge-info' });

  // Limit to 6 alerts max
  alerts = alerts.slice(0, 6);

  var alertsEl = document.getElementById('dash-alerts');
  if (alertsEl) {
    alertsEl.innerHTML = alerts.map(function(a) {
      return `<div class="alert-card ${a.type}">
        <div class="alert-type">${a.kind}</div>
        <div class="alert-product">${a.product}</div>
        <div class="alert-detail">${a.detail}</div>
        <span class="badge ${a.badgeClass}">${a.badge}</span>
      </div>`;
    }).join('');
  }

  renderTrendChart();
}
