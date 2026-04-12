/**
 * universities.js
 * Maps .edu email domains to campus metadata.
 * Add more universities here to expand coverage.
 */

export const UNIVERSITIES = {
  // Maryland
  'umd.edu':         { name: 'University of Maryland',         short: 'UMD',    city: 'College Park, MD',   color: '#E03A3E', accent: '#FFD200', emoji: '🐢' },
  'umbc.edu':        { name: 'UMBC',                           short: 'UMBC',   city: 'Baltimore, MD',      color: '#FDB515', accent: '#000000', emoji: '🐾' },
  'towson.edu':      { name: 'Towson University',              short: 'TU',     city: 'Towson, MD',         color: '#FFD100', accent: '#000000', emoji: '🐯' },

  // Ivy League
  'harvard.edu':     { name: 'Harvard University',             short: 'Harvard',city: 'Cambridge, MA',      color: '#A51C30', accent: '#C0C0C0', emoji: '🎓' },
  'yale.edu':        { name: 'Yale University',                short: 'Yale',   city: 'New Haven, CT',      color: '#00356B', accent: '#ADB3C1', emoji: '🐻' },
  'princeton.edu':   { name: 'Princeton University',           short: 'PU',     city: 'Princeton, NJ',      color: '#E77500', accent: '#000000', emoji: '🐯' },
  'columbia.edu':    { name: 'Columbia University',            short: 'CU',     city: 'New York, NY',       color: '#003DA5', accent: '#B9D9EB', emoji: '🦁' },
  'upenn.edu':       { name: 'University of Pennsylvania',     short: 'Penn',   city: 'Philadelphia, PA',   color: '#011F5B', accent: '#990000', emoji: '🔴' },
  'cornell.edu':     { name: 'Cornell University',             short: 'Cornell',city: 'Ithaca, NY',         color: '#B31B1B', accent: '#222222', emoji: '🐻' },
  'dartmouth.edu':   { name: 'Dartmouth College',              short: 'DC',     city: 'Hanover, NH',        color: '#00693E', accent: '#FFFFFF', emoji: '🌲' },
  'brown.edu':       { name: 'Brown University',               short: 'Brown',  city: 'Providence, RI',     color: '#4E3629', accent: '#C00404', emoji: '🐻' },

  // Top public
  'mit.edu':         { name: 'MIT',                            short: 'MIT',    city: 'Cambridge, MA',      color: '#A31F34', accent: '#8A8B8C', emoji: '⚙️' },
  'stanford.edu':    { name: 'Stanford University',            short: 'Stanford',city:'Stanford, CA',       color: '#8C1515', accent: '#B1AFAB', emoji: '🌲' },
  'berkeley.edu':    { name: 'UC Berkeley',                    short: 'Cal',    city: 'Berkeley, CA',       color: '#003262', accent: '#FDB515', emoji: '🐻' },
  'ucla.edu':        { name: 'UCLA',                           short: 'UCLA',   city: 'Los Angeles, CA',    color: '#2774AE', accent: '#FFD100', emoji: '🐻' },
  'umich.edu':       { name: 'University of Michigan',         short: 'UMich',  city: 'Ann Arbor, MI',      color: '#00274C', accent: '#FFCB05', emoji: '🐺' },
  'gatech.edu':      { name: 'Georgia Tech',                   short: 'GT',     city: 'Atlanta, GA',        color: '#B3A369', accent: '#003057', emoji: '🐝' },
  'cmu.edu':         { name: 'Carnegie Mellon University',     short: 'CMU',    city: 'Pittsburgh, PA',     color: '#C41230', accent: '#4B4F54', emoji: '🎭' },
  'nyu.edu':         { name: 'New York University',            short: 'NYU',    city: 'New York, NY',       color: '#57068C', accent: '#FFFFFF', emoji: '🗽' },
  'bu.edu':          { name: 'Boston University',              short: 'BU',     city: 'Boston, MA',         color: '#CC0000', accent: '#000000', emoji: '🐾' },
  'northeastern.edu':{ name: 'Northeastern University',        short: 'NEU',    city: 'Boston, MA',         color: '#C8102E', accent: '#000000', emoji: '🐾' },
  'gwu.edu':         { name: 'George Washington University',   short: 'GWU',    city: 'Washington, DC',     color: '#033C5A', accent: '#AA9868', emoji: '🦅' },
  'georgetown.edu':  { name: 'Georgetown University',          short: 'GU',     city: 'Washington, DC',     color: '#041E42', accent: '#63666A', emoji: '🦅' },
  'american.edu':    { name: 'American University',            short: 'AU',     city: 'Washington, DC',     color: '#C8102E', accent: '#003A70', emoji: '🦅' },
  'virginia.edu':    { name: 'University of Virginia',         short: 'UVA',    city: 'Charlottesville, VA',color: '#232D4B', accent: '#E57200', emoji: '🧡' },
  'vt.edu':          { name: 'Virginia Tech',                  short: 'VT',     city: 'Blacksburg, VA',     color: '#630031', accent: '#CF4420', emoji: '🦃' },
  'unc.edu':         { name: 'UNC Chapel Hill',                short: 'UNC',    city: 'Chapel Hill, NC',    color: '#4B9CD3', accent: '#13294B', emoji: '🐏' },
  'ncsu.edu':        { name: 'NC State University',            short: 'NCSU',   city: 'Raleigh, NC',        color: '#CC0000', accent: '#000000', emoji: '🐺' },
  'psu.edu':         { name: 'Penn State University',          short: 'PSU',    city: 'State College, PA',  color: '#1E407C', accent: '#FFFFFF', emoji: '🦁' },
  'purdue.edu':      { name: 'Purdue University',              short: 'Purdue', city: 'West Lafayette, IN', color: '#CFB991', accent: '#000000', emoji: '🚂' },
  'ohio-state.edu':  { name: 'Ohio State University',          short: 'OSU',    city: 'Columbus, OH',       color: '#BB0000', accent: '#666666', emoji: '🌰' },
  'utexas.edu':      { name: 'UT Austin',                      short: 'UT',     city: 'Austin, TX',         color: '#BF5700', accent: '#FFFFFF', emoji: '🤘' },
  'uw.edu':          { name: 'University of Washington',       short: 'UW',     city: 'Seattle, WA',        color: '#4B2E83', accent: '#B7A57A', emoji: '🐺' },
}

/**
 * Look up a university from an email address.
 * Returns the university object or null if not recognized.
 */
export function getUniversityFromEmail(email) {
  const lower  = email.toLowerCase().trim()
  const domain = lower.split('@')[1]
  if (!domain) return null
  return UNIVERSITIES[domain] ?? null
}

/**
 * Validate that an email looks like a real .edu address.
 */
export function isEduEmail(email) {
  const lower = email.toLowerCase().trim()
  return /^[^\s@]+@[^\s@]+\.edu$/.test(lower)
}

/**
 * Get domain from email.
 */
export function getDomain(email) {
  return email.toLowerCase().trim().split('@')[1] ?? ''
}
