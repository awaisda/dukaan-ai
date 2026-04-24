/**
 * charts.js — Dukaan AI
 * Chart.js chart definitions
 * Called from app.js after DOM is ready
 */

var chartInstances = {};

/**
 * Render weekly sales trend line chart
 */
function renderTrendChart() {
  var ctx = document.getElementById('trendChart');
  if (!ctx) return;
  if (chartInstances.trend) chartInstances.trend.destroy();

  chartInstances.trend = new Chart(ctx, {
    type: 'line',
    data: {
      labels: ['Mon','Tue','Wed','Thu','Fri','Sat','Sun'],
      datasets: [{
        label: 'Sales (Rs)',
        data: [18000, 22000, 19000, 25000, 31000, 28000, 20000],
        borderColor: '#1DB584',
        backgroundColor: 'rgba(29,181,132,0.08)',
        borderWidth: 2,
        pointRadius: 4,
        pointBackgroundColor: '#1DB584',
        fill: true,
        tension: 0.35
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: { color: '#8B9BB0', font: { size: 10, family: 'IBM Plex Mono' } }
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.04)' },
          ticks: {
            color: '#8B9BB0', font: { size: 10 },
            callback: function(v) { return 'Rs ' + (v / 1000) + 'k'; }
          }
        }
      }
    }
  });
}

/**
 * Render margin bar chart for Loss Detector
 */
function renderLossChart() {
  var ctx = document.getElementById('lossChart');
  if (!ctx) return;
  if (chartInstances.loss) chartInstances.loss.destroy();

  var margins = INVENTORY.map(marginPct);
  var colors  = margins.map(function(m) { return m < 0 ? '#E05252' : '#1DB584'; });

  chartInstances.loss = new Chart(ctx, {
    type: 'bar',
    data: {
      labels: INVENTORY.map(function(p) { return p.name.split(' ')[0]; }),
      datasets: [{
        label: 'Margin %',
        data: margins,
        backgroundColor: colors,
        borderRadius: 4
      }]
    },
    options: {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: {
          ticks: { color: '#8B9BB0', font: { size: 9 } },
          grid: { display: false }
        },
        y: {
          ticks: { color: '#8B9BB0', font: { size: 9 }, callback: function(v) { return v + '%'; } },
          grid: { color: 'rgba(255,255,255,0.04)' }
        }
      }
    }
  });
}
