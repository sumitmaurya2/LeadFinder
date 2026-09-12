from functools import lru_cache
import os

from dotenv import load_dotenv

load_dotenv()


class Settings:
    app_name: str = "LeadFinder Leads API"
    api_key: str = os.getenv("LEADS_API_KEY", "")
    serpapi_api_key: str = os.getenv("SERPAPI_API_KEY", "")
    host: str = os.getenv("HOST", "0.0.0.0")
    port: int = int(os.getenv("PORT", "8000"))
    max_results: int = int(os.getenv("MAX_RESULTS", "100"))


@lru_cache
def get_settings() -> Settings:
    return Settings()


settings = get_settings()
