from __future__ import annotations

from typing import Any, Dict, List

from database import get_db
from routes.kpis import get_csv_fallback as get_kpis_fallback
from routes.faults import get_csv_fallback as get_faults_fallback


async def build_dashboard_context() -> Dict[str, Any]:
    db = get_db()
    kpis: List[Dict[str, Any]] = []
    events: List[Dict[str, Any]] = []

    if db is not None:
        try:
            kpis = await db.kpis.find({}, {"_id": 0}).limit(100).to_list(length=100)
            events = await db.events.find({}, {"_id": 0}).limit(500).to_list(length=500)
        except Exception:
            kpis = []
            events = []

    if not kpis:
        kpis = get_kpis_fallback()
    if not events:
        events = get_faults_fallback()

    mean_availability = 0.0
    total_failures = 0
    if kpis:
        mean_availability = sum(float(item.get("availability_pct", 0)) for item in kpis) / len(kpis)
        total_failures = int(sum(float(item.get("n_failure_cycles", 0)) for item in kpis))

    fault_distribution: Dict[str, int] = {}
    for ev in events:
        if ev.get("event_type") == "failure":
            defect = str(ev.get("defect_type", "unknown"))
            fault_distribution[defect] = fault_distribution.get(defect, 0) + 1

    return {
        "fleet": {
            "engine_count": len(kpis),
            "mean_availability_pct": round(mean_availability, 2),
            "total_failure_events": total_failures,
        },
        "fault_distribution": fault_distribution,
        "top_engines_by_availability": sorted(
            [
                {
                    "engine_id": int(item.get("engine_id", 0)),
                    "availability_pct": float(item.get("availability_pct", 0)),
                }
                for item in kpis
            ],
            key=lambda x: x["availability_pct"],
            reverse=True,
        )[:5],
    }


def render_context_text(context: Dict[str, Any]) -> str:
    fleet = context.get("fleet", {})
    faults = context.get("fault_distribution", {})
    top = context.get("top_engines_by_availability", [])

    return (
        f"Fleet overview: {fleet.get('engine_count', 0)} engines, "
        f"mean availability {fleet.get('mean_availability_pct', 0)}%, "
        f"{fleet.get('total_failure_events', 0)} failure events.\n"
        f"Fault distribution: {faults}\n"
        f"Top available engines: {top}"
    )
