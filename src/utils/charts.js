/**
 * charts.js — Dukaan AI v2.0
 * Premium Chart.js definitions — gradient fills, custom tooltips, smooth curves
 */

var chartInstances = {};
var DAY_WEIGHTS_CHART = [0.85, 0.95, 0.88, 1.0, 1.15, 1.08, 0.78];

/** Shared Chart.js global defaults */
Chart.defaults.color        = '#8BA3BC';
Chart.defaults.font.family  = "'IBM Plex Sans', 'Inter', sans-serif";
Chart.defaults.font.size    = 11;
Chart.defaults.borderColor  = 'rgba(255,255,255,0.04)';

/**
 * Weekly sales trend — gradient fill line chart
 */
function renderTrendChart() {
  var ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (chartInstances.trend) chartInstances.trend.destroy();

  var baseDaily = INVENTORY.reduce(function(sum, p){ return sum + p.price * p.daily; }, 0);
  var trendData = DAY_WEIGHTS_CHART.map(function(w){ return Math.round(baseDaily * w); });

  // Gradient fill
  var gradient = ctx.getContext('2d').createLinearGradient(0, 0, 0, 200);
  gradient.addColorStop(0,   'rgba(29,181,132,0.18)');
  gradient.addColorStop(0.7, 'rgba(29,181,132,0.04)');
  gradient.addColorStop(1,   'rgba(29,181,132,0)');

  // Today's index
  var todayIdx = new Date().getDay() === 0 ? 6 : new Date().getDay() - 1;

  chartInstances.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        label: 'Daily Revenue (Rs)',
        data: trendData,
        borderColor: '#1DB584',
        backgroundColor: gradient,
        borderWidth: 2.5,
        pointRadius: trendData.map(function(_, i){ return i === todayIdx ? 6 : 3; }),
        pointBackgroundColor: trendData.map(function(_, i){ return i === todayIdx ? '#1DB584' : '#0E1521'; }),
        pointBorderColor: '#1DB584',
        pointBorderWidth: 2,
        pointHoverRadius: 6,
        fill: true,
        tension: 0.42
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      interaction: { mode: 'index', intersect: false },
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141E2E',
          borderColor: '#1C2B3D',
          borderWidth: 1,
          padding: 10,
          titleColor: '#D6E4F0',
          bodyColor: '#8BA3BC',
          callbacks: {
            label: function(ctx) {
              var v = ctx.raw;
              if (v >= 100000) return ' Rs ' + (v/100000).toFixed(1) + 'L';
              if (v >= 1000)   return ' Rs ' + (v/1000).toFixed(1) + 'k';
              return ' Rs ' + v;
            }
          }
        }
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.03)' },
          ticks: {
            color: '#4D6478',
            font: { size: 10, family: "'IBM Plex Mono', monospace" },
            callback: function(val, i) {
              return i === todayIdx ? '● ' + this.getLabelForValue(val) : this.getLabelForValue(val);
            }
          }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#4D6478',
            font: { size: 10 },
            callback: function(v) {
              if (v >= 100000) return 'Rs ' + (v/100000).toFixed(1) + 'L';
              if (v >= 1000)   return 'Rs ' + (v/1000).toFixed(1) + 'k';
              return 'Rs ' + v;
            }
          }
        }
      }
    }
  });
}

/**
 * Margin bar chart for Loss Detector — color-coded by profitability
 */
function renderLossChart() {
  var ctx = document.getElementById('lossChart');
  if (!ctx) return;
  if (chartInstances.loss) chartInstances.loss.destroy();

  var sorted  = INVENTORY.slice().sort(function(a,b){ return marginPct(a) - marginPct(b); });
  var margins = sorted.map(marginPct);
  var colors  = margins.map(function(m){
    if (m < 0)   return '#E05252';
    if (m < 15)  return '#E09A34';
    return '#1DB584';
  });
  var borders = colors.map(function(c){ return c; });

  chartInstances.loss = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: sorted.map(function(p){ return p.name.split(' ')[0]; }),
      datasets: [{
        label: 'Margin %',
        data: margins,
        backgroundColor: colors.map(function(c){ return c.replace('#','').length === 6 ? hexToRgba(c, 0.75) : c; }),
        borderColor: borders,
        borderWidth: 1.5,
        borderRadius: 5,
        borderSkipped: false
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          backgroundColor: '#141E2E',
          borderColor: '#1C2B3D',
          borderWidth: 1,
          padding: 10,
          callbacks: {
            label: function(ctx) {
              var p = sorted[ctx.dataIndex];
              return [
                ' Margin: ' + ctx.raw + '%',
                ' Price: Rs ' + p.price + '  Cost: Rs ' + p.cost
              ];
            }
          }
        }
      },
      scales: {
        x: {
          ticks: { color: '#4D6478', font: { size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: {
            color: '#4D6478',
            font: { size: 9 },
            callback: function(v){ return v + '%'; }
          },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}

/** Convert hex color to rgba string */
function hexToRgba(hex, alpha) {
  var r = parseInt(hex.slice(1,3), 16);
  var g = parseInt(hex.slice(3,5), 16);
  var b = parseInt(hex.slice(5,7), 16);
  return 'rgba(' + r + ',' + g + ',' + b + ',' + alpha + ')';
}
