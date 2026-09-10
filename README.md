# 📞 Centro Analisi Anxur - Voicebot Wildix

Demo funzionante di un voicebot AI per gestione prenotazioni integrato con Wildix PBX.

---

## 🎯 Cosa Fa

- ✅ **Voicebot AI:** Risponde alle chiamate, raccoglie dati cliente
- ✅ **Gestione Callback:** Google Sheets integrato per richieste di richiamata
- ✅ **Dashboard Operatrici:** Web app semplice per gestire callback
- ✅ **Google Calendar:** Sincronizzazione slot disponibili
- ✅ **Prenotazioni:** Database per le prenotazioni confermate

---

## 🚀 Quick Start

### 1. Clona il repo

```bash
git clone https://github.com/YOUR_USERNAME/prenotazioni.git
cd prenotazioni
```

### 2. Leggi la Guida Setup

```bash
cat docs/SETUP.md
```

### 3. Segui i step della guida

---

## 📁 Struttura Progetto

```
prenotazioni/
├── backend/
│   ├── app.py              # Flask API principale
│   ├── schema.sql          # Database schema
│   ├── requirements.txt     # Dipendenze Python
│   ├── Procfile            # Per Heroku
│   └── .env.example        # Configurazione
├── frontend/
│   ├── index.html          # Dashboard HTML
│   ├── style.css           # Stili
│   └── script.js           # Logica JavaScript
└── docs/
    ├── SETUP.md            # Guida setup step-by-step
    ├── WILDIX.md           # Integrazione Wildix
    └── API.md              # Documentazione API
```

---

## 🏗️ Architettura

```
┌─────────────────────────────────────────────┐
│          CLIENT (VoIP Call)                  │
└────────────────┬────────────────────────────┘
                 │
     ┌───────────▼────────────┐
     │   Wildix PBX           │
     │ (Voicebot AI Nativo)   │
     └───────────┬────────────┘
                 │
    ┌────────────▼────────────────┐
    │   Backend Flask (Heroku)    │
    │  - API Endpoints            │
    │  - Database Management      │
    │  - Google Integration       │
    └────────┬──────────┬─────────┘
             │          │
    ┌────────▼───┐  ┌───▼─────────┐
    │ PostgreSQL │  │Google Sheets│
    │  Database  │  │   Callback  │
    └────────────┘  │     List    │
                    └─────────────┘
             │
    ┌────────▼─────────────────┐
    │  Frontend React/HTML     │
    │  Dashboard Operatrici    │
    └──────────────────────────┘
```

---

## ⚡ Endpoints API

### Callback

- `GET /api/callbacks` - Lista callback in sospeso
- `POST /api/callbacks` - Crea callback (da voicebot)
- `GET /api/callbacks/<id>` - Dettagli callback
- `POST /api/callbacks/<id>/complete` - Segna come completato
- `DELETE /api/callbacks/<id>` - Cancella callback

### Prenotazioni

- `GET /api/prenotazioni` - Lista prenotazioni odierne
- `POST /api/prenotazioni` - Crea prenotazione

### Webhook

- `POST /webhook/wildix` - Riceve dati da Wildix voicebot

### Health

- `GET /health` - Health check

Vedi `docs/API.md` per dettagli completi.

---

## 🔧 Tecnologie

- **Backend:** Python 3.10+ + Flask
- **Database:** PostgreSQL
- **Frontend:** HTML5 + CSS3 + Vanilla JavaScript
- **Hosting:** Heroku (backend) + GitHub Pages (frontend)
- **Integration:** Google Sheets API, Google Calendar API, Wildix REST API

---

## 📋 Requisiti

- Python 3.10+
- PostgreSQL 12+
- Account Heroku (gratuito)
- Account Google Cloud (gratuito)
- Account Wildix con accesso Admin

---

## 🎬 Getting Started

Leggi **docs/SETUP.md** per:

1. Setup repository GitHub
2. Configurare database PostgreSQL
3. Setup Google APIs (Sheets, Calendar)
4. Deploy backend su Heroku
5. Deploy frontend su GitHub Pages
6. Configurare webhook Wildix

Poi leggi **docs/WILDIX.md** per integrare il voicebot.

---

## 🧪 Testing

### Test Locale

```bash
# 1. Installa dipendenze
cd backend
pip install -r requirements.txt

# 2. Configura .env con database locale
cp .env.example .env
# Modifica variabili database

# 3. Avvia server
python app.py

# 4. Apri dashboard
open frontend/index.html

# 5. Clicca "Test" e crea callback
```

### Test in Produzione

1. Deploy su Heroku (vedi SETUP.md)
2. Configura voicebot Wildix (vedi WILDIX.md)
3. Fai chiamata di test
4. Verifica callback nel dashboard
5. Testa operatrice che segna come completato

---

## 📊 Monitoraggio

### Backend Logs

```bash
heroku logs --tail
```

### Database

```bash
heroku pg:psql

# Dentro psql:
SELECT * FROM callback_richieste;
```

### Frontend Console

Apri browser dev tools (F12) → Console per debug JavaScript.

---

## 🐛 Troubleshooting

- **"Cannot connect to server"** → Verifica URL backend nel localStorage
- **"Google Sheets error"** → Controlla credenziali e permessi
- **"Database error"** → Verifica variabili ambiente in Heroku
- **"Voicebot non raccoglie dati"** → Vedi WILDIX.md → Troubleshooting

---

## 📚 Documentazione

- `docs/SETUP.md` - Guida setup step-by-step
- `docs/WILDIX.md` - Integrazione Wildix voicebot
- `docs/API.md` - Documentazione API endpoints

---

## 🤝 Contributing

Segnala bug o suggedisc miglioramenti via GitHub Issues.

---

## 📄 License

MIT License - vedi LICENSE file

---

## 👤 Author

Claudio Tozzato
- IT Consultant & Systems Integrator
- Wildix Specialist
- Italy

---

## 🎯 Prossimi Step

1. ✅ Setup repository + database
2. ✅ Deploy backend su Heroku
3. ✅ Deploy frontend su GitHub Pages
4. ✅ Configura voicebot Wildix
5. ✅ Test end-to-end
6. ✅ Training operatrici
7. ✅ Go-live production

---

**Last Updated:** Gennaio 2024
**Version:** 1.0.0-beta
**Status:** Demo funzionante pronto per testing
