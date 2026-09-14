/**
 * Centro Analisi Anxur - Dashboard Operatrici
 * Script principale per la gestione callback e prenotazioni
 */

// ==================== CONFIGURAZIONE ====================

const API_BASE_URL = 'https://prenotazioni-anxur-demo1-6e8d42198352.herokuapp.com';

// ==================== ELEMENTI DOM ====================

const callbackList = document.getElementById('callback-list');
const prenotazioniList = document.getElementById('prenotazioni-list');
const refreshBtn = document.getElementById('refresh-btn');
const refreshPrenotazioniBtn = document.getElementById('refresh-prenotazioni-btn');
const testCallbackBtn = document.getElementById('test-callback-btn');
const statusBadge = document.getElementById('status-badge');
const timeDisplay = document.getElementById('time-display');

// Modals
const modalCallback = document.getElementById('modal-callback');
const modalTestCallback = document.getElementById('modal-test-callback');
const formCallback = document.getElementById('form-callback');
const formTestCallback = document.getElementById('form-test-callback');

let currentCallbackId = null;

// ==================== FUNZIONI PRINCIPALI ====================

/**
 * Carica lista callback dal server
 */
async function loadCallbacks() {
    try {
        callbackList.innerHTML = '<p class="loading">Caricamento...</p>';

        const response = await fetch(`${API_BASE_URL}/api/callbacks`);
        const data = await response.json();

        if (!data.success) {
            callbackList.innerHTML = `<p class="info">⚠️ Errore: ${data.error}</p>`;
            return;
        }

        if (data.data.length === 0) {
            callbackList.innerHTML = '<p class="empty">✅ Nessun callback in sospeso</p>';
            return;
        }

        callbackList.innerHTML = data.data.map(callback => `
            <div class="callback-item">
                <div class="callback-info">
                    <div class="callback-name">📞 ${callback.nome} ${callback.cognome}</div>
                    <div class="callback-details">
                        <div class="callback-detail">
                            <span>📱 ${callback.telefono}</span>
                        </div>
                        <div class="callback-detail">
                            <span>🧪 ${callback.tipo_analisi}</span>
                        </div>
                        <div class="callback-detail">
                            <span>🕐 ${callback.orario_preferito}</span>
                        </div>
                        <div class="callback-detail">
                            <span>⏰ ${formatTime(callback.data_ora_richiesta)}</span>
                        </div>
                    </div>
                </div>
                <div class="callback-actions">
                    <button class="btn btn-success" onclick="openCallbackModal(${callback.id}, '${callback.nome} ${callback.cognome}', '${callback.telefono}')">
                        ✓ Completato
                    </button>
                    <button class="btn btn-danger" onclick="deleteCallback(${callback.id})">
                        🗑️ Rimuovi
                    </button>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading callbacks:', error);
        callbackList.innerHTML = '<p class="info">❌ Errore di connessione al server</p>';
    }
}

/**
 * Carica prenotazioni odierne
 */
async function loadPrenotazioni() {
    try {
        prenotazioniList.innerHTML = '<p class="loading">Caricamento...</p>';

        const response = await fetch(`${API_BASE_URL}/api/prenotazioni`);
        const data = await response.json();

        if (!data.success) {
            prenotazioniList.innerHTML = `<p class="info">⚠️ Errore: ${data.error}</p>`;
            return;
        }

        if (data.data.length === 0) {
            prenotazioniList.innerHTML = '<p class="empty">📅 Nessuna prenotazione per oggi</p>';
            return;
        }

        prenotazioniList.innerHTML = data.data.map(p => `
            <div class="prenotazione-item">
                <div class="callback-info">
                    <div class="callback-name">✅ ${p.cliente_nome} ${p.cliente_cognome}</div>
                    <div class="callback-details">
                        <div class="callback-detail">
                            <span>🕐 ${p.ora_prenotazione}</span>
                        </div>
                        <div class="callback-detail">
                            <span>🧪 ${p.tipo_analisi}</span>
                        </div>
                        <div class="callback-detail">
                            <span>📱 ${p.cliente_telefono}</span>
                        </div>
                    </div>
                </div>
            </div>
        `).join('');

    } catch (error) {
        console.error('Error loading prenotazioni:', error);
        prenotazioniList.innerHTML = '<p class="info">❌ Errore di connessione</p>';
    }
}

/**
 * Completa callback (POST richiesta al server)
 */
async function completeCallback(callbackId, note) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}/complete`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({ note })
        });

        const data = await response.json();

        if (data.success) {
            closeCallbackModal();
            showNotification('✅ Callback segnato come completato', 'success');
            loadCallbacks();
        } else {
            showNotification('❌ Errore: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error completing callback:', error);
        showNotification('❌ Errore di connessione', 'error');
    }
}

/**
 * Cancella callback
 */
async function deleteCallback(callbackId) {
    if (!confirm('Sei sicuro di voler rimuovere questo callback?')) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}`, {
            method: 'DELETE'
        });

        const data = await response.json();

        if (data.success) {
            showNotification('✅ Callback rimosso', 'success');
            loadCallbacks();
        } else {
            showNotification('❌ Errore: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error deleting callback:', error);
        showNotification('❌ Errore di connessione', 'error');
    }
}

/**
 * Crea nuovo callback (test/simulazione voicebot)
 */
async function createTestCallback(formData) {
    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks`, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json'
            },
            body: JSON.stringify({
                nome: formData.get('nome'),
                cognome: formData.get('cognome'),
                telefono: formData.get('telefono'),
                tipo_analisi: formData.get('analisi'),
                orario_preferito: formData.get('orario')
            })
        });

        const data = await response.json();

        if (data.success) {
            closeTestCallbackModal();
            showNotification('✅ Callback creato con successo (test)', 'success');
            loadCallbacks();
            formTestCallback.reset();
        } else {
            showNotification('❌ Errore: ' + data.error, 'error');
        }
    } catch (error) {
        console.error('Error creating callback:', error);
        showNotification('❌ Errore di connessione', 'error');
    }
}

// ==================== MODAL FUNCTIONS ====================

function openCallbackModal(id, nome, telefono) {
    currentCallbackId = id;
    document.getElementById('modal-cliente-nome').textContent = nome;
    document.getElementById('modal-cliente-telefono').textContent = telefono;
    modalCallback.classList.add('show');
}

function closeCallbackModal() {
    modalCallback.classList.remove('show');
    formCallback.reset();
}

function openTestCallbackModal() {
    modalTestCallback.classList.add('show');
}

function closeTestCallbackModal() {
    modalTestCallback.classList.remove('show');
}

// ==================== EVENT LISTENERS ====================

refreshBtn.addEventListener('click', loadCallbacks);
refreshPrenotazioniBtn.addEventListener('click', loadPrenotazioni);
testCallbackBtn.addEventListener('click', openTestCallbackModal);

formCallback.addEventListener('submit', (e) => {
    e.preventDefault();
    const note = document.getElementById('modal-note').value;
    completeCallback(currentCallbackId, note);
});

formTestCallback.addEventListener('submit', (e) => {
    e.preventDefault();
    createTestCallback(new FormData(formTestCallback));
});

// Modal close handlers
document.querySelectorAll('.modal-close, .modal-close-btn').forEach(btn => {
    btn.addEventListener('click', (e) => {
        if (e.target.closest('#modal-callback')) closeCallbackModal();
        if (e.target.closest('#modal-test-callback')) closeTestCallbackModal();
    });
});

// Chiudi modal cliccando fuori
window.addEventListener('click', (e) => {
    if (e.target === modalCallback) closeCallbackModal();
    if (e.target === modalTestCallback) closeTestCallbackModal();
});

// ==================== UTILITY FUNCTIONS ====================

function formatTime(timestamp) {
    const date = new Date(timestamp);
    const hours = String(date.getHours()).padStart(2, '0');
    const minutes = String(date.getMinutes()).padStart(2, '0');
    return `${hours}:${minutes}`;
}

function updateTime() {
    const now = new Date();
    const hours = String(now.getHours()).padStart(2, '0');
    const minutes = String(now.getMinutes()).padStart(2, '0');
    timeDisplay.textContent = `${hours}:${minutes}`;
}

function showNotification(message, type = 'info') {
    // Notifica semplice (migliorare con toast)
    console.log(`[${type.toUpperCase()}] ${message}`);
    // Opzionale: mostrare una notifica del browser
    if ('Notification' in window && Notification.permission === 'granted') {
        new Notification('Centro Anxur', { body: message });
    }
}

function checkServerStatus() {
    fetch(`${API_BASE_URL}/health`)
        .then(r => r.json())
        .then(() => {
            statusBadge.textContent = '● Online';
            statusBadge.className = 'badge badge-online';
        })
        .catch(() => {
            statusBadge.textContent = '● Offline';
            statusBadge.className = 'badge badge-offline';
        });
}

// ==================== INITIALIZATION ====================

document.addEventListener('DOMContentLoaded', () => {
    console.log(`[INFO] Dashboard initialized`);
    console.log(`[INFO] API URL: ${API_BASE_URL}`);

    // Carica dati iniziali
    loadCallbacks();
    loadPrenotazioni();
    checkServerStatus();
    updateTime();

    // Aggiorna ogni 30 secondi
    setInterval(() => {
        loadCallbacks();
        updateTime();
        checkServerStatus();
    }, 30000);

    // Richiedi permesso notifiche
    if ('Notification' in window && Notification.permission === 'default') {
        Notification.requestPermission();
    }

    // Chiedi API URL se non configurato
    const savedUrl = localStorage.getItem('API_BASE_URL');
    if (!savedUrl) {
        const url = prompt('Inserisci URL backend (es: https://tuoapp.herokuapp.com)', 'http://localhost:5000');
        if (url) localStorage.setItem('API_BASE_URL', url);
    }
});
