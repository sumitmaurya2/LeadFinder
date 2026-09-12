from fastapi import APIRouter, Header, HTTPException

from app.config import settings
from app.schemas import SearchRequest, SearchResponse
from app.services.serpapi import SerpAPIError, search_places

router = APIRouter(prefix="/search", tags=["leads"])


def _check_api_key(
    authorization: str | None,
    x_api_key: str | None,
) -> None:
    # If no key is configured, fail closed rather than exposing the service.
    if not settings.api_key:
        raise HTTPException(status_code=503, detail="LEADS_API_KEY is not configured")

    bearer = ""
    if authorization and authorization.lower().startswith("bearer "):
        bearer = authorization[7:].strip()

    supplied = x_api_key or bearer
    if supplied != settings.api_key:
        raise HTTPException(status_code=401, detail="Invalid API key")


@router.post("", response_model=SearchResponse)
async def search(
    payload: SearchRequest,
    authorization: str | None = Header(default=None),
    x_api_key: str | None = Header(default=None),
) -> SearchResponse:
    _check_api_key(authorization, x_api_key)

    limit = payload.max_results or payload.limit

    try:
       results = await search_places(
       keyword=payload.keyword,
       location=payload.location,
       country=payload.country,
       limit=limit,
     )
    except SerpAPIError as exc:
        raise HTTPException(status_code=502, detail=str(exc)) from exc

    return SearchResponse(results=results)
