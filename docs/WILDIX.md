# 🎙️ Integrazione Wildix - Voicebot Setup

Guida per integrare il voicebot AI Wildix con il backend.

---

## 📋 Prerequisiti

✅ Accesso completo a Wildix PBX (sei Admin)
✅ Backend deployato su Heroku (URL disponibile)
✅ Google Sheets configurato
✅ Database pronto

---

## 🎯 Architettura Flusso

```
Client chiama VoIP
        ↓
    Wildix PBX
        ↓
Voicebot IVR (Wildix AI)
        ↓
    Raccoglie dati:
    - Nome
    - Cognome
    - Telefono
    - Tipo analisi
    - Orario preferito
        ↓
   Webhook POST
        ↓
Backend Node.js
(https://prenotazioni-anxur.herokuapp.com/webhook/wildix)
        ↓
    Database + Google Sheets
```

---

## ⚙️ STEP 1: Setup Wildix IVR

### 1a. Accedi a Wildix Management Console

1. Vai su: `https://your-wildix-server.com/admin`
2. Login con credenziali admin
3. Vai a **Call Handling** → **IVR**

### 1b. Crea nuovo IVR (o modifica quello esistente)

1. Clicca **"New IVR"** (o modifica IVR esistente)
2. Nome: `Centro Anxur - Voicebot`
3. Abilita: **AI Assistant** (se disponibile su tua versione Wildix)
4. Language: **Italian**
5. Voice: **Scegli una voce italiana naturale**

### 1c. Configura Main Prompt (Saluto)

**Text-to-Speech (TTS):**
```
Buongiorno, benvenuto al Centro Analisi Anxur di Terracina.
Desideri prenotare un'analisi, richiedere informazioni, o hai altre esigenze?
```

**Advanced Settings:**
- Enable STT (Speech-to-Text): ✓ Enabled
- Language: Italian
- Timeout silenzio: 5 secondi
- Max retry: 2 volte

### 1d. Configura Intenzioni (Intents)

Crea i seguenti intent:

#### Intent 1: PRENOTAZIONE
**Trigger words:**
- "prenotare"
- "voglio una prenotazione"
- "vorrei un appuntamento"
- "mi serve un'analisi"

**Action:**
- Voice: "Perfetto! Facciamo la prenotazione insieme."
- Vai a: **Raccolta Dati Prenotazione** (prossimo step)

#### Intent 2: INFORMAZIONI_ORARI
**Trigger words:**
- "orari"
- "siete aperti"
- "quando siete aperti"
- "che orari avete"

**Action:**
- Voice: "Siamo aperti dal lunedì al sabato dalle 7:30 alle 18:00. Posso aiutarti con una prenotazione?"

#### Intent 3: RITIRO_RISULTATI
**Trigger words:**
- "risultati"
- "analisi pronta"
- "voglio ritirare"

**Action:**
- Voice: "Ora connetto un operatore che ti aiuterà con i risultati."
- Routing: **Transfer to Operator** (vedi sotto)

#### Intent 4: FALLBACK (Non capisce)
**Action:**
- Voice: "Scusa, non ho capito. Vuoi prenotare un'analisi?"
- Retry: **Main Prompt**

---

## 📝 STEP 2: Raccolta Dati Prenotazione

Crea una sequenza di domande nel voicebot:

### Domanda 1: Nome

```
Voice: "Qual è il tuo nome?"
Variable: cliente_nome
STT Enabled: ✓
Timeout: 5 sec
```

### Domanda 2: Cognome

```
Voice: "E il tuo cognome?"
Variable: cliente_cognome
STT Enabled: ✓
Timeout: 5 sec
```

### Domanda 3: Telefono

```
Voice: "Qual è il tuo numero di telefono?"
Variable: cliente_telefono
Input Type: Phone Number (opzionale, accetta 0-9)
STT Enabled: ✓
```

### Domanda 4: Tipo Analisi

```
Voice: "Che tipo di analisi desideri? 
Puoi dire: ematologia, biochmica, sierologia, immunologia, coagulazione"

Variable: tipo_analisi
Options (DTMF o Speech):
- "ematologia"
- "biochmica"
- "sierologia"
- "immunologia"
- "coagulazione"
```

### Domanda 5: Orario Preferito

```
Voice: "Preferisci mattina, pomeriggio, o ti è indifferente?"

Variable: orario_preferito
Options:
- "mattina" → 1
- "pomeriggio" → 2
- "qualsiasi" → 3
```

---

## 🔌 STEP 3: Configura Webhook POST

Dopo raccolta dati, il voicebot deve inviare un POST al backend.

### 3a. URL Webhook

**Endpoint:** `https://prenotazioni-anxur.herokuapp.com/webhook/wildix`

**Metodo:** POST
**Content-Type:** application/json

### 3b. JSON Payload

Il voicebot dovrà inviare:

```json
{
  "event_type": "callback_requested",
  "cliente_nome": "Mario",
  "cliente_cognome": "Rossi",
  "cliente_telefono": "+39 333 1234567",
  "tipo_analisi": "Ematologia",
  "orario_preferito": "mattina",
  "timestamp": "2024-01-15T14:30:00"
}
```

### 3c. Come Configurare in Wildix

Nei **Workflow** del voicebot:

1. Dopo "orario_preferito", aggiungi **"HTTP Request"** o **"Webhook"**
2. URL: `https://prenotazioni-anxur.herokuapp.com/webhook/wildix`
3. Metodo: **POST**
4. Headers:
   ```
   Content-Type: application/json
   Authorization: Bearer YOUR_WEBHOOK_SECRET
   ```
5. Body (template):
   ```json
   {
     "event_type": "callback_requested",
     "cliente_nome": "${cliente_nome}",
     "cliente_cognome": "${cliente_cognome}",
     "cliente_telefono": "${cliente_telefono}",
     "tipo_analisi": "${tipo_analisi}",
     "orario_preferito": "${orario_preferito}"
   }
   ```

### 3d. Risposta Attesa

Backend risponderà con:

```json
{
  "success": true,
  "message": "Callback creato con successo"
}
```

---

## 📞 STEP 4: Routing a Operatrici

Se tutte le operatrici sono libere, connetti il cliente direttamente:

### 4a. Verifica Operatrici Disponibili (API)

Prima di routing, il voicebot può fare una call al backend per verificare:

```
GET https://prenotazioni-anxur.herokuapp.com/api/callbacks
Response: { "count": num_pending }
```

Se `count < 3`, trasferisci direttamente a operatrice.
Se `count >= 3`, chiedi se vuole attesa o richiamata.

### 4b. Transfer a Operatrice

Configura **Ring Group** in Wildix:

1. Vai a **Call Handling** → **Ring Groups**
2. Nome: `Prenotazioni`
3. Aggiungi 5 operatrici (agent 1-5)
4. Ring Strategy: **Sequential** (chiama prima la libera)

Nel voicebot, dopo raccolta dati:

```
Action: Transfer Call
Destination: Ring Group "Prenotazioni"
On no answer: Webhook → Backend (callback_requested)
On busy: Webhook → Backend (callback_requested)
```

### 4c. Voice Prompt Prima di Transfer

```
Voice: "Perfetto! Sto per connetterti con un'operatrice. 
Grazie per la pazienza."
Wait: 2 seconds
Transfer: Ring Group "Prenotazioni"
```

---

## ⏰ STEP 5: Gestione Ore di Chiusura

Configura una rotta diversa fuori orario (7:30-18:00):

### 5a. Time-Based Routing

1. **Vai a:** Call Handling → Routes
2. **Crea rotta nuova:** `Centro Anxur - Fuori Orario`
3. **Condizione:** Time Window = Fuori orario (18:00-7:30)
4. **Azione:** Vai a IVR "Fuori Orario"

### 5b. IVR Fuori Orario

Crea un IVR semplice:

```
Voice: "Il Centro è attualmente chiuso. 
Siamo aperti da lunedì a sabato dalle 7:30 alle 18:00.
Vuoi lasciarmi i tuoi dati per una richiamata domani mattina?"

Options:
- "sì" → Raccolta dati + Webhook (evento: after_hours_callback)
- "no" → Arrivederci
```

---

## 🧪 STEP 6: Test

### Test 1: Test Locale (Dev)

Se stai testando con Wildix locale:

1. Modifica `/webhook/wildix` nel backend per loggare richieste
2. Fai una chiamata di test
3. Controlla logs: `heroku logs --tail`

### Test 2: Test in Produzione

1. Assicurati che Wildix possa raggiungere Heroku (HTTPS, firewall)
2. Fai una vera chiamata
3. Controlla che il callback appaia nel dashboard

### Test 3: Verifica Workflow

```
1. Chiama numero Wildix
2. Voicebot: "Buongiorno, desideri..."
3. Tu: "Voglio prenotare"
4. Voicebot: "Perfetto! Nome?"
5. Tu: "Mario"
6. ... (continua raccolta dati)
7. Voicebot: "Grazie! Ti richiameremo presto"
8. Dashboard: Vedi nuovo callback in lista
```

---

## 🛠️ Troubleshooting Wildix

### Voicebot non risponde
- Controlla che IVR sia **enabled**
- Verifica STT sia attivo
- Leggi logs Wildix (Admin → Logs)

### Webhook non arriva
- Controlla URL sia corretto (HTTPS, non HTTP)
- Verifica firewall non blocchi Heroku
- Testa con `curl`:
  ```bash
  curl -X POST https://prenotazioni-anxur.herokuapp.com/webhook/wildix \
    -H "Content-Type: application/json" \
    -d '{"event_type":"callback_requested","cliente_nome":"Test"}'
  ```

### Operatrice non riceve transfer
- Verifica Ring Group configurato
- Controlla che l'interno sia online
- Testa direttamente transfer senza voicebot

### Cliente rimane in attesa infinita
- Imposta **timeout** su transfer (es: 30 sec)
- Fallback: Webhook → Callback richiesta

---

## 📊 Monitoraggio

Controlla regolarmente:

1. **Dashboard:** `https://USERNAME.github.io/prenotazioni/frontend/`
   - Callback in sospeso
   - Prenotazioni odierne

2. **Wildix Logs:** Admin → Logs
   - IVR activity
   - Transfer calls

3. **Backend Logs:** `heroku logs --tail`
   - API errors
   - Webhook success/fail

---

## 🎉 Prossimo

Una volta testato, puoi:
- ✅ Disattivare old IVR
- ✅ Mettere voicebot in produzione
- ✅ Comunicare il numero alle operatrici
- ✅ Monitora KPI (callback conversion, resposta time, etc.)

---

## 📞 Supporto

Se hai problemi:
1. Controlla i logs (Wildix + Backend)
2. Test con un numero di test
3. Contatta Wildix support se è problema PBX
4. Contatta me per problemi backend
