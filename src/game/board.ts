import type { Board } from './types'
export const BOARD_SIZE = 10
export const CENTERS = new Set<string>()
export const createBoard = (): Board => Array.from({length:BOARD_SIZE},()=>Array(BOARD_SIZE).fill(null))
export const hasTiles = (board:Board) => board.some(row=>row.some(Boolean))
