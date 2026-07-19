export type PlayerId = 0 | 1
export type Direction = 'H' | 'V'
export interface BoardCell { letter: string; owner: PlayerId; moveId: number }
export type Board = (BoardCell | null)[][]
export interface Player { id: PlayerId; name: string; score: number; cycle: number; vowelCycle: number; available: string[] }
export interface PlacedLetter { row: number; col: number; letter: string; owner: PlayerId; isNew: boolean }
export interface FormedWord { word: string; cells: {row:number;col:number}[]; valid: boolean }
export interface ValidationResult { valid: boolean; errors: string[]; placements: PlacedLetter[]; words: FormedWord[]; score: number }
export interface Move { id:number; player:PlayerId; row:number; col:number; direction:Direction; text:string; placements:PlacedLetter[]; words:FormedWord[]; score:number; baseScore:number; bonus:number }
export interface Pass { player:PlayerId; turn:number; forced:boolean; time:string }
export interface Snapshot { board:Board; players:Player[]; active:PlayerId; turn:number; moves:Move[]; passes:Pass[]; noMove:PlayerId[]; status:'playing'|'over' }
export interface GameState extends Snapshot { undo: Snapshot[] }
