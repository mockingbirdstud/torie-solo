import {describe,expect,it} from 'vitest'
import {boardSizeForLevel,createBoard} from './board'
import {createDictionary} from './dictionary'
import {findLegalMove} from './legalMoveSearch'
import {advanceLevel,ALPHABET,consume,createGame,snapshot,useLetters,VOWELS} from './state'
import {validateMove} from './validation'
import type {Board,Player} from './types'
const dict=createDictionary(true)
const strictDict=createDictionary()
const player=(available=ALPHABET):Player=>({id:0,name:'Player 1',score:0,cycle:1,vowelCycle:1,available:[...available]})
const put=(board:Board,word:string,row:number,col:number,vertical=false)=>word.split('').forEach((letter,i)=>board[row+(vertical?i:0)][col+(vertical?0:i)]={letter,owner:0,moveId:1})
describe('rule engine',()=>{
 it('recognizes common spelled-out numbers in the strict dictionary',()=>{
  for(const word of ['TWO','THREE','FOUR','FIVE','SIX','SEVEN','EIGHT','NINE','TEN','TWELVE','HUNDRED','THOUSAND']){
   expect(strictDict.isValid(word)).toBe(true)
  }
 })
 it('uses the complete strict dictionary when searching for legal moves',()=>{
  expect(strictDict.words.length).toBeGreaterThan(120000)
  expect(strictDict.words).toContain('FIVE')
  expect(strictDict.words).toContain('AALII')
  expect(strictDict.words.every(word=>strictDict.isValid(word))).toBe(true)
 })
 it('accepts a first move anywhere on the board',()=>expect(validateMove(createBoard(),player(),{row:0,col:0,direction:'H',text:'CAT'},dict).valid).toBe(true))
 it('uses an 8 by 8 maximum board',()=>{const b=createBoard();expect(b).toHaveLength(8);expect(b[0]).toHaveLength(8)})
 it('accepts a valid connected move',()=>{const b=createBoard();put(b,'CAT',4,4);expect(validateMove(b,player(),{row:3,col:5,direction:'V',text:'BAR'},dict).valid).toBe(true)})
 it('rejects a disconnected move',()=>{const b=createBoard();put(b,'CAT',4,4);expect(validateMove(b,player(),{row:1,col:1,direction:'H',text:'DOG'},dict).errors.join()).toMatch(/connect/)})
 it('rejects overwriting a different letter',()=>{const b=createBoard();put(b,'CAT',4,4);expect(validateMove(b,player(),{row:4,col:4,direction:'H',text:'DOG'},dict).errors.join()).toMatch(/overwrite/)})
 it('extends an existing word and scores only new letters',()=>{const b=createBoard();put(b,'CAT',4,2);const r=validateMove(b,player(),{row:4,col:2,direction:'H',text:'CATER'},dict);expect(r.valid).toBe(true);expect(r.words.map(x=>x.word)).toContain('CATER');expect(r.score).toBe(2)})
 it('recognizes a perpendicular word',()=>{const b=createBoard();put(b,'CAT',4,4);const r=validateMove(b,player(),{row:3,col:5,direction:'V',text:'BAR'},dict);expect(r.words.map(x=>x.word)).toContain('BAR')})
 it('rejects using the same new letter twice',()=>expect(validateMove(createBoard(),player(),{row:4,col:4,direction:'H',text:'TOOT'},dict).errors.join()).toMatch(/one new O|one new T/))
 it('rejects an unavailable letter',()=>expect(validateMove(createBoard(),player(ALPHABET.filter(x=>x!=='C')),{row:4,col:4,direction:'H',text:'CAT'},dict).errors.join()).toMatch(/not available/))
 it('scores only newly placed letters',()=>{const b=createBoard();put(b,'A',4,5);expect(validateMove(b,player(),{row:4,col:4,direction:'H',text:'CAT'},dict).score).toBe(2)})
 it('refreshes the alphabet after all 26 are used',()=>{const p=consume(player(['Z']),['Z']);expect(p.available).toEqual(ALPHABET);expect(p.cycle).toBe(2)})
 it('refreshes vowels independently after all remaining vowels are used',()=>{const result=useLetters(player(),VOWELS);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(false);expect(VOWELS.every(v=>result.player.available.includes(v))).toBe(true);expect(result.player.vowelCycle).toBe(2)})
 it('awards a 10 point bonus when vowels and consonants clear together',()=>{const result=useLetters(player(['A','Z']),['A','Z']);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(true);expect(result.bonus).toBe(10);expect(result.player.available).toEqual(ALPHABET)})
 it('does not award the bonus for a vowel-only reset',()=>{const result=useLetters(player(['A','B','C']),['A']);expect(result.vowelsReset).toBe(true);expect(result.alphabetReset).toBe(false);expect(result.bonus).toBe(0)})
 it('allows a pass state when no move exists',()=>expect(findLegalMove(createBoard(),player([]),dict)).toBeNull())
 it('finds a legal connected move after the board changes',()=>{const b=createBoard();put(b,'A',4,4);const tiny={words:['AZ'],wordsByLength:[,,['AZ']],isValid:(w:string)=>w==='AZ'};expect(findLegalMove(b,player(['Z']),tiny)).not.toBeNull()})
 it('finds a legal move that connects beside an existing word without overlapping it',()=>{const b=createBoard();put(b,'A',4,4);const tiny={words:['BE'],wordsByLength:[,,['BE']],isValid:(w:string)=>w==='BE'||w==='AB'};expect(findLegalMove(b,player(['B','E']),tiny)).not.toBeNull()})
 it('creates a game with one player',()=>expect(createGame().players).toHaveLength(1))
 it('starts the locked progression on a 2 by 2 board',()=>{const g=createGame();expect(g.level).toBe(1);expect(g.board).toHaveLength(2);expect(g.board[0]).toHaveLength(2)})
 it('maps the seven Journey levels from 2 by 2 through 8 by 8',()=>expect(Array.from({length:7},(_,i)=>boardSizeForLevel(i+1))).toEqual([2,3,4,5,6,7,8]))
 it('carries the letter inventory and reset cycles into the next level',()=>{const g=createGame();g.players[0]={...consume(g.players[0],['B','C']),score:4};const next=advanceLevel(g);expect(next.level).toBe(2);expect(next.board).toHaveLength(3);expect(next.players[0].available).not.toContain('B');expect(next.players[0].available).not.toContain('C');expect(next.players[0].score).toBe(4);expect(next.players[0].cycle).toBe(1)})
 it('has a strict-dictionary legal solution for the first 2 by 2 level',()=>{const b=createBoard(2),p=player();const first=validateMove(b,p,{row:0,col:0,direction:'H',text:'AD'},strictDict);expect(first.valid).toBe(true);for(const x of first.placements.filter(x=>x.isNew))b[x.row][x.col]={letter:x.letter,owner:0,moveId:1};const p2=consume(p,first.placements.filter(x=>x.isNew).map(x=>x.letter));const second=validateMove(b,p2,{row:1,col:0,direction:'H',text:'HO'},strictDict);expect(second.valid).toBe(true);expect(second.words.map(x=>x.word).sort()).toEqual(['AH','DO','HO'])})
 it('has a strict-dictionary legal solution for the 3 by 3 level',()=>{const b=createBoard(3);let p=player(),moveId=1;for(const input of [{row:0,col:0,direction:'H' as const,text:'ABS'},{row:0,col:0,direction:'V' as const,text:'ACT'},{row:0,col:2,direction:'V' as const,text:'SPY'},{row:0,col:1,direction:'V' as const,text:'BUR'}]){const result=validateMove(b,p,input,strictDict);expect(result.valid,result.errors.join(', ')).toBe(true);const fresh=result.placements.filter(x=>x.isNew);for(const x of fresh)b[x.row][x.col]={letter:x.letter,owner:0,moveId};p=consume(p,fresh.map(x=>x.letter));moveId++}expect(b.every(row=>row.every(Boolean))).toBe(true)})
 it('undo snapshot restores board, score, letters, cycle, level, and turn',()=>{const g=createGame(),before=snapshot(g);g.board[0][0]={letter:'A',owner:0,moveId:1};g.players[0]=consume({...g.players[0],score:1},['A']);g.turn=2;const restored=structuredClone(before);expect(restored.board[0][0]).toBeNull();expect(restored.players[0].score).toBe(0);expect(restored.players[0].available).toContain('A');expect(restored.players[0].cycle).toBe(1);expect(restored.level).toBe(1);expect(restored.turn).toBe(1)})
})
