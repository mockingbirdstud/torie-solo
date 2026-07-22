import {useEffect,useMemo,useState} from 'react'
import {boardSizeForLevel,createBoard,isBoardFull,MAX_LEVEL} from './game/board'
import {createDictionary} from './game/dictionary'
import {findLegalMove} from './game/legalMoveSearch'
import {advanceLevel,ALPHABET,createGame,snapshot,useLetters,VOWELS} from './game/state'
import type {GameState} from './game/types'
import {validateTentativeMove,type TentativeLetter} from './game/validation'

const clone=<T,>(x:T):T=>structuredClone(x)
type DragTile={letter:string;row?:number;col?:number}
interface HighScore {initials:string;score:number;filled:number;level?:number;date:string}
const HIGH_SCORE_KEY='torie-solo-high-scores'
const loadHighScores=():HighScore[]=>{try{return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)??'[]')}catch{return []}}
const ranksAbove=(a:HighScore,b:HighScore)=>b.score-a.score||b.filled-a.filled

export default function App(){
 const [game,setGame]=useState<GameState>(createGame)
 const [tentative,setTentative]=useState<TentativeLetter[]>([])
 const [dragging,setDragging]=useState<DragTile|null>(null)
 const [dragPoint,setDragPoint]=useState({x:0,y:0})
 const [allowAny,setAllowAny]=useState(false)
 const [devOpen,setDevOpen]=useState(false)
 const [showHow,setShowHow]=useState(false)
 const [importText,setImportText]=useState('')
 const [letterSet,setLetterSet]=useState('ABCDEFGHIJKLMNOPQRSTUVWXYZ')
 const [highScores,setHighScores]=useState<HighScore[]>(loadHighScores)
 const [showScores,setShowScores]=useState(false)
 const [enteringScore,setEnteringScore]=useState(false)
 const [initials,setInitials]=useState('')
 const [confirmAction,setConfirmAction]=useState<'finish'|'new'|null>(null)
 const [levelNotice,setLevelNotice]=useState<number|null>(null)
 const dict=useMemo(()=>createDictionary(allowAny),[allowAny])
 const player=game.players[game.active]
 const lastId=game.moves.at(-1)?.id
 const legal=useMemo(()=>game.status==='playing'?findLegalMove(game.board,player,dict):null,[game.board,player,dict,game.status])
 const check=useMemo(()=>validateTentativeMove(game.board,player,tentative,dict),[game.board,player,tentative,dict])
 const boardSize=game.board.length
 const boardTotal=boardSize*boardSize
 const filledCount=game.board.reduce((total,row)=>total+row.filter(Boolean).length,0)
 const previewBonus=check.result.valid?useLetters(player,check.result.placements.filter(x=>x.isNew).map(x=>x.letter)).bonus:0
 useEffect(()=>{if(game.status==='playing'&&game.moves.length>0&&!legal&&!tentative.length)finishRun(true)},[legal,game.status,game.moves.length,tentative.length])
 useEffect(()=>{if(!levelNotice)return;const timer=window.setTimeout(()=>setLevelNotice(null),1800);return()=>window.clearTimeout(timer)},[levelNotice])

 function startDrag(letter:string,x:number,y:number,row?:number,col?:number){setDragging({letter,row,col});setDragPoint({x,y})}
 function dropOnBoard(row:number,col:number){
  if(!dragging||game.board[row][col])return
  setTentative(old=>{
   const withoutSource=old.filter(p=>p.row!==dragging.row||p.col!==dragging.col)
   if(withoutSource.some(p=>p.row===row&&p.col===col)||withoutSource.some(p=>p.letter===dragging.letter))return old
   return [...withoutSource,{row,col,letter:dragging.letter}]
  })
  setDragging(null)
 }
 function returnToRack(){if(dragging?.row!==undefined)setTentative(old=>old.filter(p=>p.row!==dragging.row||p.col!==dragging.col));setDragging(null)}
 function movePointer(e:React.PointerEvent){if(!dragging)return;e.preventDefault();setDragPoint({x:e.clientX,y:e.clientY})}
 function endPointer(e:React.PointerEvent){
  if(!dragging)return
  const target=document.elementFromPoint(e.clientX,e.clientY) as HTMLElement|null
  const cell=target?.closest<HTMLElement>('[data-cell]')
  if(cell){dropOnBoard(Number(cell.dataset.row),Number(cell.dataset.col));return}
  if(target?.closest(`[data-rack="${game.active}"]`)){returnToRack();return}
  setDragging(null)
 }
 function confirm(){
  if(!check.input||!check.result.valid)return
  const input=check.input,result=check.result
  const completesLevel=filledCount+result.placements.filter(x=>x.isNew).length===boardTotal
  setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));const id=(n.moves.at(-1)?.id??0)+1
   for(const p of result.placements.filter(x=>x.isNew))n.board[p.row][p.col]={letter:p.letter,owner:p.owner,moveId:id}
   const used=result.placements.filter(x=>x.isNew).map(x=>x.letter)
   const cycleResult=useLetters(n.players[game.active],used)
   const totalScore=result.score+cycleResult.bonus
   n.players[game.active]={...cycleResult.player,score:n.players[game.active].score+totalScore}
   n.moves.push({id,player:game.active,...input,placements:result.placements,words:result.words,score:totalScore,baseScore:result.score,bonus:cycleResult.bonus})
   n.turn++;n.noMove=[]
   if(isBoardFull(n.board))return advanceLevel(n)
   return n})
  if(completesLevel&&game.level<MAX_LEVEL)setLevelNotice(game.level+1)
  setTentative([])
 }
 function finishRun(automatic=false){const qualifies=highScores.length<10||ranksAbove({initials:'',score:player.score,filled:filledCount,level:game.level,date:''},highScores.at(-1)!)<0;setGame(old=>{if(old.status==='over')return old;const n=clone(old);n.undo.push(snapshot(old));n.noMove=[0];n.passes.push({player:0,turn:n.turn,forced:automatic,time:new Date().toLocaleTimeString()});n.status='over';return n});setTentative([]);setConfirmAction(null);setInitials('');setEnteringScore(qualifies);setShowScores(true)}
 function newGame(){setGame(createGame());setTentative([]);setShowScores(false);setEnteringScore(false);setInitials('');setConfirmAction(null)}
 function mutate(fn:(n:GameState)=>void){setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));fn(n);return n});setTentative([])}
 function saveHighScore(){if(initials.length!==3)return;const entry={initials,score:player.score,filled:filledCount,level:game.level,date:new Date().toLocaleDateString()};const next=[...highScores,entry].sort(ranksAbove).slice(0,10);setHighScores(next);localStorage.setItem(HIGH_SCORE_KEY,JSON.stringify(next));setEnteringScore(false)}
 function Rack(){
  const p=game.players[0],active=game.status==='playing'
  const placed=new Set(tentative.map(x=>x.letter))
  return <aside data-rack="0" className={`rack player-0 ${active?'active':''}`}>
   <div className="tile-rack">{ALPHABET.map(letter=>{const available=p.available.includes(letter),onBoard=active&&placed.has(letter);return <div className="tile-slot" key={letter}>{available&&!onBoard?<button className="letter-tile stone-0" disabled={!active} onPointerDown={e=>{if(active){e.preventDefault();startDrag(letter,e.clientX,e.clientY)}}}><span>{letter}</span></button>:<span className="empty-tile">{letter}</span>}</div>})}</div>
   <div className="rack-meta"><span>Alphabet {p.cycle} · Vowels {p.vowelCycle}</span><b>{p.available.length} tiles</b></div>
   <div className="pool-status"><span>{VOWELS.filter(v=>p.available.includes(v)).length} vowels</span><span>{p.available.filter(v=>!VOWELS.includes(v)).length} consonants</span></div>
   <div className="rack-status">{game.status==='over'?'Finished':active?'DRAG TILES TO THE BOARD':'WAITING'}</div>
  </aside>
 }

 return <div className={`app ${dragging?'is-dragging':''}`} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={()=>setDragging(null)}>
  <main className="table">
   <Rack/>
   <section className="play-area">
    <div className="board-card">
     <div className="board-toolbar">
      <button className="how-button" onClick={()=>setShowHow(true)}>How to play</button>
      <div className="toolbar-brand"><img src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/></div>
      <button className="how-button" onClick={()=>{setEnteringScore(false);setShowScores(true)}}>High scores</button>
     </div>
     <div className="board-wrap"><div className="board" style={{gridTemplateColumns:`repeat(${boardSize}, minmax(0, 1fr))`,width:`${boardSize*10}%`}}>{Array.from({length:boardSize},(_,r)=><div key={r} style={{display:'contents'}}>{Array.from({length:boardSize},(_,c)=>{const cell=game.board[r][c],pending=tentative.find(x=>x.row===r&&x.col===c);return <div key={`${r},${c}`} data-cell data-row={r} data-col={c} aria-label={`Row ${r+1}, column ${c+1}`} className={`cell ${cell?`filled owner-${cell.owner}`:''} ${cell?.moveId===lastId?'last':''} ${pending?'tentative':''}`}>{pending?<button className={`letter-tile board-tile stone-${game.active}`} onPointerDown={e=>{e.preventDefault();startDrag(pending.letter,e.clientX,e.clientY,r,c)}}><span>{pending.letter}</span></button>:cell?<div className={`letter-tile placed-tile stone-${cell.owner}`}><span>{cell.letter}</span></div>:null}</div>})}</div>)}</div></div>
    </div>
    <section className="progress-strip" aria-label="Game progress">
     <div><span>Points</span><strong>{game.players[0].score}</strong></div>
     <div><span>Level {game.level} · {boardSize}×{boardSize}</span><strong>{filledCount}<small>/{boardTotal}</small></strong></div>
    </section>
    <section className="move-bar">
     <div className="move-state"><span className={check.result.valid?'ready':'waiting'}>{check.result.valid?'MOVE READY':'BUILD YOUR MOVE'}</span><strong>{check.result.valid?`${check.result.words.map(w=>w.word).join(' · ')}  |  +${check.result.score}${previewBonus?` + ${previewBonus} reset bonus`:''}`:check.result.errors[0]}</strong></div>
     <div className="move-actions">
      <button onClick={()=>setConfirmAction('finish')}>Finish run</button>
      <button onClick={()=>filledCount?setConfirmAction('new'):newGame()}>New game</button>
      <button onClick={()=>setTentative([])} disabled={!tentative.length}>Cancel</button>
      <button className="submit" onClick={confirm} disabled={!check.result.valid}>Submit</button>
     </div>
    </section>
   </section>
  </main>
  <section className="dev"><button className="dev-title" onClick={()=>setDevOpen(x=>!x)}>Development tools <span>{devOpen?'−':'+'}</span></button>{devOpen&&<div className="dev-body"><label className="toggle"><input type="checkbox" checked={allowAny} onChange={e=>setAllowAny(e.target.checked)}/> Allow any alphabetic word</label><div className="dev-grid"><div><button onClick={()=>finishRun(true)}>End run</button><button onClick={()=>mutate(n=>{n.board=createBoard(n.board.length);n.moves=[];n.noMove=[];n.status='playing'})}>Clear board</button></div><label>Player remaining<input value={letterSet} onChange={e=>setLetterSet(e.target.value.toUpperCase())}/><button onClick={()=>mutate(n=>{n.players[0].available=[...new Set(letterSet.match(/[A-Z]/g)??[])]})}>Apply</button></label><label>Import / export<textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Game-state JSON"/><button onClick={()=>setImportText(JSON.stringify(snapshot(game),null,2))}>Export</button><button onClick={()=>{try{const x=JSON.parse(importText);setGame({...x,level:x.level??9,undo:[]});setTentative([])}catch{alert('That JSON could not be imported.')}}}>Import</button></label></div></div>}</section>
  {showHow&&<div className="how-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setShowHow(false)}}>
   <section className="how-modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
    <button className="how-close" onClick={()=>setShowHow(false)} aria-label="Close how to play">×</button>
    <p className="how-kicker">How to Play</p>
    <h2 id="how-title">Build Your Way to 100.</h2>
    <p>Begin with four spaces. Fill each connected board with valid words to unlock the next square: 4, 9, 16, 25—and ultimately 100.</p>
    <p>Your letters carry forward from one level to the next. Every early choice changes what remains possible on the larger boards ahead.</p>
    <p>Start your first word anywhere. Then build connected words by dragging your tiles onto the board, crossword style.</p>
    <h3>Use Every Letter Wisely.</h3>
    <p>Use all five vowels and they refresh. Use every consonant and the full alphabet refreshes. Clear both together to earn a 10-point bonus.</p>
    <p>Every new tile scores 1 point. Your letters and points carry forward as the boards grow, so plan for the board in front of you—and the levels still to come.</p>
    <p className="how-ending">The run ends when there are no legal moves left. How many square levels can you conquer?</p>
   </section>
  </div>}
  {showScores&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget&&!enteringScore)setShowScores(false)}}>
   <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="scores-title">
    {!enteringScore&&<button className="how-close" onClick={()=>setShowScores(false)} aria-label="Close high scores">×</button>}
    <p className="how-kicker">Torie Solo</p>
    <h2 id="scores-title">{enteringScore?'New High Score':'High Scores'}</h2>
    {enteringScore&&<div className="score-entry"><p><strong>{player.score}</strong> points · Level {game.level} · {filledCount}/{boardTotal}</p><label htmlFor="initials">Enter your initials</label><input id="initials" value={initials} maxLength={3} autoComplete="off" inputMode="text" onChange={e=>setInitials((e.target.value.match(/[A-Za-z]/g)??[]).join('').toUpperCase().slice(0,3))} placeholder="AAA"/><button onClick={saveHighScore} disabled={initials.length!==3}>Save score</button></div>}
    <ol className="score-list">{highScores.map((entry,index)=><li key={`${entry.initials}-${entry.score}-${entry.filled}-${entry.date}-${index}`}><span className="score-rank">{index+1}</span><b>{entry.initials}</b><strong>{entry.score}</strong><span>L{entry.level??1}</span><small>{entry.date}</small></li>)}</ol>
    {!enteringScore&&highScores.length===0&&<p className="empty-scores">No scores yet. Finish a run to set the first one.</p>}
   </section>
  </div>}
  {confirmAction&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setConfirmAction(null)}}>
   <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <p className="how-kicker">{confirmAction==='finish'?'Bank your score':'Start over'}</p>
    <h2 id="confirm-title">{confirmAction==='finish'?'Finish this run?':'Start a new game?'}</h2>
    <p>{confirmAction==='finish'?`Finish with ${player.score} points on Level ${game.level}, with ${filledCount}/${boardTotal} spaces filled? Your score can qualify for the Top 10.`:'Your current score and level progress will be discarded.'}</p>
    <div className="confirm-actions"><button onClick={()=>setConfirmAction(null)}>Keep playing</button><button className="confirm-primary" onClick={()=>confirmAction==='finish'?finishRun(false):newGame()}>{confirmAction==='finish'?'Finish run':'New game'}</button></div>
   </section>
  </div>}
  {levelNotice&&<div className="level-notice" role="status"><strong>LEVEL {levelNotice} UNLOCKED</strong><span>{boardSizeForLevel(levelNotice)}×{boardSizeForLevel(levelNotice)} BOARD</span></div>}
  {dragging&&<div className={`drag-ghost letter-tile stone-${game.active}`} style={{left:dragPoint.x,top:dragPoint.y}}><span>{dragging.letter}</span></div>}
  {game.status==='over'&&<div className="gameover"><div><p>RUN COMPLETE</p><h2>Level {game.level} · {filledCount} of {boardTotal} spaces</h2><strong>{game.players[0].score} points</strong><button onClick={newGame}>Play again</button></div></div>}
 </div>
}
