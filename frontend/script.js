const API_BASE_URL = 'https://prenotazioni-anxur-demo1-6e8d42198352.herokuapp.com';

console.log('[INFO] Dashboard initialized');
console.log('[INFO] API URL: ' + API_BASE_URL);

// Carica i callback quando la pagina si apre
document.addEventListener('DOMContentLoaded', function() {
    loadCallbacks();
    loadPrenotazioni();
    loadCompletati();
    loadDottori();  // ← AGGIUNGI QUESTA RIGA
    initCalendario();  // ← AGGIUNGI QUESTA RIGA
    updateTime();
    setInterval(updateTime, 1000);
        // Event listeners per i modal
    setupModalListeners();
});

function setupModalListeners() {
    
    const modalNuovoDottore = document.getElementById('modal-nuovo-dottore');
    const addDottoreBtn = document.getElementById('add-dottore-btn');
    const formNuovoDottore = document.getElementById('form-nuovo-dottore');

        if (addDottoreBtn) {
            addDottoreBtn.addEventListener('click', () => {
        if (modalNuovoDottore) modalNuovoDottore.style.display = 'block';
                });
        }

if (formNuovoDottore) {
    formNuovoDottore.addEventListener('submit', submitNuovoDottore);
}
    
    const modalCallback = document.getElementById('modal-callback');
    const modalTest = document.getElementById('modal-test-callback');
    const modalConvert = document.getElementById('modal-convert-callback');
    const testBtn = document.getElementById('test-callback-btn');
    const formTest = document.getElementById('form-test-callback');
    const formCallback = document.getElementById('form-callback');
    const formConvert = document.getElementById('form-convert-callback');

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

    if (formConvert) {
        formConvert.addEventListener('submit', submitCallbackConvert);
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
                        <button class="btn btn-success" onclick="openConvertModal(${callback.id}, '${callback.nome}', '${callback.cognome}')">↔️ Converti a Prenotazione</button>
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

function openConvertModal(callbackId, nome, cognome) {
    const modal = document.getElementById('modal-convert-callback');
    if (!modal) return;

    // Imposta il cliente nel modal
    document.getElementById('convert-cliente-nome').textContent = `${nome} ${cognome}`;
    document.getElementById('form-convert-callback').dataset.callbackId = callbackId;

    // Imposta data minima a oggi
    const today = new Date();
    const minDate = today.toISOString().split('T')[0];
    document.getElementById('convert-data').min = minDate;
    document.getElementById('convert-data').value = minDate;

    // Imposta orario di default a 09:00
    document.getElementById('convert-orario').value = '09:00';

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

async function submitCallbackConvert(e) {
    e.preventDefault();
    const callbackId = document.getElementById('form-convert-callback').dataset.callbackId;
    const data = document.getElementById('convert-data').value;
    const orario = document.getElementById('convert-orario').value;

    if (!data || !orario) {
        alert('❌ Seleziona data e orario');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/callbacks/${callbackId}/to-prenotazione`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                data_prenotazione: data,
                orario_prenotazione: orario
            })
        });

        if (response.ok) {
            const result = await response.json();
            console.log('[SUCCESS] ✅ Callback convertito in prenotazione');
            document.getElementById('modal-convert-callback').style.display = 'none';
            document.getElementById('form-convert-callback').reset();
            loadCallbacks();
            loadPrenotazioni();
            alert('✅ Callback convertito in prenotazione con successo!');
        } else {
            const error = await response.json();
            alert('❌ Errore: ' + (error.error || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
        alert('❌ Errore nel convertire il callback');
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

// ====== CALENDARIO ======
let currentDate = new Date();

function initCalendario() {
    renderCalendario();
    loadCalendarioData();
}

function renderCalendario() {
    const anno = currentDate.getFullYear();
    const mese = currentDate.getMonth();
    
    // Aggiorna titolo
    const mesi = ['Gennaio', 'Febbraio', 'Marzo', 'Aprile', 'Maggio', 'Giugno',
                  'Luglio', 'Agosto', 'Settembre', 'Ottobre', 'Novembre', 'Dicembre'];
    document.getElementById('mese-anno').textContent = `${mesi[mese]} ${anno}`;
    
    // Intestazioni dei giorni della settimana
    const giorni_settimana = ['Lun', 'Mar', 'Mer', 'Gio', 'Ven', 'Sab', 'Dom'];
    const calendario = document.getElementById('calendario');
    calendario.innerHTML = '';
    
    // Aggiungi intestazioni
    giorni_settimana.forEach(g => {
        const header = document.createElement('div');
        header.textContent = g;
        header.style.cssText = 'font-weight: bold; text-align: center; padding: 10px; background: #e9ecef; border-radius: 5px;';
        calendario.appendChild(header);
    });
    
    // Primo giorno del mese
    const primo = new Date(anno, mese, 1);
    let primoGiornoSettimana = primo.getDay() - 1; // 0=Lunedì
    if (primoGiornoSettimana === -1) primoGiornoSettimana = 6; // Domenica
    
    // Numero di giorni nel mese
    const numGiorni = new Date(anno, mese + 1, 0).getDate();
    
    // Aggiungi giorni vuoti all'inizio
    for (let i = 0; i < primoGiornoSettimana; i++) {
        const vuoto = document.createElement('div');
        calendario.appendChild(vuoto);
    }
    
    // Aggiungi giorni del mese
    for (let g = 1; g <= numGiorni; g++) {
        const giorno = document.createElement('div');
        giorno.id = `giorno-${g}`;
        giorno.textContent = g;
        giorno.style.cssText = `
            padding: 15px;
            border: 1px solid #ddd;
            border-radius: 5px;
            text-align: center;
            cursor: pointer;
            background: white;
            min-height: 60px;
            display: flex;
            flex-direction: column;
            justify-content: center;
            align-items: center;
            transition: background 0.3s;
        `;
        giorno.onclick = () => mostraDettagliGiorno(g);
        calendario.appendChild(giorno);
    }
}

function loadCalendarioData() {
    const anno = currentDate.getFullYear();
    const mese = currentDate.getMonth() + 1;
    
    fetch(`${API_BASE_URL}/api/prenotazioni/mese?anno=${anno}&mese=${mese}`)
        .then(r => r.json())
        .then(res => {
            if (res.success) {
                // Raggruppa prenotazioni per data
                const prenotazioniPerGiorno = {};
                res.data.forEach(p => {
                    const data = new Date(p.data_prenotazione).getDate();
                    if (!prenotazioniPerGiorno[data]) {
                        prenotazioniPerGiorno[data] = [];
                    }
                    prenotazioniPerGiorno[data].push(p);
                });
                
                // Colora i giorni
                for (const [giorno, prenotazioni] of Object.entries(prenotazioniPerGiorno)) {
                    const elem = document.getElementById(`giorno-${giorno}`);
                    if (elem) {
                        elem.style.background = '#ffcccc'; // Rosso chiaro
                        elem.style.fontWeight = 'bold';
                        
                        // Mostra conteggio prenotazioni
                        elem.innerHTML = `<strong>${giorno}</strong><br><small>${prenotazioni.length} prenotazioni</small>`;
                    }
                }
                
                // Salva i dati globali
                window.prenotazioniMese = prenotazioniPerGiorno;
            }
        })
        .catch(e => console.error('Errore calendario:', e));
}

function mostraDettagliGiorno(giorno) {
    const anno = currentDate.getFullYear();
    const mese = String(currentDate.getMonth() + 1).padStart(2, '0');
    const giornoStr = String(giorno).padStart(2, '0');
    const dataCompleta = `${anno}-${mese}-${giornoStr}`;
    
    const dettagli = document.getElementById('dettagli-giorno');
    
    if (!window.prenotazioniMese || !window.prenotazioniMese[giorno]) {
        dettagli.innerHTML = `<p><strong>${dataCompleta}</strong> - Nessuna prenotazione (Giorno libero ✅)</p>`;
        return;
    }
    
    const prenotazioni = window.prenotazioniMese[giorno];
    let html = `<h4>${dataCompleta} - ${prenotazioni.length} prenotazione/i</h4><table style="width: 100%; border-collapse: collapse;">`;
    html += '<tr style="background: #e9ecef;"><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Orario</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Cliente</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Analisi</th><th style="padding: 8px; border: 1px solid #ddd; text-align: left;">Medico</th></tr>';
    
    prenotazioni.forEach(p => {
        html += `<tr>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.orario_prenotazione}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.cliente_nome} ${p.cliente_cognome}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.tipo_analisi}</td>
            <td style="padding: 8px; border: 1px solid #ddd;">${p.operatrice_assegnata || '-'}</td>
        </tr>`;
    });
    
    html += '</table>';
    dettagli.innerHTML = html;
}

function prevMese() {
    currentDate.setMonth(currentDate.getMonth() - 1);
    renderCalendario();
    loadCalendarioData();
}

function nextMese() {
    currentDate.setMonth(currentDate.getMonth() + 1);
    renderCalendario();
    loadCalendarioData();
}

// ====== DOTTORI ======

async function loadDottori() {
    try {
        const response = await fetch(`${API_BASE_URL}/api/dottori`);
        const data = await response.json();

        const dottoriList = document.getElementById('dottori-list');
        if (!dottoriList) {
            console.error('❌ Elemento dottori-list non trovato');
            return;
        }

        if (data.success && data.data && data.data.length > 0) {
            dottoriList.innerHTML = data.data.map(dottore => `
                <div class="callback-item">
                    <strong>${dottore.nome} ${dottore.cognome}</strong><br>
                    Specializzazione: ${dottore.specializzazione}<br>
                    ${dottore.email ? `Email: <a href="mailto:${dottore.email}" style="text-decoration: none; color: #0066cc;">${dottore.email}</a><br>` : ''}
                    ${dottore.telefono ? `Telefono: <a href="tel:${dottore.telefono}" style="text-decoration: none; color: #0066cc; font-weight: bold;">📞 ${dottore.telefono}</a><br>` : ''}
                    <small>ID: ${dottore.id}</small>
                    <div style="margin-top: 10px;">
                        <button class="btn btn-danger" onclick="deleteDottore(${dottore.id}, '${dottore.nome}', '${dottore.cognome}')">🗑️ Rimuovi</button>
                    </div>
                </div>
            `).join('');
        } else {
            dottoriList.innerHTML = '<p>Nessun dottore registrato. Aggiungine uno!</p>';
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore caricamento dottori:', error.message);
        const dottoriList = document.getElementById('dottori-list');
        if (dottoriList) {
            dottoriList.innerHTML = '<p style="color: red;">❌ Errore nel caricamento della lista dottori</p>';
        }
    }
}

async function submitNuovoDottore(e) {
    e.preventDefault();

    const nome = document.getElementById('dottore-nome').value;
    const cognome = document.getElementById('dottore-cognome').value;
    const specializzazione = document.getElementById('dottore-specializzazione').value;
    const email = document.getElementById('dottore-email').value;
    const telefono = document.getElementById('dottore-telefono').value;

    if (!nome || !cognome || !specializzazione) {
        alert('❌ Compila tutti i campi obbligatori');
        return;
    }

    try {
        const response = await fetch(`${API_BASE_URL}/api/dottori`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                nome,
                cognome,
                specializzazione,
                email: email || null,
                telefono: telefono || null
            })
        });

        const data = await response.json();

        if (data.success) {
            console.log('[SUCCESS] ✅ Dottore creato');
            document.getElementById('modal-nuovo-dottore').style.display = 'none';
            document.getElementById('form-nuovo-dottore').reset();
            alert('✅ Dottore aggiunto con successo!');
            loadDottori();  // Ricarica lista
        } else {
            alert('❌ Errore: ' + (data.error || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
        alert('❌ Errore nel salvare il dottore');
    }
}

async function deleteDottore(dottoreId, nome, cognome) {
    if (!confirm(`Sei sicuro di voler rimuovere ${nome} ${cognome}?`)) return;

    try {
        const response = await fetch(`${API_BASE_URL}/api/dottori/${dottoreId}`, {
            method: 'DELETE'
        });

        const data = await response.json();
        if (data.success) {
            console.log('[SUCCESS] ✅ Dottore rimosso');
            alert('✅ Dottore rimosso');
            loadDottori();
        } else {
            alert('❌ Errore: ' + (data.error || 'Errore sconosciuto'));
        }
    } catch (error) {
        console.error('[ERROR] ❌ Errore:', error.message);
        alert('❌ Errore nel rimuovere il dottore');
    }
}