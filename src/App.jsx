import React, { useState, useEffect, useRef } from 'react';
import {
  BarChart, Bar, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Cell,
} from 'recharts';

// ─────────────────────────────────────────────────────────────────────────────
// FONTS
// ─────────────────────────────────────────────────────────────────────────────
const FontLoader = () => {
  useEffect(() => {
    const l = document.createElement('link');
    l.href = 'https://fonts.googleapis.com/css2?family=Syne:wght@400;600;700;800&family=DM+Mono:wght@300;400;500&display=swap';
    l.rel = 'stylesheet';
    document.head.appendChild(l);
  }, []);
  return null;
};

// ─────────────────────────────────────────────────────────────────────────────
// HOOKS
// ─────────────────────────────────────────────────────────────────────────────
const useWindowWidth = () => {
  const [w, setW] = useState(typeof window !== 'undefined' ? window.innerWidth : 1200);
  useEffect(() => {
    const h = () => setW(window.innerWidth);
    window.addEventListener('resize', h);
    return () => window.removeEventListener('resize', h);
  }, []);
  return w;
};

const AnimatedNumber = ({ value, duration = 900 }) => {
  const [d, setD] = useState(0);
  const s = useRef(null), p = useRef(0);
  useEffect(() => {
    const to = value || 0, from = p.current;
    p.current = to; s.current = null;
    const step = (ts) => {
      if (!s.current) s.current = ts;
      const prog = Math.min((ts - s.current) / duration, 1);
      setD(Math.round(from + (to - from) * (1 - Math.pow(1 - prog, 3))));
      if (prog < 1) requestAnimationFrame(step);
    };
    requestAnimationFrame(step);
  }, [value]);
  return <span>{fmt(d)}</span>;
};

// ─────────────────────────────────────────────────────────────────────────────
// HELPERS
// ─────────────────────────────────────────────────────────────────────────────
const fmt = (n) => {
  if (n == null || isNaN(n)) return '0';
  if (n >= 1e6) return (n / 1e6).toFixed(1) + 'M';
  if (n >= 1e3) return (n / 1e3).toFixed(1) + 'K';
  return Math.round(n).toLocaleString();
};

const getDaysAgo = (dateStr) => {
  if (!dateStr) return null;
  const patterns = [
    { r: /(\d+)\s+second/i,  m: 1 / 86400 },
    { r: /(\d+)\s+minute/i,  m: 1 / 1440 },
    { r: /(\d+)\s+hour/i,    m: 1 / 24 },
    { r: /(\d+)\s+day/i,     m: 1 },
    { r: /(\d+)\s+week/i,    m: 7 },
    { r: /(\d+)\s+month/i,   m: 30 },
    { r: /(\d+)\s+year/i,    m: 365 },
  ];
  for (const { r, m } of patterns) {
    const match = dateStr.match(r);
    if (match) return Math.floor(parseInt(match[1]) * m);
  }
  if (/[A-Za-z]+\s+\d+/.test(dateStr)) {
    const d = new Date(dateStr);
    if (!isNaN(d)) return Math.floor(Math.abs(new Date() - d) / 86400000);
  }
  return null;
};

const dayLabel = (daysAgo) => {
  if (daysAgo === 0) return 'Today';
  if (daysAgo === 1) return 'Yesterday';
  return `${daysAgo} days ago`;
};

const ACCENT_COLORS = ['#00D4FF','#A78BFA','#34D399','#F59E0B','#F87171','#60A5FA','#E879F9','#4ADE80','#FB923C','#38BDF8'];

// ─────────────────────────────────────────────────────────────────────────────
// GLOBAL STYLES
// ─────────────────────────────────────────────────────────────────────────────
const GlobalStyles = () => (
  <style>{`
    *{box-sizing:border-box;margin:0;padding:0}
    html,body{background:#07070F;color:#F0F0F5;overflow:hidden}
    ::-webkit-scrollbar{width:4px;height:4px}
    ::-webkit-scrollbar-track{background:transparent}
    ::-webkit-scrollbar-thumb{background:rgba(255,255,255,0.12);border-radius:4px}
    @keyframes spin{from{transform:rotate(0deg)}to{transform:rotate(360deg)}}
    @keyframes fadeUp{from{opacity:0;transform:translateY(10px)}to{opacity:1;transform:translateY(0)}}
    @keyframes shimmer{0%{transform:translateX(-100%)}100%{transform:translateX(400%)}}
    select option{background:#0F0F1A !important;color:#F0F0F5 !important}
    select{appearance:none;-webkit-appearance:none}
    a{text-decoration:none}
    button:focus{outline:none}
  `}</style>
);

// ─────────────────────────────────────────────────────────────────────────────
// CUSTOM TOOLTIP
// ─────────────────────────────────────────────────────────────────────────────
const CustomTooltip = ({ active, payload, label, onLabelClick }) => {
  if (!active || !payload?.length) return null;
  return (
    <div style={{
      background:'rgba(10,10,20,0.97)',
      border:'1px solid rgba(0,212,255,0.25)',
      borderRadius:10, padding:'10px 14px',
      fontFamily:"'DM Mono',monospace", fontSize:11,
      cursor: onLabelClick ? 'pointer' : 'default',
    }} onClick={() => onLabelClick && onLabelClick(payload[0]?.payload)}>
      <p style={{color:'#00D4FF',marginBottom:6,fontWeight:500}}>
        {label}{onLabelClick && <span style={{marginLeft:6,fontSize:10,opacity:0.6}}>↗ view uploads</span>}
      </p>
      {payload.map((e,i) => (
        <p key={i} style={{color:e.color,margin:'2px 0'}}>{e.name}: {fmt(e.value)}</p>
      ))}
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// STAT CARD
// ─────────────────────────────────────────────────────────────────────────────
const StatCard = ({ label, value, sub, accent = '#00D4FF', icon }) => (
  <div style={{
    background:'rgba(255,255,255,0.03)',
    border:`1px solid ${accent}28`,
    borderRadius:14, padding:'14px 16px',
    position:'relative', overflow:'hidden', minWidth:0,
  }}>
    <div style={{position:'absolute',top:0,left:0,right:0,height:2,background:`linear-gradient(90deg,${accent},transparent)`}} />
    <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start',marginBottom:4}}>
      <span style={{color:'#4A5568',fontFamily:"'DM Mono',monospace",fontSize:9,letterSpacing:1.5,textTransform:'uppercase',lineHeight:1.4,paddingRight:4}}>
        {label}
      </span>
      <span style={{fontSize:14,flexShrink:0}}>{icon}</span>
    </div>
    <div style={{fontFamily:"'Syne',sans-serif",fontSize:24,fontWeight:700,color:'#F0F0F5',lineHeight:1.1}}>
      <AnimatedNumber value={typeof value === 'number' ? value : parseFloat(value) || 0} />
    </div>
    {sub && <p style={{color:accent,fontFamily:"'DM Mono',monospace",fontSize:9,marginTop:4,opacity:0.8,lineHeight:1.4}}>{sub}</p>}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// VIDEO CARD
// ─────────────────────────────────────────────────────────────────────────────
const VideoCard = ({ video, rank, onChannelClick, isMobile }) => {
  const er = video.views > 0 ? ((video.likes / video.views) * 100).toFixed(1) : '0.0';
  return (
    <div style={{
      display:'flex', gap:10, padding:'12px',
      background:'rgba(255,255,255,0.03)',
      border:'1px solid rgba(255,255,255,0.07)',
      borderRadius:12, transition:'all 0.2s',
    }}
      onMouseEnter={e=>{e.currentTarget.style.background='rgba(0,212,255,0.05)';e.currentTarget.style.borderColor='rgba(0,212,255,0.2)';}}
      onMouseLeave={e=>{e.currentTarget.style.background='rgba(255,255,255,0.03)';e.currentTarget.style.borderColor='rgba(255,255,255,0.07)';}}
    >
      {rank != null && (
        <div style={{
          width:24,height:24,borderRadius:'50%',flexShrink:0,marginTop:2,
          background: rank<=3 ? 'linear-gradient(135deg,#F59E0B,#EF4444)' : 'rgba(255,255,255,0.08)',
          display:'flex',alignItems:'center',justifyContent:'center',
          fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:600,
          color: rank<=3 ? '#000' : '#555',
        }}>{rank}</div>
      )}
      <a href={video.video_url} target="_blank" rel="noopener noreferrer" style={{flexShrink:0}}>
        <div style={{position:'relative'}}>
          <img src={video.thumbnail} alt={video.title}
            style={{width:isMobile?96:120,height:isMobile?54:68,objectFit:'cover',borderRadius:8,display:'block'}} />
          {video.duration && video.duration !== 'Unknown' && (
            <span style={{
              position:'absolute',bottom:3,right:3,
              background:'rgba(0,0,0,0.85)',color:'#fff',
              fontFamily:"'DM Mono',monospace",fontSize:9,padding:'1px 4px',borderRadius:3,
            }}>{video.duration}</span>
          )}
        </div>
      </a>
      <div style={{flex:1,minWidth:0}}>
        <a href={video.video_url} target="_blank" rel="noopener noreferrer">
          <p style={{
            color:'#F0F0F5',fontFamily:"'Syne',sans-serif",
            fontSize:isMobile?12:13,fontWeight:600,margin:'0 0 3px',lineHeight:1.4,
            display:'-webkit-box',WebkitLineClamp:2,WebkitBoxOrient:'vertical',overflow:'hidden',
          }}>{video.title}</p>
        </a>
        <button onClick={() => onChannelClick && onChannelClick(video.channel_name)}
          style={{
            color:'#00D4FF',fontFamily:"'DM Mono',monospace",fontSize:10,
            margin:'0 0 7px',background:'none',border:'none',cursor:'pointer',
            padding:0,textAlign:'left', display:'block',
            borderBottom:'1px solid rgba(0,212,255,0.25)',paddingBottom:1,
          }}>
          {video.channel_name}
        </button>
        <div style={{display:'flex',gap:10,flexWrap:'wrap'}}>
          {[
            {l:'VIEWS', v:fmt(video.views), c:'#A78BFA'},
            {l:'LIKES', v:fmt(video.likes), c:'#34D399'},
            {l:'ER',    v:`${er}%`,         c:'#F59E0B'},
            {l:'DATE',  v:video.date_posted, c:'#4A5568'},
          ].map(({l,v,c}) => (
            <div key={l}>
              <div style={{color:'#2D3748',fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:1}}>{l}</div>
              <div style={{color:c,fontFamily:"'DM Mono',monospace",fontSize:10,fontWeight:500}}>{v}</div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// PAGE HEADER
// ─────────────────────────────────────────────────────────────────────────────
const PageHeader = ({ title, sub, lastUpdated, onRefresh, loading, onBack }) => (
  <div style={{
    padding:'14px 18px', borderBottom:'1px solid rgba(255,255,255,0.06)',
    display:'flex',alignItems:'center',justifyContent:'space-between',
    background:'rgba(5,5,12,0.7)',backdropFilter:'blur(20px)',
    position:'sticky',top:0,zIndex:100, gap:10,
  }}>
    <div style={{display:'flex',alignItems:'center',gap:10,minWidth:0}}>
      {onBack && (
        <button onClick={onBack} style={{
          background:'rgba(255,255,255,0.07)',border:'1px solid rgba(255,255,255,0.1)',
          borderRadius:8,color:'#9CA3AF',width:30,height:30,
          display:'flex',alignItems:'center',justifyContent:'center',
          cursor:'pointer',flexShrink:0,fontSize:16,
        }}>←</button>
      )}
      <div style={{minWidth:0}}>
        <h1 style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'#F0F0F5',margin:0,lineHeight:1.2,whiteSpace:'nowrap',overflow:'hidden',textOverflow:'ellipsis'}}>{title}</h1>
        {sub && <p style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'#4A5568',margin:'2px 0 0',letterSpacing:0.3}}>{sub}</p>}
      </div>
    </div>
    <button onClick={onRefresh} disabled={loading} style={{
      background:'rgba(0,212,255,0.1)',border:'1px solid rgba(0,212,255,0.2)',
      borderRadius:8,color:'#00D4FF',fontFamily:"'DM Mono',monospace",fontSize:11,
      padding:'7px 12px',cursor:loading?'not-allowed':'pointer',
      display:'flex',alignItems:'center',gap:6,flexShrink:0,
    }}>
      <span style={{display:'inline-block',animation:loading?'spin 1s linear infinite':'none'}}>↻</span>
      {loading ? '…' : 'Sync'}
    </button>
  </div>
);

const STitle = ({children}) => (
  <h3 style={{fontFamily:"'Syne',sans-serif",fontSize:10,fontWeight:700,color:'#374151',
    margin:'0 0 12px',letterSpacing:2,textTransform:'uppercase'}}>{children}</h3>
);

const Card = ({children, style={}}) => (
  <div style={{background:'rgba(255,255,255,0.02)',border:'1px solid rgba(255,255,255,0.07)',
    borderRadius:14,padding:'18px', ...style}}>{children}</div>
);

const EmptyState = ({children}) => (
  <div style={{textAlign:'center',padding:'60px 20px',fontFamily:"'DM Mono',monospace",fontSize:13,color:'#374151'}}>
    {children}
  </div>
);

const DayDivider = ({daysAgo, color='#00D4FF', i}) => (
  <div style={{
    fontFamily:"'DM Mono',monospace",fontSize:9,color,
    letterSpacing:1.5,textTransform:'uppercase',
    padding: i===0 ? '0 0 8px' : '14px 0 8px',
    borderTop: i>0 ? '1px solid rgba(255,255,255,0.05)' : 'none',
  }}>
    ◈ {dayLabel(daysAgo)}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// TODAY VIEW
// ─────────────────────────────────────────────────────────────────────────────
const TodayView = ({ videos, lastUpdated, onRefresh, loading, onChannelClick, isMobile }) => {
  const todayVids     = videos.filter(v => getDaysAgo(v.date_posted) === 0);
  const yesterdayVids = videos.filter(v => getDaysAgo(v.date_posted) === 1);
  const allRecent     = [...todayVids, ...yesterdayVids];

  const tViews = allRecent.reduce((s,v) => s+(v.views||0), 0);
  const tLikes = allRecent.reduce((s,v) => s+(v.likes||0), 0);
  const tEr    = tViews > 0 ? ((tLikes/tViews)*100).toFixed(2) : '0.00';

  const chBreakdown = [...new Set(allRecent.map(v=>v.channel_name))].map((name,idx) => {
    const cv = allRecent.filter(v=>v.channel_name===name);
    const views = cv.reduce((s,v)=>s+(v.views||0),0);
    const likes = cv.reduce((s,v)=>s+(v.likes||0),0);
    return { name, videos:cv.length, views, likes, er: views>0?((likes/views)*100).toFixed(2):'0.00', color:ACCENT_COLORS[idx%ACCENT_COLORS.length] };
  }).sort((a,b)=>b.views-a.views);

  const cols = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title="Today" sub={new Date().toLocaleDateString('en-US',{weekday:'long',month:'long',day:'numeric',year:'numeric'})}
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{padding: isMobile?'14px':'22px 26px', display:'flex',flexDirection:'column',gap:18}}>

        <div style={{display:'grid',gridTemplateColumns:cols,gap:10}}>
          <StatCard label="Videos (48h)"   value={allRecent.length} sub={`${todayVids.length} today · ${yesterdayVids.length} yest.`} accent="#00D4FF" icon="🎬"/>
          <StatCard label="Total Views"    value={tViews}           sub="Last 48 hours"   accent="#A78BFA" icon="👁"/>
          <StatCard label="Total Likes"    value={tLikes}           sub="Last 48 hours"   accent="#34D399" icon="👍"/>
          <StatCard label="Eng. Rate"      value={parseFloat(tEr)}  sub="Likes / Views %" accent="#F59E0B" icon="⚡"/>
        </div>

        {chBreakdown.length > 0 && (
          <Card>
            <STitle>Channel Activity — Last 48h</STitle>
            <div style={{overflowX:'auto'}}>
              <table style={{width:'100%',borderCollapse:'collapse',minWidth:380}}>
                <thead>
                  <tr style={{borderBottom:'1px solid rgba(255,255,255,0.07)'}}>
                    {['CHANNEL','VIDS','VIEWS','LIKES','ENG %'].map(h=>(
                      <th key={h} style={{padding:'8px 12px',textAlign:h==='CHANNEL'?'left':'right',
                        fontFamily:"'DM Mono',monospace",fontSize:8,color:'#374151',letterSpacing:1.5,fontWeight:400}}>
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {chBreakdown.map((c,i) => (
                    <tr key={c.name} style={{borderBottom:i<chBreakdown.length-1?'1px solid rgba(255,255,255,0.04)':'none'}}>
                      <td style={{padding:'10px 12px'}}>
                        <button onClick={() => onChannelClick(c.name)} style={{
                          display:'flex',alignItems:'center',gap:8,background:'none',border:'none',cursor:'pointer',padding:0,
                        }}>
                          <span style={{width:6,height:6,borderRadius:'50%',background:c.color,flexShrink:0}} />
                          <span style={{fontFamily:"'Syne',sans-serif",fontSize:12,fontWeight:600,color:'#F0F0F5',
                            borderBottom:'1px solid rgba(0,212,255,0.3)',paddingBottom:1}}>
                            {c.name}
                          </span>
                        </button>
                      </td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'#A78BFA'}}>{c.videos}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'#F0F0F5'}}>{fmt(c.views)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'#34D399'}}>{fmt(c.likes)}</td>
                      <td style={{padding:'10px 12px',textAlign:'right',fontFamily:"'DM Mono',monospace",fontSize:12,color:'#F59E0B'}}>{c.er}%</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        )}

        {todayVids.length > 0 && (
          <div>
            <STitle>Posted Today — {todayVids.length} videos</STitle>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[...todayVids].sort((a,b)=>(b.views||0)-(a.views||0)).map((v,i)=>(
                <VideoCard key={v.video_id} video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
              ))}
            </div>
          </div>
        )}

        {yesterdayVids.length > 0 && (
          <div>
            <STitle>Posted Yesterday — {yesterdayVids.length} videos</STitle>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {[...yesterdayVids].sort((a,b)=>(b.views||0)-(a.views||0)).map((v,i)=>(
                <VideoCard key={v.video_id} video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
              ))}
            </div>
          </div>
        )}

        {allRecent.length === 0 && <EmptyState>No videos uploaded in the last 48 hours.</EmptyState>}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LAST 24 HOURS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const Last24View = ({ videos, lastUpdated, onRefresh, loading, onChannelClick, isMobile }) => {
  const recentVids = videos.filter(v => { const d=getDaysAgo(v.date_posted); return d!==null&&d<=1; });
  const sorted = [...recentVids].sort((a,b) => {
    const da=getDaysAgo(a.date_posted)??99, db=getDaysAgo(b.date_posted)??99;
    return da!==db ? da-db : (b.views||0)-(a.views||0);
  });
  const views    = recentVids.reduce((s,v)=>s+(v.views||0),0);
  const likes    = recentVids.reduce((s,v)=>s+(v.likes||0),0);
  const channels = [...new Set(recentVids.map(v=>v.channel_name))];
  const er       = views > 0 ? ((likes/views)*100).toFixed(2) : '0.00';
  const cols     = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title="Last 24 Hours" sub="Most recent activity across all channels"
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{padding:isMobile?'14px':'22px 26px',display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'grid',gridTemplateColumns:cols,gap:10}}>
          <StatCard label="Videos"      value={recentVids.length}  sub={`From ${channels.length} channels`} accent="#00D4FF" icon="🎬"/>
          <StatCard label="Total Views" value={views}               sub="Combined"             accent="#A78BFA" icon="👁"/>
          <StatCard label="Total Likes" value={likes}               sub="Combined"             accent="#34D399" icon="👍"/>
          <StatCard label="Eng. Rate"   value={parseFloat(er)}      sub="Likes / Views %"      accent="#F59E0B" icon="⚡"/>
        </div>
        {sorted.length > 0 ? (
          <div>
            <STitle>{sorted.length} videos · sorted by recency then views</STitle>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {sorted.map((v,i) => (
                <div key={v.video_id}>
                  {(i===0 || getDaysAgo(sorted[i-1].date_posted)!==getDaysAgo(v.date_posted)) && (
                    <DayDivider daysAgo={getDaysAgo(v.date_posted)} i={i}/>
                  )}
                  <VideoCard video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
                </div>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState>No videos found in the last 24 hours.</EmptyState>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// LATEST PER CHANNEL VIEW
// ─────────────────────────────────────────────────────────────────────────────
const LatestView = ({ videos, lastUpdated, onRefresh, loading, onChannelClick, isMobile }) => {
  const channels = [...new Set(videos.map(v=>v.channel_name))].filter(Boolean);
  const latestPerChannel = channels.map(name => {
    const cv = videos.filter(v=>v.channel_name===name);
    return cv.reduce((best,v) => {
      const d=getDaysAgo(v.date_posted), bd=getDaysAgo(best.date_posted);
      if(d===null) return best; if(bd===null) return v; return d<bd?v:best;
    });
  }).sort((a,b) => (getDaysAgo(a.date_posted)??999)-(getDaysAgo(b.date_posted)??999));

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title="Latest per Channel" sub="Most recent upload from each channel"
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{padding:isMobile?'14px':'22px 26px',display:'flex',flexDirection:'column',gap:10}}>
        <STitle>{latestPerChannel.length} channels · sorted by upload recency</STitle>
        {latestPerChannel.map((v,i) => (
          <div key={v.channel_name}>
            {(i===0||getDaysAgo(latestPerChannel[i-1].date_posted)!==getDaysAgo(v.date_posted)) && (
              <DayDivider daysAgo={getDaysAgo(v.date_posted)} color="#A78BFA" i={i}/>
            )}
            <VideoCard video={v} rank={null} onChannelClick={onChannelClick} isMobile={isMobile}/>
          </div>
        ))}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// DAY VIEW
// ─────────────────────────────────────────────────────────────────────────────
const DayView = ({ videos, daysAgo, onBack, lastUpdated, onRefresh, loading, onChannelClick, isMobile }) => {
  const dayVids = videos.filter(v => getDaysAgo(v.date_posted) === daysAgo);
  const sorted  = [...dayVids].sort((a,b)=>(b.views||0)-(a.views||0));
  const views   = dayVids.reduce((s,v)=>s+(v.views||0),0);
  const likes   = dayVids.reduce((s,v)=>s+(v.likes||0),0);
  const er      = views>0?((likes/views)*100).toFixed(2):'0.00';
  const label   = dayLabel(daysAgo);
  const cols    = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title={label} sub={`All uploads — ${label.toLowerCase()}`}
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} onBack={onBack} />
      <div style={{padding:isMobile?'14px':'22px 26px',display:'flex',flexDirection:'column',gap:18}}>
        <div style={{display:'grid',gridTemplateColumns:cols,gap:10}}>
          <StatCard label="Videos"      value={dayVids.length}   sub={label}            accent="#00D4FF" icon="🎬"/>
          <StatCard label="Total Views" value={views}             sub="Combined"         accent="#A78BFA" icon="👁"/>
          <StatCard label="Total Likes" value={likes}             sub="Combined"         accent="#34D399" icon="👍"/>
          <StatCard label="Eng. Rate"   value={parseFloat(er)}    sub="Likes / Views %"  accent="#F59E0B" icon="⚡"/>
        </div>
        {sorted.length > 0 ? (
          <div>
            <STitle>{sorted.length} videos uploaded on this day</STitle>
            <div style={{display:'flex',flexDirection:'column',gap:10}}>
              {sorted.map((v,i)=>(
                <VideoCard key={v.video_id} video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
              ))}
            </div>
          </div>
        ) : (
          <EmptyState>No uploads found for this day.</EmptyState>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// OVERVIEW VIEW
// ─────────────────────────────────────────────────────────────────────────────
const OverviewView = ({ videos, channels, lastUpdated, onRefresh, loading, onDayClick, onChannelClick, isMobile }) => {
  const totalViews = videos.reduce((s,v)=>s+(v.views||0),0);
  const totalLikes = videos.reduce((s,v)=>s+(v.likes||0),0);
  const er         = totalViews>0?((totalLikes/totalViews)*100).toFixed(2):'0.00';
  const last7      = videos.filter(v=>{const d=getDaysAgo(v.date_posted);return d!==null&&d<7;});
  const l7Views    = last7.reduce((s,v)=>s+(v.views||0),0);
  const cols       = isMobile ? 'repeat(2,1fr)' : 'repeat(4,1fr)';

  const chartData = Array.from({length:30},(_,i)=>{
    const daysAgo=29-i;
    const dv=videos.filter(v=>getDaysAgo(v.date_posted)===daysAgo);
    return {
      day: daysAgo===0?'Today':daysAgo===1?'Yest':`D-${daysAgo}`,
      daysAgo, views:dv.reduce((s,v)=>s+(v.views||0),0),
      likes:dv.reduce((s,v)=>s+(v.likes||0),0), uploads:dv.length,
    };
  });

  const chStats = channels.map(name=>{
    const cv=videos.filter(v=>v.channel_name===name);
    const views=cv.reduce((s,v)=>s+(v.views||0),0);
    const likes=cv.reduce((s,v)=>s+(v.likes||0),0);
    return {name,views,likes,videos:cv.length,avgViews:Math.round(views/cv.length)};
  }).sort((a,b)=>b.views-a.views);

  const topVideos=[...videos].sort((a,b)=>(b.views||0)-(a.views||0)).slice(0,5);

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title="Overview" sub="All channels · All time"
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{padding:isMobile?'14px':'22px 26px',display:'flex',flexDirection:'column',gap:18}}>

        <div style={{display:'grid',gridTemplateColumns:cols,gap:10}}>
          <StatCard label="Total Views"  value={totalViews}          sub={`${fmt(l7Views)} this week`} accent="#A78BFA" icon="👁"/>
          <StatCard label="Total Likes"  value={totalLikes}          sub="All channels"    accent="#34D399" icon="👍"/>
          <StatCard label="Eng. Rate"    value={parseFloat(er)}      sub="Likes / Views %" accent="#F59E0B" icon="⚡"/>
          <StatCard label="Total Videos" value={videos.length}        sub={`${last7.length} this week`}  accent="#00D4FF" icon="🎬"/>
        </div>

        <Card>
          <STitle>30-Day Views Trend</STitle>
          <ResponsiveContainer width="100%" height={isMobile?150:200}>
            <AreaChart data={chartData} margin={{top:5,right:5,left:0,bottom:5}}>
              <defs>
                <linearGradient id="gv" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="5%"  stopColor="#A78BFA" stopOpacity={0.3}/>
                  <stop offset="95%" stopColor="#A78BFA" stopOpacity={0}/>
                </linearGradient>
              </defs>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)"/>
              <XAxis dataKey="day" stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:8,fill:'#374151'}} tickLine={false}/>
              <YAxis stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:9,fill:'#374151'}} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Area type="monotone" dataKey="views" stroke="#A78BFA" strokeWidth={2} fill="url(#gv)" name="Views" />
            </AreaChart>
          </ResponsiveContainer>
        </Card>

        <Card>
          <STitle>Daily Uploads — tap/click a bar to see that day's videos</STitle>
          <ResponsiveContainer width="100%" height={isMobile?130:165}>
            <BarChart data={chartData.slice(-14)} margin={{top:5,right:5,left:0,bottom:5}}
              onClick={(data)=>{ if(data?.activePayload?.[0]) onDayClick(data.activePayload[0].payload.daysAgo); }}>
              <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
              <XAxis dataKey="day" stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:8,fill:'#374151'}} tickLine={false}/>
              <YAxis stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:9,fill:'#374151'}} tickLine={false}/>
              <Tooltip content={<CustomTooltip/>}/>
              <Bar dataKey="uploads" name="Uploads" radius={[4,4,0,0]} cursor="pointer">
                {chartData.slice(-14).map((d,i)=>(
                  <Cell key={i} fill={d.daysAgo<=1?'#00D4FF':`rgba(0,212,255,${0.2+i*0.04})`}/>
                ))}
              </Bar>
            </BarChart>
          </ResponsiveContainer>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'#2D3748',marginTop:6}}>
            ↑ Cyan = today/yesterday. Click any bar to drill into that day.
          </p>
        </Card>

        {!isMobile && (
          <Card>
            <STitle>Channel Comparison — click a bar to open channel</STitle>
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={chStats} layout="vertical" margin={{top:0,right:10,left:0,bottom:0}}
                onClick={(d)=>{ if(d?.activePayload?.[0]) onChannelClick(d.activePayload[0].payload.name); }}>
                <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" horizontal={false}/>
                <XAxis type="number" stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:9,fill:'#374151'}} tickLine={false}/>
                <YAxis type="category" dataKey="name" stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:9,fill:'#6B7280'}} tickLine={false} width={90}/>
                <Tooltip content={<CustomTooltip/>}/>
                <Bar dataKey="views" name="Views" radius={[0,4,4,0]} cursor="pointer">
                  {chStats.map((_,i)=><Cell key={i} fill={ACCENT_COLORS[i%ACCENT_COLORS.length]}/>)}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          </Card>
        )}

        <div>
          <STitle>Top Performing Videos</STitle>
          <div style={{display:'flex',flexDirection:'column',gap:10}}>
            {topVideos.map((v,i)=>(
              <VideoCard key={v.video_id} video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// ALL VIDEOS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const AllVideosView = ({ videos, lastUpdated, onRefresh, loading, onChannelClick, isMobile }) => {
  const [sortBy,   setSortBy]   = useState('views');
  const [filterCh, setFilterCh] = useState('all');
  const channels = [...new Set(videos.map(v=>v.channel_name))].filter(Boolean);
  const filtered = filterCh==='all' ? videos : videos.filter(v=>v.channel_name===filterCh);
  const sorted   = [...filtered].sort((a,b)=>(b[sortBy]||0)-(a[sortBy]||0));

  return (
    <div style={{animation:'fadeUp 0.25s ease'}}>
      <PageHeader title="All Videos" sub={`${videos.length} total`}
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading} />
      <div style={{padding:isMobile?'12px 14px':'18px 26px'}}>
        <div style={{display:'flex',gap:8,marginBottom:14,flexWrap:'wrap',alignItems:'center'}}>
          <div style={{display:'flex',gap:6,flexWrap:'wrap'}}>
            {[['views','Views'],['likes','Likes'],['comments','Cmts']].map(([k,l])=>(
              <button key={k} onClick={()=>setSortBy(k)} style={{
                padding:'6px 12px',borderRadius:8,cursor:'pointer',
                background:sortBy===k?'rgba(0,212,255,0.12)':'rgba(255,255,255,0.04)',
                border:`1px solid ${sortBy===k?'rgba(0,212,255,0.3)':'rgba(255,255,255,0.08)'}`,
                color:sortBy===k?'#00D4FF':'#6B7280',
                fontFamily:"'DM Mono',monospace",fontSize:11,
              }}>{l}</button>
            ))}
          </div>
          <div style={{position:'relative',flexShrink:0}}>
            <select value={filterCh} onChange={e=>setFilterCh(e.target.value)} style={{
              background:'#0F0F1A',border:'1px solid rgba(255,255,255,0.14)',
              borderRadius:8,color:'#F0F0F5',padding:'6px 28px 6px 12px',
              fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer',minWidth:130,
            }}>
              <option value="all">All Channels</option>
              {channels.map(c=><option key={c} value={c}>{c}</option>)}
            </select>
            <span style={{position:'absolute',right:9,top:'50%',transform:'translateY(-50%)',color:'#4A5568',pointerEvents:'none',fontSize:9}}>▼</span>
          </div>
          <span style={{marginLeft:'auto',fontFamily:"'DM Mono',monospace",fontSize:10,color:'#374151',flexShrink:0}}>
            {sorted.length}
          </span>
        </div>
        <div style={{display:'flex',flexDirection:'column',gap:10}}>
          {sorted.map((v,i)=>(
            <VideoCard key={`${v.video_id}-${i}`} video={v} rank={i+1} onChannelClick={onChannelClick} isMobile={isMobile}/>
          ))}
        </div>
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// CHANNELS VIEW
// ─────────────────────────────────────────────────────────────────────────────
const ChannelsView = ({ videos, lastUpdated, onRefresh, loading, selectedChannel, setSelectedChannel, onDayClick, isMobile }) => {
  const channels = [...new Set(videos.map(v=>v.channel_name))].filter(Boolean);
  const [showList, setShowList] = useState(isMobile ? !selectedChannel : true);

  useEffect(() => { if(isMobile&&selectedChannel) setShowList(false); }, [selectedChannel]);

  const chStats = channels.map((name,idx) => {
    const cv=videos.filter(v=>v.channel_name===name);
    const views=cv.reduce((s,v)=>s+(v.views||0),0);
    const likes=cv.reduce((s,v)=>s+(v.likes||0),0);
    const er=views>0?((likes/views)*100).toFixed(2):'0.00';
    const recent=cv.filter(v=>{const d=getDaysAgo(v.date_posted);return d!==null&&d<7;});
    const chartData=Array.from({length:14},(_,i)=>{
      const da=13-i, dv=cv.filter(v=>getDaysAgo(v.date_posted)===da);
      return {day:da===0?'Today':da===1?'Yest':`D-${da}`,daysAgo:da,views:dv.reduce((s,v)=>s+(v.views||0),0),uploads:dv.length};
    });
    return {name,views,likes,er,videos:cv.length,avgViews:Math.round(views/cv.length),
      subscribers:cv[0]?.subscribers||0,recent:recent.length,
      allVideos:cv.sort((a,b)=>(b.views||0)-(a.views||0)),
      chartData,accent:ACCENT_COLORS[idx%ACCENT_COLORS.length]};
  }).sort((a,b)=>b.views-a.views);

  const sel = selectedChannel ? chStats.find(c=>c.name===selectedChannel) : null;

  return (
    <div style={{animation:'fadeUp 0.25s ease',display:'flex',flexDirection:'column',height:'100%'}}>
      <PageHeader
        title={isMobile&&sel&&!showList ? sel.name : "Channels"}
        sub={isMobile&&sel&&!showList ? `${fmt(sel.subscribers)} subs · ${sel.videos} videos` : `${channels.length} channels`}
        lastUpdated={lastUpdated} onRefresh={onRefresh} loading={loading}
        onBack={isMobile&&sel&&!showList ? ()=>setShowList(true) : undefined}
      />
      <div style={{display:'flex',flex:1,overflow:'hidden'}}>
        {(!isMobile||showList) && (
          <div style={{
            width:isMobile?'100%':250,flexShrink:0,
            borderRight:isMobile?'none':'1px solid rgba(255,255,255,0.06)',
            overflowY:'auto',padding:'10px 0',
          }}>
            {chStats.map((c,i)=>(
              <button key={c.name} onClick={()=>{setSelectedChannel(c.name);if(isMobile)setShowList(false);}} style={{
                display:'block',width:'100%',padding:'10px 16px',textAlign:'left',
                background:selectedChannel===c.name&&!isMobile?'rgba(0,212,255,0.07)':'transparent',
                borderLeft:selectedChannel===c.name&&!isMobile?`2px solid ${c.accent}`:'2px solid transparent',
                border:'none',cursor:'pointer',transition:'all 0.15s',
              }}>
                <div style={{display:'flex',justifyContent:'space-between',alignItems:'flex-start'}}>
                  <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:600,
                    color:selectedChannel===c.name?'#F0F0F5':'#9CA3AF',lineHeight:1.3,display:'block',marginBottom:2}}>
                    {c.name}
                  </span>
                  <span style={{background:`${c.accent}20`,color:c.accent,borderRadius:4,
                    padding:'1px 6px',fontFamily:"'DM Mono',monospace",fontSize:9,fontWeight:600,flexShrink:0,marginLeft:6}}>
                    #{i+1}
                  </span>
                </div>
                <div style={{fontFamily:"'DM Mono',monospace",fontSize:9,color:'#374151'}}>
                  {fmt(c.views)} views · {c.videos} vids
                </div>
              </button>
            ))}
          </div>
        )}
        {(!isMobile||!showList) && (
          <div style={{flex:1,overflowY:'auto',padding:isMobile?'14px':'22px 26px'}}>
            {!sel ? (
              <EmptyState>← Select a channel to view its analytics</EmptyState>
            ) : (
              <div style={{display:'flex',flexDirection:'column',gap:18,animation:'fadeUp 0.2s ease'}}>
                {!isMobile && (
                  <div>
                    <h2 style={{fontFamily:"'Syne',sans-serif",fontSize:22,fontWeight:800,color:'#F0F0F5',margin:0}}>{sel.name}</h2>
                    <p style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#4A5568',margin:'4px 0 0'}}>
                      {fmt(sel.subscribers)} subscribers · {sel.videos} videos · {sel.recent} this week
                    </p>
                  </div>
                )}
                <div style={{display:'grid',gridTemplateColumns:isMobile?'repeat(2,1fr)':'repeat(4,1fr)',gap:10}}>
                  <StatCard label="Total Views" value={sel.views}          accent={sel.accent}  icon="👁"/>
                  <StatCard label="Avg Views"   value={sel.avgViews}       accent="#00D4FF"     icon="📊"/>
                  <StatCard label="Total Likes" value={sel.likes}          accent="#34D399"     icon="👍"/>
                  <StatCard label="Eng. Rate"   value={parseFloat(sel.er)} accent="#F59E0B"     icon="⚡"/>
                </div>
                <Card>
                  <STitle>14-Day Views — click bar to see that day's uploads</STitle>
                  <ResponsiveContainer width="100%" height={isMobile?130:170}>
                    <BarChart data={sel.chartData} margin={{top:5,right:5,left:0,bottom:5}}
                      onClick={(d)=>{ if(d?.activePayload?.[0]) onDayClick(d.activePayload[0].payload.daysAgo); }}>
                      <CartesianGrid strokeDasharray="3 3" stroke="rgba(255,255,255,0.04)" vertical={false}/>
                      <XAxis dataKey="day" stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:8,fill:'#374151'}} tickLine={false}/>
                      <YAxis stroke="transparent" tick={{fontFamily:"'DM Mono',monospace",fontSize:9,fill:'#374151'}} tickLine={false}/>
                      <Tooltip content={<CustomTooltip/>}/>
                      <Bar dataKey="views" name="Views" fill={sel.accent} opacity={0.8} radius={[4,4,0,0]} cursor="pointer"/>
                    </BarChart>
                  </ResponsiveContainer>
                </Card>
                <div>
                  <STitle>All Videos</STitle>
                  <div style={{display:'flex',flexDirection:'column',gap:10}}>
                    {sel.allVideos.map((v,i)=>(
                      <VideoCard key={v.video_id} video={v} rank={i+1} onChannelClick={()=>{}} isMobile={isMobile}/>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

// ─────────────────────────────────────────────────────────────────────────────
// NAV CONFIG
// ─────────────────────────────────────────────────────────────────────────────
const NAV = [
  { id:'today',    label:'Today',     icon:'◈', short:'Today'    },
  { id:'last24',   label:'Last 24h',  icon:'⊙', short:'24h'      },
  { id:'latest',   label:'Latest',    icon:'◐', short:'Latest'   },
  { id:'overview', label:'Overview',  icon:'◉', short:'Overview' },
  { id:'videos',   label:'All Videos',icon:'▤', short:'Videos'   },
  { id:'channels', label:'Channels',  icon:'◫', short:'Channels' },
];

const Sidebar = ({ active, setActive, channelCount, videoCount, lastUpdated }) => (
  <div style={{
    width:210,flexShrink:0,background:'rgba(5,5,12,0.92)',
    borderRight:'1px solid rgba(255,255,255,0.06)',
    display:'flex',flexDirection:'column',padding:'22px 0',
    backdropFilter:'blur(20px)',
  }}>
    <div style={{padding:'0 18px 24px'}}>
      <div style={{fontFamily:"'Syne',sans-serif",fontSize:19,fontWeight:800,color:'#F0F0F5',letterSpacing:-0.5}}>
        <span style={{color:'#00D4FF'}}>YT</span>PULSE
      </div>
      <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:'#2D3748',marginTop:3,letterSpacing:1.5}}>
        ANALYTICS SUITE
      </div>
    </div>
    <nav style={{flex:1}}>
      {NAV.map(({id,label,icon})=>{
        const on=active===id;
        return (
          <button key={id} onClick={()=>setActive(id)} style={{
            display:'flex',alignItems:'center',gap:10,
            width:'100%',padding:'10px 18px',
            background:on?'rgba(0,212,255,0.07)':'transparent',
            borderLeft:on?'2px solid #00D4FF':'2px solid transparent',
            border:'none',cursor:'pointer',textAlign:'left',transition:'all 0.15s',
          }}>
            <span style={{color:on?'#00D4FF':'#2D3748',fontSize:12,width:16,textAlign:'center'}}>{icon}</span>
            <span style={{fontFamily:"'Syne',sans-serif",fontSize:13,fontWeight:on?600:400,color:on?'#F0F0F5':'#4A5568'}}>{label}</span>
          </button>
        );
      })}
    </nav>
    <div style={{padding:'14px 18px',borderTop:'1px solid rgba(255,255,255,0.06)'}}>
      {lastUpdated && (
        <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:'#2D3748',marginBottom:10,letterSpacing:1}}>
          SYNC {new Date(lastUpdated).toLocaleTimeString([],{hour:'2-digit',minute:'2-digit'})}
        </div>
      )}
      <div style={{display:'flex',gap:14}}>
        {[{v:channelCount,l:'channels'},{v:videoCount,l:'videos'}].map(({v,l})=>(
          <div key={l}>
            <div style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'#F0F0F5',lineHeight:1}}>{v}</div>
            <div style={{fontFamily:"'DM Mono',monospace",fontSize:8,color:'#374151',marginTop:2}}>{l}</div>
          </div>
        ))}
      </div>
    </div>
  </div>
);

const BottomNav = ({ active, setActive }) => (
  <div style={{
    position:'fixed',bottom:0,left:0,right:0,
    background:'rgba(5,5,12,0.97)',
    borderTop:'1px solid rgba(255,255,255,0.09)',
    display:'flex',zIndex:200,
    backdropFilter:'blur(20px)',
    paddingBottom:'env(safe-area-inset-bottom)',
  }}>
    {NAV.map(({id,icon,short})=>{
      const on=active===id;
      return (
        <button key={id} onClick={()=>setActive(id)} style={{
          flex:1,padding:'9px 2px 7px',
          background:'transparent',border:'none',cursor:'pointer',
          display:'flex',flexDirection:'column',alignItems:'center',gap:2,
        }}>
          <span style={{fontSize:14,color:on?'#00D4FF':'#374151',lineHeight:1}}>{icon}</span>
          <span style={{fontFamily:"'DM Mono',monospace",fontSize:8,letterSpacing:0.3,color:on?'#00D4FF':'#374151'}}>{short}</span>
          {on && <span style={{width:14,height:1.5,background:'#00D4FF',borderRadius:1}}/>}
        </button>
      );
    })}
  </div>
);

// ─────────────────────────────────────────────────────────────────────────────
// ROOT APP
// ─────────────────────────────────────────────────────────────────────────────
const DATA_URL = 'https://raw.githubusercontent.com/Ahmad-Rehman109/Gui-Youtube/main/youtube_stats.json';

export default function App() {
  const [data,       setData]       = useState(null);
  const [loading,    setLoading]    = useState(true);
  const [error,      setError]      = useState(null);
  const [page,       setPage]       = useState('today');
  const [prevPage,   setPrevPage]   = useState('overview');
  const [selChannel, setSelChannel] = useState(null);
  const [selDay,     setSelDay]     = useState(null);
  const width    = useWindowWidth();
  const isMobile = width < 768;

  const fetchData = async () => {
    setLoading(true); setError(null);
    try {
      const r = await fetch(`${DATA_URL}?t=${Date.now()}`);
      if (!r.ok) throw new Error('Failed to fetch');
      setData(await r.json());
    } catch(e) { setError(e.message); }
    finally { setLoading(false); }
  };

  useEffect(()=>{ fetchData(); const t=setInterval(fetchData,10*60*1000); return()=>clearInterval(t); },[]);

  const goToChannel = (name) => { setSelChannel(name); setPrevPage(page); setPage('channels'); };
  const goToDay     = (da)   => { setSelDay(da); setPrevPage(page); setPage('day-view'); };
  const navTo       = (p)    => { setPrevPage(page); setPage(p); };

  const videos   = data?.videos || [];
  const channels = [...new Set(videos.map(v=>v.channel_name))].filter(Boolean);
  const common   = { lastUpdated:data?.last_updated, onRefresh:fetchData, loading, isMobile };

  if(loading&&!data) return (
    <><GlobalStyles/><FontLoader/>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',
        background:'#07070F',flexDirection:'column',gap:22}}>
        <div style={{fontFamily:"'Syne',sans-serif",fontSize:34,fontWeight:800,color:'#F0F0F5',letterSpacing:-1}}>
          <span style={{color:'#00D4FF'}}>YT</span>PULSE
        </div>
        <div style={{width:160,height:2,background:'rgba(255,255,255,0.06)',borderRadius:2,overflow:'hidden'}}>
          <div style={{height:'100%',width:'35%',background:'#00D4FF',borderRadius:2,animation:'shimmer 1.4s ease-in-out infinite'}}/>
        </div>
        <span style={{fontFamily:"'DM Mono',monospace",fontSize:10,color:'#2D3748',letterSpacing:2}}>LOADING</span>
      </div>
    </>
  );

  if(error) return (
    <><GlobalStyles/><FontLoader/>
      <div style={{minHeight:'100vh',display:'flex',alignItems:'center',justifyContent:'center',background:'#07070F'}}>
        <div style={{border:'1px solid rgba(239,68,68,0.25)',borderRadius:14,padding:'30px 36px',maxWidth:360,textAlign:'center'}}>
          <p style={{fontFamily:"'Syne',sans-serif",fontSize:17,fontWeight:700,color:'#EF4444',marginBottom:8}}>Connection Error</p>
          <p style={{fontFamily:"'DM Mono',monospace",fontSize:11,color:'#4A5568',marginBottom:18}}>{error}</p>
          <button onClick={fetchData} style={{
            background:'rgba(239,68,68,0.12)',border:'1px solid rgba(239,68,68,0.25)',
            color:'#EF4444',borderRadius:8,padding:'9px 22px',
            fontFamily:"'DM Mono',monospace",fontSize:11,cursor:'pointer',
          }}>RETRY</button>
        </div>
      </div>
    </>
  );

  return (
    <><GlobalStyles/><FontLoader/>
      <div style={{display:'flex',height:'100vh',overflow:'hidden'}}>
        {!isMobile && (
          <Sidebar active={page} setActive={setPage}
            channelCount={channels.length} videoCount={videos.length}
            lastUpdated={data?.last_updated}/>
        )}
        <main style={{flex:1,overflowY:'auto',paddingBottom:isMobile?60:0}}>
          {page==='today'    && <TodayView    videos={videos} onChannelClick={goToChannel} {...common}/>}
          {page==='last24'   && <Last24View   videos={videos} onChannelClick={goToChannel} {...common}/>}
          {page==='latest'   && <LatestView   videos={videos} onChannelClick={goToChannel} {...common}/>}
          {page==='overview' && <OverviewView videos={videos} channels={channels} onDayClick={goToDay} onChannelClick={goToChannel} {...common}/>}
          {page==='videos'   && <AllVideosView videos={videos} onChannelClick={goToChannel} {...common}/>}
          {page==='channels' && <ChannelsView  videos={videos} selectedChannel={selChannel} setSelectedChannel={setSelChannel} onDayClick={goToDay} {...common}/>}
          {page==='day-view' && <DayView       videos={videos} daysAgo={selDay} onChannelClick={goToChannel} onBack={()=>setPage(prevPage)} {...common}/>}
        </main>
        {isMobile && <BottomNav active={page} setActive={setPage}/>}
      </div>
    </>
  );
}
