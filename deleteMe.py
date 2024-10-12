import sqlite3
import csv

def import_csv_to_sqlite(csv_file, db_file, table_name):
    conn = sqlite3.connect(db_file)
    cursor = conn.cursor()
    
    with open(csv_file, 'r') as file:
        csv_reader = csv.reader(file)
        headers = next(csv_reader)  # Assume first row is headers
        
        # Prepare the INSERT statement
        placeholders = ','.join(['?' for _ in headers])
        insert_query = f"INSERT INTO {table_name} ({','.join(headers)}) VALUES ({placeholders})"
        
        # Insert the data
        cursor.executemany(insert_query, csv_reader)
    
    conn.commit()
    conn.close()

# Usage
import_csv_to_sqlite('data.csv', 'new_database.db', 'table_name')