// Point 3: the area gazetteer. Hand-curated localities with aliases and
// coordinates. Unglamorous and high-ROI: this is what turns "koramangala"
// into a geo filter instead of a text match.

export interface Area {
  id: string
  name: string
  aliases: string[]
  lat: number
  lng: number
  radiusKm: number // how far "in <area>" reasonably stretches
}

export const areas: Area[] = [
  { id: 'indiranagar', name: 'Indiranagar', aliases: ['indira nagar', 'indranagar', '100 feet road'], lat: 12.9719, lng: 77.6412, radiusKm: 2.5 },
  { id: 'koramangala', name: 'Koramangala', aliases: ['kormangala', 'koramangla'], lat: 12.9352, lng: 77.6245, radiusKm: 2.5 },
  { id: 'hsr', name: 'HSR Layout', aliases: ['hsr'], lat: 12.9116, lng: 77.6389, radiusKm: 2.5 },
  { id: 'jayanagar', name: 'Jayanagar', aliases: ['jaynagar'], lat: 12.9308, lng: 77.5838, radiusKm: 2.5 },
  { id: 'church-street', name: 'Church Street', aliases: ['church st', 'mg road', 'mg rd'], lat: 12.9756, lng: 77.6046, radiusKm: 1.5 },
  { id: 'cubbon-park', name: 'Cubbon Park', aliases: ['cubbon'], lat: 12.9763, lng: 77.5929, radiusKm: 1.5 },
  { id: 'whitefield', name: 'Whitefield', aliases: ['whitefeild', 'whitfield'], lat: 12.9698, lng: 77.75, radiusKm: 3.5 },
]

export const areaById = Object.fromEntries(areas.map((a) => [a.id, a]))
