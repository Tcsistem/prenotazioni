const SPREADSHEET_ID = '1Ao2aCVxsjMp70ROa8MyAVVTkEnSGIwuDnxFQ2XBCBrA';

// Carica Google Charts prima
google.charts.load('current', {'packages':['corechart']});
google.charts.setOnLoadCallback(initPage);

function initPage() {
  loadCallbacks();
  setInterval(loadCallbacks, 5000);
}

function loadCallbacks() {
  const url = `https://docs.google.com/spreadsheets/d/${SPREADSHEET_ID}/gviz/query?headers=1&gid=0`;
  const query = new google.visualization.Query(url);
  
  query.setQuery('select A,B,C,D,E,F order by A desc');
  query.send(handleQueryResponse);
}

function handleQueryResponse(response) {
  if (response.isError()) {
    console.error('❌ Errore:', response.getMessage());
    document.getElementById('callbacks-list').innerHTML = '<p>Errore nel caricamento</p>';
    return;
  }
  
  const data = response.getDataTable();
  const callbacks = [];
  
  for (let i = 0; i < data.getNumberOfRows(); i++) {
    callbacks.push({
      data_ora: data.getValue(i, 0),
      nome: data.getValue(i, 1),
      cognome: data.getValue(i, 2),
      telefono: data.getValue(i, 3),
      analisi: data.getValue(i, 4),
      stato: data.getValue(i, 5)
    });
  }
  
  displayCallbacks(callbacks);
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