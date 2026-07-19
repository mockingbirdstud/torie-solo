import { BOARD_SIZE, hasTiles } from './board'
import { scoreMove } from './scoring'
import type { Board, Direction, FormedWord, PlacedLetter, Player, ValidationResult } from './types'
import type { Dictionary } from './dictionary'

export const MIN_LETTERS_PER_MOVE = 1
export interface MoveInput { row:number; col:number; direction:Direction; text:string }
export interface TentativeLetter { row:number; col:number; letter:string }

function collectWord(board:Board, placed:Map<string,PlacedLetter>, row:number,col:number,dr:number,dc:number,dict:Dictionary):FormedWord|null {
  let r=row,c=col
  const at=(rr:number,cc:number)=>placed.get(`${rr},${cc}`)?.letter ?? board[rr]?.[cc]?.letter
  while(at(r-dr,c-dc)){r-=dr;c-=dc}
  const cells:{row:number;col:number}[]=[]; let word=''
  while(r>=0&&c>=0&&r<BOARD_SIZE&&c<BOARD_SIZE&&at(r,c)){cells.push({row:r,col:c});word+=at(r,c);r+=dr;c+=dc}
  return word.length>=2?{word,cells,valid:dict.isValid(word)}:null
}

export function validateMove(board:Board, player:Player, input:MoveInput, dict:Dictionary):ValidationResult {
  const errors:string[]=[]; const placements:PlacedLetter[]=[]; const text=input.text.toUpperCase().replace(/\s/g,'')
  if(!/^[A-Z]+$/.test(text)) errors.push('Enter letters A–Z only.')
  const [dr,dc]=input.direction==='H'?[0,1]:[1,0]
  const used=new Set<string>()
  for(let i=0;i<text.length;i++){
    const row=input.row+dr*i,col=input.col+dc*i,letter=text[i]
    if(row<0||col<0||row>=BOARD_SIZE||col>=BOARD_SIZE){errors.push('Move goes outside the board.');break}
    const cell=board[row][col]
    if(cell&&cell.letter!==letter) errors.push(`Cannot overwrite ${cell.letter} at ${row+1}, ${col+1}.`)
    if(!cell){
      if(used.has(letter)) errors.push(`Only one new ${letter} is available this cycle.`)
      if(!player.available.includes(letter)) errors.push(`${letter} is not available this cycle.`)
      used.add(letter); placements.push({row,col,letter,owner:player.id,isNew:true})
    } else placements.push({row,col,letter,owner:cell.owner,isNew:false})
  }
  const fresh=placements.filter(p=>p.isNew)
  if(fresh.length<MIN_LETTERS_PER_MOVE) errors.push(fresh.length?'Not enough new letters.':'Move must place at least one new letter.')
  if(hasTiles(board)) {
    const connected=placements.some(p=>!p.isNew)||fresh.some(p=>[[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>Boolean(board[p.row+a]?.[p.col+b])))
    if(!connected) errors.push('Move must connect to an existing letter.')
  }
  const map=new Map(fresh.map(p=>[`${p.row},${p.col}`,p]))
  const words:FormedWord[]=[]; const seen=new Set<string>()
  for(const p of fresh){
    for(const [a,b] of [[0,1],[1,0]]){const w=collectWord(board,map,p.row,p.col,a,b,dict);if(w){const key=w.cells.map(x=>`${x.row},${x.col}`).join('|');if(!seen.has(key)){seen.add(key);words.push(w)}}}
  }
  if(words.length===0) errors.push('Move must create a word of at least two letters.')
  words.filter(w=>!w.valid).forEach(w=>errors.push(`“${w.word}” is not in the dictionary.`))
  return {valid:errors.length===0,errors:[...new Set(errors)],placements,words,score:scoreMove(placements)}
}

export function validateTentativeMove(board:Board, player:Player, tentative:TentativeLetter[], dict:Dictionary):{input:MoveInput|null;result:ValidationResult} {
  const empty:ValidationResult={valid:false,errors:['Drag at least one tile onto the board.'],placements:[],words:[],score:0}
  if(!tentative.length)return {input:null,result:empty}
  const sameRow=tentative.every(p=>p.row===tentative[0].row)
  const sameCol=tentative.every(p=>p.col===tentative[0].col)
  if(!sameRow&&!sameCol)return {input:null,result:{...empty,errors:['All new tiles must be in one row or one column.']}}
  const direction:Direction=sameRow?'H':'V'
  const positions=tentative.map(p=>direction==='H'?p.col:p.row)
  const start=Math.min(...positions),end=Math.max(...positions)
  const row=direction==='H'?tentative[0].row:start
  const col=direction==='H'?start:tentative[0].col
  let text=''
  for(let position=start;position<=end;position++){
    const r=direction==='H'?row:position,c=direction==='H'?position:col
    const letter=tentative.find(p=>p.row===r&&p.col===c)?.letter??board[r][c]?.letter
    if(!letter)return {input:null,result:{...empty,errors:['Tiles must form a continuous line; gaps need an existing board letter.']}}
    text+=letter
  }
  const input={row,col,direction,text}
  return {input,result:validateMove(board,player,input,dict)}
}
