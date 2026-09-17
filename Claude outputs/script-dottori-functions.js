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
