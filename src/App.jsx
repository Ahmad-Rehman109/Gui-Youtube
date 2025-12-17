import React, { useState, useEffect } from 'react';
import { LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { RefreshCw, TrendingUp, Eye, ThumbsUp, MessageCircle, Clock, Video } from 'lucide-react';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [selectedChannel, setSelectedChannel] = useState('all');
  const [error, setError] = useState(null);

  // Updated URL to fetch from your GitHub repo
  const DATA_URL = 'https://raw.githubusercontent.com/Ahmad-Rehman109/Gui-Youtube/main/youtube_stats.json';

  const fetchData = async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await fetch(DATA_URL + '?t=' + Date.now()); // Cache bust
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
    // Auto-refresh every 10 minutes
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
          <p className="text-gray-400 text-sm mb-4">
            The scraper will update data every 10 minutes. If this persists, check GitHub Actions.
          </p>
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
  
  // Get unique channels
  const channels = [...new Set(videos.map(v => v.channel_name))].filter(Boolean);
  
  // Filter videos by selected channel
  const filteredVideos = selectedChannel === 'all' 
    ? videos 
    : videos.filter(v => v.channel_name === selectedChannel);

  // Calculate stats
  const totalViews = filteredVideos.reduce((sum, v) => sum + (v.views || 0), 0);
  const totalLikes = filteredVideos.reduce((sum, v) => sum + (v.likes || 0), 0);
  const totalComments = filteredVideos.reduce((sum, v) => sum + (v.comments || 0), 0);
  const avgViews = filteredVideos.length > 0 ? Math.round(totalViews / filteredVideos.length) : 0;
  const avgEngagement = totalViews > 0 ? ((totalLikes + totalComments) / totalViews * 100).toFixed(2) : 0;

  // Group by channel for overview
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

  // Top performing videos
  const topVideos = [...filteredVideos]
    .sort((a, b) => (b.views || 0) - (a.views || 0))
    .slice(0, 10);

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

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900">
      {/* Header */}
      <div className="bg-gray-800/50 border-b border-gray-700 sticky top-0 z-10 backdrop-blur-sm">
        <div className="max-w-7xl mx-auto px-4 py-4">
          <div className="flex items-center justify-between">
            <div>
              <h1 className="text-2xl font-bold text-white flex items-center gap-2">
                <Video className="text-red-500" />
                YouTube Analytics Dashboard
              </h1>
              <p className="text-gray-400 text-sm mt-1">
                Last updated: {new Date(data?.last_updated).toLocaleString()} • Auto-updates every 10 min
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
        {/* Channel Filter */}
        <div className="mb-6">
          <label className="text-gray-300 text-sm font-medium mb-2 block">Filter by Channel</label>
          <select 
            value={selectedChannel}
            onChange={(e) => setSelectedChannel(e.target.value)}
            className="bg-gray-800 text-white border border-gray-700 rounded-lg px-4 py-2 w-full md:w-96 focus:outline-none focus:border-red-500"
          >
            <option value="all">All Channels ({channels.length})</option>
            {channels.map(channel => (
              <option key={channel} value={channel}>{channel}</option>
            ))}
          </select>
        </div>

        {/* Stats Overview */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4 mb-6">
          <div className="bg-gradient-to-br from-blue-500/20 to-blue-600/20 border border-blue-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-blue-400 mb-2">
              <Video size={20} />
              <span className="text-sm font-medium">Videos</span>
            </div>
            <div className="text-2xl font-bold text-white">{filteredVideos.length}</div>
          </div>

          <div className="bg-gradient-to-br from-purple-500/20 to-purple-600/20 border border-purple-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-purple-400 mb-2">
              <Eye size={20} />
              <span className="text-sm font-medium">Total Views</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(totalViews)}</div>
          </div>

          <div className="bg-gradient-to-br from-green-500/20 to-green-600/20 border border-green-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-green-400 mb-2">
              <ThumbsUp size={20} />
              <span className="text-sm font-medium">Total Likes</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(totalLikes)}</div>
          </div>

          <div className="bg-gradient-to-br from-yellow-500/20 to-yellow-600/20 border border-yellow-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-yellow-400 mb-2">
              <MessageCircle size={20} />
              <span className="text-sm font-medium">Comments</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(totalComments)}</div>
          </div>

          <div className="bg-gradient-to-br from-red-500/20 to-red-600/20 border border-red-500/30 rounded-lg p-4">
            <div className="flex items-center gap-2 text-red-400 mb-2">
              <TrendingUp size={20} />
              <span className="text-sm font-medium">Avg Views</span>
            </div>
            <div className="text-2xl font-bold text-white">{formatNumber(avgViews)}</div>
          </div>
        </div>

        {/* Channel Comparison Chart */}
        {selectedChannel === 'all' && channelStats.length > 0 && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6">
            <h2 className="text-xl font-bold text-white mb-4">Channel Performance</h2>
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
        )}

        {/* Channel Stats Table */}
        {selectedChannel === 'all' && (
          <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6 mb-6 overflow-x-auto">
            <h2 className="text-xl font-bold text-white mb-4">Channel Overview</h2>
            <table className="w-full text-left">
              <thead>
                <tr className="border-b border-gray-700">
                  <th className="py-3 px-4 text-gray-400 font-medium">Channel</th>
                  <th className="py-3 px-4 text-gray-400 font-medium text-right">Videos</th>
                  <th className="py-3 px-4 text-gray-400 font-medium text-right">Subscribers</th>
                  <th className="py-3 px-4 text-gray-400 font-medium text-right">Total Views</th>
                  <th className="py-3 px-4 text-gray-400 font-medium text-right">Avg Views</th>
                  <th className="py-3 px-4 text-gray-400 font-medium text-right">Total Likes</th>
                </tr>
              </thead>
              <tbody>
                {channelStats.map((channel, idx) => (
                  <tr key={idx} className="border-b border-gray-700/50 hover:bg-gray-700/30">
                    <td className="py-3 px-4 text-white font-medium">{channel.name}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{channel.videos}</td>
                    <td className="py-3 px-4 text-gray-300 text-right">{formatNumber(channel.subscribers)}</td>
                    <td className="py-3 px-4 text-purple-400 text-right font-medium">{formatNumber(channel.views)}</td>
                    <td className="py-3 px-4 text-blue-400 text-right">{formatNumber(channel.avgViews)}</td>
                    <td className="py-3 px-4 text-green-400 text-right">{formatNumber(channel.likes)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {/* Top Videos */}
        <div className="bg-gray-800/50 border border-gray-700 rounded-lg p-6">
          <h2 className="text-xl font-bold text-white mb-4">
            Top {selectedChannel === 'all' ? 'Videos' : 'Videos from ' + selectedChannel}
          </h2>
          <div className="space-y-3">
            {topVideos.map((video, idx) => (
              <a
                key={video.video_id}
                href={video.video_url}
                target="_blank"
                rel="noopener noreferrer"
                className="block bg-gray-700/30 hover:bg-gray-700/50 border border-gray-600 rounded-lg p-4 transition-colors"
              >
                <div className="flex gap-4">
                  <img 
                    src={video.thumbnail} 
                    alt={video.title}
                    className="w-32 h-20 object-cover rounded"
                  />
                  <div className="flex-1 min-w-0">
                    <div className="flex items-start justify-between gap-2">
                      <h3 className="text-white font-medium line-clamp-2">{video.title}</h3>
                      <span className="text-gray-400 text-sm flex-shrink-0">#{idx + 1}</span>
                    </div>
                    <p className="text-gray-400 text-sm mt-1">{video.channel_name}</p>
                    <div className="flex gap-4 mt-2 text-sm">
                      <span className="text-purple-400 flex items-center gap-1">
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
                      <span className="text-blue-400 flex items-center gap-1">
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
};

export default Dashboard;
