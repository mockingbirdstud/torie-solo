import {useEffect,useMemo,useRef,useState} from 'react'
import {boardSizeForLevel,createBoard,isBoardFull,MAX_BOARD_SIZE,MAX_LEVEL} from './game/board'
import {createDictionary} from './game/dictionary'
import {advanceLevel,ALPHABET,createGame,snapshot,useLetters,VOWELS} from './game/state'
import type {Board,GameState} from './game/types'
import {validateTentativeMove,type TentativeLetter} from './game/validation'

const clone=<T,>(x:T):T=>structuredClone(x)
type DragTile={letter:string;row?:number;col?:number}
type GameMode='journey'|'classic'
type Screen='intro'|'home'|'game'
type MoveCheck='idle'|'checking'|'found'|'none'
interface HighScore {initials:string;score:number;filled:number;level?:number;mode?:GameMode|'level';date:string}
const HIGH_SCORE_KEY='torie-solo-high-scores'
const loadHighScores=():HighScore[]=>{try{return JSON.parse(localStorage.getItem(HIGH_SCORE_KEY)??'[]')}catch{return []}}
const ranksAbove=(a:HighScore,b:HighScore)=>b.score-a.score||b.filled-a.filled
const scoreMode=(entry:HighScore):GameMode=>entry.mode==='level'?'classic':entry.mode??'journey'
const SHARE_URL='https://mockingbirdstud.github.io/torie-solo/'
const INTRO_WORDS=[['CAN','YOU','BEAT','ME?'],['BEST','PUZZLE','GAME','EVER']] as const
const INTRO_ROWS=[[1,3,5,7],[0,2,4,6]] as const
const RANDOM_LETTERS='ABCDEFGHIJKLMNOPQRSTUVWXYZ'

function introTiles(words:readonly string[],rows:readonly number[]){
 const tiles=new Map<string,string>()
 words.forEach((word,index)=>{
  const start=0
  ;[...word].forEach((letter,col)=>tiles.set(`${rows[index]}-${start+col}`,letter))
 })
 return tiles
}
function randomIntroBoard(){
 const tiles=new Map<string,string>()
 for(let row=0;row<8;row++)for(let col=0;col<8;col++)tiles.set(`${row}-${col}`,RANDOM_LETTERS[Math.floor(Math.random()*RANDOM_LETTERS.length)])
 return tiles
}

function roundedRect(context:CanvasRenderingContext2D,x:number,y:number,width:number,height:number,radius:number){
 context.beginPath();context.roundRect(x,y,width,height,radius);context.fill()
}

function boardImage(board:Board):Promise<Blob>{
 const canvas=document.createElement('canvas'),size=1080,padding=54
 canvas.width=size;canvas.height=size
 const context=canvas.getContext('2d')!
 context.fillStyle='#090c0b';context.fillRect(0,0,size,size)
 const boardSize=board.length,area=size-padding*2,cell=area/boardSize
 context.fillStyle='#343a38';context.fillRect(padding,padding,area,area)
 for(let row=0;row<boardSize;row++)for(let col=0;col<boardSize;col++){
  const x=padding+col*cell,y=padding+row*cell
  context.fillStyle='#303634';context.fillRect(x+2,y+2,cell-4,cell-4)
  if(board[row][col]){
   const inset=Math.max(5,cell*.07)
   context.fillStyle='#abcfc8'
   roundedRect(context,x+inset,y+inset,cell-inset*2,cell-inset*2,Math.max(5,cell*.1))
  }
 }
 return new Promise((resolve,reject)=>canvas.toBlob(blob=>blob?resolve(blob):reject(new Error('Image creation failed.')),'image/png'))
}

export default function App(){
 const [screen,setScreen]=useState<Screen>('intro')
 const [introPhrase,setIntroPhrase]=useState<0|1>(0)
 const [introSettledThrough,setIntroSettledThrough]=useState(-1)
 const [introLeaving,setIntroLeaving]=useState(false)
 const [introLetters,setIntroLetters]=useState(randomIntroBoard)
 const [mode,setMode]=useState<GameMode>('journey')
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
 const [moveCheck,setMoveCheck]=useState<MoveCheck>('idle')
 const [shareReady,setShareReady]=useState(false)
 const [shareStatus,setShareStatus]=useState('')
 const moveWorker=useRef<Worker|null>(null)
 const moveRequest=useRef(0)
 const dict=useMemo(()=>createDictionary(allowAny),[allowAny])
 const player=game.players[game.active]
 const lastId=game.moves.at(-1)?.id
 const check=useMemo(()=>validateTentativeMove(game.board,player,tentative,dict),[game.board,player,tentative,dict])
 const boardSize=game.board.length
 const boardTotal=boardSize*boardSize
 const filledCount=game.board.reduce((total,row)=>total+row.filter(Boolean).length,0)
 const previewBonus=check.result.valid?useLetters(player,check.result.placements.filter(x=>x.isNew).map(x=>x.letter)).bonus:0
 const moveHeadline=tentative.length?(check.result.valid?'MOVE READY':'BUILD YOUR MOVE'):moveCheck==='checking'?'CHECKING FOR MOVES':moveCheck==='found'?'MOVE AVAILABLE':moveCheck==='none'?'NO MOVE FOUND':'BUILD YOUR MOVE'
 const moveDetail=tentative.length?(check.result.valid?`${check.result.words.map(w=>w.word).join(' · ')}  |  +${check.result.score}${previewBonus?` + ${previewBonus} reset bonus`:''}`:check.result.errors[0]):moveCheck==='checking'?'You can keep viewing the board while Torie checks.':moveCheck==='found'?'At least one legal move is still available.':moveCheck==='none'?'No legal move was found. Finish the run when you are ready.':'Drag at least one tile onto the board.'
 const leaderboard=[...highScores].sort(ranksAbove).slice(0,10)
 useEffect(()=>{
  if(screen!=='intro')return
  const timers:number[]=[]
  let interval=window.setInterval(()=>setIntroLetters(randomIntroBoard()),85)
  ;[0,1,2,3,4,5,6,7].forEach(row=>timers.push(window.setTimeout(()=>setIntroSettledThrough(row),1200+row*210)))
  timers.push(window.setTimeout(()=>{window.clearInterval(interval);setIntroPhrase(1);setIntroSettledThrough(-1);setIntroLetters(randomIntroBoard());interval=window.setInterval(()=>setIntroLetters(randomIntroBoard()),85)},4500))
  ;[0,1,2,3,4,5,6,7].forEach(row=>timers.push(window.setTimeout(()=>setIntroSettledThrough(row),5700+row*210)))
  timers.push(window.setTimeout(()=>window.clearInterval(interval),7400))
  timers.push(window.setTimeout(()=>setIntroLeaving(true),9500))
  timers.push(window.setTimeout(()=>setScreen('home'),10200))
  return()=>{window.clearInterval(interval);timers.forEach(window.clearTimeout)}
 },[screen])
 useEffect(()=>()=>moveWorker.current?.terminate(),[])
 useEffect(()=>{if(!levelNotice)return;const timer=window.setTimeout(()=>setLevelNotice(null),1800);return()=>window.clearTimeout(timer)},[levelNotice])
 useEffect(()=>{if(mode!=='classic'||game.status!=='over'||!isBoardFull(game.board))return;const candidate={initials:'',score:game.players[0].score,filled:boardTotal,level:game.level,mode,date:''};const qualifies=leaderboard.length<10||ranksAbove(candidate,leaderboard.at(-1)!)<0;setInitials('');setEnteringScore(qualifies);setShowScores(true)},[game.status])

 function cancelMoveCheck(){moveRequest.current++;moveWorker.current?.terminate();moveWorker.current=null;setMoveCheck('idle')}
 function checkForMoves(){
  if(moveCheck==='checking'||game.status!=='playing')return
  const id=++moveRequest.current
  const worker=new Worker(new URL('./game/legalMoveWorker.ts',import.meta.url),{type:'module'})
  moveWorker.current?.terminate();moveWorker.current=worker;setMoveCheck('checking')
  worker.onmessage=(event:{data:{id:number;move:unknown}})=>{if(event.data.id!==moveRequest.current)return;setMoveCheck(event.data.move?'found':'none');worker.terminate();if(moveWorker.current===worker)moveWorker.current=null}
  worker.onerror=()=>{if(id!==moveRequest.current)return;setMoveCheck('idle');worker.terminate();if(moveWorker.current===worker)moveWorker.current=null}
  worker.postMessage({id,board:game.board,player,allowAny})
 }
 function startDrag(letter:string,x:number,y:number,row?:number,col?:number){if(moveCheck!=='idle')setMoveCheck('idle');setDragging({letter,row,col});setDragPoint({x,y})}
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
  cancelMoveCheck()
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
   if(isBoardFull(n.board))return mode==='journey'?advanceLevel(n):{...n,status:'over'}
   return n})
  if(completesLevel&&mode==='journey'&&game.level<MAX_LEVEL)setLevelNotice(game.level+1)
  setTentative([])
 }
 function finishRun(automatic=false){const candidate={initials:'',score:player.score,filled:filledCount,level:game.level,mode,date:''};const qualifies=leaderboard.length<10||ranksAbove(candidate,leaderboard.at(-1)!)<0;setGame(old=>{if(old.status==='over')return old;const n=clone(old);n.undo.push(snapshot(old));n.noMove=[0];n.passes.push({player:0,turn:n.turn,forced:automatic,time:new Date().toLocaleTimeString()});n.status='over';return n});setTentative([]);setConfirmAction(null);setInitials('');setShareReady(false);setShareStatus('');setEnteringScore(qualifies);setShowScores(true)}
 function resetOverlays(){cancelMoveCheck();setTentative([]);setDragging(null);setShowScores(false);setEnteringScore(false);setInitials('');setConfirmAction(null);setLevelNotice(null);setShareReady(false);setShareStatus('')}
 function startJourney(){setMode('journey');setGame(createGame());resetOverlays();setScreen('game')}
 function startClassic(){setMode('classic');setGame(createGame(MAX_LEVEL));resetOverlays();setScreen('game')}
 function newGame(){setGame(createGame(mode==='journey'?1:MAX_LEVEL));resetOverlays()}
 function goHome(){resetOverlays();setScreen('home')}
 function mutate(fn:(n:GameState)=>void){setGame(old=>{const n=clone(old);n.undo.push(snapshot(old));fn(n);return n});setTentative([])}
 function saveHighScore(){if(initials.length!==3)return;const entry={initials,score:player.score,filled:filledCount,level:game.level,mode,date:new Date().toLocaleDateString()};const next=[...highScores,entry].sort(ranksAbove).slice(0,10);setHighScores(next);localStorage.setItem(HIGH_SCORE_KEY,JSON.stringify(next));setEnteringScore(false);setShareReady(true)}
 async function shareResult(){
  setShareStatus('Preparing result…')
  try{
   const blob=await boardImage(game.board)
   const label=mode==='journey'?`Journey · Level ${game.level}`:`Classic · ${boardSize}×${boardSize}`
   const text=`Torie ${label}\n${player.score} points · ${filledCount}/${boardTotal} spaces\nCan you beat my score?\n${SHARE_URL}`
   const file=new File([blob],`torie-${mode}-${boardSize}x${boardSize}.png`,{type:'image/png'})
   if(navigator.share&&navigator.canShare?.({files:[file]})){
    await navigator.share({title:'Torie Solo',text,files:[file]});setShareStatus('Result shared.')
   }else{
    const link=document.createElement('a');link.href=URL.createObjectURL(blob);link.download=file.name;link.click();window.setTimeout(()=>URL.revokeObjectURL(link.href),1000)
    let copied=false
    try{if(navigator.clipboard){await navigator.clipboard.writeText(text);copied=true}}catch{/* The PNG download still succeeds without clipboard permission. */}
    setShareStatus(copied?'Image saved and share text copied.':'Image saved. Copy the game link when you share it.')
   }
  }catch(error){if(error instanceof DOMException&&error.name==='AbortError'){setShareStatus('');return}setShareStatus('Sharing is not available in this browser.')}
 }
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

 return <div className={`app ${screen!=='game'?'home-app':''} ${dragging?'is-dragging':''}`} onPointerMove={movePointer} onPointerUp={endPointer} onPointerCancel={()=>setDragging(null)}>
  {screen==='intro'?<button className={`intro-screen ${introLeaving?'leaving':''}`} onClick={()=>setScreen('home')} aria-label="Skip introduction">
   <img className="intro-logo" src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/>
   <div className="intro-board" aria-label={INTRO_WORDS[introPhrase].join(' ')}>{Array.from({length:64},(_,index)=>{const row=Math.floor(index/8),col=index%8,settled=row<=introSettledThrough,target=introTiles(INTRO_WORDS[introPhrase],INTRO_ROWS[introPhrase]).get(`${row}-${col}`),letter=settled?(target??''):introLetters.get(`${row}-${col}`);return <span className="intro-cell" key={index}><span className={`intro-tile ${settled?'settled':'flipping'}`} style={!settled?{animationDelay:`${row*95+col*10}ms`}:undefined}>{letter&&<span className="intro-glyph" key={`${introPhrase}-${row}-${col}-${letter}`}>{letter}</span>}</span></span>})}</div>
   <span className="intro-skip">Tap to skip</span>
  </button>:screen==='home'?<main className="home-screen">
   <img className="home-logo" src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/>
   <p className="home-kicker">THE ULTIMATE WORD PUZZLE</p>
   <div className="mode-cards">
    <button className="mode-card primary" onClick={startClassic}>CLASSIC</button>
    <button className="mode-card" onClick={startJourney}>JOURNEY</button>
   </div>
   <button className="home-how" onClick={()=>setShowHow(true)}>How to play</button>
  </main>:<>
  <main className="table">
   <Rack/>
   <section className="play-area">
    <div className="board-card">
     <div className="board-toolbar">
      <div className="toolbar-left"><button className="how-button" onClick={goHome}>Home</button><button className="how-button" onClick={()=>setShowHow(true)}>How to play</button></div>
      <div className="toolbar-brand"><img src={`${import.meta.env.BASE_URL}torie-title.png`} alt="Torie"/></div>
      <button className="how-button" onClick={()=>{setEnteringScore(false);setShareReady(false);setShareStatus('');setShowScores(true)}}>High scores</button>
     </div>
     <div className="board-wrap"><div className="board" style={{gridTemplateColumns:`repeat(${boardSize}, minmax(0, 1fr))`,width:`${boardSize/MAX_BOARD_SIZE*100}%`}}>{Array.from({length:boardSize},(_,r)=><div key={r} style={{display:'contents'}}>{Array.from({length:boardSize},(_,c)=>{const cell=game.board[r][c],pending=tentative.find(x=>x.row===r&&x.col===c);return <div key={`${r},${c}`} data-cell data-row={r} data-col={c} aria-label={`Row ${r+1}, column ${c+1}`} className={`cell ${cell?`filled owner-${cell.owner}`:''} ${cell?.moveId===lastId?'last':''} ${pending?'tentative':''}`}>{pending?<button className={`letter-tile board-tile stone-${game.active}`} onPointerDown={e=>{e.preventDefault();startDrag(pending.letter,e.clientX,e.clientY,r,c)}}><span>{pending.letter}</span></button>:cell?<div className={`letter-tile placed-tile stone-${cell.owner}`}><span>{cell.letter}</span></div>:null}</div>})}</div>)}</div></div>
    </div>
    <section className="progress-strip" aria-label="Game progress">
     <div><span>Points</span><strong>{game.players[0].score}</strong></div>
     <div><span>{mode==='journey'?`Level ${game.level}`:'Classic'} · {boardSize}×{boardSize}</span><strong>{filledCount}<small>/{boardTotal}</small></strong></div>
    </section>
    <section className="move-bar">
     <div className="move-state"><span className={tentative.length&&check.result.valid||moveCheck==='found'?'ready':'waiting'}>{moveHeadline}</span><strong>{moveDetail}</strong></div>
     <div className="move-actions">
      <button onClick={()=>setConfirmAction('finish')}>Finish run</button>
      <button onClick={()=>filledCount?setConfirmAction('new'):newGame()}>New game</button>
      {tentative.length?<button onClick={()=>setTentative([])}>Cancel</button>:<button onClick={checkForMoves} disabled={moveCheck==='checking'}>{moveCheck==='checking'?'Checking…':'Check moves'}</button>}
      <button className="submit" onClick={confirm} disabled={!check.result.valid}>Submit</button>
     </div>
    </section>
   </section>
  </main>
  <section className="dev"><button className="dev-title" onClick={()=>setDevOpen(x=>!x)}>Development tools <span>{devOpen?'−':'+'}</span></button>{devOpen&&<div className="dev-body"><label className="toggle"><input type="checkbox" checked={allowAny} onChange={e=>setAllowAny(e.target.checked)}/> Allow any alphabetic word</label><div className="dev-grid"><div><button onClick={()=>finishRun(true)}>End run</button><button onClick={()=>mutate(n=>{n.board=createBoard(n.board.length);n.moves=[];n.noMove=[];n.status='playing'})}>Clear board</button></div><label>Player remaining<input value={letterSet} onChange={e=>setLetterSet(e.target.value.toUpperCase())}/><button onClick={()=>mutate(n=>{n.players[0].available=[...new Set(letterSet.match(/[A-Z]/g)??[])]})}>Apply</button></label><label>Import / export<textarea value={importText} onChange={e=>setImportText(e.target.value)} placeholder="Game-state JSON"/><button onClick={()=>setImportText(JSON.stringify(snapshot(game),null,2))}>Export</button><button onClick={()=>{try{const x=JSON.parse(importText);setGame({...x,level:x.level??9,undo:[]});setTentative([])}catch{alert('That JSON could not be imported.')}}}>Import</button></label></div></div>}</section>
  </>}
  {showHow&&<div className="how-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setShowHow(false)}}>
   <section className="how-modal" role="dialog" aria-modal="true" aria-labelledby="how-title">
    <button className="how-close" onClick={()=>setShowHow(false)} aria-label="Close how to play">×</button>
    <p className="how-kicker">How to Play</p>
    <h2 id="how-title">Build Connected Words.</h2>
    <p>Drag letters onto the board and connect valid words crossword-style. Start the first word anywhere, then make every new move touch the words already in play.</p>
    <h3>Classic</h3>
    <p>Take on the full 8×8 puzzle with a fresh alphabet and Torie's normal letter-reset rules. Fill all 64 spaces—or finish the run when you have gone as far as you can.</p>
    <h3>Journey</h3>
    <p>Begin with four spaces. Fill each board to unlock the next square: 4, 9, 16, 25, 36, 49—and ultimately 64.</p>
    <p>Your letters carry forward from one level to the next. Every early choice changes what remains possible on the larger boards ahead.</p>
    <h3>Use Every Letter Wisely.</h3>
    <p>Use all five vowels and they refresh. Use every consonant and the full alphabet refreshes. Clear both together to earn a 10-point bonus.</p>
    <p>Every new tile scores 1 point. Your letters and points carry forward as the boards grow, so plan for the board in front of you—and the levels still to come.</p>
    <p><strong>Check moves</strong> searches in the background when you want help confirming whether any legal play remains. It never interrupts the board or ends your run automatically.</p>
    <p className="how-ending">Plan the board in front of you—and, in Journey, every board still to come.</p>
   </section>
  </div>}
  {showScores&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget&&!enteringScore)setShowScores(false)}}>
   <section className="score-modal" role="dialog" aria-modal="true" aria-labelledby="scores-title">
    {!enteringScore&&<button className="how-close" onClick={()=>setShowScores(false)} aria-label="Close high scores">×</button>}
    <p className="how-kicker">Torie Top 10</p>
    <h2 id="scores-title">{enteringScore?'New High Score':'High Scores'}</h2>
    {enteringScore&&<div className="score-entry"><p><strong>{player.score}</strong> points · {mode==='journey'?`Journey Level ${game.level}`:'Classic'} · {filledCount}/{boardTotal}</p><label htmlFor="initials">Enter your initials</label><input id="initials" value={initials} maxLength={3} autoComplete="off" inputMode="text" onChange={e=>setInitials((e.target.value.match(/[A-Za-z]/g)??[]).join('').toUpperCase().slice(0,3))} placeholder="AAA"/><button onClick={saveHighScore} disabled={initials.length!==3}>Save score</button></div>}
    {shareReady&&<div className="share-result"><button onClick={shareResult}>Share Result</button><p>Share a letterless picture of this board with your score and a link to Torie.</p>{shareStatus&&<span role="status">{shareStatus}</span>}</div>}
    <ol className="score-list">{leaderboard.map((entry,index)=><li key={`${entry.initials}-${entry.score}-${entry.filled}-${entry.date}-${index}`}><span className="score-rank">{index+1}</span><b>{entry.initials}</b><strong>{entry.score}</strong><span>{scoreMode(entry)==='classic'?'Classic':`Journey L${entry.level??1}`}</span><small>{entry.date}</small></li>)}</ol>
    {!enteringScore&&leaderboard.length===0&&<p className="empty-scores">No scores yet. Finish a run to set the first one.</p>}
   </section>
  </div>}
  {confirmAction&&<div className="score-overlay" role="presentation" onPointerDown={e=>{if(e.target===e.currentTarget)setConfirmAction(null)}}>
   <section className="confirm-modal" role="dialog" aria-modal="true" aria-labelledby="confirm-title">
    <p className="how-kicker">{confirmAction==='finish'?'Bank your score':'Start over'}</p>
    <h2 id="confirm-title">{confirmAction==='finish'?'Finish this run?':'Start a new game?'}</h2>
    <p>{confirmAction==='finish'?`Finish with ${player.score} points in ${mode==='journey'?`Journey Level ${game.level}`:'Classic'}, with ${filledCount}/${boardTotal} spaces filled? Your score can qualify for the Top 10.`:'Your current score and progress will be discarded.'}</p>
    <div className="confirm-actions"><button onClick={()=>setConfirmAction(null)}>Keep playing</button><button className="confirm-primary" onClick={()=>confirmAction==='finish'?finishRun(false):newGame()}>{confirmAction==='finish'?'Finish run':'New game'}</button></div>
   </section>
  </div>}
  {levelNotice&&<div className="level-notice" role="status"><strong>LEVEL {levelNotice} UNLOCKED</strong><span>{boardSizeForLevel(levelNotice)}×{boardSizeForLevel(levelNotice)} BOARD</span></div>}
  {dragging&&<div className={`drag-ghost letter-tile stone-${game.active}`} style={{left:dragPoint.x,top:dragPoint.y}}><span>{dragging.letter}</span></div>}
  {screen==='game'&&game.status==='over'&&!showScores&&<div className="gameover"><div><p>{mode==='journey'?'JOURNEY COMPLETE':'CLASSIC COMPLETE'}</p><h2>{boardSize}×{boardSize} · {filledCount} of {boardTotal} spaces</h2><strong>{game.players[0].score} points</strong>{shareReady&&<><button className="gameover-share" onClick={shareResult}>Share Result</button>{shareStatus&&<small className="gameover-share-status">{shareStatus}</small>}</>}<div className="gameover-actions"><button onClick={goHome}>Home</button><button onClick={newGame}>Play again</button></div></div></div>}
 </div>
}
