const API = '/v1';

const SITES = {
  1: 'Footsites', 2: 'Shopify', 3: 'Demandware',
  4: 'Nike', 5: 'Supreme NY', 6: 'Pokemon Center CA'
};

const taskStatuses = {};
const activeStreams = {};

// ── API helpers ──────────────────────────────────────────────────────────────
const get  = (path) => fetch(API + path).then(r => r.json());
const post = (path, body) => fetch(API + path, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body || {}) }).then(r => r.json());
const patch = (path, body) => fetch(API + path, { method: 'PATCH', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());
const del  = (path) => fetch(API + path, { method: 'DELETE' }).then(r => r.json());
const put  = (path, body) => fetch(API + path, { method: 'PUT', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) }).then(r => r.json());

// ── Toast ────────────────────────────────────────────────────────────────────
function toast(msg, type = '') {
  const el = document.getElementById('toast');
  el.textContent = msg;
  el.className = `toast show ${type}`;
  clearTimeout(el._t);
  el._t = setTimeout(() => el.className = 'toast', 3000);
}

// ── Tabs ─────────────────────────────────────────────────────────────────────
document.querySelectorAll('.nav-btn').forEach(btn => {
  btn.addEventListener('click', () => {
    document.querySelectorAll('.nav-btn').forEach(b => b.classList.remove('active'));
    document.querySelectorAll('.tab').forEach(t => t.classList.remove('active'));
    btn.classList.add('active');
    document.getElementById('tab-' + btn.dataset.tab).classList.add('active');
    if (btn.dataset.tab === 'tasks')     loadTasks();
    if (btn.dataset.tab === 'addresses') loadAddresses();
    if (btn.dataset.tab === 'payments')  loadPaymentProfiles();
    if (btn.dataset.tab === 'proxies')   loadProxies();
    if (btn.dataset.tab === 'settings')  loadSettings();
  });
});

// ── Modals ───────────────────────────────────────────────────────────────────
function openModal(id)  { document.getElementById(id).style.display = ''; }
function closeModal(id) { document.getElementById(id).style.display = 'none'; }

document.querySelectorAll('.modal-overlay').forEach(overlay => {
  overlay.addEventListener('click', e => { if (e.target === overlay) overlay.style.display = 'none'; });
});

// ── TASKS ────────────────────────────────────────────────────────────────────
async function loadTasks() {
  const res = await get('/tasks');
  const container = document.getElementById('tasks-list');

  const [addrRes, payRes] = await Promise.all([get('/addresses'), get('/payment-profiles')]);
  populateSelect('task-shipping', addrRes.data || [], a => `${a.first_name} ${a.last_name} — ${a.address1}`);
  populateSelect('task-billing',  addrRes.data || [], a => `${a.first_name} ${a.last_name} — ${a.address1}`);
  populateSelect('task-payment',  payRes.data  || [], p => `${p.label} ****${String(p.card_number).slice(-4)}`);

  if (!res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No tasks yet — create one to get started.</p></div>`;
    return;
  }

  container.innerHTML = res.data.map(task => buildTaskCard(task)).join('');

  res.data.forEach(task => {
    if (activeStreams[task.id]) reattachStream(task.id);
  });
}

function buildTaskCard(task) {
  const site = SITES[task.site_id] || `Site ${task.site_id}`;
  const taskJson = JSON.stringify(task).replace(/"/g, '&quot;');
  return `
  <div class="card" id="task-card-${task.id}">
    <div class="card-title">
      <span class="status-dot idle" id="dot-${task.id}"></span>
      <span class="url-truncate" title="${task.url}">${task.url}</span>
    </div>
    <div class="card-meta">
      <span class="badge badge-blue">${site}</span>
      ${task.keywords ? `<span class="badge badge-yellow">🔑 ${task.keywords}</span>` : ''}
      ${task.size     ? `<span class="badge badge-blue">Size: ${task.size}</span>`   : ''}
      ${task.auto_solve_captchas ? `<span class="captcha-badge">⚡ Captcha</span>`   : ''}
    </div>
    ${task.coupon_code ? `<div class="card-meta"><span style="color:var(--success)">🏷 ${task.coupon_code}</span></div>` : ''}

    <div class="monitor-panel">
      <div class="stock-status" id="stock-status-${task.id}">
        <span class="stock-dot idle" id="stock-dot-${task.id}"></span>
        <span class="stock-label" id="stock-label-${task.id}" style="color:var(--text-muted)">Not monitoring</span>
      </div>
      <div id="product-preview-${task.id}"></div>
      <div class="monitor-actions">
        <button class="btn-monitor" id="btn-monitor-${task.id}" onclick="startMonitor(${task.id})">📡 Monitor Stock</button>
        <button class="btn-monitor-stop" id="btn-monitor-stop-${task.id}" onclick="stopMonitor(${task.id})" style="display:none">⏹ Stop Monitor</button>
      </div>
    </div>

    <div class="card-actions">
      <button class="btn-start" onclick="startTask(${task.id})">▶ Start Now</button>
      <button class="btn-stop"  onclick="stopTask(${task.id})">■ Stop</button>
      <button class="btn-icon"  onclick="editTask(${taskJson})">Edit</button>
      <button class="btn-danger" onclick="deleteTask(${task.id})">Delete</button>
    </div>
  </div>`;
}

// ── MONITORING ───────────────────────────────────────────────────────────────
async function startMonitor(taskId) {
  const btn      = document.getElementById(`btn-monitor-${taskId}`);
  const btnStop  = document.getElementById(`btn-monitor-stop-${taskId}`);
  const dot      = document.getElementById(`stock-dot-${taskId}`);
  const label    = document.getElementById(`stock-label-${taskId}`);

  btn.disabled = true;
  dot.className = 'stock-dot checking';
  label.textContent = 'Starting monitor…';
  label.className = 'stock-label checking';

  const res = await post(`/tasks/${taskId}/monitor/start`);
  if (!res.success) {
    toast(res.message || 'Failed to start monitor', 'error');
    btn.disabled = false;
    return;
  }

  btn.style.display = 'none';
  btnStop.style.display = '';
  dot.className = 'stock-dot checking';
  label.textContent = 'Checking every 2 seconds…';

  openStream(taskId);
}

function openStream(taskId) {
  if (activeStreams[taskId]) {
    activeStreams[taskId].close();
  }

  const es = new EventSource(`${API}/tasks/${taskId}/monitor/stream`);
  activeStreams[taskId] = es;

  es.onmessage = (e) => {
    try {
      const data = JSON.parse(e.data);
      handleMonitorUpdate(taskId, data);
    } catch (_) {}
  };

  es.onerror = () => {
    const label = document.getElementById(`stock-label-${taskId}`);
    if (label) label.textContent = 'Connection lost — retrying…';
  };
}

function reattachStream(taskId) {
  openStream(taskId);
}

function handleMonitorUpdate(taskId, data) {
  const dot     = document.getElementById(`stock-dot-${taskId}`);
  const label   = document.getElementById(`stock-label-${taskId}`);
  const preview = document.getElementById(`product-preview-${taskId}`);
  const card    = document.getElementById(`task-card-${taskId}`);
  const btn     = document.getElementById(`btn-monitor-${taskId}`);
  const btnStop = document.getElementById(`btn-monitor-stop-${taskId}`);

  if (!dot) return;

  const now = new Date().toLocaleTimeString();

  if (data.status === 'idle' || data.status === 'stopped') {
    dot.className = 'stock-dot idle';
    label.textContent = 'Not monitoring';
    label.className = 'stock-label';
    card.classList.remove('instock-flash');
    btn.style.display = '';
    btnStop.style.display = 'none';
    btn.disabled = false;
    if (preview) preview.innerHTML = '';
    if (activeStreams[taskId]) { activeStreams[taskId].close(); delete activeStreams[taskId]; }
    return;
  }

  if (data.status === 'outofstock') {
    dot.className = 'stock-dot outofstock';
    label.textContent = `Out of stock — last checked ${now}`;
    label.className = 'stock-label outofstock';
    card.classList.remove('instock-flash');
  }

  if (data.status === 'blocked') {
    dot.className = 'stock-dot checking';
    label.textContent = `⚠️ Bot protection hit — rotating agent… (${now})`;
    label.className = 'stock-label checking';
  }

  if (data.status === 'instock') {
    dot.className = 'stock-dot instock';
    label.textContent = `🟢 IN STOCK — ${now}`;
    label.className = 'stock-label instock';
    card.classList.add('instock-flash');
    toast(`IN STOCK detected for task ${taskId}! Starting checkout…`, 'success');
  }

  if (data.status === 'checkout_started') {
    dot.className = 'stock-dot checkout';
    label.textContent = '🛒 Checkout in progress…';
    label.className = 'stock-label checkout_started';
  }

  if (data.status === 'checkout_failed') {
    dot.className = 'stock-dot outofstock';
    label.textContent = `❌ Checkout failed: ${data.error}`;
    label.className = 'stock-label outofstock';
    card.classList.remove('instock-flash');
  }

  if (preview && (data.productName || data.imageUrl)) {
    preview.innerHTML = `
      <div class="product-preview">
        ${data.imageUrl ? `<img src="${data.imageUrl}" alt="product" onerror="this.style.display='none'" />` : ''}
        <div class="product-preview-info">
          ${data.productName ? `<div class="product-preview-name">${data.productName}</div>` : ''}
          ${data.price       ? `<div class="product-preview-price">${data.price}</div>`       : ''}
          <div class="last-checked">Checked at ${now}</div>
        </div>
      </div>`;
  } else if (preview) {
    const lastChecked = preview.querySelector('.last-checked');
    if (lastChecked) lastChecked.textContent = `Checked at ${now}`;
  }
}

async function stopMonitor(taskId) {
  if (activeStreams[taskId]) {
    activeStreams[taskId].close();
    delete activeStreams[taskId];
  }
  await post(`/tasks/${taskId}/monitor/stop`);
  const dot     = document.getElementById(`stock-dot-${taskId}`);
  const label   = document.getElementById(`stock-label-${taskId}`);
  const card    = document.getElementById(`task-card-${taskId}`);
  const btn     = document.getElementById(`btn-monitor-${taskId}`);
  const btnStop = document.getElementById(`btn-monitor-stop-${taskId}`);
  if (dot)    dot.className = 'stock-dot idle';
  if (label)  { label.textContent = 'Not monitoring'; label.className = 'stock-label'; }
  if (card)   card.classList.remove('instock-flash');
  if (btn)    { btn.style.display = ''; btn.disabled = false; }
  if (btnStop) btnStop.style.display = 'none';
  toast('Monitor stopped');
}

// ── TASK START / STOP ────────────────────────────────────────────────────────
async function startTask(id) {
  taskStatuses[id] = 'running';
  document.querySelector(`#dot-${id}`).className = 'status-dot running';
  const res = await post(`/tasks/${id}/start`);
  if (res.success) toast('Task started!', 'success');
  else {
    taskStatuses[id] = 'failed';
    document.querySelector(`#dot-${id}`).className = 'status-dot failed';
    toast(res.message || 'Failed to start task', 'error');
  }
}

async function stopTask(id) {
  taskStatuses[id] = 'idle';
  document.querySelector(`#dot-${id}`).className = 'status-dot idle';
  await post(`/tasks/${id}/stop`);
  toast('Task stopped');
}

async function deleteTask(id) {
  if (!confirm('Delete this task?')) return;
  await stopMonitor(id).catch(() => {});
  await del(`/tasks/${id}`);
  toast('Task deleted');
  loadTasks();
}

function editTask(task) {
  document.getElementById('task-id').value = task.id;
  document.getElementById('task-url').value = task.url;
  document.getElementById('task-site').value = task.site_id;
  document.getElementById('task-keywords').value = task.keywords || '';
  document.getElementById('task-size').value = task.size || '';
  document.getElementById('task-coupon').value = task.coupon_code || '';
  document.getElementById('task-email').value = task.notification_email_address || '';
  document.getElementById('task-captcha').checked = !!task.auto_solve_captchas;
  if (task.shipping_address_id) document.getElementById('task-shipping').value = task.shipping_address_id;
  if (task.billing_address_id)  document.getElementById('task-billing').value  = task.billing_address_id;
  if (task.payment_profile_id)  document.getElementById('task-payment').value  = task.payment_profile_id;
  document.getElementById('task-modal-title').textContent = 'Edit Task';
  openModal('task-modal');
}

document.getElementById('task-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('task-id').value;
  const body = {
    url:                        document.getElementById('task-url').value,
    site_id:                    parseInt(document.getElementById('task-site').value),
    keywords:                   document.getElementById('task-keywords').value || '',
    size:                       document.getElementById('task-size').value || '',
    coupon_code:                document.getElementById('task-coupon').value || '',
    notification_email_address: document.getElementById('task-email').value || '',
    auto_solve_captchas:        document.getElementById('task-captcha').checked,
    shipping_address_id:        parseInt(document.getElementById('task-shipping').value) || null,
    billing_address_id:         parseInt(document.getElementById('task-billing').value)  || null,
    payment_profile_id:         parseInt(document.getElementById('task-payment').value)  || null,
  };
  const res = id ? await patch(`/tasks/${id}`, body) : await post('/tasks', body);
  if (res.success) {
    toast(id ? 'Task updated!' : 'Task created!', 'success');
    closeModal('task-modal');
    document.getElementById('task-modal-title').textContent = 'New Task';
    document.getElementById('task-id').value = '';
    e.target.reset();
    loadTasks();
  } else {
    toast(res.message || 'Error saving task', 'error');
  }
});

// ── ADDRESSES ────────────────────────────────────────────────────────────────
async function loadAddresses() {
  const res = await get('/addresses');
  const container = document.getElementById('addresses-list');
  if (!res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No addresses yet.</p></div>`;
    return;
  }
  container.innerHTML = res.data.map(a => `
    <div class="card">
      <div class="card-title">${a.first_name} ${a.last_name}</div>
      <div class="card-meta">${a.address1}${a.address2 ? ', ' + a.address2 : ''}</div>
      <div class="card-meta">${a.city}, ${a.state} ${a.zip} — ${a.country}</div>
      <div class="card-meta">${a.phone} · ${a.email}</div>
      <div class="card-actions">
        <button class="btn-icon" onclick="editAddress(${JSON.stringify(a).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn-danger" onclick="deleteAddress(${a.id})">Delete</button>
      </div>
    </div>`).join('');
}

function editAddress(a) {
  document.getElementById('address-id').value = a.id;
  document.getElementById('addr-first').value = a.first_name;
  document.getElementById('addr-last').value = a.last_name;
  document.getElementById('addr-addr1').value = a.address1;
  document.getElementById('addr-addr2').value = a.address2 || '';
  document.getElementById('addr-city').value = a.city;
  document.getElementById('addr-state').value = a.state;
  document.getElementById('addr-zip').value = a.zip;
  document.getElementById('addr-country').value = a.country;
  document.getElementById('addr-phone').value = a.phone;
  document.getElementById('addr-email').value = a.email;
  document.getElementById('address-modal-title').textContent = 'Edit Address';
  openModal('address-modal');
}

async function deleteAddress(id) {
  if (!confirm('Delete this address?')) return;
  await del(`/addresses/${id}`);
  toast('Address deleted');
  loadAddresses();
}

document.getElementById('address-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('address-id').value;
  const body = {
    first_name: document.getElementById('addr-first').value,
    last_name:  document.getElementById('addr-last').value,
    address1:   document.getElementById('addr-addr1').value,
    address2:   document.getElementById('addr-addr2').value || '',
    city:       document.getElementById('addr-city').value,
    state:      document.getElementById('addr-state').value,
    zip:        document.getElementById('addr-zip').value,
    country:    document.getElementById('addr-country').value,
    phone:      document.getElementById('addr-phone').value,
    email:      document.getElementById('addr-email').value
  };
  const res = id ? await patch(`/addresses/${id}`, body) : await post('/addresses', body);
  if (res.success) {
    toast(id ? 'Address updated!' : 'Address created!', 'success');
    closeModal('address-modal');
    document.getElementById('address-modal-title').textContent = 'New Address';
    document.getElementById('address-id').value = '';
    e.target.reset();
    document.getElementById('addr-country').value = 'CA';
    loadAddresses();
  } else {
    toast(res.message || 'Error saving address', 'error');
  }
});

// ── PAYMENT PROFILES ─────────────────────────────────────────────────────────
async function loadPaymentProfiles() {
  const res = await get('/payment-profiles');
  const container = document.getElementById('payments-list');
  if (!res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No payment profiles yet.</p></div>`;
    return;
  }
  container.innerHTML = res.data.map(p => {
    const last4 = String(p.card_number).slice(-4);
    return `
    <div class="card">
      <div class="card-title">${p.label}</div>
      <div class="card-meta"><span class="badge badge-blue">${detectCardType(p.card_number)}</span> **** **** **** ${last4}</div>
      <div class="card-meta">${p.card_holder_name} · Exp ${p.expiration_month}/${p.expiration_year}</div>
      <div class="card-actions">
        <button class="btn-icon" onclick="editPaymentProfile(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn-danger" onclick="deletePaymentProfile(${p.id})">Delete</button>
      </div>
    </div>`;
  }).join('');
}

function editPaymentProfile(p) {
  document.getElementById('payment-id').value = p.id;
  document.getElementById('pay-label').value = p.label;
  document.getElementById('pay-holder').value = p.card_holder_name;
  document.getElementById('pay-number').value = p.card_number;
  document.getElementById('pay-month').value = p.expiration_month;
  document.getElementById('pay-year').value = p.expiration_year;
  document.getElementById('pay-cvv').value = p.cvv;
  document.getElementById('payment-modal-title').textContent = 'Edit Payment Profile';
  openModal('payment-modal');
}

async function deletePaymentProfile(id) {
  if (!confirm('Delete this payment profile?')) return;
  await del(`/payment-profiles/${id}`);
  toast('Payment profile deleted');
  loadPaymentProfiles();
}

document.getElementById('payment-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('payment-id').value;
  const body = {
    label:             document.getElementById('pay-label').value,
    card_holder_name:  document.getElementById('pay-holder').value,
    card_number:       document.getElementById('pay-number').value.replace(/\s/g, ''),
    expiration_month:  document.getElementById('pay-month').value.padStart(2, '0'),
    expiration_year:   document.getElementById('pay-year').value,
    cvv:               document.getElementById('pay-cvv').value
  };
  const res = id ? await patch(`/payment-profiles/${id}`, body) : await post('/payment-profiles', body);
  if (res.success) {
    toast(id ? 'Profile updated!' : 'Profile created!', 'success');
    closeModal('payment-modal');
    document.getElementById('payment-modal-title').textContent = 'New Payment Profile';
    document.getElementById('payment-id').value = '';
    e.target.reset();
    loadPaymentProfiles();
  } else {
    toast(res.message || 'Error saving profile', 'error');
  }
});

// ── PROXIES ──────────────────────────────────────────────────────────────────
async function loadProxies() {
  const res = await get('/proxies');
  const container = document.getElementById('proxies-list');
  if (!res.data || res.data.length === 0) {
    container.innerHTML = `<div class="empty-state"><p>No proxies yet.</p></div>`;
    return;
  }
  container.innerHTML = res.data.map(p => `
    <div class="card">
      <div class="card-title">${p.host}:${p.port}</div>
      ${p.username ? `<div class="card-meta">Auth: ${p.username}</div>` : '<div class="card-meta" style="color:var(--text-muted)">No auth</div>'}
      <div class="card-actions">
        <button class="btn-icon" onclick="editProxy(${JSON.stringify(p).replace(/"/g, '&quot;')})">Edit</button>
        <button class="btn-danger" onclick="deleteProxy(${p.id})">Delete</button>
      </div>
    </div>`).join('');
}

function editProxy(p) {
  document.getElementById('proxy-id').value = p.id;
  document.getElementById('proxy-host').value = p.host;
  document.getElementById('proxy-port').value = p.port;
  document.getElementById('proxy-user').value = p.username || '';
  document.getElementById('proxy-pass').value = p.password || '';
  document.getElementById('proxy-modal-title').textContent = 'Edit Proxy';
  openModal('proxy-modal');
}

async function deleteProxy(id) {
  if (!confirm('Delete this proxy?')) return;
  await del(`/proxies/${id}`);
  toast('Proxy deleted');
  loadProxies();
}

document.getElementById('proxy-form').addEventListener('submit', async (e) => {
  e.preventDefault();
  const id = document.getElementById('proxy-id').value;
  const body = {
    host:     document.getElementById('proxy-host').value,
    port:     parseInt(document.getElementById('proxy-port').value),
    username: document.getElementById('proxy-user').value || '',
    password: document.getElementById('proxy-pass').value || ''
  };
  const res = id ? await patch(`/proxies/${id}`, body) : await post('/proxies', body);
  if (res.success) {
    toast(id ? 'Proxy updated!' : 'Proxy created!', 'success');
    closeModal('proxy-modal');
    document.getElementById('proxy-modal-title').textContent = 'New Proxy';
    document.getElementById('proxy-id').value = '';
    e.target.reset();
    loadProxies();
  } else {
    toast(res.message || 'Error saving proxy', 'error');
  }
});

// ── SETTINGS ─────────────────────────────────────────────────────────────────
async function loadSettings() {
  const res = await get('/settings');
  const settings = {};
  (res.data || []).forEach(s => settings[s.key] = s.value);
  if (settings.captcha_api_key)     document.getElementById('captcha-key-input').value   = settings.captcha_api_key;
  if (settings.discord_webhook_url) document.getElementById('discord-webhook-input').value = settings.discord_webhook_url;
  if (settings.webhook_url)         document.getElementById('webhook-input').value        = settings.webhook_url;
}

async function saveSetting(key, value) {
  const res = await put(`/settings/${key}`, { value });
  if (res.success) toast('Setting saved!', 'success');
  else toast('Error saving setting', 'error');
}

// ── HELPERS ──────────────────────────────────────────────────────────────────
function populateSelect(id, items, labelFn) {
  const sel = document.getElementById(id);
  const current = sel.value;
  sel.innerHTML = '<option value="">— None —</option>' +
    items.map(item => `<option value="${item.id}">${labelFn(item)}</option>`).join('');
  if (current) sel.value = current;
}

function detectCardType(number) {
  const n = String(number).replace(/\s/g, '');
  if (/^4/.test(n))     return 'Visa';
  if (/^5[1-5]/.test(n)) return 'Mastercard';
  if (/^3[47]/.test(n)) return 'Amex';
  if (/^6/.test(n))     return 'Discover';
  return 'Card';
}

// ── INIT ─────────────────────────────────────────────────────────────────────
loadTasks();
