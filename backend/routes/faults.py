import os
import math
import pandas as pd
from fastapi import APIRouter
from database import get_db

router = APIRouter()

def sanitize_for_json(records):
    clean = []
    for row in records:
        clean_row = {}
        for k, v in row.items():
            if isinstance(v, float) and (math.isnan(v) or math.isinf(v)):
                clean_row[k] = None
            else:
                clean_row[k] = v
        clean.append(clean_row)
    return clean

def get_csv_fallback():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    event_file = os.path.join(base_dir, "enhanced_data", "event_log.csv")
    if os.path.exists(event_file):
        df = pd.read_csv(event_file)
        return sanitize_for_json(df.to_dict('records'))
    return []

@router.get("/")
async def get_all_events():
    db = get_db()
    if db is not None:
        try:
            events_cursor = db.events.find({}, {"_id": 0})
            data = await events_cursor.to_list(length=10000)
            return sanitize_for_json(data)
        except:
            pass
    return get_csv_fallback()

@router.get("/distribution")
async def get_fault_distribution():
    db = get_db()
    if db is not None:
        try:
            pipeline = [
                {"$match": {"event_type": "failure"}},
                {"$group": {"_id": "$defect_type", "count": {"$sum": 1}}}
            ]
            cursor = db.events.aggregate(pipeline)
            results = await cursor.to_list(length=100)
            return {item['_id']: item['count'] for item in results}
        except:
            pass

    # Fallback to CSV
    events = get_csv_fallback()
    distribution = {}
    for ev in events:
        if ev.get("event_type") == "failure":
            dt = ev.get("defect_type", "unknown")
            distribution[dt] = distribution.get(dt, 0) + 1
    return distribution
