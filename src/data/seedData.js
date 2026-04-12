/**
 * seedData.js
 * Demo seed data — in a real app this would come from a backend.
 * Posts, users, and messages are scoped per campus domain.
 */

export const SEED_USERS = {
  'umd.edu': [
    { id: 'u1', name: 'Alex Rivera',    username: 'alexr',    avatar: '🧑‍💻', major: 'CS',          year: 'Junior',  bio: 'Building things. Late nights in AVW.',        domain: 'umd.edu' },
    { id: 'u2', name: 'Priya Nair',     username: 'priyan',   avatar: '👩‍🔬', major: 'Biochem',     year: 'Senior',  bio: 'Research lab rat. Coffee addict.',            domain: 'umd.edu' },
    { id: 'u3', name: 'Jordan Kim',     username: 'jordank',  avatar: '🧑‍🎨', major: 'Design',      year: 'Sophomore',bio: 'Art + tech. STAMP building regular.',        domain: 'umd.edu' },
    { id: 'u4', name: 'Marcus Webb',    username: 'marcusw',  avatar: '🧑‍🎓', major: 'Finance',     year: 'Junior',  bio: 'Smith School. Trading on the side.',          domain: 'umd.edu' },
    { id: 'u5', name: 'Sofia Chen',     username: 'sofiac',   avatar: '👩‍💻', major: 'Math+CS',     year: 'Senior',  bio: 'TA for CMSC132. Ask me about trees.',         domain: 'umd.edu' },
  ],
  'mit.edu': [
    { id: 'm1', name: 'Aiden Park',     username: 'aidenp',   avatar: '🧑‍🔬', major: 'Physics',     year: 'Junior',  bio: 'Plasma lab. Thesis on fusion reactors.',      domain: 'mit.edu' },
    { id: 'm2', name: 'Leila Hassan',   username: 'leilah',   avatar: '👩‍💻', major: 'EECS',        year: 'Senior',  bio: 'Robotics team captain. 6.004 is my love.',    domain: 'mit.edu' },
    { id: 'm3', name: 'Tom Nguyen',     username: 'tomn',     avatar: '🧑‍🏫', major: 'Math',        year: 'Sophomore',bio: '18.06 changed my life.',                     domain: 'mit.edu' },
  ],
  'nyu.edu': [
    { id: 'n1', name: 'Zara Mitchell',  username: 'zaram',    avatar: '👩‍🎤', major: 'Film',        year: 'Junior',  bio: 'Tisch. Directing my first short.',            domain: 'nyu.edu' },
    { id: 'n2', name: 'Eli Torres',     username: 'elit',     avatar: '🧑‍💼', major: 'Finance',     year: 'Senior',  bio: 'Stern. Interning at Goldman this summer.',    domain: 'nyu.edu' },
  ],
}

// Fill all other campuses with generic demo users
const DEFAULT_USERS = (domain) => [
  { id: `${domain}-1`, name: 'Sam Lee',      username: 'saml',    avatar: '🧑‍💻', major: 'CS',     year: 'Junior',   bio: 'Building cool stuff.', domain },
  { id: `${domain}-2`, name: 'Maya Johnson', username: 'mayaj',   avatar: '👩‍🎓', major: 'Biology', year: 'Senior',   bio: 'Science nerd.', domain },
  { id: `${domain}-3`, name: 'Chris Park',   username: 'chrisp',  avatar: '🧑‍🎨', major: 'Design',  year: 'Sophomore',bio: 'Making things look good.', domain },
]

export function getUsersForDomain(domain) {
  return SEED_USERS[domain] || DEFAULT_USERS(domain)
}

export const SEED_POSTS = {
  'umd.edu': [
    {
      id: 'p1', userId: 'u1', domain: 'umd.edu',
      content: 'Just pushed my Bitcamp project at 4am. Sleep is a myth. The grind is real 💀 anyone else still in the armory?',
      image: null, likes: 47, comments: 12, timestamp: Date.now() - 1000 * 60 * 15,
      tags: ['Bitcamp', 'hackathon'],
    },
    {
      id: 'p2', userId: 'u2', domain: 'umd.edu',
      content: 'McKeldin library at midnight hits different. The quiet 4th floor is unmatched for studying. 📚 BSCI 440 exam tmr, send help',
      image: null, likes: 89, comments: 23, timestamp: Date.now() - 1000 * 60 * 45,
      tags: ['studying', 'McKeldin'],
    },
    {
      id: 'p3', userId: 'u3', domain: 'umd.edu',
      content: 'The new mural outside STAMP is incredible. Campus is really leveling up its art game lately 🎨',
      image: null, likes: 134, comments: 8, timestamp: Date.now() - 1000 * 60 * 90,
      tags: ['art', 'campus'],
    },
    {
      id: 'p4', userId: 'u5', domain: 'umd.edu',
      content: 'Office hours for CMSC132 section 0201 moved to ESJ 0204 this week. Pass it on! 🐢',
      image: null, likes: 62, comments: 5, timestamp: Date.now() - 1000 * 60 * 180,
      tags: ['CMSC132', 'announcement'],
    },
    {
      id: 'p5', userId: 'u4', domain: 'umd.edu',
      content: 'Testudo blessed me today. Touched the nose before my Smith School interview and got the internship offer 🐢✨ superstitions are real',
      image: null, likes: 203, comments: 41, timestamp: Date.now() - 1000 * 60 * 300,
      tags: ['Testudo', 'internship'],
    },
  ],
  'mit.edu': [
    {
      id: 'mp1', userId: 'm1', domain: 'mit.edu',
      content: 'Reactor output hit a new record in lab today. Can\'t share details but the team is PUMPED 🔥',
      image: null, likes: 91, comments: 17, timestamp: Date.now() - 1000 * 60 * 20,
      tags: ['research', 'physics'],
    },
    {
      id: 'mp2', userId: 'm2', domain: 'mit.edu',
      content: 'Our robot just walked up stairs for the first time without falling. 6 months of work. I cried a little ngl',
      image: null, likes: 287, comments: 56, timestamp: Date.now() - 1000 * 60 * 120,
      tags: ['robotics', '6.4200'],
    },
  ],
  'nyu.edu': [
    {
      id: 'np1', userId: 'n1', domain: 'nyu.edu',
      content: 'Screened my short film at Tisch today. People actually laughed at the right moments?? Growth 🎬',
      image: null, likes: 156, comments: 29, timestamp: Date.now() - 1000 * 60 * 30,
      tags: ['Tisch', 'film'],
    },
  ],
}

const DEFAULT_POSTS = (domain, university) => [
  {
    id: `${domain}-post1`, userId: `${domain}-1`, domain,
    content: `First week back on campus and I already forgot where half my classes are 😂 anyone else?`,
    image: null, likes: 34, comments: 7, timestamp: Date.now() - 1000 * 60 * 30,
    tags: ['campuslife'],
  },
  {
    id: `${domain}-post2`, userId: `${domain}-2`, domain,
    content: `The library is completely packed already. Exam season really said no warning 📚`,
    image: null, likes: 78, comments: 14, timestamp: Date.now() - 1000 * 60 * 120,
    tags: ['studying', 'exams'],
  },
  {
    id: `${domain}-post3`, userId: `${domain}-3`, domain,
    content: `Hot take: the campus dining hall pasta is actually underrated. Fight me.`,
    image: null, likes: 112, comments: 33, timestamp: Date.now() - 1000 * 60 * 240,
    tags: ['food', 'campuslife'],
  },
]

export function getPostsForDomain(domain, university) {
  return SEED_POSTS[domain] || DEFAULT_POSTS(domain, university)
}

export const SEED_MESSAGES = {
  'umd.edu': [
    { id: 'msg1', fromId: 'u1', toId: 'ME',  text: 'Hey! Saw your post about Bitcamp — what track did you do?', timestamp: Date.now() - 1000 * 60 * 10 },
    { id: 'msg2', fromId: 'u3', toId: 'ME',  text: 'Love your profile. Want to collab on a design project this semester?', timestamp: Date.now() - 1000 * 60 * 60 },
    { id: 'msg3', fromId: 'u5', toId: 'ME',  text: 'Quick reminder: office hours moved this Thursday!', timestamp: Date.now() - 1000 * 60 * 120 },
  ],
}

export function getMessagesForDomain(domain) {
  return SEED_MESSAGES[domain] || []
}
