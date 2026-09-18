"""
Centro Analisi Anxur - Voicebot Backend
Flask API per gestione prenotazioni e callback
"""

from flask import Flask, request, jsonify
from flask_cors import CORS
from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import gspread
from google.oauth2.service_account import Credentials
import json
from urllib.parse import urlparse

# Load environment variables
load_dotenv()

# Crea app PRIMA di usarla
app = Flask(__name__)

# Configurazione CORS per permettere richieste da GitHub Pages
cors_config = {
    "origins": [
        "https://tcsistem.github.io",
        "http://localhost:3000",
        "http://localhost:5000"
    ],
    "methods": ["GET", "POST", "PUT", "DELETE", "OPTIONS"],
    "allow_headers": ["Content-Type"],
    "supports_credentials": True
}
CORS(app, resources={r"/api/*": cors_config, r"/health": cors_config})

# Database connection
def get_db_connection():
    db_url = os.getenv('DATABASE_URL')

    if db_url:
        # Parse DATABASE_URL (postgres://user:password@host:port/database)
        parsed = urlparse(db_url)
        conn = psycopg2.connect(
            host=parsed.hostname,
            database=parsed.path.lstrip('/'),
            user=parsed.username,
            password=parsed.password,
            port=parsed.port or 5432
        )
    else:
        # Fallback per sviluppo locale
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT', 5432)
        )
    return conn

# Google Sheets setup
def get_sheets_client():
    creds_dict = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS', '{}'))
    credentials = Credentials.from_service_account_info(
        creds_dict,
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return gspread.authorize(credentials)

# ==================== CALLBACK ENDPOINTS ====================

@app.route('/api/callbacks', methods=['GET'])
def list_callbacks():
    """Lista tutti i callback in sospeso"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, orario_preferito, data_ora_richiesta, stato
            FROM callback_richieste
            WHERE stato = 'IN_SOSPESO'
            ORDER BY data_ora_richiesta ASC
        """)

        callbacks = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': callbacks,
            'count': len(callbacks)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks', methods=['POST'])
def create_callback():
    """Crea un nuovo callback (chiamato dal voicebot Wildix)"""
    try:
        data = request.json

        # Validazione
        required = ['nome', 'cognome', 'telefono', 'tipo_analisi']
        if not all(k in data for k in required):
            return jsonify({
                'success': False,
                'error': 'Campi obbligatori: nome, cognome, telefono, tipo_analisi'
            }), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Insert callback
        cur.execute("""
            INSERT INTO callback_richieste
            (cliente_nome, cliente_cognome, cliente_telefono, tipo_analisi,
             orario_preferito, stato, data_ora_richiesta)
            VALUES (%s, %s, %s, %s, %s, 'IN_SOSPESO', NOW())
            RETURNING id
        """, (
            data['nome'],
            data['cognome'],
            data['telefono'],
            data['tipo_analisi'],
            data.get('orario_preferito', 'qualsiasi')
        ))

        callback_id = cur.fetchone()['id']
        conn.commit()

        # Aggiungi a Google Sheets (callback list)
        try:
            gc = get_sheets_client()
            sheet = gc.open_by_key(os.getenv('GOOGLE_SHEETS_ID')).sheet1

            sheet.append_row([
                datetime.now().strftime('%Y-%m-%d %H:%M'),
                data['nome'],
                data['cognome'],
                data['telefono'],
                data['tipo_analisi'],
                data.get('orario_preferito', 'qualsiasi'),
                '',  # operatrice_assegnata
                'IN_SOSPESO',
                ''   # note
            ])
        except Exception as e:
            print(f"Google Sheets error: {e}")

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'callback_id': callback_id,
            'message': 'Callback creato con successo'
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks/<int:callback_id>', methods=['GET'])
def get_callback(callback_id):
    """Ottieni dettagli callback"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT * FROM callback_richieste WHERE id = %s
        """, (callback_id,))

        callback = cur.fetchone()
        cur.close()
        conn.close()

        if not callback:
            return jsonify({'success': False, 'error': 'Callback non trovato'}), 404

        return jsonify({
            'success': True,
            'data': callback
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks/<int:callback_id>/complete', methods=['POST', 'OPTIONS'])
def complete_callback(callback_id):
    """Completa callback (operatrice ha fatto la richiamata)"""
    try:
        data = request.json if request.json else {}

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE callback_richieste
            SET stato = 'COMPLETATO',
                data_ora_callback_prevista = NOW(),
                note = %s
            WHERE id = %s
        """, (data.get('note', ''), callback_id))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Callback segnato come completato'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks/<int:callback_id>', methods=['DELETE'])
def delete_callback(callback_id):
    """Cancella callback (completato o non raggiungibile)"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            DELETE FROM callback_richieste WHERE id = %s
        """, (callback_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Callback cancellato'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks/<int:callback_id>/to-prenotazione', methods=['POST'])
def callback_to_prenotazione(callback_id):
    """Converte un callback in una prenotazione"""
    try:
        data = request.json

        if not data or not data.get('data_prenotazione') or not data.get('orario_prenotazione'):
            return jsonify({
                'success': False,
                'error': 'Campi obbligatori: data_prenotazione, orario_prenotazione'
            }), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Ottieni dati callback
        cur.execute("""
            SELECT cliente_nome, cliente_cognome, cliente_telefono, tipo_analisi
            FROM callback_richieste
            WHERE id = %s
        """, (callback_id,))

        callback = cur.fetchone()

        if not callback:
            return jsonify({
                'success': False,
                'error': 'Callback non trovato'
            }), 404

        # Converti data
        try:
            data_prenotazione = datetime.strptime(data['data_prenotazione'], '%Y-%m-%d').date()
        except:
            data_prenotazione = datetime.now().date() + timedelta(days=1)

        # Crea prenotazione
        cur.execute("""
            INSERT INTO prenotazioni
            (cliente_nome, cliente_cognome, cliente_telefono,
             tipo_analisi, data_prenotazione, orario_prenotazione, stato)
            VALUES (%s, %s, %s, %s, %s, %s, 'CONFERMATA')
            RETURNING id
        """, (
            callback['cliente_nome'],
            callback['cliente_cognome'],
            callback['cliente_telefono'],
            callback['tipo_analisi'],
            data_prenotazione,
            data['orario_prenotazione']
        ))

        prenotazione_id = cur.fetchone()['id']

        # Elimina callback
        cur.execute("""
            DELETE FROM callback_richieste WHERE id = %s
        """, (callback_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'prenotazione_id': prenotazione_id,
            'message': 'Callback convertito in prenotazione'
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/callbacks/completati', methods=['GET'])
def list_callbacks_completati():
    """Lista callback completati"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, note, data_ora_richiesta, stato
            FROM callback_richieste
            WHERE stato = 'COMPLETATO'
            ORDER BY data_ora_richiesta DESC
        """)

        callbacks = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': callbacks,
            'count': len(callbacks)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== PRENOTAZIONI ENDPOINTS ====================

@app.route('/api/prenotazioni', methods=['GET'])
def list_prenotazioni():
    """Lista prenotazioni del giorno"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, data_prenotazione, orario_prenotazione, stato
            FROM prenotazioni
            WHERE data_prenotazione = CURRENT_DATE
            AND stato = 'CONFERMATA'
            ORDER BY orario_prenotazione ASC
        """)

        prenotazioni = cur.fetchall()

        # Serializza date e time
        for p in prenotazioni:
            if p.get('orario_prenotazione'):
                p['orario_prenotazione'] = p['orario_prenotazione'].isoformat()
            if p.get('data_prenotazione'):
                p['data_prenotazione'] = p['data_prenotazione'].isoformat()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': prenotazioni
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/prenotazioni', methods=['POST'])
def create_prenotazione():
    """Crea nuova prenotazione"""
    try:
        data = request.json

        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO prenotazioni
            (cliente_nome, cliente_cognome, cliente_telefono, cliente_email,
             tipo_analisi, data_prenotazione, orario_prenotazione, stato)
            VALUES (%s, %s, %s, %s, %s, %s, %s, 'CONFERMATA')
            RETURNING id
        """, (
            data['nome'],
            data['cognome'],
            data['telefono'],
            data.get('email', ''),
            data['tipo_analisi'],
            data['data'],
            data['ora']
        ))

        prenotazione_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'prenotazione_id': prenotazione_id
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/prenotazioni/mese', methods=['GET'])
def get_prenotazioni_mese():
    """Restituisce tutte le prenotazioni di un mese specifico"""
    try:
        anno = request.args.get('anno', datetime.now().year, type=int)
        mese = request.args.get('mese', datetime.now().month, type=int)

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, data_prenotazione, orario_prenotazione, operatrice_assegnata
            FROM prenotazioni
            WHERE EXTRACT(YEAR FROM data_prenotazione) = %s
              AND EXTRACT(MONTH FROM data_prenotazione) = %s
            ORDER BY data_prenotazione ASC, orario_prenotazione ASC
        """, (anno, mese))

        prenotazioni = cur.fetchall()

        # Serializza date e time
        for p in prenotazioni:
            if p.get('orario_prenotazione'):
                p['orario_prenotazione'] = p['orario_prenotazione'].isoformat()
            if p.get('data_prenotazione'):
                p['data_prenotazione'] = p['data_prenotazione'].isoformat()

        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': prenotazioni
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== DOTTORI ENDPOINTS ====================

@app.route('/api/dottori', methods=['GET'])
def list_dottori():
    """Lista di tutti i dottori/specialisti attivi"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, nome, cognome, specializzazione, email, telefono, attivo
            FROM dottori
            WHERE attivo = TRUE
            ORDER BY cognome, nome ASC
        """)

        dottori = cur.fetchall()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': dottori,
            'count': len(dottori)
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/dottori', methods=['POST'])
def create_dottore():
    """Crea un nuovo dottore/specialista"""
    try:
        data = request.json

        # Validazione
        required = ['nome', 'cognome', 'specializzazione']
        if not all(k in data for k in required):
            return jsonify({
                'success': False,
                'error': 'Campi obbligatori: nome, cognome, specializzazione'
            }), 400

        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Controlla se esiste già
        cur.execute("""
            SELECT id FROM dottori
            WHERE nome = %s AND cognome = %s
        """, (data['nome'], data['cognome']))

        if cur.fetchone():
            return jsonify({
                'success': False,
                'error': f"Dottore {data['nome']} {data['cognome']} esiste già"
            }), 400

        # Insert dottore
        cur.execute("""
            INSERT INTO dottori
            (nome, cognome, specializzazione, email, telefono, attivo)
            VALUES (%s, %s, %s, %s, %s, TRUE)
            RETURNING id, nome, cognome, specializzazione, email, telefono, attivo
        """, (
            data['nome'],
            data['cognome'],
            data['specializzazione'],
            data.get('email', ''),
            data.get('telefono', '')
        ))

        dottore = cur.fetchone()
        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'data': dottore,
            'message': f"Dottore {data['nome']} {data['cognome']} creato con successo"
        }), 201

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

@app.route('/api/dottori/<int:dottore_id>', methods=['DELETE'])
def delete_dottore(dottore_id):
    """Elimina un dottore (soft delete: attivo = FALSE)"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            UPDATE dottori SET attivo = FALSE WHERE id = %s
        """, (dottore_id,))

        conn.commit()
        cur.close()
        conn.close()

        return jsonify({
            'success': True,
            'message': 'Dottore disattivato'
        }), 200

    except Exception as e:
        return jsonify({
            'success': False,
            'error': str(e)
        }), 500

# ==================== WILDIX WEBHOOK ====================

@app.route('/webhook/wildix', methods=['POST'])
def wildix_webhook():
    """
    Ricevi dati dal voicebot Wildix

    Body atteso:
    {
        "nome": "Mario",
        "cognome": "Rossi",
        "telefono": "+39 333 1234567",
        "motivo_della_chiamata": "Ematologia - controllo annuale"
    }
    """
    try:
        data = request.json

        # Validazione
        if not data.get('nome') or not data.get('cognome') or not data.get('telefono'):
            return jsonify({
                'success': False,
                'error': 'Campi obbligatori: nome, cognome, telefono'
            }), 400

        # Dati da Wildix
        callback_data = {
            'nome': data.get('nome'),
            'cognome': data.get('cognome'),
            'telefono': data.get('telefono'),
            'motivo': data.get('motivo_della_chiamata', 'Callback da voicebot')
        }

        # Crea callback
        callback_id = create_callback_internal(callback_data)

        return jsonify({
            'success': True,
            'callback_id': callback_id,
            'message': 'Callback ricevuto e salvato'
        }), 201

    except Exception as e:
        print(f"[WILDIX ERROR] {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def create_callback_internal(data):
    """Helper interno per creare callback da Wildix"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        # Insert callback
        cur.execute("""
            INSERT INTO callback_richieste
            (cliente_nome, cliente_cognome, cliente_telefono, tipo_analisi,
             orario_preferito, stato, data_ora_richiesta)
            VALUES (%s, %s, %s, %s, 'qualsiasi', 'IN_SOSPESO', NOW())
            RETURNING id
        """, (
            data['nome'],
            data['cognome'],
            data['telefono'],
            data['motivo']  # Salva il motivo nel campo tipo_analisi
        ))

        callback_id = cur.fetchone()['id']
        conn.commit()

        # Aggiungi a Google Sheets (se disponibile)
        try:
            gc = get_sheets_client()
            sheet = gc.open_by_key(os.getenv('GOOGLE_SHEETS_ID')).sheet1

            sheet.append_row([
                datetime.now().strftime('%Y-%m-%d %H:%M'),
                data['nome'],
                data['cognome'],
                data['telefono'],
                data['motivo'],
                'qualsiasi',
                '',  # operatrice_assegnata
                'IN_SOSPESO',
                'Da voicebot Wildix'
            ])
        except Exception as e:
            print(f"[SHEETS ERROR] {e}")

        cur.close()
        conn.close()

        print(f"[WILDIX] ✅ Callback creato: ID={callback_id}, Cliente={data['nome']} {data['cognome']}")
        return callback_id

    except Exception as e:
        print(f"[DB ERROR] {e}")
        raise

# ==================== HEALTH CHECK ====================

@app.route('/health', methods=['GET'])
def health():
    """Health check endpoint"""
    return jsonify({
        'status': 'ok',
        'timestamp': datetime.now().isoformat()
    }), 200

# ==================== ERROR HANDLERS ====================

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint non trovato'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Errore server interno'}), 500

if __name__ == '__main__':
    app.run(
        host='0.0.0.0',
        port=int(os.getenv('PORT', 5000)),
        debug=os.getenv('FLASK_ENV', 'production') == 'development'
    )