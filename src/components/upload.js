/**
 * upload.js — Dukaan AI
 * CSV file upload panel with drag-drop, column mapping, preview, and localStorage
 */

var _parsedRows    = [];   // raw CSV rows (array of objects keyed by header)
var _csvHeaders    = [];   // original CSV headers

// Fields we need to map to
var REQUIRED_FIELDS = [
  { key: 'name',    label: 'Product Name',       type: 'text' },
  { key: 'cat',     label: 'Category',            type: 'text' },
  { key: 'stock',   label: 'Current Stock',       type: 'number' },
  { key: 'reorder', label: 'Reorder Level',       type: 'number' },
  { key: 'daily',   label: 'Avg Daily Sales',     type: 'number' },
  { key: 'price',   label: 'Selling Price (Rs)',  type: 'number' },
  { key: 'cost',    label: 'Cost Price (Rs)',      type: 'number' },
];

/* ============================================================
   PANEL RENDER
   ============================================================ */
function renderUploadPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-upload" class="panel">
      <div class="page-title">Upload Data</div>
      <div class="page-sub">Apni dukaan ki inventory CSV file upload karein — app usi data pe kaam karega</div>

      <!-- Current data status -->
      <div id="upload-current-status"></div>

      <!-- Step 1: Drop zone -->
      <div class="form-card" id="upload-step1">
        <div class="step-header"><span class="step-num">1</span> CSV File Choose karein ya Drop karein</div>

        <div class="drop-zone" id="drop-zone">
          <input type="file" id="csv-file-input" accept=".csv,text/csv" onchange="handleFileSelect(event)" />
          <span class="drop-icon">📂</span>
          <div class="drop-title">CSV file yahan drop karein</div>
          <div class="drop-sub">
            Ya click karein file choose karne ke liye<br>
            <span style="color:var(--text3);font-size:11px">Supported: .csv format only</span>
          </div>
        </div>

        <div class="upload-actions">
          <button class="btn-secondary" onclick="downloadSampleCSV()" style="flex:0 0 auto">
            ⬇ Sample CSV Download
          </button>
          <span style="font-size:11px;color:var(--text3);align-self:center;padding-left:4px">
            Pehli baar? Sample download karein aur format dekh lein.
          </span>
        </div>
      </div>

      <!-- Step 2: Column Mapping -->
      <div class="form-card" id="upload-step2" style="display:none">
        <div class="step-header"><span class="step-num">2</span> Columns Map karein</div>
        <div style="font-size:12px;color:var(--text2);margin-bottom:14px">
          Apni CSV ke column names yahan match karein. Auto-detect karne ki koshish ki gayi hai.
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
          <button class="btn-primary" style="flex:1;min-width:140px" onclick="confirmUpload()">🚀 Apply & Use This Data</button>
          <button class="btn-secondary" onclick="goToStep(2)">← Back</button>
          <button class="btn-secondary" onclick="resetUpload()">✕ Cancel</button>
        </div>
      </div>

      <!-- Sample format info -->
      <div class="tip-box" style="margin-top:0">
        <strong>CSV Format:</strong> Pehli row mein column headers honge. Baaki rows mein data.
        Category ke liye use karein: <strong>Grocery | Beverage | Cosmetic | Detergent</strong>
      </div>
    </div>
  `;

  // Setup drag-drop
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

/* ============================================================
   STATUS BAR
   ============================================================ */
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
      <span>Sample data use ho raha hai (${INVENTORY.length} products). Apni file upload karein.</span>
    </div>`;
  }
}

/* ============================================================
   FILE HANDLING
   ============================================================ */
function handleFileSelect(event) {
  var file = event.target.files[0];
  if (file) processFile(file);
}

function processFile(file) {
  if (!file.name.endsWith('.csv') && file.type !== 'text/csv') {
    alert('Sirf .csv files support hoti hain. Excel file ko pehle CSV mein save karein.');
    return;
  }

  var reader = new FileReader();
  reader.onload = function(e) {
    try {
      var result = parseCSV(e.target.result);
      _csvHeaders = result.headers;
      _parsedRows = result.rows;
      if (_parsedRows.length === 0) {
        alert('CSV mein koi data nahi mila. File check karein.');
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

/* ============================================================
   CSV PARSER
   ============================================================ */
function parseCSV(text) {
  var lines = text.trim().split(/\r?\n/);
  if (lines.length < 2) throw new Error('CSV mein at least 2 rows hongi chahiye (header + data)');

  var headers = splitCSVLine(lines[0]);

  var rows = [];
  for (var i = 1; i < lines.length; i++) {
    var line = lines[i].trim();
    if (!line) continue;
    var vals = splitCSVLine(line);
    var row  = {};
    headers.forEach(function(h, idx) {
      row[h] = (vals[idx] || '').trim();
    });
    rows.push(row);
  }
  return { headers: headers, rows: rows };
}

function splitCSVLine(line) {
  var result = [];
  var cur    = '';
  var inQ    = false;
  for (var i = 0; i < line.length; i++) {
    var c = line[i];
    if (c === '"') { inQ = !inQ; continue; }
    if (c === ',' && !inQ) { result.push(cur.trim()); cur = ''; continue; }
    cur += c;
  }
  result.push(cur.trim());
  return result;
}

/* ============================================================
   COLUMN MAPPING UI
   ============================================================ */
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
    name:    ['name','product','item','product name','item name','naam'],
    cat:     ['cat','category','type','qism'],
    stock:   ['stock','qty','quantity','units','stock qty','miqdar'],
    reorder: ['reorder','reorder level','min stock','minimum','reorder point'],
    daily:   ['daily','daily sales','avg daily','per day','rozana','average daily'],
    price:   ['price','selling price','sale price','sp','qeemat'],
    cost:    ['cost','cost price','purchase price','cp','lagat'],
  };
  var keys = (synonyms[fieldKey] || [fieldKey]).map(function(s){ return s.toLowerCase(); });
  return headers.filter(function(h){
    return keys.indexOf(h.toLowerCase()) !== -1;
  })[0] || '';
}

/* ============================================================
   PREVIEW
   ============================================================ */
function applyMapping() {
  var mapping = {};
  var missing = [];
  REQUIRED_FIELDS.forEach(function(f) {
    var sel = document.getElementById('map-' + f.key);
    if (sel && sel.value) {
      mapping[f.key] = sel.value;
    } else {
      missing.push(f.label);
    }
  });

  if (missing.length > 0) {
    alert('Ye columns map nahi hue:\n' + missing.join('\n') + '\n\nSabhi columns select karein.');
    return;
  }

  // Build preview data
  var preview = _parsedRows.slice(0, 5).map(function(row, i) {
    return {
      id:      i + 1,
      name:    row[mapping.name]    || '—',
      cat:     row[mapping.cat]     || '—',
      stock:   parseFloat(row[mapping.stock])   || 0,
      reorder: parseFloat(row[mapping.reorder]) || 0,
      daily:   parseFloat(row[mapping.daily])   || 0,
      price:   parseFloat(row[mapping.price])   || 0,
      cost:    parseFloat(row[mapping.cost])     || 0,
    };
  });

  // Store mapping on window for confirm step
  window._uploadMapping = mapping;

  // Render preview table
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
    `<strong style="color:var(--text)">${_parsedRows.length} rows</strong> found in CSV. Pehle 5 rows preview mein hain. Confirm karein toh app ka poora data replace ho jayega.`;

  goToStep(3);
}

/* ============================================================
   CONFIRM / APPLY
   ============================================================ */
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

  // Refresh forecast dropdown and inputs
  var fcProd = document.getElementById('fc-product');
  if (fcProd) {
    fcProd.innerHTML = INVENTORY.map(function(p){
      return '<option value="' + p.id + '">' + p.name + '</option>';
    }).join('');
    syncForecastProduct(); // Bug 2 fix: auto-fill forecast inputs with new data
  }

  // Reset UI
  _parsedRows = []; _csvHeaders = []; window._uploadMapping = null;
  goToStep(1);
  renderCurrentStatus();

  alert('\u2705 Data successfully load ho gaya! ' + INVENTORY.length + ' products active hain.');
  showPanel('dashboard');
}

/* ============================================================
   RESET
   ============================================================ */
function confirmReset() {
  if (!confirm('Default sample data pe wapas jaana chahte hain? Aapka uploaded data delete ho jayega.')) return;
  resetInventory();
  refreshSidebarBadge();

  // Refresh forecast dropdown and inputs
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

/** Bug 3 fix: called by router each time upload panel is opened */
function resetUploadState() {
  _parsedRows = []; _csvHeaders = []; window._uploadMapping = null;
  goToStep(1);
  var inp = document.getElementById('csv-file-input');
  if (inp) inp.value = '';
  renderCurrentStatus();
}

function goToStep(n) {
  [1,2,3].forEach(function(i){
    var el = document.getElementById('upload-step'+i);
    if (el) el.style.display = (i === n ? '' : 'none');
  });
}

/* ============================================================
   SAMPLE CSV DOWNLOAD
   ============================================================ */
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
