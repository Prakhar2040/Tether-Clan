import type { Community, CommunityPhoto, CommunityPost, CommunityRole, TcEvent } from '../types'
import { events, series } from './mock'
import boardGamesCover from '../assets/community-board-games.jpg'
import runClubCover from '../assets/community-run-club.jpg'
import ddrCelebration from '../assets/ddr-celebration.jpg'
import ddrHegemony from '../assets/ddr-hegemony.jpg'
import ddrWizard from '../assets/ddr-wizard.jpg'
import ddrHall from '../assets/ddr-hall.jpg'
import ddrOrigins from '../assets/ddr-origins.jpg'

// Communities are the standing groups behind the one-off plans. An event
// belongs to a community through its series; a few are hung on the community
// directly, for groups that do not yet run a fixed cadence.

export const communities: Record<string, Community> = {
  'dice-district-regulars': {
    id: 'dice-district-regulars',
    name: 'Dice District Regulars',
    memberCount: 64,
    blurb: 'Board games every Wednesday, Koramangala',
    description:
      'We play Catan, Wingspan and whatever someone drags along, every Wednesday at Dice District. Turn up alone — someone will teach you the rules and you will not sit out a round. Games start at 7:30 sharp because the last round always runs long.',
    areaName: 'Koramangala',
    categoryLabel: 'Board games',
    ownerIds: ['ananya'],
    adminIds: ['rohan'],
    ownerTitle: 'Researcher at Google',
    ownerQuote: '“What I love is the bit an hour in, when four people who met at the door are arguing about wheat like they have known each other for years.”',
    ownerBio: [
      "I'm a researcher at Google, and board games are what I do with everything that isn't work. There are four hundred and some boxes in my flat now, which is roughly three hundred more than anyone needs and about a hundred fewer than I want.",
      'That is the entire reason this exists. The games are just the excuse.',
      'If you have never played anything, you are the person I most want at the table. Come and be taught badly by someone who is enjoying themselves.',
    ],
    highlights: [
      { n: '400+', label: 'games in my flat' },
      { n: '62', label: 'Wednesdays run' },
      { n: '9', label: 'average at a table' },
      { n: '0', label: 'people turned away' },
    ],
    rating: 4.8,
    ratingCount: 41,
    color: '#15477C',
    coverImage: boardGamesCover,
    startedLabel: 'Started March 2025',
    houseRules: [
      'Rules get taught, not assumed — first-timers are the point.',
      'Tell us by Tuesday night if you cannot make it. Someone is on the list.',
      'Phones face down once the board is out.',
    ],
  },
  'sketchbook-bengaluru': {
    id: 'sketchbook-bengaluru',
    name: 'Bengaluru Sketchbook Club',
    memberCount: 128,
    blurb: 'Saturday sketchwalks, no skill required',
    description:
      'A slow walk with a sketchbook. We pick a corner of the city, draw for two hours, then spread everything out on a bench and look at what everyone made. Bring any paper and any pen. Nobody here can draw hands.',
    areaName: 'Cubbon Park',
    categoryLabel: 'Art',
    ownerIds: ['manav'],
    adminIds: ['priya'],
    ownerTitle: 'Illustrator',
    ownerQuote: '“Nobody here can draw hands, and that is the point.”',
    ownerBio: [
      'I draw for a living and I still cannot do hands, which should tell you everything about how seriously we take skill here.',
      'The walk is the point. We stop a lot, we draw whatever is in front of us, and at the end we put thirty-one sketchbooks on a bench and find out that nobody saw the same thing.',
    ],
    highlights: [
      { n: '2h', label: 'of drawing' },
      { n: '31', label: 'sketchbooks last walk' },
      { n: '0', label: 'critique unless asked' },
    ],
    rating: 4.7,
    ratingCount: 63,
    color: '#E9712A',
    startedLabel: 'Started August 2024',
    houseRules: [
      'No critique unless it is asked for.',
      'We draw what is in front of us, not from a photo.',
      'Pack out what you bring in — the park lets us keep coming back.',
    ],
  },
  'cubbon-runners': {
    id: 'cubbon-runners',
    name: 'Cubbon Park Run Club',
    memberCount: 210,
    blurb: '5K at sunrise, every morning',
    description:
      'We meet at the bandstand at 6:10 and start at 6:15, rain or not. Three pace groups so nobody runs alone and nobody gets dropped. There is filter coffee afterwards and it is the actual reason most of us come.',
    areaName: 'Cubbon Park',
    categoryLabel: 'Run club',
    ownerIds: ['rahul'],
    adminIds: [],
    ownerTitle: 'Physiotherapist',
    ownerQuote: '“Nobody has ever regretted picking the slow group.”',
    ownerBio: [
      "I fix people's knees for a living, which means I have strong opinions about running and almost none of them are about shoes.",
      'Two years ago six of us met at the bandstand and one was my brother, who only came because I woke him up. Two hundred of you later, the thing I am proudest of is that nobody has ever been left to finish alone.',
      'We start at 6:15. We do not wait. But we also do not leave anyone out there on their own, and those two things have never once been in conflict.',
    ],
    highlights: [
      { n: '6:15', label: 'every morning' },
      { n: '3', label: 'pace groups' },
      { n: '612', label: 'mornings so far' },
      { n: '0', label: 'runners dropped' },
    ],
    rating: 4.5,
    ratingCount: 128,
    color: '#2E7D4F',
    coverImage: runClubCover,
    startedLabel: 'Started January 2024',
    houseRules: [
      'We start at 6:15. We do not wait.',
      'Slowest runner sets the pace of their group.',
      'Say your name at the circle if it is your first time.',
    ],
  },
  'sarjapur-riders': {
    id: 'sarjapur-riders',
    name: 'Sarjapur Riders',
    memberCount: 86,
    blurb: 'Sunday loops, 25–60 km',
    description:
      'Road and gravel, out past Sarjapur before the traffic wakes up. Two routes every Sunday so the 25 km crowd and the 60 km crowd both get a ride. Helmets are not negotiable.',
    areaName: 'Sarjapur Road',
    categoryLabel: 'Cycling',
    ownerIds: ['rohan'],
    adminIds: [],
    ownerTitle: 'Builds software, badly, on weekends',
    ownerQuote: '“Helmet, or you ride home. That is not a joke and I have sent people home.”',
    ownerBio: [
      'I have been riding out past Sarjapur since before there was anything to ride past. Now there is traffic by seven, so we leave at five.',
      'Two routes every Sunday so the twenty-five and the sixty crowd both get a ride.',
    ],
    highlights: [
      { n: '2', label: 'routes every Sunday' },
      { n: '25–60', label: 'km to choose from' },
      { n: '5:00', label: 'wheels rolling' },
    ],
    rating: 4.6,
    ratingCount: 37,
    color: '#0E3A68',
    startedLabel: 'Started June 2025',
    houseRules: ['Helmet, or you ride home.', 'Nobody is left behind at a junction.'],
  },
}

// You belong to one community, occasionally two. Communities are not a
// directory you shop through — Events is the browsing surface, this is the
// room you are already in. Membership is also the gate on writing: only
// owners and admins get a composer.
export const myMemberships: Record<string, CommunityRole> = {
  'dice-district-regulars': 'member',
  'cubbon-runners': 'member',
}

// The sortKey you had last read up to, per community. Lower is newer, so
// anything below this number arrived since you last opened the channel.
export const lastReadAt: Record<string, number> = {
  'dice-district-regulars': 2000,
  'cubbon-runners': 3000,
}

// Plans this community runs but that are not on a series yet.
const looseEventIds: Record<string, string[]> = {
  'dice-district-regulars': ['board-game-saturday'],
  'sketchbook-bengaluru': ['sketchwalk', 'sketchwalk-aug-30'],
  'sarjapur-riders': ['cycle-loop'],
}

export const posts: CommunityPost[] = [
  {
    id: 'ddr-pinned',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '👋',
    title: 'New here? Start with this',
    body: 'Turn up alone. Sit anywhere. Say you have never played — someone will teach you, and you will not sit out a round. We start at 7:30 because the last game always runs long. There is no skill floor here and there never has been.',
    timeLabel: '2w',
    sortKey: 20160,
    pinned: true,
    reactions: { '❤️': 24, '👏': 9 },
  },
  {
    id: 'ddr-sat',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '🎲',
    title: '40+ board games this Saturday',
    body: 'Join us at Dice District, Indiranagar — 5:00 PM, Saturday 12 September. Forty-odd boxes on the shelf and we will teach you anything you have not played. Four hours, tables reshuffle as games end. Bring a friend.',
    timeLabel: '5h',
    sortKey: 300,
    eventId: 'board-game-saturday',
    reactions: { '❤️': 21, '👏': 12 },
  },
  {
    id: 'ddr-poll',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'poll',
    emoji: '🗳️',
    body: '',
    timeLabel: '1d',
    sortKey: 1440,
    poll: {
      question: 'What are we opening next Wednesday?',
      closesLabel: 'Closes Tuesday night',
      options: [
        { id: 'catan', label: 'Catan, as always', votes: 9 },
        { id: 'wingspan', label: 'Wingspan', votes: 14 },
        { id: 'brass', label: 'Brass: Birmingham', votes: 6 },
        { id: 'whatever', label: 'Surprise us', votes: 4 },
      ],
    },
    reactions: { '❤️': 7, '👏': 2 },
  },
  {
    id: 'ddr-boxes',
    communityId: 'dice-district-regulars',
    authorId: 'rohan',
    kind: 'note',
    emoji: '📦',
    title: 'Fifteen new boxes on the shelf',
    body: 'Two of them are four-hour games, so somebody is going to have to be brave. Wingspan finally has its expansion, and there is a copy of Brass that nobody has opened yet.',
    timeLabel: '2d',
    sortKey: 2880,
    reactions: { '❤️': 31, '👏': 18 , '👀': 12, '🔥': 7 },
  },
  {
    id: 'ddr-chairs',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '🪑',
    title: 'Cancel by Tuesday if you cannot make it',
    body: 'We had four empty chairs last week and six people who wanted them. Thirty seconds in the app frees a seat for someone else. No hard feelings, just tell us.',
    timeLabel: '4d',
    sortKey: 5760,
    reactions: { '❤️': 8, '👏': 22 , '🙏': 15 },
  },
  {
    id: 'ddr-upstairs',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    body: 'Upstairs room is ours again from 7:30. Same corner table, same long game. Chai is already ordered.',
    timeLabel: '6d',
    sortKey: 8640,
    reactions: { '❤️': 15, '👏': 3 },
  },
  {
    id: 'ddr-welcome-12',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '🎉',
    title: 'Twelve new people this month',
    body: 'Twelve people joined this month and nine of them had never played anything heavier than Monopoly. That is exactly the ratio we want. Say hello when you see a new face at your table.',
    timeLabel: '1w',
    sortKey: 10080,
    reactions: { '❤️': 44, '👏': 27 , '🙌': 19 },
  },
  {
    id: 'ddr-heat',
    communityId: 'dice-district-regulars',
    authorId: 'rohan',
    kind: 'note',
    emoji: '🥵',
    title: 'Moving to the back room while this heat lasts',
    body: 'It is thirty-four degrees upstairs. We are moving to the back room with the AC until this breaks. Same time, same door, turn left instead of right.',
    timeLabel: '2w',
    sortKey: 20200,
    reactions: { '❤️': 12, '👏': 6 },
  },
  {
    id: 'ddr-poll-night',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'poll',
    emoji: '🗳️',
    body: '',
    timeLabel: '3w',
    sortKey: 30240,
    poll: {
      question: 'Would a second night work for anyone?',
      closesLabel: 'Closed',
      options: [
        { id: 'sun', label: 'Sunday afternoon', votes: 28 },
        { id: 'fri', label: 'Friday evening', votes: 19 },
        { id: 'no', label: 'Wednesday is enough', votes: 22 },
      ],
    },
    reactions: { '❤️': 11, '👏': 4 },
  },
  {
    id: 'ddr-teach',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    body: 'Seven people learned Catan from scratch on Wednesday and two of them beat the person who taught them. Rohan is still recovering.',
    timeLabel: '4w',
    sortKey: 40320,
    reactions: { '❤️': 38, '👏': 21 },
  },
  {
    id: 'ddr-shelf-arriving',
    communityId: 'dice-district-regulars',
    authorId: 'rohan',
    kind: 'note',
    body: 'The café is putting in a second shelf next to the window, which means we stop stacking boxes on the radiator. Small victories.',
    timeLabel: '1mo',
    sortKey: 43200,
    reactions: { '❤️': 9, '👏': 5 },
  },
  {
    id: 'ddr-full',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '⚠️',
    title: 'Wednesdays are filling fast now',
    body: 'Wednesday filled in four hours this week. If you want a seat, RSVP the moment it goes up — we are not adding a waitlist, so the only thing that works is being early.',
    timeLabel: '6w',
    sortKey: 60480,
    reactions: { '❤️': 16, '👏': 8 , '😮': 9 },
  },
  {
    id: 'ddr-parking',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    body: 'Parking on 100 Feet Road after 7 is a lost cause. The lane behind Blue Tokai usually has space, and the metro drops you six minutes away.',
    timeLabel: '2mo',
    sortKey: 86400,
    reactions: { '❤️': 14, '👏': 11 },
  },
  {
    id: 'ddr-year',
    communityId: 'dice-district-regulars',
    authorId: 'ananya',
    kind: 'note',
    emoji: '🥂',
    title: 'One year of Wednesdays',
    body: 'One year ago four of us sat at a table with one copy of Catan and no idea whether anyone else would come. Sixty-four of you later, thank you. Genuinely.',
    timeLabel: '3mo',
    sortKey: 129600,
    reactions: { '❤️': 96, '👏': 54 , '🥂': 31, '🎉': 22 },
  },
  {
    id: 'cpr-pinned',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '🏃',
    title: 'Pace groups, and how to pick one',
    body: 'Three groups: 5:30, 6:30 and 7:30 per km. Pick honestly — each group runs at the pace of whoever is slowest in it, and that is the whole point. Nobody gets dropped, nobody runs alone.',
    timeLabel: '3w',
    sortKey: 30240,
    pinned: true,
    reactions: { '❤️': 38, '👏': 11 },
  },
  {
    id: 'cpr-tomorrow',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '☀️',
    title: 'Sunrise 5K tomorrow, 6:15 sharp',
    body: 'Bandstand at Cubbon Park, Thursday 10 September. Gate opens at 6:00 and we leave at 6:15 whether or not you are tying your laces. The coffee cart has agreed to come early, so there is no excuse left.',
    timeLabel: '2h',
    sortKey: 120,
    eventId: 'sunrise-5k-thu',
    reactions: { '❤️': 27, '👏': 8 },
  },
  {
    id: 'cpr-poll',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'poll',
    emoji: '🗳️',
    body: '',
    timeLabel: '3d',
    sortKey: 4320,
    poll: {
      question: 'Saturday long run — how far?',
      closesLabel: 'Closes Thursday',
      options: [
        { id: '10k', label: '10K, back by 8', votes: 42 },
        { id: '15k', label: '15K', votes: 31 },
        { id: '21k', label: 'Half, and we earn breakfast', votes: 18 },
      ],
    },
    reactions: { '❤️': 14, '👏': 5 },
  },
  {
    id: 'cpr-gate',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '🚧',
    title: 'Gate 4 is shut until the end of the month',
    body: 'Resurfacing. Come in from Kasturba Road instead — it adds about three minutes, so leave earlier than you think you need to.',
    timeLabel: '5d',
    sortKey: 7200,
    reactions: { '❤️': 19, '👏': 3 },
  },
  {
    id: 'cpr-rain',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    body: 'It rained for the entire 5K on Tuesday and thirty-one people showed up anyway. The coffee afterwards has never tasted better.',
    timeLabel: '1w',
    sortKey: 10080,
    reactions: { '❤️': 52, '👏': 29 , '💪': 34, '😮': 9 },
  },
  {
    id: 'cpr-shoes',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '👟',
    title: 'On the shoe question, since it keeps coming up',
    body: 'You do not need carbon plates to run five kilometres at 6:15 in the morning. You need shoes that fit and the willingness to leave the house. That is the whole list.',
    timeLabel: '2w',
    sortKey: 20160,
    reactions: { '❤️': 47, '👏': 33 , '💯': 21 },
  },
  {
    id: 'cpr-200',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '🎉',
    title: 'Two hundred of us now',
    body: 'We crossed two hundred members this week. Two years ago it was six people and one of them was my brother, who was only there because I woke him up.',
    timeLabel: '3w',
    sortKey: 30300,
    reactions: { '❤️': 88, '👏': 61 , '🎉': 40, '🙌': 26 },
  },
  {
    id: 'cpr-newcomers',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    body: 'If it is your first morning, say your name at the circle before we start. It is thirty seconds and it means somebody will notice if you drop off the back.',
    timeLabel: '1mo',
    sortKey: 43200,
    reactions: { '❤️': 23, '👏': 14 },
  },
  {
    id: 'cpr-heat',
    communityId: 'cubbon-runners',
    authorId: 'rahul',
    kind: 'note',
    emoji: '🌡️',
    title: 'Starting fifteen minutes earlier',
    body: 'Moving the start to 6:00 for the rest of the month. It is already too warm by half past and the 7:30 group are the ones paying for it.',
    timeLabel: '2mo',
    sortKey: 86400,
    reactions: { '❤️': 18, '👏': 7 },
  },
]

export const photos: CommunityPhoto[] = [
  { id: 'ddr-p1', communityId: 'dice-district-regulars', src: ddrCelebration, color: '#15477C', caption: 'Aditi, from last place', byId: 'rohan', timeLabel: '1d', eventId: 'catan-sep-8' },
  { id: 'ddr-p2', communityId: 'dice-district-regulars', src: ddrHegemony, color: '#0E3A68', caption: 'Hegemony, four hours in', byId: 'rohan', timeLabel: '1d' },
  { id: 'ddr-p3', communityId: 'dice-district-regulars', src: ddrWizard, color: '#E9712A', caption: 'Rock Paper Wizard, and the hand signals', byId: 'ananya', timeLabel: '2d' },
  { id: 'ddr-p6', communityId: 'dice-district-regulars', src: ddrHall, color: '#15477C', caption: 'Games night at the hall', byId: 'rohan', timeLabel: '2w' },
  { id: 'ddr-p11', communityId: 'dice-district-regulars', src: ddrOrigins, color: '#E9712A', caption: 'Where it started', byId: 'ananya', timeLabel: '3mo' },
]
// ---- derivations ----

export function communityEvents(communityId: string): TcEvent[] {
  const seriesIds = Object.values(series)
    .filter((s) => s.communityId === communityId)
    .map((s) => s.id)
  const loose = looseEventIds[communityId] ?? []
  return Object.values(events).filter(
    (e) => (e.seriesId && seriesIds.includes(e.seriesId)) || loose.includes(e.id),
  )
}

// Upcoming means it still has a day label the feed recognises; past plans
// carry a dateLabel instead.
const UPCOMING_ORDER: Record<string, number> = { Tonight: 0, Tomorrow: 1, Sat: 2, Sun: 3, 'Next Wed': 4 }

export function upcomingCommunityEvents(communityId: string): TcEvent[] {
  return communityEvents(communityId)
    .filter((e) => e.dayLabel in UPCOMING_ORDER)
    .sort((a, b) => UPCOMING_ORDER[a.dayLabel] - UPCOMING_ORDER[b.dayLabel])
}

export function postsFor(communityId: string): CommunityPost[] {
  const mine = posts.filter((p) => p.communityId === communityId)
  // Pinned first, then newest.
  return mine.sort((a, b) => Number(Boolean(b.pinned)) - Number(Boolean(a.pinned)) || a.sortKey - b.sortKey)
}

export function photosFor(communityId: string): CommunityPhoto[] {
  return photos.filter((p) => p.communityId === communityId)
}

export function latestPost(communityId: string): CommunityPost | undefined {
  return posts
    .filter((p) => p.communityId === communityId)
    .sort((a, b) => a.sortKey - b.sortKey)[0]
}

export function photoById(id: string): CommunityPhoto | undefined {
  return photos.find((p) => p.id === id)
}

export function canPost(role: CommunityRole | undefined): boolean {
  return role === 'owner' || role === 'admin'
}
