import type { Board, Direction, Player } from './types'
import type { Dictionary } from './dictionary'
import { validateMove } from './validation'
import { hasTiles } from './board'
export interface LegalMove {row:number;col:number;direction:Direction;text:string}

function canPlace(board:Board,player:Player,row:number,col:number,direction:Direction,text:string){
  const [dr,dc]=direction==='H'?[0,1]:[1,0]
  const used=new Set<string>()
  for(let i=0;i<text.length;i++){
    const cell=board[row+dr*i][col+dc*i],letter=text[i]
    if(cell){if(cell.letter!==letter)return false}
    else {
      if(used.has(letter)||!player.available.includes(letter))return false
      used.add(letter)
    }
  }
  return used.size>0
}

export function findLegalMove(board:Board,player:Player,dict:Dictionary):LegalMove|null{
  if(player.available.length===0)return null
  const boardSize=board.length
  const occupied=hasTiles(board)
  for(let length=2;length<=boardSize;length++)for(const direction of ['H','V'] as Direction[]){
    const [dr,dc]=direction==='H'?[0,1]:[1,0]
    const rowLimit=direction==='H'?boardSize:boardSize-length+1
    const colLimit=direction==='H'?boardSize-length+1:boardSize
    for(let row=0;row<rowLimit;row++)for(let col=0;col<colLimit;col++){
      // Search complete main-word spans only; adjacent inline tiles belong in the word.
      if(board[row-dr]?.[col-dc]||board[row+dr*length]?.[col+dc*length])continue
      let hasNew=false,connected=!occupied
      for(let i=0;i<length;i++){
        const r=row+dr*i,c=col+dc*i
        if(board[r][c])connected=true
        else {
          hasNew=true
          if([[1,0],[-1,0],[0,1],[0,-1]].some(([a,b])=>Boolean(board[r+a]?.[c+b])))connected=true
        }
      }
      if(!hasNew||!connected)continue
      for(const text of dict.wordsByLength[length]??[]){
        if(!canPlace(board,player,row,col,direction,text))continue
        const input={row,col,direction,text}
        if(validateMove(board,player,input,dict).valid)return input
      }
    }
  } return null
}
