from typing import Optional, Any
import httpx
from app.config import settings

class UpstashRedisClient:
    """
    Asynchronous Redis client mapping GET, SET, and DEL commands to the
    Upstash REST API via HTTP.
    """
    def __init__(self, url: str, token: str):
        self.url = url.rstrip("/")
        self.headers = {
            "Authorization": f"Bearer {token}"
        }
        self.client: Optional[httpx.AsyncClient] = None

    async def get_client(self) -> httpx.AsyncClient:
        if self.client is None or self.client.is_closed:
            self.client = httpx.AsyncClient(base_url=self.url, headers=self.headers)
        return self.client

    async def close(self) -> None:
        if self.client is not None and not self.client.is_closed:
            await self.client.aclose()
            self.client = None

    async def execute(self, command: list) -> Any:
        """
        Executes a raw Redis command as a JSON array POST to the Upstash endpoint.
        """
        client = await self.get_client()
        try:
            response = await client.post("/", json=command)
            response.raise_for_status()
            data = response.json()
            if "error" in data:
                raise RuntimeError(f"Redis error: {data['error']}")
            return data.get("result")
        except httpx.HTTPError as e:
            raise RuntimeError(f"HTTP request to Upstash Redis failed: {e}") from e

    async def get(self, key: str) -> Optional[str]:
        """
        Retrieve the value of a key.
        """
        result = await self.execute(["GET", key])
        return result

    async def set(self, key: str, value: str, ex: Optional[int] = None) -> bool:
        """
        Set key to hold the string value, optionally with an expiration (in seconds).
        """
        cmd = ["SET", key, value]
        if ex is not None:
            cmd.extend(["EX", str(ex)])
        result = await self.execute(cmd)
        return result == "OK"

    async def delete(self, key: str) -> bool:
        """
        Delete a key. Returns True if the key was deleted, False otherwise.
        """
        result = await self.execute(["DEL", key])
        return bool(result)

# Singleton client instance
redis_client = UpstashRedisClient(settings.REDIS_URL, settings.REDIS_TOKEN)
