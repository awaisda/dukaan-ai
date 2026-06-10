/**
 * ai-chat.js — Dukaan AI v2.0
 * Smart AI Assistant — answers questions about ALL inventory data
 */

var CLAUDE_API_KEY = '';  // <-- Paste your API key here (dev only)
var CHAT_HISTORY   = [];

/* Forecast multipliers — same as forecast.js */
var FC_MUL = {
  season:  { Normal:1.0, Ramadan:1.45, Winter:1.1, Summer:1.2, Eid:1.6 },
  dayType: { Weekday:1.0, Weekend:1.18, Friday:1.25, Holiday:1.35 },
  weather: { Normal:1.0, Hot:1.1, 'Cold / Rain':0.85 }
};

/* ─────────────────────────────────────────────────────────
   SYSTEM PROMPT (used when Claude API key is set)
   ───────────────────────────────────────────────────────── */
function buildSystemPrompt() {
  var now      = new Date();
  var dayName  = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  var critProds  = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; });
  var lowProds   = INVENTORY.filter(function(p){ var d=daysLeft(p); return d>3&&d<=7; });
  var lossProds  = INVENTORY.filter(function(p){ return p.price < p.cost; });
  var topMargin  = INVENTORY.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); }).slice(0,3);
  var weeklyRev  = INVENTORY.reduce(function(s,p){ return s+p.price*p.daily*7; },0);
  var dailyRev   = INVENTORY.reduce(function(s,p){ return s+p.price*p.daily; },0);
  var avgMargin  = Math.round(INVENTORY.reduce(function(s,p){ return s+marginPct(p); },0)/INVENTORY.length);
  var weekProfit = INVENTORY.reduce(function(s,p){ return s+(p.price-p.cost)*p.daily*7; },0);
  var belowReord = INVENTORY.filter(function(p){ return p.stock <= p.reorder; });

  return [
    'You are Dukaan AI — a sharp retail intelligence assistant for a Pakistani grocery/general store.',
    'Today is ' + dayName + ', ' + todayStr() + '.',
    '',
    'STORE SNAPSHOT:',
    '  Products: ' + INVENTORY.length,
    '  Daily revenue: ' + formatRs(Math.round(dailyRev)) + ' | Weekly: ' + formatRs(weeklyRev),
    '  Weekly profit: ' + formatRs(Math.round(weekProfit)) + ' | Avg margin: ' + avgMargin + '%',
    '  Critical (<=3d): ' + (critProds.length ? critProds.map(function(p){ return p.name+'('+daysLeft(p)+'d)'; }).join(', ') : 'None'),
    '  Low stock (4-7d): ' + (lowProds.length ? lowProds.map(function(p){ return p.name+'('+daysLeft(p)+'d)'; }).join(', ') : 'None'),
    '  Loss-making: ' + (lossProds.length ? lossProds.map(function(p){ return p.name+' ('+marginPct(p)+'%)'; }).join(', ') : 'None'),
    '  Below reorder pt: ' + (belowReord.length ? belowReord.map(function(p){ return p.name+' ('+p.stock+'/'+p.reorder+')'; }).join(', ') : 'None'),
    '  Top margins: ' + topMargin.map(function(p){ return p.name+'('+marginPct(p)+'%)'; }).join(', '),
    '',
    'FULL INVENTORY (id | name | cat | stock | reorder | daily | days_left | price | cost | margin% | profit/unit):',
    INVENTORY.map(function(p){
      return '  #'+p.id+' '+p.name+' | '+p.cat+' | stock:'+p.stock+' | reorder:'+p.reorder+
        ' | daily:'+p.daily+' | days:'+daysLeft(p)+' | Rs'+p.price+'/Rs'+p.cost+
        ' | '+marginPct(p)+'% | Rs'+(p.price-p.cost)+'/unit';
    }).join('\n'),
    '',
    'FORECAST MULTIPLIERS: Season: Normal=1x, Ramadan=1.45x, Eid=1.6x, Summer=1.2x, Winter=1.1x',
    '  Day: Weekday=1x, Weekend=1.18x, Friday=1.25x, Holiday=1.35x',
    '  Weather: Normal=1x, Hot=1.1x, Cold/Rain=0.85x. Multiply all three together.',
    '',
    'RULES: Answer only what is asked. Use real numbers. Show math. No filler openers. Max 150 words.',
  ].join('\n');
}

/* ─────────────────────────────────────────────────────────
   RENDER PANEL
   ───────────────────────────────────────────────────────── */
function renderAiChatPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += '<div id="panel-ai" class="panel">' +
    '<div class="ai-panel-header">' +
      '<div>' +
        '<div class="page-title">AI Assistant</div>' +
        '<div class="page-sub" style="margin-bottom:0">Ask anything about your inventory, pricing, forecasts, or profitability</div>' +
      '</div>' +
      '<button class="clear-chat-btn" onclick="clearChat()" title="Clear chat history">&#10005; Clear</button>' +
    '</div>' +
    '<div class="ai-panel">' +
      '<div class="chat-messages" id="chat-messages"></div>' +
      '<div class="chat-chips" id="chat-chips">' +
        '<button class="chip" onclick="sendChip(\'Which products need reordering right now?\')">&#128276; Reorder alerts</button>' +
        '<button class="chip" onclick="sendChip(\'Which products are making a loss?\')">&#128201; Loss products</button>' +
        '<button class="chip" onclick="sendChip(\'What are my top 3 profit margin products?\')">&#128176; Top margins</button>' +
        '<button class="chip" onclick="sendChip(\'Give me a full store health summary.\')">&#128202; Store summary</button>' +
        '<button class="chip" onclick="sendChip(\'What will my sales be during Ramadan?\')">&#127775; Ramadan forecast</button>' +
        '<button class="chip" onclick="sendChip(\'List all products with stock and margin.\')">&#128230; Full inventory</button>' +
      '</div>' +
      '<div class="chat-input-wrap">' +
        '<textarea class="chat-input" id="chat-input" rows="1"' +
          ' placeholder="Ask anything about your store data..."' +
          ' onkeydown="handleChatKey(event)" oninput="autoResizeInput(this);updateChatCounter()">' +
        '</textarea>' +
        '<button class="chat-send" id="chat-send" onclick="sendChat()" title="Send (Enter)">&#8679;</button>' +
      '</div>' +
      '<div class="chat-counter" id="chat-counter">0 / 500</div>' +
    '</div>' +
  '</div>';

  appendMsg('ai', 'Hello! \uD83D\uDC4B I\'m Dukaan AI. I know your full inventory \u2014 stock, pricing, margins, reorder points, and forecasts. Ask me anything!');
}

/* ─────────────────────────────────────────────────────────
   UI HELPERS
   ───────────────────────────────────────────────────────── */
function autoResizeInput(el) {
  el.style.height = '';
  el.style.height = Math.min(el.scrollHeight, 120) + 'px';
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); sendChat(); }
}

function updateChatCounter() {
  var input   = document.getElementById('chat-input');
  var counter = document.getElementById('chat-counter');
  if (!input || !counter) return;
  var len = input.value.length;
  counter.textContent = len + ' / 500';
  counter.style.color = len > 450 ? 'var(--amber)' : 'var(--text3)';
  if (len > 500) input.value = input.value.slice(0, 500);
}

function sendChip(text) {
  var input = document.getElementById('chat-input');
  if (input) { input.value = text; updateChatCounter(); autoResizeInput(input); }
  sendChat();
}

function clearChat() {
  CHAT_HISTORY = [];
  var el = document.getElementById('chat-messages');
  if (el) el.innerHTML = '';
  appendMsg('ai', 'Chat cleared. Ask me anything about your store!');
}

/* ─────────────────────────────────────────────────────────
   SEND / API
   ───────────────────────────────────────────────────────── */
async function sendChat() {
  var input = document.getElementById('chat-input');
  var msg   = (input.value || '').trim();
  if (!msg) return;

  appendMsg('user', msg);
  input.value = '';
  input.style.height = '';
  updateChatCounter();
  document.getElementById('chat-send').disabled = true;

  var typingId = 'typing-' + Date.now();
  appendTyping(typingId);
  CHAT_HISTORY.push({ role: 'user', content: msg });

  try {
    var replyText = await callClaudeAPI();
    removeTyping(typingId);
    CHAT_HISTORY.push({ role: 'assistant', content: replyText });
    appendMsg('ai', replyText);
  } catch (err) {
    removeTyping(typingId);
    appendMsg('ai', 'Error: ' + sanitize(err.message) + '. Please try again.');
  }

  document.getElementById('chat-send').disabled = false;
}

async function callClaudeAPI() {
  if (!CLAUDE_API_KEY) {
    return smartResponse(CHAT_HISTORY[CHAT_HISTORY.length - 1].content);
  }
  var response = await fetch('https://api.anthropic.com/v1/messages', {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'x-api-key': CLAUDE_API_KEY,
      'anthropic-version': '2023-06-01'
    },
    body: JSON.stringify({
      model: 'claude-sonnet-4-20250514',
      max_tokens: 600,
      system: buildSystemPrompt(),
      messages: CHAT_HISTORY
    })
  });
  if (!response.ok) {
    var err = await response.json().catch(function(){ return {}; });
    throw new Error(err.error ? err.error.message : 'API error ' + response.status);
  }
  var data = await response.json();
  return data.content && data.content[0] ? data.content[0].text : 'No response received.';
}

/* ─────────────────────────────────────────────────────────
   SMART LOCAL AI ENGINE
   Covers all data: inventory fields, forecast multipliers,
   store-wide analytics, seasonal/day/weather scenarios.
   ───────────────────────────────────────────────────────── */
function smartResponse(question) {
  var q   = question.toLowerCase().trim();
  var inv = INVENTORY;

  /* -- sort / filter helpers -- */
  function sortByDaysLeft()  { return inv.slice().sort(function(a,b){ return daysLeft(a)-daysLeft(b); }); }
  function sortByMargin()    { return inv.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); }); }
  function sortByDaily()     { return inv.slice().sort(function(a,b){ return b.daily-a.daily; }); }
  function sortByRevUnit()   { return inv.slice().sort(function(a,b){ return (b.price*b.daily)-(a.price*a.daily); }); }
  function sortByStock()     { return inv.slice().sort(function(a,b){ return b.stock-a.stock; }); }
  function sortByProfitAbs() { return inv.slice().sort(function(a,b){ return ((b.price-b.cost)*b.daily)-((a.price-a.cost)*a.daily); }); }
  function filterCat(c)      { return inv.filter(function(p){ return p.cat.toLowerCase().includes(c); }); }

  /* -- store-wide totals -- */
  function wRev()    { return inv.reduce(function(s,p){ return s+p.price*p.daily*7; },0); }
  function dRev()    { return inv.reduce(function(s,p){ return s+p.price*p.daily; },0); }
  function wProfit() { return inv.reduce(function(s,p){ return s+(p.price-p.cost)*p.daily*7; },0); }
  function dProfit() { return inv.reduce(function(s,p){ return s+(p.price-p.cost)*p.daily; },0); }
  function avgMg()   { return Math.round(inv.reduce(function(s,p){ return s+marginPct(p); },0)/inv.length); }

  /* -- shorthand -- */
  function fmt(n) { return formatRs(Math.round(n)); }
  function dl(p)  { return daysLeft(p); }
  function mg(p)  { return marginPct(p); }

  /* -- detect forecast scenario from question -- */
  function getSeason() {
    if (q.includes('ramadan') || q.includes('ramazan')) return 'Ramadan';
    if (q.includes('eid'))                               return 'Eid';
    if (q.includes('winter'))                            return 'Winter';
    if (q.includes('summer'))                            return 'Summer';
    return 'Normal';
  }
  function getDay() {
    if (q.includes('friday') || q.includes('juma'))       return 'Friday';
    if (q.includes('weekend') || q.includes('saturday') || q.includes('sunday')) return 'Weekend';
    if (q.includes('holiday') || q.includes('chutti'))    return 'Holiday';
    return 'Weekday';
  }
  function getWeather() {
    if (q.includes('hot') || q.includes('heat') || q.includes('garmi'))          return 'Hot';
    if (q.includes('cold') || q.includes('rain') || q.includes('sardi') || q.includes('baarish')) return 'Cold / Rain';
    return 'Normal';
  }

  /* ══ 1. MATCH A SPECIFIC PRODUCT BY NAME ══ */
  var hit = null;
  for (var i = 0; i < inv.length; i++) {
    var parts = inv[i].name.toLowerCase().split(' ');
    for (var j = 0; j < parts.length; j++) {
      if (parts[j].length > 3 && q.includes(parts[j])) { hit = inv[i]; break; }
    }
    if (hit) break;
  }
  /* also match by #id */
  if (!hit) {
    var idM = q.match(/#(\d+)/);
    if (idM) {
      var tid = parseInt(idM[1]);
      for (var k = 0; k < inv.length; k++) {
        if (inv[k].id === tid) { hit = inv[k]; break; }
      }
    }
  }

  if (hit) {
    var pu   = hit.price - hit.cost;
    var days = dl(hit);
    var sts  = days <= 3 ? '\uD83D\uDEA8 Critical' : days <= 7 ? '\u26A0\uFE0F Low' : '\u2705 OK';
    var belowRp = hit.stock <= hit.reorder;

    /* days / when runs out */
    if (q.includes('when') || q.includes('run out') || q.includes('khatam') || q.includes('left') || q.includes('last') || (q.includes('days') && !q.includes('all'))) {
      return '**' + hit.name + '** runs out in **' + days + ' days.**\n' +
        hit.stock + ' units \u00F7 ' + hit.daily + '/day = ' + days + ' days. Status: ' + sts + '.';
    }
    /* reorder */
    if (q.includes('reorder') || q.includes('order') || q.includes('buy') || q.includes('stock up')) {
      if (days <= 7 || belowRp) {
        return 'Yes \u2014 reorder **' + hit.name + '** now.\n' +
          '\u2022 Stock: ' + hit.stock + ' units (' + days + ' days left)\n' +
          '\u2022 Reorder point: ' + hit.reorder + ' units' + (belowRp ? ' \u2190 already below!' : '') + '\n' +
          '\u2022 Daily sales: ' + hit.daily + '/day';
      }
      return 'No rush for **' + hit.name + '**. ' + days + ' days of stock left (' + hit.stock + ' units). Reorder point: ' + hit.reorder + '.';
    }
    /* margin / profit */
    if (q.includes('margin') || q.includes('profit') || q.includes('earn') || q.includes('faida') || q.includes('kamai')) {
      if (pu < 0) {
        return '**' + hit.name + '** is at a **loss of Rs ' + Math.abs(pu) + '/unit** (' + mg(hit) + '% margin).\n' +
          'Cost Rs ' + hit.cost + ' \u2192 Price Rs ' + hit.price + '.\n' +
          'Raise to at least Rs ' + Math.ceil(hit.cost * 1.1) + ' for 10%, or Rs ' + Math.ceil(hit.cost * 1.2) + ' for 20%.';
      }
      return '**' + hit.name + '** earns **Rs ' + pu + '/unit** (' + mg(hit) + '% margin).\n' +
        'Cost Rs ' + hit.cost + ' \u2192 Price Rs ' + hit.price + '.\n' +
        'Daily profit: ' + fmt(pu * hit.daily) + ' | Weekly: ' + fmt(pu * hit.daily * 7);
    }
    /* forecast for this product */
    if (q.includes('forecast') || q.includes('predict') || q.includes('demand') || q.includes('sell')) {
      var s2 = getSeason(), dy = getDay(), wt = getWeather();
      var mul2 = (FC_MUL.season[s2]||1) * (FC_MUL.dayType[dy]||1) * (FC_MUL.weather[wt]||1);
      var proj2 = Math.round(hit.daily * mul2);
      var daysAt = proj2 > 0 ? Math.floor(hit.stock / proj2) : 999;
      return '**' + hit.name + '** \u2014 ' + s2 + '/' + dy + '/' + wt + ' forecast:\n' +
        '\u2022 Base daily: ' + hit.daily + ' \u2192 Projected: **' + proj2 + ' units/day**\n' +
        '\u2022 Multiplier: ' + mul2.toFixed(2) + 'x\n' +
        '\u2022 Stock lasts: ' + daysAt + ' days at this rate\n' +
        '\u2022 Est. daily revenue: ' + fmt(proj2 * hit.price);
    }
    /* price / cost */
    if (q.includes('price') || q.includes('cost') || q.includes('qeemat') || q.includes('kitna')) {
      return '**' + hit.name + '** pricing:\n' +
        '\u2022 Selling price: Rs ' + hit.price + '\n' +
        '\u2022 Cost price: Rs ' + hit.cost + '\n' +
        '\u2022 Profit/unit: Rs ' + pu + ' (' + mg(hit) + '% margin)';
    }
    /* stock */
    if (q.includes('stock') || q.includes('units') || q.includes('how many') || q.includes('inventory')) {
      return '**' + hit.name + '** stock:\n' +
        '\u2022 Current: ' + hit.stock + ' units\n' +
        '\u2022 Daily sales: ' + hit.daily + '/day\n' +
        '\u2022 Days left: ' + days + ' \u2014 ' + sts + '\n' +
        '\u2022 Reorder point: ' + hit.reorder + ' units ' + (belowRp ? '\uD83D\uDEA8 (already below!)' : '\u2705');
    }
    /* general product info */
    return '**' + hit.name + '** [' + hit.cat + '] \u2014 ID #' + hit.id + '\n' +
      '\u2022 Stock: ' + hit.stock + ' units | ' + days + ' days left \u2014 ' + sts + '\n' +
      '\u2022 Reorder pt: ' + hit.reorder + ' ' + (belowRp ? '\uD83D\uDEA8 below!' : '\u2705') + '\n' +
      '\u2022 Price: Rs ' + hit.price + ' | Cost: Rs ' + hit.cost + ' | Margin: ' + mg(hit) + '%\n' +
      '\u2022 Daily: ' + hit.daily + '/day | Weekly revenue: ' + fmt(hit.price * hit.daily * 7) + '\n' +
      '\u2022 Weekly profit: ' + fmt(pu * hit.daily * 7);
  }

  /* ══ 2. FORECAST / SEASONAL / WEATHER ══ */
  var isFcQ = q.includes('forecast') || q.includes('predict') || q.includes('demand') ||
    q.includes('ramadan') || q.includes('ramazan') || q.includes('eid') ||
    q.includes('summer') || q.includes('winter') || q.includes('season') ||
    q.includes('friday') || q.includes('weekend') || q.includes('holiday') ||
    q.includes('hot') || q.includes('cold') || q.includes('rain');

  if (isFcQ) {
    var fs = getSeason(), fd = getDay(), fw = getWeather();
    var fmul = (FC_MUL.season[fs]||1) * (FC_MUL.dayType[fd]||1) * (FC_MUL.weather[fw]||1);
    var projRev = 0, projProf = 0, fcLines = [];
    for (var fi = 0; fi < inv.length; fi++) {
      var fp  = inv[fi];
      var fpj = Math.round(fp.daily * fmul);
      projRev  += fpj * fp.price;
      projProf += fpj * (fp.price - fp.cost);
      fcLines.push('\u2022 ' + fp.name + ': ' + fp.daily + ' \u2192 **' + fpj + '** units/day');
    }
    return '**Forecast: ' + fs + ' / ' + fd + ' / ' + fw + '**\n' +
      'Combined multiplier: **' + fmul.toFixed(2) + 'x**\n\n' +
      'Projected daily revenue: **' + fmt(projRev) + '** (normal: ' + fmt(dRev()) + ')\n' +
      'Projected daily profit: **' + fmt(projProf) + '**\n\n' +
      '**Per-product projected sales:**\n' + fcLines.join('\n');
  }

  /* ══ 3. REORDER ALERTS ══ */
  if (q.includes('reorder') || q.includes('order') || q.includes('running low') ||
      q.includes('running out') || q.includes('alert') || q.includes('urgent')) {
    var crit  = inv.filter(function(p){ return dl(p) <= 3; });
    var low   = inv.filter(function(p){ var x=dl(p); return x>3&&x<=7; });
    var belRp = inv.filter(function(p){ return p.stock <= p.reorder && dl(p) > 7; });
    var lines = [];
    if (crit.length) {
      lines.push('**\uD83D\uDEA8 Order TODAY (\u22643 days left):**');
      for (var ri = 0; ri < crit.length; ri++) {
        lines.push('  \u2022 ' + crit[ri].name + ' \u2014 ' + dl(crit[ri]) + 'd left | stock: ' + crit[ri].stock + ' | daily: ' + crit[ri].daily);
      }
    }
    if (low.length) {
      lines.push('**\u26A0\uFE0F Order this week (4-7 days):**');
      for (var li = 0; li < low.length; li++) {
        lines.push('  \u2022 ' + low[li].name + ' \u2014 ' + dl(low[li]) + 'd left | reorder pt: ' + low[li].reorder);
      }
    }
    if (belRp.length) {
      lines.push('**\uD83D\uDCE6 Below reorder point (>7d stock):**');
      for (var bi = 0; bi < belRp.length; bi++) {
        lines.push('  \u2022 ' + belRp[bi].name + ' \u2014 stock: ' + belRp[bi].stock + ' / reorder: ' + belRp[bi].reorder);
      }
    }
    if (!lines.length) return '\u2705 All ' + inv.length + ' products healthy (>7 days, above reorder points).';
    return lines.join('\n');
  }

  /* ══ 4. LOSS PRODUCTS ══ */
  if (q.includes('loss') || q.includes('losing') || q.includes('below cost') || q.includes('nuksan') || q.includes('negative margin')) {
    var lp = inv.filter(function(p){ return p.price < p.cost; });
    if (!lp.length) return '\u2705 No loss products. All ' + inv.length + ' items profitable (avg margin: ' + avgMg() + '%).';
    var out = '**' + lp.length + ' product(s) below cost:**\n';
    for (var lpi = 0; lpi < lp.length; lpi++) {
      var lss = lp[lpi].cost - lp[lpi].price;
      out += '\u2022 **' + lp[lpi].name + '** \u2014 cost Rs '+lp[lpi].cost+', price Rs '+lp[lpi].price+'\n' +
             '  Loss: Rs '+lss+'/unit | Weekly loss: '+fmt(lss*lp[lpi].daily*7)+'\n' +
             '  Min price for 15% margin: Rs '+Math.ceil(lp[lpi].cost*1.15)+'\n';
    }
    return out.trim();
  }

  /* ══ 5. FULL PRODUCT LIST ══ */
  if (q.includes('all product') || q.includes('full list') || q.includes('full inventory') ||
      q.includes('list all') || q.includes('show all') || q.includes('every product')) {
    var out = '**All ' + inv.length + ' products:**\n';
    for (var ali = 0; ali < inv.length; ali++) {
      var ap   = inv[ali];
      var icon = dl(ap)<=3 ? '\uD83D\uDEA8' : dl(ap)<=7 ? '\u26A0\uFE0F' : '\u2705';
      out += icon + ' **' + ap.name + '** [' + ap.cat + '] \u2014 stock:' + ap.stock + ' (' + dl(ap) + 'd) | Rs' + ap.price + ' | ' + mg(ap) + '% margin\n';
    }
    return out.trim();
  }

  /* ══ 6. TOP MARGINS ══ */
  if (q.includes('top margin') || q.includes('best margin') || q.includes('highest margin') || q.includes('most profitable') ||
      (q.includes('profit') && (q.includes('top') || q.includes('best') || q.includes('highest')))) {
    var tm  = sortByMargin().slice(0, 3);
    var out = '**Top 3 by profit margin:**\n';
    for (var tmi = 0; tmi < tm.length; tmi++) {
      var tmp = tm[tmi];
      out += (tmi+1) + '. **' + tmp.name + '** \u2014 ' + mg(tmp) + '% | Rs ' + (tmp.price-tmp.cost) + '/unit | weekly profit: ' + fmt((tmp.price-tmp.cost)*tmp.daily*7) + '\n';
    }
    out += '\nCombined weekly profit: ' + fmt(tm.reduce(function(s,p){ return s+(p.price-p.cost)*p.daily*7; }, 0));
    return out.trim();
  }

  /* ══ 7. WORST MARGINS ══ */
  if (q.includes('worst margin') || q.includes('lowest margin') || q.includes('least profitable') || q.includes('poor margin')) {
    var bm  = sortByMargin().slice(-3).reverse();
    var out = '**3 products with lowest margins:**\n';
    for (var bmi = 0; bmi < bm.length; bmi++) {
      var bmp = bm[bmi];
      var bpu = bmp.price - bmp.cost;
      out += (bmi+1) + '. **' + bmp.name + '** \u2014 ' + mg(bmp) + '% margin (' + (bpu<0 ? 'loss Rs '+Math.abs(bpu) : 'Rs '+bpu) + '/unit)\n';
    }
    return out.trim();
  }

  /* ══ 8. STOCK URGENCY (which runs out first) ══ */
  if ((q.includes('first') && (q.includes('run') || q.includes('out') || q.includes('finish') || q.includes('stock'))) ||
       q.includes('urgency') || q.includes('soonest')) {
    var sd  = sortByDaysLeft();
    var out = '**' + sd[0].name + '** runs out first \u2014 **' + dl(sd[0]) + ' days** left.\n' +
      sd[0].stock + ' units \u00F7 ' + sd[0].daily + '/day = ' + dl(sd[0]) + ' days.';
    if (sd.length > 1) {
      out += '\nNext: ' + sd[1].name + ' (' + dl(sd[1]) + 'd)';
      if (sd.length > 2) out += ', ' + sd[2].name + ' (' + dl(sd[2]) + 'd)';
      out += '.';
    }
    return out;
  }

  /* ══ 9. REVENUE ══ */
  if (q.includes('revenue') || q.includes('income') || q.includes('turnover') ||
      (q.includes('sale') && !q.includes('best sell')) || q.includes('earning')) {
    var topR = sortByRevUnit().slice(0, 3);
    var out  = '**Store Revenue:**\n' +
      '\u2022 Daily: ' + fmt(dRev()) + '\n' +
      '\u2022 Weekly: ' + fmt(wRev()) + '\n' +
      '\u2022 Monthly est: ' + fmt(wRev() * 4) + '\n\n' +
      '**Top 3 revenue drivers:**\n';
    for (var ri2 = 0; ri2 < topR.length; ri2++) {
      var rp = topR[ri2];
      out += (ri2+1) + '. ' + rp.name + ' \u2014 ' + fmt(rp.price*rp.daily*7) + '/week (' + rp.daily + '/day \u00D7 Rs' + rp.price + ')\n';
    }
    return out.trim();
  }

  /* ══ 10. PROFIT (store-wide) ══ */
  if (q.includes('profit') || q.includes('faida') || q.includes('kamai')) {
    var topP = sortByProfitAbs().slice(0, 3);
    var out  = '**Store Profit:**\n' +
      '\u2022 Daily: ' + fmt(dProfit()) + '\n' +
      '\u2022 Weekly: ' + fmt(wProfit()) + '\n' +
      '\u2022 Monthly est: ' + fmt(wProfit() * 4) + '\n' +
      '\u2022 Avg margin: ' + avgMg() + '%\n\n' +
      '**Top 3 profit contributors:**\n';
    for (var pi2 = 0; pi2 < topP.length; pi2++) {
      var pp  = topP[pi2];
      var ppu = pp.price - pp.cost;
      out += (pi2+1) + '. ' + pp.name + ' \u2014 ' + fmt(ppu*pp.daily*7) + '/week (Rs '+ppu+'/unit \u00D7 '+pp.daily+'/day \u00D7 7)\n';
    }
    return out.trim();
  }

  /* ══ 11. STORE HEALTH SUMMARY ══ */
  if (q.includes('summary') || q.includes('health') || q.includes('overview') ||
      q.includes('status') || q.includes('store doing') || q.includes('how is')) {
    var lossC = inv.filter(function(p){ return p.price < p.cost; }).length;
    var critC = inv.filter(function(p){ return dl(p) <= 3; }).length;
    var lowC  = inv.filter(function(p){ var x=dl(p); return x>3&&x<=7; }).length;
    var belC  = inv.filter(function(p){ return p.stock <= p.reorder; }).length;
    return '**Store Health \u2014 ' + todayStr() + '**\n' +
      '\u2022 Products: ' + inv.length + '\n' +
      '\u2022 Daily revenue: ' + fmt(dRev()) + ' | Weekly: ' + fmt(wRev()) + '\n' +
      '\u2022 Daily profit: ' + fmt(dProfit()) + ' | Weekly: ' + fmt(wProfit()) + '\n' +
      '\u2022 Avg margin: ' + avgMg() + '%\n' +
      '\u2022 \uD83D\uDEA8 Critical stock: ' + critC + ' product(s)\n' +
      '\u2022 \u26A0\uFE0F Low stock: ' + lowC + ' product(s)\n' +
      '\u2022 \uD83D\uDCE6 Below reorder pt: ' + belC + ' product(s)\n' +
      '\u2022 \uD83D\uDCC9 Loss-making: ' + lossC + ' product(s)';
  }

  /* ══ 12. CATEGORY ══ */
  var catNames = ['grocery','beverage','cosmetic','detergent'];
  for (var ci = 0; ci < catNames.length; ci++) {
    if (q.includes(catNames[ci])) {
      var catItems = filterCat(catNames[ci]);
      if (!catItems.length) return 'No products in the "' + catNames[ci] + '" category.';
      var catRev  = catItems.reduce(function(s,p){ return s+p.price*p.daily*7; }, 0);
      var catProf = catItems.reduce(function(s,p){ return s+(p.price-p.cost)*p.daily*7; }, 0);
      var catAvgM = Math.round(catItems.reduce(function(s,p){ return s+mg(p); }, 0) / catItems.length);
      var catLabel = catNames[ci].charAt(0).toUpperCase() + catNames[ci].slice(1);
      var out = '**' + catLabel + ' \u2014 ' + catItems.length + ' product(s):**\n';
      for (var cki = 0; cki < catItems.length; cki++) {
        var cp   = catItems[cki];
        var cion = dl(cp)<=3 ? '\uD83D\uDEA8' : dl(cp)<=7 ? '\u26A0\uFE0F' : '\u2705';
        out += cion + ' ' + cp.name + ' \u2014 stock:' + cp.stock + ' (' + dl(cp) + 'd) | Rs' + cp.price + ' | ' + mg(cp) + '%\n';
      }
      out += '\nWeekly revenue: ' + fmt(catRev) + ' | Weekly profit: ' + fmt(catProf) + ' | Avg margin: ' + catAvgM + '%';
      return out.trim();
    }
  }

  /* ══ 13. PRICING ADVICE ══ */
  if (q.includes('price') || q.includes('pricing') || q.includes('charge') || q.includes('qeemat')) {
    var lp2 = inv.filter(function(p){ return p.price < p.cost; });
    if (lp2.length) {
      var out = '**Pricing issues:**\n';
      for (var lp2i = 0; lp2i < lp2.length; lp2i++) {
        var lp2p = lp2[lp2i];
        out += '\u2022 **' + lp2p.name + '**: Rs'+lp2p.price+' (cost Rs'+lp2p.cost+')\n' +
               '  \u2192 10% margin: Rs '+Math.ceil(lp2p.cost*1.1)+' | 15%: Rs '+Math.ceil(lp2p.cost*1.15)+' | 20%: Rs '+Math.ceil(lp2p.cost*1.2)+'\n';
      }
      return out.trim();
    }
    var bmP = sortByMargin()[inv.length-1];
    return 'All products priced above cost. Avg margin: ' + avgMg() + '%.\nLowest margin: ' + bmP.name + ' (' + mg(bmP) + '%) \u2014 consider raising its price.';
  }

  /* ══ 14. REORDER POINT ══ */
  if (q.includes('reorder point') || q.includes('reorder level') || q.includes('below reorder')) {
    var belRP = inv.filter(function(p){ return p.stock <= p.reorder; });
    if (!belRP.length) return '\u2705 No products below their reorder points.';
    var out = '**' + belRP.length + ' product(s) at/below reorder point:**\n';
    for (var rpi = 0; rpi < belRP.length; rpi++) {
      out += '\u2022 ' + belRP[rpi].name + ' \u2014 stock: '+belRP[rpi].stock+' | reorder pt: '+belRP[rpi].reorder+' | '+dl(belRP[rpi])+'d left\n';
    }
    return out.trim();
  }

  /* ══ 15. BEST SELLERS ══ */
  if (q.includes('best sell') || q.includes('top sell') || q.includes('most sold') ||
      q.includes('fastest') || q.includes('popular') || q.includes('high demand')) {
    var bsTop = sortByDaily().slice(0, 3);
    var out   = '**Top 3 by daily sales volume:**\n';
    for (var bsi = 0; bsi < bsTop.length; bsi++) {
      var bsp = bsTop[bsi];
      out += (bsi+1) + '. **' + bsp.name + '** \u2014 ' + bsp.daily + '/day | ' + fmt(bsp.price*bsp.daily) + '/day revenue\n';
    }
    return out.trim();
  }

  /* ══ 16. SLOW MOVERS ══ */
  if (q.includes('slow') || q.includes('not selling') || q.includes('dead stock') || q.includes('least sold')) {
    var slow = inv.slice().sort(function(a,b){ return a.daily-b.daily; }).slice(0, 3);
    var out  = '**3 slowest-moving products:**\n';
    for (var sli = 0; sli < slow.length; sli++) {
      var slp = slow[sli];
      out += (sli+1) + '. **' + slp.name + '** \u2014 ' + slp.daily + '/day | ' + slp.stock + ' units (' + (dl(slp)===999?'\u221E':dl(slp)) + 'd supply)\n';
    }
    out += '\nConsider discounting or reducing reorder quantities.';
    return out.trim();
  }

  /* ══ 17. COMPARE TWO PRODUCTS ══ */
  if (q.includes('compare') || q.includes(' vs ') || q.includes('versus') || q.includes('better than')) {
    var found = [];
    for (var cpi = 0; cpi < inv.length; cpi++) {
      if (q.includes(inv[cpi].name.toLowerCase().split(' ')[0])) found.push(inv[cpi]);
      if (found.length === 2) break;
    }
    if (found.length === 2) {
      var a = found[0], b = found[1];
      return '**' + a.name + '** vs **' + b.name + '**\n' +
        '\u2022 Margin: ' + mg(a) + '% vs ' + mg(b) + '%\n' +
        '\u2022 Profit/unit: Rs ' + (a.price-a.cost) + ' vs Rs ' + (b.price-b.cost) + '\n' +
        '\u2022 Daily sales: ' + a.daily + ' vs ' + b.daily + '/day\n' +
        '\u2022 Stock: ' + dl(a) + 'd vs ' + dl(b) + 'd\n' +
        '\u2022 Weekly profit: ' + fmt((a.price-a.cost)*a.daily*7) + ' vs ' + fmt((b.price-b.cost)*b.daily*7) + '\n' +
        (mg(a) > mg(b)
          ? '\u2192 **' + a.name + '** is more profitable per unit.'
          : '\u2192 **' + b.name + '** is more profitable per unit.');
    }
  }

  /* ══ 18. ALL DAYS OF STOCK ══ */
  if ((q.includes('how many days') || q.includes('how long') || q.includes('days left') || q.includes('kitne din')) && !hit) {
    var sd2 = sortByDaysLeft();
    var out = '**Days of stock remaining:**\n';
    for (var sdi = 0; sdi < sd2.length; sdi++) {
      var sdp  = sd2[sdi];
      var sdi2 = dl(sdp) <= 3 ? '\uD83D\uDEA8' : dl(sdp) <= 7 ? '\u26A0\uFE0F' : '\u2705';
      out += sdi2 + ' ' + sdp.name + ' \u2014 ' + dl(sdp) + 'd (' + sdp.stock + ' \u00F7 ' + sdp.daily + '/day)\n';
    }
    return out.trim();
  }

  /* ══ 19. MOST STOCK ══ */
  if (q.includes('most stock') || q.includes('highest stock') || q.includes('largest stock')) {
    var ms  = sortByStock().slice(0, 3);
    var out = '**Products with most stock:**\n';
    for (var msi = 0; msi < ms.length; msi++) {
      out += (msi+1) + '. ' + ms[msi].name + ' \u2014 ' + ms[msi].stock + ' units (' + dl(ms[msi]) + ' days supply)\n';
    }
    return out.trim();
  }

  /* ══ 20. RECOMMENDATIONS ══ */
  if (q.includes('improve') || q.includes('increase') || q.includes('grow') ||
      q.includes('suggest') || q.includes('advice') || q.includes('recommend') || q.includes('mashwara')) {
    var lossI = inv.filter(function(p){ return p.price < p.cost; });
    var critI = inv.filter(function(p){ return dl(p) <= 3; });
    var topMI = sortByMargin()[0];
    var botMI = sortByMargin()[inv.length-1];
    var out = '**Recommendations:**\n';
    var n = 1;
    if (lossI.length) { out += n + '. Fix pricing: **' + lossI.map(function(p){ return p.name; }).join(', ') + '** \u2014 selling below cost.\n'; n++; }
    if (critI.length) { out += n + '. Reorder NOW: **' + critI.map(function(p){ return p.name; }).join(', ') + '** \u2014 \u22643 days left.\n'; n++; }
    out += n + '. Push **' + topMI.name + '** (' + mg(topMI) + '% margin) \u2014 highest profit per unit.\n'; n++;
    out += n + '. Reduce orders for **' + botMI.name + '** (' + mg(botMI) + '%) \u2014 lowest return.';
    return out.trim();
  }

  /* ══ FALLBACK ══ */
  var urgentF = inv.filter(function(p){ return dl(p) <= 3; });
  if (urgentF.length) {
    return 'I couldn\'t match that query, but here\'s what\'s urgent:\n' +
      '\uD83D\uDEA8 **Critical stock:** ' + urgentF.map(function(p){ return p.name+'('+dl(p)+'d)'; }).join(', ') + '\n\n' +
      'I can answer questions about:\n' +
      '\u2022 Any product by name (e.g. "Tell me about Cooking Oil")\n' +
      '\u2022 Stock, reorder alerts, loss products\n' +
      '\u2022 Margins, revenue, profit\n' +
      '\u2022 Seasonal forecasts (Ramadan, Eid, Summer, Friday...)';
  }
  return 'I know all your inventory data. Try:\n' +
    '\u2022 "Show all products"\n' +
    '\u2022 "What is my weekly revenue?"\n' +
    '\u2022 "Forecast Ramadan sales"\n' +
    '\u2022 Any product name like "Cooking Oil" or "Colgate"';
}

/* ─────────────────────────────────────────────────────────
   MESSAGE RENDERING
   ───────────────────────────────────────────────────────── */
function sanitize(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatMsgText(text) {
  return text
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/^([•\-\*]) /gm, '<span style="color:var(--green);margin-right:4px">&#8226;</span> ');
}

function appendMsg(role, text) {
  var el = document.getElementById('chat-messages');
  if (!el) return;

  var wrap = document.createElement('div');
  wrap.className = 'msg ' + role;
  wrap.style.animation = 'slideInBottom 0.3s ease both';

  var avEl = document.createElement('div');
  avEl.className = 'msg-avatar';
  avEl.textContent = role === 'ai' ? 'D' : 'U';

  var bubble = document.createElement('div');
  bubble.className = 'msg-bubble';

  var formatted = formatMsgText(sanitize(text));
  bubble.innerHTML = formatted.replace(/\n/g, '<br>');

  if (role === 'ai') {
    var copyBtn = document.createElement('button');
    copyBtn.className = 'msg-copy';
    copyBtn.title = 'Copy message';
    copyBtn.innerHTML = '&#10064;';
    copyBtn.onclick = function() {
      navigator.clipboard.writeText(text).then(function() {
        copyBtn.innerHTML = '&#10003;';
        copyBtn.style.color = 'var(--green)';
        setTimeout(function(){
          copyBtn.innerHTML = '&#10064;';
          copyBtn.style.color = '';
        }, 1500);
      });
    };
    bubble.appendChild(copyBtn);
  }

  wrap.appendChild(avEl);
  wrap.appendChild(bubble);
  el.appendChild(wrap);
  el.scrollTop = el.scrollHeight;
}

function appendTyping(id) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'msg ai';
  div.id = id;
  div.style.animation = 'slideInBottom 0.25s ease both';
  div.innerHTML =
    '<div class="msg-avatar">D</div>' +
    '<div class="msg-bubble" style="color:var(--text3);min-width:60px">' +
      '<span class="dots"><span>.</span><span>.</span><span>.</span></span>' +
    '</div>';
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function removeTyping(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}
