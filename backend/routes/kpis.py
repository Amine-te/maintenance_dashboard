import os
import pandas as pd
from fastapi import APIRouter, HTTPException
from database import get_db

router = APIRouter()

def get_csv_fallback():
    base_dir = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
    kpi_file = os.path.join(base_dir, "enhanced_data", "kpi_summary.csv")
    if os.path.exists(kpi_file):
        df = pd.read_csv(kpi_file)
        return df.to_dict('records')
    return []

@router.get("/")
async def get_all_kpis():
    db = get_db()
    kpis = []
    if db is not None:
        try:
            kpis_cursor = db.kpis.find({}, {"_id": 0})
            kpis = await kpis_cursor.to_list(length=1000)
        except:
            kpis = get_csv_fallback()
    else:
        kpis = get_csv_fallback()
    
    if not kpis:
        return {"fleet_kpis": {}, "engine_kpis": []}
    
    mean_mtbf = sum([k['MTBF_cycles'] for k in kpis]) / len(kpis)
    mean_mttr = sum([k['MTTR_cycles'] for k in kpis]) / len(kpis)
    mean_mtu = sum([k['MTU_cycles'] for k in kpis]) / len(kpis)
    mean_availability = sum([k['availability_pct'] for k in kpis]) / len(kpis)
    total_failures = sum([k['n_failure_cycles'] for k in kpis])
    
    fleet_kpis = {
        "mean_mtbf": round(mean_mtbf, 2),
        "mean_mttr": round(mean_mttr, 2),
        "mean_mtu": round(mean_mtu, 2),
        "mean_availability": round(mean_availability, 2),
        "total_engines": len(kpis),
        "total_failures": total_failures
    }
    
    return {"fleet_kpis": fleet_kpis, "engine_kpis": kpis}

@router.get("/{engine_id}")
async def get_kpi_for_engine(engine_id: int):
    db = get_db()
    if db is not None:
        try:
            kpi = await db.kpis.find_one({"engine_id": engine_id}, {"_id": 0})
            if kpi: return kpi
        except:
            pass
            
    kpis = get_csv_fallback()
    for k in kpis:
        if k['engine_id'] == engine_id:
            return k
            
    raise HTTPException(status_code=404, detail="Engine not found")
