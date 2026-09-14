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

# Load environment variables
load_dotenv()

app = Flask(__name__)
CORS(app)

def get_db_connection():
    db_url = os.getenv('DATABASE_URL')
    if db_url:
        conn = psycopg2.connect(db_url)
    else:
        conn = psycopg2.connect(
            host=os.getenv('DB_HOST'),
            database=os.getenv('DB_NAME'),
            user=os.getenv('DB_USER'),
            password=os.getenv('DB_PASSWORD'),
            port=os.getenv('DB_PORT', 5432)
        )
    return conn

def init_db():
    """Crea le tabelle se non esistono"""
    conn = get_db_connection()
    cursor = conn.cursor()
    
    try:
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS callback_richieste (
                id SERIAL PRIMARY KEY,
                cliente_nome VARCHAR(100),
                cliente_cognome VARCHAR(100),
                cliente_telefono VARCHAR(20),
                tipo_analisi VARCHAR(100),
                orario_preferito VARCHAR(50),
                data_ora_richiesta TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                stato VARCHAR(50) DEFAULT 'attesa',
                operatrice_assegnata VARCHAR(100),
                note TEXT
            );
        """)
        
        cursor.execute("""
            CREATE TABLE IF NOT EXISTS prenotazioni (
                id SERIAL PRIMARY KEY,
                cliente_nome VARCHAR(100),
                cliente_cognome VARCHAR(100),
                cliente_telefono VARCHAR(20),
                tipo_analisi VARCHAR(100),
                data_prenotazione DATE,
                orario_prenotazione TIME,
                operatrice_assegnata VARCHAR(100),
                data_ora_creazione TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
                note TEXT
            );
        """)
        
        conn.commit()
        print("✅ Tabelle create/verificate con successo")
    except Exception as e:
        print(f"❌ Errore creazione tabelle: {e}")
    finally:
        cursor.close()
        conn.close()

# Inizializza il database
init_db()

def get_sheets_client():
    creds_dict = json.loads(os.getenv('GOOGLE_SHEETS_CREDENTIALS', '{}'))
    credentials = Credentials.from_service_account_info(
        creds_dict,
        scopes=['https://www.googleapis.com/auth/spreadsheets']
    )
    return gspread.authorize(credentials)

@app.route('/api/callbacks', methods=['GET'])
def list_callbacks():
    """Lista tutti i callback in sospeso"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
                    SELECT id, cliente_nome as nome, cliente_cognome as cognome, cliente_telefono as telefono, tipo_analisi, orario_preferito, data_ora_richiesta, stato
                    FROM callback_richieste
                    WHERE stato = 'IN_SOSPESO'
                    ORDER BY data_ora_richiesta ASC
                    """)
        callbacks = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'data': callbacks, 'count': len(callbacks)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/callbacks', methods=['POST'])
def create_callback():
    """Crea un nuovo callback"""
    try:
        data = request.json
        required = ['nome', 'cognome', 'telefono', 'tipo_analisi']
        if not all(k in data for k in required):
            return jsonify({'success': False, 'error': 'Campi obbligatori: nome, cognome, telefono, tipo_analisi'}), 400

        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            INSERT INTO callback_richieste
            (cliente_nome, cliente_cognome, cliente_telefono, tipo_analisi,
             orario_preferito, stato, data_ora_richiesta)
            VALUES (%s, %s, %s, %s, %s, 'IN_SOSPESO', NOW())
            RETURNING id
        """, (data['nome'], data['cognome'], data['telefono'], data['tipo_analisi'], data.get('orario_preferito', 'qualsiasi')))

        callback_id = cur.fetchone()[0]
        conn.commit()
        cur.close()
        conn.close()

        try:
            gc = get_sheets_client()
            sheet = gc.open_by_key(os.getenv('GOOGLE_SHEETS_ID')).sheet1
            sheet.append_row([
                datetime.now().strftime('%Y-%m-%d %H:%M'),
                data['nome'], data['cognome'], data['telefono'],
                data['tipo_analisi'], data.get('orario_preferito', 'qualsiasi'),
                '', 'IN_SOSPESO', ''
            ])
        except Exception as e:
            print(f"Google Sheets error: {e}")

        return jsonify({'success': True, 'callback_id': callback_id, 'message': 'Callback creato con successo'}), 201
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/callbacks/<int:callback_id>', methods=['GET'])
def get_callback(callback_id):
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("SELECT * FROM callback_richieste WHERE id = %s", (callback_id,))
        callback = cur.fetchone()
        cur.close()
        conn.close()
        if not callback:
            return jsonify({'success': False, 'error': 'Callback non trovato'}), 404
        return jsonify({'success': True, 'data': callback}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500


@app.route('/api/prenotazioni', methods=['GET'])
def list_prenotazioni():
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, cliente_nome, cliente_cognome, cliente_telefono,
                   tipo_analisi, data_prenotazione, orario_prenotazione
            FROM prenotazioni
            WHERE data_prenotazione = CURRENT_DATE
            ORDER BY orario_prenotazione ASC
        """)
        prenotazioni = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'data': prenotazioni}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/callbacks/<int:callback_id>', methods=['DELETE'])
def delete_callback(callback_id):
    try:
        conn = get_db_connection()
        cursor = conn.cursor()
        
        # Elimina il callback dal database
        cursor.execute('DELETE FROM callback_richieste WHERE id = %s', (callback_id,))
        conn.commit()
        cursor.close()
        conn.close()
        
        return jsonify({'success': True})
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.route('/api/callbacks/<int:callback_id>/complete', methods=['POST', 'OPTIONS'])
def complete_callback(callback_id):
    """Completa callback (operatrice ha fatto la richiamata)"""
    if request.method == 'OPTIONS':
        return '', 204
    
    try:
        data = request.json
        conn = get_db_connection()
        cur = conn.cursor()
        cur.execute("""
            UPDATE callback_richieste
            SET stato = 'COMPLETATO',
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

@app.route('/health', methods=['GET'])
def health():
    return jsonify({'status': 'ok', 'timestamp': datetime.now().isoformat()}), 200

@app.route('/api/callbacks/completati', methods=['GET'])
def list_completati():
    """Lista tutti i callback completati di oggi"""
    try:
        conn = get_db_connection()
        cur = conn.cursor(cursor_factory=RealDictCursor)
        cur.execute("""
            SELECT id, cliente_nome as nome, cliente_cognome as cognome, 
                   cliente_telefono as telefono, tipo_analisi, 
                   data_ora_richiesta, stato, note
            FROM callback_richieste
            WHERE stato = 'COMPLETATO' AND DATE(data_ora_richiesta) = CURRENT_DATE
            ORDER BY data_ora_richiesta DESC
        """)
        callbacks = cur.fetchall()
        cur.close()
        conn.close()
        return jsonify({'success': True, 'data': callbacks, 'count': len(callbacks)}), 200
    except Exception as e:
        return jsonify({'success': False, 'error': str(e)}), 500

@app.errorhandler(404)
def not_found(e):
    return jsonify({'error': 'Endpoint non trovato'}), 404

@app.errorhandler(500)
def server_error(e):
    return jsonify({'error': 'Errore server interno'}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=int(os.getenv('PORT', 5000)),
            debug=os.getenv('FLASK_ENV', 'production') == 'development')