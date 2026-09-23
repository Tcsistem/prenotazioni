const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbxSsB2W3DnKi3sxC4U6oMV7XOOs_OuWkGaU0Yy_eRR9OdcI8EYvAe1C0JG1IBYI4BUjlw/exec';

function initPage() {
  loadCallbacks();
  setInterval(loadCallbacks, 5000);
}

function loadCallbacks() {
  fetch(APPS_SCRIPT_URL)
    .then(response => response.json())
    .then(callbacks => displayCallbacks(callbacks))
    .catch(error => {
      console.error('❌ Errore:', error);
      document.getElementById('callbacks-list').innerHTML = '<p>Errore nel caricamento</p>';
    });
}

function displayCallbacks(callbacks) {
  const container = document.getElementById('callbacks-list');
  
  if (!callbacks || callbacks.length === 0) {
    container.innerHTML = '<p>Nessun callback in sospeso</p>';
    return;
  }
  
  container.innerHTML = callbacks.map(cb => `
    <div class="callback-item">
      <strong>${cb.nome} ${cb.cognome}</strong><br>
      <p>📞 <a href="tel:${cb.telefono}">${cb.telefono}</a></p>
      <p>🔬 Analisi: ${cb.analisi}</p>
      <p>📊 Stato: ${cb.stato}</p>
      <small>⏰ ${cb.data_ora}</small>
    </div>
  `).join('');
}