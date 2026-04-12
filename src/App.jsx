import { Routes, Route, Navigate } from 'react-router-dom'
import { AuthProvider } from './context/AuthContext.jsx'
import { useAuth } from './context/useAuth.js'
import { ThemeProvider } from './context/ThemeContext.jsx'
import Landing      from './pages/Landing.jsx'
import AuthFlow     from './pages/AuthFlow.jsx'
import Feed         from './pages/Feed.jsx'
import Explore      from './pages/Explore.jsx'
import Messages     from './pages/Messages.jsx'
import Profile      from './pages/Profile.jsx'
import Threads      from './pages/Threads.jsx'
import ThreadDetail from './pages/ThreadDetail.jsx'
import Groups       from './pages/Groups.jsx'
import GroupDetail  from './pages/GroupDetail.jsx'
import Spots        from './pages/Spots.jsx'
import CampusMap    from './pages/CampusMap.jsx'
import StudyBuddy   from './pages/StudyBuddy.jsx'
import LostFound    from './pages/LostFound.jsx'
import MoodBoard      from './pages/MoodBoard.jsx'
import Notifications  from './pages/Notifications.jsx'
import DailyGames     from './pages/DailyGames.jsx'
import Marketplace    from './pages/Marketplace.jsx'
import Info           from './pages/Info.jsx'
import PostDetail     from './pages/PostDetail.jsx'

function Spinner() {
  return (
    <div style={{ display:'flex', alignItems:'center', justifyContent:'center', height:'100vh', background:'#070710' }}>
      <div style={{ width:32, height:32, border:'3px solid rgba(167,139,250,0.2)', borderTopColor:'#a78bfa', borderRadius:'50%', animation:'spin 0.7s linear infinite' }} />
    </div>
  )
}

function AppRoutes() {
  const { session, profile, loading, isRecovery } = useAuth()

  if (loading) return <Spinner />

  // Password-reset link — always show auth flow
  if (isRecovery) {
    return (
      <Routes>
        <Route path="*" element={<AuthFlow />} />
      </Routes>
    )
  }

  if (!session) {
    return (
      <Routes>
        <Route path="/"     element={<Landing />} />
        <Route path="/join" element={<AuthFlow />} />
        <Route path="*"     element={<Navigate to="/" replace />} />
      </Routes>
    )
  }

  // Logged in but profile not set up yet — AuthFlow handles the profile step.
  // Also check sessionStorage flags for users mid-onboarding (password or profile step
  // not yet complete). The DB trigger auto-creates a profile with display_name so we
  // can't rely on that alone to detect incomplete onboarding.
  const needsSetup =
    !profile?.display_name ||
    sessionStorage.getItem('campusly_needs_pw') === '1' ||
    sessionStorage.getItem('campusly_needs_profile') === '1' ||
    sessionStorage.getItem('campusly_needs_reset') === '1'
  if (needsSetup) {
    return (
      <Routes>
        <Route path="*" element={<AuthFlow />} />
      </Routes>
    )
  }

  return (
    <Routes>
      <Route path="/"                  element={<Feed />} />
      <Route path="/explore"           element={<Explore />} />
      <Route path="/messages"          element={<Messages />} />
      <Route path="/messages/:userId"  element={<Messages />} />
      <Route path="/profile"           element={<Profile />} />
      <Route path="/profile/:username" element={<Profile />} />
      <Route path="/threads"           element={<Threads />} />
      <Route path="/threads/:id"       element={<ThreadDetail />} />
      <Route path="/groups"            element={<Groups />} />
      <Route path="/groups/:id"        element={<GroupDetail />} />
      <Route path="/spots"             element={<Spots />} />
      <Route path="/map"               element={<CampusMap />} />
      <Route path="/study-buddy"       element={<StudyBuddy />} />
      <Route path="/lost-found"        element={<LostFound />} />
      <Route path="/mood"              element={<MoodBoard />} />
      <Route path="/notifications"    element={<Notifications />} />
      <Route path="/games"            element={<DailyGames />} />
      <Route path="/marketplace"      element={<Marketplace />} />
      <Route path="/info"             element={<Info />} />
      <Route path="/post/:id"         element={<PostDetail />} />
      <Route path="*"                  element={<Navigate to="/" replace />} />
    </Routes>
  )
}

export default function App() {
  return (
    <ThemeProvider>
      <AuthProvider>
        <AppRoutes />
      </AuthProvider>
    </ThemeProvider>
  )
}
