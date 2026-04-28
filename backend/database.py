import os
from motor.motor_asyncio import AsyncIOMotorClient
from dotenv import load_dotenv

load_dotenv()
MONGO_URI = os.getenv("MONGO_URI", "mongodb://localhost:27017/")
DB_NAME = os.getenv("DB_NAME", "predictive_maintenance")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_config = Database()

async def connect_to_mongo():
    try:
        db_config.client = AsyncIOMotorClient(MONGO_URI, serverSelectionTimeoutMS=5000)
        db_config.db = db_config.client[DB_NAME]
        # Test connection
        await db_config.client.server_info()
        print("Connected to MongoDB")
    except Exception as e:
        print(f"Could not connect to MongoDB: {e}")

async def close_mongo_connection():
    if db_config.client:
        db_config.client.close()
        print("Closed MongoDB connection")

def get_db():
    return db_config.db
