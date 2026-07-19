import type { Board, Direction, Player } from './types'
import type { Dictionary } from './dictionary'
import { validateMove } from './validation'
import { BOARD_SIZE, hasTiles } from './board'
export interface LegalMove {row:number;col:number;direction:Direction;text:string}
export function findLegalMove(board:Board,player:Player,dict:Dictionary):LegalMove|null{
  const anchors:{row:number;col:number}[]=[]
  if(!hasTiles(board)) anchors.push({row:0,col:0})
  else for(let r=0;r<BOARD_SIZE;r++)for(let c=0;c<BOARD_SIZE;c++)if(board[r][c])anchors.push({row:r,col:c})
  for(const text of dict.words.filter(w=>w.length>=2&&w.length<=12)) for(const direction of ['H','V'] as Direction[]){
    for(const anchor of anchors) for(let offset=0;offset<text.length;offset++){
      const row=anchor.row-(direction==='V'?offset:0),col=anchor.col-(direction==='H'?offset:0)
      const input={row,col,direction,text}; if(validateMove(board,player,input,dict).valid)return input
    }
  } return null
}
