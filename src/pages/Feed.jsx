import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import PostComposer from '../components/PostComposer.jsx'
import PostCard from '../components/PostCard.jsx'
import GamesWidget from '../components/GamesWidget.jsx'
import { useAuth } from '../context/useAuth.js'
import { useFeed, getLikedPosts } from '../hooks/usePosts.js'

const panel = {
  background:'rgba(255,255,255,0.055)',
  border:'1px solid rgba(255,255,255,0.10)',
  borderRadius:16,
  backdropFilter:'blur(28px) saturate(150%)',
  WebkitBackdropFilter:'blur(28px) saturate(150%)',
  boxShadow:'0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

function SkeletonPost() {
  return (
    <div style={{ ...panel, marginBottom:12, padding:18 }}>
      <div style={{ display:'flex', gap:10, marginBottom:14 }}>
        <div className="skeleton" style={{ width:38,height:38,borderRadius:'50%',flexShrink:0 }}/>
        <div style={{ flex:1 }}>
          <div className="skeleton" style={{ height:11,width:'38%',marginBottom:7 }}/>
          <div className="skeleton" style={{ height:9,width:'22%' }}/>
        </div>
      </div>
      <div className="skeleton" style={{ height:180,marginBottom:10,borderRadius:12 }}/>
      <div className="skeleton" style={{ height:9,width:'75%',marginBottom:5 }}/>
      <div className="skeleton" style={{ height:9,width:'50%' }}/>
    </div>
  )
}

export default function Feed() {
  const { profile } = useAuth()
  const { posts, loading } = useFeed(profile?.domain)
  const [likedSet, setLikedSet] = useState(new Set())

  useEffect(()=>{ if(profile?.id) getLikedPosts(profile.id).then(setLikedSet) },[profile?.id])
  async function refreshLikes(){ if(profile?.id) setLikedSet(await getLikedPosts(profile.id)) }

  const tagCounts = {}
  posts.forEach(p=>(p.tags||[]).forEach(t=>{tagCounts[t]=(tagCounts[t]||0)+1}))
  const topTags = Object.entries(tagCounts).sort((a,b)=>b[1]-a[1]).slice(0,8)
  const memberCount = new Set(posts.map(p=>p.user_id)).size

  return (
    <Layout>
      <div style={{ display:'flex', gap:24, maxWidth:1040, margin:'0 auto', padding:'28px 20px', alignItems:'flex-start' }}>

        {/* ── Feed column ── */}
        <div style={{ flex:1, minWidth:0 }}>
          <div className="fade-up" style={{ marginBottom:20, display:'flex', alignItems:'center', gap:10 }}>
            <span style={{ fontSize:28 }}>{profile?.campus_emoji||'🎓'}</span>
            <div>
              <h1 style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:24, letterSpacing:'0.03em', lineHeight:1.2 }}>
                <span className="gradient-text">{profile?.campus_short}</span> Feed
              </h1>
              <p style={{ fontFamily:'var(--font-body)', fontSize:13, color:'var(--text-3)', marginTop:3, letterSpacing:'0.05em' }}>Your campus community</p>
            </div>
          </div>

          <PostComposer onPosted={refreshLikes}/>

          {loading
            ? Array.from({length:3}).map((_,i)=><SkeletonPost key={i}/>)
            : posts.length===0
            ? (
              <div style={{ textAlign:'center', padding:'52px 0', color:'var(--text-3)' }}>
                <div style={{ fontSize:40, marginBottom:14 }}>📭</div>
                <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:17, marginBottom:7, color:'var(--text)' }}>No posts yet</div>
                <div style={{ fontSize:13 }}>Be the first to post at {profile?.campus_short}!</div>
              </div>
            )
            : posts.map((post,i)=>(
              <div key={post.id} className="fade-up" style={{ animationDelay:`${i*0.04}s` }}>
                <PostCard post={post} likedSet={likedSet} onLikeChange={refreshLikes}/>
              </div>
            ))
          }
        </div>

        {/* ── Right panel: Games widget ── */}
        <div className="feed-right-panel" style={{ width:272, flexShrink:0, position:'sticky', top:28 }}>
          <GamesWidget />
        </div>

      </div>
    </Layout>
  )
}
