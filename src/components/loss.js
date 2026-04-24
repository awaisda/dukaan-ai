/**
 * loss.js — Dukaan AI
 * Loss Detector panel — margin analysis per product
 */

function renderLossPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-loss" class="panel">
      <div class="page-title">Loss Detector</div>
      <div class="page-sub">Har product ka profit / loss margin analysis</div>

      <div class="two-col">
        <!-- Chart -->
        <div class="chart-card" style="height:240px">
          <div class="section-label">Margin % by Product</div>
          <canvas id="lossChart" style="height:180px"></canvas>
        </div>
        <!-- Summary -->
        <div class="summary-box">
          <div id="loss-summary"></div>
        </div>
      </div>

      <div class="section-label">Product Detail</div>
      <div class="table-card">
        <div id="loss-body"></div>
      </div>

      <div class="tip-box" id="loss-tip"></div>
    </div>
  `;
}

/**
 * Populate loss panel content (rows + summary + chart)
 * Called by router on panel switch
 */
function buildLossPanel() {
  buildLossRows();
  buildLossSummary();
  buildLossTip();
  renderLossChart();
}

function buildLossTip() {
  var el = document.getElementById('loss-tip');
  if (!el) return;
  var lossProds = INVENTORY.filter(function(p) { return p.price < p.cost; });
  if (lossProds.length === 0) {
    el.innerHTML = '<strong>AI Recommendation:</strong> Sab products profitable hain! Accha kaam kar rahe ho. High-margin items ki stock barhaao.';
  } else {
    var names = lossProds.map(function(p) {
      return p.name + ' (cost Rs ' + p.cost + ', price Rs ' + p.price + ')';
    }).join(', ');
    el.innerHTML = '<strong>AI Recommendation:</strong> ' + lossProds.length + ' product(s) loss mein hain: ' + names + '. Inki pricing review karo ya supplier se negotiate karo.';
  }
}

function buildLossRows() {
  var body = document.getElementById('loss-body');
  if (!body) return;

  var html = INVENTORY.map(function(p) {
    var margin = marginPct(p);
    var rs     = p.price - p.cost;
    var isLoss = margin < 0;

    return `<div class="loss-item">
      <div>
        <div class="loss-name">${p.name}</div>
        <div class="loss-meta">${p.cat} · Price: Rs ${p.price} · Cost: Rs ${p.cost}</div>
      </div>
      <div class="loss-amt">
        <div class="loss-rs ${isLoss ? 'neg' : 'pos'}">${isLoss ? '' : '+'}Rs ${rs} / unit</div>
        <span class="pill ${isLoss ? 'pill-loss' : 'pill-profit'}">${isLoss ? 'Loss' : 'Profit'} ${Math.abs(margin)}%</span>
      </div>
    </div>`;
  });

  body.innerHTML = html.join('');
}

function buildLossSummary() {
  var el = document.getElementById('loss-summary');
  if (!el) return;

  var losses  = INVENTORY.filter(function(p) { return p.price < p.cost; }).length;
  var profits = INVENTORY.length - losses;
  var avgM    = Math.round(INVENTORY.reduce(function(a, p) {
    return a + marginPct(p);
  }, 0) / INVENTORY.length);

  el.innerHTML = `
    <div style="margin-bottom:10px; font-size:13px; font-weight:600; color:var(--text)">Summary</div>
    <div style="margin-bottom:8px">📦 Total Products: <strong style="color:var(--text)">${INVENTORY.length}</strong></div>
    <div style="margin-bottom:8px">✅ Profitable: <strong style="color:var(--green)">${profits} products</strong></div>
    <div style="margin-bottom:8px">❌ Loss-making: <strong style="color:var(--red)">${losses} products</strong></div>
    <div style="margin-bottom:8px">📊 Avg Margin: <strong style="color:var(--text)">${avgM}%</strong></div>
    ${losses > 0 ? `<div style="color:var(--amber); font-size:11px; margin-top:12px; line-height:1.6">⚠ ${losses} products mein selling price cost se kam hai. Inhe turant review karein.</div>` : ''}
  `;
}
