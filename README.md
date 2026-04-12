# Campusly 🎓
### Real campus social network — verified .edu email, Supabase backend

Every account is real. Posts, likes, comments, DMs, and follows are stored in a real PostgreSQL database. Images and videos are stored in real cloud storage. Real-time updates via WebSockets.

---

## Tech Stack

| Layer | Technology |
|---|---|
| Frontend | React 18 + Vite |
| Routing | React Router v6 |
| Database | Supabase (PostgreSQL) |
| Auth | Supabase Auth (email OTP — no password needed) |
| Storage | Supabase Storage (images + videos) |
| Realtime | Supabase Realtime (WebSocket subscriptions) |
| Fonts | Syne + DM Sans (Google Fonts) |

---

## Setup (do this once, takes ~10 minutes)

### Step 1 — Create a Supabase project

1. Go to **https://supabase.com** and sign up (free)
2. Click **New project**
3. Give it a name (e.g. "campusly"), set a database password, choose a region
4. Wait ~2 minutes for provisioning

### Step 2 — Run the database schema

1. In your Supabase dashboard, click **SQL Editor** in the left sidebar
2. Click **New query**
3. Open `supabase/schema.sql` from this project
4. Paste the entire contents into the editor
5. Click **Run** (green button)

You should see "Success. No rows returned."

### Step 3 — Configure storage buckets

The schema.sql creates the storage buckets automatically. Verify them:
1. Go to **Storage** in your Supabase sidebar
2. You should see two buckets: `posts` and `avatars`
3. Both should be **Public**

If they weren't created, create them manually:
- Click "New bucket" → name: `posts` → check "Public bucket" → Save
- Click "New bucket" → name: `avatars` → check "Public bucket" → Save

### Step 4 — Enable Realtime

1. Go to **Database** → **Replication** in your Supabase sidebar
2. Find the `posts` table → toggle ON
3. Find the `messages` table → toggle ON

### Step 5 — Configure auth email templates (optional but recommended)

1. Go to **Authentication** → **Email Templates**
2. Edit the "Magic Link" template subject to: "Your Campusly verification code"
3. The OTP (6-digit code) is sent automatically by Supabase

### Step 6 — Get your API keys

1. Go to **Settings** → **API** in your Supabase dashboard
2. Copy:
   - **Project URL** (looks like `https://abcdefg.supabase.co`)
   - **anon public key** (long string starting with `eyJ...`)

### Step 7 — Set up environment variables

```powershell
# In the campusly folder:
copy .env.example .env
```

Open `.env` and replace the placeholders:
```
VITE_SUPABASE_URL=https://YOUR_PROJECT_ID.supabase.co
VITE_SUPABASE_ANON_KEY=YOUR_ANON_PUBLIC_KEY
```

### Step 8 — Install and run

```powershell
npm install
npm run dev
```

Open `http://localhost:5173`

---

## How the auth flow works

1. User enters their `.edu` email
2. Supabase sends a real 6-digit OTP to that email
3. User enters the code — they're verified and logged in
4. If it's their first time, they're redirected to set up their profile
5. Their campus is automatically detected from the email domain
6. They can only see posts and people from their own campus

No passwords. No fake accounts. Every user is a real verified student.

---

## Adding your whole team

Each teammate just goes to `http://localhost:5173`, enters their `.edu` email, and gets a real OTP. They set up their profile and they're in — on the same campus feed if they share a domain.

For UMD students (umd.edu), all teammates with @umd.edu emails will automatically be in the same UMD community.

---

## Features

- ✅ Real .edu email verification via OTP
- ✅ Campus-gated feed (only your university's posts)
- ✅ Photo and video posts (up to 100MB video, 10MB image)
- ✅ Real-time feed (new posts appear without refresh)
- ✅ Likes and comments with real counts
- ✅ Follow / unfollow other students
- ✅ Direct messages with real-time delivery
- ✅ Profile with avatar upload, bio, major, year
- ✅ Explore page to discover campus students
- ✅ Trending hashtags in the sidebar

---

## Project Structure

```
src/
├── lib/
│   ├── supabase.js          ← Supabase client
│   └── universities.js      ← .edu domain → campus mapping
├── context/
│   └── AuthContext.jsx      ← Auth state, OTP flow, profile
├── hooks/
│   ├── usePosts.js          ← Feed, posts, likes, comments
│   └── useMessages.js       ← DM conversations + realtime
├── pages/
│   ├── Landing.jsx          ← Marketing homepage
│   ├── AuthFlow.jsx         ← Email OTP signup/login
│   ├── ProfileSetup.jsx     ← First-time profile setup
│   ├── Feed.jsx             ← Main campus feed
│   ├── Explore.jsx          ← Discover campus people
│   ├── Messages.jsx         ← DM inbox + chat
│   └── Profile.jsx          ← User profile + edit
└── components/
    ├── Layout.jsx            ← Sidebar nav shell + AvatarImg
    ├── PostComposer.jsx      ← New post with image/video upload
    └── PostCard.jsx          ← Post card with likes, comments
supabase/
└── schema.sql               ← Run this in Supabase SQL Editor
```

---

Built for Bitcamp 2026 · University of Maryland
