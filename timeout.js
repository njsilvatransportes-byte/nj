(function() {
  let inactivityTimer;
  function resetTimer() {
    clearTimeout(inactivityTimer);
    inactivityTimer = setTimeout(() => {
      localStorage.removeItem('nj_session');
      if (window.location.pathname.endsWith('index.html') || window.location.pathname === '/' || window.location.pathname === '') {
        location.reload();
      } else {
        window.location.href = 'index.html';
      }
    }, 30 * 60 * 1000); // 30 minutes
  }
  ['mousemove', 'keydown', 'click', 'scroll', 'touchstart'].forEach(evt => 
    window.addEventListener(evt, resetTimer, { passive: true })
  );
  resetTimer();
})();
