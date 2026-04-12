import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'
import { supabase } from '../lib/supabase.js'

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

const EMOJIS = ['👥','💻','🧬','⚗️','📐','🏛️','🎨','🎭','🎶','⚽','📚','🌍','🔬','💡','🤖','🏥','⚖️','🌱','🎮','✈️']

function CreateGroupModal({ onClose, onCreated, domain, campusColor }) {
  const { profile } = useAuth()
  const fileRef = useRef(null)
  const [name, setName]           = useState('')
  const [description, setDesc]    = useState('')
  const [topic, setTopic]         = useState('')
  const [tagInput, setTagInput]   = useState('')
  const [emoji, setEmoji]         = useState('👥')
  const [imageFile, setImageFile] = useState(null)
  const [imagePreview, setPreview] = useState(null)
  const [posting, setPosting]     = useState(false)
  const [error, setError]         = useState('')

  function handleFileChange(e) {
    const file = e.target.files?.[0]
    if (!file) return
    if (file.size > 5 * 1024 * 1024) { setError('Image must be under 5 MB'); return }
    setImageFile(file)
    setPreview(URL.createObjectURL(file))
    setError('')
  }

  function clearImage() {
    setImageFile(null)
    setPreview(null)
    if (fileRef.current) fileRef.current.value = ''
  }

  async function handleSubmit(e) {
    e.preventDefault()
    if (!name.trim()) return
    setPosting(true)
    setError('')
    const tags = tagInput.split(',').map(t => t.trim().replace(/^#/, '')).filter(Boolean)
    const { data: group, error: err } = await supabase.from('groups').insert({
      domain,
      name: name.trim(),
      description: description.trim(),
      topic: topic.trim(),
      tags,
      avatar_emoji: emoji,
      created_by: profile.id,
      members_count: 1,
    }).select().single()

    if (err) { setError(err.message); setPosting(false); return }

    // Upload image if selected
    if (imageFile) {
      const ext = imageFile.name.split('.').pop()
      const path = `${group.id}/icon.${ext}`
      const { error: uploadErr } = await supabase.storage
        .from('group-avatars')
        .upload(path, imageFile, { upsert: true })
      if (!uploadErr) {
        const { data: urlData } = supabase.storage.from('group-avatars').getPublicUrl(path)
        await supabase.from('groups').update({ avatar_url: urlData.publicUrl + '?t=' + Date.now() }).eq('id', group.id)
      }
    }

    // Auto-join as admin
    await supabase.from('group_members').insert({ group_id: group.id, user_id: profile.id, role: 'admin' })
    setPosting(false)
    onCreated()
    onClose()
  }

  return (
    <div style={{ position:'fixed', inset:0, background:'rgba(7,7,16,0.75)', zIndex:500, display:'flex', alignItems:'center', justifyContent:'center', padding:16 }} onClick={onClose}>
      <div className="scale-in" style={{ ...panel, background:'rgba(255,255,255,0.07)', width:'100%', maxWidth:520, padding:28, maxHeight:'90vh', overflowY:'auto' }} onClick={e => e.stopPropagation()}>
        <div style={{ display:'flex', justifyContent:'space-between', alignItems:'center', marginBottom:20 }}>
          <h2 style={{ fontFamily:'var(--font-display)', fontSize:18 }}>Create Group</h2>
          <button className="btn-ghost" style={{ padding:'4px 10px', fontSize:18 }} onClick={onClose}>×</button>
        </div>

        <form onSubmit={handleSubmit} style={{ display:'flex', flexDirection:'column', gap:14 }}>
          {/* Icon section */}
          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:8, letterSpacing:'0.06em', textTransform:'uppercase' }}>Group Icon</label>

            {/* Image upload area */}
            <div style={{ display:'flex', alignItems:'center', gap:12, marginBottom:10 }}>
              {/* Preview / placeholder */}
              <div style={{
                width:60, height:60, borderRadius:14, flexShrink:0, overflow:'hidden',
                background:`${campusColor}18`, border:`1px solid ${campusColor}30`,
                display:'flex', alignItems:'center', justifyContent:'center',
              }}>
                {imagePreview
                  ? <img src={imagePreview} alt="preview" style={{ width:'100%', height:'100%', objectFit:'cover' }} />
                  : <span style={{ fontSize:26 }}>{emoji}</span>
                }
              </div>
              <div style={{ display:'flex', flexDirection:'column', gap:6 }}>
                <input ref={fileRef} type="file" accept="image/*" style={{ display:'none' }} onChange={handleFileChange} />
                <button
                  type="button"
                  className="btn-ghost"
                  style={{ fontSize:12, padding:'6px 14px' }}
                  onClick={() => fileRef.current?.click()}
                >
                  {imagePreview ? 'Change image' : 'Upload image'}
                </button>
                {imagePreview && (
                  <button type="button" className="btn-ghost" style={{ fontSize:11, padding:'4px 10px', color:'var(--text-3)' }} onClick={clearImage}>
                    Remove
                  </button>
                )}
              </div>
            </div>

            {/* Emoji picker (shown when no image uploaded) */}
            {!imagePreview && (
              <div>
                <div style={{ fontSize:10, color:'var(--text-3)', marginBottom:6 }}>Or pick an emoji</div>
                <div style={{ display:'flex', flexWrap:'wrap', gap:6 }}>
                  {EMOJIS.map(e => (
                    <button key={e} type="button" onClick={() => setEmoji(e)} style={{
                      fontSize:20, padding:'6px 8px', borderRadius:8, border:`1px solid ${emoji === e ? campusColor+'55' : 'rgba(255,255,255,0.08)'}`,
                      background: emoji === e ? `${campusColor}18` : 'transparent', cursor:'pointer',
                    }}>
                      {e}
                    </button>
                  ))}
                </div>
              </div>
            )}
          </div>

          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Group Name *</label>
            <input value={name} onChange={e => setName(e.target.value)} placeholder="CS Study Group, Pre-Med Society…" maxLength={80} required />
          </div>

          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Topic / Field</label>
            <input value={topic} onChange={e => setTopic(e.target.value)} placeholder="Computer Science, Biology, Architecture…" maxLength={60} />
          </div>

          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Description</label>
            <textarea value={description} onChange={e => setDesc(e.target.value)} placeholder="What is this group about?" rows={3} style={{ resize:'vertical', minHeight:72 }} />
          </div>

          <div>
            <label style={{ fontSize:11, color:'var(--text-3)', display:'block', marginBottom:5, letterSpacing:'0.06em', textTransform:'uppercase' }}>Tags</label>
            <input value={tagInput} onChange={e => setTagInput(e.target.value)} placeholder="algorithms, research, internships (comma separated)" />
          </div>

          {error && <div style={{ fontSize:12, color:'var(--red)', background:'var(--red-bg)', borderRadius:8, padding:'8px 12px' }}>{error}</div>}

          <div style={{ display:'flex', gap:10, justifyContent:'flex-end', marginTop:4 }}>
            <button type="button" className="btn-ghost" onClick={onClose}>Cancel</button>
            <button type="submit" className="btn-primary" disabled={posting || !name.trim()}>
              {posting ? 'Creating…' : 'Create Group'}
            </button>
          </div>
        </form>
      </div>
    </div>
  )
}

function GroupCard({ group, isMember, onJoin, campusColor }) {
  const navigate = useNavigate()
  return (
    <div
      className="hover-lift"
      style={{ ...panel, padding:'16px 18px', display:'flex', gap:14, cursor:'pointer' }}
      onClick={() => navigate(`/groups/${group.id}`)}
    >
      <div style={{
        width:48, height:48, borderRadius:12, flexShrink:0, overflow:'hidden',
        background:`${campusColor}18`, border:`1px solid ${campusColor}30`,
        display:'flex', alignItems:'center', justifyContent:'center', fontSize:22,
      }}>
        {group.avatar_url
          ? <img src={group.avatar_url} alt={group.name} style={{ width:'100%', height:'100%', objectFit:'cover' }} />
          : (group.avatar_emoji || '👥')
        }
      </div>

      <div style={{ flex:1, minWidth:0 }}>
        <div style={{ fontFamily:'var(--font-display)', fontWeight:700, fontSize:14, marginBottom:2 }}>{group.name}</div>
        {group.topic && (
          <div style={{ fontSize:11, color:campusColor, fontWeight:600, marginBottom:4 }}>{group.topic}</div>
        )}
        {group.description && (
          <p style={{ fontSize:12, color:'var(--text-2)', lineHeight:1.5, marginBottom:8, overflow:'hidden', display:'-webkit-box', WebkitLineClamp:2, WebkitBoxOrient:'vertical' }}>
            {group.description}
          </p>
        )}
        <div style={{ display:'flex', alignItems:'center', gap:10, flexWrap:'wrap' }}>
          <span style={{ fontSize:11, color:'var(--text-2)' }}>
            👤 {group.real_members ?? 0} {group.real_members === 1 ? 'member' : 'members'}
          </span>
          <span style={{ fontSize:11, color:'var(--text-2)' }}>
            📝 {group.posts_count ?? 0} posts
          </span>
          <button
            onClick={e => { e.stopPropagation(); onJoin(group.id) }}
            className={isMember ? '' : 'btn-primary'}
            style={{
              marginLeft:'auto', fontSize:11, padding:'4px 14px',
              background: isMember ? 'rgba(255,255,255,0.06)' : undefined,
              border: isMember ? '1px solid rgba(255,255,255,0.10)' : undefined,
              color: isMember ? 'var(--text-2)' : undefined,
            }}
          >
            {isMember ? 'Joined' : 'Join'}
          </button>
        </div>
      </div>
    </div>
  )
}

export default function Groups() {
  const { profile } = useAuth()
  const [groups, setGroups]       = useState([])
  const [memberships, setMembers] = useState(new Set())
  const [search, setSearch]       = useState('')
  const [loading, setLoading]     = useState(true)
  const [showCreate, setShowCreate] = useState(false)
  const campusColor = profile?.campus_color || '#a78bfa'

  useEffect(() => {
    if (profile?.domain) { loadGroups(); loadMemberships() }
  }, [profile?.domain])

  async function loadGroups() {
    setLoading(true)
    const { data } = await supabase
      .from('groups')
      .select('*, group_members(count)')
      .eq('domain', profile.domain)

    if (data) {
      // Attach real member count and auto-delete groups with 0 members
      const withCounts = data.map(g => ({ ...g, real_members: g.group_members?.[0]?.count ?? 0 }))
      const empty = withCounts.filter(g => g.real_members === 0)
      for (const g of empty) {
        await supabase.from('group_post_likes').delete().eq('group_id', g.id)
        await supabase.from('group_posts').delete().eq('group_id', g.id)
        await supabase.from('group_members').delete().eq('group_id', g.id)
        await supabase.from('groups').delete().eq('id', g.id)
      }
      setGroups(withCounts.filter(g => g.real_members > 0).sort((a, b) => b.real_members - a.real_members))
    }
    setLoading(false)
  }

  async function loadMemberships() {
    const { data } = await supabase
      .from('group_members')
      .select('group_id')
      .eq('user_id', profile.id)
    setMembers(new Set((data || []).map(m => m.group_id)))
  }

  async function handleJoin(groupId) {
    const isMember = memberships.has(groupId)
    if (isMember) {
      await supabase.from('group_members').delete().eq('group_id', groupId).eq('user_id', profile.id)
      setMembers(s => { const n = new Set(s); n.delete(groupId); return n })
      const updated = groups.map(g => g.id === groupId ? { ...g, real_members: Math.max(0, (g.real_members || 1) - 1) } : g)
      const remaining = updated.find(g => g.id === groupId)?.real_members ?? 0
      if (remaining === 0) {
        await supabase.from('group_post_likes').delete().eq('group_id', groupId)
        await supabase.from('group_posts').delete().eq('group_id', groupId)
        await supabase.from('group_members').delete().eq('group_id', groupId)
        await supabase.from('groups').delete().eq('id', groupId)
        setGroups(prev => prev.filter(g => g.id !== groupId))
      } else {
        setGroups(updated)
      }
    } else {
      await supabase.from('group_members').insert({ group_id: groupId, user_id: profile.id })
      setMembers(s => new Set(s).add(groupId))
      setGroups(prev => prev.map(g => g.id === groupId ? { ...g, real_members: (g.real_members || 0) + 1 } : g))
    }
  }

  const filtered = groups.filter(g => {
    if (!search) return true
    const q = search.toLowerCase()
    return (
      g.name?.toLowerCase().includes(q) ||
      g.topic?.toLowerCase().includes(q) ||
      g.description?.toLowerCase().includes(q) ||
      (g.tags || []).some(t => t.toLowerCase().includes(q))
    )
  })

  const myGroups    = filtered.filter(g => memberships.has(g.id))
  const otherGroups = filtered.filter(g => !memberships.has(g.id))

  return (
    <Layout>
      <div style={{ maxWidth:760, margin:'0 auto', padding:'28px 20px' }}>

        <div className="fade-up" style={{ display:'flex', alignItems:'center', gap:12, marginBottom:20 }}>
          <div style={{ flex:1 }}>
            <h1 style={{ fontFamily:'var(--font-display)', fontWeight:800, fontSize:26, letterSpacing:'-0.03em', marginBottom:5 }}>
              Groups <span className="gradient-text">{profile?.campus_short}</span>
            </h1>
            <p style={{ color:'var(--text-2)', fontSize:14 }}>Find your people by major, interest, or club</p>
          </div>
          <button className="btn-primary" onClick={() => setShowCreate(true)} style={{ fontSize:13, padding:'8px 16px', flexShrink:0 }}>
            + New Group
          </button>
        </div>

        <div className="fade-up d1" style={{ marginBottom:24 }}>
          <input
            placeholder="Search groups by name, topic, or tag…"
            value={search}
            onChange={e => setSearch(e.target.value)}
            style={{ fontSize:14 }}
            autoFocus
          />
        </div>

        {loading ? (
          <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
            {Array.from({ length:4 }).map((_, i) => (
              <div key={i} style={{ ...panel, padding:'16px 18px', display:'flex', gap:14 }}>
                <div className="skeleton" style={{ width:48, height:48, borderRadius:12, flexShrink:0 }} />
                <div style={{ flex:1 }}>
                  <div className="skeleton" style={{ height:13, width:'50%', marginBottom:6 }} />
                  <div className="skeleton" style={{ height:10, width:'30%', marginBottom:8 }} />
                  <div className="skeleton" style={{ height:10, width:'70%' }} />
                </div>
              </div>
            ))}
          </div>
        ) : filtered.length === 0 ? (
          <div style={{ ...panel, textAlign:'center', padding:'60px 0', color:'var(--text-3)' }}>
            <div style={{ fontSize:40, marginBottom:12 }}>👥</div>
            <div style={{ fontSize:15 }}>
              {search ? 'No groups match your search' : 'No groups yet — create the first one!'}
            </div>
          </div>
        ) : (
          <>
            {myGroups.length > 0 && (
              <section style={{ marginBottom:28 }}>
                <div style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>Your Groups</div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {myGroups.map((g, i) => (
                    <div key={g.id} className="fade-up" style={{ animationDelay:`${i * 0.04}s` }}>
                      <GroupCard group={g} isMember={true} onJoin={handleJoin} campusColor={campusColor} />
                    </div>
                  ))}
                </div>
              </section>
            )}

            {otherGroups.length > 0 && (
              <section>
                <div style={{ fontSize:11, color:'var(--text-3)', letterSpacing:'0.07em', textTransform:'uppercase', marginBottom:10 }}>
                  {myGroups.length > 0 ? 'Discover More' : 'All Groups'}
                </div>
                <div style={{ display:'flex', flexDirection:'column', gap:10 }}>
                  {otherGroups.map((g, i) => (
                    <div key={g.id} className="fade-up" style={{ animationDelay:`${i * 0.04}s` }}>
                      <GroupCard group={g} isMember={false} onJoin={handleJoin} campusColor={campusColor} />
                    </div>
                  ))}
                </div>
              </section>
            )}
          </>
        )}
      </div>

      {showCreate && (
        <CreateGroupModal
          domain={profile?.domain}
          campusColor={campusColor}
          onClose={() => setShowCreate(false)}
          onCreated={loadGroups}
        />
      )}
    </Layout>
  )
}
