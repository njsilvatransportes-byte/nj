const $ = (selector) => document.querySelector(selector);
const keys = { users: 'nj_users', session: 'nj_session', drivers: 'nj_drivers', vehicles: 'nj_vehicles' };
const get = (key) => JSON.parse(localStorage.getItem(key) || '[]');
const api = async (path, options = {}) => { const s = JSON.parse(localStorage.getItem(keys.session)||'null'); const h = { 'Content-Type': 'application/json', ...(s?{'X-User-Id':s.id,'X-User-Name':encodeURIComponent(s.name)}:{}), ...(options.headers||{}) }; const response = await fetch('/api/' + path, { ...options, headers: h }); const body = await response.json(); if (!response.ok) throw new Error(body.error || 'Não foi possível concluir a operação.'); return body; };
const set = (key, value) => { const previous = get(key); localStorage.setItem(key, JSON.stringify(value)); const resource = key === keys.drivers ? 'drivers' : key === keys.vehicles ? 'vehicles' : null; if (!resource) return; const changed = value.find(item => { const old = previous.find(row => row.id === item.id); return !old || JSON.stringify(old) !== JSON.stringify(item); }); if (changed) api(`${resource}${previous.some(row => row.id === changed.id) ? '/' + changed.id : ''}`, { method: previous.some(row => row.id === changed.id) ? 'PUT' : 'POST', body: JSON.stringify(changed) }).catch(error => console.error(error.message)); };
const authView = $('#auth-view'), appView = $('#app-view');
let isRegister = false, currentView = 'drivers', modalType = 'driver';
let clientsData = [], currentDriverPhoto = '';

const statusClass = (status) => status === 'Ativo' || status === 'Em operação' ? 'active' : status === 'Pendente' || status === 'Manutenção' ? 'pending' : 'inactive';
const label = (tag, content = '', full = false) => `<label class="${full ? 'full-width' : ''}">${tag}${content}</label>`;
function formatCnpjCpf(value) { let v = value.replace(/\D/g, ''); if (v.length <= 11) { return v.replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); } else { return v.slice(0, 14).replace(/^(\d{2})(\d)/, '$1.$2').replace(/^(\d{2})\.(\d{3})(\d)/, '$1.$2.$3').replace(/\.(\d{3})(\d)/, '.$1/$2').replace(/(\d{4})(\d)/, '$1-$2'); } }
function formatCpf(value) { return value.replace(/\D/g, '').slice(0, 11).replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d)/, '$1.$2').replace(/(\d{3})(\d{1,2})$/, '$1-$2'); }
function formatPhone(value) { let v = value.replace(/\D/g, '').slice(0, 11); if (v.length > 10) { return v.replace(/^(\d{2})(\d{5})(\d{4})/, '($1) $2-$3'); } else if (v.length > 2) { return v.replace(/^(\d{2})(\d{0,4})(\d{0,4})/, '($1) $2-$3').replace(/-$/, ''); } else if (v.length > 0) { return v.replace(/^(\d{0,2})/, '($1'); } return ''; }
function formatCep(value) { return value.replace(/\D/g, '').slice(0, 8).replace(/^(\d{5})(\d)/, '$1-$2'); }
function formatPlate(value) { return value.toUpperCase().replace(/[^A-Z0-9]/g, '').slice(0, 7).replace(/^([A-Z]{3})([0-9A-Z])/, '$1-$2'); }

function renderAuth() { $('#auth-title').textContent = isRegister ? 'Crie sua conta' : 'Acesse sua conta'; $('#auth-subtitle').textContent = isRegister ? 'Cadastre-se para começar a usar o sistema.' : 'Entre para continuar na gestão NJTransportes.'; $('#login-form').classList.toggle('hidden', isRegister); $('#register-form').classList.toggle('hidden', !isRegister); $('#auth-switch').innerHTML = isRegister ? 'Já possui uma conta? <button type="button" data-auth-mode="login">Entrar</button>' : 'Ainda não tem uma conta? <button type="button" data-auth-mode="register">Cadastre-se</button>'; }
document.addEventListener('click', (event) => { if (event.target.dataset.authMode) { isRegister = event.target.dataset.authMode === 'register'; renderAuth(); } });
$('#register-form').addEventListener('submit', async (event) => { event.preventDefault(); try { const res = await api('auth/register', { method: 'POST', body: JSON.stringify({ name: $('#register-name').value, email: $('#register-email').value, password: $('#register-password').value }) }); $('#register-error').style.color = '#187444'; $('#register-error').textContent = res.message || 'Cadastro enviado. Aguarde a aprovação do administrador para acessar.'; event.target.reset(); } catch (error) { $('#register-error').style.color = ''; $('#register-error').textContent = error.message; } });
$('#login-form').addEventListener('submit', async (event) => { event.preventDefault(); try { const user = await api('auth/login', { method: 'POST', body: JSON.stringify({ email: $('#login-email').value, password: $('#login-password').value }) }); localStorage.setItem(keys.session, JSON.stringify(user)); showApp(); } catch (error) { $('#login-error').textContent = error.message; } });

function updateUserAvatar() {
  const session = JSON.parse(localStorage.getItem(keys.session) || 'null');
  if (!session) return;
  const avatarEl = $('#avatar');
  if (!avatarEl) return;
  if (session.photo) {
    avatarEl.innerHTML = `<img src="${session.photo}" alt="Foto de ${session.name}" style="width:100%;height:100%;border-radius:50%;object-fit:cover;display:block;">`;
    avatarEl.style.background = 'transparent';
    avatarEl.title = 'Clique para visualizar ou alterar sua foto';
  } else {
    avatarEl.innerHTML = session.name ? session.name.charAt(0).toUpperCase() : 'U';
    avatarEl.style.background = 'var(--orange)';
    avatarEl.title = 'Clique para incluir sua foto de perfil';
  }
}

function openUserProfilePhotoModal(session) {
  let modal = document.getElementById('user-profile-photo-modal');
  if (!modal) {
    modal = document.createElement('div');
    modal.id = 'user-profile-photo-modal';
    modal.className = 'modal-backdrop';
    modal.innerHTML = `
      <section class="modal" role="dialog" style="max-width:440px;text-align:center;">
        <div class="modal-header">
          <div>
            <p class="eyebrow">PERFIL DE USUÁRIO</p>
            <h2 id="user-profile-modal-title">Foto de Perfil</h2>
          </div>
          <button id="user-profile-modal-close" class="icon-button" aria-label="Fechar">&times;</button>
        </div>
        <div class="modal-body" style="display:flex;flex-direction:column;align-items:center;gap:16px;padding:24px;">
          <div style="position:relative;width:180px;height:180px;border-radius:50%;overflow:hidden;border:4px solid #1261a0;box-shadow:0 10px 30px rgba(0,0,0,0.25);background:#f1f5f9;">
            <img id="user-profile-modal-img" src="" alt="Foto de perfil" style="width:100%;height:100%;object-fit:cover;display:block;">
          </div>
          <div>
            <h3 id="user-profile-modal-username" style="margin:0;font-size:18px;color:#102a43;"></h3>
            <p id="user-profile-modal-role" style="margin:4px 0 0;font-size:13px;color:#64748b;font-weight:600;"></p>
          </div>
        </div>
        <div class="modal-actions" style="justify-content:center;gap:12px;padding:16px 24px;border-top:1px solid #e5e7eb;">
          <button id="user-profile-change-btn" class="button button-primary">📷 Alterar foto</button>
          <button id="user-profile-remove-btn" class="button button-secondary" style="color:#dc2626;border-color:#fca5a5;">🗑️ Remover foto</button>
        </div>
      </section>`;
    document.body.appendChild(modal);

    document.getElementById('user-profile-modal-close').addEventListener('click', () => modal.classList.add('hidden'));
    modal.addEventListener('click', e => { if (e.target === modal) modal.classList.add('hidden'); });
    document.getElementById('user-profile-change-btn').addEventListener('click', () => {
      modal.classList.add('hidden');
      $('#user-photo-file-input')?.click();
    });
    document.getElementById('user-profile-remove-btn').addEventListener('click', async () => {
      if (confirm('Deseja realmente remover sua foto de perfil?')) {
        await removeUserProfilePhoto();
        modal.classList.add('hidden');
      }
    });
  }

  document.getElementById('user-profile-modal-img').src = session.photo;
  document.getElementById('user-profile-modal-username').textContent = session.name;
  document.getElementById('user-profile-modal-role').textContent = session.role || 'Operador';
  modal.classList.remove('hidden');
}

async function handleUserPhotoFileSelected(file) {
  if (!file) return;
  if (file.size > 2097152) {
    alert('A imagem é muito grande. Escolha uma foto de até 2 MB.');
    return;
  }
  const reader = new FileReader();
  reader.onload = async function(e) {
    const base64Photo = e.target.result;
    const session = JSON.parse(localStorage.getItem(keys.session) || 'null');
    if (!session) return;

    session.photo = base64Photo;
    localStorage.setItem(keys.session, JSON.stringify(session));

    try {
      await api(`users/${session.id}/photo`, {
        method: 'PUT',
        body: JSON.stringify({ photo: base64Photo })
      });
    } catch (err) {
      console.warn('Foto salva localmente:', err.message);
    }

    updateUserAvatar();
  };
  reader.readAsDataURL(file);
}

async function removeUserProfilePhoto() {
  const session = JSON.parse(localStorage.getItem(keys.session) || 'null');
  if (!session) return;

  delete session.photo;
  localStorage.setItem(keys.session, JSON.stringify(session));

  try {
    await api(`users/${session.id}/photo`, { method: 'DELETE' });
  } catch (err) {
    console.warn('Foto removida localmente:', err.message);
  }

  updateUserAvatar();
}

async function showApp() {
  const session = JSON.parse(localStorage.getItem(keys.session) || 'null');
  if (!session) return;
  authView.classList.add('hidden');
  appView.classList.remove('hidden');
  $('#sidebar').classList.add('collapsed');
  $('#user-name').textContent = session.name;
  updateUserAvatar();

  const userProfileBtn = $('#user-profile-btn') || $('#avatar');
  if (userProfileBtn) {
    userProfileBtn.onclick = function() {
      const currentSession = JSON.parse(localStorage.getItem(keys.session) || 'null');
      if (currentSession && currentSession.photo) {
        openUserProfilePhotoModal(currentSession);
      } else {
        const fileInput = $('#user-photo-file-input');
        if (fileInput) fileInput.click();
      }
    };
  }

  const fileInput = $('#user-photo-file-input');
  if (fileInput) {
    fileInput.onchange = function() {
      if (this.files && this.files[0]) {
        handleUserPhotoFileSelected(this.files[0]);
        this.value = '';
      }
    };
  }

  const role = session.role || 'Operador';
  document.querySelectorAll('[data-menu]').forEach(el => {
    const menu = el.getAttribute('data-menu');
    if (role === 'Administrador') {
      el.style.display = 'block';
    } else if (role === 'Supervisor') {
      el.style.display = (menu === 'Cadastros' || menu === 'Administração') ? 'block' : 'none';
    } else {
      el.style.display = (menu === 'Lançamentos' || menu === 'Relatórios') ? 'block' : 'none';
    }
  });
  try {
    const [drivers, vehicles] = await Promise.all([api('drivers'), api('vehicles')]);
    localStorage.setItem(keys.drivers, JSON.stringify(drivers));
    localStorage.setItem(keys.vehicles, JSON.stringify(vehicles));
  } catch (error) {
    console.error(error.message);
  }
  switchView(currentView);
}
$('#logout-button').addEventListener('click', () => { localStorage.removeItem(keys.session); appView.classList.add('hidden'); authView.classList.remove('hidden'); });

function renderDrivers() { const all = get(keys.drivers), query = $('#driver-search').value.toLowerCase(), list = all.filter(item => `${item.name} ${item.cpf}`.toLowerCase().includes(query)); $('#total-drivers').textContent = all.length; $('#active-drivers').textContent = all.filter(item => item.status === 'Ativo').length; $('#pending-drivers').textContent = all.filter(item => item.status === 'Pendente').length; const today = new Date(); today.setHours(0,0,0,0); const in60Days = new Date(today); in60Days.setDate(today.getDate() + 60); window.expiringCnhList = all.filter(item => { if(!item.expiry) return false; const [y, m, d] = item.expiry.split('T')[0].split('-'); if(!y || !m || !d) return false; const expDate = new Date(y, m-1, d); return expDate <= in60Days; }); const expiringElement = $('#expiring-drivers'); if(expiringElement) expiringElement.textContent = window.expiringCnhList.length; $('#drivers-table').innerHTML = list.map(item => { let exp = '-'; if(item.expiry) { const [y, m, d] = item.expiry.split('T')[0].split('-'); exp = `${d}/${m}/${y}`; } const avatarHtml = item.photo ? `<img src="${item.photo}" alt="Foto de ${item.name}" data-photo-view="${item.id}" title="Ver foto" style="width:36px;height:36px;border-radius:50%;object-fit:cover;border:2px solid #e2e8f0;vertical-align:middle;margin-right:8px;cursor:pointer;transition:transform .15s,box-shadow .15s;" onmouseover="this.style.transform='scale(1.15)';this.style.boxShadow='0 4px 12px rgba(0,0,0,.25)'" onmouseout="this.style.transform='';this.style.boxShadow=''">` : `<span style="display:inline-flex;align-items:center;justify-content:center;width:36px;height:36px;border-radius:50%;background:linear-gradient(135deg,#ff9d35,#e76b16);color:#fff;font-weight:700;font-size:14px;vertical-align:middle;margin-right:8px;">${item.name.charAt(0).toUpperCase()}</span>`; return `<tr><td class="driver-cell" style="display:flex;align-items:center;">${avatarHtml}${item.name}</td><td>${item.cpf}</td><td>${item.cnh}</td><td>${item.category}</td><td>${exp}</td><td><span class="badge ${statusClass(item.status)}">${item.status}</span></td><td><button class="table-action" data-edit-driver="${item.id}">Editar</button></td></tr>`; }).join(''); $('#drivers-empty').classList.toggle('hidden', all.length > 0); }
window.openCnhReport = function() { const today = new Date(); today.setHours(0,0,0,0); const html = (window.expiringCnhList || []).sort((a,b) => new Date(a.expiry) - new Date(b.expiry)).map(item => { const [y, m, d] = item.expiry.split('T')[0].split('-'); const expDate = new Date(y, m-1, d); const isExpired = expDate < today; const statusText = isExpired ? 'Vencida' : 'A vencer'; const statusColor = isExpired ? '#ef4444' : '#f59e0b'; const statusBg = isExpired ? '#fee2e2' : '#fef3c7'; return `<tr><td style="font-weight:600">${item.name}</td><td>${item.cpf}</td><td>${item.cnh}</td><td>${d}/${m}/${y}</td><td><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:${statusColor};background:${statusBg}">${statusText}</span></td></tr>`; }).join(''); document.getElementById('cnh-report-table').innerHTML = html || '<tr><td colspan="5" style="text-align:center;padding:32px;color:#6b7280;">✅ Nenhuma CNH a vencer nos próximos 60 dias.</td></tr>'; document.getElementById('cnh-report-modal-backdrop').classList.remove('hidden'); };
window.openDriversReport = function(filter) { const all = get(keys.drivers); let list, title, emptyMsg; if (filter === 'ativo') { list = all.filter(d => d.status === 'Ativo'); title = '🟢 Motoristas Ativos'; emptyMsg = 'Nenhum motorista ativo encontrado.'; } else if (filter === 'pendente') { list = all.filter(d => d.status === 'Pendente'); title = '⚠️ Documentação Pendente'; emptyMsg = 'Nenhum motorista com documentação pendente.'; } else { list = all; title = '📋 Todos os Motoristas'; emptyMsg = 'Nenhum motorista cadastrado.'; } document.getElementById('drivers-report-title').textContent = title; const today = new Date(); today.setHours(0,0,0,0); const html = list.map(item => { let exp = '-'; let cnhSt = ''; let cnhBg = ''; if (item.expiry) { const [y, m, d] = item.expiry.split('T')[0].split('-'); const expDate = new Date(y, m-1, d); exp = `${d}/${m}/${y}`; const in60 = new Date(today); in60.setDate(today.getDate()+60); if (expDate < today) { cnhSt = 'Vencida'; cnhBg = '#fee2e2'; } else if (expDate <= in60) { cnhSt = 'A vencer'; cnhBg = '#fef3c7'; } else { cnhSt = 'Em dia'; cnhBg = '#e9f8ef'; } } const stCls = item.status==='Ativo'?'#e9f8ef':item.status==='Pendente'?'#fff3db':'#eef0f3'; const stColor = item.status==='Ativo'?'#187444':item.status==='Pendente'?'#a15d00':'#667085'; const avatarHtml = item.photo ? `<img src="${item.photo}" alt="" style="width:30px;height:30px;border-radius:50%;object-fit:cover;vertical-align:middle;margin-right:8px;border:2px solid #e2e8f0;">` : `<span style="display:inline-flex;align-items:center;justify-content:center;width:30px;height:30px;border-radius:50%;background:linear-gradient(135deg,#ff9d35,#e76b16);color:#fff;font-weight:700;font-size:12px;vertical-align:middle;margin-right:8px;">${item.name.charAt(0).toUpperCase()}</span>`; return `<tr><td style="display:flex;align-items:center;font-weight:600">${avatarHtml}${item.name}</td><td>${item.cpf||'-'}</td><td>${item.cnh||'-'}</td><td>${item.category||'-'}</td><td>${exp}${cnhSt ? ` <span style="display:inline-block;padding:2px 7px;border-radius:999px;font-size:10px;font-weight:700;background:${cnhBg}">${cnhSt}</span>` : ''}</td><td><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:11px;font-weight:700;color:${stColor};background:${stCls}">${item.status}</span></td><td>${item.phone||'-'}</td></tr>`; }).join(''); document.getElementById('drivers-report-table').innerHTML = html || `<tr><td colspan="7" style="text-align:center;padding:32px;color:#6b7280;">${emptyMsg}</td></tr>`; document.getElementById('drivers-report-modal-backdrop').classList.remove('hidden'); };

window.printModalReport = function(tableId, title) {
  const tableEl = document.getElementById(tableId);
  if (!tableEl) return;
  // Captura o <table> pai completo (com thead)
  const tableHtml = tableEl.closest('table') ? tableEl.closest('table').outerHTML : `<table>${tableEl.outerHTML}</table>`;
  const now = new Date();
  const dateStr = now.toLocaleDateString('pt-BR', { day:'2-digit', month:'2-digit', year:'numeric', hour:'2-digit', minute:'2-digit' });
  const win = window.open('', '_blank', 'width=1000,height=700');
  win.document.write(`<!DOCTYPE html>
<html lang="pt-BR">
<head>
  <meta charset="UTF-8">
  <title>${title} — NJTransportes</title>
  <style>
    @page { size: A4 landscape; margin: 14mm 12mm; }
    * { box-sizing: border-box; }
    body { font-family: Arial, sans-serif; color: #1f2937; margin: 0; background: #fff; }
    .print-header { display: flex; justify-content: space-between; align-items: flex-start; border-bottom: 2px solid #102a43; padding-bottom: 12px; margin-bottom: 20px; }
    .print-logo { font-size: 22px; font-weight: 800; color: #102a43; letter-spacing: -.03em; }
    .print-logo span { display: inline-block; background: linear-gradient(135deg,#ff9d35,#e76b16); color: #fff; padding: 4px 10px; border-radius: 6px; margin-right: 8px; font-size: 16px; }
    .print-meta { text-align: right; font-size: 11px; color: #6b7280; }
    .print-meta strong { display: block; font-size: 14px; color: #102a43; margin-bottom: 3px; }
    table { width: 100%; border-collapse: collapse; font-size: 11px; }
    thead th { background: #102a43; color: #fff; padding: 9px 11px; text-align: left; font-weight: 600; white-space: nowrap; }
    tbody tr:nth-child(even) { background: #f6f8fb; }
    tbody td { padding: 8px 11px; border-bottom: 1px solid #e5e7eb; vertical-align: middle; }
    img { border-radius: 50%; vertical-align: middle; }
    .print-footer { margin-top: 18px; font-size: 10px; color: #9ca3af; text-align: center; border-top: 1px solid #e5e7eb; padding-top: 8px; }
  </style>
</head>
<body>
  <div class="print-header">
    <div class="print-logo"><span>NJ</span>NJTransportes</div>
    <div class="print-meta"><strong>${title}</strong>Gerado em: ${dateStr}</div>
  </div>
  ${tableHtml}
  <div class="print-footer">NJTransportes — Sistema de Gestão Operacional</div>
  <script>window.onload = function(){ window.print(); window.onafterprint = function(){ window.close(); }; };<\/script>
</body>
</html>`);
  win.document.close();
};
function renderVehicles() { const all = get(keys.vehicles), query = $('#vehicle-search').value.toLowerCase(), list = all.filter(item => `${item.plate} ${item.model}`.toLowerCase().includes(query)); $('#total-vehicles').textContent = all.length; $('#active-vehicles').textContent = all.filter(item => item.status === 'Em operação').length; $('#maintenance-vehicles').textContent = all.filter(item => item.status === 'Manutenção').length; $('#vehicles-table').innerHTML = list.map(item => `<tr><td class="driver-cell">${item.plate}</td><td>${item.model}</td><td>${item.type}</td><td>${item.year}</td><td><span class="badge ${statusClass(item.status)}">${item.status}</span></td><td><button class="table-action" data-edit-vehicle="${item.id}">Editar</button></td></tr>`).join(''); $('#vehicles-empty').classList.toggle('hidden', all.length > 0); }
function switchView(view) { if (view === 'clients') return showClients(); currentView = view; const vehicles = view === 'vehicles'; $('#drivers-view').classList.toggle('hidden', vehicles); $('#vehicles-view').classList.toggle('hidden', !vehicles); $('#clients-view').classList.add('hidden'); $('#page-title').textContent = vehicles ? 'Veículos' : 'Motoristas'; $('#new-item-button').textContent = vehicles ? '+ Novo veículo' : '+ Novo motorista'; document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === view)); vehicles ? renderVehicles() : renderDrivers(); }
document.querySelectorAll('[data-view]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); switchView(link.dataset.view); }));
$('#driver-search').addEventListener('input', renderDrivers); $('#vehicle-search').addEventListener('input', renderVehicles);

function fields(type, item = {}) { const v = (k, def = '') => item[k] !== undefined ? item[k] : def; if (type === 'client') return [label(`Nome / razão social<input name="name" required value="${v('name')}" />`),label(`CPF / CNPJ<input name="document" value="${v('document')}" />`),label(`Telefone<input name="phone" value="${v('phone')}" />`),label(`CEP<input name="zip_code" value="${v('zip_code')}" />`),label(`Endereço<input name="address" required value="${v('address')}" />`),label(`Número<input name="number" value="${v('number')}" />`),label(`Bairro<input name="neighborhood" value="${v('neighborhood')}" />`),label(`Cidade<input name="city" required value="${v('city')}" />`),label(`UF<input name="state" required maxlength="2" value="${v('state')}" />`),label(`Referência<input name="reference" value="${v('reference')}" />`),label(`Status<select name="status"><option value="Ativo" ${v('status', 'Ativo') === 'Ativo' ? 'selected' : ''}>Ativo</option><option value="Inativo" ${v('status') === 'Inativo' ? 'selected' : ''}>Inativo</option></select>`)].join(''); const expiryVal = item.expiry ? item.expiry.split('T')[0] : ''; const photoHtml = `<div class="full-width" style="display:flex;flex-direction:column;align-items:center;gap:12px;padding:12px 0;"><div id="photo-preview-wrap" style="position:relative;width:110px;height:110px;"><img id="photo-preview" src="${v('photo') || ''}" alt="" style="width:110px;height:110px;border-radius:50%;object-fit:cover;border:3px solid #e2e8f0;background:#f1f5f9;display:${v('photo') ? 'block' : 'none'};"><div id="photo-placeholder" style="width:110px;height:110px;border-radius:50%;background:linear-gradient(135deg,#ff9d35,#e76b16);display:${v('photo') ? 'none' : 'flex'};align-items:center;justify-content:center;font-size:42px;color:#fff;font-weight:700;">${v('name') ? v('name').charAt(0).toUpperCase() : '?'}</div></div><label for="photo-upload" style="cursor:pointer;display:inline-flex;align-items:center;gap:6px;font-size:13px;padding:7px 18px;border-radius:8px;background:#f1f5f9;border:1.5px dashed #cbd5e1;color:#64748b;font-weight:500;transition:all .2s;" onmouseover="this.style.background='#e2e8f0'" onmouseout="this.style.background='#f1f5f9'">📷 Selecionar foto</label><input type="file" id="photo-upload" accept="image/*" style="display:none;" onchange="(function(el){const f=el.files[0];if(!f)return;if(f.size>2097152){alert('Imagem muito grande. Máximo 2 MB.');el.value='';return;}const r=new FileReader();r.onload=function(e){const img=document.getElementById('photo-preview');const ph=document.getElementById('photo-placeholder');img.src=e.target.result;img.style.display='block';ph.style.display='none';window._pendingDriverPhoto=e.target.result;};r.readAsDataURL(f);})(this);"><p style="font-size:11px;color:#94a3b8;margin:0;">JPG, PNG ou WebP — máx. 2 MB</p></div>`; return type === 'vehicle' ? label(`Placa<input id="plate" required value="${v('plate')}" />`) + label(`Modelo<input id="model" required value="${v('model')}" />`) + label(`Tipo<input id="type" required value="${v('type')}" />`) + label(`Ano<input id="year" required value="${v('year')}" />`) + label(`Status<select id="status"><option value="Em operação" ${v('status', 'Em operação') === 'Em operação' ? 'selected' : ''}>Em operação</option><option value="Manutenção" ${v('status') === 'Manutenção' ? 'selected' : ''}>Em manutenção</option></select>`) : photoHtml + label(`Nome completo<input id="name" required value="${v('name')}" />`) + label(`CPF<input id="cpf" required value="${v('cpf')}" />`) + label(`CNH<input id="cnh" required value="${v('cnh')}" />`) + label(`Categoria<select id="category" required><option value="" disabled ${!v('category') ? 'selected' : ''}>Selecione...</option><option value="A" ${v('category') === 'A' ? 'selected' : ''}>A</option><option value="B" ${v('category') === 'B' ? 'selected' : ''}>B</option><option value="C" ${v('category') === 'C' ? 'selected' : ''}>C</option><option value="D" ${v('category') === 'D' ? 'selected' : ''}>D</option><option value="E" ${v('category') === 'E' ? 'selected' : ''}>E</option><option value="AB" ${v('category') === 'AB' ? 'selected' : ''}>AB</option><option value="AC" ${v('category') === 'AC' ? 'selected' : ''}>AC</option><option value="AD" ${v('category') === 'AD' ? 'selected' : ''}>AD</option><option value="AE" ${v('category') === 'AE' ? 'selected' : ''}>AE</option></select>`) + label(`Validade<input id="expiry" type="date" required value="${expiryVal}" />`) + label(`Status<select id="status"><option value="Ativo" ${v('status', 'Ativo') === 'Ativo' ? 'selected' : ''}>Ativo</option><option value="Pendente" ${v('status') === 'Pendente' ? 'selected' : ''}>Pendente</option><option value="Inativo" ${v('status') === 'Inativo' ? 'selected' : ''}>Inativo</option></select>`) + label(`Celular<input name="phone" id="phone" placeholder="(xx) xxxxx-xxxx" value="${v('phone')}" />`) + label(`CEP<input name="zip_code" id="zip_code" value="${v('zip_code')}" />`) + label(`Endereço<input name="address" id="address" value="${v('address')}" />`) + label(`Número<input name="number" id="number" value="${v('number')}" />`) + label(`Bairro<input name="neighborhood" id="neighborhood" value="${v('neighborhood')}" />`) + label(`Cidade<input name="city" id="city" value="${v('city')}" />`) + label(`UF<input name="state" id="state" maxlength="2" value="${v('state')}" />`); }
function openModal(type, item) { modalType = type; window._pendingDriverPhoto = null; currentDriverPhoto = (type === 'driver' && item && item.photo) ? item.photo : ''; const title = type === 'vehicle' ? 'veículo' : type === 'client' ? 'cliente' : 'motorista'; $('#modal-title').textContent = `${item ? 'Editar' : 'Novo'} ${title}`; $('#modal-fields').innerHTML = `<input type="hidden" id="record-id" value="${item?.id || ''}" />${fields(type, item)}`; $('#modal-backdrop').classList.remove('hidden'); }
function closeModal() { $('#modal-backdrop').classList.add('hidden'); $('#record-error').textContent = ''; }
$('#new-item-button').addEventListener('click', () => openModal(currentView === 'clients' ? 'client' : currentView === 'vehicles' ? 'vehicle' : 'driver')); document.addEventListener('click', event => { if (event.target.dataset.new) openModal(event.target.dataset.new); if (event.target.dataset.editDriver) { const item = get(keys.drivers).find(d => String(d.id) === String(event.target.dataset.editDriver)); if (item) openModal('driver', item); } if (event.target.dataset.editVehicle) { const item = get(keys.vehicles).find(v => String(v.id) === String(event.target.dataset.editVehicle)); if (item) openModal('vehicle', item); } if (event.target.dataset.editClient) { const item = clientsData.find(c => String(c.id) === String(event.target.dataset.editClient)); if (item) openModal('client', item); } }); $('#close-modal').addEventListener('click', closeModal); $('#cancel-modal').addEventListener('click', closeModal); $('#modal-backdrop').addEventListener('click', event => { if (event.target === $('#modal-backdrop')) closeModal(); });
$('#record-form').addEventListener('input', async event => {
  // Campos de texto que devem ficar em MAIUSCULAS
  const upperFields = ['name','model','type','address','neighborhood','city','state','reference','destination'];
  if (upperFields.includes(event.target.id) || upperFields.includes(event.target.name)) {
    const pos = event.target.selectionStart;
    event.target.value = event.target.value.toUpperCase();
    event.target.setSelectionRange(pos, pos);
  }
  if (event.target.id === 'cpf') event.target.value = formatCpf(event.target.value); if (event.target.id === 'plate' || event.target.name === 'plate') event.target.value = formatPlate(event.target.value); if (event.target.name === 'document') event.target.value = formatCnpjCpf(event.target.value); if (event.target.id === 'phone' || event.target.name === 'phone') event.target.value = formatPhone(event.target.value); if (event.target.name === 'zip_code') { event.target.value = formatCep(event.target.value); if (event.target.value.length === 9) { try { let r = await fetch('https://viacep.com.br/ws/'+event.target.value.replace(/\D/g,'')+'/json/'); let d = await r.json(); if (!d.erro) { let f = event.target.closest('form'); if(f.elements['address']) f.elements['address'].value = (d.logradouro || '').toUpperCase(); if(f.elements['neighborhood']) f.elements['neighborhood'].value = (d.bairro || '').toUpperCase(); if(f.elements['city']) f.elements['city'].value = (d.localidade || '').toUpperCase(); if(f.elements['state']) f.elements['state'].value = (d.uf || '').toUpperCase(); if(f.elements['number']) f.elements['number'].focus(); } } catch(e){} } } if (event.target.id === 'cnh' || event.target.name === 'cnh') event.target.value = event.target.value.replace(/\D/g, '').slice(0, 11); });
$('#record-form').addEventListener('submit', async event => { event.preventDefault(); try { let resource, data; const id = $('#record-id').value; if (modalType === 'client') { resource = 'clients';
        data = Object.fromEntries(new FormData(event.target));
        const clientUpperFields = ['name','address','neighborhood','city','state','reference'];
        clientUpperFields.forEach(k => { if (data[k]) data[k] = data[k].toUpperCase(); }); } else if (modalType === 'vehicle') { resource = 'vehicles'; data = { plate: $('#plate').value.trim(), model: ($('#model').value.trim()).toUpperCase(), type: ($('#type').value.trim()).toUpperCase(), year: $('#year').value, status: $('#status').value || 'Em operação', renavam: '' }; } else { resource = 'drivers'; data = { name: ($('#name').value.trim()).toUpperCase(), cpf: $('#cpf').value.trim(), cnh: $('#cnh').value.trim(), category: $('#category').value.trim(), expiry: $('#expiry').value, status: $('#status').value || 'Ativo', phone: $('#phone')?.value||'', zip_code: $('#zip_code')?.value||'', address: ($('#address')?.value||'').toUpperCase(), number: $('#number')?.value||'', neighborhood: ($('#neighborhood')?.value||'').toUpperCase(), city: ($('#city')?.value||'').toUpperCase(), state: ($('#state')?.value||'').toUpperCase(), photo: window._pendingDriverPhoto || currentDriverPhoto || '' }; } if (id) data.id = id; const saved = await api(resource + (id ? '/' + id : ''), { method: id ? 'PUT' : 'POST', body: JSON.stringify(data) }); if (resource === 'drivers' && window._pendingDriverPhoto) { const driverId = id || saved.id; try { await api(`drivers/${driverId}/photo`, { method: 'PUT', body: JSON.stringify({ photo: window._pendingDriverPhoto }) }); } catch(e) { console.warn('Foto não salva:', e.message); } } closeModal(); if (resource === 'clients') return showClients(); const records = await api(resource); localStorage.setItem(resource === 'drivers' ? keys.drivers : keys.vehicles, JSON.stringify(records)); resource === 'drivers' ? renderDrivers() : renderVehicles(); } catch (error) { $('#record-error').textContent = error.message; } });
async function showClients() { currentView = 'clients'; $('#drivers-view').classList.add('hidden'); $('#vehicles-view').classList.add('hidden'); $('#clients-view').classList.remove('hidden'); $('#page-title').textContent = 'Clientes'; $('#new-item-button').textContent = '+ Novo cliente'; document.querySelectorAll('[data-view]').forEach(link => link.classList.toggle('active', link.dataset.view === 'clients')); clientsData = await api('clients'); $('#clients-table').innerHTML = clientsData.map(c => `<tr><td class="driver-cell">${c.name}</td><td>${c.address}, ${c.number || 's/n'}</td><td>${c.city}/${c.state}</td><td>${c.phone || '-'}</td><td><button class="table-action" data-edit-client="${c.id}">Editar</button></td></tr>`).join(''); $('#clients-empty').classList.toggle('hidden', clientsData.length > 0); }
document.querySelector('[data-view="clients"]').addEventListener('click', event => { event.preventDefault(); showClients(); });
$('#sidebar-toggle').addEventListener('click', () => $('#sidebar').classList.toggle('collapsed')); $('#mobile-menu').addEventListener('click', () => $('#sidebar').classList.toggle('open')); renderAuth(); showApp();

// ── Hover effects nos cards clicáveis de motoristas ─────────────────────────
(function addCardHoverEffects() {
  const cards = [
    { id: 'total-drivers-card',   color: 'rgba(18,97,160,0.08)' },
    { id: 'active-drivers-card',  color: 'rgba(22,163,74,0.08)' },
    { id: 'pending-drivers-card', color: 'rgba(217,119,6,0.08)' },
    { id: 'expiring-cnh-card',    color: 'rgba(255,179,0,0.12)' }
  ];
  cards.forEach(({ id, color }) => {
    const el = document.getElementById(id);
    if (!el) return;
    el.style.transition = 'transform .15s, box-shadow .15s';
    el.addEventListener('mouseenter', () => { el.style.transform = 'translateY(-3px)'; el.style.boxShadow = `0 6px 18px ${color}`; });
    el.addEventListener('mouseleave', () => { el.style.transform = ''; el.style.boxShadow = ''; });
  });
})();

// ── Photo Lightbox ──────────────────────────────────────────────────────────
(function initPhotoLightbox() {
  const lb = document.createElement('div');
  lb.id = 'photo-lightbox';
  lb.innerHTML = `
    <div id="photo-lightbox-inner">
      <img id="photo-lightbox-img" src="" alt="Foto do motorista" />
      <p id="photo-lightbox-name"></p>
      <button id="photo-lightbox-close" aria-label="Fechar">&times;</button>
    </div>`;
  lb.style.cssText = 'display:none;position:fixed;inset:0;z-index:9999;background:rgba(0,0,0,.85);backdrop-filter:blur(6px);align-items:center;justify-content:center;cursor:zoom-out;';
  document.getElementById('photo-lightbox-inner') && document.body.removeChild(document.getElementById('photo-lightbox'));
  document.body.appendChild(lb);
  const style = document.createElement('style');
  style.textContent = `
    #photo-lightbox { display:none; }
    #photo-lightbox.lb-open { display:flex !important; animation: lbFadeIn .2s ease; }
    @keyframes lbFadeIn { from{opacity:0} to{opacity:1} }
    #photo-lightbox-inner { position:relative; display:flex; flex-direction:column; align-items:center; gap:14px; }
    #photo-lightbox-img { max-width:min(420px,90vw); max-height:80vh; border-radius:16px; object-fit:contain; box-shadow:0 24px 64px rgba(0,0,0,.6); border:3px solid rgba(255,255,255,.15); animation:lbImgIn .25s cubic-bezier(.34,1.56,.64,1); }
    @keyframes lbImgIn { from{transform:scale(.7);opacity:0} to{transform:scale(1);opacity:1} }
    #photo-lightbox-name { color:#fff; font-size:16px; font-weight:600; letter-spacing:.01em; text-shadow:0 2px 8px rgba(0,0,0,.5); margin:0; }
    #photo-lightbox-close { position:absolute; top:-44px; right:-4px; background:rgba(255,255,255,.15); border:none; color:#fff; width:36px; height:36px; border-radius:50%; font-size:22px; cursor:pointer; display:flex; align-items:center; justify-content:center; transition:background .15s; }
    #photo-lightbox-close:hover { background:rgba(255,255,255,.3); }`;
  document.head.appendChild(style);
  function openLightbox(photoSrc, driverName) { document.getElementById('photo-lightbox-img').src = photoSrc; document.getElementById('photo-lightbox-name').textContent = driverName; lb.classList.add('lb-open'); document.body.style.overflow = 'hidden'; }
  function closeLightbox() { lb.classList.remove('lb-open'); document.body.style.overflow = ''; }
  lb.addEventListener('click', closeLightbox);
  document.getElementById('photo-lightbox-close').addEventListener('click', closeLightbox);
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeLightbox(); });
  document.addEventListener('click', e => {
    const photoId = e.target.dataset.photoView;
    if (!photoId) return;
    const driver = get(keys.drivers).find(d => String(d.id) === String(photoId));
    if (driver && driver.photo) openLightbox(driver.photo, driver.name);
  });
})();

fetch('/api/drivers').then(function(r){var e=document.querySelector('#db-status');if(e)e.innerHTML=r.ok?'<span style="color:#22c55e">&#9679;</span> Banco conectado':'<span style="color:#ef4444">&#9679;</span> Banco desconectado'}).catch(function(){var e=document.querySelector('#db-status');if(e)e.innerHTML='<span style="color:#ef4444">&#9679;</span> Banco desconectado'});
