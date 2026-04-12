/**
 * universities.js
 * Official university colors sourced from brand guidelines.
 * ONLY real, accredited universities are listed here.
 * Unknown .edu domains are rejected — no fake "Gmail Campus" etc.
 */

export const UNIVERSITIES = {
  // ── Maryland ──────────────────────────────────────────────────
  'umd.edu':          { name:'University of Maryland',          short:'UMD',     city:'College Park, MD',    color:'#E03A3E', accent:'#FFD200', bg:'#1a0505', emoji:'🐢' },
  'umbc.edu':         { name:'UMBC',                            short:'UMBC',    city:'Baltimore, MD',       color:'#FDB515', accent:'#000000', bg:'#141200', emoji:'🐾' },
  'towson.edu':       { name:'Towson University',               short:'TU',      city:'Towson, MD',          color:'#FFD100', accent:'#000000', bg:'#141200', emoji:'🐯' },
  'umaryland.edu':    { name:'University of Maryland Baltimore', short:'UMB',    city:'Baltimore, MD',       color:'#002D62', accent:'#FFB300', bg:'#000a1a', emoji:'🏥' },

  // ── Ivy League ────────────────────────────────────────────────
  'harvard.edu':      { name:'Harvard University',              short:'Harvard', city:'Cambridge, MA',       color:'#A51C30', accent:'#C0C0C0', bg:'#1a0004', emoji:'🎓' },
  'yale.edu':         { name:'Yale University',                 short:'Yale',    city:'New Haven, CT',       color:'#00356B', accent:'#ADB3C1', bg:'#00091a', emoji:'🐻' },
  'princeton.edu':    { name:'Princeton University',            short:'PU',      city:'Princeton, NJ',       color:'#FF6600', accent:'#000000', bg:'#1a0a00', emoji:'🐯' },
  'columbia.edu':     { name:'Columbia University',             short:'CU',      city:'New York, NY',        color:'#003DA5', accent:'#69B3E7', bg:'#00031a', emoji:'🦁' },
  'upenn.edu':        { name:'University of Pennsylvania',      short:'Penn',    city:'Philadelphia, PA',    color:'#990000', accent:'#011F5B', bg:'#1a0000', emoji:'🔴' },
  'cornell.edu':      { name:'Cornell University',              short:'Cornell', city:'Ithaca, NY',          color:'#B31B1B', accent:'#222222', bg:'#1a0000', emoji:'🐻' },
  'dartmouth.edu':    { name:'Dartmouth College',               short:'DC',      city:'Hanover, NH',         color:'#00693E', accent:'#FFFFFF', bg:'#001a0f', emoji:'🌲' },
  'brown.edu':        { name:'Brown University',                short:'Brown',   city:'Providence, RI',      color:'#C00404', accent:'#4E3629', bg:'#1a0000', emoji:'🐻' },

  // ── Top Research ──────────────────────────────────────────────
  'mit.edu':          { name:'MIT',                             short:'MIT',     city:'Cambridge, MA',       color:'#A31F34', accent:'#8A8B8C', bg:'#1a0004', emoji:'⚙️' },
  'stanford.edu':     { name:'Stanford University',             short:'Stanford',city:'Stanford, CA',        color:'#8C1515', accent:'#B1AFAB', bg:'#1a0000', emoji:'🌲' },
  'berkeley.edu':     { name:'UC Berkeley',                     short:'Cal',     city:'Berkeley, CA',        color:'#003262', accent:'#FDB515', bg:'#00091a', emoji:'🐻' },
  'ucla.edu':         { name:'UCLA',                            short:'UCLA',    city:'Los Angeles, CA',     color:'#2774AE', accent:'#FFD100', bg:'#00061a', emoji:'🐻' },
  'umich.edu':        { name:'University of Michigan',          short:'UMich',   city:'Ann Arbor, MI',       color:'#FFCB05', accent:'#00274C', bg:'#141000', emoji:'🐺' },
  'gatech.edu':       { name:'Georgia Tech',                    short:'GT',      city:'Atlanta, GA',         color:'#B3A369', accent:'#003057', bg:'#141209', emoji:'🐝' },
  'cmu.edu':          { name:'Carnegie Mellon University',      short:'CMU',     city:'Pittsburgh, PA',      color:'#C41230', accent:'#4B4F54', bg:'#1a0003', emoji:'🎭' },
  'nyu.edu':          { name:'New York University',             short:'NYU',     city:'New York, NY',        color:'#57068C', accent:'#FFFFFF', bg:'#0e0018', emoji:'🗽' },
  'bu.edu':           { name:'Boston University',               short:'BU',      city:'Boston, MA',          color:'#CC0000', accent:'#000000', bg:'#1a0000', emoji:'🐾' },
  'northeastern.edu': { name:'Northeastern University',         short:'NEU',     city:'Boston, MA',          color:'#C8102E', accent:'#000000', bg:'#1a0004', emoji:'🐾' },
  'gwu.edu':          { name:'George Washington University',    short:'GWU',     city:'Washington, DC',      color:'#033C5A', accent:'#AA9868', bg:'#000d18', emoji:'🦅' },
  'georgetown.edu':   { name:'Georgetown University',           short:'GU',      city:'Washington, DC',      color:'#041E42', accent:'#63666A', bg:'#00051a', emoji:'🦅' },
  'american.edu':     { name:'American University',             short:'AU',      city:'Washington, DC',      color:'#C8102E', accent:'#003A70', bg:'#1a0004', emoji:'🦅' },
  'virginia.edu':     { name:'University of Virginia',          short:'UVA',     city:'Charlottesville, VA', color:'#232D4B', accent:'#E57200', bg:'#00020e', emoji:'🧡' },
  'vt.edu':           { name:'Virginia Tech',                   short:'VT',      city:'Blacksburg, VA',      color:'#861F41', accent:'#E5751F', bg:'#1a0009', emoji:'🦃' },
  'unc.edu':          { name:'UNC Chapel Hill',                 short:'UNC',     city:'Chapel Hill, NC',     color:'#4B9CD3', accent:'#13294B', bg:'#001a30', emoji:'🐏' },
  'ncsu.edu':         { name:'NC State University',             short:'NCSU',    city:'Raleigh, NC',         color:'#CC0000', accent:'#000000', bg:'#1a0000', emoji:'🐺' },
  'psu.edu':          { name:'Penn State University',           short:'PSU',     city:'State College, PA',   color:'#1E407C', accent:'#FFFFFF', bg:'#00041a', emoji:'🦁' },
  'purdue.edu':       { name:'Purdue University',               short:'Purdue',  city:'West Lafayette, IN',  color:'#CEB888', accent:'#000000', bg:'#141109', emoji:'🚂' },
  'ohio-state.edu':   { name:'Ohio State University',           short:'OSU',     city:'Columbus, OH',        color:'#BB0000', accent:'#666666', bg:'#1a0000', emoji:'🌰' },
  'utexas.edu':       { name:'UT Austin',                       short:'UT',      city:'Austin, TX',          color:'#BF5700', accent:'#FFFFFF', bg:'#1a0800', emoji:'🤘' },
  'uw.edu':           { name:'University of Washington',        short:'UW',      city:'Seattle, WA',         color:'#4B2E83', accent:'#B7A57A', bg:'#0d0018', emoji:'🐺' },
  'usc.edu':          { name:'University of Southern California',short:'USC',    city:'Los Angeles, CA',     color:'#990000', accent:'#FFC72C', bg:'#1a0000', emoji:'⚔️' },
  'uchicago.edu':     { name:'University of Chicago',           short:'UChicago',city:'Chicago, IL',         color:'#800000', accent:'#767676', bg:'#1a0000', emoji:'🦅' },
  'duke.edu':         { name:'Duke University',                 short:'Duke',    city:'Durham, NC',          color:'#012169', accent:'#FFFFFF', bg:'#00021a', emoji:'👹' },
  'vanderbilt.edu':   { name:'Vanderbilt University',           short:'Vandy',   city:'Nashville, TN',       color:'#866D4B', accent:'#000000', bg:'#140e06', emoji:'⭐' },
  'rice.edu':         { name:'Rice University',                 short:'Rice',    city:'Houston, TX',         color:'#00205B', accent:'#5B6770', bg:'#00031a', emoji:'🦉' },
  'tufts.edu':        { name:'Tufts University',                short:'Tufts',   city:'Medford, MA',         color:'#3B6E8F', accent:'#FFFFFF', bg:'#001a25', emoji:'🐘' },
  'emory.edu':        { name:'Emory University',                short:'Emory',   city:'Atlanta, GA',         color:'#002878', accent:'#F2A900', bg:'#00031a', emoji:'🦅' },
  'wustl.edu':        { name:'Washington University in St. Louis',short:'WashU', city:'St. Louis, MO',       color:'#A51417', accent:'#007360', bg:'#1a0003', emoji:'🐻' },
  'ufl.edu':          { name:'University of Florida',           short:'UF',      city:'Gainesville, FL',     color:'#0021A5', accent:'#FA4616', bg:'#00021a', emoji:'🐊' },
  'fsu.edu':          { name:'Florida State University',        short:'FSU',     city:'Tallahassee, FL',     color:'#782F40', accent:'#CEB888', bg:'#1a0009', emoji:'🏹' },
  'miami.edu':        { name:'University of Miami',             short:'UM',      city:'Coral Gables, FL',    color:'#005030', accent:'#F47321', bg:'#001a10', emoji:'🦅' },
  'rutgers.edu':      { name:'Rutgers University',              short:'Rutgers', city:'New Brunswick, NJ',   color:'#CC0033', accent:'#5F6A72', bg:'#1a0007', emoji:'⚡' },
  'uconn.edu':        { name:'University of Connecticut',       short:'UConn',   city:'Storrs, CT',          color:'#000E2F', accent:'#E4002B', bg:'#00001a', emoji:'🐺' },
  'stonybrook.edu':   { name:'Stony Brook University',          short:'SBU',     city:'Stony Brook, NY',     color:'#CC0033', accent:'#000000', bg:'#1a0007', emoji:'🐺' },
  'fordham.edu':      { name:'Fordham University',              short:'Fordham', city:'New York, NY',        color:'#700101', accent:'#999999', bg:'#1a0000', emoji:'🐏' },
}

// Known .edu domains that are NOT universities
const EXCLUDED_DOMAINS = new Set([
  'gmail.edu','yahoo.edu','hotmail.edu','outlook.edu','icloud.edu',
  'mail.edu','email.edu','test.edu','example.edu','fake.edu',
  'student.edu','campus.edu','school.edu','college.edu','university.edu',
])

/**
 * Look up a university from an email address.
 * Returns the university object or null if not a real recognized institution.
 */
export function getUniversityFromEmail(email) {
  const lower  = email.toLowerCase().trim()
  const domain = lower.split('@')[1]
  if (!domain) return null

  // Reject known fake/generic domains
  if (EXCLUDED_DOMAINS.has(domain)) return null

  // Must be in our verified list — no wildcards
  const uni = UNIVERSITIES[domain]
  if (!uni) return null

  return { ...uni, domain }
}

/**
 * Validate that an email is a real .edu from our recognized list.
 * Stricter than before — unknown .edu domains are rejected.
 */
export function isValidCampusEmail(email) {
  const lower  = email.toLowerCase().trim()
  if (!/^[^\s@]+@[^\s@]+\.edu$/.test(lower)) return false
  const domain = lower.split('@')[1]
  return UNIVERSITIES.hasOwnProperty(domain)
}

/**
 * Looser check — just validates .edu format (for UI hints).
 */
export function isEduEmail(email) {
  return /^[^\s@]+@[^\s@]+\.edu$/.test(email.toLowerCase().trim())
}
