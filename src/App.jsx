import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, Eye, ThumbsUp, MessageCircle, Clock, Video, ArrowLeft, Calendar } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [view, setView] = useState('overview'); // 'overview', 'all-videos', 'channel-detail'
  const [error, setError] = useState(null);

  const DATA_URL = 'https://raw.githubusercontent.com/Ahmad-Rehman109/Gui-Youtube/main/youtube_stats.json';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL + '?t=' + Date.now());
      if (!response.ok) throw new Error('Failed to fetch data');
      const jsonData = await response.json();
      setData(jsonData);
    } catch (err) {
      setError(err.message);
      console.error('Error fetching data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const interval = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(interval);
  }, []);

  if (loading && !data) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="text-white text-xl">Loading dashboard...</div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 to-gray-800 flex items-center justify-center">
        <div className="bg-red-500/20 border border-red-500 rounded-lg p-6 max-w-md">
          <h2 className="text-red-400 text-xl font-bold mb-2">Error Loading Data</h2>
          <p className="text-gray-300 mb-4">{error}</p>
          <button 
            onClick={fetchData}
            className="bg-red-500 hover:bg-red-600 text-white px-4 py-2 rounded-lg"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  const videos = data?.videos || [];
  const channels = [...new Set(videos.map(v => v.channel_name))].filter(Boolean);
  
  const filteredVideos = selectedChannel === 'all' 
    ? videos 
    : videos.filter(v => v.channel_name === selectedChannel);

  // Calculate stats
  const totalViews = filteredVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = filteredVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalComments = filteredVideos.reduce((sum, v) => sum + (v.comments || 0), 0);
  const avgViews = filteredVideos.length > 0 ? Math.round(totalViews / filteredVideos.length) : 0;

  const channelStats = channels.map(channelName => {
    const channelVideos = videos.filter(v => v.channel_name === channelName);
    const views = channelVideos.reduce((sum, v) => sum + (v.views || 0), 0);
    const likes = channelVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
    return {
      name: channelName,
      videos: channelVideos.length,
      views,
      likes,
      avgViews: Math.round(views / channelVideos.length),
      subscribers: channelVideos[0]?.subscribers || 0
    };
  }).sort((a, b) => b.views - a.views);

  const formatNumber = (num) => {
    if (!num) return '0';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'K';
    return num.toLocaleString();
  };

  const formatDate = (dateStr) => {
    if (!dateStr) return 'Unknown';
    return dateStr;
  };

  // Parse date and get days ago
  const getDaysAgo = (dateStr) => {
    if (!dateStr) return null;
    const patterns = [
      { regex: /(\d+)\s+second/i, multiplier: 1/(24*60*60) },
      { regex: /(\d+)\s+minute/i, multiplier: 1/(24*60) },
      { regex: /(\d+)\s+hour/i, multiplier: 1/24 },
      { regex: /(\d+)\s+day/i, multiplier: 1 },
      { regex: /(\d+)\s+week/i, multiplier: 7 },
      { regex: /(\d+)\s+month/i, multiplier: 30 },
      { regex: /(\d+)\s+year/i, multiplier: 365 }
    ];
    
    for (const pattern of patterns) {
      const match = dateStr.match(pattern.regex);
      if (match) {
        return Math.floor(parseInt(match[1]) * pattern.multiplier);
      }
    }
    
    // Try parsing actual dates
    const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+),\s+(\d+)/);
    if (dateMatch) {
      const date = new Date(dateStr);
      const now = new Date();
      const diffTime = Math.abs(now - date);
      return Math.floor(diffTime / (1000 * 60 * 60 * 24));
    }
    
    return null;
  };

  // Generate 30-day chart data for a channel
  const get30DayChartData = (channelName) => {
    const channelVideos = videos.filter(v => v.channel_name === channelName);
    const dayData = {};
    
    // Initialize 30 days
    for (let i = 0; i < 30; i++) {
      dayData[i] = { day: i, views: 0, videos: 0 };
    }
    
    // Aggregate views by day
    channelVideos.forEach(video => {
      const daysAgo = getDaysAgo(video.date_posted);
      if (daysAgo !== null && daysAgo < 30) {
        dayData[daysAgo].views += video.views || 0;
        dayData[daysAgo].videos += 1;
      }
    });
    
    // Convert to array and reverse (oldest to newest)
    return Object.values(dayData).reverse().map((d, idx) => ({
      day: `Day ${idx + 1}`,
      views: d.views,
      videos: d.videos
    }));
  };

  // Generate all channels combined 30-day view data
  const getAllChannels30DayData = () => {
    const dayData = {};
    
    // Initialize 30 days
    for (let i = 0; i < 30; i++) {
      dayData[i] = { day: i, views: 0, videos: 0, likes: 0 };
    }
    
    // Aggregate data by day
    videos.forEach(video => {
      const daysAgo = getDaysAgo(video.date_posted);
      if (daysAgo !== null && daysAgo < 30) {
        dayData[daysAgo].views += video.views || 0;
        dayData[daysAgo].videos += 1;
        dayData[daysAgo].likes += video.likes || 0;
      }
    });
    
    // Convert to array and reverse (oldest to newest)
    return Object.values(dayData).reverse().map((d, idx) => ({
      day: `Day ${idx + 1}`,
      views: d.views,
      videos: d.videos,
      likes: d.likes
    }));
  };

  // Calculate engagement rate
  const engagementRate = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : 0;
  
  // Get top 5 performing videos
  const topVideos = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);
  
  // Calculate last 7 days stats
  const last7DaysVideos = videos.filter(v => {
    const daysAgo = getDaysAgo(v.date_posted);
    return daysAgo !== null && daysAgo < 7;
  });
  const last7DaysViews = last7DaysVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const last7DaysLikes = last7DaysVideos.reduce((sum, v) => sum + (v.likes || 0), 0);

  // Overview Page
  if (view === 'overview') {
    const allChannelsData = getAllChannels30DayData();
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                  <Video className="text-red-500" />
                  YouTube Analytics Dashboard
                </h1>
                <p className="text-gray-400 text-sm mt-1">
                  Last updated: {new Date(data?.last_updated).toLocaleString()}
                </p>
              </div>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2 transition-colors"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Quick Actions */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 mb-6">
            <button
              onClick={() => setView('all-videos')}
              className="bg-gradient-to-r from-purple-600 to-blue-600 hover:from-purple-700 hover:to-blue-700 text-white p-6 rounded-lg text-left transition-all"
            >
              <Video size={32} className="mb-2" />
              <h3 className="text-xl font-bold">View All Videos</h3>
              <p className="text-gray-200 text-sm mt-1">{videos.length} total videos</p>
            </button>
            
            <button
              onClick={() => {
                if (channels.length > 0) {
                  setSelectedChannel(channels[0]);
                  setView('channel-detail');
                }
              }}
              className="bg-gradient-to-r from-green-600 to-teal-600 hover:from-green-700 hover:to-teal-700 text-white p-6 rounded-lg text-left transition-all"
            >
              <TrendingUp size={32} className="mb-2" />
              <h3 className="text-xl font-bold">Channel Analytics</h3>
              <p className="text-gray-200 text-sm mt-1">{channels.length} channels tracked</p>
            </button>
          </div>

          {/* Stats Overview */}
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-blue-400 mb-2">
                <Video size={20} />
                <span className="text-sm font-medium">Total Videos</span>
              </div>
              <div className="text-2xl font-bold text-white">{videos.length}</div>
              <p className="text-xs text-gray-400 mt-1">{last7DaysVideos.length} in last 7 days</p>
            </div>

            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-purple-400 mb-2">
                <Eye size={20} />
                <span className="text-sm font-medium">Total Views</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(totalViews)}</div>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(last7DaysViews)} in last 7 days</p>
            </div>

            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-green-400 mb-2">
                <ThumbsUp size={20} />
                <span className="text-sm font-medium">Total Likes</span>
              </div>
              <div className="text-2xl font-bold text-white">{formatNumber(totalLikes)}</div>
              <p className="text-xs text-gray-400 mt-1">{formatNumber(last7DaysLikes)} in last 7 days</p>
            </div>

            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg p-4">
              <div className="flex items-center gap-2 text-red-400 mb-2">
                <TrendingUp size={20} />
                <span className="text-sm font-medium">Engagement Rate</span>
              </div>
              <div className="text-2xl font-bold text-white">{engagementRate}%</div>
              <p className="text-xs text-gray-400 mt-1">Likes/Views ratio</p>
            </div>
          </div>

          {/* 30-Day Views Trend - All Channels */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-blue-400" />
              Views & Uploads Over Last 30 Days (All Channels)
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={allChannelsData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="day" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis yAxisId="left" stroke="#9CA3AF" />
                <YAxis yAxisId="right" orientation="right" stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line 
                  yAxisId="left"
                  type="monotone" 
                  dataKey="views" 
                  stroke="#8B5CF6" 
                  strokeWidth={3}
                  name="Views"
                  dot={{ fill: '#8B5CF6', r: 4 }}
                />
                <Line 
                  yAxisId="right"
                  type="monotone" 
                  dataKey="videos" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Videos Posted"
                  dot={{ fill: '#10B981', r: 3 }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Top Performing Videos */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">🔥 Top 5 Performing Videos</h2>
            <div className="space-y-3">
              {topVideos.map((video, idx) => (
  
                  key={video.video_id}
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg p-4 transition-colors"
                >
                  <div className="flex gap-4">
                    <div className="flex-shrink-0">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-r from-yellow-400 to-orange-500 flex items-center justify-center font-bold text-gray-900">
                        {idx + 1}
                      </div>
                    </div>
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-32 h-20 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <h3 className="text-white font-medium line-clamp-1 mb-1">{video.title}</h3>
                      <p className="text-purple-400 text-sm mb-2">{video.channel_name}</p>
                      <div className="flex flex-wrap gap-3 text-sm">
                        <span className="text-blue-400 flex items-center gap-1">
                          <Eye size={14} />
                          {formatNumber(video.views)}
                        </span>
                        <span className="text-green-400 flex items-center gap-1">
                          <ThumbsUp size={14} />
                          {formatNumber(video.likes)}
                        </span>
                        <span className="text-gray-400 text-xs">
                          {formatDate(video.date_posted)}
                        </span>
                      </div>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>

          {/* Channel Performance Chart */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Channel Performance Comparison</h2>
            <ResponsiveContainer width="100%" height={300}>
              <BarChart data={channelStats}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="name" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={100}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Bar dataKey="views" fill="#8B5CF6" name="Total Views" />
                <Bar dataKey="likes" fill="#10B981" name="Total Likes" />
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Cards */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">Channels Overview</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
              {channelStats.map((channel) => {
                const channelEngagement = channel.views > 0 ? ((channel.likes / channel.views) * 100).toFixed(2) : 0;
                return (
                  <button
                    key={channel.name}
                    onClick={() => {
                      setSelectedChannel(channel.name);
                      setView('channel-detail');
                    }}
                    className="bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg p-4 text-left transition-colors"
                  >
                    <h3 className="text-white font-bold mb-2 line-clamp-1">{channel.name}</h3>
                    <div className="space-y-1 text-sm">
                      <p className="text-gray-400">Videos: <span className="text-white">{channel.videos}</span></p>
                      <p className="text-gray-400">Subscribers: <span className="text-purple-400">{formatNumber(channel.subscribers)}</span></p>
                      <p className="text-gray-400">Total Views: <span className="text-blue-400">{formatNumber(channel.views)}</span></p>
                      <p className="text-gray-400">Avg Views: <span className="text-green-400">{formatNumber(channel.avgViews)}</span></p>
                      <p className="text-gray-400">Engagement: <span className="text-yellow-400">{channelEngagement}%</span></p>
                    </div>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      </div>
    );
  }

  // All Videos View
  if (view === 'all-videos') {
    const sortedVideos = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0));
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('overview')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">All Videos</h1>
                  <p className="text-gray-400 text-sm">{videos.length} videos total</p>
                </div>
              </div>
              <button 
                onClick={fetchData}
                disabled={loading}
                className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
              >
                <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                Refresh
              </button>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="space-y-3">
            {sortedVideos.map((video, idx) => (
  
                key={`${video.video_id}-${idx}`}
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-800/50 hover:bg-gray-700/50 border border-gray-700 rounded-lg p-4 transition-colors"
              >
                <div className="flex gap-4">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-40 h-24 object-cover rounded flex-shrink-0"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2 mb-1">
                      <h3 className="text-white font-medium line-clamp-2">{video.title}</h3>
                      <span className="text-gray-400 text-sm flex-shrink-0">#{idx + 1}</span>
                    </div>
                    <p className="text-purple-400 text-sm mb-2">{video.channel_name}</p>
                    <div className="flex flex-wrap gap-4 text-sm">
                      <span className="text-blue-400 flex items-center gap-1">
                        <Eye size={14} />
                        {formatNumber(video.views)}
                      </span>
                      <span className="text-green-400 flex items-center gap-1">
                        <ThumbsUp size={14} />
                        {formatNumber(video.likes)}
                      </span>
                      <span className="text-yellow-400 flex items-center gap-1">
                        <MessageCircle size={14} />
                        {formatNumber(video.comments)}
                      </span>
                      <span className="text-gray-400 flex items-center gap-1">
                        <Clock size={14} />
                        {video.duration}
                      </span>
                    </div>
                    <p className="text-gray-500 text-xs mt-2">{formatDate(video.date_posted)}</p>
                  </div>
                </div>
              </a>
            ))}
          </div>
        </div>
      </div>
    );
  }

  // Channel Detail View
  if (view === 'channel-detail') {
    const channelVideos = videos.filter(v => v.channel_name === selectedChannel);
    const sortedChannelVideos = [...channelVideos].sort((a, b) => (b.views || 0) - (a.views || 0));
    const channelInfo = channelStats.find(c => c.name === selectedChannel);
    const chartData = get30DayChartData(selectedChannel);
    
    return (
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
        <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
          <div className="max-w-7xl mx-auto px-4 py-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-4">
                <button
                  onClick={() => setView('overview')}
                  className="text-gray-400 hover:text-white transition-colors"
                >
                  <ArrowLeft size={24} />
                </button>
                <div>
                  <h1 className="text-2xl font-bold text-white">{selectedChannel}</h1>
                  <p className="text-gray-400 text-sm">{formatNumber(channelInfo?.subscribers)} subscribers • {channelVideos.length} videos</p>
                </div>
              </div>
              <div className="flex gap-2">
                <select 
                  value={selectedChannel}
                  onChange={(e) => setSelectedChannel(e.target.value)}
                  className="bg-gray-700 text-white border border-gray-600 rounded-lg px-3 py-2 text-sm"
                >
                  {channels.map(channel => (
                    <option key={channel} value={channel}>{channel}</option>
                  ))}
                </select>
                <button 
                  onClick={fetchData}
                  disabled={loading}
                  className="bg-red-500 hover:bg-red-600 disabled:bg-gray-600 text-white px-4 py-2 rounded-lg flex items-center gap-2"
                >
                  <RefreshCw className={loading ? 'animate-spin' : ''} size={18} />
                </button>
              </div>
            </div>
          </div>
        </div>

        <div className="max-w-7xl mx-auto px-4 py-6">
          {/* Channel Stats */}
          <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
            <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
              <div className="text-blue-400 text-sm mb-1">Total Views</div>
              <div className="text-2xl font-bold text-white">{formatNumber(channelInfo?.views)}</div>
            </div>
            <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
              <div className="text-green-400 text-sm mb-1">Total Likes</div>
              <div className="text-2xl font-bold text-white">{formatNumber(channelInfo?.likes)}</div>
            </div>
            <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
              <div className="text-purple-400 text-sm mb-1">Avg Views</div>
              <div className="text-2xl font-bold text-white">{formatNumber(channelInfo?.avgViews)}</div>
            </div>
            <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg p-4">
              <div className="text-red-400 text-sm mb-1">Videos</div>
              <div className="text-2xl font-bold text-white">{channelVideos.length}</div>
            </div>
          </div>

          {/* 30-Day Views Chart */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4 flex items-center gap-2">
              <Calendar className="text-blue-400" />
              Views Over Last 30 Days
            </h2>
            <ResponsiveContainer width="100%" height={300}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#374151" />
                <XAxis 
                  dataKey="day" 
                  stroke="#9CA3AF"
                  angle={-45}
                  textAnchor="end"
                  height={80}
                />
                <YAxis stroke="#9CA3AF" />
                <Tooltip 
                  contentStyle={{ backgroundColor: '#1F2937', border: '1px solid #374151' }}
                  labelStyle={{ color: '#F3F4F6' }}
                />
                <Legend />
                <Line 
                  type="monotone" 
                  dataKey="views" 
                  stroke="#8B5CF6" 
                  strokeWidth={2}
                  name="Views"
                  dot={{ fill: '#8B5CF6' }}
                />
                <Line 
                  type="monotone" 
                  dataKey="videos" 
                  stroke="#10B981" 
                  strokeWidth={2}
                  name="Videos Posted"
                  dot={{ fill: '#10B981' }}
                />
              </LineChart>
            </ResponsiveContainer>
          </div>

          {/* Channel Videos */}
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
            <h2 className="text-xl font-bold text-white mb-4">All Videos from {selectedChannel}</h2>
            <div className="space-y-3">
              {sortedChannelVideos.map((video, idx) => (
  
                  key={`${video.video_id}-${idx}`}
                  href={video.video_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="block bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg p-4 transition-colors"
                >
                  <div className="flex gap-4">
                    <img 
                      src={video.thumbnail} 
                      alt={video.title}
                      className="w-40 h-24 object-cover rounded flex-shrink-0"
                    />
                    <div className="flex-1 min-w-0">
                      <div className="flex items-start justify-between gap-2 mb-1">
                        <h3 className="text-white font-medium line-clamp-2">{video.title}</h3>
                        <span className="text-gray-400 text-sm flex-shrink-0">#{idx + 1}</span>
                      </div>
                      <div className="flex flex-wrap gap-4 text-sm mt-2">
                        <span className="text-blue-400 flex items-center gap-1">
                          <Eye size={14} />
                          {formatNumber(video.views)}
                        </span>
                        <span className="text-green-400 flex items-center gap-1">
                          <ThumbsUp size={14} />
                          {formatNumber(video.likes)}
                        </span>
                        <span className="text-yellow-400 flex items-center gap-1">
                          <MessageCircle size={14} />
                          {formatNumber(video.comments)}
                        </span>
                        <span className="text-gray-400 flex items-center gap-1">
                          <Clock size={14} />
                          {video.duration}
                        </span>
                      </div>
                      <p className="text-gray-500 text-xs mt-2">{formatDate(video.date_posted)}</p>
                    </div>
                  </div>
                </a>
              ))}
            </div>
          </div>
        </div>
      </div>
    );
  }
};

export default Dashboard;
