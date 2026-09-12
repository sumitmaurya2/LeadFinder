# LeadFinder FastAPI Leads Service

This service is the FastAPI lead-source expected by the existing Express backend.

## Contract

`POST /search`

Headers:

- `Authorization: Bearer <LEADS_API_KEY>`
- or `X-API-Key: <LEADS_API_KEY>`

JSON body accepted from the existing backend:

```json
{
  "keyword": "cafes",
  "query": "cafes",
  "business_type": "cafes",
  "location": "Lucknow",
  "country": "India",
  "limit": 20,
  "max_results": 20
}
```

Response:

```json
{
  "results": [
    {
      "place_id": "ChIJ...",
      "name": "Example Cafe",
      "address": "Example address",
      "phone": "+91...",
      "website": "https://example.com",
      "category": "cafe",
      "rating": 4.5,
      "reviews": 123,
      "business_status": "OPERATIONAL",
      "latitude": 26.84,
      "longitude": 80.94,
      "maps_url": "https://www.google.com/maps/..."
    }
  ]
}
```

## Local run

```bash
cd fastapi
python -m venv .venv
```

Windows:

```bash
.venv\Scripts\activate
```

Install:

```bash
pip install -r requirements.txt
```

Copy `.env.example` to `.env` and fill in the values.

Run:

```bash
uvicorn app.main:app --reload --port 8000
```

Health:

```text
http://localhost:8000/health
```

Docs:

```text
http://localhost:8000/docs
```

## Production

Deploy the `fastapi/` directory as a Python web service.

Build command:

```text
pip install -r requirements.txt
```

Start command:

```text
uvicorn app.main:app --host 0.0.0.0 --port $PORT
```

Set:

```text
LEADS_API_KEY=<same secret used by Express>
SERPAPI_API_KEY=<SerpApi key>
MAX_RESULTS=100
```

Then in the Express backend set:

```text
LEADS_API_URL=https://YOUR-FASTAPI-DOMAIN/search
LEADS_API_KEY=<same secret>
```

## Data source

The service uses SerpApi's Google Maps engine. It geocodes the requested location and country, then fetches matching local business results. Keep the SerpApi key only on the server; never expose it in the frontend.


uvicorn app.main:app --port 8000 --reload
