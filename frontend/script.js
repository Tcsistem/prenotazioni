const API_BASE_URL = 'https://prenotazioni-anxur-demo1-6e8d42198352.herokuapp.com';

console.log('[INFO] Dashboard initialized');
console.log('[INFO] API URL: ' + API_BASE_URL);

// Carica i callback quando la pagina si apre
document.addEventListener('DOMContentLoaded', function() {
    loadCallbacks();
    loadPrenotazioni();
    updateTime();
    setInterval(updateTime, 1000);
    
    // Event listeners per i modal
    setupModalListeners();
});

function setupModalListeners() {
    const modalCallback = document.getElementById('modal-callback');
    const modalTest = document.getElementById('modal-test-callback');
    const testBtn = document.getElementById('test-callback-btn');
    const formTest = document.getElementById('form-test-callback');
    const formCallback = document.getElementById('form-callback');
    
    if (testBtn) {
        testBtn.addEventListener('click', () => {
            if (modalTest) modalTest.style.display = 'block';
        });
    }
    
    if (formTest) {
        formTest.addEventListener('submit', createTestCallback);
    }
    
    if (formCallback) {
        formCallback.addEventListener('submit', submitCallbackComplete);
    }
    
    // Chiudi modal
    document.querySelectorAll('.modal-close, .modal-close-btn').forEach(el => {
        el.addEventListener('click', function() {
            document.querySelectorAll('.modal').forEach(m => m.style.display = 'none');
        });
    });
    
    // Chiudi modal cliccando fuori
    window.addEventListener('click', function(event) {
        if (event.target.classList.contains('modal')) {
            event.target.style.display = 'none';
        }
    });
}

async function loadCallbacks() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks`);
        const data = await response.json();
        
        const callbacksList = document.getElementById('callbacks-list');
        if (!callbacksList) {
            console.error('❌ Elemento callbacks-list non trovato');
            return;
        }
        
        if (data.data && data.data.length > 0) {
            callbacksList.innerHTML = data.data.map(callback => `
                <div class="callback-item">
                    <strong>${callback.nome} ${callback.cognome}</strong><br>
                    Telefono: <a href="tel:${callback.telefono}" style="text-decoration: none; color: #0066cc; font-weight: bold;">📞 ${callback.telefono}</a><br>
                    Analisi: ${callback.tipo_analisi}<br>
                    Orario preferito: ${callback.orario_preferito}<br>
                    <small>Richiesta: ${new Date(callback.data_ora_richiesta).toLocaleString('it-IT')}</small>
                    <div style="margin-top: 10px;">
                        <button class="btn btn-primary" onclick="openCompleteModal(${callback.id}, '${callback.nome}', '${callback.cognome}', '${callback.telefono}')">✓ Completato</button>
                        <button class="btn btn-danger" onclick="deleteCallback(${callback.id})">🗑️ Elimina</button>
                    </div>
                </div>
            `).join('');
        } else {
            callbacksList.innerHTML = '<p>Nessun callback in sospeso</p>';
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

async function loadPrenotazioni() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/prenotazioni`);
        const data = await response.json();
        
        const prenotazioniList = document.getElementById('prenotazioni-list');
        if (!prenotazioniList) return;
        
        if (data.data && data.data.length > 0) {
            prenotazioniList.innerHTML = data.data.map(p => `
                <div class="callback-item">
                    <strong>${p.cliente_nome} ${p.cliente_cognome}</strong><br>
                    Telefono: <a href="tel:${p.cliente_telefono}" style="text-decoration: none; color: #0066cc; font-weight: bold;">📞 ${p.cliente_telefono}</a><br>
                    Analisi: ${p.tipo_analisi}<br>
                    Data: ${p.data_prenotazione} ore ${p.orario_prenotazione}
                </div>
            `).join('');
        } else {
            prenotazioniList.innerHTML = '<p>Nessuna prenotazione per oggi</p>';
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

async function loadCompletati() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/completati`);
        const data = await response.json();
        
        const completatiList = document.getElementById('completati-list');
        if (!completatiList) return;
        
        if (data.data && data.data.length > 0) {
            completatiList.innerHTML = data.data.map(callback => `
                <div class="callback-item">
                    <strong>${callback.nome} ${callback.cognome}</strong><br>
                    Telefono: <a href="tel:${callback.telefono}" style="text-decoration: none; color: #0066cc; font-weight: bold;">📞 ${callback.telefono}</a><br>
                    Analisi: ${callback.tipo_analisi}<br>
                    Note: ${callback.note || 'nessuna'}<br>
                    <small>Richiesta: ${new Date(callback.data_ora_richiesta).toLocaleString('it-IT')}</small>
                </div>
            `).join('');
        } else {
            completatiList.innerHTML = '<p>Nessun callback completato oggi</p>';
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

function openCompleteModal(callbackId, nome, cognome, telefono) {
    const modal = document.getElementById('modal-callback');
    if (!modal) return;
    
    document.getElementById('modal-cliente-nome').textContent = `${nome} ${cognome}`;
    document.getElementById('modal-cliente-telefono').textContent = telefono;
    document.getElementById('form-callback').dataset.callbackId = callbackId;
    modal.style.display = 'block';
}

async function submitCallbackComplete(e) {
    e.preventDefault();
    const callbackId = document.getElementById('form-callback').dataset.callbackId;
    const note = document.getElementById('modal-note').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}/complete`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ note })
        });
        
        if (response.ok) {
            console.log('[SUCCESS] ✅ Callback completato');
            document.getElementById('modal-callback').style.display = 'none';
            document.getElementById('form-callback').reset();
            loadCallbacks();
            loadCompletati();
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

async function deleteCallback(callbackId) {
    if (!confirm('Sei sicuro di voler eliminare questo callback?')) return;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}`, {
            method: 'DELETE'
        });
        
        if (response.ok) {
            console.log('[SUCCESS] ✅ Callback rimosso');
            loadCallbacks();
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

async function createTestCallback(e) {
    e.preventDefault();
    
    const nome = document.getElementById('test-nome').value;
    const cognome = document.getElementById('test-cognome').value;
    const telefono = document.getElementById('test-telefono').value;
    const analisi = document.getElementById('test-analisi').value;
    const orario = document.getElementById('test-orario').value;
    
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome, cognome, telefono,
                tipo_analisi: analisi,
                orario_preferito: orario
            })
        });
        
        const data = await response.json();
        if (data.success) {
            console.log('[SUCCESS] ✅ Callback creato');
            document.getElementById('modal-test-callback').style.display = 'none';
            document.getElementById('form-test-callback').reset();
            loadCallbacks();
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
    }
}

function showTab(tabName) {
    document.querySelectorAll('.tab-content').forEach(el => el.style.display = 'none');
    const tab = document.getElementById(tabName + '-tab');
    if (tab) {
        tab.style.display = 'block';
    }
    
    if (tabName === 'completati') {
        loadCompletati();
    }
}

function updateTime() {
    const timeDisplay = document.getElementById('time-display');
    if (timeDisplay) {
        timeDisplay.textContent = new Date().toLocaleTimeString('it-IT');
    }
}