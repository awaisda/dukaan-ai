/**
 * loss.js — Dukaan AI v2.0
 * Premium Loss Detector — margin analysis, animated bars, summary cards
 */

function renderLossPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += '<div id="panel-loss" class="panel">' +
    '<div class="page-header-row">' +
      '<div>' +
        '<div class="page-title">Loss Detector</div>' +
        '<div class="page-sub">Profit and loss margin analysis for every product</div>' +
      '</div>' +
      '<div id="loss-summary-pills"></div>' +
    '</div>' +

    '<div class="two-col">' +
      '<div class="chart-card" style="height:240px">' +
        '<div class="section-label">Margin % by Product</div>' +
        '<canvas id="lossChart" style="height:190px"></canvas>' +
      '</div>' +
      '<div class="summary-box"><div id="loss-summary"></div></div>' +
    '</div>' +

    '<div class="section-label">Product Detail</div>' +
    '<div class="table-card"><div id="loss-body"></div></div>' +

    '<div class="tip-box" id="loss-tip"></div>' +
  '</div>';
}

function buildLossPanel() {
  buildLossRows();
  buildLossSummary();
  buildLossTip();
  renderLossChart();
}

function buildLossTip() {
  var el = document.getElementById('loss-tip');
  if (!el) return;
  var lossProds = INVENTORY.filter(function(p){ return p.price < p.cost; });
  if (lossProds.length === 0) {
    el.innerHTML = '<strong>AI Recommendation:</strong> All products are profitable! Great work. Consider increasing stock for your highest-margin items to maximise revenue.';
  } else {
    var names = lossProds.map(function(p){
      return p.name + ' (cost Rs ' + p.cost + ', price Rs ' + p.price + ')';
    }).join(', ');
    el.innerHTML = '<strong>AI Recommendation:</strong> ' + lossProds.length +
      ' product(s) are selling below cost: ' + names +
      '. Review their pricing or negotiate with your supplier immediately.';
  }
}

function buildLossRows() {
  var body = document.getElementById('loss-body');
  if (!body) return;

  var sorted = INVENTORY.slice().sort(function(a, b){ return marginPct(a) - marginPct(b); });

  body.innerHTML = sorted.map(function(p, i) {
    var margin   = marginPct(p);
    var rs       = p.price - p.cost;
    var isLoss   = margin < 0;
    var barWidth = Math.min(Math.abs(margin), 100);
    var delay    = (i * 0.04).toFixed(2);

    return '<div class="loss-item" style="animation: fadeIn 0.35s ' + delay + 's both">' +
      '<div style="flex:1;min-width:0">' +
        '<div class="loss-name">' + p.name + '</div>' +
        '<div class="loss-meta">' + p.cat +
          ' &nbsp;·&nbsp; Price: <strong style="color:var(--text)">Rs ' + p.price + '</strong>' +
          ' &nbsp;·&nbsp; Cost: <strong style="color:var(--text)">Rs ' + p.cost + '</strong>' +
        '</div>' +
        '<div class="loss-bar-wrap">' +
          '<div class="loss-bar-fill" style="width:' + barWidth + '%;background:' +
            (isLoss ? 'var(--red)' : (margin > 25 ? 'var(--green)' : 'var(--amber)')) +
            ';transition:width 0.6s ' + delay + 's ease"></div>' +
        '</div>' +
      '</div>' +
      '<div class="loss-amt">' +
        '<div class="loss-rs ' + (isLoss ? 'neg' : 'pos') + '">' +
          (isLoss ? '&#8722;' : '+') + 'Rs ' + Math.abs(rs) + ' / unit' +
        '</div>' +
        '<span class="pill ' + (isLoss ? 'pill-loss' : 'pill-profit') + '">' +
          (isLoss ? 'Loss' : 'Profit') + ' ' + Math.abs(margin) + '%' +
        '</span>' +
      '</div>' +
    '</div>';
  }).join('');
}

function buildLossSummary() {
  var el = document.getElementById('loss-summary');
  if (!el) return;

  var losses  = INVENTORY.filter(function(p){ return p.price < p.cost; }).length;
  var profits = INVENTORY.length - losses;
  var avgM    = Math.round(INVENTORY.reduce(function(a, p){ return a + marginPct(p); }, 0) / INVENTORY.length);
  var topM    = Math.max.apply(null, INVENTORY.map(marginPct));
  var topProd = INVENTORY.filter(function(p){ return marginPct(p) === topM; })[0];

  // Pills at top of page
  var pillsEl = document.getElementById('loss-summary-pills');
  if (pillsEl) {
    pillsEl.innerHTML =
      '<span class="summary-pill pill-profit">&#10003; ' + profits + ' Profitable</span>' +
      (losses > 0 ? '<span class="summary-pill pill-loss">&#9888; ' + losses + ' Loss</span>' : '') +
      '<span class="summary-pill" style="background:var(--blue-dim);color:var(--blue)">Avg ' + avgM + '% margin</span>';
  }

  el.innerHTML =
    '<div style="margin-bottom:12px;font-size:13px;font-weight:700;color:var(--text)">Store Margin Summary</div>' +
    '<div class="loss-summary-row"><span>&#128230; Total Products</span><strong style="color:var(--text)">' + INVENTORY.length + '</strong></div>' +
    '<div class="loss-summary-row"><span>&#10003; Profitable</span><strong style="color:var(--green)">' + profits + ' products</strong></div>' +
    '<div class="loss-summary-row"><span>&#10007; Loss-making</span><strong style="color:' + (losses > 0 ? 'var(--red)' : 'var(--green)') + '">' + losses + ' products</strong></div>' +
    '<div class="loss-summary-row"><span>&#128200; Avg Margin</span><strong style="color:' + (avgM >= 15 ? 'var(--green)' : avgM >= 0 ? 'var(--amber)' : 'var(--red)') + '">' + avgM + '%</strong></div>' +
    (topProd ? '<div class="loss-summary-row"><span>&#127942; Best Margin</span><strong style="color:var(--green)">' + topProd.name + ' (' + topM + '%)</strong></div>' : '') +
    (losses > 0 ? '<div class="loss-warning-box">&#9888; ' + losses + ' product(s) have selling price below cost. Immediate review needed.</div>' : '<div class="loss-ok-box">&#10003; All products are profitable. Great store health!</div>');
}
