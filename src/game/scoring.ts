import type { PlacedLetter } from './types'
export const scoreMove = (letters:PlacedLetter[]) => letters.filter(x=>x.isNew).length
