import {useEffect,useMemo,useState} from 'react'
import {BOARD_SIZE,CENTERS,createBoard} from './game/board'
import {createDictionary} from './game/dictionary'
import {findLegalMove} from './game/legalMoveSearch'
import {ALPHABET,createGame,snapshot,useLetters,VOWELS} from './game/state'
import type {GameState} from './game/types'
import {validateTentativeMove,type TentativeLetter} from './game/validation'

const clone=<T,>(x:T):T=>structuredClone(x)
type DragTile={letter:string;row?:number;col?:number}
interface HighScore {initials:string;score:number;filled:number;date:string}
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
 const dict=useMemo(()=>createDictionary(allowAny),[allowAny])
 const player=game.players[game.active]
 const lastId=game.moves.at(-1)?.id
 const legal=useMemo(()=>game.status==='playing'?findLegalMove(game.board,player,dict):null,[game.board,player,dict,game.status])
 const check=useMemo(()=>validateTentativeMove(game.board,player,tentative,dict),[game.board,player,tentative,dict])
 const prospectiveCycle=useMemo(()=>useLetters(player,check.result.placements.filter(x=>x.isNew).map(x=>x.letter)),[player,check.result.placements])
 const filledCount=game.board.reduce((total,row)=>total+row.filter(Boolean).length,0)
 useEffect(()=>{if(game.status==='playing'&&game.moves.length>0&&!legal&&!tentative.length)finishRun(true)},[legal,game.status,game.moves.length,tentative.length])

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
  setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));const id=(n.moves.at(-1)?.id??0)+1
   for(const p of result.placements.filter(x=>x.isNew))n.board[p.row][p.col]={letter:p.letter,owner:p.owner,moveId:id}
   const used=result.placements.filter(x=>x.isNew).map(x=>x.letter)
   const cycleResult=useLetters(n.players[game.active],used)
   const totalScore=result.score+cycleResult.bonus
   n.players[game.active]={...cycleResult.player,score:n.players[game.active].score+totalScore}
   n.moves.push({id,player:game.active,...input,placements:result.placements,words:result.words,score:totalScore,baseScore:result.score,bonus:cycleResult.bonus})
   n.turn++;n.noMove=[];return n})
  setTentative([])
 }
 function finishRun(automatic=false){const qualifies=highScores.length<10||ranksAbove({initials:'',score:player.score,filled:filledCount,date:''},highScores.at(-1)!)<0;setGame(old=>{if(old.status==='over')return old;const n=clone(old);n.undo.push(snapshot(old));n.noMove=[0];n.passes.push({player:0,turn:n.turn,forced:automatic,time:new Date().toLocaleTimeString()});n.status='over';return n});setTentative([]);setConfirmAction(null);setInitials('');setEnteringScore(qualifies);setShowScores(true)}
 function newGame(){setGame(createGame());setTentative([]);setShowScores(false);setEnteringScore(false);setInitials('');setConfirmAction(null)}
 function mutate(fn:(n:GameState)=>void){setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));fn(n);return n});setTentative([])}
 function saveHighScore(){if(initials.length!==3)return;const entry={initials,score:player.score,filled:filledCount,date:new Date().toLocaleDateString()};const next=[...highScores,entry].sort(ranksAbove).slice(0,10);setHighScores(next);localStorage.setItem(HIGH_SCORE_KEY,JSON.stringify(next));setEnteringScore(false)}
 function Rack(){
  const p=game.players[0],active=game.status==='playing'
  const placed=new Set(tentative.map(x=>x.letter))
  return <aside data-rack="0" className={`rack player-0 ${active?'active':''}`}>
   <div className="rack-head"><p>{p.name}</p><strong>{p.score}</strong><span>POINTS</span></div>
   <div className="rack-meta"><span>Alphabet {p.cycle} · Vowels {p.vowelCycle}</span><b>{p.available.length} tiles</b></div>
   <div className="pool-status"><span>{VOWELS.filter(v=>p.available.includes(v)).length} vowels</span><span>{p.available.filter(v=>!VOWELS.includes(v)).length} consonants</span></div>
   <div className="tile-rack">{ALPHABET.map(letter=>{const available=p.available.includes(letter),onBoard=active&&placed.has(letter);return <div className="tile-slot" key={letter}>{available&&!onBoard?<button className="letter-tile stone-0" disabled={!active} onPointerDown={e=>{if(active){e.preventDefault();startDrag(letter,e.clientX,e.clientY)}}}><span>{letter}</span></button>:<span className="empty-tile">{letter}</span>}</div>})}</div>
   <div className="rack-status">{game.status==='over'?'Finished':active?'DRAG TILES TO THE BOARD':'WAITING'}</div>
  </aside>
 }

 return <div className={`app ${dragging?'is-dragging':''}`} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={()=>setDragging(null)}>
  <header><div className="brand"><img src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/></div></header>
  <main className="table">
   <Rack/>
   <section className="play-area">
    <div className="board-card">
     <div className="board-toolbar"><button className="how-button" onClick={()=>setShowHow(true)}>How to play</button><button className="how-button" onClick={()=>{setEnteringScore(false);setShowScores(true)}}>High scores</button></div>
     <div className="board-wrap"><div className="board">{Array.from({length:BOARD_SIZE},(_,r)=><div key={r} style={{display:'contents'}}>{Array.from({length:BOARD_SIZE},(_,c)=>{const cell=game.board[r][c],pending=tentative.find(x=>x.row===r&&x.col===c);return <div key={`${r},${c}`} data-cell data-row={r} data-col={c} aria-label={`Row ${r+1}, column ${c+1}`} className={`cell ${CENTERS.has(`${r},${c}`)?'center':''} ${cell?`filled owner-${cell.owner}`:''} ${cell?.moveId===lastId?'last':''} ${pending?'tentative':''}`}>{pending?<button className={`letter-tile board-tile stone-${game.active}`} onPointerDown={e=>{e.preventDefault();startDrag(pending.letter,e.clientX,e.clientY,r,c)}}><span>{pending.letter}</span></button>:cell?<div className={`letter-tile placed-tile stone-${cell.owner}`}><span>{cell.letter}</span></div>:null}</div>})}</div>)}</div></div>
    </div>
    <section className="progress-strip" aria-label="Game progress">
     <div><span>Points</span><strong>{game.players[0].score}</strong></div>
     <div><span>Board filled</span><strong>{filledCount}<small>/100</small></strong></div>
    </section>
    <section className="move-bar">
     <div className="move-state"><span className={check.result.valid?'ready':'waiting'}>{check.result.valid?'MOVE READY':'BUILD YOUR MOVE'}</span><strong>{check.result.valid?`${check.result.words.map(w=>w.word).join(' · ')}  |  +${check.result.score}${prospectiveCycle.bonus?' + 10 CYCLE CLEAR':''}`:check.result.errors[0]}</strong></div>
     <div className="move-actions"><button onClick={()=>setTentative([])} disabled={!tentative.length}>Cancel</button><button className="submit" onClick={confirm} disabled={!check.result.valid}>Submit move</button></div>
    </section>
    <section className="game-strip">
     <div><h3>Recent play</h3>{game.moves.at(-1)?<p>{game.moves.at(-1)!.words.map(w=>w.word).join(', ')} <b>+{game.moves.at(-1)!.baseScore}{game.moves.at(-1)!.bonus?` + ${game.moves.at(-1)!.bonus} cycle clear`:''}</b></p>:<p>No moves yet</p>}</div>
     <div className="utility"><button onClick={()=>setConfirmAction('finish')}>Finish run</button><button onClick={()=>filledCount?setConfirmAction('new'):newGame()}>New game</button></div>
    </section>
   </section>
  </main>
  <section className="dev"><button className="dev-title" onClick={()=>setDevOpen(x=>!x)}>Development tools <span>{devOpen?'−':'+'}</span></button>{devOpen&&<div className="dev-body"><label className="toggle"><input type="checkbox" checked={allowAny} onChange={e=>setAllowAny(e.target.checked)}/> Allow any alphabetic word</label><div className="dev-grid"><div><button onClick={()=>finishRun(true)}>End run</button><button onClick={()=>mutate(n=>{n.board=createBoard();n.moves=[];n.noMove=[];n.status='playing'})}>Clear board</button><button onClick={()=>mutate(n=>{n.board=createBoard();'TORIE'.split('').forEach((letter,i)=>n.board[4][2+i]={letter,owner:0,moveId:0});n.noMove=[];n.status='playing'})}>Fill test pattern</button></div><label>Player remaining<input value={letterSet} onChange={e=>setLetterSet(e.target.value.toUpperCase())}/><button onClick={()=>mutate(n=>{n.players[0].available=[...new Set(letterSet.match(/[A-Z]/g)??[])]})}>Apply</button></label><label>Import / export<textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Game-state JSON"/><button onClick={()=>setImportText(JSON.stringify(snapshot(game),null,2))}>Export</button><button onClick={()=>{try{const x=JSON.parse(importText);setGame({...x,undo:[]});setTentative([])}catch{alert('That JSON could not be imported.')}}}>Import</button></label></div></div>}</section>
  {showHow&&<div className="how-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setShowHow(false)}}>
   <section className="how-modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
    <button className="how-close" onClick={()=>setShowHow(false)} aria-label="Close how to play">×</button>
    <p className="how-kicker">How to Play</p>
    <h2 id="how-title">The Ultimate Challenge.</h2>
    <p>Build one connected network of valid words and claim as many of the board’s 100 spaces as you can.</p>
    <p>Filling every space is Torie’s ultimate challenge. Every move changes what remains possible, so plan carefully, protect your options, and see how close you can get.</p>
    <p>Start your first word anywhere. Then build connected words by dragging your tiles onto the board, crossword style.</p>
    <h3>Use. Reset. Repeat.</h3>
    <p>You begin with one of every letter.</p>
    <ul><li>Use all five vowels and your vowels reset.</li><li>Use all your consonants and your full alphabet resets.</li></ul>
    <div className="game-changer"><h3>Game Changer</h3><p>Clear your vowels and consonants in the same move for a game-changing 10-point bonus.</p></div>
    <p>Every new tile scores 1 point, so plan ahead. The best move might not be the longest word—it might prepare your next reset or preserve room for more connected words.</p>
    <p className="how-ending">The run ends when there are no more legal moves. Chase all 100 spaces, set your highest score, and come back to beat it.</p>
   </section>
  </div>}
  {showScores&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget&&!enteringScore)setShowScores(false)}}>
   <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="scores-title">
    {!enteringScore&&<button className="how-close" onClick={()=>setShowScores(false)} aria-label="Close high scores">×</button>}
    <p className="how-kicker">Torie Solo</p>
    <h2 id="scores-title">{enteringScore?'New High Score':'High Scores'}</h2>
    {enteringScore&&<div className="score-entry"><p><strong>{player.score}</strong> points · {filledCount}/100 filled</p><label htmlFor="initials">Enter your initials</label><input id="initials" value={initials} maxLength={3} autoComplete="off" inputMode="text" onChange={e=>setInitials((e.target.value.match(/[A-Za-z]/g)??[]).join('').toUpperCase().slice(0,3))} placeholder="AAA"/><button onClick={saveHighScore} disabled={initials.length!==3}>Save score</button></div>}
    <ol className="score-list">{highScores.map((entry,index)=><li key={`${entry.initials}-${entry.score}-${entry.filled}-${entry.date}-${index}`}><span className="score-rank">{index+1}</span><b>{entry.initials}</b><strong>{entry.score}</strong><span>{entry.filled}/100</span><small>{entry.date}</small></li>)}</ol>
    {!enteringScore&&highScores.length===0&&<p className="empty-scores">No scores yet. Finish a run to set the first one.</p>}
   </section>
  </div>}
  {confirmAction&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setConfirmAction(null)}}>
   <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <p className="how-kicker">{confirmAction==='finish'?'Bank your score':'Start over'}</p>
    <h2 id="confirm-title">{confirmAction==='finish'?'Finish this run?':'Start a new game?'}</h2>
    <p>{confirmAction==='finish'?`Finish with ${player.score} points and ${filledCount}/100 spaces filled? Your score can qualify for the Top 10.`:'Your current score and board will be discarded.'}</p>
    <div className="confirm-actions"><button onClick={()=>setConfirmAction(null)}>Keep playing</button><button className="confirm-primary" onClick={()=>confirmAction==='finish'?finishRun(false):newGame()}>{confirmAction==='finish'?'Finish run':'New game'}</button></div>
   </section>
  </div>}
  {dragging&&<div className={`drag-ghost letter-tile stone-${game.active}`} style={{left:dragPoint.x,top:dragPoint.y}}><span>{dragging.letter}</span></div>}
  {game.status==='over'&&<div className="gameover"><div><p>RUN COMPLETE</p><h2>{filledCount} of 100 spaces filled</h2><strong>{game.players[0].score} points</strong><button onClick={newGame}>Play again</button></div></div>}
 </div>
}
