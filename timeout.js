window.alert = function(msg) {
  const overlay = document.createElement('div');
  overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
  const box = document.createElement('div');
  box.style.cssText = 'background:#fff;padding:24px 32px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);max-width:400px;width:90%;text-align:center;font-family:sans-serif;animation: fadeIn 0.2s ease;';
  box.innerHTML = `<p style="margin:0 0 24px 0;color:#1f2937;font-size:16px;line-height:1.5;">${msg.replace(/\n/g, '<br>')}</p><button style="background:#1f2937;color:#fff;border:none;padding:10px 28px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;transition:0.2s;">OK</button>`;
  box.querySelector('button').onclick = () => document.body.removeChild(overlay);
  box.querySelector('button').onmouseover = function() { this.style.background = '#374151'; };
  box.querySelector('button').onmouseout = function() { this.style.background = '#1f2937'; };
  overlay.appendChild(box);
  document.body.appendChild(overlay);
};

window.confirm = function(msg) {
  return new Promise(resolve => {
    const overlay = document.createElement('div');
    overlay.style.cssText = 'position:fixed;top:0;left:0;width:100%;height:100%;background:rgba(0,0,0,0.4);z-index:999999;display:flex;align-items:center;justify-content:center;backdrop-filter:blur(2px);';
    const box = document.createElement('div');
    box.style.cssText = 'background:#fff;padding:24px 32px;border-radius:12px;box-shadow:0 10px 25px rgba(0,0,0,0.1);max-width:400px;width:90%;text-align:center;font-family:sans-serif;animation: fadeIn 0.2s ease;';
    box.innerHTML = `<p style="margin:0 0 24px 0;color:#1f2937;font-size:16px;line-height:1.5;">${msg.replace(/\n/g, '<br>')}</p>
    <div style="display:flex;gap:12px;justify-content:center;">
      <button id="btn-cancel" style="background:#e5e7eb;color:#374151;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;transition:0.2s;">Cancelar</button>
      <button id="btn-ok" style="background:#dc2626;color:#fff;border:none;padding:10px 24px;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;transition:0.2s;">Confirmar</button>
    </div>`;
    box.querySelector('#btn-cancel').onclick = () => { document.body.removeChild(overlay); resolve(false); };
    box.querySelector('#btn-ok').onclick = () => { document.body.removeChild(overlay); resolve(true); };
    box.querySelector('#btn-cancel').onmouseover = function() { this.style.background = '#d1d5db'; };
    box.querySelector('#btn-cancel').onmouseout = function() { this.style.background = '#e5e7eb'; };
    box.querySelector('#btn-ok').onmouseover = function() { this.style.background = '#b91c1c'; };
    box.querySelector('#btn-ok').onmouseout = function() { this.style.background = '#dc2626'; };
    overlay.appendChild(box);
    document.body.appendChild(overlay);
  });
};

(function() {
  let inactivityTimer;
  function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      sessionStorage.removeItem('nj_session');
      if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        location.reload();
      } else {
        window.location.href = 'dashboard.html';
      }
    }, 30 * 60 * 1000);
  }
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => 
    window.addEventListener(evt, resetTimer, { passive: true })
  );
  resetTimer();
})();
