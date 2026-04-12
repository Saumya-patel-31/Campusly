import { useState, useEffect } from 'react'
import Layout from '../components/Layout.jsx'
import { useAuth } from '../context/useAuth.js'

const panel = {
  background: 'rgba(255,255,255,0.055)',
  border: '1px solid rgba(255,255,255,0.10)',
  borderRadius: 16,
  backdropFilter: 'blur(28px) saturate(150%)',
  WebkitBackdropFilter: 'blur(28px) saturate(150%)',
  boxShadow: '0 2px 16px rgba(0,0,0,0.20), inset 0 1px 0 rgba(255,255,255,0.07)',
}

// ── Category definitions ─────────────────────────────────────────────
const CATEGORIES = [
  { key: 'all',          label: 'All',             emoji: '🗂️' },
  { key: 'academics',    label: 'Academics',        emoji: '📚' },
  { key: 'campus',       label: 'Campus & Housing', emoji: '🏛️' },
  { key: 'student_life', label: 'Student Life',     emoji: '🎭' },
  { key: 'athletics',    label: 'Athletics & Rec',  emoji: '🏆' },
  { key: 'other',        label: 'More',             emoji: '📄' },
]

const SECTION_KEYWORDS = {
  academics:    ['academic', 'curriculum', 'college', 'school', 'program', 'degree', 'department',
                 'research', 'library', 'faculty', 'major', 'graduate', 'undergraduate', 'institute',
                 'center for', 'honors', 'engineering', 'business', 'arts and science', 'law', 'medicine'],
  campus:       ['campus', 'housing', 'residence', 'dormitor', 'building', 'facility', 'dining',
                 'cafeteria', 'architecture', 'location', 'geography', 'grounds', 'hall', 'center'],
  student_life: ['student life', 'club', 'tradition', 'culture', 'diversity', 'fraternity', 'sorority',
                 'greek', 'arts', 'music', 'publication', 'organization', 'activit', 'community',
                 'government', 'newspaper', 'radio', 'theater'],
  athletics:    ['athletic', 'sport', 'recreation', 'fitness', 'gym', 'team', 'ncaa', 'intramural',
                 'mascot', 'varsity', 'conference'],
}

function categoriseSection(title) {
  const lower = title.toLowerCase()
  for (const [cat, kws] of Object.entries(SECTION_KEYWORDS)) {
    if (kws.some(k => lower.includes(k))) return cat
  }
  return 'other'
}

// ── Per-domain URL overrides ─────────────────────────────────────────
// Only list keys that differ from the default subdomain pattern.
// Default pattern:  my.<domain>  |  registrar.<domain>  |  financialaid.<domain>
//                   careers.<domain>  |  health.<domain>  |  dining.<domain>
//                   housing.<domain>  |  library.<domain>  |  athletics.<domain>
//                   studentlife.<domain>
const DOMAIN_OVERRIDES = {

  // ── Already-verified UMBC ────────────────────────────────────────────
  'umbc.edu': {
    'Athletics': 'https://umbcretrievers.com/',
  },

  // ── Ivy League ───────────────────────────────────────────────────────
  'harvard.edu': {
    'Student Portal':      'https://my.harvard.edu/',
    'Course Registration': 'https://registrar.fas.harvard.edu/',
    'Financial Aid':       'https://college.harvard.edu/financial-aid',
    'Career Center':       'https://ocs.fas.harvard.edu/',
    'Health Services':     'https://huhs.harvard.edu/',
    'Athletics':           'https://gocrimson.com/',
    'Student Life':        'https://college.harvard.edu/student-life',
  },
  'yale.edu': {
    'Student Portal':      'https://students.yale.edu/',
    'Career Center':       'https://ocs.yale.edu/',
    'Health Services':     'https://yshc.yale.edu/',
    'Dining Services':     'https://hospitality.yale.edu/',
    'Athletics':           'https://yalebulldogs.com/',
    'Student Life':        'https://yalecollege.yale.edu/life-yale',
  },
  'princeton.edu': {
    'Student Portal':      'https://my.princeton.edu/',
    'Financial Aid':       'https://financialaid.princeton.edu/',
    'Career Center':       'https://careerdevelopment.princeton.edu/',
    'Health Services':     'https://uhs.princeton.edu/',
    'Athletics':           'https://goprincetontigers.com/',
    'Student Life':        'https://studentaffairs.princeton.edu/',
  },
  'columbia.edu': {
    'Student Portal':      'https://ssol.columbia.edu/',
    'Career Center':       'https://careereducation.columbia.edu/',
    'Athletics':           'https://gocolumbialions.com/',
    'Student Life':        'https://studentaffairs.columbia.edu/',
  },
  'cornell.edu': {
    'Student Portal':      'https://studentcenter.cornell.edu/',
    'Financial Aid':       'https://finaid.cornell.edu/',
    'Career Center':       'https://career.cornell.edu/',
    'Housing & Residence': 'https://scl.cornell.edu/residential-life/housing',
    'Library':             'https://library.cornell.edu/',
    'Athletics':           'https://cornellbigred.com/',
    'Student Life':        'https://scl.cornell.edu/',
  },
  'upenn.edu': {
    'Student Portal':      'https://pennportal.upenn.edu/',
    'Career Center':       'https://careerservices.upenn.edu/',
    'Health Services':     'https://studenthealth.vpul.upenn.edu/',
    'Athletics':           'https://pennathletics.com/',
    'Student Life':        'https://vpul.upenn.edu/',
  },
  'dartmouth.edu': {
    'Student Portal':      'https://student.dartmouth.edu/',
    'Career Center':       'https://career.dartmouth.edu/',
    'Health Services':     'https://students.dartmouth.edu/health-service/',
    'Athletics':           'https://dartmouthsports.com/',
    'Student Life':        'https://students.dartmouth.edu/',
  },
  'brown.edu': {
    'Student Portal':      'https://selfservice.brown.edu/',
    'Career Center':       'https://career.brown.edu/',
    'Health Services':     'https://health.brown.edu/',
    'Athletics':           'https://brownbears.com/',
    'Student Life':        'https://studentaffairs.brown.edu/',
  },

  // ── MIT & Stanford ───────────────────────────────────────────────────
  'mit.edu': {
    'Student Portal':      'https://student.mit.edu/',
    'Course Registration': 'https://registrar.mit.edu/',
    'Financial Aid':       'https://sfs.mit.edu/',
    'Career Center':       'https://capd.mit.edu/',
    'Health Services':     'https://medical.mit.edu/',
    'Housing & Residence': 'https://housing.mit.edu/',
    'Library':             'https://libraries.mit.edu/',
    'Athletics':           'https://athletics.mit.edu/',
    'Student Life':        'https://studentlife.mit.edu/',
  },
  'stanford.edu': {
    'Student Portal':      'https://axess.stanford.edu/',
    'Course Registration': 'https://studentservices.stanford.edu/',
    'Career Center':       'https://beam.stanford.edu/',
    'Health Services':     'https://vaden.stanford.edu/',
    'Housing & Residence': 'https://rde.stanford.edu/studenthousing',
    'Athletics':           'https://gostanford.com/',
    'Student Life':        'https://studentaffairs.stanford.edu/',
  },

  // ── UC System ────────────────────────────────────────────────────────
  'ucla.edu': {
    'Student Portal':      'https://my.ucla.edu/',
    'Career Center':       'https://career.ucla.edu/',
    'Health Services':     'https://studenthealth.ucla.edu/',
    'Athletics':           'https://uclabruins.com/',
    'Student Life':        'https://studentaffairs.ucla.edu/',
  },
  'berkeley.edu': {
    'Student Portal':      'https://calcentral.berkeley.edu/',
    'Financial Aid':       'https://financialaid.berkeley.edu/',
    'Career Center':       'https://career.berkeley.edu/',
    'Health Services':     'https://uhs.berkeley.edu/',
    'Library':             'https://lib.berkeley.edu/',
    'Athletics':           'https://calbears.com/',
    'Student Life':        'https://studentaffairs.berkeley.edu/',
  },
  'ucsd.edu': {
    'Student Portal':      'https://tritonlink.ucsd.edu/',
    'Financial Aid':       'https://fas.ucsd.edu/',
    'Career Center':       'https://career.ucsd.edu/',
    'Health Services':     'https://studenthealth.ucsd.edu/',
    'Dining Services':     'https://hdh.ucsd.edu/dining',
    'Housing & Residence': 'https://hdh.ucsd.edu/',
    'Library':             'https://lib.ucsd.edu/',
    'Athletics':           'https://ucsdtritons.com/',
  },
  'ucsb.edu': {
    'Student Portal':      'https://my.sa.ucsb.edu/',
    'Career Center':       'https://career.ucsb.edu/',
    'Health Services':     'https://studenthealth.sa.ucsb.edu/',
    'Athletics':           'https://ucsbgauchos.com/',
    'Student Life':        'https://studentlife.ucsb.edu/',
  },
  'ucdavis.edu': {
    'Student Portal':      'https://my.ucdavis.edu/',
    'Career Center':       'https://icc.ucdavis.edu/',
    'Health Services':     'https://shcs.ucdavis.edu/',
    'Athletics':           'https://ucdavisaggies.com/',
  },
  'uci.edu': {
    'Student Portal':      'https://my.uci.edu/',
    'Career Center':       'https://career.uci.edu/',
    'Health Services':     'https://studenthealth.uci.edu/',
    'Athletics':           'https://ucirvinesports.com/',
  },
  'ucsc.edu': {
    'Student Portal':      'https://my.ucsc.edu/',
    'Career Center':       'https://careers.ucsc.edu/',
    'Health Services':     'https://healthcenter.ucsc.edu/',
    'Athletics':           'https://goslugs.com/',
  },

  // ── USC ──────────────────────────────────────────────────────────────
  'usc.edu': {
    'Course Registration': 'https://classes.usc.edu/',
    'Health Services':     'https://engemann.usc.edu/',
    'Dining Services':     'https://hospitality.usc.edu/',
    'Library':             'https://libraries.usc.edu/',
    'Athletics':           'https://usctrojans.com/',
    'Student Life':        'https://studentaffairs.usc.edu/',
  },

  // ── Big Ten ──────────────────────────────────────────────────────────
  'umich.edu': {
    'Student Portal':      'https://wolverineaccess.umich.edu/',
    'Course Registration': 'https://ro.umich.edu/',
    'Financial Aid':       'https://finaid.umich.edu/',
    'Career Center':       'https://careercenter.umich.edu/',
    'Health Services':     'https://uhs.umich.edu/',
    'Library':             'https://lib.umich.edu/',
    'Athletics':           'https://mgoblue.com/',
  },
  'umd.edu': {
    'Student Portal':      'https://myumd.net/',
    'Course Registration': 'https://testudo.umd.edu/',
    'Career Center':       'https://careers.umd.edu/',
    'Dining Services':     'https://studentaffairs.umd.edu/dining-housing',
    'Housing & Residence': 'https://reslife.umd.edu/',
    'Library':             'https://www.lib.umd.edu/',
    'Athletics':           'https://umterps.com/',
    'Student Life':        'https://studentaffairs.umd.edu/',
  },
  'osu.edu': {
    'Student Portal':      'https://buckeyelink.osu.edu/',
    'Financial Aid':       'https://sfa.osu.edu/',
    'Health Services':     'https://shs.osu.edu/',
    'Athletics':           'https://ohiostatebuckeyes.com/',
  },
  'psu.edu': {
    'Student Portal':      'https://lionpath.psu.edu/',
    'Financial Aid':       'https://studentaid.psu.edu/',
    'Career Center':       'https://careerservices.psu.edu/',
    'Library':             'https://libraries.psu.edu/',
    'Athletics':           'https://gopsusports.com/',
    'Student Life':        'https://studentaffairs.psu.edu/',
  },
  'wisc.edu': {
    'Student Portal':      'https://my.wisc.edu/',
    'Financial Aid':       'https://financialaid.wisc.edu/',
    'Career Center':       'https://careers.wisc.edu/',
    'Health Services':     'https://uhs.wisc.edu/',
    'Athletics':           'https://uwbadgers.com/',
  },
  'msu.edu': {
    'Student Portal':      'https://student.msu.edu/',
    'Course Registration': 'https://reg.msu.edu/',
    'Financial Aid':       'https://finaid.msu.edu/',
    'Career Center':       'https://careernetwork.msu.edu/',
    'Dining Services':     'https://eatatstate.msu.edu/',
    'Housing & Residence': 'https://liveon.msu.edu/',
    'Library':             'https://lib.msu.edu/',
    'Athletics':           'https://msuspartans.com/',
  },
  'iu.edu': {
    'Student Portal':      'https://one.iu.edu/',
    'Career Center':       'https://career.indiana.edu/',
    'Health Services':     'https://healthcenter.indiana.edu/',
    'Dining Services':     'https://iudining.indiana.edu/',
    'Housing & Residence': 'https://rps.indiana.edu/',
    'Library':             'https://libraries.indiana.edu/',
    'Athletics':           'https://iuhoosiers.com/',
    'Student Life':        'https://studentaffairs.indiana.edu/',
  },
  'purdue.edu': {
    'Student Portal':      'https://one.purdue.edu/',
    'Financial Aid':       'https://www.purdue.edu/dfa/',
    'Health Services':     'https://www.purdue.edu/push/',
    'Library':             'https://lib.purdue.edu/',
    'Athletics':           'https://purduesports.com/',
  },
  'illinois.edu': {
    'Student Portal':      'https://my.illinois.edu/',
    'Financial Aid':       'https://osfa.illinois.edu/',
    'Health Services':     'https://mckinley.illinois.edu/',
    'Dining Services':     'https://housing.illinois.edu/dining',
    'Athletics':           'https://fightingillini.com/',
  },
  'northwestern.edu': {
    'Financial Aid':       'https://financialaid.northwestern.edu/',
    'Library':             'https://www.library.northwestern.edu/',
    'Athletics':           'https://nusports.com/',
    'Student Life':        'https://www.northwestern.edu/studentaffairs/',
  },
  'umn.edu': {
    'Student Portal':      'https://myu.umn.edu/',
    'Financial Aid':       'https://onestop.umn.edu/finances',
    'Career Center':       'https://career.umn.edu/',
    'Health Services':     'https://boynton.umn.edu/',
    'Athletics':           'https://gophersports.com/',
  },
  'rutgers.edu': {
    'Student Portal':      'https://my.rutgers.edu/',
    'Career Center':       'https://careers.rutgers.edu/',
    'Health Services':     'https://health.rutgers.edu/',
    'Athletics':           'https://scarletknights.com/',
  },

  // ── ACC ──────────────────────────────────────────────────────────────
  'duke.edu': {
    'Student Portal':      'https://aces.duke.edu/',
    'Career Center':       'https://studentaffairs.duke.edu/career',
    'Health Services':     'https://studentaffairs.duke.edu/dukehealth',
    'Athletics':           'https://goduke.com/',
    'Student Life':        'https://studentaffairs.duke.edu/',
  },
  'unc.edu': {
    'Student Portal':      'https://my.unc.edu/',
    'Career Center':       'https://careers.unc.edu/',
    'Health Services':     'https://studentwellness.unc.edu/',
    'Athletics':           'https://goheels.com/',
  },
  'gatech.edu': {
    'Student Portal':      'https://buzzport.gatech.edu/',
    'Financial Aid':       'https://finaid.gatech.edu/',
    'Career Center':       'https://career.gatech.edu/',
    'Athletics':           'https://ramblinwreck.com/',
  },
  'virginia.edu': {
    'Student Portal':      'https://sis.virginia.edu/',
    'Career Center':       'https://career.virginia.edu/',
    'Health Services':     'https://studenthealth.virginia.edu/',
    'Athletics':           'https://virginiasports.com/',
    'Student Life':        'https://deanofstudents.virginia.edu/',
  },
  'bc.edu': {
    'Student Portal':      'https://agora.bc.edu/',
    'Career Center':       'https://www.bc.edu/offices/careers.html',
    'Health Services':     'https://www.bc.edu/offices/health.html',
    'Athletics':           'https://bceagles.com/',
  },
  'miami.edu': {
    'Student Portal':      'https://my.miami.edu/',
    'Career Center':       'https://career.miami.edu/',
    'Athletics':           'https://hurricanesports.com/',
  },
  'fsu.edu': {
    'Student Portal':      'https://my.fsu.edu/',
    'Career Center':       'https://career.fsu.edu/',
    'Athletics':           'https://seminoles.com/',
  },
  'clemson.edu': {
    'Student Portal':      'https://iROAR.clemson.edu/',
    'Career Center':       'https://career.clemson.edu/',
    'Athletics':           'https://clemsontigers.com/',
  },

  // ── SEC ──────────────────────────────────────────────────────────────
  'ufl.edu': {
    'Student Portal':      'https://my.ufl.edu/',
    'Financial Aid':       'https://www.sfa.ufl.edu/',
    'Career Center':       'https://career.ufl.edu/',
    'Health Services':     'https://shcc.ufl.edu/',
    'Athletics':           'https://floridagators.com/',
    'Student Life':        'https://dso.ufl.edu/',
  },
  'utexas.edu': {
    'Student Portal':      'https://utdirect.utexas.edu/',
    'Financial Aid':       'https://finaid.utexas.edu/',
    'Career Center':       'https://career.utexas.edu/',
    'Health Services':     'https://healthyhorns.utexas.edu/',
    'Library':             'https://lib.utexas.edu/',
    'Athletics':           'https://texaslonghorns.com/',
    'Student Life':        'https://deanofstudents.utexas.edu/',
  },
  'ua.edu': {
    'Student Portal':      'https://myBama.ua.edu/',
    'Career Center':       'https://career.ua.edu/',
    'Athletics':           'https://rolltide.com/',
  },
  'auburn.edu': {
    'Student Portal':      'https://my.auburn.edu/',
    'Career Center':       'https://career.auburn.edu/',
    'Athletics':           'https://auburntigers.com/',
  },
  'lsu.edu': {
    'Student Portal':      'https://myLSU.lsu.edu/',
    'Career Center':       'https://www.lsu.edu/career/',
    'Athletics':           'https://lsusports.net/',
  },
  'uga.edu': {
    'Student Portal':      'https://athena.uga.edu/',
    'Career Center':       'https://career.uga.edu/',
    'Athletics':           'https://georgiadogs.com/',
  },
  'vanderbilt.edu': {
    'Student Portal':      'https://yes.vanderbilt.edu/',
    'Career Center':       'https://www.vanderbilt.edu/career/',
    'Health Services':     'https://www.vanderbilt.edu/health-center/',
    'Dining Services':     'https://www.vanderbilt.edu/auxiliary-services/dining/',
    'Housing & Residence': 'https://www.vanderbilt.edu/housing/',
    'Athletics':           'https://vucommodores.com/',
    'Student Life':        'https://www.vanderbilt.edu/studentlife/',
  },
  'tamu.edu': {
    'Student Portal':      'https://howdy.tamu.edu/',
    'Career Center':       'https://career.tamu.edu/',
    'Athletics':           'https://12thman.com/',
  },
  'tennessee.edu': {
    'Student Portal':      'https://my.tennessee.edu/',
    'Career Center':       'https://career.utk.edu/',
    'Athletics':           'https://utsports.com/',
  },
  // ── Big 12 ───────────────────────────────────────────────────────────
  'ku.edu': {
    'Student Portal':      'https://myku.ku.edu/',
    'Career Center':       'https://career.ku.edu/',
    'Athletics':           'https://kuathletics.com/',
  },
  'kstate.edu': {
    'Student Portal':      'https://www.k-state.edu/mystudentcenter/',
    'Career Center':       'https://www.k-state.edu/career/',
    'Athletics':           'https://kstatesports.com/',
  },
  'ou.edu': {
    'Student Portal':      'https://one.ou.edu/',
    'Career Center':       'https://career.ou.edu/',
    'Athletics':           'https://soonersports.com/',
  },
  'okstate.edu': {
    'Student Portal':      'https://my.okstate.edu/',
    'Career Center':       'https://career.okstate.edu/',
    'Athletics':           'https://okstate.com/',
  },
  'tcu.edu': {
    'Student Portal':      'https://my.tcu.edu/',
    'Career Center':       'https://careercenter.tcu.edu/',
    'Athletics':           'https://gofrogs.com/',
  },
  'baylor.edu': {
    'Student Portal':      'https://bearweb.baylor.edu/',
    'Career Center':       'https://career.baylor.edu/',
    'Athletics':           'https://baylorbears.com/',
  },
  'wvu.edu': {
    'Student Portal':      'https://portal.wvu.edu/',
    'Career Center':       'https://career.wvu.edu/',
    'Athletics':           'https://wvusports.com/',
  },
  'cincinnati.edu': {
    'Student Portal':      'https://my.uc.edu/',
    'Career Center':       'https://career.uc.edu/',
    'Athletics':           'https://gobearcats.com/',
  },
  'ucf.edu': {
    'Student Portal':      'https://my.ucf.edu/',
    'Career Center':       'https://career.ucf.edu/',
    'Athletics':           'https://ucfknights.com/',
  },

  // ── Pac-12 remnants / Mountain West ──────────────────────────────────
  'uw.edu': {
    'Student Portal':      'https://myuw.uw.edu/',
    'Financial Aid':       'https://www.washington.edu/financialaid/',
    'Career Center':       'https://careers.uw.edu/',
    'Health Services':     'https://wellbeing.uw.edu/',
    'Library':             'https://lib.uw.edu/',
    'Athletics':           'https://gohuskies.com/',
  },
  'arizona.edu': {
    'Student Portal':      'https://uaccess.arizona.edu/',
    'Financial Aid':       'https://financialaid.arizona.edu/',
    'Career Center':       'https://career.arizona.edu/',
    'Library':             'https://lib.arizona.edu/',
    'Athletics':           'https://arizonawildcats.com/',
    'Student Life':        'https://studentaffairs.arizona.edu/',
  },
  'asu.edu': {
    'Student Portal':      'https://my.asu.edu/',
    'Financial Aid':       'https://students.asu.edu/financialaid',
    'Health Services':     'https://eoss.asu.edu/health',
    'Dining Services':     'https://sundevildining.asu.edu/',
    'Library':             'https://lib.asu.edu/',
    'Athletics':           'https://sundevils.com/',
    'Student Life':        'https://eoss.asu.edu/',
  },
  'colorado.edu': {
    'Student Portal':      'https://mycuinfo.colorado.edu/',
    'Career Center':       'https://career.colorado.edu/',
    'Athletics':           'https://cubuffs.com/',
  },
  'utah.edu': {
    'Student Portal':      'https://home.utah.edu/',
    'Career Center':       'https://career.utah.edu/',
    'Athletics':           'https://utahutes.com/',
  },
  'oregonstate.edu': {
    'Student Portal':      'https://my.oregonstate.edu/',
    'Career Center':       'https://career.oregonstate.edu/',
    'Athletics':           'https://osubeavers.com/',
  },
  'uoregon.edu': {
    'Student Portal':      'https://duckweb.uoregon.edu/',
    'Career Center':       'https://career.uoregon.edu/',
    'Athletics':           'https://goducks.com/',
  },
  'wsu.edu': {
    'Student Portal':      'https://my.wsu.edu/',
    'Career Center':       'https://career.wsu.edu/',
    'Athletics':           'https://wsucougars.com/',
  },

  // ── Northeast privates ────────────────────────────────────────────────
  'nyu.edu': {
    'Student Portal':      'https://home.nyu.edu/',
    'Course Registration': 'https://www.nyu.edu/registrar/',
    'Financial Aid':       'https://www.nyu.edu/financial.aid/',
    'Career Center':       'https://www.nyu.edu/life/work-service/careerdevelopment/',
    'Health Services':     'https://www.nyu.edu/life/safety-health-wellness/student-health-center/',
    'Dining Services':     'https://www.nyu.edu/life/campus-resources/dining/',
    'Housing & Residence': 'https://www.nyu.edu/life/living-at-nyu/',
    'Library':             'https://library.nyu.edu/',
    'Athletics':           'https://gonyuathletics.com/',
  },
  'bu.edu': {
    'Student Portal':      'https://my.bu.edu/',
    'Course Registration': 'https://www.bu.edu/reg/',
    'Financial Aid':       'https://www.bu.edu/finaid/',
    'Career Center':       'https://www.bu.edu/careers/',
    'Health Services':     'https://www.bu.edu/shs/',
    'Library':             'https://www.bu.edu/library/',
    'Athletics':           'https://goterriers.com/',
    'Student Life':        'https://www.bu.edu/studentlife/',
  },
  'northeastern.edu': {
    'Financial Aid':       'https://studentfinance.northeastern.edu/',
    'Health Services':     'https://www.northeastern.edu/uhcs/',
    'Athletics':           'https://nuhuskies.com/',
  },
  'tufts.edu': {
    'Student Portal':      'https://sis.uit.tufts.edu/',
    'Career Center':       'https://careers.tufts.edu/',
    'Health Services':     'https://health.tufts.edu/',
    'Athletics':           'https://gotuftsjumbos.com/',
  },
  'fordham.edu': {
    'Student Portal':      'https://my.fordham.edu/',
    'Athletics':           'https://fordhamsports.com/',
  },
  'georgetown.edu': {
    'Student Portal':      'https://myaccess.georgetown.edu/',
    'Career Center':       'https://cdo.georgetown.edu/',
    'Health Services':     'https://studenthealth.georgetown.edu/',
    'Athletics':           'https://guhoyas.com/',
  },
  'gwu.edu': {
    'Student Portal':      'https://my.gwu.edu/',
    'Career Center':       'https://careers.gwu.edu/',
    'Athletics':           'https://gwsports.com/',
  },
  'american.edu': {
    'Student Portal':      'https://my.american.edu/',
    'Career Center':       'https://www.american.edu/careercenter/',
    'Athletics':           'https://aueagles.com/',
  },

  // ── Mid-Atlantic / Southern ───────────────────────────────────────────
  'jhu.edu': {
    'Student Portal':      'https://sis.jhu.edu/',
    'Course Registration': 'https://studentaffairs.jhu.edu/registrar/',
    'Financial Aid':       'https://finaid.jhu.edu/',
    'Career Center':       'https://studentaffairs.jhu.edu/career/',
    'Health Services':     'https://studentaffairs.jhu.edu/student-health/',
    'Housing & Residence': 'https://studentaffairs.jhu.edu/housing/',
    'Athletics':           'https://hopkinssports.com/',
    'Student Life':        'https://studentaffairs.jhu.edu/',
  },
  'cmu.edu': {
    'Course Registration': 'https://www.cmu.edu/hub/',
    'Financial Aid':       'https://www.cmu.edu/sfs/',
    'Career Center':       'https://www.cmu.edu/career/',
    'Health Services':     'https://www.cmu.edu/health-services/',
    'Dining Services':     'https://www.cmu.edu/dining/',
    'Housing & Residence': 'https://www.cmu.edu/housing/',
    'Athletics':           'https://athletics.cmu.edu/',
    'Student Life':        'https://www.cmu.edu/student-affairs/',
  },
  'drexel.edu': {
    'Student Portal':      'https://drexel.edu/studentlife/',
    'Career Center':       'https://drexel.edu/scdc/',
    'Athletics':           'https://drexeldragons.com/',
  },
  'temple.edu': {
    'Student Portal':      'https://tuportal.temple.edu/',
    'Career Center':       'https://career.temple.edu/',
    'Athletics':           'https://owlsports.com/',
  },
  'pitt.edu': {
    'Student Portal':      'https://my.pitt.edu/',
    'Career Center':       'https://career.pitt.edu/',
    'Health Services':     'https://www.studentaffairs.pitt.edu/shrs/',
    'Athletics':           'https://pittsburghpanthers.com/',
  },
  'uchicago.edu': {
    'Student Portal':      'https://my.uchicago.edu/',
    'Financial Aid':       'https://financialaid.uchicago.edu/',
    'Career Center':       'https://career.uchicago.edu/',
    'Health Services':     'https://shs.uchicago.edu/',
    'Athletics':           'https://athletics.uchicago.edu/',
  },
  'rice.edu': {
    'Student Portal':      'https://esther.rice.edu/',
    'Career Center':       'https://careers.rice.edu/',
    'Athletics':           'https://riceowls.com/',
  },
  'tulane.edu': {
    'Student Portal':      'https://my.tulane.edu/',
    'Career Center':       'https://career.tulane.edu/',
    'Athletics':           'https://tulanegreenwave.com/',
  },
  'emory.edu': {
    'Student Portal':      'https://my.emory.edu/',
    'Career Center':       'https://career.emory.edu/',
    'Athletics':           'https://emoryathletics.com/',
  },
  'wfu.edu': {
    'Student Portal':      'https://win.wfu.edu/',
    'Career Center':       'https://career.wfu.edu/',
    'Athletics':           'https://godemondeacons.com/',
  },

  // ── UMass system ─────────────────────────────────────────────────────
  'umass.edu': {
    'Student Portal':      'https://spire.umass.edu/',
    'Career Center':       'https://www.umass.edu/careers/',
    'Health Services':     'https://www.umass.edu/uhs/',
    'Athletics':           'https://umassathletics.com/',
  },

  // ── UConn ─────────────────────────────────────────────────────────────
  'uconn.edu': {
    'Student Portal':      'https://studentadmin.uconn.edu/',
    'Career Center':       'https://career.uconn.edu/',
    'Health Services':     'https://shs.uconn.edu/',
    'Athletics':           'https://uconnhuskies.com/',
  },

  // ── Stony Brook / SUNY ───────────────────────────────────────────────
  'stonybrook.edu': {
    'Student Portal':      'https://solar.stonybrook.edu/',
    'Career Center':       'https://www.stonybrook.edu/career/',
    'Athletics':           'https://stonybrookathletics.com/',
  },

  // ── Virginia Tech ────────────────────────────────────────────────────
  'vt.edu': {
    'Student Portal':      'https://hokiespy.vt.edu/',
    'Career Center':       'https://career.vt.edu/',
    'Athletics':           'https://hokiesports.com/',
  },
}

// ── Quick-link templates ─────────────────────────────────────────────
function buildQuickLinks(domain, campusName, wikiUrl) {
  const base      = `https://${domain}`
  const overrides = DOMAIN_OVERRIDES[domain] || {}
  const url = (label, fallback) => overrides[label] ?? fallback

  return [
    { label: 'Official Website',    url: url('Official Website',    base),                                                    emoji: '🌐' },
    { label: 'Campus Map',          url: url('Campus Map',          `https://maps.google.com/?q=${encodeURIComponent(campusName)}`), emoji: '🗺️' },
    { label: 'Student Portal',      url: url('Student Portal',      `https://my.${domain}`),                                  emoji: '🎓' },
    { label: 'Course Registration', url: url('Course Registration', `https://registrar.${domain}`),                           emoji: '📋' },
    { label: 'Financial Aid',       url: url('Financial Aid',       `https://financialaid.${domain}`),                        emoji: '💰' },
    { label: 'Career Center',       url: url('Career Center',       `https://careers.${domain}`),                             emoji: '💼' },
    { label: 'Health Services',     url: url('Health Services',     `https://health.${domain}`),                              emoji: '🏥' },
    { label: 'Dining Services',     url: url('Dining Services',     `https://dining.${domain}`),                              emoji: '🍽️' },
    { label: 'Housing & Residence', url: url('Housing & Residence', `https://housing.${domain}`),                             emoji: '🏠' },
    { label: 'Library',             url: url('Library',             `https://library.${domain}`),                             emoji: '📚' },
    { label: 'Athletics',           url: url('Athletics',           `https://athletics.${domain}`),                           emoji: '🏆' },
    { label: 'Student Life',        url: url('Student Life',        `https://studentlife.${domain}`),                         emoji: '🎭' },
    { label: 'Wikipedia Article',   url: url('Wikipedia Article',   wikiUrl),                                                 emoji: '📖' },
  ]
}

// ── Wikipedia fetching ───────────────────────────────────────────────
function cleanWikiMarkup(text) {
  return text
    .replace(/\[\[(?:[^\]|]+\|)?([^\]]+)\]\]/g, '$1')   // [[link|text]] → text
    .replace(/\[https?:\/\/[^\s\]]+\s([^\]]+)\]/g, '$1') // [url text] → text
    .replace(/'''([^']+)'''/g, '$1')                      // bold
    .replace(/''([^']+)''/g, '$1')                        // italic
    .replace(/{{[^}]*}}/g, '')                            // templates
    .replace(/\[\[File:[^\]]+\]\]/g, '')                  // images
    .replace(/\[\[Image:[^\]]+\]\]/g, '')                 // images alt
    .replace(/<ref[^>]*>.*?<\/ref>/gs, '')                // refs
    .replace(/<[^>]+>/g, '')                              // any HTML
    .replace(/\s{2,}/g, ' ')
    .trim()
}

function parseWikiExtract(rawText) {
  const sections = []
  const lines = rawText.split('\n')
  let current = null

  for (const line of lines) {
    const h2 = line.match(/^== ?(.+?) ?==$/)
    const h3 = line.match(/^=== ?(.+?) ?===$/)
    const h4 = line.match(/^==== ?(.+?) ?====$/)

    if (h2) {
      if (current && current.paragraphs.length > 0) sections.push(current)
      current = {
        title: h2[1].trim(),
        level: 2,
        paragraphs: [],
        subsections: [],
        category: categoriseSection(h2[1]),
      }
    } else if (h3 && current) {
      current.subsections.push({ title: h3[1].trim(), level: 3 })
    } else if (h4 && current) {
      current.subsections.push({ title: h4[1].trim(), level: 4 })
    } else if (current) {
      const clean = cleanWikiMarkup(line)
      if (clean.length > 20) current.paragraphs.push(clean)
    }
  }
  if (current && current.paragraphs.length > 0) sections.push(current)
  return sections
}

async function fetchUniversityWiki(campusName) {
  const headers = { 'User-Agent': 'Campusly/1.0 (campus-social-app)' }

  // Step 1: Search for the right Wikipedia article
  const searchRes = await fetch(
    `https://en.wikipedia.org/w/api.php?action=query&list=search&srsearch=${encodeURIComponent(campusName)}&format=json&origin=*&srlimit=8&srnamespace=0`,
    { headers }
  )
  const searchData = await searchRes.json()
  const results = (searchData.query?.search || [])

  // Prefer articles that mention "university", "college", "institute" in the title
  const match =
    results.find(r => r.title.toLowerCase() === campusName.toLowerCase()) ||
    results.find(r => /university|college|institute|polytechnic/i.test(r.title)) ||
    results[0]

  if (!match) return null
  const wikiTitle = match.title

  // Step 2: Fetch summary (thumbnail, description, etc.)
  const [summaryRes, articleRes] = await Promise.all([
    fetch(`https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(wikiTitle)}`, { headers }),
    fetch(
      `https://en.wikipedia.org/w/api.php?action=query&prop=extracts&titles=${encodeURIComponent(wikiTitle)}&format=json&origin=*&explaintext=true&exsectionformat=wiki`,
      { headers }
    ),
  ])

  const summary    = await summaryRes.json()
  const articleData = await articleRes.json()
  const pages      = articleData.query?.pages || {}
  const page       = Object.values(pages)[0]
  const rawText    = page?.extract || ''

  const sections = parseWikiExtract(rawText)

  return {
    title:     (summary.displaytitle || wikiTitle).replace(/<[^>]+>/g, ''),
    summary:   summary.extract,
    thumbnail: summary.thumbnail?.source,
    wikiUrl:   summary.content_urls?.desktop?.page || `https://en.wikipedia.org/wiki/${encodeURIComponent(wikiTitle)}`,
    location:  summary.description,
    sections,
  }
}

// ── Cache helpers ────────────────────────────────────────────────────
function getCacheKey(domain) { return `campusly_info_v2_${domain}` }

function readCache(domain) {
  try {
    const raw = localStorage.getItem(getCacheKey(domain))
    if (!raw) return null
    const { ts, data } = JSON.parse(raw)
    // Cache valid for 24 hours
    if (Date.now() - ts > 86400000) return null
    return data
  } catch { return null }
}

function writeCache(domain, data) {
  try {
    localStorage.setItem(getCacheKey(domain), JSON.stringify({ ts: Date.now(), data }))
  } catch {}
}

// ── Section Accordion ────────────────────────────────────────────────
function SectionCard({ section, campusColor, defaultOpen }) {
  const [open, setOpen] = useState(defaultOpen || false)

  return (
    <div style={{
      ...panel,
      overflow: 'hidden',
      transition: 'box-shadow 0.2s',
    }}>
      {/* Header */}
      <button
        onClick={() => setOpen(o => !o)}
        style={{
          width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
          padding: '15px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
          textAlign: 'left',
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <span style={{ fontSize: 11, fontWeight: 700, letterSpacing: '0.07em', textTransform: 'uppercase', color: campusColor }}>
            {CATEGORIES.find(c => c.key === section.category)?.emoji || '📄'}
          </span>
          <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
            {section.title}
          </span>
          {section.subsections.length > 0 && (
            <span style={{ fontSize: 10, color: 'var(--text-3)', background: 'rgba(255,255,255,0.07)', borderRadius: 999, padding: '1px 7px' }}>
              {section.subsections.length} topics
            </span>
          )}
        </div>
        <span style={{ color: 'var(--text-3)', fontSize: 13, transition: 'transform 0.2s', transform: open ? 'rotate(180deg)' : 'none' }}>▼</span>
      </button>

      {/* Body */}
      {open && (
        <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
          {/* Sub-topics */}
          {section.subsections.length > 0 && (
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: 6, marginTop: 12, marginBottom: 12 }}>
              {section.subsections.map((s, i) => (
                <span key={i} style={{
                  fontSize: 11, background: `${campusColor}15`, border: `1px solid ${campusColor}30`,
                  color: campusColor, borderRadius: 999, padding: '2px 9px', fontWeight: 600,
                }}>
                  {s.title}
                </span>
              ))}
            </div>
          )}

          {/* Paragraphs */}
          {section.paragraphs.map((p, i) => (
            <p key={i} style={{
              fontSize: 13, color: 'var(--text-2)', lineHeight: 1.7,
              margin: i === 0 && section.subsections.length === 0 ? '12px 0 0' : '8px 0 0',
            }}>
              {p}
            </p>
          ))}
        </div>
      )}
    </div>
  )
}

// ── Quick Links Grid ─────────────────────────────────────────────────
function QuickLinks({ links, campusColor }) {
  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(175px, 1fr))', gap: 10 }}>
      {links.map(link => (
        <a
          key={link.label}
          href={link.url}
          target="_blank"
          rel="noopener noreferrer"
          style={{
            ...panel,
            display: 'flex', alignItems: 'center', gap: 10,
            padding: '12px 14px', textDecoration: 'none',
            color: 'var(--text-2)', fontSize: 13, fontWeight: 500,
            transition: 'all 0.15s', borderRadius: 12,
          }}
          onMouseEnter={e => {
            e.currentTarget.style.background = `${campusColor}12`
            e.currentTarget.style.borderColor = `${campusColor}40`
            e.currentTarget.style.color = campusColor
          }}
          onMouseLeave={e => {
            e.currentTarget.style.background = panel.background
            e.currentTarget.style.borderColor = 'rgba(255,255,255,0.10)'
            e.currentTarget.style.color = 'var(--text-2)'
          }}
        >
          <span style={{ fontSize: 18, flexShrink: 0 }}>{link.emoji}</span>
          <span style={{ lineHeight: 1.3 }}>{link.label}</span>
          <span style={{ marginLeft: 'auto', fontSize: 10, opacity: 0.4, flexShrink: 0 }}>↗</span>
        </a>
      ))}
    </div>
  )
}

// ── Skeleton loader ──────────────────────────────────────────────────
function Skeleton({ h = 16, w = '100%', r = 8, mb = 0 }) {
  return (
    <div style={{
      height: h, width: w, borderRadius: r, marginBottom: mb,
      background: 'rgba(255,255,255,0.07)',
      animation: 'campusly-shimmer 1.4s ease-in-out infinite',
    }} />
  )
}

// ── Main Page ────────────────────────────────────────────────────────
export default function Info() {
  const { profile } = useAuth()
  const campusColor  = profile?.campus_color || '#a78bfa'
  const campusName   = profile?.campus_name  || ''
  const domain       = profile?.domain       || ''

  const [wikiData,  setWikiData]  = useState(null)
  const [loading,   setLoading]   = useState(true)
  const [error,     setError]     = useState('')
  const [linksOpen, setLinksOpen] = useState(false)

  useEffect(() => {
    if (!campusName) return
    const cached = readCache(domain)
    if (cached) { setWikiData(cached); setLoading(false); return }

    fetchUniversityWiki(campusName)
      .then(data => {
        if (data) { writeCache(domain, data); setWikiData(data) }
        else setError('No Wikipedia article found for this university.')
      })
      .catch(() => setError('Failed to load university information.'))
      .finally(() => setLoading(false))
  }, [campusName, domain])

  const quickLinks = wikiData
    ? buildQuickLinks(domain, campusName, wikiData.wikiUrl)
    : []

  return (
    <Layout>
      <style>{`
        @keyframes campusly-shimmer {
          0%   { opacity: 0.5; }
          50%  { opacity: 1; }
          100% { opacity: 0.5; }
        }
      `}</style>

      <div style={{ maxWidth: 780, margin: '0 auto', padding: '32px 20px 60px' }}>

        {/* ── Page header ── */}
        <div style={{ marginBottom: 28 }}>
          <h1 style={{ margin: 0, fontFamily: 'var(--font-display)', fontSize: 26, fontWeight: 700, letterSpacing: '-0.02em' }}>
            Campus Info 🎓
          </h1>
          <p style={{ margin: '5px 0 0', fontSize: 13, color: 'var(--text-3)' }}>
            Everything you need to know about {campusName || 'your university'}
          </p>
        </div>

        {/* ── Loading skeleton ── */}
        {loading && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 14 }}>
            <div style={{ ...panel, padding: '24px', display: 'flex', gap: 20 }}>
              <Skeleton h={120} w={120} r={12} />
              <div style={{ flex: 1, display: 'flex', flexDirection: 'column', gap: 10 }}>
                <Skeleton h={22} w="60%" />
                <Skeleton h={14} w="40%" />
                <Skeleton h={13} />
                <Skeleton h={13} />
                <Skeleton h={13} w="80%" />
              </div>
            </div>
            {[1,2,3,4,5].map(i => (
              <div key={i} style={{ ...panel, padding: '16px 18px' }}>
                <Skeleton h={16} w={`${40 + i * 8}%`} />
              </div>
            ))}
          </div>
        )}

        {/* ── Error ── */}
        {!loading && error && (
          <div style={{ ...panel, padding: '40px 24px', textAlign: 'center' }}>
            <div style={{ fontSize: 36, marginBottom: 12 }}>😕</div>
            <div style={{ fontWeight: 600, fontFamily: 'var(--font-display)', marginBottom: 6 }}>{error}</div>
            <div style={{ fontSize: 13, color: 'var(--text-3)' }}>
              Try refreshing the page — or check your university's official website.
            </div>
          </div>
        )}

        {/* ── Loaded content ── */}
        {!loading && wikiData && (
          <>
            {/* ── Hero card ── */}
            <div style={{
              ...panel,
              padding: '22px 24px',
              marginBottom: 22,
              display: 'flex',
              gap: 22,
              flexWrap: 'wrap',
              alignItems: 'flex-start',
            }}>
              {wikiData.thumbnail && (
                <img
                  src={wikiData.thumbnail}
                  alt={wikiData.title}
                  style={{
                    width: 130, height: 130, objectFit: 'cover',
                    borderRadius: 12, flexShrink: 0,
                    border: '1px solid rgba(255,255,255,0.10)',
                  }}
                />
              )}
              <div style={{ flex: 1, minWidth: 200 }}>
                <h2 style={{ margin: '0 0 4px', fontFamily: 'var(--font-display)', fontSize: 20, fontWeight: 700 }}>
                  {wikiData.title}
                </h2>
                {wikiData.location && (
                  <div style={{ fontSize: 12, color: campusColor, fontWeight: 600, marginBottom: 10 }}>
                    📍 {wikiData.location}
                  </div>
                )}
                <p style={{ fontSize: 13, color: 'var(--text-2)', lineHeight: 1.65, margin: 0 }}>
                  {wikiData.summary?.slice(0, 420)}{wikiData.summary?.length > 420 ? '…' : ''}
                </p>
                <a
                  href={wikiData.wikiUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  style={{ fontSize: 11, color: campusColor, marginTop: 10, display: 'inline-block', textDecoration: 'none', fontWeight: 600 }}
                >
                  Read full Wikipedia article ↗
                </a>
              </div>
            </div>

            {/* ── Quick Links collapsible ── */}
            <div style={{ ...panel, marginBottom: 22, overflow: 'hidden' }}>
              <button
                onClick={() => setLinksOpen(o => !o)}
                style={{
                  width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                  padding: '15px 18px', background: 'transparent', border: 'none', cursor: 'pointer',
                  textAlign: 'left',
                }}
              >
                <span style={{ fontWeight: 700, fontSize: 14, fontFamily: 'var(--font-display)', color: 'var(--text)' }}>
                  🔗 Quick Links &amp; Resources
                </span>
                <span style={{ color: 'var(--text-3)', fontSize: 13, transition: 'transform 0.2s', transform: linksOpen ? 'rotate(180deg)' : 'none' }}>▼</span>
              </button>
              {linksOpen && (
                <div style={{ padding: '0 18px 18px', borderTop: '1px solid rgba(255,255,255,0.07)' }}>
                  <p style={{ fontSize: 11, color: 'var(--text-3)', margin: '12px 0 14px' }}>
                    These link to official university portals. If a link doesn't work, the page may use a different URL structure.
                  </p>
                  <QuickLinks links={quickLinks} campusColor={campusColor} />
                </div>
              )}
            </div>

            {/* ── Footer attribution ── */}
            <div style={{ marginTop: 8, fontSize: 11, color: 'var(--text-3)', textAlign: 'center', lineHeight: 1.6 }}>
              Info sourced from{' '}
              <a href={wikiData.wikiUrl} target="_blank" rel="noopener noreferrer" style={{ color: campusColor }}>
                Wikipedia
              </a>
              {' '}· updated every 24 h · use Quick Links above for official real-time info.
            </div>
          </>
        )}
      </div>
    </Layout>
  )
}
