# 🔌 API Documentation

Documentazione completa degli endpoint disponibili.

**Base URL:** `https://prenotazioni-anxur.herokuapp.com`

---

## 📋 Endpoints

### Health Check

#### GET /health

Verifica se il server è online.

**Request:**
```bash
curl https://prenotazioni-anxur.herokuapp.com/health
```

**Response (200):**
```json
{
  "status": "ok",
  "timestamp": "2024-01-15T14:30:45.123456"
}
```

---

## 📞 Callback Endpoints

### GET /api/callbacks

**Descrizione:** Recupera lista di tutti i callback in sospeso.

**Request:**
```bash
curl https://prenotazioni-anxur.herokuapp.com/api/callbacks
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cliente_nome": "Mario",
      "cliente_cognome": "Rossi",
      "cliente_telefono": "+39 333 1234567",
      "tipo_analisi": "Ematologia",
      "orario_preferito": "mattina",
      "data_ora_richiesta": "2024-01-15T14:25:00",
      "stato": "IN_SOSPESO"
    },
    {
      "id": 2,
      "cliente_nome": "Lucia",
      "cliente_cognome": "Bianchi",
      "cliente_telefono": "+39 333 7654321",
      "tipo_analisi": "Biochmica",
      "orario_preferito": "pomeriggio",
      "data_ora_richiesta": "2024-01-15T14:30:00",
      "stato": "IN_SOSPESO"
    }
  ],
  "count": 2
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Database connection error"
}
```

---

### POST /api/callbacks

**Descrizione:** Crea un nuovo callback (chiamato dal voicebot Wildix).

**Request:**
```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/api/callbacks \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mario",
    "cognome": "Rossi",
    "telefono": "+39 333 1234567",
    "tipo_analisi": "Ematologia",
    "orario_preferito": "mattina"
  }'
```

**Request Body:**
| Field | Type | Required | Descrizione |
|-------|------|----------|-------------|
| nome | string | ✓ | Nome cliente |
| cognome | string | ✓ | Cognome cliente |
| telefono | string | ✓ | Numero telefono |
| tipo_analisi | string | ✓ | Tipo di analisi richiesta |
| orario_preferito | string | ✗ | "mattina", "pomeriggio", "qualsiasi" |

**Response (201):**
```json
{
  "success": true,
  "callback_id": 3,
  "message": "Callback creato con successo"
}
```

**Response (400):**
```json
{
  "success": false,
  "error": "Campi obbligatori: nome, cognome, telefono, tipo_analisi"
}
```

---

### GET /api/callbacks/:id

**Descrizione:** Recupera dettagli di un callback specifico.

**Request:**
```bash
curl https://prenotazioni-anxur.herokuapp.com/api/callbacks/1
```

**Response (200):**
```json
{
  "success": true,
  "data": {
    "id": 1,
    "cliente_nome": "Mario",
    "cliente_cognome": "Rossi",
    "cliente_telefono": "+39 333 1234567",
    "tipo_analisi": "Ematologia",
    "orario_preferito": "mattina",
    "data_ora_richiesta": "2024-01-15T14:25:00",
    "stato": "IN_SOSPESO",
    "operatrice_assegnata": null,
    "note": null
  }
}
```

**Response (404):**
```json
{
  "success": false,
  "error": "Callback non trovato"
}
```

---

### POST /api/callbacks/:id/complete

**Descrizione:** Segna un callback come completato (operatrice ha richiamato il cliente).

**Request:**
```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/api/callbacks/1/complete \
  -H "Content-Type: application/json" \
  -d '{
    "note": "Prenotato per lunedì 9:30 - Ematologia"
  }'
```

**Request Body:**
| Field | Type | Required | Descrizione |
|-------|------|----------|-------------|
| note | string | ✗ | Note della richiamata |

**Response (200):**
```json
{
  "success": true,
  "message": "Callback segnato come completato"
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Database error"
}
```

---

### DELETE /api/callbacks/:id

**Descrizione:** Cancella un callback (completato o non più necessario).

**Request:**
```bash
curl -X DELETE https://prenotazioni-anxur.herokuapp.com/api/callbacks/1
```

**Response (200):**
```json
{
  "success": true,
  "message": "Callback cancellato"
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Database error"
}
```

---

## 📅 Prenotazioni Endpoints

### GET /api/prenotazioni

**Descrizione:** Recupera prenotazioni di oggi.

**Request:**
```bash
curl https://prenotazioni-anxur.herokuapp.com/api/prenotazioni
```

**Response (200):**
```json
{
  "success": true,
  "data": [
    {
      "id": 1,
      "cliente_nome": "Mario",
      "cliente_cognome": "Rossi",
      "cliente_telefono": "+39 333 1234567",
      "tipo_analisi": "Ematologia",
      "data_prenotazione": "2024-01-15",
      "ora_prenotazione": "09:30",
      "stato": "CONFERMATA"
    }
  ]
}
```

---

### POST /api/prenotazioni

**Descrizione:** Crea una nuova prenotazione.

**Request:**
```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/api/prenotazioni \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Mario",
    "cognome": "Rossi",
    "telefono": "+39 333 1234567",
    "email": "mario.rossi@email.com",
    "tipo_analisi": "Ematologia",
    "data": "2024-01-16",
    "ora": "09:30"
  }'
```

**Request Body:**
| Field | Type | Required | Descrizione |
|-------|------|----------|-------------|
| nome | string | ✓ | Nome cliente |
| cognome | string | ✓ | Cognome cliente |
| telefono | string | ✓ | Numero telefono |
| email | string | ✗ | Email cliente |
| tipo_analisi | string | ✓ | Tipo analisi |
| data | date | ✓ | Data prenotazione (YYYY-MM-DD) |
| ora | time | ✓ | Ora prenotazione (HH:MM) |

**Response (201):**
```json
{
  "success": true,
  "prenotazione_id": 5,
  "message": "Prenotazione creata"
}
```

---

## 🔌 Webhook Endpoint

### POST /webhook/wildix

**Descrizione:** Riceve dati dal voicebot Wildix. Questo endpoint è chiamato dal PBX quando il voicebot raccoglie i dati dal cliente.

**Request (from Wildix):**
```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/webhook/wildix \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer YOUR_WEBHOOK_SECRET" \
  -d '{
    "event_type": "callback_requested",
    "cliente_nome": "Mario",
    "cliente_cognome": "Rossi",
    "cliente_telefono": "+39 333 1234567",
    "tipo_analisi": "Ematologia",
    "orario_preferito": "mattina",
    "timestamp": "2024-01-15T14:30:00"
  }'
```

**Request Body:**
| Field | Type | Descrizione |
|-------|------|-------------|
| event_type | string | Tipo evento: "callback_requested", "call_ended" |
| cliente_nome | string | Nome cliente |
| cliente_cognome | string | Cognome cliente |
| cliente_telefono | string | Numero telefono |
| tipo_analisi | string | Tipo analisi richiesta |
| orario_preferito | string | Preferenza oraria |
| timestamp | datetime | Momento della richiesta |

**Response (200):**
```json
{
  "success": true
}
```

**Response (500):**
```json
{
  "success": false,
  "error": "Webhook processing error"
}
```

---

## 🔐 Autenticazione

Attualmente gli endpoint **non richiedono autenticazione** (demo).

Per produzione, aggiungi:
- API Key header
- JWT token
- OAuth2

---

## 📊 Codici Risposta HTTP

| Codice | Significato | Causa |
|--------|-------------|-------|
| 200 | OK | Richiesta riuscita |
| 201 | Created | Risorsa creata |
| 400 | Bad Request | Parametri non validi |
| 404 | Not Found | Risorsa non trovata |
| 500 | Server Error | Errore interno server |

---

## 🧪 Test con curl

### Test 1: Health Check

```bash
curl https://prenotazioni-anxur.herokuapp.com/health
```

### Test 2: Crea callback

```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/api/callbacks \
  -H "Content-Type: application/json" \
  -d '{
    "nome": "Test",
    "cognome": "User",
    "telefono": "+39 333 9999999",
    "tipo_analisi": "Biochmica"
  }'
```

### Test 3: Lista callback

```bash
curl https://prenotazioni-anxur.herokuapp.com/api/callbacks
```

### Test 4: Completa callback

```bash
curl -X POST https://prenotazioni-anxur.herokuapp.com/api/callbacks/1/complete \
  -H "Content-Type: application/json" \
  -d '{"note": "Confermato"}'
```

---

## 📝 Rate Limiting

Nessun rate limiting configurato (demo).

Per produzione, implementare:
- Max 100 requests/minuto per IP
- Max 1000 requests/giorno per utente
- Queue per webhook

---

## 🔄 CORS

CORS **abilitato** per tutti gli origin (demo).

Per produzione, restringere a:
```python
CORS(app, resources={
    r"/api/*": {
        "origins": ["https://example.com"],
        "methods": ["GET", "POST", "DELETE"]
    }
})
```

---

## 📚 Librerie Utilizzate

- **Flask** - Web framework
- **psycopg2** - PostgreSQL driver
- **gspread** - Google Sheets API
- **google-auth** - Google authentication

---

## 🛠️ Sviluppo

Per aggiungere nuovi endpoint:

1. Aggiungi rotta in `app.py`:
   ```python
   @app.route('/api/new-endpoint', methods=['GET', 'POST'])
   def new_endpoint():
       return jsonify({'success': True}), 200
   ```

2. Testa localmente
3. Commit e push su GitHub
4. Heroku auto-deploya

---

## 📞 Supporto

Per problemi API:
1. Controlla logs: `heroku logs --tail`
2. Verifica parametri richiesta
3. Testa endpoint con curl
4. Contatta sviluppatore

---

**Last Updated:** Gennaio 2024
**API Version:** 1.0.0
