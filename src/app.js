import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2/+esm';

const app = document.querySelector('#app');
const config = window.APP_CONFIG || {};
const params = new URLSearchParams(location.search);
const publicCode = params.get('c');
let supabase;
let currentUser = null;
let records = [];
let editingId = null;
let toastTimer;

const TYPE_LABELS = {
  citizen_rafiq: 'নাগরিক সনদ — প্রত্যয়ন পত্র',
  citizen_saidul: 'নাগরিক সনদ — স্থায়ী বাসিন্দা',
  warish: 'ওয়ারিশ সনদপত্র'
};
const DEFAULT_STATEMENTS = {
  citizen_rafiq: 'তিনি অত্র ইউনিয়নের স্থায়ী বাসিন্দা। আমার জানামতে, তিনি একই নামে পরিচিত।',
  citizen_saidul: 'অত্র ইউনিয়নের একজন স্থায়ী বাসিন্দা। তিনি জন্মগতভাবে বাংলাদেশী এবং আমার পরিচিত।',
  warish: 'অত্র ইউনিয়নের অধিবাসী ছিলেন। মৃত্যুকালে তিনি নিম্নলিখিত ওয়ারিশগণকে রেখে মৃত্যুবরণ করেন।'
};

function isConfigured() {
  return config.supabaseUrl && config.supabaseAnonKey &&
    !config.supabaseUrl.includes('YOUR_PROJECT') &&
    !config.supabaseAnonKey.includes('YOUR_SUPABASE');
}
function node(tag, className, text) {
  const el = document.createElement(tag);
  if (className) el.className = className;
  if (text !== undefined && text !== null) el.textContent = String(text);
  return el;
}
function banglaDigits(value) {
  return String(value ?? '').replace(/[0-9]/g, d => '০১২৩৪৫৬৭৮৯'[Number(d)]);
}
function showToast(message, isError = false) {
  document.querySelector('.toast')?.remove();
  const toast = node('div', `toast${isError ? ' error' : ''}`, message);
  document.body.append(toast);
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => toast.remove(), 4200);
}
function showSetupMessage() {
  app.innerHTML = `<section class="setup-notice">
    <h1>Supabase সংযোগ সেটআপ বাকি</h1>
    <p>এই অ্যাপ GitHub Pages-এ চলবে। অ্যাডমিন লগইন ও তথ্য সংরক্ষণ চালু করতে <code>config.js</code>-এ Supabase Project URL এবং <strong>anon/public key</strong> বসান, তারপর <code>supabase/schema.sql</code> SQL Editor-এ চালান।</p>
    <p class="help-text">Supabase <code>service_role</code> key কখনো ব্রাউজার বা GitHub-এ দেবেন না। ধাপে ধাপে বাংলা নির্দেশনা <code>README-BN.md</code>-এ আছে।</p>
  </section>`;
}
function showLogin(errorText = '') {
  app.innerHTML = `<main class="login-card">
    <div class="brand"><img src="./assets/logo.png" alt="পরিষদের লোগো"><div>শিমুলিয়া ইউনিয়ন পরিষদ<small>সনদ ব্যবস্থাপনা — অ্যাডমিন</small></div></div>
    <h1 style="margin-top:22px">অ্যাডমিন লগইন</h1>
    <p>অনুমোদিত পরিষদ প্রশাসক হিসেবে প্রবেশ করুন। নতুন অ্যাকাউন্ট তৈরি এই পৃষ্ঠা থেকে করা যায় না।</p>
    ${errorText ? `<div class="alert error" role="alert">${escapeText(errorText)}</div>` : ''}
    <form id="login-form">
      <div class="form-field"><label for="login-email">ইমেইল</label><input id="login-email" name="email" type="email" autocomplete="username" required></div>
      <div class="form-field"><label for="login-password">পাসওয়ার্ড</label><input id="login-password" name="password" type="password" autocomplete="current-password" required></div>
      <button class="btn btn-primary" type="submit" style="width:100%;margin-top:5px">লগইন করুন</button>
    </form>
    <p class="login-hint">অ্যাকাউন্ট তৈরি ও অনুমোদন Supabase Dashboard থেকে করতে হবে। বাংলা গাইড: <code>README-BN.md</code></p>
  </main>`;
  document.querySelector('#login-form').addEventListener('submit', async event => {
    event.preventDefault();
    const form = new FormData(event.currentTarget);
    const button = event.currentTarget.querySelector('button[type="submit"]');
    button.disabled = true;
    button.textContent = 'প্রবেশ করা হচ্ছে…';
    const { data, error } = await supabase.auth.signInWithPassword({
      email: String(form.get('email')).trim(),
      password: String(form.get('password'))
    });
    if (error) {
      showLogin('লগইন করা যায়নি। ইমেইল/পাসওয়ার্ড, Supabase Auth এবং অ্যাডমিন অনুমতি যাচাই করুন।');
      return;
    }
    currentUser = data.user;
    await showDashboard();
  });
}
function escapeText(value) {
  return String(value ?? '').replace(/[&<>"']/g, char => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  }[char]));
}
function dashboardMarkup() {
  app.innerHTML = `<header class="topbar">
    <div class="brand"><img src="./assets/logo.png" alt=""><div>শিমুলিয়া ইউনিয়ন পরিষদ<small>সনদ ব্যবস্থাপনা</small></div></div>
    <div class="top-actions"><span id="admin-email" class="help-text"></span><button id="logout" class="btn btn-outline">লগআউট</button></div>
  </header>
  <main class="admin-wrap">
    <div class="page-title"><div><h1>সনদ ড্যাশবোর্ড</h1><p>রেকর্ড তৈরি করুন, খসড়া রাখুন, অথবা প্রকাশ করে শেয়ার লিংক নিন।</p></div><button id="new-record" class="btn btn-primary">＋ নতুন সনদ</button></div>
    <section class="panel"><h2>সনদের তালিকা</h2><div id="records-message"></div><div class="record-table-wrap"><table class="record-table"><thead><tr><th>সনদ নম্বর</th><th>নাম</th><th>ধরন</th><th>অবস্থা</th><th>শেষ পরিবর্তন</th><th>কাজ</th></tr></thead><tbody id="record-rows"></tbody></table></div></section>
    <section id="editor" class="panel editor hidden">
      <h2 id="editor-title">নতুন সনদ</h2><p class="editor-intro">তথ্য পূরণ করুন। খসড়া ব্যক্তিগত থাকবে; প্রকাশ করলে আলাদা শেয়ার লিংক তৈরি হবে।</p>
      <form id="certificate-form">
        <div class="form-grid">
          <div class="form-field"><label for="certificate_type">সনদের ধরন</label><select id="certificate_type" name="certificate_type" required><option value="citizen_rafiq">নাগরিক সনদ — প্রত্যয়ন পত্রের ধরন</option><option value="citizen_saidul">নাগরিক সনদ — স্থায়ী বাসিন্দার ধরন</option><option value="warish">ওয়ারিশ সনদপত্র</option></select></div>
          <div class="form-field"><label for="certificate_number">সনদ নম্বর</label><input id="certificate_number" name="certificate_number" required placeholder="উদাহরণ: ২০২৬০০০০০০০০০০০০০০১"></div>
          <div class="form-field"><label for="issued_on">তারিখ (ঐচ্ছিক)</label><input id="issued_on" name="issued_on" type="date"></div>
          <div class="form-field"><label for="ward">ওয়ার্ড নম্বর</label><input id="ward" name="ward" placeholder="যেমন: ০৮"></div>
          <div class="form-field full"><div class="section-label">ব্যক্তির তথ্য</div></div>
          <div class="form-field"><label for="holder_name">নাম</label><input id="holder_name" name="holder_name" required></div>
          <div class="form-field"><label for="father_name">পিতার নাম</label><input id="father_name" name="father_name"></div>
          <div class="form-field"><label for="mother_name">মাতার নাম</label><input id="mother_name" name="mother_name"></div>
          <div class="form-field"><label for="national_id">জাতীয় পরিচয়পত্র নম্বর</label><input id="national_id" name="national_id" inputmode="numeric" autocomplete="off"><small>NID ডিফল্টভাবে গোপন থাকে। প্রকাশ করতে নিচের স্পষ্ট সম্মতি নির্বাচন করতে হবে।</small></div>
          <div class="form-field full"><div class="check-row"><input id="include_nid" name="include_nid" type="checkbox"><label for="include_nid">এই সনদের প্রকাশ্য শেয়ার পেজে NID দেখানোর অনুমতি আছে। এটি নির্বাচন করলে NID লিংক-প্রাপ্ত যে কেউ দেখতে পারবে।</label></div></div>
          <div class="form-field full"><div class="section-label">বর্তমান ঠিকানা</div></div>
          <div class="form-field"><label for="current_village">গ্রাম</label><input id="current_village" name="current_village"></div>
          <div class="form-field"><label for="current_post">ডাকঘর</label><input id="current_post" name="current_post"></div>
          <div class="form-field"><label for="current_thana">উপজেলা / থানা</label><input id="current_thana" name="current_thana"></div>
          <div class="form-field"><label for="current_district">জেলা</label><input id="current_district" name="current_district"></div>
          <div class="form-field full"><div class="section-label">স্থায়ী ঠিকানা</div></div>
          <div class="form-field"><label for="permanent_village">গ্রাম</label><input id="permanent_village" name="permanent_village"></div>
          <div class="form-field"><label for="permanent_post">ডাকঘর</label><input id="permanent_post" name="permanent_post"></div>
          <div class="form-field"><label for="permanent_thana">উপজেলা / থানা</label><input id="permanent_thana" name="permanent_thana"></div>
          <div class="form-field"><label for="permanent_district">জেলা</label><input id="permanent_district" name="permanent_district"></div>
          <div class="form-field full"><label for="statement">প্রত্যয়ন / বক্তব্য</label><textarea id="statement" name="statement" placeholder="ফাঁকা রাখলে সনদের ধরন অনুযায়ী ডিফল্ট বক্তব্য দেখাবে।"></textarea></div>
          <div id="heirs-block" class="form-field full hidden"><div class="section-label">ওয়ারিশের তালিকা</div><div id="heirs-list" class="heirs-list"></div><button id="add-heir" type="button" class="btn btn-outline btn-small" style="margin-top:9px">＋ ওয়ারিশ যোগ করুন</button></div>
        </div>
        <div class="form-actions"><button type="button" id="save-draft" class="btn btn-outline">খসড়া সংরক্ষণ</button><button type="button" id="publish-record" class="btn btn-success">প্রকাশ করুন</button><button type="button" id="cancel-edit" class="btn">বাতিল</button></div>
      </form>
    </section>
  </main>`;
  document.querySelector('#admin-email').textContent = currentUser?.email || '';
  document.querySelector('#logout').addEventListener('click', async () => {
    await supabase.auth.signOut();
    currentUser = null;
    showLogin();
  });
  document.querySelector('#new-record').addEventListener('click', () => openEditor(null));
  document.querySelector('#cancel-edit').addEventListener('click', closeEditor);
  document.querySelector('#certificate_type').addEventListener('change', updateTypeFields);
  document.querySelector('#add-heir').addEventListener('click', () => addHeirRow());
  document.querySelector('#save-draft').addEventListener('click', () => saveRecord('draft'));
  document.querySelector('#publish-record').addEventListener('click', () => saveRecord('published'));
  document.querySelector('#record-rows').addEventListener('click', handleRecordAction);
  loadRecords();
}
async function showDashboard() {
  document.documentElement.classList.remove('certificate-page');
  document.body.classList.remove('certificate-page');
  app.classList.remove('public-certificate-view');
  dashboardMarkup();
  if (publicCode) return;
}
async function loadRecords() {
  const message = document.querySelector('#records-message');
  const body = document.querySelector('#record-rows');
  message.innerHTML = '<p class="help-text">তথ্য আনা হচ্ছে…</p>';
  const { data, error } = await supabase.from('certificates').select('*').order('updated_at', { ascending: false });
  if (error) {
    message.innerHTML = '<div class="alert error">রেকর্ড পড়া যায়নি। <code>schema.sql</code> চালানো এবং Supabase-এ এই ব্যবহারকারীকে অ্যাডমিন হিসেবে যোগ করা আছে কি না যাচাই করুন।</div>';
    body.replaceChildren();
    return;
  }
  records = data || [];
  message.replaceChildren();
  renderRecordRows();
}
function formatDate(value) {
  if (!value) return '—';
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return new Intl.DateTimeFormat('bn-BD', { year: 'numeric', month: 'short', day: 'numeric' }).format(date);
}
function renderRecordRows() {
  const body = document.querySelector('#record-rows');
  body.replaceChildren();
  if (!records.length) {
    const tr = node('tr');
    const td = node('td', 'empty-state', 'এখনও কোনো সনদ নেই। “নতুন সনদ” চাপ দিয়ে শুরু করুন।');
    td.colSpan = 6;
    tr.append(td); body.append(tr); return;
  }
  for (const record of records) {
    const tr = node('tr');
    tr.append(node('td', '', banglaDigits(record.certificate_number)), node('td', '', record.holder_name), node('td', '', TYPE_LABELS[record.certificate_type] || record.certificate_type));
    const statusCell = node('td');
    statusCell.append(node('span', `status ${record.status}`, record.status === 'published' ? 'প্রকাশিত' : 'খসড়া'));
    tr.append(statusCell, node('td', '', formatDate(record.updated_at)));
    const actionCell = node('td', 'actions');
    const actions = node('div', 'record-actions');
    actions.append(actionButton('preview', record.id, 'প্রিভিউ', 'btn btn-outline btn-small'));
    actions.append(actionButton('edit', record.id, 'সম্পাদনা', 'btn btn-outline btn-small'));
    if (record.status === 'published') {
      actions.append(actionButton('copy', record.id, 'লিংক কপি', 'btn btn-outline btn-small'));
      actions.append(actionButton('status', record.id, 'অপ্রকাশ', 'btn btn-outline btn-small'));
    } else {
      actions.append(actionButton('status', record.id, 'প্রকাশ', 'btn btn-success btn-small'));
    }
    actions.append(actionButton('delete', record.id, 'মুছুন', 'btn btn-danger btn-small'));
    actionCell.append(actions); tr.append(actionCell); body.append(tr);
  }
}
function actionButton(action, id, label, className) {
  const button = node('button', className, label);
  button.type = 'button'; button.dataset.action = action; button.dataset.id = id;
  return button;
}
async function handleRecordAction(event) {
  const button = event.target.closest('button[data-action]');
  if (!button) return;
  const record = records.find(item => item.id === button.dataset.id);
  if (!record) return;
  switch (button.dataset.action) {
    case 'edit': openEditor(record); break;
    case 'preview': renderCertificate(record, false); break;
    case 'copy': await copyShareLink(record); break;
    case 'status': await toggleStatus(record); break;
    case 'delete': await deleteRecord(record); break;
  }
}
function openEditor(record) {
  const section = document.querySelector('#editor');
  const form = document.querySelector('#certificate-form');
  editingId = record?.id || null;
  form.reset();
  document.querySelector('#editor-title').textContent = record ? 'সনদ সম্পাদনা' : 'নতুন সনদ';
  if (record) {
    for (const key of ['certificate_type','certificate_number','issued_on','holder_name','father_name','mother_name','ward','national_id','statement']) {
      form.elements[key].value = record[key] || '';
    }
    form.elements.include_nid.checked = Boolean(record.include_nid);
    const current = record.current_address || {};
    const permanent = record.permanent_address || {};
    for (const key of ['village','post','thana','district']) {
      form.elements[`current_${key}`].value = current[key] || '';
      form.elements[`permanent_${key}`].value = permanent[key] || '';
    }
  }
  renderHeirRows(record?.heirs || []);
  updateTypeFields();
  section.classList.remove('hidden');
  section.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
function closeEditor() {
  document.querySelector('#editor').classList.add('hidden');
  document.querySelector('#certificate-form').reset();
  editingId = null;
}
function updateTypeFields() {
  const isHeir = document.querySelector('#certificate_type').value === 'warish';
  document.querySelector('#heirs-block').classList.toggle('hidden', !isHeir);
  if (isHeir && !document.querySelector('#heirs-list').children.length) addHeirRow();
}
function renderHeirRows(heirs) {
  const container = document.querySelector('#heirs-list');
  container.replaceChildren();
  for (const heir of heirs) addHeirRow(heir);
}
function addHeirRow(heir = {}) {
  const row = node('div', 'heir-row');
  const name = node('input', 'heir-input'); name.placeholder = 'ওয়ারিশের নাম'; name.value = heir.name || ''; name.setAttribute('aria-label','ওয়ারিশের নাম');
  const relation = node('input', 'heir-input'); relation.placeholder = 'সম্পর্ক'; relation.value = heir.relation || ''; relation.setAttribute('aria-label','সম্পর্ক');
  const age = node('input', 'heir-input'); age.placeholder = 'বয়স'; age.inputMode = 'numeric'; age.value = heir.age || ''; age.setAttribute('aria-label','বয়স');
  const remove = node('button', 'btn btn-danger btn-small', '×'); remove.type = 'button'; remove.setAttribute('aria-label','এই ওয়ারিশ মুছুন'); remove.addEventListener('click', () => row.remove());
  row.append(name, relation, age, remove); document.querySelector('#heirs-list').append(row);
}
function readHeirs() {
  return [...document.querySelectorAll('#heirs-list .heir-row')].map(row => {
    const [name, relation, age] = row.querySelectorAll('input');
    return { name: name.value.trim(), relation: relation.value.trim(), age: age.value.trim() };
  }).filter(heir => heir.name || heir.relation || heir.age);
}
function getAddress(prefix) {
  return {
    village: document.querySelector(`#${prefix}_village`).value.trim(),
    post: document.querySelector(`#${prefix}_post`).value.trim(),
    thana: document.querySelector(`#${prefix}_thana`).value.trim(),
    district: document.querySelector(`#${prefix}_district`).value.trim()
  };
}
function makeShareCode() {
  const bytes = new Uint8Array(16);
  crypto.getRandomValues(bytes);
  return [...bytes].map(byte => byte.toString(16).padStart(2, '0')).join('');
}
function shareUrl(record) {
  const url = new URL(location.href);
  url.search = ''; url.hash = '';
  url.searchParams.set('c', record.share_code);
  return url.toString();
}
async function saveRecord(status) {
  const form = document.querySelector('#certificate-form');
  if (!form.reportValidity()) return;
  const fd = new FormData(form);
  const includeNid = form.elements.include_nid.checked;
  const nationalId = String(fd.get('national_id') || '').trim();
  if (status === 'published' && includeNid && nationalId && !window.confirm('NID প্রকাশের অনুমতি নিশ্চিত? এই নম্বরটি শেয়ার লিংক জানা যে কেউ দেখতে পারবে।')) return;
  const currentCode = records.find(record => record.id === editingId)?.share_code;
  const type = String(fd.get('certificate_type'));
  const payload = {
    certificate_type: type,
    certificate_number: String(fd.get('certificate_number') || '').trim(),
    issued_on: String(fd.get('issued_on') || '') || null,
    holder_name: String(fd.get('holder_name') || '').trim(),
    father_name: String(fd.get('father_name') || '').trim(),
    mother_name: String(fd.get('mother_name') || '').trim(),
    current_address: getAddress('current'),
    permanent_address: getAddress('permanent'),
    ward: String(fd.get('ward') || '').trim(),
    national_id: nationalId,
    include_nid: Boolean(includeNid && nationalId),
    statement: String(fd.get('statement') || '').trim() || DEFAULT_STATEMENTS[type],
    heirs: type === 'warish' ? readHeirs() : [],
    status,
    share_code: status === 'published' ? (currentCode || makeShareCode()) : (currentCode || null)
  };
  const saveButton = status === 'published' ? document.querySelector('#publish-record') : document.querySelector('#save-draft');
  saveButton.disabled = true;
  const result = editingId
    ? await supabase.from('certificates').update(payload).eq('id', editingId).select('*').single()
    : await supabase.from('certificates').insert(payload).select('*').single();
  saveButton.disabled = false;
  if (result.error) {
    showToast('সংরক্ষণ করা যায়নি। Supabase schema, admin allow-list ও RLS সেটআপ যাচাই করুন।', true);
    console.error(result.error);
    return;
  }
  const saved = result.data;
  closeEditor();
  await loadRecords();
  showToast(status === 'published' ? 'সনদ প্রকাশিত হয়েছে। শেয়ার লিংক তালিকা থেকে কপি করুন।' : 'খসড়া সংরক্ষণ হয়েছে।');
  if (status === 'published' && saved?.share_code) {
    const open = window.confirm('সনদ প্রকাশিত। এখন প্রিভিউ খুলবেন?');
    if (open) window.open(shareUrl(saved), '_blank', 'noopener,noreferrer');
  }
}
async function toggleStatus(record) {
  const next = record.status === 'published' ? 'draft' : 'published';
  if (next === 'draft' && !window.confirm('এই সনদ অপ্রকাশ করলে শেয়ার লিংকে আর দেখা যাবে না। চালিয়ে যাবেন?')) return;
  if (next === 'published' && record.include_nid && record.national_id && !window.confirm('এই সনদে NID প্রকাশের অনুমতি আছে কি? লিংক-প্রাপ্ত যে কেউ NID দেখতে পারবে।')) return;
  const update = { status: next };
  if (next === 'published' && !record.share_code) update.share_code = makeShareCode();
  const { error } = await supabase.from('certificates').update(update).eq('id', record.id);
  if (error) { showToast('অবস্থা পরিবর্তন করা যায়নি।', true); return; }
  await loadRecords();
  showToast(next === 'published' ? 'সনদ প্রকাশিত হয়েছে।' : 'সনদ অপ্রকাশিত হয়েছে।');
}
async function deleteRecord(record) {
  if (!window.confirm(`“${record.holder_name}” সনদটি স্থায়ীভাবে মুছবেন?`)) return;
  const { error } = await supabase.from('certificates').delete().eq('id', record.id);
  if (error) { showToast('রেকর্ড মুছতে পারেনি।', true); return; }
  await loadRecords(); showToast('রেকর্ড মুছে ফেলা হয়েছে।');
}
async function copyShareLink(record) {
  try {
    await navigator.clipboard.writeText(shareUrl(record));
    showToast('শেয়ার লিংক কপি হয়েছে।');
  } catch {
    window.prompt('শেয়ার লিংক কপি করুন:', shareUrl(record));
  }
}
async function showPublicCertificate(code) {
  app.innerHTML = '<div class="boot-message">সনদ যাচাই করা হচ্ছে…</div>';
  const { data, error } = await supabase.rpc('get_public_certificate', { p_share_code: code });
  if (error || !data) {
    showNotFound();
    return;
  }
  renderCertificate(data, true);
}
function showNotFound() {
  app.innerHTML = `<section class="not-found"><img src="./assets/logo.png" alt="" width="64" height="64"><h1>সনদটি পাওয়া যায়নি</h1><p>লিংকটি ভুল, সনদটি অপ্রকাশিত, অথবা এটি আর শেয়ার করা হচ্ছে না।</p><a class="btn btn-outline" href="${location.pathname}">মূল পেজে ফিরুন</a></section>`;
}
function certificateHeading(record) {
  if (record.certificate_type === 'warish') return 'ওয়ারিশ সনদপত্র';
  if (record.certificate_type === 'citizen_saidul') return 'নাগরিকত্ব সনদপত্র';
  return 'প্রত্যয়ন পত্র';
}
function addressSection(title, data) {
  const section = node('section', 'cert-address');
  section.append(node('strong', '', title));
  const labels = [['গ্রাম','village'],['ডাকঘর','post'],['থানা','thana'],['জেলা','district']];
  for (const [label,key] of labels) {
    const row = node('div', 'cert-address-row');
    row.append(node('span','',label),node('span','',`: ${data?.[key] || ''}`));
    section.append(row);
  }
  return section;
}
function citizenAddressTable(record) {
  const table = node('table', 'cert-body cert-address-list');
  const tbody = node('tbody');
  const fields = [['গ্রামঃ','village'],['ডাকঘরঃ','post'],['উপজেলা/থানাঃ','thana'],['জেলাঃ','district']];
  for (const [title, data] of [['বর্তমান ঠিকানা', record.current_address || {}], ['স্থায়ী ঠিকানা', record.permanent_address || {}]]) {
    fields.forEach(([label, key], index) => {
      const row = node('tr');
      if (index === 0) {
        const heading = node('td', 'cert-field-label cert-address-label', title);
        heading.rowSpan = fields.length;
        row.append(heading);
      }
      const value = node('td', 'cert-address-value');
      value.append(node('div', 'legacy-address-line', `${label} ${data[key] || ''}`));
      row.append(value);
      tbody.append(row);
    });
  }
  table.append(tbody);
  return table;
}
function renderCertificate(record, publicView) {
  document.documentElement.classList.add('certificate-page');
  document.body.classList.add('certificate-page');
  app.classList.toggle('public-certificate-view', Boolean(publicView));
  document.title = `${certificateHeading(record)} — শিমুলিয়া ইউনিয়ন পরিষদ`;
  const certificateClass = record.certificate_type === 'warish' ? 'type-warish' : 'type-citizen';
  app.innerHTML = `<div class="public-bar"><div class="brand"><img src="./assets/logo.png" alt=""><div>শিমুলিয়া ইউনিয়ন পরিষদ<small>সনদ প্রিভিউ</small></div></div><div class="top-actions"><button id="return-dashboard" class="btn btn-outline">${publicView ? 'মূল পেজ' : 'ড্যাশবোর্ডে ফিরুন'}</button><button id="print-certificate" class="btn btn-primary">প্রিন্ট / PDF</button></div></div>
    <article class="certificate ${certificateClass}">
      <header class="cert-header"><img class="cert-logo" src="./assets/logo.png" alt="শিমুলিয়া ইউনিয়ন পরিষদের লোগো"><div class="cert-office"><strong>শিমুলিয়া ইউনিয়ন পরিষদ</strong><br>শিমুলিয়া<br>সাভার, ঢাকা-১৩৪৫<br>ফোন : 01912170415, 01819979797</div><img class="cert-photo" src="${record.certificate_type === 'citizen_rafiq' ? './assets/attestation-photo-placeholder.png' : './assets/profile-placeholder.png'}" alt=""></header>
      <div class="cert-title-wrap"><h1 id="cert-title" class="cert-title"></h1></div>
      <table class="serial-table"><tbody><tr id="serial-row"><td id="serial-label" class="serial-label"></td></tr></tbody></table>
      <div id="cert-date-row" class="cert-date-row hidden">তারিখ: <span id="cert-date"></span></div>
      <table class="cert-body"><tbody><tr><td colspan="2" id="cert-intro" class="cert-intro"></td></tr>
        <tr><td class="cert-field-label">নাম</td><td id="cert-name" class="cert-field-value"></td></tr>
        <tr><td class="cert-field-label">পিতা</td><td id="cert-father" class="cert-field-value"></td></tr>
        <tr><td class="cert-field-label">মাতা</td><td id="cert-mother" class="cert-field-value"></td></tr>
      </tbody></table>
      <section id="cert-addresses" class="citizen-addresses"></section>
      <table class="cert-body cert-meta"><tbody><tr><td class="cert-field-label">ওয়ার্ড নং</td><td id="cert-ward" class="cert-field-value"></td></tr>
        <tr id="cert-nid-row"><td class="cert-field-label">ন্যাশনাল আইডি নং</td><td id="cert-nid" class="cert-field-value"></td></tr>
      </tbody></table>
      <p id="cert-statement" class="cert-statement"></p>
      <table id="cert-heirs" class="heir-table hidden"><thead><tr><th>নং</th><th>নাম</th><th>সম্পর্ক</th><th>বয়স</th></tr></thead><tbody></tbody><tfoot><tr><td colspan="4" id="cert-heir-total" class="heir-total"></td></tr></tfoot></table>
      <p id="cert-closing" class="cert-closing"></p>
    </article>`;
  document.querySelector('#cert-title').textContent = certificateHeading(record);
  const serialLabel = record.certificate_type === 'warish'
    ? 'ওয়ারিশ সনদ নং :'
    : record.certificate_type === 'citizen_rafiq' ? 'প্রত্যয়ন পত্র নং :' : 'নাগরিকত্ব সনদপত্র নং :';
  document.querySelector('#serial-label').textContent = serialLabel;
  const serialRow = document.querySelector('#serial-row');
  const serialLabelCell = document.querySelector('#serial-label');
  serialRow.replaceChildren(serialLabelCell);
  for (const digit of [...banglaDigits(record.certificate_number || '')]) {
    serialRow.append(node('td', 'serial-digit', digit));
  }
  if (record.issued_on) {
    const [year, month, day] = String(record.issued_on).split('-');
    document.querySelector('#cert-date').textContent = banglaDigits(year && month && day ? `${day}/${month}/${year}` : record.issued_on);
    document.querySelector('#cert-date-row').classList.remove('hidden');
  }
  document.querySelector('#cert-intro').textContent = record.certificate_type === 'warish'
    ? 'এই মর্মে প্রত্যয়ন করা যাইতেছে যে,'
    : record.certificate_type === 'citizen_saidul'
      ? 'এই মর্মে সনদপত্র প্রদান করা যাইতেছে যে,'
      : 'এই মর্মে প্রত্যয়ন পত্র প্রদান করা যাইতেছে যে,';
  document.querySelector('#cert-name').textContent = `: ${record.holder_name || ''}`;
  document.querySelector('#cert-father').textContent = `: ${record.father_name || ''}`;
  document.querySelector('#cert-mother').textContent = `: ${record.mother_name || ''}`;
  const addresses = document.querySelector('#cert-addresses');
  addresses.replaceChildren();
  if (record.certificate_type === 'warish') {
    addresses.className = 'cert-address-grid';
    addresses.append(addressSection('বর্তমান ঠিকানা', record.current_address || {}), addressSection('স্থায়ী ঠিকানা', record.permanent_address || {}));
  } else {
    addresses.className = 'citizen-addresses';
    addresses.append(citizenAddressTable(record));
  }
  document.querySelector('#cert-ward').textContent = `: ${banglaDigits(record.ward || '')}`;
  const nid = record.national_id;
  const nidVisible = Boolean(nid && record.include_nid);
  document.querySelector('#cert-nid').textContent = nidVisible ? `: ${banglaDigits(nid)}` : ':';
  document.querySelector('#cert-statement').textContent = record.statement || DEFAULT_STATEMENTS[record.certificate_type] || '';
  if (record.certificate_type === 'warish') {
    const table = document.querySelector('#cert-heirs');
    const tbody = table.tBodies[0];
    const heirs = Array.isArray(record.heirs) ? record.heirs : [];
    heirs.forEach((heir,index) => {
      const tr = node('tr');
      tr.append(node('td','',banglaDigits(index+1)),node('td','',heir.name || ''),node('td','',heir.relation || ''),node('td','',banglaDigits(heir.age || '')));
      tbody.append(tr);
    });
    table.classList.remove('hidden');
    const total = document.querySelector('#cert-heir-total');
    total.textContent = `উত্তরাধিকারীর সংখ্যা  ${banglaDigits(heirs.length)}  জন`;
    total.classList.remove('hidden');
  } else {
    document.querySelector('#cert-closing').textContent = 'আমি তাহার সর্বাঙ্গীণ মঙ্গল ও উন্নতি কামনা করি।';
  }
  document.querySelector('#return-dashboard').addEventListener('click', () => {
    if (publicView) { location.href = location.pathname; return; }
    showDashboard();
  });
  document.querySelector('#print-certificate').addEventListener('click', () => window.print());
}
function initialize() {
  if (!isConfigured()) { showSetupMessage(); return; }
  supabase = createClient(config.supabaseUrl, config.supabaseAnonKey, {
    auth: { persistSession: true, autoRefreshToken: true, detectSessionInUrl: true }
  });
  if (publicCode) {
    showPublicCertificate(publicCode);
    return;
  }
  supabase.auth.getSession().then(({ data, error }) => {
    if (error) { showLogin('Supabase session পড়া যায়নি। আবার লগইন করুন।'); return; }
    currentUser = data.session?.user || null;
    if (currentUser) showDashboard(); else showLogin();
  });
  supabase.auth.onAuthStateChange((event, session) => {
    if (publicCode) return;
    if (event === 'SIGNED_OUT') {
      currentUser = null;
      setTimeout(() => showLogin(), 0);
    }
  });
}

initialize();
