# 🚀 Predictive Maintenance Dashboard

![Project Status](https://img.shields.io/badge/status-active-success.svg)
![Python](https://img.shields.io/badge/python-3.10+-blue.svg)
![FastAPI](https://img.shields.io/badge/FastAPI-0.100+-009688.svg?logo=fastapi)
![Next.js](https://img.shields.io/badge/Next.js-14+-000000.svg?logo=next.js)
![MongoDB](https://img.shields.io/badge/MongoDB-4.4+-47A248.svg?logo=mongodb)
![TensorFlow](https://img.shields.io/badge/TensorFlow-2.x-FF6F00.svg?logo=tensorflow)

A full-stack web application designed to monitor aircraft turbofan engine health, visualize telemetry data, and predict the **Remaining Useful Life (RUL)** using Deep Learning (LSTM). This dashboard empowers maintenance teams to shift from reactive repairs to data-driven, predictive maintenance strategies.

---

## 💡 Idea & Overview

The **Predictive Maintenance Dashboard** is built to tackle the challenge of unexpected equipment failure in aviation. By leveraging historical sensor data and advanced machine learning techniques, the system provides real-time insights into engine degradation. 

**Key Features:**
- 📊 **Real-time KPI Tracking:** Monitor fleet health and engine status.
- 📈 **Telemetry Visualization:** Interactive charts for engine sensor data.
- 🧠 **Predictive Analytics:** Deep Learning (LSTM) model to predict engine RUL.
- 🤖 **AI Maintenance Assistant:** Integrated intelligent chatbot to answer maintenance queries and assist technicians.

## 🗄️ Data

The project utilizes the renowned **NASA Turbofan Engine Degradation Simulation Dataset (FD001)**.
- **Timeseries Data:** Includes multiple operational settings and 21 sensor measurements (e.g., temperature, pressure, fan speed) per cycle.
- **Event Logs:** Maintenance and failure events.
- **KPI Summary:** Aggregated health metrics across the engine fleet.

The data is processed, enriched, and ingested into a **MongoDB** database for fast, flexible querying.

## 🏗️ Architecture

The project follows a modern, decoupled client-server architecture:

1. **Database Layer (MongoDB):** Stores raw timeseries data, event logs, and pre-calculated KPIs.
2. **Backend API (FastAPI):** High-performance Python backend that handles data retrieval, serves predictive inferences using a pre-trained Keras model, and orchestrates the AI Chatbot.
3. **Frontend Application (Next.js):** A responsive, interactive UI built with React and TypeScript, utilizing `recharts` for complex data visualizations.
4. **Machine Learning Layer (TensorFlow/Keras):** An LSTM neural network trained to understand temporal degradation patterns.

## 🛠️ Technology Stack

**Frontend:**
- [Next.js](https://nextjs.org/) (React framework)
- TypeScript
- Recharts (Data visualization)
- CSS Modules / Custom Styling

**Backend:**
- [FastAPI](https://fastapi.tiangolo.com/) (Web framework)
- Uvicorn (ASGI server)
- Motor (Asynchronous MongoDB driver)
- Python 3.x

**Data Science & AI:**
- TensorFlow / Keras (LSTM Model: `lstm_rul_fd001.h5`)
- Pandas & NumPy (Data manipulation)
- Scikit-Learn
- Groq / LLM Integration (for the AI Chatbot)

## 🔄 Workflow

1. **Data Ingestion:** The `ingest.py` script parses CSV files containing the enriched NASA dataset and loads them into MongoDB collections (`kpis`, `events`, `timeseries`).
2. **Model Loading:** The FastAPI backend loads the pre-trained `lstm_rul_fd001.h5` model into memory on startup.
3. **API Routing:** RESTful endpoints (e.g., `/api/timeseries`, `/api/predictive`) handle requests from the client frontend.
4. **Data Visualization:** The Next.js frontend fetches data asynchronously and renders Engine Timelines and KPI dashboards.
5. **AI Interaction:** Users can ask the Chatbot widget questions, which are securely processed by the backend LLM service using Groq.

## 🖥️ Pages & UI

- **🏠 Dashboard Overview (`/`):** A high-level summary of all engines, active alerts, and fleet health.
- **📊 KPIs (`/kpis`):** Detailed Key Performance Indicators and metrics.
- **📈 Raw Data (`/raw-data`):** Deep dive into historical sensor readings with interactive timeseries charts.
- **🔮 Predictive Model (`/predictive-model`):** Displays the LSTM predictions for Remaining Useful Life (RUL) and engine health trajectories.
- **💬 AI Chatbot Widget:** A persistent floating assistant available across all pages for instant help and documentation.

---

## 🚀 Getting Started

### 1. Prerequisites
- Node.js (v18+)
- Python (3.10+)
- MongoDB (Local instance or Atlas cluster)

### 2. Setup Database
Start your MongoDB service (default `mongodb://localhost:27017/`), then run the ingestion script:
```bash
cd data_ingestion
python ingest.py
```

### 3. Run the Backend
```bash
cd backend
python -m venv venv
source venv/bin/activate  # On Windows: venv\Scripts\activate
pip install -r requirements.txt
uvicorn main:app --reload
```

### 4. Run the Frontend
```bash
cd frontend
npm install
npm run dev
```

Navigate to `http://localhost:3000` to view the dashboard!

---
*Developed with modern web technologies to push the boundaries of predictive maintenance.*
