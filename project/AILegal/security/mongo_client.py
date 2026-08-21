"""MongoDB client for security logs and high-volume audit storage."""

import logging
import os
from typing import Any, Optional

logger = logging.getLogger(__name__)

_client = None
_db = None


def get_mongo_db():
    """Return MongoDB database handle; falls back gracefully if unavailable."""
    global _client, _db
    if _db is not None:
        return _db

    uri = os.environ.get('MONGO_URI', 'mongodb://localhost:27017/ai_legal_db')
    try:
        from pymongo import MongoClient
        _client = MongoClient(uri, serverSelectionTimeoutMS=3000)
        _client.admin.command('ping')
        db_name = uri.rsplit('/', 1)[-1].split('?')[0] or 'ai_legal_db'
        _db = _client[db_name]
        return _db
    except Exception as exc:
        logger.warning('MongoDB unavailable for security logging: %s', exc)
        return None


def insert_security_log(collection: str, document: dict[str, Any]) -> Optional[str]:
    db = get_mongo_db()
    if db is None:
        return None
    result = db[collection].insert_one(document)
    return str(result.inserted_id)


def query_security_logs(collection: str, filter_query: dict, limit: int = 100, skip: int = 0):
    db = get_mongo_db()
    if db is None:
        return []
    cursor = db[collection].find(filter_query).sort('timestamp', -1).skip(skip).limit(limit)
    return list(cursor)
