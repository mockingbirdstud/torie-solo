import type { Board } from './types'
export const LEVEL_SIZES=[2,3,4,5,6,7,8] as const
export const MAX_LEVEL=LEVEL_SIZES.length
export const MAX_BOARD_SIZE=LEVEL_SIZES[LEVEL_SIZES.length-1]
export const boardSizeForLevel=(level:number)=>LEVEL_SIZES[Math.max(0,Math.min(MAX_LEVEL-1,level-1))]
export const createBoard = (size:number=MAX_BOARD_SIZE): Board => Array.from({length:size},()=>Array(size).fill(null))
export const hasTiles = (board:Board) => board.some(row=>row.some(Boolean))
export const isBoardFull = (board:Board) => board.every(row=>row.every(Boolean))
