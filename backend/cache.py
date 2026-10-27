import os

from dotenv import load_dotenv
from redis.asyncio import Redis

load_dotenv()

redis = Redis.from_url(os.getenv("REDIS_URL", "redis://localhost:6379/0"), decode_responses=True)
