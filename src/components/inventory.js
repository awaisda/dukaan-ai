/**
 * inventory.js — Dukaan AI v2.0
 * Premium inventory panel — animated table rows, urgency highlights, stock bars
 */

var _activeCat = 'all';

function renderInventoryPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-inventory" class="panel">
      <div class="page-header-row">
        <div>
          <div class="page-title">Inventory Status</div>
          <div class="page-sub">Live stock levels, days remaining, and reorder alerts</div>
        </div>
        <div id="inv-count-badge" class="inv-count-badge"></div>
      </div>

      <div class="table-card">
        <!-- Controls -->
        <div style="padding:14px 14px 0">
          <div class="inv-controls">
            <div class="inv-search-wrap">
              <div class="inv-search-icon">
                <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
              </div>
              <input
                type="text"
                id="inv-search"
                class="inv-search"
                placeholder="Search by name or category…"
                oninput="filterInventory()"
                autocomplete="off"
              />
            </div>
            <select id="inv-sort" class="inv-sort" onchange="filterInventory()">
              <option value="name">Sort: A–Z</option>
              <option value="days_asc">Days Left ↑</option>
              <option value="days_desc">Days Left ↓</option>
              <option value="stock_asc">Stock ↑</option>
              <option value="stock_desc">Stock ↓</option>
              <option value="margin_desc">Margin ↓</option>
            </select>
          </div>
          <div class="cat-filter" id="cat-filter"></div>
        </div>

        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:24%">Product</th>
                <th style="width:12%">Category</th>
                <th style="width:11%">Stock</th>
                <th style="width:20%">Level</th>
                <th style="width:10%">Days Left</th>
                <th style="width:11%">Margin</th>
                <th style="width:12%">Status</th>
              </tr>
            </thead>
            <tbody id="inv-tbody"></tbody>
          </table>
        </div>
      </div>

      <div class="tip-box" id="inv-tip"></div>
    </div>
  `;
}

function buildInventoryTable() {
  var tbody = document.getElementById('inv-tbody');
  if (!tbody) return;

  buildCatFilter();

  // Skeleton loader
  tbody.innerHTML = Array(6).fill(
    `<tr class="skeleton-row">
      <td><div class="skeleton-line" style="width:80%"></div></td>
      <td><div class="skeleton-line" style="width:60%"></div></td>
      <td><div class="skeleton-line" style="width:50%"></div></td>
      <td><div class="skeleton-line"></div></td>
      <td><div class="skeleton-line" style="width:40%"></div></td>
      <td><div class="skeleton-line" style="width:50%"></div></td>
      <td><div class="skeleton-line" style="width:55%"></div></td>
    </tr>`
  ).join('');

  setTimeout(function() { filterInventory(); }, 350);

  // Dynamic AI tip
  var critCount = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; }).length;
  var lowCount  = INVENTORY.filter(function(p){ var d = daysLeft(p); return d > 3 && d <= 7; }).length;
  var lossCount = INVENTORY.filter(function(p){ return p.price < p.cost; }).length;
  var tipEl = document.getElementById('inv-tip');
  if (tipEl) {
    var msgs = [];
    if (critCount > 0) msgs.push('<strong>' + critCount + ' product' + (critCount>1?'s':'')+' running out in ≤3 days</strong> — reorder immediately.');
    if (lowCount  > 0) msgs.push(lowCount + ' product' + (lowCount>1?'s':'') + ' going low in 7 days — plan your reorder.');
    if (lossCount > 0) msgs.push(lossCount + ' product' + (lossCount>1?'s':'') + ' selling below cost — visit Loss Detector.');
    if (msgs.length === 0) msgs.push('All stock levels are healthy. No critical alerts in the next 7 days. 🎉');
    tipEl.innerHTML = '<strong>AI Prediction:</strong> ' + msgs.join(' ');
  }
}

function buildCatFilter() {
  var filterEl = document.getElementById('cat-filter');
  if (!filterEl) return;

  var cats = ['all'].concat(
    INVENTORY.map(function(p){ return p.cat; })
      .filter(function(c, i, arr){ return arr.indexOf(c) === i; })
      .sort()
  );

  // Count per category
  var counts = {};
  INVENTORY.forEach(function(p){ counts[p.cat] = (counts[p.cat] || 0) + 1; });

  filterEl.innerHTML = cats.map(function(c) {
    var count = c === 'all' ? INVENTORY.length : (counts[c] || 0);
    return `<button class="cat-pill ${c === _activeCat ? 'active' : ''}" onclick="setCatFilter('${c}')">
      ${c === 'all' ? 'All' : c}
      <span class="cat-pill-count">${count}</span>
    </button>`;
  }).join('');
}

function setCatFilter(cat) {
  _activeCat = cat;
  document.querySelectorAll('.cat-pill').forEach(function(btn) {
    var label = btn.textContent.trim().replace(/\d+/g,'').trim();
    btn.classList.toggle('active', label === (cat === 'all' ? 'All' : cat));
  });
  filterInventory();
}

function filterInventory() {
  var tbody  = document.getElementById('inv-tbody');
  if (!tbody) return;

  var query  = (document.getElementById('inv-search') ? document.getElementById('inv-search').value : '').toLowerCase().trim();
  var sortBy = document.getElementById('inv-sort') ? document.getElementById('inv-sort').value : 'name';

  var filtered = INVENTORY.filter(function(p) {
    var matchCat    = _activeCat === 'all' || p.cat === _activeCat;
    var matchSearch = !query || p.name.toLowerCase().includes(query) || p.cat.toLowerCase().includes(query);
    return matchCat && matchSearch;
  });

  filtered = filtered.slice().sort(function(a, b) {
    if (sortBy === 'name')         return a.name.localeCompare(b.name);
    if (sortBy === 'days_asc')     return daysLeft(a) - daysLeft(b);
    if (sortBy === 'days_desc')    return daysLeft(b) - daysLeft(a);
    if (sortBy === 'stock_asc')    return a.stock - b.stock;
    if (sortBy === 'stock_desc')   return b.stock - a.stock;
    if (sortBy === 'margin_desc')  return marginPct(b) - marginPct(a);
    return 0;
  });

  // Update count badge
  var badge = document.getElementById('inv-count-badge');
  if (badge) {
    badge.textContent = filtered.length + ' / ' + INVENTORY.length + ' products';
    badge.style.display = '';
  }

  if (filtered.length === 0) {
    tbody.innerHTML = `<tr><td colspan="7" class="table-empty-state">
      <div style="font-size:32px;margin-bottom:10px">📭</div>
      <div>No products match your search.</div>
      <div style="font-size:11px;color:var(--text3);margin-top:4px">Try a different name or category.</div>
    </td></tr>`;
    return;
  }

  var maxStock = Math.max.apply(null, INVENTORY.map(function(p){ return p.stock; }));

  var rows = filtered.map(function(p, i) {
    var dl       = daysLeft(p);
    var pct      = maxStock > 0 ? Math.round((p.stock / maxStock) * 100) : 0;
    var status   = stockStatus(p);
    var color    = barColor(dl);
    var pc       = pillClass(status);
    var pl       = pillLabel(status);
    var dlDisplay = dl === 999 ? '∞' : dl;
    var margin   = marginPct(p);
    var isLoss   = margin < 0;

    // Pulse glow on critical rows
    var rowClass = dl <= 3 ? 'row-critical' : '';

    return `<tr class="${rowClass}" style="animation: fadeIn 0.3s ${i * 0.04}s both">
      <td>
        <div style="font-weight:600;color:var(--text);font-size:13px">${p.name}</div>
        <div style="font-size:10px;color:var(--text3);font-family:var(--mono);margin-top:1px">ID #${p.id}</div>
      </td>
      <td><span class="cat-tag">${p.cat}</span></td>
      <td style="font-family:var(--mono);font-size:13px">${p.stock}
        <span style="font-size:10px;color:var(--text3)">u</span>
      </td>
      <td>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
        <div style="font-size:9px;color:var(--text3);margin-top:2px;font-family:var(--mono)">${pct}% of max</div>
      </td>
      <td style="font-family:var(--mono);font-size:13px;color:${color};font-weight:600">${dlDisplay}
        <span style="font-size:10px;font-weight:400;color:var(--text3)">d</span>
      </td>
      <td style="font-family:var(--mono);font-size:12px;color:${isLoss ? 'var(--red)' : 'var(--green)'}">
        ${isLoss ? '' : '+'}${margin}%
      </td>
      <td><span class="pill ${pc}">${pl}</span></td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');
}
