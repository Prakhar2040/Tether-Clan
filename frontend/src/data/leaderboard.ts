import { membersOf, roster } from './roster'
import type { Person } from '../types'

// The leaderboard is a competition table, not an attendance register. Each
// community runs one competition a month; the standing is what those results
// add up to over the season.

export const YOU: Person = { id: 'you', name: 'You', initials: 'YO', color: 'orange' }

export interface Competition {
  id: string
  communityId: string
  name: string
  monthLabel: string
  monthsAgo: number
  date: string // ISO — the day it was actually run
  dateLabel: string // "Sat 12 Sep 2026"
  entrants: number
  results: [string, number][] // [personId, place]
}

// What a placing is worth. A podium should matter more than the gap between
// seventh and eighth, and turning up at all should be worth something.
export const POINTS: Record<number, number> = { 1: 10, 2: 7, 3: 5, 4: 3, 5: 2 }
export const POINTS_FOR_ENTERING = 1

export function pointsFor(place: number): number {
  return POINTS[place] ?? POINTS_FOR_ENTERING
}

export const competitions: Competition[] = [
  { id: 'dice-c0', communityId: 'dice-district-regulars', name: 'Catan Cup', monthLabel: 'Sep 2026', monthsAgo: 0, date: '2026-09-12', dateLabel: 'Sat 12 Sep 2026', entrants: 14, results: [['aditya-saxena', 1], ['manav-khanna', 2], ['rishi-shetty', 3], ['you', 4], ['rohan-kapoor', 5], ['siddharth-desai', 6], ['yash-subramanian', 7], ['kunal-mehta', 8]] },
  { id: 'dice-c1', communityId: 'dice-district-regulars', name: 'Wingspan Open', monthLabel: 'Aug 2026', monthsAgo: 1, date: '2026-08-08', dateLabel: 'Sat 8 Aug 2026', entrants: 17, results: [['yash-subramanian', 1], ['kunal-mehta', 2], ['mohit-mishra', 3], ['nikhil-anand', 4], ['sameer-jain', 5], ['you', 6], ['gaurav-sethi', 7], ['shaurya-bhat', 8]] },
  { id: 'dice-c2', communityId: 'dice-district-regulars', name: 'Brass Invitational', monthLabel: 'Jul 2026', monthsAgo: 2, date: '2026-07-11', dateLabel: 'Sat 11 Jul 2026', entrants: 20, results: [['gaurav-sethi', 1], ['shaurya-bhat', 2], ['hemant-verma', 3], ['varun-chawla', 4], ['sachin-kulkarni', 5], ['raghav-krishnan', 6], ['deepak-lamba', 7], ['aryan-menon', 8]] },
  { id: 'dice-c3', communityId: 'dice-district-regulars', name: 'Azul Masters', monthLabel: 'Jun 2026', monthsAgo: 3, date: '2026-06-13', dateLabel: 'Sat 13 Jun 2026', entrants: 23, results: [['deepak-lamba', 1], ['omkar-tiwari', 2], ['naveen-wadhwa', 3], ['nitin-grewal', 4], ['zaid-das', 5], ['mahesh-malhotra', 6], ['umesh-joshi', 7], ['jatin-dutta', 8], ['you', 9]] },
  { id: 'dice-c4', communityId: 'dice-district-regulars', name: 'Carcassonne Classic', monthLabel: 'May 2026', monthsAgo: 4, date: '2026-05-09', dateLabel: 'Sat 9 May 2026', entrants: 15, results: [['umesh-joshi', 1], ['ananya-verma', 2], ['ujjwal-deshpande', 3], ['kiran-gupta', 4], ['you', 5], ['chirag-khurana', 6], ['sanjay-rao', 7], ['girish-vohra', 8]] },
  { id: 'dice-c5', communityId: 'dice-district-regulars', name: '7 Wonders Night', monthLabel: 'Apr 2026', monthsAgo: 5, date: '2026-04-11', dateLabel: 'Sat 11 Apr 2026', entrants: 18, results: [['sneha-tiwari', 1], ['shreya-bajaj', 2], ['prakash-dhawan', 3], ['anand-sen', 4], ['aditi-malhotra', 5], ['ishita-joshi', 6], ['nandan-chatterjee', 7], ['vinay-patil', 8]] },
  { id: 'dice-c6', communityId: 'dice-district-regulars', name: 'Splendor Shootout', monthLabel: 'Mar 2026', monthsAgo: 6, date: '2026-03-14', dateLabel: 'Sat 14 Mar 2026', entrants: 21, results: [['trisha-sharma', 1], ['vinay-patil', 2], ['you', 3], ['kavya-chandra', 4], ['neha-khurana', 5], ['tarun-reddy', 6], ['devan-thakur', 7], ['tara-dhawan', 8]] },
  { id: 'dice-c7', communityId: 'dice-district-regulars', name: 'Terraforming Trophy', monthLabel: 'Feb 2026', monthsAgo: 7, date: '2026-02-14', dateLabel: 'Sat 14 Feb 2026', entrants: 24, results: [['kritika-khanna', 1], ['tara-dhawan', 2], ['anjali-sen', 3], ['aarushi-kapoor', 4], ['indira-desai', 5], ['divya-chatterjee', 6], ['you', 7], ['vaishnavi-pillai', 8]] },
  { id: 'dice-c8', communityId: 'dice-district-regulars', name: 'Scythe Slam', monthLabel: 'Jan 2026', monthsAgo: 8, date: '2026-01-10', dateLabel: 'Sat 10 Jan 2026', entrants: 16, results: [['vihaan-pillai', 1], ['nikhil-anand', 2], ['sameer-jain', 3], ['tejas-roy', 4], ['gaurav-sethi', 5], ['ishaan-chopra', 6], ['farhan-mukherjee', 7], ['varun-chawla', 8]] },
  { id: 'dice-c9', communityId: 'dice-district-regulars', name: 'Ticket to Ride Sprint', monthLabel: 'Dec 2025', monthsAgo: 9, date: '2025-12-13', dateLabel: 'Sat 13 Dec 2025', entrants: 19, results: [['farhan-mukherjee', 1], ['varun-chawla', 2], ['sachin-kulkarni', 3], ['raghav-krishnan', 4], ['vikram-naik', 5], ['you', 6], ['naveen-wadhwa', 7], ['nitin-grewal', 8]] },
  { id: 'cubb-c0', communityId: 'cubbon-runners', name: '5K Time Trial', monthLabel: 'Sep 2026', monthsAgo: 0, date: '2026-09-12', dateLabel: 'Sat 12 Sep 2026', entrants: 14, results: [['ishaan-chopra', 1], ['farhan-mukherjee', 2], ['varun-chawla', 3], ['you', 4], ['kabir-banerjee', 5], ['vikram-naik', 6], ['aryan-menon', 7], ['naveen-wadhwa', 8]] },
  { id: 'cubb-c1', communityId: 'cubbon-runners', name: 'Hill Challenge', monthLabel: 'Aug 2026', monthsAgo: 1, date: '2026-08-08', dateLabel: 'Sat 8 Aug 2026', entrants: 17, results: [['aryan-menon', 1], ['naveen-wadhwa', 2], ['nitin-grewal', 3], ['rahul-nair', 4], ['dhruv-sahni', 5], ['you', 6], ['jatin-dutta', 7], ['ujjwal-deshpande', 8]] },
  { id: 'cubb-c2', communityId: 'cubbon-runners', name: '10K Time Trial', monthLabel: 'Jul 2026', monthsAgo: 2, date: '2026-07-11', dateLabel: 'Sat 11 Jul 2026', entrants: 20, results: [['jatin-dutta', 1], ['ujjwal-deshpande', 2], ['kiran-gupta', 3], ['anirudh-ghosh', 4], ['abhishek-kamath', 5], ['sanjay-rao', 6], ['girish-vohra', 7], ['rishi-shetty', 8]] },
  { id: 'cubb-c3', communityId: 'cubbon-runners', name: 'Sunrise Sprint', monthLabel: 'Jun 2026', monthsAgo: 3, date: '2026-06-13', dateLabel: 'Sat 13 Jun 2026', entrants: 23, results: [['girish-vohra', 1], ['prakash-dhawan', 2], ['pranav-iyer', 3], ['parth-raina', 4], ['ashwin-ahuja', 5], ['nandan-chatterjee', 6], ['vinay-patil', 7], ['mohit-mishra', 8], ['you', 9]] },
  { id: 'cubb-c4', communityId: 'cubbon-runners', name: 'Park Loop Race', monthLabel: 'May 2026', monthsAgo: 4, date: '2026-05-09', dateLabel: 'Sat 9 May 2026', entrants: 15, results: [['vinay-patil', 1], ['priya-gupta', 2], ['vivek-bose', 3], ['lokesh-prabhu', 4], ['you', 5], ['devan-thakur', 6], ['shaurya-bhat', 7], ['hemant-verma', 8]] },
  { id: 'cubb-c5', communityId: 'cubbon-runners', name: 'Bandstand Mile', monthLabel: 'Apr 2026', monthsAgo: 5, date: '2026-04-11', dateLabel: 'Sat 11 Apr 2026', entrants: 18, results: [['tara-dhawan', 1], ['anjali-sen', 2], ['rakesh-puri', 3], ['bharat-trivedi', 4], ['divya-chatterjee', 5], ['riya-patil', 6], ['omkar-tiwari', 7], ['yogesh-bajaj', 8]] },
  { id: 'cubb-c6', communityId: 'cubbon-runners', name: 'Half Marathon Trial', monthLabel: 'Mar 2026', monthsAgo: 6, date: '2026-03-14', dateLabel: 'Sat 14 Mar 2026', entrants: 21, results: [['vaishnavi-pillai', 1], ['yogesh-bajaj', 2], ['you', 3], ['nisha-reddy', 4], ['swati-thakur', 5], ['umesh-joshi', 6], ['ananya-verma', 7], ['lakshmi-puri', 8]] },
  { id: 'cubb-c7', communityId: 'cubbon-runners', name: 'Relay Morning', monthLabel: 'Feb 2026', monthsAgo: 7, date: '2026-02-14', dateLabel: 'Sat 14 Feb 2026', entrants: 24, results: [['madhuri-mukherjee', 1], ['lakshmi-puri', 2], ['pooja-trivedi', 3], ['bhavya-banerjee', 4], ['janhvi-naik', 5], ['sneha-tiwari', 6], ['you', 7], ['yamini-hegde', 8]] },
  { id: 'cubb-c8', communityId: 'cubbon-runners', name: 'Kasturba Dash', monthLabel: 'Jan 2026', monthsAgo: 8, date: '2026-01-10', dateLabel: 'Sat 10 Jan 2026', entrants: 16, results: [['shreya-bajaj', 1], ['yamini-hegde', 2], ['harini-nair', 3], ['pallavi-sahni', 4], ['aishwarya-bhatia', 5], ['trisha-sharma', 6], ['esha-oberoi', 7], ['namrata-pandey', 8]] },
  { id: 'cubb-c9', communityId: 'cubbon-runners', name: 'Cubbon Classic', monthLabel: 'Dec 2025', monthsAgo: 9, date: '2025-12-13', dateLabel: 'Sat 13 Dec 2025', entrants: 19, results: [['esha-oberoi', 1], ['namrata-pandey', 2], ['vidya-ghosh', 3], ['gauri-kamath', 4], ['chitra-saxena', 5], ['you', 6], ['tanvi-shetty', 7], ['dhanya-iyer', 8]] },
  { id: 'sket-c0', communityId: 'sketchbook-bengaluru', name: 'Sketch-Off', monthLabel: 'Sep 2026', monthsAgo: 0, date: '2026-09-12', dateLabel: 'Sat 12 Sep 2026', entrants: 14, results: [['aditya-saxena', 1], ['manav-khanna', 2], ['rishi-shetty', 3], ['you', 4], ['rohan-kapoor', 5], ['siddharth-desai', 6], ['yash-subramanian', 7], ['kunal-mehta', 8]] },
  { id: 'sket-c1', communityId: 'sketchbook-bengaluru', name: 'Thirty Minute Challenge', monthLabel: 'Aug 2026', monthsAgo: 1, date: '2026-08-08', dateLabel: 'Sat 8 Aug 2026', entrants: 17, results: [['yash-subramanian', 1], ['kunal-mehta', 2], ['mohit-mishra', 3], ['nikhil-anand', 4], ['sameer-jain', 5], ['you', 6], ['gaurav-sethi', 7], ['shaurya-bhat', 8]] },
  { id: 'sket-c2', communityId: 'sketchbook-bengaluru', name: 'Ink Only', monthLabel: 'Jul 2026', monthsAgo: 2, date: '2026-07-11', dateLabel: 'Sat 11 Jul 2026', entrants: 20, results: [['gaurav-sethi', 1], ['shaurya-bhat', 2], ['hemant-verma', 3], ['varun-chawla', 4], ['sachin-kulkarni', 5], ['raghav-krishnan', 6], ['deepak-lamba', 7], ['aryan-menon', 8]] },
  { id: 'sket-c3', communityId: 'sketchbook-bengaluru', name: 'Portrait Hour', monthLabel: 'Jun 2026', monthsAgo: 3, date: '2026-06-13', dateLabel: 'Sat 13 Jun 2026', entrants: 23, results: [['deepak-lamba', 1], ['omkar-tiwari', 2], ['naveen-wadhwa', 3], ['nitin-grewal', 4], ['zaid-das', 5], ['mahesh-malhotra', 6], ['umesh-joshi', 7], ['jatin-dutta', 8], ['you', 9]] },
  { id: 'sket-c4', communityId: 'sketchbook-bengaluru', name: 'Urban Sketch Prize', monthLabel: 'May 2026', monthsAgo: 4, date: '2026-05-09', dateLabel: 'Sat 9 May 2026', entrants: 15, results: [['umesh-joshi', 1], ['ananya-verma', 2], ['ujjwal-deshpande', 3], ['kiran-gupta', 4], ['you', 5], ['chirag-khurana', 6], ['sanjay-rao', 7], ['girish-vohra', 8]] },
  { id: 'sket-c5', communityId: 'sketchbook-bengaluru', name: 'Bench Spread Pick', monthLabel: 'Apr 2026', monthsAgo: 5, date: '2026-04-11', dateLabel: 'Sat 11 Apr 2026', entrants: 18, results: [['sneha-tiwari', 1], ['shreya-bajaj', 2], ['prakash-dhawan', 3], ['anand-sen', 4], ['aditi-malhotra', 5], ['ishita-joshi', 6], ['nandan-chatterjee', 7], ['vinay-patil', 8]] },
  { id: 'sarj-c0', communityId: 'sarjapur-riders', name: 'Hill Climb', monthLabel: 'Sep 2026', monthsAgo: 0, date: '2026-09-12', dateLabel: 'Sat 12 Sep 2026', entrants: 14, results: [['ishaan-chopra', 1], ['farhan-mukherjee', 2], ['varun-chawla', 3], ['you', 4], ['kabir-banerjee', 5], ['vikram-naik', 6], ['aryan-menon', 7], ['naveen-wadhwa', 8]] },
  { id: 'sarj-c1', communityId: 'sarjapur-riders', name: 'Sprint Finish', monthLabel: 'Aug 2026', monthsAgo: 1, date: '2026-08-08', dateLabel: 'Sat 8 Aug 2026', entrants: 17, results: [['aryan-menon', 1], ['naveen-wadhwa', 2], ['nitin-grewal', 3], ['rahul-nair', 4], ['dhruv-sahni', 5], ['you', 6], ['jatin-dutta', 7], ['ujjwal-deshpande', 8]] },
  { id: 'sarj-c2', communityId: 'sarjapur-riders', name: 'Endurance Loop', monthLabel: 'Jul 2026', monthsAgo: 2, date: '2026-07-11', dateLabel: 'Sat 11 Jul 2026', entrants: 20, results: [['jatin-dutta', 1], ['ujjwal-deshpande', 2], ['kiran-gupta', 3], ['anirudh-ghosh', 4], ['abhishek-kamath', 5], ['sanjay-rao', 6], ['girish-vohra', 7], ['rishi-shetty', 8]] },
  { id: 'sarj-c3', communityId: 'sarjapur-riders', name: 'Gravel Grind', monthLabel: 'Jun 2026', monthsAgo: 3, date: '2026-06-13', dateLabel: 'Sat 13 Jun 2026', entrants: 23, results: [['girish-vohra', 1], ['prakash-dhawan', 2], ['pranav-iyer', 3], ['parth-raina', 4], ['ashwin-ahuja', 5], ['nandan-chatterjee', 6], ['vinay-patil', 7], ['mohit-mishra', 8], ['you', 9]] },
  { id: 'sarj-c4', communityId: 'sarjapur-riders', name: 'Time Trial', monthLabel: 'May 2026', monthsAgo: 4, date: '2026-05-09', dateLabel: 'Sat 9 May 2026', entrants: 15, results: [['vinay-patil', 1], ['priya-gupta', 2], ['vivek-bose', 3], ['lokesh-prabhu', 4], ['you', 5], ['devan-thakur', 6], ['shaurya-bhat', 7], ['hemant-verma', 8]] },
  { id: 'sarj-c5', communityId: 'sarjapur-riders', name: 'Sunday Sprint', monthLabel: 'Apr 2026', monthsAgo: 5, date: '2026-04-11', dateLabel: 'Sat 11 Apr 2026', entrants: 18, results: [['tara-dhawan', 1], ['anjali-sen', 2], ['rakesh-puri', 3], ['bharat-trivedi', 4], ['divya-chatterjee', 5], ['riya-patil', 6], ['omkar-tiwari', 7], ['yogesh-bajaj', 8]] },
]

// Most recent first, by the day it was run.
export function competitionsOf(communityId: string): Competition[] {
  return competitions
    .filter((c) => c.communityId === communityId)
    .sort((a, b) => b.date.localeCompare(a.date))
}

export interface Standing {
  rank: number
  person: Person
  points: number
  wins: number
  podiums: number
  entered: number
  best: number
  place: number // where they finished, when the table is one month
  isYou: boolean
}

// A table for one month, or for everything so far. A season total hides who
// actually won last week, so the month is the default and all-time is the
// wider view behind it.
export type Scope = 'all' | string // 'all', or a competition id

export function standings(communityId: string, scope: Scope = 'all'): Standing[] {
  const tally = new Map<
    string,
    { points: number; wins: number; podiums: number; entered: number; best: number; place: number }
  >()

  const pool = competitionsOf(communityId).filter((c) => scope === 'all' || c.id === scope)

  for (const comp of pool) {
    for (const [personId, place] of comp.results) {
      const t = tally.get(personId) ?? {
        points: 0,
        wins: 0,
        podiums: 0,
        entered: 0,
        best: 99,
        place: 99,
      }
      t.points += pointsFor(place)
      t.entered += 1
      if (place === 1) t.wins += 1
      if (place <= 3) t.podiums += 1
      t.best = Math.min(t.best, place)
      t.place = Math.min(t.place, place)
      tally.set(personId, t)
    }
  }

  const known = new Set(membersOf(communityId).map((m) => m.personId))

  return [...tally.entries()]
    .filter(([id]) => id === 'you' || known.has(id) || roster[id])
    .map(([id, t]) => ({ ...t, person: id === 'you' ? YOU : roster[id], isYou: id === 'you' }))
    // Within a month the finishing order is the truth; across a season it is
    // points.
    .sort((a, b) =>
      scope === 'all'
        ? b.points - a.points || b.wins - a.wins || a.person.name.localeCompare(b.person.name)
        : a.place - b.place,
    )
    .map((r, i) => ({ ...r, rank: scope === 'all' ? i + 1 : r.place }))
}

export function latestCompetition(communityId: string): Competition | undefined {
  return competitionsOf(communityId)[0]
}
