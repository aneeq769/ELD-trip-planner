# ELD Trip Planner

A full-stack FMCSA-compliant Electronic Logging Device (ELD) Trip Planner built with **Django + React**.

## Features

- **Interactive Route Map** — OpenStreetMap + Leaflet, shows full route with all stops
- **HOS-Compliant Trip Planning** — All FMCSA property carrier rules enforced
- **ELD Daily Log Sheets** — Auto-generated, Canvas-drawn daily logs for multi-day trips
- **Free APIs only** — OSRM routing + Nominatim geocoding (no API keys needed)

## HOS Rules Enforced

| Rule | Value |
|------|-------|
| Max driving per shift | 11 hours |
| On-duty window | 14 hours |
| Mandatory rest | 10 hours off-duty |
| 30-min break trigger | After 8 hrs driving |
| Cycle limit | 70 hrs / 8 days |
| Fueling | Every 1,000 miles |
| Pickup & Dropoff | 1 hour each |

## Tech Stack

- **Backend**: Django 4.2 + Django REST Framework + CORS Headers
- **Frontend**: React 18 + Leaflet.js + HTML Canvas
- **Routing**: OSRM (free, no API key)
- **Geocoding**: Nominatim/OpenStreetMap (free, no API key)

## Local Development

### Backend

```bash
cd backend
pip install -r requirements.txt
# Copy env file
cp .env.example .env
# Edit .env: set SECRET_KEY, DEBUG, ALLOWED_HOSTS, CORS_ALLOW_ALL_ORIGINS
python manage.py runserver
# API available at http://localhost:8000
```

### Frontend

```bash
cd frontend
npm install
# Copy env file
cp .env.example .env
# Edit .env: REACT_APP_API_URL=http://localhost:8000
npm start
# App at http://localhost:3000
```

## API

### `POST /api/trip/plan/`

**Request:**
```json
{
  "current_location": "Chicago, IL",
  "pickup_location": "Gary, IN",
  "dropoff_location": "New York, NY",
  "current_cycle_used": 20
}
```

**Response:**
```json
{
  "success": true,
  "locations": { "current": {...}, "pickup": {...}, "dropoff": {...} },
  "route": { "geometry": [...], "total_miles": 820 },
  "stops": [...],
  "day_logs": [...],
  "summary": {
    "total_miles": 820,
    "total_days": 2,
    "total_driving_hours": 14.9,
    "num_rest_stops": 1,
    "num_fuel_stops": 0,
    "cycle_hours_used": 34.9
  }
}
```

## Deployment

### Backend → Render.com (free tier)

1. Push to GitHub
2. New Web Service on render.com → connect repo → set root to `backend/`
3. Build command: `pip install -r requirements.txt`
4. Start command: `gunicorn config.wsgi:application`
5. Add env vars: `SECRET_KEY`, `DEBUG=False`, `ALLOWED_HOSTS=your-render-domain.onrender.com`, `CORS_ALLOW_ALL_ORIGINS=True`

### Frontend → Vercel (free)

1. Import GitHub repo on vercel.com → set root to `frontend/`
2. Add env var: `REACT_APP_API_URL=https://your-render-url.onrender.com`
3. Deploy

## Project Structure

```
eld-trip-planner/
├── backend/
│   ├── config/          # Django project config
│   ├── trip/
│   │   ├── hos_engine.py    # ★ Core HOS calculation logic
│   │   ├── routing.py       # Geocoding + OSRM routing
│   │   ├── views.py         # API endpoint
│   │   └── urls.py
│   ├── requirements.txt
│   └── Procfile
└── frontend/
    ├── src/
    │   ├── App.js
    │   └── components/
    │       ├── TripForm.js      # Input form
    │       ├── TripMap.js       # Leaflet map
    │       ├── ELDLogs.js       # ★ Canvas ELD log renderer
    │       └── TripSummary.js   # Stats panel
    └── vercel.json
```
