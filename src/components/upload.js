/**
 * upload.js — Dukaan AI
 * CSV file upload panel with drag-drop, column mapping, preview, and localStorage
 */

var _parsedRows = [];
var _csvHeaders = [];

var REQUIRED_FIELDS = [
  { key: 'name',    label: 'Product Name',       type: 'text' },
  { key: 'cat',     label: 'Category',            type: 'text' },
  { key: 'stock',   label: 'Current Stock',       type: 'number' },
  { key: 'reorder', label: 'Reorder Level',       type: 'number' },
  { key: 'daily',   label: 'Avg Daily Sales',     type: 'number' },
  { key: 'price',   label: 'Selling Price (Rs)',  type: 'number' },
  { key: 'cost',    label: 'Cost Price (Rs)',      type: 'number' },
];

function renderUploadPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-upload" class="panel">
      <div class="page-title">Upload Data</div>
      <div class="page-sub">Upload your inventory CSV file — the app will work with your data</div>

      <div id="upload-current-status"></div>

      <!-- Step 1: Drop zone -->
      <div class="form-card" id="upload-step1">
        <div class="step-header"><span class="step-num">1</span> Choose or Drop a CSV File</div>

        <div class="drop-zone" id="drop-zone">
          <input type="file" id="csv-file-input" accept=".csv,text/csv" onchange="handleFileSelect(event)" />
          <span class="drop-icon">📂</span>
          <div class="drop-title">Drop your CSV file here</div>
          <div class="drop-sub">
            Or click to choose a file<br>
            <span style="color:var(--text3);font-size:11px">Supported: .csv format only</span>
          </div>
        </div>

        <div class="upload-actions">
          <button class="btn-secondary" onclick="downloadSampleCSV()" style="flex:0 0 auto">
            ⬇ Download Sample CSV
          </button>
          <span style="font-size:11px;color:var(--text3);align-self:center;padding-left:4px">
            First time? Download the sample to see the required format.
          </span>
        </div>
      </div>

      <!-- Step 2: Column Mapping -->
      <div class="form-card" id="upload-step2" style="display:none">
        <div class="step-header"><span class="step-num">2</span> Map Your Columns</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">
          Match your CSV column names to the required fields. Auto-detection has been attempted.
        </div>
        <div class="mapping-grid" id="mapping-grid"></div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-primary" style="flex:1;min-width:140px" onclick="applyMapping()">✓ Preview Data</button>
          <button class="btn-secondary" onclick="resetUpload()">✕ Cancel</button>
        </div>
      </div>

      <!-- Step 3: Preview -->
      <div class="form-card" id="upload-step3" style="display:none">
        <div class="step-header"><span class="step-num">3</span> Data Preview</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:10px" id="preview-summary"></div>
        <div class="preview-table-wrap" id="preview-table-wrap"></div>
        <div style="margin-top:16px;display:flex;gap:10px;flex-wrap:wrap">
          <button class="btn-primary" style="flex:1;min-width:140px" onclick="confirmUpload()">🚀 Apply &amp; Use This Data</button>
          <button class="btn-secondary" onclick="goToStep(2)">← Back</button>
          <button class="btn-secondary" onclick="resetUpload()">✕ Cancel</button>
        </div>
      </div>

      <!-- Format tip -->
      <div class="tip-box" style="margin-top:0">
        <strong>CSV Format:</strong> First row must contain column headers. Remaining rows are your product data.
        Recommended categories: <strong>Grocery | Beverage | Cosmetic | Detergent</strong>
      </div>
    </div>
  `;

  var zone = document.getElementById('drop-zone');
  zone.addEventListener('dragover',  function(e){ e.preventDefault(); zone.classList.add('drag-over'); });
  zone.addEventListener('dragleave', function(){ zone.classList.remove('drag-over'); });
  zone.addEventListener('drop',      function(e){
    e.preventDefault();
    zone.classList.remove('drag-over');
    var file = e.dataTransfer.files[0];
    if (file) processFile(file);
  });

  renderCurrentStatus();
}

function renderCurrentStatus() {
  var el = document.getElementById('upload-current-status');
  if (!el) return;
  if (isCustomData()) {
    el.innerHTML = `<div class="upload-status">
      <span class="u-icon">✅</span>
      <span>Custom CSV data active — <strong>${INVENTORY.length} products</strong> loaded from your file.</span>
      <button class="btn-secondary" style="margin-left:auto;font-size:11px;padding:5px 12px" onclick="confirmReset()">Reset to Default</button>
    </div>`;
  } else {
    el.innerHTML = `<div class="upload-status" style="background:var(--blue-dim);border-color:rgba(77,157,224,0.25);color:var(--blue)">
      <span class="u-icon">ℹ️</span>
      <span>Using sample data (${INVENTORY.length} products). Upload your own file to get started.</span>
    </div>`;
  }
}

function handleFileSelect(event) {
  var file = event.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    alert('Only .csv files are supported. Please save your Excel file as CSV first.');
    return;
  }
  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var result = parseCSV(e.target.result);
      _csvHeaders = result.headers;
      _parsedRows = result.rows;
      if (_parsedRows.length === 0) {
        alert('No data found in the CSV. Please check the file and try again.');
        return;
      }
      buildMappingUI();
      goToStep(2);
    } catch (err) {
      alert('CSV parse error: ' + err.message);
    }
  };
  reader.readAsText(file);
}

function parseCSV(text) {
  var lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV must have at least 2 rows (header + data).');
  var headers = splitCSVLine(lines[0]);
  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var vals = splitCSVLine(line);
    var row  = {};
    headers.forEach(function(h, idx) { row[h] = (vals[idx] || '').trim(); });
    rows.push(row);
  }
  return { headers: headers, rows: rows };
}

function splitCSVLine(line) {
  var result = [], cur = '', inQ = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

function buildMappingUI() {
  var grid = document.getElementById('mapping-grid');
  if (!grid) return;
  grid.innerHTML = REQUIRED_FIELDS.map(function(field) {
    var autoMatch = autoDetect(field.key, _csvHeaders);
    var options   = _csvHeaders.map(function(h) {
      return `<option value="${h}" ${h===autoMatch?'selected':''}>${h}</option>`;
    }).join('');
    return `<div class="fg">
      <label class="col-map-label">${field.label}</label>
      <select id="map-${field.key}">
        <option value="">— Select column —</option>
        ${options}
      </select>
    </div>`;
  }).join('');
}

function autoDetect(fieldKey, headers) {
  var synonyms = {
    name:    ['name','product','item','product name','item name'],
    cat:     ['cat','category','type'],
    stock:   ['stock','qty','quantity','units','stock qty'],
    reorder: ['reorder','reorder level','min stock','minimum','reorder point'],
    daily:   ['daily','daily sales','avg daily','per day','average daily'],
    price:   ['price','selling price','sale price','sp'],
    cost:    ['cost','cost price','purchase price','cp'],
  };
  var keys = (synonyms[fieldKey] || [fieldKey]).map(function(s){ return s.toLowerCase(); });
  return headers.filter(function(h){ return keys.indexOf(h.toLowerCase()) !== -1; })[0] || '';
}

function applyMapping() {
  var mapping = {}, missing = [];
  REQUIRED_FIELDS.forEach(function(f) {
    var sel = document.getElementById('map-' + f.key);
    if (sel && sel.value) { mapping[f.key] = sel.value; }
    else { missing.push(f.label); }
  });
  if (missing.length > 0) {
    alert('The following columns were not mapped:\n' + missing.join('\n') + '\n\nPlease select all columns.');
    return;
  }
  var preview = _parsedRows.slice(0, 5).map(function(row, i) {
    return {
      id: i+1, name: row[mapping.name]||'—', cat: row[mapping.cat]||'—',
      stock: parseFloat(row[mapping.stock])||0, reorder: parseFloat(row[mapping.reorder])||0,
      daily: parseFloat(row[mapping.daily])||0, price: parseFloat(row[mapping.price])||0,
      cost:  parseFloat(row[mapping.cost])||0,
    };
  });
  window._uploadMapping = mapping;

  var wrap = document.getElementById('preview-table-wrap');
  wrap.innerHTML = `<table class="preview-table">
    <thead><tr>
      <th>Product</th><th>Category</th><th>Stock</th>
      <th>Reorder</th><th>Daily</th><th>Price</th><th>Cost</th>
    </tr></thead>
    <tbody>
      ${preview.map(function(p){
        return `<tr>
          <td>${p.name}</td><td>${p.cat}</td><td>${p.stock}</td>
          <td>${p.reorder}</td><td>${p.daily}</td><td>Rs ${p.price}</td><td>Rs ${p.cost}</td>
        </tr>`;
      }).join('')}
    </tbody>
  </table>`;

  document.getElementById('preview-summary').innerHTML =
    `<strong style="color:var(--text)">${_parsedRows.length} rows</strong> found in your CSV. Showing first 5 rows. Confirming will replace all current app data.`;

  goToStep(3);
}

function confirmUpload() {
  var mapping = window._uploadMapping;
  if (!mapping) return;
  INVENTORY = _parsedRows.map(function(row, i) {
    return {
      id:      i + 1,
      name:    (row[mapping.name]    || 'Product ' + (i+1)).trim(),
      cat:     (row[mapping.cat]     || 'Grocery').trim(),
      stock:   Math.max(0, parseFloat(row[mapping.stock])   || 0),
      reorder: Math.max(0, parseFloat(row[mapping.reorder]) || 0),
      daily:   Math.max(1, parseFloat(row[mapping.daily])   || 1),
      price:   Math.max(0, parseFloat(row[mapping.price])   || 0),
      cost:    Math.max(0, parseFloat(row[mapping.cost])    || 0),
    };
  }).filter(function(p){ return p.name; });

  saveInventory();
  refreshSidebarBadge();

  var fcProd = document.getElementById('fc-product');
  if (fcProd) {
    fcProd.innerHTML = INVENTORY.map(function(p){
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
    syncForecastProduct();
  }

  _parsedRows = []; _csvHeaders = []; window._uploadMapping = null;
  goToStep(1);
  renderCurrentStatus();
  alert('\u2705 Data loaded successfully! ' + INVENTORY.length + ' products are now active.');
  showPanel('dashboard');
}

function confirmReset() {
  if (!confirm('Return to default sample data? Your uploaded data will be removed.')) return;
  resetInventory();
  refreshSidebarBadge();
  var fcProd = document.getElementById('fc-product');
  if (fcProd) {
    fcProd.innerHTML = INVENTORY.map(function(p){
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
    syncForecastProduct();
  }
  renderCurrentStatus();
  goToStep(1);
}

function resetUpload() {
  _parsedRows = []; _csvHeaders = []; window._uploadMapping = null;
  goToStep(1);
  var inp = document.getElementById('csv-file-input');
  if (inp) inp.value = '';
}

function resetUploadState() {
  _parsedRows = []; _csvHeaders = []; window._uploadMapping = null;
  goToStep(1);
  var inp = document.getElementById('csv-file-input');
  if (inp) inp.value = '';
  renderCurrentStatus();
}

function goToStep(n) {
  [1,2,3].forEach(function(i){
    var el = document.getElementById('upload-step' + i);
    if (el) el.style.display = (i === n ? '' : 'none');
  });
}

function downloadSampleCSV() {
  var headers = 'Product Name,Category,Stock,Reorder Level,Avg Daily Sales,Selling Price,Cost Price';
  var rows = [
    'Basmati Rice 5kg,Grocery,18,30,6,650,520',
    'Cooking Oil 1L,Grocery,95,20,12,480,370',
    'Surf Excel 1kg,Detergent,12,25,5,320,260',
    'Lifebuoy Soap,Cosmetic,80,40,8,90,65',
    'Rooh Afza 800ml,Beverage,55,20,7,420,310',
  ];
  var csv  = headers + '\n' + rows.join('\n');
  var blob = new Blob([csv], { type: 'text/csv' });
  var url  = URL.createObjectURL(blob);
  var a    = document.createElement('a');
  a.href   = url;
  a.download = 'dukaan_ai_sample.csv';
  a.click();
  URL.revokeObjectURL(url);
}
