import React, { useState, useEffect, useRef } from 'react';
import {
  LineChart, Line, BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend,
  ResponsiveContainer, Cell, PieChart, Pie
} from 'recharts';

// ── Font injection ──────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const link = document.createElement('link');
    link.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;500;600;700;800&family=DM+Mono:wght@300;400;500&display=swap';
    link.rel = 'stylesheet';
    document.head.appendChild(link);
  }, []);
  return null;
};

// ── Animated counter ────────────────────────────────────────────────────────
const AnimatedNumber = ({ value, duration = 1200, formatter }) => {
  const [display, setDisplay] = useState(0);
  const start = useRef(null);
  const prev = useRef(0);
  useEffect(() => {
    const target = value || 0;
    const from = prev.current;
    prev.current = target;
    start.current = null;
    const step = (ts) => {
      if (!start.current) start.current = ts;
      const progress = Math.min((ts - start.current) / duration, 1);
      const eased = 1 - Math.pow(1 - progress, 3);
      setDisplay(Math.round(from + (target - from) * eased));
      if (progress < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{formatter ? formatter(display) : display.toLocaleString()}</span>;
};

// ── Helpers ─────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (!n) return '0';
  if (n >= 1000000) return (n / 1000000).toFixed(1) + 'M';
  if (n >= 1000) return (n / 1000).toFixed(1) + 'K';
  return n.toLocaleString();
};

const getDaysAgo = (dateStr) => {
  if (!dateStr) return null;
  const patterns = [
    { r: /(\d+)\s+second/i, m: 1 / 86400 },
    { r: /(\d+)\s+minute/i, m: 1 / 1440 },
    { r: /(\d+)\s+hour/i,   m: 1 / 24 },
    { r: /(\d+)\s+day/i,    m: 1 },
    { r: /(\d+)\s+week/i,   m: 7 },
    { r: /(\d+)\s+month/i,  m: 30 },
    { r: /(\d+)\s+year/i,   m: 365 },
  ];
  for (const { r, m } of patterns) {
    const match = dateStr.match(r);
    if (match) return Math.floor(parseInt(match[1]) * m);
  }
  const dateMatch = dateStr.match(/([A-Za-z]+)\s+(\d+),?\s+(\d+)/);
  if (dateMatch) {
    const d = new Date(dateStr);
    const now = new Date();
    return Math.floor(Math.abs(now - d) / 86400000);
  }
  return null;
};

// ── Custom Tooltip ───────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background: 'rgba(10,10,20,0.95)',
      border: '1px solid rgba(0,212,255,0.2)',
      borderRadius: 8,
      padding: '10px 14px',
      fontFamily: "'DM Mono', monospace",
      fontSize: 12,
    }}>
      <p style={{ color: '#00D4FF', marginBottom: 6, fontWeight: 500 }}>{label}</p>
      {payload.map((entry, i) => (
        <p key={i} style={{ color: entry.color, margin: '2px 0' }}>
          {entry.name}: {fmt(entry.value)}
        </p>
      ))}
    </div>
  );
};

// ── Mini Sparkline ───────────────────────────────────────────────────────────
const Sparkline = ({ data, color }) => (
  <ResponsiveContainer width="100%" height={40}>
    <AreaChart data={data} margin={{ top: 2, right: 0, left: 0, bottom: 2 }}>
      <defs>
        <linearGradient id={`sg-${color.replace('#', '')}`} x1="0" y1="0" x2="0" y2="1">
          <stop offset="5%" stopColor={color} stopOpacity={0.3} />
          <stop offset="95%" stopColor={color} stopOpacity={0} />
        </linearGradient>
      </defs>
      <Area type="monotone" dataKey="v" stroke={color} strokeWidth={1.5}
        fill={`url(#sg-${color.replace('#', '')})`} dot={false} />
    </AreaChart>
  </ResponsiveContainer>
);

// ── VIDEO CARD ───────────────────────────────────────────────────────────────
const VideoCard = ({ video, rank }) => {
  const er = video.views > 0 ? ((video.likes / video.views) * 100).toFixed(1) : 0;
  return (
    <a href={video.video_url} target="_blank" rel="noopener noreferrer"
      style={{
        display: 'flex', gap: 14, padding: '14px 16px',
        background: 'rgba(255,255,255,0.03)',
        border: '1px solid rgba(255,255,255,0.07)',
        borderRadius: 12, cursor: 'pointer', textDecoration: 'none',
        transition: 'all 0.2s ease',
      }}
      onMouseEnter={e => {
        e.currentTarget.style.background = 'rgba(0,212,255,0.05)';
        e.currentTarget.style.borderColor = 'rgba(0,212,255,0.25)';
        e.currentTarget.style.transform = 'translateY(-1px)';
      }}
      onMouseLeave={e => {
        e.currentTarget.style.background = 'rgba(255,255,255,0.03)';
        e.currentTarget.style.borderColor = 'rgba(255,255,255,0.07)';
        e.currentTarget.style.transform = 'translateY(0)';
      }}
    >
      {rank && (
        <div style={{
          width: 28, height: 28, borderRadius: '50%',
          background: rank <= 3 ? 'linear-gradient(135deg, #F59E0B, #EF4444)' : 'rgba(255,255,255,0.1)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 600,
          color: rank <= 3 ? '#000' : '#888', flexShrink: 0, marginTop: 2,
        }}>{rank}</div>
      )}
      <div style={{ position: 'relative', flexShrink: 0 }}>
        <img src={video.thumbnail} alt={video.title}
          style={{ width: 130, height: 76, objectFit: 'cover', borderRadius: 8, display: 'block' }} />
        {video.duration && video.duration !== 'Unknown' && (
          <span style={{
            position: 'absolute', bottom: 4, right: 4,
            background: 'rgba(0,0,0,0.85)', color: '#fff',
            fontFamily: "'DM Mono', monospace", fontSize: 10,
            padding: '1px 5px', borderRadius: 4,
          }}>{video.duration}</span>
        )}
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <p style={{
          color: '#F0F0F5', fontFamily: "'Syne', sans-serif",
          fontSize: 13, fontWeight: 600, margin: '0 0 4px',
          lineHeight: 1.4, display: '-webkit-box',
          WebkitLineClamp: 2, WebkitBoxOrient: 'vertical', overflow: 'hidden',
        }}>{video.title}</p>
        <p style={{ color: '#00D4FF', fontFamily: "'DM Mono', monospace", fontSize: 11, margin: '0 0 8px' }}>
          {video.channel_name}
        </p>
        <div style={{ display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          {[
            { label: 'VIEWS', val: fmt(video.views), color: '#A78BFA' },
            { label: 'LIKES', val: fmt(video.likes), color: '#34D399' },
            { label: 'ER', val: `${er}%`, color: '#F59E0B' },
            { label: 'POSTED', val: video.date_posted, color: '#94A3B8' },
          ].map(({ label, val, color }) => (
            <div key={label}>
              <span style={{ color: '#4A5568', fontFamily: "'DM Mono', monospace", fontSize: 9, letterSpacing: 1 }}>
                {label}
              </span>
              <br />
              <span style={{ color, fontFamily: "'DM Mono', monospace", fontSize: 12, fontWeight: 500 }}>
                {val}
              </span>
            </div>
          ))}
        </div>
      </div>
    </a>
  );
};

// ── STAT CARD ────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent, sparkData, icon }) => (
  <div style={{
    background: 'rgba(255,255,255,0.03)',
    border: `1px solid ${accent}30`,
    borderRadius: 16, padding: '20px 20px 14px',
    position: 'relative', overflow: 'hidden',
  }}>
    <div style={{
      position: 'absolute', top: 0, left: 0, right: 0, height: 2,
      background: `linear-gradient(90deg, ${accent}, transparent)`,
    }} />
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
      <span style={{ color: '#4A5568', fontFamily: "'DM Mono', monospace", fontSize: 10, letterSpacing: 1.5, textTransform: 'uppercase' }}>
        {label}
      </span>
      <span style={{ fontSize: 16 }}>{icon}</span>
    </div>
    <div style={{
      fontFamily: "'Syne', sans-serif", fontSize: 28, fontWeight: 700,
      color: '#F0F0F5', margin: '4px 0 2px',
    }}>
      <AnimatedNumber value={typeof value === 'number' ? value : 0} formatter={fmt} />
    </div>
    {sub && <p style={{ color: accent, fontFamily: "'DM Mono', monospace", fontSize: 11, margin: 0 }}>{sub}</p>}
    {sparkData && <div style={{ marginTop: 8 }}><Sparkline data={sparkData} color={accent} /></div>}
  </div>
);

// ── SIDEBAR ──────────────────────────────────────────────────────────────────
const NAV = [
  { id: 'today',    label: 'Today',     icon: '◈' },
  { id: 'overview', label: 'Overview',  icon: '◉' },
  { id: 'videos',   label: 'All Videos',icon: '▤' },
  { id: 'channels', label: 'Channels',  icon: '◫' },
];

const Sidebar = ({ active, setActive, channelCount, videoCount }) => (
  <div style={{
    width: 220, flexShrink: 0, background: 'rgba(5,5,12,0.8)',
    borderRight: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', flexDirection: 'column', padding: '28px 0',
    backdropFilter: 'blur(20px)',
  }}>
    <div style={{ padding: '0 24px 32px' }}>
      <div style={{
        fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 800,
        color: '#F0F0F5', letterSpacing: -0.5, lineHeight: 1.1,
      }}>
        <span style={{ color: '#00D4FF' }}>YT</span>PULSE
      </div>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4A5568', marginTop: 4, letterSpacing: 1 }}>
        ANALYTICS SUITE
      </div>
    </div>

    <nav style={{ flex: 1 }}>
      {NAV.map(({ id, label, icon }) => {
        const isActive = active === id;
        return (
          <button key={id} onClick={() => setActive(id)} style={{
            display: 'flex', alignItems: 'center', gap: 12,
            width: '100%', padding: '11px 24px',
            background: isActive ? 'rgba(0,212,255,0.08)' : 'transparent',
            borderLeft: isActive ? '2px solid #00D4FF' : '2px solid transparent',
            border: 'none', cursor: 'pointer', textAlign: 'left',
            transition: 'all 0.15s ease',
          }}>
            <span style={{ color: isActive ? '#00D4FF' : '#4A5568', fontSize: 14 }}>{icon}</span>
            <span style={{
              fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: isActive ? 600 : 400,
              color: isActive ? '#F0F0F5' : '#6B7280',
            }}>{label}</span>
          </button>
        );
      })}
    </nav>

    <div style={{ padding: '0 24px', borderTop: '1px solid rgba(255,255,255,0.06)', paddingTop: 20 }}>
      <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4A5568', marginBottom: 8, letterSpacing: 1 }}>TRACKING</div>
      <div style={{ color: '#F0F0F5', fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 }}>
        {channelCount} <span style={{ fontSize: 12, color: '#4A5568', fontWeight: 400 }}>channels</span>
      </div>
      <div style={{ color: '#F0F0F5', fontFamily: "'Syne', sans-serif", fontSize: 20, fontWeight: 700 }}>
        {videoCount} <span style={{ fontSize: 12, color: '#4A5568', fontWeight: 400 }}>videos</span>
      </div>
    </div>
  </div>
);

// ── HEADER ───────────────────────────────────────────────────────────────────
const Header = ({ title, sub, lastUpdated, onRefresh, loading }) => (
  <div style={{
    padding: '20px 32px', borderBottom: '1px solid rgba(255,255,255,0.06)',
    display: 'flex', alignItems: 'center', justifyContent: 'space-between',
    background: 'rgba(5,5,12,0.6)', backdropFilter: 'blur(20px)',
    position: 'sticky', top: 0, zIndex: 100,
  }}>
    <div>
      <h1 style={{ fontFamily: "'Syne', sans-serif", fontSize: 22, fontWeight: 700, color: '#F0F0F5', margin: 0 }}>
        {title}
      </h1>
      {sub && <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4A5568', margin: '2px 0 0', letterSpacing: 0.5 }}>{sub}</p>}
    </div>
    <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
      {lastUpdated && (
        <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4A5568' }}>
          Updated {new Date(lastUpdated).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
        </span>
      )}
      <button onClick={onRefresh} disabled={loading} style={{
        background: loading ? 'rgba(255,255,255,0.05)' : 'rgba(0,212,255,0.12)',
        border: '1px solid rgba(0,212,255,0.25)',
        borderRadius: 8, color: '#00D4FF',
        fontFamily: "'DM Mono', monospace", fontSize: 12,
        padding: '8px 16px', cursor: loading ? 'not-allowed' : 'pointer',
        display: 'flex', alignItems: 'center', gap: 8, transition: 'all 0.2s',
      }}>
        <span style={{
          display: 'inline-block',
          animation: loading ? 'spin 1s linear infinite' : 'none',
        }}>↻</span>
        {loading ? 'Refreshing…' : 'Refresh'}
      </button>
    </div>
  </div>
);

// ── TODAY VIEW ───────────────────────────────────────────────────────────────
const TodayView = ({ videos, lastUpdated, onRefresh, loading }) => {
  const todayVideos = videos.filter(v => {
    const d = getDaysAgo(v.date_posted);
    return d !== null && d <= 1;
  });
  const strictToday = videos.filter(v => getDaysAgo(v.date_posted) === 0);
  const yesterday  = videos.filter(v => getDaysAgo(v.date_posted) === 1);

  const tViews    = todayVideos.reduce((s, v) => s + (v.views || 0), 0);
  const tLikes    = todayVideos.reduce((s, v) => s + (v.likes || 0), 0);
  const tComments = todayVideos.reduce((s, v) => s + (v.comments || 0), 0);
  const tEr       = tViews > 0 ? ((tLikes / tViews) * 100).toFixed(2) : 0;

  const channelBreakdown = [...new Set(todayVideos.map(v => v.channel_name))].map(name => {
    const vids = todayVideos.filter(v => v.channel_name === name);
    return {
      name,
      videos: vids.length,
      views: vids.reduce((s, v) => s + (v.views || 0), 0),
      likes: vids.reduce((s, v) => s + (v.likes || 0), 0),
    };
  }).sort((a, b) => b.views - a.views);

  return (
    <div>
      <Header title="Today" sub={`${new Date().toLocaleDateString('en-US', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}`}
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{ padding: '28px 32px' }}>

        {/* Today Stats */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Videos Today" value={todayVideos.length} sub={`${strictToday.length} today · ${yesterday.length} yesterday`} accent="#00D4FF" icon="🎬" />
          <StatCard label="Total Views" value={tViews} sub="Last 48 hours" accent="#A78BFA" icon="👁" />
          <StatCard label="Total Likes" value={tLikes} sub="Last 48 hours" accent="#34D399" icon="👍" />
          <StatCard label="Eng. Rate" value={parseFloat(tEr)} sub="Likes / Views" accent="#F59E0B" icon="⚡" />
        </div>

        {/* Channel Breakdown Today */}
        {channelBreakdown.length > 0 && (
          <div style={{ marginBottom: 32 }}>
            <SectionTitle>Channel Activity Today</SectionTitle>
            <div style={{
              background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)',
              borderRadius: 16, overflow: 'hidden',
            }}>
              <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                <thead>
                  <tr style={{ borderBottom: '1px solid rgba(255,255,255,0.07)' }}>
                    {['CHANNEL', 'VIDEOS', 'VIEWS', 'LIKES', 'ENG RATE'].map(h => (
                      <th key={h} style={{
                        padding: '12px 20px', textAlign: h === 'CHANNEL' ? 'left' : 'right',
                        fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#4A5568',
                        letterSpacing: 1.5, fontWeight: 400,
                      }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {channelBreakdown.map((c, i) => (
                    <tr key={c.name} style={{
                      borderBottom: i < channelBreakdown.length - 1 ? '1px solid rgba(255,255,255,0.04)' : 'none',
                    }}>
                      <td style={{ padding: '14px 20px', fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600, color: '#F0F0F5' }}>
                        <span style={{
                          display: 'inline-block', width: 6, height: 6, borderRadius: '50%',
                          background: '#00D4FF', marginRight: 10,
                        }} />
                        {c.name}
                      </td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#A78BFA' }}>{c.videos}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#F0F0F5' }}>{fmt(c.views)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#34D399' }}>{fmt(c.likes)}</td>
                      <td style={{ padding: '14px 20px', textAlign: 'right', fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#F59E0B' }}>
                        {c.views > 0 ? ((c.likes / c.views) * 100).toFixed(2) : 0}%
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* Today Videos */}
        {strictToday.length > 0 && (
          <div style={{ marginBottom: 28 }}>
            <SectionTitle>Posted Today <Badge>{strictToday.length}</Badge></SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {strictToday.sort((a,b)=>(b.views||0)-(a.views||0)).map((v,i) => (
                <VideoCard key={v.video_id} video={v} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {yesterday.length > 0 && (
          <div>
            <SectionTitle>Posted Yesterday <Badge color="#4A5568">{yesterday.length}</Badge></SectionTitle>
            <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
              {yesterday.sort((a,b)=>(b.views||0)-(a.views||0)).map((v,i) => (
                <VideoCard key={v.video_id} video={v} rank={i + 1} />
              ))}
            </div>
          </div>
        )}

        {todayVideos.length === 0 && (
          <EmptyState>No videos found from today or yesterday.</EmptyState>
        )}
      </div>
    </div>
  );
};

// ── OVERVIEW VIEW ────────────────────────────────────────────────────────────
const OverviewView = ({ videos, channels, lastUpdated, onRefresh, loading }) => {
  const totalViews    = videos.reduce((s, v) => s + (v.views || 0), 0);
  const totalLikes    = videos.reduce((s, v) => s + (v.likes || 0), 0);
  const totalComments = videos.reduce((s, v) => s + (v.comments || 0), 0);
  const totalSubs     = Math.max(...videos.map(v => v.subscribers || 0));
  const er            = totalViews > 0 ? ((totalLikes / totalViews) * 100).toFixed(2) : 0;

  const last7 = videos.filter(v => { const d = getDaysAgo(v.date_posted); return d !== null && d < 7; });
  const l7Views = last7.reduce((s, v) => s + (v.views || 0), 0);

  // 30-day chart
  const chartData = Array.from({ length: 30 }, (_, i) => {
    const vids = videos.filter(v => getDaysAgo(v.date_posted) === (29 - i));
    return {
      day: i === 29 ? 'Today' : `D-${29 - i}`,
      views: vids.reduce((s, v) => s + (v.views || 0), 0),
      likes: vids.reduce((s, v) => s + (v.likes || 0), 0),
      uploads: vids.length,
    };
  });

  // Sparklines (last 7 days per metric)
  const viewsSpark = Array.from({ length: 7 }, (_, i) => ({
    v: videos.filter(v => getDaysAgo(v.date_posted) === (6 - i)).reduce((s, v) => s + (v.views || 0), 0),
  }));

  const channelStats = channels.map(name => {
    const cv = videos.filter(v => v.channel_name === name);
    const views = cv.reduce((s, v) => s + (v.views || 0), 0);
    const likes = cv.reduce((s, v) => s + (v.likes || 0), 0);
    return { name, views, likes, videos: cv.length, avgViews: Math.round(views / cv.length) };
  }).sort((a, b) => b.views - a.views);

  const topVideos = [...videos].sort((a, b) => (b.views || 0) - (a.views || 0)).slice(0, 5);

  return (
    <div>
      <Header title="Overview" sub="All channels · All time" lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{ padding: '28px 32px' }}>

        {/* KPI Row */}
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 16, marginBottom: 32 }}>
          <StatCard label="Total Views" value={totalViews} sub={`${fmt(l7Views)} this week`} accent="#A78BFA" icon="👁" sparkData={viewsSpark} />
          <StatCard label="Total Likes" value={totalLikes} sub="Across all channels" accent="#34D399" icon="👍" />
          <StatCard label="Eng. Rate" value={parseFloat(er)} sub="Likes / Views %" accent="#F59E0B" icon="⚡" />
          <StatCard label="Total Videos" value={videos.length} sub={`${last7.length} in last 7 days`} accent="#00D4FF" icon="🎬" />
        </div>

        {/* 30-Day Area Chart */}
        <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 24px 16px', marginBottom: 28 }}>
          <SectionTitle>30-Day Performance</SectionTitle>
          <ResponsiveContainer width="100%" height={220}>
            <AreaChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#A78BFA" stopOpacity={0.3} />
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0} />
                </linearGradient>
                <linearGradient id="gl" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%" stopColor="#34D399" stopOpacity={0.25} />
                  <stop offset="95%" stopColor="#34D399" stopOpacity={0} />
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.05)" />
              <XAxis dataKey="day" stroke="#2D3748" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#4A5568' }} tickLine={false} />
              <YAxis stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#4A5568' }} tickLine={false} />
              <Tooltip content={<CustomTooltip />} />
              <Area type="monotone" dataKey="views" stroke="#A78BFA" strokeWidth={2} fill="url(#gv)" name="Views" />
              <Area type="monotone" dataKey="likes" stroke="#34D399" strokeWidth={2} fill="url(#gl)" name="Likes" />
            </AreaChart>
          </ResponsiveContainer>
        </div>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 24, marginBottom: 28 }}>
          {/* Channel Bar Chart */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 24px 16px' }}>
            <SectionTitle>Views by Channel</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={channelStats} layout="vertical" margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false} />
                <XAxis type="number" stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#4A5568' }} tickLine={false} />
                <YAxis type="category" dataKey="name" stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#6B7280' }} tickLine={false} width={80} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="views" name="Views" radius={[0, 4, 4, 0]}>
                  {channelStats.map((_, i) => (
                    <Cell key={i} fill={`hsl(${250 + i * 22}, 70%, ${55 + i * 3}%)`} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </div>

          {/* Uploads per day bar */}
          <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '24px 24px 16px' }}>
            <SectionTitle>Daily Upload Activity</SectionTitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chartData.slice(-14)} margin={{ top: 0, right: 10, left: 0, bottom: 0 }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false} />
                <XAxis dataKey="day" stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fill: '#4A5568' }} tickLine={false} />
                <YAxis stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#4A5568' }} tickLine={false} />
                <Tooltip content={<CustomTooltip />} />
                <Bar dataKey="uploads" name="Uploads" fill="#00D4FF" opacity={0.7} radius={[4, 4, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Top 5 Videos */}
        <div>
          <SectionTitle>Top Performing Videos</SectionTitle>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {topVideos.map((v, i) => <VideoCard key={v.video_id} video={v} rank={i + 1} />)}
          </div>
        </div>
      </div>
    </div>
  );
};

// ── ALL VIDEOS VIEW ──────────────────────────────────────────────────────────
const AllVideosView = ({ videos, lastUpdated, onRefresh, loading }) => {
  const [sort, setSort] = useState('views');
  const [filter, setFilter] = useState('all');
  const channels = [...new Set(videos.map(v => v.channel_name))].filter(Boolean);

  const filtered = filter === 'all' ? videos : videos.filter(v => v.channel_name === filter);
  const sorted = [...filtered].sort((a, b) => (b[sort] || 0) - (a[sort] || 0));

  return (
    <div>
      <Header title="All Videos" sub={`${videos.length} videos tracked`} lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{ padding: '20px 32px' }}>
        <div style={{ display: 'flex', gap: 12, marginBottom: 24, flexWrap: 'wrap' }}>
          {/* Sort */}
          <div style={{ display: 'flex', gap: 6 }}>
            {[['views','Views'],['likes','Likes'],['comments','Comments']].map(([k,l]) => (
              <button key={k} onClick={() => setSort(k)} style={{
                padding: '7px 14px', borderRadius: 8, cursor: 'pointer',
                background: sort === k ? 'rgba(0,212,255,0.12)' : 'rgba(255,255,255,0.04)',
                border: `1px solid ${sort === k ? 'rgba(0,212,255,0.3)' : 'rgba(255,255,255,0.08)'}`,
                color: sort === k ? '#00D4FF' : '#6B7280',
                fontFamily: "'DM Mono', monospace", fontSize: 12,
              }}>{l}</button>
            ))}
          </div>
          {/* Channel filter */}
          <select value={filter} onChange={e => setFilter(e.target.value)} style={{
            background: 'rgba(255,255,255,0.04)', border: '1px solid rgba(255,255,255,0.08)',
            borderRadius: 8, color: '#F0F0F5', padding: '7px 14px',
            fontFamily: "'DM Mono', monospace", fontSize: 12, cursor: 'pointer',
          }}>
            <option value="all">All Channels</option>
            {channels.map(c => <option key={c} value={c}>{c}</option>)}
          </select>
          <div style={{ marginLeft: 'auto', fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4A5568', alignSelf: 'center' }}>
            {sorted.length} videos
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {sorted.map((v, i) => <VideoCard key={`${v.video_id}-${i}`} video={v} rank={i + 1} />)}
        </div>
      </div>
    </div>
  );
};

// ── CHANNELS VIEW ────────────────────────────────────────────────────────────
const ChannelsView = ({ videos, lastUpdated, onRefresh, loading }) => {
  const [selected, setSelected] = useState(null);
  const channels = [...new Set(videos.map(v => v.channel_name))].filter(Boolean);

  const channelStats = channels.map(name => {
    const cv = videos.filter(v => v.channel_name === name);
    const views = cv.reduce((s, v) => s + (v.views || 0), 0);
    const likes = cv.reduce((s, v) => s + (v.likes || 0), 0);
    const comments = cv.reduce((s, v) => s + (v.comments || 0), 0);
    const er = views > 0 ? ((likes / views) * 100).toFixed(2) : 0;
    const recent = cv.filter(v => { const d = getDaysAgo(v.date_posted); return d !== null && d < 7; });
    return {
      name, views, likes, comments, er,
      videos: cv.length,
      avgViews: Math.round(views / cv.length),
      subscribers: cv[0]?.subscribers || 0,
      recent: recent.length,
      topVideo: cv.sort((a,b)=>(b.views||0)-(a.views||0))[0],
      allVideos: cv.sort((a,b)=>(b.views||0)-(a.views||0)),
      chartData: Array.from({ length: 14 }, (_, i) => {
        const dayVids = cv.filter(v => getDaysAgo(v.date_posted) === (13 - i));
        return {
          day: `D-${13 - i}`,
          views: dayVids.reduce((s, v) => s + (v.views || 0), 0),
          uploads: dayVids.length,
        };
      }),
    };
  }).sort((a, b) => b.views - a.views);

  const sel = selected ? channelStats.find(c => c.name === selected) : null;

  return (
    <div>
      <Header title="Channels" sub={`${channels.length} channels`} lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{ display: 'flex', height: 'calc(100vh - 69px)', overflow: 'hidden' }}>
        {/* Channel list */}
        <div style={{
          width: 280, flexShrink: 0, borderRight: '1px solid rgba(255,255,255,0.06)',
          overflowY: 'auto', padding: '16px 0',
        }}>
          {channelStats.map((c, i) => (
            <button key={c.name} onClick={() => setSelected(c.name)} style={{
              display: 'block', width: '100%', padding: '14px 20px', textAlign: 'left',
              background: selected === c.name ? 'rgba(0,212,255,0.07)' : 'transparent',
              borderLeft: selected === c.name ? '2px solid #00D4FF' : '2px solid transparent',
              border: 'none', cursor: 'pointer', transition: 'all 0.15s',
            }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                <div style={{
                  fontFamily: "'Syne', sans-serif", fontSize: 13, fontWeight: 600,
                  color: selected === c.name ? '#F0F0F5' : '#9CA3AF',
                  marginBottom: 4, lineHeight: 1.3,
                }}>{c.name}</div>
                <span style={{
                  background: `hsl(${250 + i * 22}, 60%, 60%)`,
                  borderRadius: 4, padding: '1px 6px',
                  fontFamily: "'DM Mono', monospace", fontSize: 10, color: '#000', fontWeight: 600,
                }}>#{i + 1}</span>
              </div>
              <div style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4A5568' }}>
                {fmt(c.views)} views · {c.videos} vids
              </div>
            </button>
          ))}
        </div>

        {/* Channel detail */}
        <div style={{ flex: 1, overflowY: 'auto', padding: '28px 32px' }}>
          {!sel ? (
            <EmptyState>Select a channel from the list to view analytics.</EmptyState>
          ) : (
            <>
              <div style={{ marginBottom: 24 }}>
                <h2 style={{ fontFamily: "'Syne', sans-serif", fontSize: 24, fontWeight: 800, color: '#F0F0F5', margin: 0 }}>{sel.name}</h2>
                <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 11, color: '#4A5568', margin: '4px 0 0' }}>
                  {fmt(sel.subscribers)} subscribers · {sel.videos} videos · {sel.recent} uploaded this week
                </p>
              </div>

              {/* Channel KPIs */}
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12, marginBottom: 24 }}>
                {[
                  { label: 'Total Views', value: sel.views, accent: '#A78BFA' },
                  { label: 'Avg Views', value: sel.avgViews, accent: '#00D4FF' },
                  { label: 'Total Likes', value: sel.likes, accent: '#34D399' },
                  { label: 'Eng. Rate', value: parseFloat(sel.er), accent: '#F59E0B' },
                ].map(s => <StatCard key={s.label} {...s} icon="" />)}
              </div>

              {/* 14-day chart */}
              <div style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.07)', borderRadius: 16, padding: '20px 20px 12px', marginBottom: 24 }}>
                <SectionTitle>14-Day Views</SectionTitle>
                <ResponsiveContainer width="100%" height={180}>
                  <AreaChart data={sel.chartData} margin={{ top: 5, right: 10, left: 0, bottom: 0 }}>
                    <defs>
                      <linearGradient id="chg" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="#00D4FF" stopOpacity={0.25} />
                        <stop offset="95%" stopColor="#00D4FF" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" />
                    <XAxis dataKey="day" stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 9, fill: '#4A5568' }} tickLine={false} />
                    <YAxis stroke="transparent" tick={{ fontFamily: "'DM Mono',monospace", fontSize: 10, fill: '#4A5568' }} tickLine={false} />
                    <Tooltip content={<CustomTooltip />} />
                    <Area type="monotone" dataKey="views" stroke="#00D4FF" strokeWidth={2} fill="url(#chg)" name="Views" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>

              {/* Channel videos */}
              <SectionTitle>All Videos</SectionTitle>
              <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
                {sel.allVideos.map((v, i) => <VideoCard key={v.video_id} video={v} rank={i + 1} />)}
              </div>
            </>
          )}
        </div>
      </div>
    </div>
  );
};

// ── Tiny helpers ─────────────────────────────────────────────────────────────
const SectionTitle = ({ children }) => (
  <h3 style={{
    fontFamily: "'Syne', sans-serif", fontSize: 14, fontWeight: 700,
    color: '#9CA3AF', margin: '0 0 14px', letterSpacing: 0.5,
    textTransform: 'uppercase',
  }}>{children}</h3>
);

const Badge = ({ children, color = '#00D4FF' }) => (
  <span style={{
    background: `${color}20`, color, borderRadius: 6,
    padding: '1px 8px', fontFamily: "'DM Mono', monospace", fontSize: 11,
    fontWeight: 600, marginLeft: 8,
  }}>{children}</span>
);

const EmptyState = ({ children }) => (
  <div style={{
    textAlign: 'center', padding: '80px 40px',
    fontFamily: "'DM Mono', monospace", fontSize: 14, color: '#4A5568',
  }}>{children}</div>
);

// ── ROOT APP ─────────────────────────────────────────────────────────────────
const DATA_URL = 'https://raw.githubusercontent.com/Ahmad-Rehman109/Gui-Youtube/main/youtube_stats.json';

export default function App() {
  const [data, setData]       = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError]     = useState(null);
  const [page, setPage]       = useState('today');

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!r.ok) throw new Error('Failed to fetch data');
      setData(await r.json());
    } catch (e) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
    const t = setInterval(fetchData, 10 * 60 * 1000);
    return () => clearInterval(t);
  }, []);

  const videos   = data?.videos || [];
  const channels = [...new Set(videos.map(v => v.channel_name))].filter(Boolean);

  return (
    <>
      <FontLoader />
      <style>{`
        * { box-sizing: border-box; margin: 0; padding: 0; }
        body { background: #07070F; color: #F0F0F5; }
        ::-webkit-scrollbar { width: 6px; } 
        ::-webkit-scrollbar-track { background: transparent; }
        ::-webkit-scrollbar-thumb { background: rgba(255,255,255,0.1); border-radius: 3px; }
        @keyframes spin { from { transform: rotate(0deg); } to { transform: rotate(360deg); } }
        @keyframes fadeIn { from { opacity:0; transform:translateY(8px); } to { opacity:1; transform:translateY(0); } }
      `}</style>

      {loading && !data ? (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center',
          background: '#07070F', flexDirection: 'column', gap: 20,
        }}>
          <div style={{
            fontFamily: "'Syne', sans-serif", fontSize: 32, fontWeight: 800,
            color: '#F0F0F5', letterSpacing: -1,
          }}>
            <span style={{ color: '#00D4FF' }}>YT</span>PULSE
          </div>
          <div style={{
            width: 200, height: 2, background: 'rgba(255,255,255,0.06)', borderRadius: 2, overflow: 'hidden',
          }}>
            <div style={{
              height: '100%', width: '40%', background: '#00D4FF',
              borderRadius: 2, animation: 'slideLoad 1.4s ease-in-out infinite',
            }} />
          </div>
          <style>{`@keyframes slideLoad { 0%{transform:translateX(-100%)} 100%{transform:translateX(600%)} }`}</style>
          <span style={{ fontFamily: "'DM Mono', monospace", fontSize: 12, color: '#4A5568' }}>Loading analytics…</span>
        </div>
      ) : error ? (
        <div style={{
          minHeight: '100vh', display: 'flex', alignItems: 'center', justifyContent: 'center', background: '#07070F',
        }}>
          <div style={{ border: '1px solid rgba(239,68,68,0.3)', borderRadius: 16, padding: '32px 40px', maxWidth: 400, textAlign: 'center' }}>
            <p style={{ fontFamily: "'Syne', sans-serif", fontSize: 18, fontWeight: 700, color: '#EF4444', marginBottom: 8 }}>Data Error</p>
            <p style={{ fontFamily: "'DM Mono', monospace", fontSize: 13, color: '#6B7280', marginBottom: 20 }}>{error}</p>
            <button onClick={fetchData} style={{
              background: 'rgba(239,68,68,0.15)', border: '1px solid rgba(239,68,68,0.3)',
              color: '#EF4444', borderRadius: 8, padding: '10px 24px',
              fontFamily: "'DM Mono', monospace", fontSize: 13, cursor: 'pointer',
            }}>Retry</button>
          </div>
        </div>
      ) : (
        <div style={{ display: 'flex', height: '100vh', overflow: 'hidden' }}>
          <Sidebar active={page} setActive={setPage} channelCount={channels.length} videoCount={videos.length} />
          <main style={{ flex: 1, overflowY: 'auto', animation: 'fadeIn 0.25s ease' }}>
            {page === 'today'    && <TodayView    videos={videos} lastUpdated={data?.last_updated} onRefresh={fetchData} loading={loading} />}
            {page === 'overview' && <OverviewView videos={videos} channels={channels} lastUpdated={data?.last_updated} onRefresh={fetchData} loading={loading} />}
            {page === 'videos'   && <AllVideosView videos={videos} lastUpdated={data?.last_updated} onRefresh={fetchData} loading={loading} />}
            {page === 'channels' && <ChannelsView  videos={videos} lastUpdated={data?.last_updated} onRefresh={fetchData} loading={loading} />}
          </main>
        </div>
      )}
    </>
  );
}
