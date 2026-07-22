import type { Board } from './types'
export const LEVEL_SIZES=[2,3,4,5,6,7,8,9,10] as const
export const MAX_LEVEL=LEVEL_SIZES.length
export const boardSizeForLevel=(level:number)=>LEVEL_SIZES[Math.max(0,Math.min(MAX_LEVEL-1,level-1))]
export const createBoard = (size=10): Board => Array.from({length:size},()=>Array(size).fill(null))
export const hasTiles = (board:Board) => board.some(row=>row.some(Boolean))
export const isBoardFull = (board:Board) => board.every(row=>row.every(Boolean))
