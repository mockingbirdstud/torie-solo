import { createBoard } from './board'
import type { GameState, Player, Snapshot } from './types'
export const ALPHABET='ABCDEFGHIJKLMNOPQRSTUVWXYZ'.split('')
export const VOWELS=['A','E','I','O','U']
const VOWEL_SET=new Set(VOWELS)
export const CONSONANTS=ALPHABET.filter(letter=>!VOWEL_SET.has(letter))
export const CYCLE_CLEAR_BONUS=10
export const createPlayer=():Player=>({id:0,name:'Player',score:0,cycle:1,vowelCycle:1,available:[...ALPHABET]})
export const createGame=():GameState=>({board:createBoard(),players:[createPlayer()],active:0,turn:1,moves:[],passes:[],noMove:[],status:'playing',undo:[]})
export const snapshot=(s:GameState):Snapshot=>structuredClone({board:s.board,players:s.players,active:s.active,turn:s.turn,moves:s.moves,passes:s.passes,noMove:s.noMove,status:s.status})
export interface LetterUseResult {player:Player;vowelsReset:boolean;alphabetReset:boolean;bonus:number}
export function useLetters(player:Player,letters:string[]):LetterUseResult {
  const used=new Set(letters)
  const remainingVowels=player.available.filter(letter=>VOWEL_SET.has(letter))
  const remainingConsonants=player.available.filter(letter=>!VOWEL_SET.has(letter))
  const vowelsReset=remainingVowels.length>0&&remainingVowels.every(letter=>used.has(letter))
  const alphabetReset=remainingConsonants.length>0&&remainingConsonants.every(letter=>used.has(letter))
  const bonus=vowelsReset&&alphabetReset?CYCLE_CLEAR_BONUS:0
  let available=player.available.filter(letter=>!used.has(letter))
  let cycle=player.cycle
  let vowelCycle=player.vowelCycle
  if(alphabetReset){available=[...ALPHABET];cycle++;vowelCycle++}
  else if(vowelsReset){available=[...new Set([...available,...VOWELS])];vowelCycle++}
  return {player:{...player,available,cycle,vowelCycle},vowelsReset,alphabetReset,bonus}
}
export const consume=(player:Player,letters:string[])=>useLetters(player,letters).player
