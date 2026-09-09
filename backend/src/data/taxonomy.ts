// Point 2: the activity taxonomy + synonym map. Hand-curated, editable data.
// Grows weekly from the no-match term log (point 10). For head queries this
// beats embeddings: instant, debuggable, free.

export interface Activity {
  id: string
  label: string
  terms: string[] // what people type (normalized form)
  categoryLabels: string[] // which events it selects, by categoryLabel
}

export const activities: Activity[] = [
  {
    id: 'board-games',
    label: 'Board games',
    terms: ['board game', 'boardgame', 'board games', 'tabletop', 'catan', 'dice', 'meeple', 'strategy game'],
    categoryLabels: ['Board games'],
  },
  {
    id: 'badminton',
    label: 'Badminton',
    terms: ['badminton', 'shuttle', 'shuttlecock'],
    categoryLabels: ['Badminton'],
  },
  {
    id: 'pickleball',
    label: 'Pickleball',
    terms: ['pickleball', 'pickle ball', 'paddle'],
    categoryLabels: ['Pickleball'],
  },
  {
    id: 'running',
    label: 'Run club',
    terms: ['run', 'running', 'jog', 'jogging', '5k', 'marathon', 'run club'],
    categoryLabels: ['Run club'],
  },
  {
    id: 'cycling',
    label: 'Cycling',
    terms: ['cycle', 'cycling', 'ride', 'riding', 'bike', 'biking'],
    categoryLabels: ['Cycling'],
  },
  {
    id: 'language',
    label: 'Language exchange',
    terms: ['language', 'language exchange', 'kannada', 'english practice', 'conversation'],
    categoryLabels: ['Language exchange'],
  },
  {
    id: 'art',
    label: 'Art & sketching',
    terms: ['sketch', 'sketching', 'drawing', 'art', 'paint', 'painting'],
    categoryLabels: ['Art'],
  },
  {
    id: 'pottery',
    label: 'Pottery',
    terms: ['pottery', 'ceramics', 'clay', 'wheel'],
    categoryLabels: ['Make'],
  },
  {
    id: 'books',
    label: 'Books',
    terms: ['book', 'books', 'reading', 'book club', 'novel'],
    categoryLabels: ['Books'],
  },
  {
    id: 'chess',
    label: 'Chess',
    terms: ['chess', 'blitz', 'checkmate'],
    categoryLabels: ['Board games'],
  },
  {
    id: 'football',
    label: 'Football',
    terms: ['football', 'soccer', '5s', 'five a side', 'turf'],
    categoryLabels: ['Football'],
  },
  {
    id: 'music',
    label: 'Music & open mic',
    terms: ['music', 'open mic', 'gig', 'jam', 'singing'],
    categoryLabels: ['Music'],
  },
  {
    id: 'dance',
    label: 'Dance',
    terms: ['dance', 'dancing', 'salsa', 'bachata'],
    categoryLabels: ['Dance'],
  },
  {
    id: 'trivia',
    label: 'Trivia',
    terms: ['trivia', 'quiz', 'pub quiz'],
    categoryLabels: ['Trivia'],
  },
  {
    id: 'yoga',
    label: 'Yoga',
    terms: ['yoga', 'stretch', 'flow'],
    categoryLabels: ['Yoga'],
  },
  {
    id: 'photography',
    label: 'Photography',
    terms: ['photo', 'photography', 'photo walk', 'camera'],
    categoryLabels: ['Photography'],
  },
  {
    id: 'baking',
    label: 'Baking',
    terms: ['baking', 'bake', 'sourdough', 'bread'],
    categoryLabels: ['Make'],
  },
]

// Filter words the router lifts out of the query (point 4).
export const FILTER_TERMS: Record<string, 'free' | 'beginner'> = {
  free: 'free',
  beginner: 'beginner',
  beginners: 'beginner',
  'beginner friendly': 'beginner',
  newbie: 'beginner',
}

// Date words → the frontend's "when" values (Wed 9 Sep 2026 is "today").
export const DATE_TERMS: Record<string, string> = {
  tonight: 'tonight',
  today: 'tonight',
  tomorrow: '10',
  weekend: 'weekend',
  wednesday: 'tonight',
  wed: 'tonight',
  thursday: '10',
  thu: '10',
  friday: '11',
  fri: '11',
  saturday: '12',
  sat: '12',
  sunday: '13',
  sun: '13',
}
