import {createDictionary} from './dictionary'
import {findLegalMove} from './legalMoveSearch'
import type {Board,Player} from './types'

interface CheckRequest {id:number;board:Board;player:Player;allowAny:boolean}

self.onmessage=(event:MessageEvent<CheckRequest>)=>{
  const {id,board,player,allowAny}=event.data
  const move=findLegalMove(board,player,createDictionary(allowAny))
  self.postMessage({id,move})
}
