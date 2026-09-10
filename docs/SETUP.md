# 🚀 Guida Setup - Centro Anxur Voicebot

Questa guida ti aiuta a deployare il progetto passo per passo.

---

## 📋 Prerequisiti

✅ Account GitHub (hai già!)
✅ Account Heroku (gratuito: https://www.heroku.com)
✅ Account Google Cloud (gratuito: https://cloud.google.com)
✅ Terminal/Command Prompt (semplice da usare)

---

## ⚡ STEP 1: Clona il Repository su GitHub

### 1a. Crea un nuovo repo su GitHub

1. Vai su https://github.com/new
2. Nome: **prenotazioni**
3. Descrizione: "Voicebot Wildix - Centro Analisi Anxur"
4. Public (così è visibile)
5. Clicca **"Create Repository"**

### 1b. Clona il repo localmente

```bash
# Apri terminal/PowerShell

# Vai nella cartella dove vuoi il progetto
cd Desktop

# Clona il repo (sostituisci USERNAME con il tuo)
git clone https://github.com/USERNAME/prenotazioni.git

# Entra nella cartella
cd prenotazioni
```

### 1c. Copia i file

Copia tutti i file che ho creato nella cartella `prenotazioni`:
- Cartella `backend/` (app.py, requirements.txt, schema.sql, .env.example, Procfile)
- Cartella `frontend/` (index.html, style.css, script.js)
- Cartella `docs/` (SETUP.md, WILDIX.md, API.md)

Poi su terminal:

```bash
git add .
git commit -m "Initial commit: voicebot demo setup"
git push origin main
```

---

## 🗄️ STEP 2: Setup Database (PostgreSQL)

### Opzione A: Locale (Development)

#### Su Mac/Linux:

```bash
# Installa PostgreSQL
brew install postgresql@15

# Avvia il servizio
brew services start postgresql@15

# Accedi a PostgreSQL
psql postgres

# Dentro psql, crea database:
CREATE DATABASE centro_anxur;
CREATE USER claudio WITH PASSWORD 'your_password_here';
ALTER ROLE claudio SET client_encoding TO 'utf8';
ALTER ROLE claudio SET default_transaction_isolation TO 'read committed';
GRANT ALL PRIVILEGES ON DATABASE centro_anxur TO claudio;
\q

# Carica lo schema
psql -U claudio -d centro_anxur -f backend/schema.sql
```

#### Su Windows:

1. Scarica PostgreSQL: https://www.postgresql.org/download/windows/
2. Installa (ricordati password per "postgres" user)
3. Apri "pgAdmin" (GUI)
4. Crea nuovo database: `centro_anxur`
5. Carica schema tramite SQL query

### Opzione B: Heroku Postgres (Production)

Faremo dopo durante il deploy.

---

## 🔑 STEP 3: Setup Google APIs

### 3a. Crea Google Cloud Project

1. Vai su https://console.cloud.google.com
2. Clicca **"Select a Project"** → **"New Project"**
3. Nome: `Centro Anxur Voicebot`
4. Clicca **"Create"**
5. Aspetta qualche secondo

### 3b. Abilita Google Sheets API

1. Vai su **APIs & Services** → **Library**
2. Cerca **"Google Sheets API"**
3. Clicca → **"Enable"**

### 3c. Crea Service Account

1. Vai su **APIs & Services** → **Credentials**
2. Clicca **"+ Create Credentials"** → **"Service Account"**
3. Nome: `voicebot-backend`
4. Clicca **"Create and Continue"**
5. Clicca **"Continue"** (salta i ruoli per ora)
6. Clicca **"Done"**

### 3d. Genera JSON Key

1. Nella lista Service Accounts, clicca su `voicebot-backend@...`
2. Vai a **Keys** → **"Add Key"** → **"Create new key"**
3. Tipo: **JSON**
4. Clicca **"Create"** → Scarica il file JSON

**IMPORTANTE:** Salva questo file in un posto sicuro!

### 3e. Copia le credenziali

1. Apri il file JSON scaricato
2. Copia **TUTTO il contenuto**
3. Nel file `.env` del backend, incolla in `GOOGLE_SHEETS_CREDENTIALS`

Esempio:
```
GOOGLE_SHEETS_CREDENTIALS={"type":"service_account","project_id":"centro-anxur-..."}
```

### 3f. Crea Google Sheets per callback

1. Vai su https://sheets.google.com
2. Crea nuovo foglio: **"Callback Centro Anxur"**
3. Aggiungi header nella prima riga:
   - A: Data/Ora
   - B: Nome
   - C: Cognome
   - D: Telefono
   - E: Tipo Analisi
   - F: Orario Preferito
   - G: Operatrice
   - H: Stato
   - I: Note

4. Copia l'ID del foglio (da URL):
   ```
   https://docs.google.com/spreadsheets/d/1abc2def3ghi/...
                                        ↑ QUESTO ↑
   ```

5. Nel file `.env`, aggiungi:
   ```
   GOOGLE_SHEETS_ID=1abc2def3ghi
   ```

6. **Condividi il foglio** con l'email del Service Account (vedi nel JSON come `client_email`)
   - Clicca **Share** → Incolla email → **Editor** → **Share**

---

## 🚀 STEP 4: Deploy su Heroku

### 4a. Installa Heroku CLI

**Mac:**
```bash
brew tap heroku/brew && brew install heroku
```

**Windows:**
Scarica: https://devcenter.heroku.com/articles/heroku-cli

**Linux:**
```bash
curl https://cli-assets.heroku.com/install.sh | sh
```

### 4b. Login Heroku

```bash
heroku login
```

Apre il browser → Clicca **"Log in"**

### 4c. Crea app Heroku

```bash
cd backend

# Crea app
heroku create prenotazioni-anxur

# Oppure usa nome diverso se "prenotazioni-anxur" è già preso
heroku create prenotazioni-anxur-tuonome
```

### 4d. Aggiungi PostgreSQL addon

```bash
# Heroku ti da una DB gratuita (limitata ma ok per demo)
heroku addons:create heroku-postgresql:hobby-dev
```

### 4e. Configura Environment Variables

```bash
# Copia tutte le variabili da .env
heroku config:set DB_HOST="..."
heroku config:set DB_USER="..."
heroku config:set DB_PASSWORD="..."
heroku config:set DB_NAME="..."
heroku config:set GOOGLE_SHEETS_CREDENTIALS='{"type":"service_account"...}'
heroku config:set GOOGLE_SHEETS_ID="..."
heroku config:set FLASK_ENV="production"

# Oppure, se hai .env locale:
heroku config:push
```

### 4f. Carica il database schema

```bash
# Heroku ti da l'URL del database
heroku pg:psql

# Dentro psql:
\i schema.sql
\q
```

### 4g. Deploy

```bash
# Nel folder backend
git push heroku main

# Segui i log:
heroku logs --tail
```

✅ Se vedi "Application running on Heroku" → **Deploy completato!**

URL app: `https://prenotazioni-anxur.herokuapp.com` (o il nome che hai scelto)

---

## 🌐 STEP 5: Deploy Frontend (Dashboard)

Il frontend è un semplice HTML/CSS/JS, puoi metterlo:

### Opzione A: GitHub Pages (Consigliato)

```bash
# Nella cartella frontend/
git subtree push --prefix frontend origin gh-pages
```

Accedi a: `https://USERNAME.github.io/prenotazioni/frontend/`

### Opzione B: Heroku (Insieme al backend)

```bash
# Nel backend, crea cartella static/
mkdir static

# Copia frontend/* in backend/static/
cp frontend/* backend/static/

# Modifica app.py per servire static files:
app.static_folder = 'static'
app.static_url_path = '/'

@app.route('/')
def index():
    return send_from_directory('static', 'index.html')
```

---

## ✅ STEP 6: Test

1. Apri dashboard: `https://USERNAME.github.io/prenotazioni/frontend/`
2. Ti chiede URL backend → incolla: `https://prenotazioni-anxur.herokuapp.com`
3. Clicca 🧪 **Test** → Crea un callback di test
4. Vedi il callback nella lista

---

## 🎙️ STEP 7: Configura Wildix (Vedi WILDIX.md)

---

## 🔧 Troubleshooting

### "Cannot connect to server"
- Verifica URL backend nel browser (dev tools)
- Controlla che `FLASK_ENV=production` in Heroku
- Leggi `heroku logs --tail`

### "Google Sheets error"
- Verifica `GOOGLE_SHEETS_ID` nel .env
- Controlla che il foglio sia condiviso con service account email
- Controlla JSON credentials sia valido

### "Database error"
- Verifica variabili DB in Heroku
- Prova `heroku pg:psql` e vedi se riesci ad accedere

---

## 📱 Prossimo: Wildix Integration

Vai a **WILDIX.md** per integrare il voicebot!
