"""
YouTube Data API v3 Service
===========================
Wraps Google's YouTube Data API v3 to search for legal explainer videos
relevant to Indian law topics. Adapted from api-samples-master/python/search.py.

Usage:
    from AILegal.youtube_service import search_youtube_legal_videos
    videos = search_youtube_legal_videos("IPC Section 420 cheating India")
"""

import os
import logging

logger = logging.getLogger(__name__)

YOUTUBE_API_SERVICE_NAME = 'youtube'
YOUTUBE_API_VERSION = 'v3'


def _get_api_key():
    return os.environ.get('YOUTUBE_API_KEY') or os.environ.get('GEMINI_API_KEY', '')


def search_youtube_legal_videos(query: str, max_results: int = 4, language: str = None) -> list:
    """
    Search YouTube for legal explainer videos matching the query.

    Args:
        query:       The legal topic to search for (e.g. "IPC Section 302 India")
        max_results: Maximum number of videos to return (default 4)
        language:    Optional BCP-47 language code ('hi' for Hindi, 'en' for English)

    Returns:
        List of dicts with keys:
            video_id, title, description, thumbnail_url, channel_title, video_url, published_at
        Falls back to a list with one search-link entry if the API call fails.
    """
    api_key = _get_api_key()
    if not api_key:
        logger.warning("YOUTUBE_API_KEY not configured - returning fallback search link.")
        return _fallback_results(query)

    try:
        from googleapiclient.discovery import build
        from googleapiclient.errors import HttpError

        youtube = build(
            YOUTUBE_API_SERVICE_NAME,
            YOUTUBE_API_VERSION,
            developerKey=api_key,
            cache_discovery=False,
        )

        search_term = f"{query} India law legal explained"

        search_kwargs = dict(
            q=search_term,
            part='id,snippet',
            type='video',
            maxResults=max_results,
            order='relevance',
            safeSearch='moderate',
            videoEmbeddable='true',
        )
        if language:
            search_kwargs['relevanceLanguage'] = language

        response = youtube.search().list(**search_kwargs).execute()

        videos = []
        for item in response.get('items', []):
            if item.get('id', {}).get('kind') != 'youtube#video':
                continue
            video_id = item['id']['videoId']
            snippet  = item.get('snippet', {})
            thumbnails = snippet.get('thumbnails', {})
            thumb = (
                thumbnails.get('high', {}).get('url')
                or thumbnails.get('medium', {}).get('url')
                or thumbnails.get('default', {}).get('url')
                or ''
            )
            videos.append({
                'video_id':      video_id,
                'title':         snippet.get('title', ''),
                'description':   snippet.get('description', '')[:200],
                'thumbnail_url': thumb,
                'channel_title': snippet.get('channelTitle', ''),
                'video_url':     f'https://www.youtube.com/watch?v={video_id}',
                'published_at':  snippet.get('publishedAt', ''),
            })

        if not videos:
            return _fallback_results(query)

        return videos

    except Exception as exc:
        logger.error("YouTube API error: %s", exc)
        return _fallback_results(query)


def _fallback_results(query: str) -> list:
    """Return a single fallback entry pointing to a YouTube search URL."""
    from urllib.parse import quote_plus
    search_url = f"https://www.youtube.com/results?search_query={quote_plus(query + ' India law')}"
    return [{
        'video_id':      None,
        'title':         f'Search YouTube: {query} - India Law',
        'description':   'Click to search YouTube for related legal explainer videos.',
        'thumbnail_url': '',
        'channel_title': 'YouTube Search',
        'video_url':     search_url,
        'published_at':  '',
        'is_fallback':   True,
    }]
