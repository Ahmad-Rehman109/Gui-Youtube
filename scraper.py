import requests
import json
import re
import asyncio
import aiohttp
import time
from typing import List, Dict, Optional
from datetime import datetime

# Configuration
YOUTUBE_KEY = "AIzaSyAO_FJ2SlqU8Q4STEHLGCilw_Y9_11qcW8"
CLIENT_VERSION = "2.20251125.06.00"
CONCURRENT_VIDEOS_PER_CHANNEL = 30
VIDEOS_TO_FETCH = 30

# Your channel URLs
CHANNELS = [
    "https://www.youtube.com/@CatMania-01/videos",
    "https://www.youtube.com/@CatMania-01/shorts",
    "https://www.youtube.com/@AssasinoMania/shorts",
    "https://www.youtube.com/@Brainrotassasino-t4u/shorts",
    "https://www.youtube.com/@AhmadRehman-x9l/shorts",
    "https://www.youtube.com/@BrainrotCappucino-f7i/shorts",
    "https://www.youtube.com/@CuteCatDance-u7t/shorts",
    "https://www.youtube.com/@ForgottenAmerica-01/videos"
]

def get_headers():
    return {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://www.youtube.com',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
        'x-youtube-client-name': '1',
        'x-youtube-client-version': CLIENT_VERSION
    }

def get_context(referer_url):
    return {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": CLIENT_VERSION,
                "hl": "en",
                "gl": "US",
                "platform": "DESKTOP"
            }
        }
    }

def extract_browse_id(channel_url):
    """Extract browseId from channel page"""
    try:
        response = requests.get(channel_url, headers=get_headers())
        response.raise_for_status()
        
        match = re.search(r'"browseId":"(UC[a-zA-Z0-9_-]+)"', response.text)
        if match:
            return match.group(1)
        
        match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', response.text)
        if match:
            return match.group(1)
    except Exception as e:
        print(f"Error extracting browseId: {e}")
    return None

def extract_video_metadata(video_renderer):
    """Extract video metadata from renderer"""
    metadata = {
        'video_id': video_renderer.get('videoId'),
        'title': 'Unknown',
        'duration': None
    }
    
    try:
        # Title
        title_runs = video_renderer.get('title', {}).get('runs', [])
        if title_runs:
            metadata['title'] = title_runs[0].get('text', 'Unknown')
        
        # Duration
        duration_text = video_renderer.get('lengthText', {})
        if duration_text:
            metadata['duration'] = duration_text.get('simpleText')
    except:
        pass
    
    return metadata

def get_channel_video_urls(channel_url, content_type):
    """Get first 30 video URLs from channel"""
    browse_id = extract_browse_id(channel_url)
    if not browse_id:
        return []
    
    params = "EgZ2aWRlb3PyBgQKAjoA" if content_type == 'videos' else "EgZzaG9ydHPyBgUKA5oBAA%3D%3D"
    
    payload = get_context(channel_url)
    payload['browseId'] = browse_id
    payload['params'] = params
    
    try:
        response = requests.post(
            f"https://www.youtube.com/youtubei/v1/browse?key={YOUTUBE_KEY}",
            headers=get_headers(),
            json=payload
        )
        response.raise_for_status()
        data = response.json()
        
        videos = []
        tabs = data.get('contents', {}).get('twoColumnBrowseResultsRenderer', {}).get('tabs', [])
        
        for tab in tabs:
            content = tab.get('tabRenderer', {}).get('content', {})
            
            # Handle richGridRenderer (videos/shorts)
            if 'richGridRenderer' in content:
                contents = content['richGridRenderer'].get('contents', [])
                for item in contents:
                    if 'richItemRenderer' in item:
                        video_renderer = item['richItemRenderer'].get('content', {}).get('videoRenderer', {})
                        if video_renderer:
                            metadata = extract_video_metadata(video_renderer)
                            if metadata['video_id']:
                                videos.append(metadata)
                    elif 'reelItemRenderer' in item:
                        reel = item['reelItemRenderer']
                        videos.append({
                            'video_id': reel.get('videoId'),
                            'title': reel.get('headline', {}).get('simpleText', 'Unknown'),
                            'duration': 'Short'
                        })
        
        return videos[:VIDEOS_TO_FETCH]
    except Exception as e:
        print(f"Error fetching channel videos: {e}")
        return []

async def fetch_video_details(session, video_id):
    """Fetch full details for a single video"""
    url = f"https://www.youtube.com/youtubei/v1/next?key={YOUTUBE_KEY}"
    
    payload = {
        "context": {
            "client": {
                "clientName": "WEB",
                "clientVersion": CLIENT_VERSION
            }
        },
        "videoId": video_id
    }
    
    try:
        async with session.post(url, json=payload) as resp:
            resp.raise_for_status()
            data = await resp.json()
            
            # Extract data
            primary_info = data.get('contents', {}).get('twoColumnWatchNextResults', {}).get('results', {}).get('results', {}).get('contents', [{}])[0].get('videoPrimaryInfoRenderer', {})
            secondary_info = data.get('contents', {}).get('twoColumnWatchNextResults', {}).get('results', {}).get('results', {}).get('contents', [{}])[1].get('videoSecondaryInfoRenderer', {}).get('owner', {}).get('videoOwnerRenderer', {})
            
            # Title
            title = None
            title_runs = primary_info.get('title', {}).get('runs', [])
            if title_runs:
                title = title_runs[0].get('text')
            
            # Views
            views = None
            view_count = primary_info.get('viewCount', {}).get('videoViewCountRenderer', {}).get('viewCount', {})
            view_text = view_count.get('simpleText', '')
            if view_text:
                views = int(re.sub(r'[^\d]', '', view_text.split()[0]))
            
            # Likes
            likes = None
            actions = primary_info.get('videoActions', {}).get('menuRenderer', {}).get('topLevelButtons', [])
            for action in actions:
                toggle = action.get('toggleButtonRenderer', {})
                if toggle:
                    default_text = toggle.get('defaultText', {}).get('accessibility', {}).get('accessibilityData', {}).get('label', '')
                    if 'like' in default_text.lower():
                        match = re.search(r'[\d,]+', default_text)
                        if match:
                            likes = int(match.group().replace(',', ''))
            
            # Comments
            comments = None
            engagement = data.get('engagementPanels', [])
            for panel in engagement:
                panel_renderer = panel.get('engagementPanelSectionListRenderer', {})
                if 'comments' in panel_renderer.get('panelIdentifier', '').lower():
                    header = panel_renderer.get('header', {}).get('engagementPanelTitleHeaderRenderer', {})
                    contextual = header.get('contextualInfo', {})
                    if contextual:
                        runs = contextual.get('runs', [])
                        if runs:
                            comment_text = runs[0].get('text', '')
                            match = re.search(r'[\d,]+', comment_text)
                            if match:
                                comments = int(match.group().replace(',', ''))
            
            # Channel info
            channel_name = None
            channel_title = secondary_info.get('title', {}).get('runs', [])
            if channel_title:
                channel_name = channel_title[0].get('text')
            
            channel_id = secondary_info.get('navigationEndpoint', {}).get('browseEndpoint', {}).get('browseId')
            
            # Subscribers
            subscribers = None
            sub_text = secondary_info.get('subscriberCountText', {}).get('simpleText', '')
            if sub_text:
                match = re.search(r'([\d.]+)([KMB])?', sub_text)
                if match:
                    num = float(match.group(1))
                    suffix = match.group(2)
                    if suffix == 'K':
                        subscribers = int(num * 1000)
                    elif suffix == 'M':
                        subscribers = int(num * 1000000)
                    elif suffix == 'B':
                        subscribers = int(num * 1000000000)
                    else:
                        subscribers = int(num)
            
            # Date
            date_posted = None
            date_text = primary_info.get('dateText', {}).get('simpleText')
            if date_text:
                date_posted = date_text
            
            # Duration from videoDetails
            duration = None
            video_details = data.get('videoDetails', {})
            length_seconds = video_details.get('lengthSeconds')
            if length_seconds:
                seconds = int(length_seconds)
                hours = seconds // 3600
                minutes = (seconds % 3600) // 60
                secs = seconds % 60
                if hours > 0:
                    duration = f"{hours:02d}:{minutes:02d}:{secs:02d}"
                else:
                    duration = f"{minutes:02d}:{secs:02d}"
            
            return {
                "video_id": video_id,
                "title": title,
                "views": views,
                "likes": likes,
                "comments": comments,
                "duration": duration,
                "date_posted": date_posted,
                "subscribers": subscribers,
                "channel_name": channel_name,
                "channel_id": channel_id,
                "channel_url": f"https://www.youtube.com/channel/{channel_id}" if channel_id else None,
                "video_url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            }
    except Exception as e:
        print(f"Error fetching video {video_id}: {e}")
        return None

async def process_channel(session, channel_url):
    """Process a single channel and get all video details"""
    content_type = 'shorts' if '/shorts' in channel_url else 'videos'
    
    # Step 1: Get video URLs (synchronous, single request)
    print(f"Fetching videos from {channel_url}...")
    video_urls = get_channel_video_urls(channel_url, content_type)
    
    if not video_urls:
        print(f"No videos found for {channel_url}")
        return []
    
    print(f"Found {len(video_urls)} videos, fetching details...")
    
    # Step 2: Fetch details for all videos (concurrent, 30 at a time)
    semaphore = asyncio.Semaphore(CONCURRENT_VIDEOS_PER_CHANNEL)
    
    async def fetch_with_semaphore(video):
        async with semaphore:
            return await fetch_video_details(session, video['video_id'])
    
    tasks = [fetch_with_semaphore(video) for video in video_urls]
    results = await asyncio.gather(*tasks)
    
    # Filter out None results
    valid_results = [r for r in results if r is not None]
    print(f"Successfully fetched {len(valid_results)} video details from {channel_url}")
    
    return valid_results

async def scrape_all_channels():
    """Scrape all channels concurrently"""
    print(f"Starting scrape at {datetime.now()}")
    print(f"Processing {len(CHANNELS)} channels...")
    
    headers = get_headers()
    connector = aiohttp.TCPConnector(limit=100)
    timeout = aiohttp.ClientTimeout(total=60)
    
    async with aiohttp.ClientSession(headers=headers, connector=connector, timeout=timeout) as session:
        # Process all channels concurrently
        tasks = [process_channel(session, channel) for channel in CHANNELS]
        all_results = await asyncio.gather(*tasks)
    
    # Flatten results
    all_videos = []
    for channel_results in all_results:
        all_videos.extend(channel_results)
    
    # Save to JSON
    output = {
        "last_updated": datetime.now().isoformat(),
        "total_videos": len(all_videos),
        "total_channels": len(CHANNELS),
        "videos": all_videos
    }
    
    with open('youtube_stats.json', 'w', encoding='utf-8') as f:
        json.dump(output, f, indent=2, ensure_ascii=False)
    
    print(f"\nScraping complete!")
    print(f"Total videos scraped: {len(all_videos)}")
    print(f"Data saved to youtube_stats.json")
    
    return output

if __name__ == "__main__":
    asyncio.run(scrape_all_channels())
