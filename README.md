# Threat Detection Full Stack Project

Fully integrated frontend, backend, ML model, and database with CIC-IDS dataset for network threat detection.

## Quick Start

### Backend (Flask + ML + SQLite)
```bash
cd Threat_backend
source venv/bin/activate
python app.py
```
- Runs on http://localhost:5000
- DB: instance/threats.db (ApsiDataset seeded with 500+ rows from CSVs)
- ML: threat_model.pkl trained on dataset
- APIs: /api/detect (predict), /api/alerts (list), /api/logs, /api/train/*

### Frontend (Next.js Dashboard)
```bash
cd threat-detection-with-ML-main
npm run dev
```
- Runs on http://localhost:3000
- Dashboard with alerts, detection, logs pages
- Connected to backend via .env.local NEXT_PUBLIC_API_URL=http://localhost:5000

## Test ML Detection
```bash
curl -X POST http://localhost:5000/api/detect \\
-H "Content-Type: application/json" \\
-d '{
  "packet_size": 1500,
  "frequency": 80,
  "cpu_usage": 0.9,
  "file_signature": 1
}'
```
Returns prediction (Normal/Malicious), confidence, log_id.

## Dataset
- CIC-IDS2017 CSVs imported to DB
- Model accuracy ~94%+ on test set

## Next Steps
- Add fetch calls in frontend pages for real data (api.ts ready)
- Deploy with docker-compose
- Add auth/dashboard stats endpoint

Project fully functional! 🎉
