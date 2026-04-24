/**
 * inventory.js — Dukaan AI
 * Inventory panel — table with dynamic stock bars
 */

function renderInventoryPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-inventory" class="panel">
      <div class="page-title">Inventory Status</div>
      <div class="page-sub">Sare products ki stock level aur alert status</div>

      <div class="table-card">
        <div class="table-wrap">
          <table class="data-table">
            <thead>
              <tr>
                <th style="width:24%">Product</th>
                <th style="width:13%">Category</th>
                <th style="width:12%">Stock</th>
                <th style="width:22%">Level</th>
                <th style="width:13%">Days Left</th>
                <th style="width:16%">Status</th>
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

  // Dynamic max stock for relative bar widths
  var maxStock = Math.max.apply(null, INVENTORY.map(function(p){ return p.stock; }));

  var rows = INVENTORY.map(function(p) {
    var dl     = daysLeft(p);
    var pct    = maxStock > 0 ? Math.round((p.stock / maxStock) * 100) : 0;
    var status = stockStatus(p);
    var color  = barColor(dl);
    var pc     = pillClass(status);
    var pl     = pillLabel(status);
    var dlDisplay = dl === 999 ? '∞' : dl;

    return `<tr>
      <td><strong style="color:var(--text)">${p.name}</strong></td>
      <td><span style="font-size:11px;color:var(--text2)">${p.cat}</span></td>
      <td style="font-family:var(--mono);font-size:12px">${p.stock} <span style="color:var(--text3)">units</span></td>
      <td>
        <div class="bar-bg">
          <div class="bar-fill" style="width:${pct}%;background:${color}"></div>
        </div>
      </td>
      <td style="font-family:var(--mono);font-size:12px;color:${color}">${dlDisplay} <span style="color:var(--text3)">days</span></td>
      <td><span class="pill ${pc}">${pl}</span></td>
    </tr>`;
  });

  tbody.innerHTML = rows.join('');

  // Dynamic AI tip
  var critCount = INVENTORY.filter(function(p){ return daysLeft(p)<=3; }).length;
  var lowCount  = INVENTORY.filter(function(p){ var d=daysLeft(p); return d>3&&d<=7; }).length;
  var tipEl = document.getElementById('inv-tip');
  if (tipEl) {
    tipEl.innerHTML = '<strong>AI Prediction:</strong> ' +
      (critCount > 0 ? critCount + ' product(s) 3 din mein khatam — TURANT reorder karo. ' : '') +
      (lowCount  > 0 ? lowCount  + ' product(s) 7 din mein low — reorder plan banao. ' : '') +
      (critCount === 0 && lowCount === 0 ? 'Sab products ka stock theek hai. Agli 7 din mein koi critical alert nahi.' : '');
  }
}
