import type { CircleItem, Community, Person, Series, TcEvent, Venue } from '../types'

// All sample data. Wed 9 Sep evening, Bengaluru.

export const people: Record<string, Person> = {
  ananya: { id: 'ananya', name: 'Ananya', initials: 'AN', color: 'orange' },
  rohan: { id: 'rohan', name: 'Rohan', initials: 'RS', color: 'blue' },
  priya: { id: 'priya', name: 'Priya', initials: 'PK', color: 'yellow' },
  manav: { id: 'manav', name: 'Manav', initials: 'MJ', color: 'ink' },
  vikram: { id: 'vikram', name: 'Vikram', initials: 'VK', color: 'blue' },
  rahul: { id: 'rahul', name: 'Rahul', initials: 'RH', color: 'yellow' },
}

export const venues: Record<string, Venue> = {
  'dice-district': {
    id: 'dice-district',
    name: 'Dice District Board Game Café',
    area: 'Indiranagar, 100 Feet Rd',
    entranceNote:
      'Entrance beside Blue Tokai — take the stairs to the second floor. Ask for the Tether Clan table.',
    distanceKm: 1.2,
    travel: { autoMin: 9, autoFare: 60, metro: 'Indiranagar + 6 min walk', walkMin: 16 },
    accessible: true,
    pastEventCount: 12,
  },
  'third-wave': {
    id: 'third-wave',
    name: 'Third Wave Coffee',
    area: 'Church Street',
    entranceNote: 'Ground floor, long table at the back.',
    distanceKm: 2.4,
    travel: { autoMin: 18 },
  },
  'cubbon-park': {
    id: 'cubbon-park',
    name: 'Cubbon Park',
    area: 'Bandstand entrance',
    entranceNote: 'Meet at the bandstand, look for the yellow flag.',
    distanceKm: 3.1,
    travel: { autoMin: 22 },
  },
  'hsr-courts': {
    id: 'hsr-courts',
    name: 'HSR Courts',
    area: 'HSR Layout, Sector 2',
    entranceNote: 'Gate 2, ask for court C.',
    distanceKm: 4.1,
    travel: { autoMin: 26 },
  },
  'clay-day': {
    id: 'clay-day',
    name: 'Clay Day Studio',
    area: 'Jayanagar 4th Block',
    entranceNote: 'Blue gate next to the flower market lane, studio is on the terrace.',
    distanceKm: 5.6,
    travel: { autoMin: 24 },
    accessible: false,
  },
  'koramangala-park': {
    id: 'koramangala-park',
    name: 'Koramangala 3rd Block Park',
    area: 'Meet at the north gate',
    entranceNote: 'North gate, look for the group with cycles.',
    distanceKm: 3.4,
    travel: { autoMin: 15 },
  },
}

export const communities: Record<string, Community> = {
  'dice-district-regulars': { id: 'dice-district-regulars', name: 'Dice District Regulars', memberCount: 64 },
  'cubbon-runners': { id: 'cubbon-runners', name: 'Cubbon Park Run Club', memberCount: 210 },
}

export const series: Record<string, Series> = {
  'wednesday-catan': {
    id: 'wednesday-catan',
    title: 'Wednesday Catan',
    cadenceLabel: 'every Wednesday',
    hostId: 'ananya',
    communityId: 'dice-district-regulars',
  },
  'sunrise-5k': {
    id: 'sunrise-5k',
    title: 'Sunrise 5K',
    cadenceLabel: 'every morning',
    hostId: 'rahul',
    communityId: 'cubbon-runners',
  },
}

export const events: Record<string, TcEvent> = {
  'catan-night': {
    id: 'catan-night',
    title: 'Catan Night at Dice District',
    category: 'board-games',
    categoryLabel: 'Board games',
    dayLabel: 'Tonight',
    timeLabel: '7:30 PM',
    startsInLabel: 'Starts in 1h 40m',
    price: 250,
    capacity: 8,
    going: 6,
    beginnerFriendly: true,
    venueId: 'dice-district',
    hostId: 'ananya',
    seriesId: 'wednesday-catan',
    firstTimers: 2,
    tags: ['Beginner friendly', 'Social', 'Indoor'],
    attendees: [
      { personId: 'ananya', relation: 'host', note: 'Runs this table every Wednesday · teaches beginners' },
      { personId: 'rohan', relation: 'regular', note: 'Also into cycling — you follow Sarjapur Riders too' },
      { personId: 'priya', relation: 'first-timer', note: 'Joined Tether Clan this month · her first event too' },
      { personId: 'manav', relation: 'regular' },
    ],
    sharedInterestNote: 'You and Ananya both played at Meeple Monday',
    whatToExpect: 'Rules till 7:50, then two boards. Casual, chatty table.',
    icebreaker:
      '“What’s the most ruthless trade anyone’s ever pulled on you — in Catan or in life?”',
    hostAnnouncement: '“We’re at the corner table upstairs — chai’s already ordered.”',
    roles: [
      { id: 'teach', label: 'Teach the rules', claimedBy: 'ananya' },
      { id: 'bring-catan', label: 'Bring Catan', claimedBy: 'rohan' },
      { id: 'book-table', label: 'Book the table' },
    ],
  },
  'kannada-english': {
    id: 'kannada-english',
    title: 'Kannada–English Table',
    category: 'language',
    categoryLabel: 'Language exchange',
    dayLabel: 'Tonight',
    timeLabel: '8:00 PM',
    price: 0,
    capacity: 14,
    going: 7,
    levelLabel: 'All levels',
    venueId: 'third-wave',
    hostId: 'priya',
    firstTimers: 1,
    tags: ['Free', 'Social', 'All levels'],
    attendees: [
      { personId: 'priya', relation: 'host' },
    ],
    whatToExpect: 'Half an hour in each language over filter coffee.',
  },
  sketchwalk: {
    id: 'sketchwalk',
    title: 'Sketchwalk · Cubbon Park',
    category: 'art',
    categoryLabel: 'Art',
    dayLabel: 'Tonight',
    timeLabel: 'till 8 PM',
    liveNow: true,
    price: 0,
    capacity: 20,
    going: 9,
    levelLabel: 'Drop in',
    venueId: 'cubbon-park',
    hostId: 'manav',
    firstTimers: 0,
    tags: ['Free', 'Drop-in', 'Outdoor'],
    attendees: [{ personId: 'manav', relation: 'host' }],
  },
  'late-doubles': {
    id: 'late-doubles',
    title: 'Late Doubles · HSR Pickleball',
    category: 'pickleball',
    categoryLabel: 'Pickleball',
    dayLabel: 'Tonight',
    timeLabel: '9:00 PM',
    price: 150,
    capacity: 12,
    going: 12,
    waitlistCount: 4,
    levelLabel: 'Intermediate',
    venueId: 'hsr-courts',
    hostId: 'vikram',
    firstTimers: 0,
    tags: ['Intermediate', 'Sports'],
    attendees: [{ personId: 'vikram', relation: 'host' }],
  },
  'badminton-doubles': {
    id: 'badminton-doubles',
    title: 'Badminton Doubles · Casual Rallies',
    category: 'pickleball',
    categoryLabel: 'Badminton',
    dayLabel: 'Tonight',
    timeLabel: '9:00 PM',
    price: 120,
    capacity: 8,
    going: 5,
    beginnerFriendly: true,
    levelLabel: 'Casual rallies',
    venueId: 'hsr-courts',
    hostId: 'manav',
    firstTimers: 1,
    tags: ['Beginner friendly', 'Sports'],
    attendees: [{ personId: 'manav', relation: 'host', note: 'Brings spare racquets for newcomers' }],
  },
  'sunrise-5k-thu': {
    id: 'sunrise-5k-thu',
    title: 'Sunrise 5K · Cubbon Park',
    category: 'running',
    categoryLabel: 'Run club',
    dayLabel: 'Tomorrow',
    timeLabel: '6:00 AM',
    price: 0,
    capacity: 40,
    going: 18,
    levelLabel: 'Pace groups 6–8 min/km',
    venueId: 'cubbon-park',
    hostId: 'rahul',
    seriesId: 'sunrise-5k',
    firstTimers: 3,
    tags: ['Free', 'Fitness', 'Early start'],
    attendees: [{ personId: 'rahul', relation: 'host' }],
  },
  'pottery-taster': {
    id: 'pottery-taster',
    title: 'Pottery Wheel Taster',
    category: 'art',
    categoryLabel: 'Make',
    dayLabel: 'Sat',
    timeLabel: '11:00 AM',
    price: 600,
    capacity: 6,
    going: 4,
    beginnerFriendly: true,
    levelLabel: 'First-timers welcome',
    venueId: 'clay-day',
    hostId: 'priya',
    firstTimers: 3,
    tags: ['Beginner friendly', 'Hands-on'],
    attendees: [
      { personId: 'priya', relation: 'host', note: 'Studio provides aprons, clay and chai' },
    ],
    whatToExpect: 'Two hours on the wheel, you keep what you make.',
  },
  'cycle-loop': {
    id: 'cycle-loop',
    title: 'Sunrise Cycle Loop · 25 km',
    category: 'running',
    categoryLabel: 'Cycling',
    dayLabel: 'Sun',
    timeLabel: '6:30 AM',
    price: 0,
    capacity: 15,
    going: 8,
    levelLabel: 'All paces · no-drop ride',
    venueId: 'koramangala-park',
    hostId: 'rohan',
    firstTimers: 2,
    tags: ['Free', 'Fitness', 'Early start'],
    attendees: [
      { personId: 'rohan', relation: 'host', note: 'Rides with Sarjapur Riders · sets an easy pace' },
    ],
  },
  'book-brunch': {
    id: 'book-brunch',
    title: 'Book Club Brunch — bring whatever you’re reading',
    category: 'language',
    categoryLabel: 'Books',
    dayLabel: 'Sun',
    timeLabel: '10:30 AM',
    price: 350,
    capacity: 10,
    going: 6,
    levelLabel: 'No assigned reading',
    venueId: 'third-wave',
    hostId: 'vikram',
    firstTimers: 1,
    tags: ['Social', 'Chill'],
    attendees: [
      { personId: 'vikram', relation: 'host', note: 'No assigned book — everyone pitches what they brought' },
    ],
  },
}

export const circleItems: CircleItem[] = [
  {
    id: 'c1',
    personIds: ['ananya', 'rohan'],
    headline: 'Ananya, Rohan and 3 others are going',
    eventId: 'catan-night',
    sharedInterestNote: 'You and Ananya both played at Meeple Monday',
  },
  {
    id: 'c2',
    personIds: ['vikram'],
    headline: 'Vikram is on the waitlist',
    eventId: 'late-doubles',
  },
  {
    id: 'c3',
    personIds: ['rahul'],
    headline: 'Rahul goes every week',
    eventId: 'sunrise-5k-thu',
  },
]

export const tonightEventIds = ['catan-night', 'kannada-english', 'sketchwalk', 'late-doubles']

// Events shown in the "worth the ride" list when browsing a quiet area.
export const worthTheRideIds = ['catan-night', 'sunrise-5k-thu']

export function seatsLeft(e: TcEvent): number {
  return Math.max(0, e.capacity - e.going)
}

export function priceLabel(e: TcEvent): string {
  return e.price === 0 ? 'Free' : `₹${e.price}`
}
