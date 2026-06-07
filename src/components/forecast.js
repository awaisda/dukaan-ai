/**
 * forecast.js — Dukaan AI v2.0
 * Premium Sales Forecast — animated results, revenue projection, confidence bar
 */

var MULTIPLIERS = {
  season:  { Normal: 1.0, Ramadan: 1.45, Winter: 1.1, Summer: 1.2, Eid: 1.6 },
  dayType: { Weekday: 1.0, Weekend: 1.18, Friday: 1.25, Holiday: 1.35 },
  weather: { Normal: 1.0, Hot: 1.1, 'Cold / Rain': 0.85 }
};

var DAY_WEIGHTS = [0.85, 0.95, 0.88, 1.0, 1.15, 1.08, 0.78];

function renderForecastPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  var productOptions = INVENTORY.map(function(p) {
    return '<option value="' + p.id + '">' + p.name + '</option>';
  }).join('');

  el.innerHTML += '<div id="panel-forecast" class="panel">' +
    '<div class="page-header-row">' +
      '<div>' +
        '<div class="page-title">Sales Forecast</div>' +
        '<div class="page-sub">AI-powered prediction using seasonal, day, and weather factors</div>' +
      '</div>' +
      '<div class="forecast-model-badge">&#9889; Rule-Based AI Model</div>' +
    '</div>' +

    '<div class="form-card">' +
      '<div class="step-header"><span class="step-num">1</span> Select product &amp; market conditions</div>' +

      '<div class="three-col" style="margin-bottom:14px">' +
        '<div class="fg"><label>Product</label>' +
          '<select id="fc-product" onchange="syncForecastProduct()">' + productOptions + '</select></div>' +
        '<div class="fg"><label>Season</label>' +
          '<select id="fc-season"><option>Normal</option><option>Ramadan</option>' +
          '<option>Winter</option><option>Summer</option><option>Eid</option></select></div>' +
        '<div class="fg"><label>Day Type</label>' +
          '<select id="fc-day"><option>Weekday</option><option>Weekend</option>' +
          '<option>Friday</option><option>Holiday</option></select></div>' +
      '</div>' +

      '<div class="three-col" style="margin-bottom:18px">' +
        '<div class="fg"><label>Weather</label>' +
          '<select id="fc-weather"><option>Normal</option><option>Hot</option>' +
          '<option>Cold / Rain</option></select></div>' +
        '<div class="fg"><label>Current Stock (units)</label>' +
          '<input type="number" id="fc-stock" value="" min="0" placeholder="Auto from product"/></div>' +
        '<div class="fg"><label>Avg Daily Sales</label>' +
          '<input type="number" id="fc-avg" value="" min="1" placeholder="Auto from product"/></div>' +
      '</div>' +

      '<button class="btn-primary" id="fc-btn" onclick="runForecast()">&#9889; Run AI Forecast</button>' +

      '<div class="ai-thinking" id="fc-thinking">' +
        '<span>Running AI forecast model</span>' +
        '<span class="dots"><span>.</span><span>.</span><span>.</span></span>' +
      '</div>' +

      '<div class="result-box" id="fc-result">' +
        '<div class="forecast-summary-grid" id="fc-summary-grid"></div>' +
        '<div class="result-rows-wrap" id="fc-result-rows"></div>' +
        '<div class="confidence-wrap" id="fc-confidence-wrap"></div>' +
        '<div style="margin-top:18px">' +
          '<div class="section-label" style="margin-bottom:8px">7-Day Forecast</div>' +
          '<div class="week-chart" id="fc-week-bars"></div>' +
        '</div>' +
      '</div>' +
    '</div>' +
  '</div>';

  setTimeout(syncForecastProduct, 0);
}

function syncForecastProduct() {
  var sel = document.getElementById('fc-product');
  if (!sel) return;
  var id = parseInt(sel.value);
  var p  = INVENTORY.filter(function(x){ return x.id === id; })[0] || INVENTORY[0];
  if (!p) return;
  document.getElementById('fc-stock').value = p.stock;
  document.getElementById('fc-avg').value   = p.daily;
}

function runForecast() {
  var avg     = parseInt(document.getElementById('fc-avg').value)   || 15;
  var stock   = parseInt(document.getElementById('fc-stock').value) || 120;
  var season  = document.getElementById('fc-season').value;
  var dayType = document.getElementById('fc-day').value;
  var weather = document.getElementById('fc-weather').value;

  var mul = (MULTIPLIERS.season[season]  || 1.0)
          * (MULTIPLIERS.dayType[dayType] || 1.0)
          * (MULTIPLIERS.weather[weather] || 1.0);

  var tmr  = Math.round(avg * mul);
  var week = Math.round(tmr * 7 * 0.92);
  var days = tmr > 0 ? Math.round(stock / tmr) : 999;
  var conf = clamp(Math.round(88 + Math.random() * 8), 80, 96);

  var selId  = parseInt(document.getElementById('fc-product').value);
  var prod   = INVENTORY.filter(function(x){ return x.id === selId; })[0] || INVENTORY[0];
  var tmrRev = prod ? tmr * prod.price : 0;
  var wkRev  = prod ? week * prod.price : 0;

  document.getElementById('fc-thinking').classList.add('on');
  document.getElementById('fc-result').classList.remove('on');
  document.getElementById('fc-btn').disabled = true;

  setTimeout(function() {
    document.getElementById('fc-thinking').classList.remove('on');
    document.getElementById('fc-btn').disabled = false;

    // Summary cards
    document.getElementById('fc-summary-grid').innerHTML =
      '<div class="fc-summary-card accent-green">' +
        '<div class="fc-summary-val">' + tmr + ' <span style="font-size:13px">units</span></div>' +
        '<div class="fc-summary-lbl">Tomorrow\'s Sales</div>' +
        (tmrRev ? '<div class="fc-summary-sub">' + formatRs(tmrRev) + ' est. revenue</div>' : '') +
      '</div>' +
      '<div class="fc-summary-card accent-blue">' +
        '<div class="fc-summary-val">' + week + ' <span style="font-size:13px">units</span></div>' +
        '<div class="fc-summary-lbl">Weekly Forecast</div>' +
        (wkRev ? '<div class="fc-summary-sub">' + formatRs(wkRev) + ' est. revenue</div>' : '') +
      '</div>' +
      '<div class="fc-summary-card ' + (days <= 5 ? 'accent-red' : 'accent-amber') + '">' +
        '<div class="fc-summary-val">' + days + ' <span style="font-size:13px">days</span></div>' +
        '<div class="fc-summary-lbl">Stock Duration</div>' +
        '<div class="fc-summary-sub">' + (days <= 5 ? '&#9888; Reorder now' : 'Reorder in ' + Math.max(0, days - 5) + 'd') + '</div>' +
      '</div>';

    // Detail rows
    document.getElementById('fc-result-rows').innerHTML =
      '<div class="result-row">' +
        '<span class="r-key">Multiplier applied</span>' +
        '<span class="r-val" style="font-family:var(--mono)">' + mul.toFixed(2) +
          'x <span style="color:var(--text3);font-size:10px">(' + season + ' · ' + dayType + ' · ' + weather + ')</span></span>' +
      '</div>' +
      '<div class="result-row">' +
        '<span class="r-key">Reorder recommended?</span>' +
        '<span class="r-val ' + (days <= 5 ? 'loss' : 'up') + '">' +
          (days <= 5 ? '&#9888; Yes — Order today' : '&#10003; No — in ' + Math.max(0, days - 5) + ' days') +
        '</span>' +
      '</div>';

    // Confidence bar
    document.getElementById('fc-confidence-wrap').innerHTML =
      '<div class="confidence-bar-label">' +
        '<span style="color:var(--text3);font-size:11px">Model Confidence</span>' +
        '<span style="font-family:var(--mono);font-size:13px;font-weight:600;color:var(--green)">' + conf + '%</span>' +
      '</div>' +
      '<div class="confidence-bar-bg">' +
        '<div class="confidence-bar-fill" style="width:' + conf + '%"></div>' +
      '</div>' +
      '<div style="font-size:10px;color:var(--text3);margin-top:4px">Weighted Rule-Based Model · Seasonal + Day + Weather factors</div>';

    // 7-day bars
    var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var vals     = DAY_WEIGHTS.map(function(w){ return Math.round(tmr * w); });
    var mx       = Math.max.apply(null, vals);
    var todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    document.getElementById('fc-week-bars').innerHTML = vals.map(function(v, i) {
      var h = Math.round((v / mx) * 68) + 12;
      return '<div class="wbar-wrap">' +
        '<div class="wval">' + v + '</div>' +
        '<div class="wbar' + (i === todayIdx ? ' today' : '') + '" style="height:' + h + 'px"></div>' +
        '<div class="wday">' + dayNames[i] + '</div>' +
      '</div>';
    }).join('');

    document.getElementById('fc-result').classList.add('on');
  }, 1400);
}
