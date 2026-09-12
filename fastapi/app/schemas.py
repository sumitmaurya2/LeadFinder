from pydantic import BaseModel, Field


class SearchRequest(BaseModel):
    keyword: str = Field(min_length=2, max_length=120)
    query: str | None = None
    business_type: str | None = None
    location: str = Field(min_length=2, max_length=160)
    country: str = Field(min_length=2, max_length=100)
    limit: int = Field(default=20, ge=1, le=100)
    max_results: int | None = Field(default=None, ge=1, le=100)


class Lead(BaseModel):
    place_id: str
    name: str
    address: str | None = None
    phone: str | None = None
    website: str | None = None
    category: str | None = None
    rating: float | None = None
    reviews: int = 0
    business_status: str = "OPERATIONAL"
    latitude: float | None = None
    longitude: float | None = None
    maps_url: str | None = None


class SearchResponse(BaseModel):
    results: list[Lead]
