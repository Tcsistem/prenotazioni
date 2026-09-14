"""
Centro Analisi Anxur - Voicebot Backend
Flask API per gestione prenotazioni e callback
"""

from flask import Flask, request, jsonify
from flask_cors import CORS

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
CORS(app, resources={r"/api/*": cors_config, r"/health": cors_config})from datetime import datetime, timedelta
import os
from dotenv import load_dotenv
import psycopg2
from psycopg2.extras import RealDictCursor
import gspread
from google.oauth2.service_account import Credentials
import json

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

# Database connection
def get_db_connection():
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
        cur = conn.cursor()

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

        callback_id = cur.fetchone()[0]
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

@app.route('/api/callbacks/<int:callback_id>/complete', methods=['POST'])
def complete_callback(callback_id):
    """Completa callback (operatrice ha fatto la richiamata)"""
    try:
        data = request.json

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

        # TODO: Cancella riga da Google Sheets

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

# ==================== PRENOTAZIONI ENDPOINTS ====================

@app.route('/api/prenotazioni', methods=['GET'])
def list_prenotazioni():
    """Lista prenotazioni del giorno"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)

        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, data_prenotazione, ora_prenotazione, stato
            FROM prenotazioni
            WHERE data_prenotazione = CURRENT_DATE
            AND stato = 'CONFERMATA'
            ORDER BY ora_prenotazione ASC
        """)

        prenotazioni = cur.fetchall()
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
             tipo_analisi, data_prenotazione, ora_prenotazione, stato)
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

# ==================== WILDIX WEBHOOK ====================

@app.route('/webhook/wildix', methods=['POST'])
def wildix_webhook():
    """Ricevi dati dal voicebot Wildix"""
    try:
        data = request.json

        # Tipo di evento
        event_type = data.get('event_type')

        if event_type == 'call_ended':
            # Chiamata terminata
            print(f"[WILDIX] Call ended: {data}")

        elif event_type == 'callback_requested':
            # Cliente ha richiesto callback
            callback_data = {
                'nome': data.get('cliente_nome'),
                'cognome': data.get('cliente_cognome'),
                'telefono': data.get('cliente_telefono'),
                'tipo_analisi': data.get('tipo_analisi'),
                'orario_preferito': data.get('orario_preferito', 'qualsiasi')
            }
            # Crea callback via API interna
            create_callback_internal(callback_data)

        return jsonify({'success': True}), 200

    except Exception as e:
        print(f"Webhook error: {e}")
        return jsonify({'success': False, 'error': str(e)}), 500

def create_callback_internal(data):
    """Helper interno per creare callback"""
    try:
        conn = get_db_connection()
        cur = conn.cursor()

        cur.execute("""
            INSERT INTO callback_richieste
            (cliente_nome, cliente_cognome, cliente_telefono, tipo_analisi,
             orario_preferito, stato, data_ora_richiesta)
            VALUES (%s, %s, %s, %s, %s, 'IN_SOSPESO', NOW())
        """, (
            data['nome'],
            data['cognome'],
            data['telefono'],
            data['tipo_analisi'],
            data.get('orario_preferito', 'qualsiasi')
        ))

        conn.commit()
        cur.close()
        conn.close()
    except Exception as e:
        print(f"Error creating callback: {e}")

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
