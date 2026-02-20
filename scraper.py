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
CONCURRENT_VIDEOS_PER_CHANNEL = 20
MAX_VIDEOS_PER_CHANNEL = 100

# Your channel URLs
CHANNELS = [

    "https://www.youtube.com/@DramaManiia/videos",
    "https://www.youtube.com/@DramaDiariese/videos",
    "https://www.youtube.com/@DramaChronicleess/videos",
    "https://www.youtube.com/@DramaSecretsss/videos",
    "https://www.youtube.com/@DramaSpotlighhtt/videos",
    "https://www.youtube.com/@DramaaCraazee/videos",
    "https://www.youtube.com/@DramaCenntrall/videos",
    "https://www.youtube.com/@SenthilLearn/videos",
    "https://www.youtube.com/@AnupamThoughts/videos",
    "https://www.youtube.com/@KannanGyaanam/videos"
]
def get_headers():
    return {
        'accept': '*/*',
        'accept-language': 'en-US,en;q=0.9',
        'content-type': 'application/json',
        'origin': 'https://www.youtube.com',
        'referer': 'https://www.youtube.com/',
        'user-agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
        'x-youtube-client-name': '1',
        'x-youtube-client-version': CLIENT_VERSION
    }

def collect_all_text_from_runs(obj):
    """Collect text from YouTube's 'runs' structure"""
    if not obj:
        return ""
    
    if isinstance(obj, str):
        return obj
    
    if isinstance(obj, dict):
        # Check for simpleText
        if 'simpleText' in obj:
            return obj['simpleText']
        
        # Check for runs
        if 'runs' in obj:
            runs = obj['runs']
            if isinstance(runs, list):
                return ''.join(run.get('text', '') for run in runs if isinstance(run, dict))
    
    return ""

def convert_abbrev_to_int(text):
    """Convert abbreviated numbers like '1.2K', '5M' to integers"""
    if not text:
        return None
    
    # Extract number and suffix
    match = re.search(r'([\d,.]+)\s*([KMB])?', str(text), re.IGNORECASE)
    if not match:
        return None
    
    try:
        num_str = match.group(1).replace(',', '')
        num = float(num_str)
        suffix = match.group(2)
        
        if suffix:
            suffix = suffix.upper()
            if suffix == 'K':
                num *= 1000
            elif suffix == 'M':
                num *= 1000000
            elif suffix == 'B':
                num *= 1000000000
        
        return int(num)
    except:
        return None

def extract_browse_id_and_videos(channel_url, content_type):
    """Extract browseId and initial videos from channel page HTML"""
    try:
        response = requests.get(channel_url, headers=get_headers(), timeout=15)
        response.raise_for_status()
        html = response.text
        
        # Extract browseId
        browse_id = None
        match = re.search(r'"browseId":"(UC[a-zA-Z0-9_-]+)"', html)
        if match:
            browse_id = match.group(1)
        else:
            match = re.search(r'"channelId":"(UC[a-zA-Z0-9_-]+)"', html)
            if match:
                browse_id = match.group(1)
        
        if not browse_id:
            print(f"  ❌ Could not find browseId for {channel_url}")
            return None, set()
        
        print(f"  ✓ Found browseId: {browse_id}")
        
        # Extract initial data from HTML
        video_ids = set()
        
        match = re.search(r'var ytInitialData = ({.*?});', html)
        if match:
            try:
                initial_data = json.loads(match.group(1))
                videos = extract_videos_from_data(initial_data)
                video_ids = {v['video_id'] for v in videos}
                print(f"  ✓ Extracted {len(video_ids)} unique videos from HTML")
            except Exception as e:
                print(f"  ⚠ Error parsing ytInitialData: {e}")
        
        if content_type == 'shorts' and len(video_ids) == 0:
            video_id_patterns = [
                r'"videoId":"([a-zA-Z0-9_-]{11})"',
                r'"contentId":"([a-zA-Z0-9_-]{11})"',
                r'/shorts/([a-zA-Z0-9_-]{11})',
            ]
            
            for pattern in video_id_patterns:
                matches = re.findall(pattern, html)
                video_ids.update(matches)
            
            if len(video_ids) > 0:
                print(f"  ✓ Found {len(video_ids)} shorts via regex patterns")
        
        return browse_id, video_ids
        
    except Exception as e:
        print(f"  ❌ Error fetching channel page: {e}")
        return None, set()

def extract_videos_from_data(data):
    """Extract video IDs from YouTube data structure"""
    video_ids = set()
    
    def search_dict(obj, depth=0):
        if depth > 20:
            return
            
        if isinstance(obj, dict):
            if 'videoRenderer' in obj:
                video_id = obj['videoRenderer'].get('videoId')
                if video_id:
                    video_ids.add(video_id)
                    return
            
            if 'reelItemRenderer' in obj:
                video_id = obj['reelItemRenderer'].get('videoId')
                if video_id:
                    video_ids.add(video_id)
                    return
            
            if 'richItemRenderer' in obj:
                content = obj['richItemRenderer'].get('content', {})
                
                video_renderer = content.get('videoRenderer', {})
                if video_renderer and video_renderer.get('videoId'):
                    video_ids.add(video_renderer['videoId'])
                    return
                
                reel_renderer = content.get('reelItemRenderer', {})
                if reel_renderer and reel_renderer.get('videoId'):
                    video_ids.add(reel_renderer['videoId'])
                    return
            
            if 'lockupViewModel' in obj:
                content_id = obj['lockupViewModel'].get('contentId')
                if content_id:
                    video_ids.add(content_id)
                    return
            
            for value in obj.values():
                search_dict(value, depth + 1)
        elif isinstance(obj, list):
            for item in obj:
                search_dict(item, depth + 1)
    
    search_dict(data)
    return [{'video_id': vid} for vid in video_ids]

def get_all_channel_videos(channel_url, content_type):
    """Get ALL video IDs from a channel using pagination"""
    browse_id, initial_videos = extract_browse_id_and_videos(channel_url, content_type)
    
    if not browse_id:
        return []
    
    all_videos = [{'video_id': vid} for vid in initial_videos]
    continuation_token = None
    
    params = "EgZ2aWRlb3PyBgQKAjoA" if content_type == 'videos' else "EgZzaG9ydHPyBgUKA5oBAA%3D%3D"
    
    try:
        payload = {
            "context": {
                "client": {
                    "clientName": "WEB",
                    "clientVersion": CLIENT_VERSION,
                    "hl": "en",
                    "gl": "US"
                }
            },
            "browseId": browse_id,
            "params": params
        }
        
        response = requests.post(
            f"https://www.youtube.com/youtubei/v1/browse?key={YOUTUBE_KEY}",
            headers=get_headers(),
            json=payload,
            timeout=15
        )
        
        if response.ok:
            data = response.json()
            new_videos = extract_videos_from_data(data)
            
            existing_ids = {v['video_id'] for v in all_videos}
            for video in new_videos:
                if video['video_id'] not in existing_ids:
                    all_videos.append(video)
                    existing_ids.add(video['video_id'])
            
            print(f"  ✓ Total videos so far: {len(all_videos)}")
        
        def find_continuation(obj):
            if isinstance(obj, dict):
                if 'continuationCommand' in obj:
                    return obj['continuationCommand'].get('token')
                for value in obj.values():
                    result = find_continuation(value)
                    if result:
                        return result
            elif isinstance(obj, list):
                for item in obj:
                    result = find_continuation(item)
                    if result:
                        return result
            return None
        
        continuation_token = find_continuation(data) if response.ok else None
        
        page = 2
        while continuation_token and len(all_videos) < MAX_VIDEOS_PER_CHANNEL:
            print(f"  → Fetching page {page}...")
            
            payload = {
                "context": {
                    "client": {
                        "clientName": "WEB",
                        "clientVersion": CLIENT_VERSION
                    }
                },
                "continuation": continuation_token
            }
            
            try:
                response = requests.post(
                    f"https://www.youtube.com/youtubei/v1/browse?key={YOUTUBE_KEY}",
                    headers=get_headers(),
                    json=payload,
                    timeout=15
                )
                
                if not response.ok:
                    break
                
                data = response.json()
                new_videos = extract_videos_from_data(data)
                
                if not new_videos:
                    break
                
                existing_ids = {v['video_id'] for v in all_videos}
                added = 0
                for video in new_videos:
                    if video['video_id'] not in existing_ids:
                        all_videos.append(video)
                        existing_ids.add(video['video_id'])
                        added += 1
                
                print(f"  ✓ Added {added} videos, total: {len(all_videos)}")
                
                if added == 0:
                    break
                
                continuation_token = find_continuation(data)
                page += 1
                
                time.sleep(0.5)
                
            except Exception as e:
                print(f"  ⚠ Pagination error: {e}")
                break
    
    except Exception as e:
        print(f"  ❌ Error in pagination: {e}")
    
    print(f"  ✓ Final count: {len(all_videos)} videos")
    return all_videos

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
            if not resp.ok:
                return None
                
            data = await resp.json()
            
            # Extract engagement panels
            engagement_panels = data.get("engagementPanels", [])
            video_desc_header = None
            
            for panel in engagement_panels:
                if isinstance(panel, dict):
                    section_list = panel.get("engagementPanelSectionListRenderer", {})
                    if section_list:
                        content = section_list.get("content", {})
                        structured_desc = content.get("structuredDescriptionContentRenderer", {})
                        if structured_desc:
                            items = structured_desc.get("items", [])
                            for item in items:
                                if "videoDescriptionHeaderRenderer" in item:
                                    video_desc_header = item["videoDescriptionHeaderRenderer"]
                                    break
                            if video_desc_header:
                                break
            
            # Extract video details
            results = data.get('contents', {}).get('twoColumnWatchNextResults', {}).get('results', {}).get('results', {}).get('contents', [])
            
            if len(results) < 2:
                return None
            
            primary_info = results[0].get('videoPrimaryInfoRenderer', {})
            secondary_info = results[1].get('videoSecondaryInfoRenderer', {})
            
            # Title
            title = None
            title_runs = primary_info.get('title', {})
            title = collect_all_text_from_runs(title_runs)
            
            # Views
            views = 0
            view_count = primary_info.get('viewCount', {}).get('videoViewCountRenderer', {}).get('viewCount', {})
            view_text = collect_all_text_from_runs(view_count)
            if view_text:
                views = convert_abbrev_to_int(view_text) or 0
            
            # Likes - WORKING EXTRACTION METHOD
            likes = 0
            try:
                # Method 1: Try from video description header factoids (most reliable)
                if video_desc_header:
                    factoids = video_desc_header.get("factoid", [])
                    for factoid in factoids:
                        if isinstance(factoid, dict):
                            factoid_renderer = factoid.get("factoidRenderer")
                            if factoid_renderer:
                                label = factoid_renderer.get("label", {})
                                label_text = collect_all_text_from_runs(label).lower()
                                
                                if "like" in label_text:
                                    value = factoid_renderer.get("value", {})
                                    value_text = collect_all_text_from_runs(value)
                                    if value_text:
                                        likes = convert_abbrev_to_int(value_text) or 0
                                        if likes > 0:
                                            break
                
                # Method 2: Fallback to toggle button
                if likes == 0:
                    actions = primary_info.get("videoActions", {}).get("menuRenderer", {}).get("topLevelButtons", [])
                    for action in actions:
                        if isinstance(action, dict):
                            toggle_button = action.get("toggleButtonRenderer", {})
                            if toggle_button:
                                default_text = toggle_button.get("defaultText", {})
                                accessibility = default_text.get("accessibility", {})
                                if accessibility:
                                    access_data = accessibility.get("accessibilityData", {})
                                    label = access_data.get("label", "")
                                    if "like" in label.lower():
                                        likes = convert_abbrev_to_int(label) or 0
                                        if likes > 0:
                                            break
            except Exception as e:
                print(f"  ⚠ Error extracting likes for {video_id}: {str(e)}")
                likes = 0
            
            # Comments
            comments = 0
            for panel in engagement_panels:
                if isinstance(panel, dict):
                    panel_renderer = panel.get('engagementPanelSectionListRenderer', {})
                    if 'comments' in panel_renderer.get('panelIdentifier', '').lower():
                        header = panel_renderer.get('header', {}).get('engagementPanelTitleHeaderRenderer', {})
                        contextual = header.get('contextualInfo', {})
                        comment_text = collect_all_text_from_runs(contextual)
                        if comment_text:
                            comments = convert_abbrev_to_int(comment_text) or 0
            
            # Channel info
            channel_name = None
            owner = secondary_info.get('owner', {}).get('videoOwnerRenderer', {})
            channel_title = owner.get('title', {})
            channel_name = collect_all_text_from_runs(channel_title)
            
            channel_id = owner.get('navigationEndpoint', {}).get('browseEndpoint', {}).get('browseId')
            
            # Subscribers
            subscribers = 0
            sub_text = owner.get('subscriberCountText', {})
            sub_str = collect_all_text_from_runs(sub_text)
            if sub_str:
                subscribers = convert_abbrev_to_int(sub_str) or 0
            
            # Date
            date_posted = primary_info.get('dateText', {}).get('simpleText', 'Unknown')
            
            # Duration
            duration = None
            video_details = data.get('videoDetails', {})
            length_seconds = video_details.get('lengthSeconds')
            if length_seconds:
                try:
                    seconds = int(length_seconds)
                    hours = seconds // 3600
                    minutes = (seconds % 3600) // 60
                    secs = seconds % 60
                    if hours > 0:
                        duration = f"{hours:02d}:{minutes:02d}:{secs:02d}"
                    else:
                        duration = f"{minutes:02d}:{secs:02d}"
                except:
                    duration = "Unknown"
            
            return {
                "video_id": video_id,
                "title": title or "Unknown",
                "views": views,
                "likes": likes,
                "comments": comments,
                "duration": duration or "Unknown",
                "date_posted": date_posted,
                "subscribers": subscribers,
                "channel_name": channel_name or "Unknown",
                "channel_id": channel_id,
                "channel_url": f"https://www.youtube.com/channel/{channel_id}" if channel_id else None,
                "video_url": f"https://www.youtube.com/watch?v={video_id}",
                "thumbnail": f"https://i.ytimg.com/vi/{video_id}/hqdefault.jpg"
            }
    except Exception as e:
        print(f"  ⚠ Error fetching video {video_id}: {str(e)[:50]}")
        return None

async def process_channel(session, channel_url):
    """Process a single channel and get all video details"""
    content_type = 'shorts' if '/shorts' in channel_url else 'videos'
    
    print(f"\n{'='*60}")
    print(f"📺 Processing: {channel_url}")
    print(f"{'='*60}")
    
    # Step 1: Get ALL video IDs from channel
    video_list = get_all_channel_videos(channel_url, content_type)
    
    if not video_list:
        print(f"  ❌ No videos found")
        return []
    
    print(f"\n  🎬 Fetching details for {len(video_list)} videos...")
    
    # Step 2: Fetch details concurrently
    semaphore = asyncio.Semaphore(CONCURRENT_VIDEOS_PER_CHANNEL)
    
    async def fetch_with_semaphore(video):
        async with semaphore:
            video_id = video['video_id'] if isinstance(video, dict) else video
            result = await fetch_video_details(session, video_id)
            if result:
                print(".", end="", flush=True)
            return result
    
    tasks = [fetch_with_semaphore(video) for video in video_list]
    results = await asyncio.gather(*tasks)
    
    print()
    
    valid_results = [r for r in results if r is not None]
    print(f"  ✅ Successfully fetched {len(valid_results)}/{len(video_list)} videos")
    
    return valid_results

async def scrape_all_channels():
    """Scrape all channels concurrently"""
    print(f"\n{'='*60}")
    print(f"🚀 Starting YouTube Stats Scraper")
    print(f"{'='*60}")
    print(f"⏰ Time: {datetime.now()}")
    print(f"📊 Channels: {len(CHANNELS)}")
    print(f"⚙️  Concurrency: {CONCURRENT_VIDEOS_PER_CHANNEL} videos/channel")
    print(f"{'='*60}\n")
    
    headers = get_headers()
    connector = aiohttp.TCPConnector(limit=100, limit_per_host=30)
    timeout = aiohttp.ClientTimeout(total=120, connect=30)
    
    async with aiohttp.ClientSession(headers=headers, connector=connector, timeout=timeout) as session:
        tasks = [process_channel(session, channel) for channel in CHANNELS]
        all_results = await asyncio.gather(*tasks)
    
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
    
    print(f"\n{'='*60}")
    print(f"✅ SCRAPING COMPLETE!")
    print(f"{'='*60}")
    print(f"📊 Total videos scraped: {len(all_videos)}")
    print(f"💾 Data saved to: youtube_stats.json")
    print(f"⏰ Completed at: {datetime.now()}")
    print(f"{'='*60}\n")
    
    return output

if __name__ == "__main__":
    asyncio.run(scrape_all_channels())
