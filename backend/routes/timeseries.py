import os
import math
import pandas as pd
from fastapi import APIRouter, HTTPException
from fastapi.responses import JSONResponse
import json
from database import get_db

router = APIRouter()

def sanitize_for_json(records):
    """Replace NaN/Inf with None so JSON serialization works."""
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

def load_csv():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    ts_file = os.path.join(base_dir, "enhanced_data", "enriched_timeseries.csv")
    if os.path.exists(ts_file):
        return pd.read_csv(ts_file)
    return None

@router.get("/{engine_id}")
async def get_timeseries_for_engine(engine_id: int, limit: int = 1000):
    db = get_db()
    if db is not None:
        try:
            cursor = db.timeseries.find({"engine_id": engine_id}, {"_id": 0}).sort("virtual_cycle", 1).limit(limit)
            data = await cursor.to_list(length=limit)
            if data:
                return sanitize_for_json(data)
        except:
            pass

    # Fallback to CSV
    df = load_csv()
    if df is not None:
        df_engine = df[df['engine_id'] == engine_id].head(limit)
        records = df_engine.to_dict('records')
        return sanitize_for_json(records)

    raise HTTPException(status_code=404, detail="Data not found for this engine")

@router.get("/raw/all")
async def get_raw_data(page: int = 1, page_size: int = 100, engine_id: int = None, state: str = None):
    """Paginated raw data endpoint."""
    db = get_db()
    
    query = {}
    if engine_id:
        query["engine_id"] = engine_id
    if state:
        query["machine_state"] = state
    
    if db is not None:
        try:
            total = await db.timeseries.count_documents(query)
            cursor = db.timeseries.find(query, {"_id": 0}).sort("engine_id", 1).skip((page - 1) * page_size).limit(page_size)
            data = await cursor.to_list(length=page_size)
            return {"data": sanitize_for_json(data), "total": total, "page": page, "page_size": page_size}
        except:
            pass

    # Fallback
    df = load_csv()
    if df is not None:
        if engine_id:
            df = df[df['engine_id'] == engine_id]
        if state:
            df = df[df['machine_state'] == state]
        total = len(df)
        start = (page - 1) * page_size
        df_page = df.iloc[start:start + page_size]
        records = df_page.to_dict('records')
        return {"data": sanitize_for_json(records), "total": total, "page": page, "page_size": page_size}
    
    raise HTTPException(status_code=404, detail="Data not found")
