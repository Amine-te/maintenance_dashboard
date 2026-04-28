import os
import pandas as pd
from pymongo import MongoClient

# MongoDB connection string
MONGO_URI = "mongodb://localhost:27017/"
DB_NAME = "predictive_maintenance"

def ingest_data():
    client = MongoClient(MONGO_URI)
    db = client[DB_NAME]

    base_dir = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
    enhanced_data_dir = os.path.join(base_dir, "enhanced_data")

    # 1. Ingest KPI Summary
    kpi_file = os.path.join(enhanced_data_dir, "kpi_summary.csv")
    if os.path.exists(kpi_file):
        df_kpi = pd.read_csv(kpi_file)
        db.kpis.drop()
        db.kpis.insert_many(df_kpi.to_dict('records'))
        print(f"Inserted {len(df_kpi)} records into 'kpis' collection.")
    else:
        print(f"File not found: {kpi_file}")

    # 2. Ingest Event Log
    event_file = os.path.join(enhanced_data_dir, "event_log.csv")
    if os.path.exists(event_file):
        df_event = pd.read_csv(event_file)
        db.events.drop()
        db.events.insert_many(df_event.to_dict('records'))
        print(f"Inserted {len(df_event)} records into 'events' collection.")
    else:
        print(f"File not found: {event_file}")

    # 3. Ingest Timeseries Data
    timeseries_file = os.path.join(enhanced_data_dir, "enriched_timeseries.csv")
    if os.path.exists(timeseries_file):
        df_ts = pd.read_csv(timeseries_file)
        db.timeseries.drop()
        # insert in chunks to avoid memory/document size limits
        records = df_ts.to_dict('records')
        chunk_size = 5000
        for i in range(0, len(records), chunk_size):
            db.timeseries.insert_many(records[i:i+chunk_size])
        print(f"Inserted {len(df_ts)} records into 'timeseries' collection.")
        
        # create indices for faster query
        db.timeseries.create_index("engine_id")
        db.timeseries.create_index("virtual_cycle")
    else:
        print(f"File not found: {timeseries_file}")

if __name__ == "__main__":
    print("Starting data ingestion...")
    ingest_data()
    print("Data ingestion complete.")
