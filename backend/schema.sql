-- Centro Analisi Anxur - Database Schema
-- PostgreSQL

-- ==================== TABELLE ====================

-- Tabella: operatrici
CREATE TABLE IF NOT EXISTS operatrici (
    id SERIAL PRIMARY KEY,
    wildix_agent_id VARCHAR(50) UNIQUE NOT NULL,
    nome VARCHAR(100) NOT NULL,
    numero_interno VARCHAR(10),
    email VARCHAR(100),
    turno_inizio TIME,
    turno_fine TIME,
    attivo BOOLEAN DEFAULT TRUE,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: prenotazioni
CREATE TABLE IF NOT EXISTS prenotazioni (
    id SERIAL PRIMARY KEY,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_cognome VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    cliente_email VARCHAR(100),
    tipo_analisi VARCHAR(150) NOT NULL,
    data_prenotazione DATE NOT NULL,
    ora_prenotazione TIME NOT NULL,
    stato VARCHAR(50) DEFAULT 'CONFERMATA',
    note_operatrice TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabella: callback_richieste
CREATE TABLE IF NOT EXISTS callback_richieste (
    id SERIAL PRIMARY KEY,
    cliente_nome VARCHAR(100) NOT NULL,
    cliente_cognome VARCHAR(100) NOT NULL,
    cliente_telefono VARCHAR(20) NOT NULL,
    tipo_analisi VARCHAR(150),
    orario_preferito VARCHAR(50) DEFAULT 'qualsiasi',
    motivo_callback VARCHAR(200),
    data_ora_richiesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    data_ora_callback_prevista TIMESTAMP,
    stato VARCHAR(50) DEFAULT 'IN_SOSPESO',
    operatrice_assegnata VARCHAR(50),
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
);

-- Tabella: giorni_festivi
CREATE TABLE IF NOT EXISTS giorni_festivi (
    id SERIAL PRIMARY KEY,
    data DATE UNIQUE NOT NULL,
    motivo VARCHAR(100),
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- Tabella: call_log (opzionale, per audit)
CREATE TABLE IF NOT EXISTS call_log (
    id SERIAL PRIMARY KEY,
    caller_id VARCHAR(20),
    cliente_nome VARCHAR(100),
    cliente_telefono VARCHAR(20),
    tipo_evento VARCHAR(50),
    durata_secondi INT,
    note TEXT,
    created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
);

-- ==================== INDICI ====================

CREATE INDEX IF NOT EXISTS idx_callback_stato ON callback_richieste(stato);
CREATE INDEX IF NOT EXISTS idx_callback_data ON callback_richieste(data_ora_richiesta);
CREATE INDEX IF NOT EXISTS idx_prenotazione_data ON prenotazioni(data_prenotazione);
CREATE INDEX IF NOT EXISTS idx_prenotazione_telefono ON prenotazioni(cliente_telefono);
CREATE INDEX IF NOT EXISTS idx_callback_telefono ON callback_richieste(cliente_telefono);

-- ==================== INSERISCI OPERATRICI ESEMPIO ====================

INSERT INTO operatrici (wildix_agent_id, nome, numero_interno, email, turno_inizio, turno_fine)
VALUES
    ('agent_1', 'Maria Rossi', '101', 'maria@anxur.it', '07:30:00', '18:00:00'),
    ('agent_2', 'Lucia Bianchi', '102', 'lucia@anxur.it', '07:30:00', '18:00:00'),
    ('agent_3', 'Francesca Verdi', '103', 'francesca@anxur.it', '07:30:00', '18:00:00'),
    ('agent_4', 'Giulia Neri', '104', 'giulia@anxur.it', '07:30:00', '18:00:00'),
    ('agent_5', 'Valentina Gallo', '105', 'valentina@anxur.it', '07:30:00', '18:00:00')
ON CONFLICT DO NOTHING;

-- ==================== VIEWS ====================

CREATE OR REPLACE VIEW v_callback_sospesi AS
SELECT
    id,
    cliente_nome,
    cliente_cognome,
    cliente_telefono,
    tipo_analisi,
    orario_preferito,
    data_ora_richiesta,
    EXTRACT(HOUR FROM (NOW() - data_ora_richiesta)) as ore_da_richiesta
FROM callback_richieste
WHERE stato = 'IN_SOSPESO'
ORDER BY data_ora_richiesta ASC;

CREATE OR REPLACE VIEW v_prenotazioni_odierne AS
SELECT
    p.id,
    p.cliente_nome,
    p.cliente_cognome,
    p.tipo_analisi,
    p.ora_prenotazione
FROM prenotazioni p
WHERE p.data_prenotazione = CURRENT_DATE
AND p.stato = 'CONFERMATA'
ORDER BY p.ora_prenotazione ASC;
