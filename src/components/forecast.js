/**
 * forecast.js — Dukaan AI
 * Sales Forecast panel — auto-fills stock/avg from selected product
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
    return `<option value="${p.id}">${p.name}</option>`;
  }).join('');

  el.innerHTML += `
    <div id="panel-forecast" class="panel">
      <div class="page-title">Sales Forecast</div>
      <div class="page-sub">AI model se kal aur aagle hafte ki sales predict karo</div>

      <div class="form-card">
        <div class="step-header"><span class="step-num">1</span> Product aur conditions chunein</div>

        <div class="three-col" style="margin-bottom:12px">
          <div class="fg">
            <label>Product</label>
            <select id="fc-product" onchange="syncForecastProduct()">${productOptions}</select>
          </div>
          <div class="fg">
            <label>Season</label>
            <select id="fc-season">
              <option>Normal</option><option>Ramadan</option>
              <option>Winter</option><option>Summer</option><option>Eid</option>
            </select>
          </div>
          <div class="fg">
            <label>Day Type</label>
            <select id="fc-day">
              <option>Weekday</option><option>Weekend</option>
              <option>Friday</option><option>Holiday</option>
            </select>
          </div>
        </div>

        <div class="three-col" style="margin-bottom:14px">
          <div class="fg">
            <label>Weather</label>
            <select id="fc-weather">
              <option>Normal</option><option>Hot</option><option>Cold / Rain</option>
            </select>
          </div>
          <div class="fg">
            <label>Current Stock (units)</label>
            <input type="number" id="fc-stock" value="" min="0" placeholder="Auto from product" />
          </div>
          <div class="fg">
            <label>Avg Daily Sales</label>
            <input type="number" id="fc-avg" value="" min="1" placeholder="Auto from product" />
          </div>
        </div>

        <button class="btn-primary" id="fc-btn" onclick="runForecast()">🔮 Run AI Forecast</button>

        <div class="ai-thinking" id="fc-thinking">
          <span>AI model chal raha hai</span>
          <span class="dots"><span>.</span><span>.</span><span>.</span></span>
        </div>

        <div class="result-box" id="fc-result">
          <div class="result-row">
            <span class="r-key">Kal predicted sales</span>
            <span class="r-big" id="r-tomorrow">—</span>
          </div>
          <div class="result-row">
            <span class="r-key">Is hafte total forecast</span>
            <span class="r-val" id="r-week">—</span>
          </div>
          <div class="result-row">
            <span class="r-key">Stock khatam hoga</span>
            <span class="r-val" id="r-days">—</span>
          </div>
          <div class="result-row">
            <span class="r-key">Reorder banana chahiye?</span>
            <span class="r-val" id="r-reorder">—</span>
          </div>
          <div class="result-row">
            <span class="r-key">Model confidence</span>
            <span class="r-val" id="r-conf">—</span>
          </div>
          <div style="margin-top:14px">
            <div class="section-label" style="margin-bottom:6px">7-Day Forecast</div>
            <div class="week-chart" id="fc-week-bars"></div>
          </div>
        </div>
      </div>
    </div>
  `;

  // Auto-fill first product on render
  setTimeout(syncForecastProduct, 0);
}

function syncForecastProduct() {
  var sel = document.getElementById('fc-product');
  if (!sel) return;
  var id  = parseInt(sel.value);
  var p   = INVENTORY.filter(function(x){ return x.id === id; })[0]
          || INVENTORY[0];
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

  document.getElementById('fc-thinking').classList.add('on');
  document.getElementById('fc-result').classList.remove('on');
  document.getElementById('fc-btn').disabled = true;

  setTimeout(function() {
    document.getElementById('fc-thinking').classList.remove('on');
    document.getElementById('fc-btn').disabled = false;

    document.getElementById('r-tomorrow').textContent = tmr + ' units';
    document.getElementById('r-week').textContent     = week + ' units';
    document.getElementById('r-days').textContent     = days + ' din baad';
    document.getElementById('r-reorder').textContent  =
      days <= 5 ? 'Haan — Aaj hi order karo ⚠' : 'Nahin — ' + Math.max(0,days-5) + ' din baad';
    document.getElementById('r-conf').textContent     = conf + '% (Weighted Rule Model)';

    var dayNames = ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'];
    var vals     = DAY_WEIGHTS.map(function(w){ return Math.round(tmr * w); });
    var mx       = Math.max.apply(null, vals);
    var todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

    document.getElementById('fc-week-bars').innerHTML = vals.map(function(v, i) {
      var h = Math.round((v / mx) * 68) + 12;
      return `<div class="wbar-wrap">
        <div class="wval">${v}</div>
        <div class="wbar${i===todayIdx?' today':''}" style="height:${h}px"></div>
        <div class="wday">${dayNames[i]}</div>
      </div>`;
    }).join('');

    document.getElementById('fc-result').classList.add('on');
  }, 1400);
}
