import os
import psycopg2

db_url = "postgres://ufhuljuk0f8bj:pf3240919ff954d3a08a477a725bcc0da17451f0294fb8ac97d5bb2a463f9a2bf@c72g81hspn0p64.cluster-czrs8kj4isg7.us-east-1.rds.amazonaws.com:5432/dhu13nag3kbph"

try:
    conn = psycopg2.connect(db_url)
    cursor = conn.cursor()
    
    with open('backend/schema.sql', 'r') as f:
        schema = f.read()
        cursor.execute(schema)
    
    conn.commit()
    cursor.close()
    conn.close()
    print('✅ Schema caricato con successo!')
except Exception as e:
    print(f'❌ Errore: {e}')