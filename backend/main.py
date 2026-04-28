from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from database import connect_to_mongo, close_mongo_connection
from routes import kpis, faults, timeseries, predictive, chatbot
import uvicorn

app = FastAPI(title="Predictive Maintenance Dashboard API")

# Setup CORS
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"], # For development, allow all origins
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.on_event("startup")
async def startup_db_client():
    await connect_to_mongo()

@app.on_event("shutdown")
async def shutdown_db_client():
    await close_mongo_connection()

app.include_router(kpis.router, prefix="/api/kpis", tags=["KPIs"])
app.include_router(faults.router, prefix="/api/faults", tags=["Faults"])
app.include_router(timeseries.router, prefix="/api/timeseries", tags=["Timeseries"])
app.include_router(predictive.router, prefix="/api/predictive", tags=["Predictive"])
app.include_router(chatbot.router, prefix="/api/chatbot", tags=["Chatbot"])

@app.get("/")
def read_root():
    return {"message": "Welcome to Predictive Maintenance API"}

if __name__ == "__main__":
    uvicorn.run("main:app", host="127.0.0.1", port=8000, reload=True)
