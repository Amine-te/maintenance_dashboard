from __future__ import annotations

from typing import Any, Dict, List, Optional
from database import get_db
from routes.kpis import get_csv_fallback as get_kpis_fallback
from routes.faults import get_csv_fallback as get_faults_fallback
from services.model_service import rul_model_service
from services.fd001_schema import WINDOW_SIZE
from services.preprocessing import list_feature_columns

async def get_fleet_kpis() -> Dict[str, Any]:
    """Get aggregated KPI statistics for the entire fleet."""
    db = get_db()
    kpis = []
    if db is not None:
        try:
            kpis = await db.kpis.find({}, {"_id": 0}).to_list(length=1000)
        except:
            kpis = get_kpis_fallback()
    else:
        kpis = get_kpis_fallback()
    
    if not kpis:
        return {"error": "No KPI data available."}
    
    mean_availability = sum([k.get('availability_pct', 0) for k in kpis]) / len(kpis)
    total_failures = sum([k.get('n_failure_cycles', 0) for k in kpis])
    
    return {
        "total_engines": len(kpis),
        "mean_availability_pct": round(mean_availability, 2),
        "total_failure_events": total_failures,
        "mean_mtbf": round(sum([k.get('MTBF_cycles', 0) for k in kpis]) / len(kpis), 2)
    }

async def get_engine_details(engine_id: int) -> Dict[str, Any]:
    """Get detailed KPI and health information for a specific engine by its ID."""
    db = get_db()
    if db is not None:
        try:
            kpi = await db.kpis.find_one({"engine_id": engine_id}, {"_id": 0})
            if kpi: return kpi
        except:
            pass
            
    kpis = get_kpis_fallback()
    for k in kpis:
        if k.get('engine_id') == engine_id:
            return k
            
    return {"error": f"Engine {engine_id} not found."}

async def search_fault_events(engine_id: Optional[int] = None, limit: int = 10) -> List[Dict[str, Any]]:
    """Search for recent fault or failure events in the database."""
    db = get_db()
    query = {}
    if engine_id is not None:
        query["engine_id"] = engine_id
    
    events = []
    if db is not None:
        try:
            events = await db.events.find(query, {"_id": 0}).sort("timestamp", -1).limit(limit).to_list(length=limit)
        except:
            events = get_faults_fallback()
    else:
        events = get_faults_fallback()
        
    if engine_id:
        events = [e for e in events if e.get('engine_id') == engine_id][:limit]
        
    return events

async def get_model_prediction_info() -> Dict[str, Any]:
    """Get information about the predictive maintenance model (RUL model)."""
    return {
        "model_type": "LSTM / Deep Learning",
        "target": "Remaining Useful Life (RUL)",
        "window_size": WINDOW_SIZE,
        "features": list_feature_columns(),
        "status": "Operational" if rul_model_service.model else "Loaded with fallback/mock"
    }

# Registry for the LLM tools
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_fleet_kpis",
            "description": "Get aggregated KPI statistics for the entire fleet including availability and failure counts.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_engine_details",
            "description": "Get detailed KPI and health information for a specific engine by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "engine_id": {"type": "integer", "description": "The unique ID of the engine."}
                },
                "required": ["engine_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_fault_events",
            "description": "Search for recent fault or failure events. Can filter by engine ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "engine_id": {"type": "integer", "description": "Optional engine ID to filter events."},
                    "limit": {"type": "integer", "description": "Maximum number of events to return.", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_model_prediction_info",
            "description": "Get information about the predictive maintenance model, its features and status.",
            "parameters": {"type": "object", "properties": {}}
        }
    }
]

async def get_engine_rankings(sort_by: str = "availability_pct", ascending: bool = False, limit: int = 5) -> List[Dict[str, Any]]:
    """Get a ranked list of engines based on a specific metric (e.g., availability_pct, MTBF_cycles)."""
    db = get_db()
    kpis = []
    if db is not None:
        try:
            kpis = await db.kpis.find({}, {"_id": 0}).to_list(length=1000)
        except:
            kpis = get_kpis_fallback()
    else:
        kpis = get_kpis_fallback()
    
    if not kpis:
        return []
    
    sorted_kpis = sorted(kpis, key=lambda x: x.get(sort_by, 0), reverse=not ascending)
    return sorted_kpis[:limit]

# Registry for the LLM tools
TOOLS_SCHEMA = [
    {
        "type": "function",
        "function": {
            "name": "get_fleet_kpis",
            "description": "Get aggregated KPI statistics for the entire fleet including availability and failure counts.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_engine_details",
            "description": "Get detailed KPI and health information for a specific engine by its ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "engine_id": {"type": "integer", "description": "The unique ID of the engine."}
                },
                "required": ["engine_id"]
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "search_fault_events",
            "description": "Search for recent fault or failure events. Can filter by engine ID.",
            "parameters": {
                "type": "object",
                "properties": {
                    "engine_id": {"type": "integer", "description": "Optional engine ID to filter events."},
                    "limit": {"type": "integer", "description": "Maximum number of events to return.", "default": 10}
                }
            }
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_model_prediction_info",
            "description": "Get information about the predictive maintenance model, its features and status.",
            "parameters": {"type": "object", "properties": {}}
        }
    },
    {
        "type": "function",
        "function": {
            "name": "get_engine_rankings",
            "description": "Get a ranked list of engines (e.g., lowest availability, highest MTBF).",
            "parameters": {
                "type": "object",
                "properties": {
                    "sort_by": {"type": "string", "enum": ["availability_pct", "MTBF_cycles", "n_failure_cycles"], "description": "The metric to rank by."},
                    "ascending": {"type": "boolean", "description": "True for bottom-up (lowest first), False for top-down (highest first)."},
                    "limit": {"type": "integer", "description": "Number of engines to return.", "default": 5}
                },
                "required": ["sort_by"]
            }
        }
    }
]

TOOL_MAP = {
    "get_fleet_kpis": get_fleet_kpis,
    "get_engine_details": get_engine_details,
    "search_fault_events": search_fault_events,
    "get_model_prediction_info": get_model_prediction_info,
    "get_engine_rankings": get_engine_rankings
}
