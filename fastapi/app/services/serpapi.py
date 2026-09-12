from geopy.geocoders import Nominatim
from serpapi import GoogleSearch

from app.config import settings
from app.schemas import Lead


class SerpAPIError(RuntimeError):
    pass


def _result_to_lead(result: dict, index: int) -> Lead:
    return Lead(
        place_id=result.get("place_id") or f"serp-{index}",
        name=result.get("title") or "Unnamed business",
        address=result.get("address"),
        phone=result.get("phone"),
        website=result.get("website"),
        category=result.get("type"),
        rating=result.get("rating"),
        reviews=result.get("reviews") or 0,
        business_status="OPERATIONAL",
        latitude=None,
        longitude=None,
        maps_url=result.get("link"),
    )
def get_coordinates(location: str, country: str) -> tuple[float, float]:
    geolocator = Nominatim(user_agent="leadfinder/1.0")

    try:
        result = geolocator.geocode(f"{location}, {country}")
    except Exception as exc:
        raise SerpAPIError("Unable to reach the geocoding service") from exc

    if not result:
        raise SerpAPIError(f"Location not found: {location}")

    return result.latitude, result.longitude

async def search_places(
    keyword: str,
    location: str,
    country: str,
    limit: int,
) -> list[Lead]:
    if not settings.serpapi_api_key:
        raise SerpAPIError("SERPAPI_API_KEY is not configured")

    target = min(limit, settings.max_results)

    latitude, longitude = get_coordinates(location, country)

    params = {
    "engine": "google_maps",
    "q": keyword,
    "type": "search",
    "ll": f"@{latitude},{longitude},12z",
    "api_key": settings.serpapi_api_key,
    }

    try:
        search = GoogleSearch(params)
        results = search.get_dict()
    except Exception as exc:
        raise SerpAPIError(f"SerpApi request failed: {exc}") from exc

    if results.get("error"):
        raise SerpAPIError(results["error"])

    local_results = results.get("local_results", [])

    return [
        _result_to_lead(result, index)
        for index, result in enumerate(local_results[:target], start=1)
    ]
