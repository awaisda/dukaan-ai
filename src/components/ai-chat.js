/**
 * ai-chat.js — Dukaan AI
 * AI Assistant panel — Claude API + XSS-safe DOM helpers
 */

var CLAUDE_API_KEY = '';  // <-- apni API key yahan paste karein (dev only)
var CHAT_HISTORY   = [];

function buildSystemPrompt() {
  var lossProds = INVENTORY
    .filter(function(p){ return p.price < p.cost; })
    .map(function(p){ return p.name; }).join(', ');

  var lowStock = INVENTORY
    .filter(function(p){ return daysLeft(p) <= 5; })
    .map(function(p){ return p.name + ' (' + daysLeft(p) + ' din)'; }).join(', ');

  return 'You are Dukaan AI — a smart retail intelligence assistant for a Pakistani grocery store.\n'
    + 'Speak in natural Urdu/English mix (Hinglish). Be practical, concise, helpful.\n\n'
    + 'Live store data (today ' + todayStr() + '):\n'
    + '- Total products: ' + INVENTORY.length + '\n'
    + '- Weekly est. revenue: ' + formatRs(INVENTORY.reduce(function(s,p){ return s+p.price*p.daily*7; },0)) + '\n'
    + '- Products at loss: ' + (lossProds || 'None') + '\n'
    + '- Low stock (≤5 days): ' + (lowStock || 'None') + '\n\n'
    + 'Full inventory:\n'
    + INVENTORY.map(function(p){
        return p.name+': stock='+p.stock+', daily='+p.daily+', days_left='+daysLeft(p)
          +', price=Rs'+p.price+', cost=Rs'+p.cost+', margin='+marginPct(p)+'%';
      }).join('\n')
    + '\n\nRules:\n'
    + '- Jawab Urdu/English mix mein dein\n'
    + '- Practical, actionable advice dein\n'
    + '- Numbers clearly cite karein\n'
    + '- Emojis sparingly use karein\n'
    + '- Maximum 150 words per response';
}

function renderAiChatPanel() {
  var el = document.getElementById('app-main');
  if (!el) return;

  el.innerHTML += `
    <div id="panel-ai" class="panel">
      <div class="page-title">AI Assistant</div>
      <div class="page-sub">Apni dukaan ke baare mein kuch bhi poochhein — Urdu ya English mein</div>

      <div class="ai-panel">
        <div class="chat-messages" id="chat-messages"></div>
        <div class="chat-input-wrap">
          <textarea
            class="chat-input"
            id="chat-input"
            rows="1"
            placeholder="Jaise: 'Rice ka stock kab khatam hoga?' ya 'Kaunsa product loss mein hai?'"
            onkeydown="handleChatKey(event)"
          ></textarea>
          <button class="chat-send" id="chat-send" onclick="sendChat()" title="Send (Enter)">↑</button>
        </div>
      </div>
    </div>
  `;

  // Welcome message
  appendMsg('ai', 'Assalam o Alaikum! 👋 Main Dukaan AI hoon. Apni dukaan ke baare mein kuch bhi poochhein — inventory, pricing, reorder suggestions, ya koi bhi masla. Urdu aur English dono chalti hain!');
}

function handleChatKey(e) {
  if (e.key === 'Enter' && !e.shiftKey) {
    e.preventDefault();
    sendChat();
  }
}

async function sendChat() {
  var input = document.getElementById('chat-input');
  var msg   = (input.value || '').trim();
  if (!msg) return;

  appendMsg('user', msg);
  input.value = '';
  input.style.height = '';
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
    appendMsg('ai', 'Maafi — koi error aa gayi: ' + sanitize(err.message) + '. Dobara try karein. 🙏');
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
      max_tokens: 500,
      system: buildSystemPrompt(),
      messages: CHAT_HISTORY
    })
  });

  if (!response.ok) {
    var err = await response.json().catch(function(){ return {}; });
    throw new Error(err.error ? err.error.message : 'API error ' + response.status);
  }

  var data = await response.json();
  return data.content && data.content[0] ? data.content[0].text : 'Jawab nahi mila.';
}

function demoResponse(question) {
  var q = question.toLowerCase();
  if (q.includes('rice') || q.includes('chawal')) {
    var r = INVENTORY.filter(function(p){ return p.name.toLowerCase().includes('rice'); })[0];
    if (r) return 'Basmati Rice mein sirf ' + r.stock + ' units hain, rozana ' + r.daily + ' bikti hain — matlab sirf ' + daysLeft(r) + ' din ka stock bacha hai! 🚨 Aaj hi reorder karo.';
  }
  if (q.includes('loss') || q.includes('nuksan')) {
    var lp = INVENTORY.filter(function(p){ return p.price < p.cost; });
    if (lp.length) return lp.length + ' products loss mein hain: ' + lp.map(function(p){ return p.name + ' (' + marginPct(p) + '%)'; }).join(', ') + '. Inki pricing turant review karein. 📉';
  }
  if (q.includes('reorder') || q.includes('order')) {
    var rp = INVENTORY.filter(function(p){ return daysLeft(p) <= 7; });
    if (rp.length) return 'Reorder zaroorat: ' + rp.map(function(p){ return p.name + ' (' + daysLeft(p) + ' din)'; }).join(', ') + '. 📦';
    return 'Abhi koi urgent reorder nahi — sab theek hai! ✅';
  }
  if (q.includes('profit') || q.includes('kamai') || q.includes('margin')) {
    var top = INVENTORY.slice().sort(function(a,b){ return marginPct(b)-marginPct(a); }).slice(0,3);
    return 'Top margin products: ' + top.map(function(p){ return p.name + ' (' + marginPct(p) + '%)'; }).join(', ') + '. In ki stock barhaao! 💰';
  }
  if (q.includes('stock') || q.includes('inventory')) {
    var crit = INVENTORY.filter(function(p){ return daysLeft(p)<=3; });
    if (crit.length) return crit.length + ' products critical hain: ' + crit.map(function(p){ return p.name; }).join(', ') + '. Aaj hi order karo! 🚨';
    return 'Koi critical stock issue nahi. Total ' + INVENTORY.length + ' products active hain. ✅';
  }
  return 'Ye sawaal samajh aa gaya! API key set karein CLAUDE_API_KEY mein toh main aur behtar jawab de sakta hoon. Demo mode mein limited responses hain. 🤖';
}

/* ---- XSS-safe DOM helpers ---- */
function sanitize(str) {
  var d = document.createElement('div');
  d.textContent = str;
  return d.innerHTML;
}

function appendMsg(role, text) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var avatar = role === 'ai' ? 'D' : 'U';
  var div = document.createElement('div');
  div.className = 'msg ' + role;

  var avEl = document.createElement('div');
  avEl.className = 'msg-avatar';
  avEl.textContent = avatar;

  var bubble = document.createElement('div');
  bubble.className = 'msg-bubble';
  // Safe: split on newlines, create text nodes with <br>
  text.split('\n').forEach(function(line, i, arr) {
    bubble.appendChild(document.createTextNode(line));
    if (i < arr.length - 1) bubble.appendChild(document.createElement('br'));
  });

  div.appendChild(avEl);
  div.appendChild(bubble);
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function appendTyping(id) {
  var el = document.getElementById('chat-messages');
  if (!el) return;
  var div = document.createElement('div');
  div.className = 'msg ai';
  div.id = id;
  div.innerHTML = `<div class="msg-avatar">D</div>
    <div class="msg-bubble" style="color:var(--text3)">
      <span class="dots"><span>.</span><span>.</span><span>.</span></span>
    </div>`;
  el.appendChild(div);
  el.scrollTop = el.scrollHeight;
}

function removeTyping(id) {
  var el = document.getElementById(id);
  if (el) el.remove();
}
