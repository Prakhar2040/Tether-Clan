/* Things that are not rows.
 *
 * The world's clock is frozen at Wed 9 Sep 2026 17:50 IST so the mock reads
 * sensibly; when the seed starts working off the real clock this becomes
 * `new Date()` and nothing else changes. The rest is viewer context — who is
 * asking and from where — which belongs to a request, not to the database,
 * and will come from a session once there is one.
 */
/* The world runs on the real clock.
 *
 * It was pinned to Wed 9 Sep 2026 17:50 so the mock read sensibly, which was
 * fine while nothing wrote. The moment bots start posting orders, a frozen
 * world would have tickets timestamped 2026 sitting beside rows timestamped
 * today. The seeder rebases the mock's relative shape onto whenever it runs,
 * so tonight is genuinely tonight.
 *
 * NOW_FROZEN stays only as the origin the mock's own times are measured
 * against — it is an input to seeding, not the app's idea of the time. */
export const NOW_FROZEN = new Date('2026-09-09T17:50:00+05:30')

export const now = (): Date => new Date()

export const DEFAULT_LOCATION = { lat: 12.9719, lng: 77.6412 }

/** People the viewer follows. A stand-in until there is a signed-in user. */
export const yourCircle = new Set(['ananya', 'rohan', 'priya', 'vikram', 'rahul'])
