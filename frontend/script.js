const APPS_SCRIPT_URL = 'https://script.google.com/macros/s/AKfycbzDUtS6tHiv9fcX46uz8Ezjf6ab3VBRSbCPkYTPzWNmVzBn-xIOZ3MOpVMA4hE073gODg/exec';

function initPage() {
  loadCallbacks();
  setInterval(loadCallbacks, 5000);
}

function loadCallbacks() {
  fetch(APPS_SCRIPT_URL, {
    method: 'GET',
    redirect: 'follow'
  })
    .then(response => {
      if (!response.ok) {
        throw new Error('Errore HTTP: ' + response.status);
      }
      return response.json();
    })
    .then(callbacks => displayCallbacks(callbacks))
    .catch(error => {
      console.error('❌ Errore fetch:', error);
      document.getElementById('callbacks-list').innerHTML = '<p>Errore: ' + error.message + '</p>';
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
      <div style="margin-top: 10px;">
        <button onclick="deleteCallback(${cb.row})" style="background: #e74c3c; color: white; border: none; padding: 8px 16px; border-radius: 5px; cursor: pointer;">
          🗑️ Elimina
        </button>
      </div>
    </div>
  `).join('');
}

function deleteCallback(row) {
  if (!confirm('Sei sicuro di voler eliminare questo callback?')) {
    return;
  }
  
  const url = `${APPS_SCRIPT_URL}?action=delete&row=${row}`;
  
  fetch(url)
    .then(response => response.json())
    .then(result => {
      if (result.success) {
        loadCallbacks();
      } else {
        alert('Errore: ' + (result.message || result.error));
      }
    })
    .catch(error => {
      console.error('❌ Errore eliminazione:', error);
      alert('Errore nella comunicazione con il server');
    });
}

document.addEventListener('DOMContentLoaded', initPage);
