/**
 * ai-chat.js — Dukaan AI v2.0
 * Premium AI Assistant — typing indicator, markdown-lite formatting, copy, chips
 */

var CLAUDE_API_KEY = '';  // <-- Paste your API key here (dev only)
var CHAT_HISTORY   = [];

function buildSystemPrompt() {
  var now     = new Date();
  var dayName = ['Sunday','Monday','Tuesday','Wednesday','Thursday','Friday','Saturday'][now.getDay()];
  var criticalProds  = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; });
  var lowProds       = INVENTORY.filter(function(p){ var d=daysLeft(p); return d>3&&d<=7; });
  var lossProds      = INVENTORY.filter(function(p){ return p.price < p.cost; });
  var topMargin      = INVENTORY.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); }).slice(0,3);
  var totalWeeklyRev = INVENTORY.reduce(function(s,p){ return s+p.price*p.daily*7; },0);
  var avgMargin      = Math.round(INVENTORY.reduce(function(s,p){ return s+marginPct(p); },0)/INVENTORY.length);

  return [
    'You are Dukaan AI — an expert retail intelligence assistant for a Pakistani grocery and general store.',
    'Today is ' + dayName + ', ' + todayStr() + '.',
    '',
    'STORE SNAPSHOT:',
    '- Products tracked: ' + INVENTORY.length,
    '- Estimated weekly revenue: ' + formatRs(totalWeeklyRev),
    '- Average margin: ' + avgMargin + '%',
    '- Critical stock (<=3 days): ' + (criticalProds.length ? criticalProds.map(function(p){ return p.name+'('+daysLeft(p)+'d)'; }).join(', ') : 'None'),
    '- Low stock (4-7 days): ' + (lowProds.length ? lowProds.map(function(p){ return p.name+'('+daysLeft(p)+'d)'; }).join(', ') : 'None'),
    '- Loss-making products: ' + (lossProds.length ? lossProds.map(function(p){ return p.name+'('+marginPct(p)+'%)'; }).join(', ') : 'None'),
    '- Top margin products: ' + topMargin.map(function(p){ return p.name+'('+marginPct(p)+'%)'; }).join(', '),
    '',
    'FULL INVENTORY:',
    INVENTORY.map(function(p){
      return '* ' + p.name + ' [' + p.cat + '] stock=' + p.stock + ' daily=' + p.daily +
        ' days_left=' + daysLeft(p) + ' price=Rs' + p.price + ' cost=Rs' + p.cost + ' margin=' + marginPct(p) + '%';
    }).join('\n'),
    '',
    'RULES:',
    '- Respond in clear, professional English only.',
    '- Be concise — lead with the key insight, then explain.',
    '- Always cite specific numbers from the inventory data.',
    '- If asked for a recommendation, give ONE clear action first, then reasoning.',
    '- For pricing questions, calculate exact Rs amounts.',
    '- Use bullet points for lists of 3+ items.',
    '- Maximum 200 words unless the user explicitly asks for detail.',
    '- Never make up data not in the inventory.',
  ].join('\n');
}

function renderAiChatPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += '<div id="panel-ai" class="panel">' +
    '<div class="ai-panel-header">' +
      '<div>' +
        '<div class="page-title">AI Assistant</div>' +
        '<div class="page-sub" style="margin-bottom:0">Ask anything about your inventory, pricing, or reorder planning</div>' +
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
        '<button class="chip" onclick="sendChip(\'Which product will run out of stock first?\')">&#9889; Stock urgency</button>' +
      '</div>' +

      '<div class="chat-input-wrap">' +
        '<textarea class="chat-input" id="chat-input" rows="1"' +
          ' placeholder="Ask anything — e.g. \'When will Rice run out?\' or \'Best margin product?\'"' +
          ' onkeydown="handleChatKey(event)" oninput="autoResizeInput(this);updateChatCounter()">' +
        '</textarea>' +
        '<button class="chat-send" id="chat-send" onclick="sendChat()" title="Send (Enter)">&#8679;</button>' +
      '</div>' +
      '<div class="chat-counter" id="chat-counter">0 / 500</div>' +
    '</div>' +
  '</div>';

  appendMsg('ai', 'Hello! \uD83D\uDC4B I\'m Dukaan AI, your smart retail assistant. Ask me anything about your inventory, pricing, reorder planning, or profit margins.');
}

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
    appendMsg('ai', 'An error occurred: ' + sanitize(err.message) + '. Please try again.');
  }

  document.getElementById('chat-send').disabled = false;
}

async function callClaudeAPI() {
  if (!CLAUDE_API_KEY) {
    return demoResponse(CHAT_HISTORY[CHAT_HISTORY.length - 1].content);
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

function demoResponse(question) {
  var q = question.toLowerCase();
  if (q.includes('rice')) {
    var r = INVENTORY.filter(function(p){ return p.name.toLowerCase().includes('rice'); })[0];
    if (r) return 'Basmati Rice has only ' + r.stock + ' units left, selling ' + r.daily + '/day — just ' + daysLeft(r) + ' days of stock remaining. \uD83D\uDEA8 Reorder today.';
  }
  if (q.includes('loss')) {
    var lp = INVENTORY.filter(function(p){ return p.price < p.cost; });
    if (lp.length) return lp.length + ' product(s) making a loss: ' + lp.map(function(p){ return p.name + ' (' + marginPct(p) + '%)'; }).join(', ') + '. Review pricing immediately. \uD83D\uDCC9';
    return 'Great news — no loss-making products right now! All items are profitable. \u2705';
  }
  if (q.includes('reorder') || q.includes('order')) {
    var rp = INVENTORY.filter(function(p){ return daysLeft(p) <= 7; });
    if (rp.length) return 'Products needing reorder: ' + rp.map(function(p){ return p.name + ' (' + daysLeft(p) + ' days)'; }).join(', ') + '. \uD83D\uDCE6';
    return 'No urgent reorders needed — all stock levels are healthy! \u2705';
  }
  if (q.includes('margin') || q.includes('profit')) {
    var top = INVENTORY.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); }).slice(0,3);
    return 'Top margin products:\n' + top.map(function(p,i){ return (i+1) + '. ' + p.name + ' — ' + marginPct(p) + '% margin (Rs ' + (p.price-p.cost) + '/unit)'; }).join('\n') + '\n\nConsider stocking more of these for higher returns. \uD83D\uDCB0';
  }
  if (q.includes('urgency') || q.includes('first') || q.includes('stock') || q.includes('inventory')) {
    var crit = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; });
    if (crit.length) return crit.length + ' critically low products: ' + crit.map(function(p){ return p.name + ' (' + daysLeft(p) + 'd)'; }).join(', ') + '. Order immediately! \uD83D\uDEA8';
    return 'No critical stock issues. All ' + INVENTORY.length + ' products are healthy. \u2705';
  }
  if (q.includes('summary') || q.includes('health')) {
    var lossCount = INVENTORY.filter(function(p){ return p.price < p.cost; }).length;
    var critCount = INVENTORY.filter(function(p){ return daysLeft(p) <= 3; }).length;
    var weekRev   = INVENTORY.reduce(function(s,p){ return s+p.price*p.daily*7; },0);
    var avgM      = Math.round(INVENTORY.reduce(function(s,p){ return s+marginPct(p); },0)/INVENTORY.length);
    return 'Store Health Summary:\n' +
      '\u2022 ' + INVENTORY.length + ' products tracked\n' +
      '\u2022 Weekly revenue: ' + formatRs(weekRev) + '\n' +
      '\u2022 Average margin: ' + avgM + '%\n' +
      '\u2022 Critical alerts: ' + critCount + '\n' +
      '\u2022 Loss products: ' + lossCount + '\n\n' +
      (CLAUDE_API_KEY ? '' : 'Set CLAUDE_API_KEY in ai-chat.js for full AI responses. \uD83E\uDD16');
  }
  return 'Got your question! ' + (CLAUDE_API_KEY ? '' : 'Set CLAUDE_API_KEY in ai-chat.js for full AI responses. ') + 'Try asking about stock levels, reorders, margins, or losses. \uD83E\uDD16';
}

function sanitize(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function formatMsgText(text) {
  // Markdown-lite: bold **text**, bullet lines starting with •/-/*
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

  // Render formatted text with line breaks
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
