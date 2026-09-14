/* Event scenery uses the same world placement and right-to-left motion language as the maintenance station. */
(()=>{
 'use strict';
 const g=window.lastRail,A=window.LAST_RAIL_ASSETS,C=window.LAST_RAIL_ASSET_CONFIG;
 const M=window.MOVEMENT_CONFIG||{},R=window.REVISION_CONFIG||{};
 if(!g||!A||!C?.eventImages)return;
 const host=document.querySelector('.canvas-wrap');
 if(!host)return;
 const scene=document.createElement('img');
 scene.alt='';
 scene.className='station-backdrop event-backdrop';
 scene.hidden=true;
 scene.decoding='async';
 scene.draggable=false;
 host.append(scene);
 let activeId=null,frame=0,currentX=0,animationToken=0;
 const reduced=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const duration=()=>Math.max(.1,Number(R.stop?.seconds)||.8);
 const offscreen=()=>Math.max(1,(Number(M.width)||1920)*(Number(M.stationMotion?.offscreenWidths)||1.1));
 const currentEventId=()=>{
  const history=g.state?.eventHistory;
  return history?.length?history[history.length-1]:null;
 };
 function stopAnimation(){animationToken++;if(frame){cancelAnimationFrame(frame);frame=0;}}
 function setX(x){currentX=x;scene.style.translate=`${x}px 0`;}
 function animate(from,to,seconds,done){
  stopAnimation();const token=animationToken;setX(from);
  if(reduced()){setX(to);done?.();return;}
  const started=performance.now(),ms=Math.max(1,seconds*1000);
  const tick=now=>{
   if(token!==animationToken)return;
   const p=Math.min(1,(now-started)/ms),ease=1-Math.pow(1-p,3);
   setX(from+(to-from)*ease);
   if(p<1)frame=requestAnimationFrame(tick);else{frame=0;done?.();}
  };
  frame=requestAnimationFrame(tick);
 }
 function imageUrl(src){const cached=A.get(src,'image');return cached?.currentSrc||cached?.src||A.url(src);}
 function show(id){
  const src=C.eventImages[id];if(!src)return;
  const url=imageUrl(src);activeId=id;scene.dataset.eventId=id;
  if(scene.src!==url)scene.src=url;
  scene.hidden=false;scene.classList.remove('event-backdrop-leaving');
  animate(offscreen(),0,duration());
 }
 function depart(){
  if(scene.hidden||!activeId)return;
  scene.classList.add('event-backdrop-leaving');
  animate(currentX,-offscreen(),duration(),()=>{scene.hidden=true;scene.classList.remove('event-backdrop-leaving');activeId=null;setX(0);});
 }
 function reset(){stopAnimation();scene.hidden=true;scene.classList.remove('event-backdrop-leaving');activeId=null;setX(0);}
 function syncEvent(){const id=currentEventId();if(id&&C.eventImages[id]&&id!==activeId)show(id);else if(id&&C.eventImages[id]&&scene.hidden)show(id);}
 function waitForLegacySelection(){
  const started=performance.now();
  const poll=()=>{if(g.mode==='event'){syncEvent();return;}if(performance.now()-started<2500)requestAnimationFrame(poll);};
  requestAnimationFrame(poll);
 }
 const openEvent=g.showEvent.bind(g);
 g.showEvent=function(...args){
  const result=openEvent(...args);
  const after=()=>{if(this.checkpointEnabled)syncEvent();else if(this.mode==='event')syncEvent();else waitForLegacySelection();};
  if(result&&typeof result.then==='function')return result.then(value=>{after();return value;});
  queueMicrotask(after);return result;
 };
 for(const name of ['advanceStage','showStation']){
  if(typeof g[name]!=='function')continue;const old=g[name].bind(g);
  g[name]=function(...args){if(!scene.hidden&&(this.state?.eventDeparture||this.mode==='event'||name==='showStation'))depart();return old(...args);};
 }
 for(const name of ['showMainMenu','newRun','gameOver','showEnding']){
  if(typeof g[name]!=='function')continue;const old=g[name].bind(g);g[name]=function(...args){reset();return old(...args);};
 }
 const style=document.createElement('style');
 style.textContent='.event-backdrop{z-index:4;will-change:translate;user-select:none}.event-backdrop[hidden]{display:none}.event-backdrop-leaving{pointer-events:none}';
 document.head.append(style);
 window.LAST_RAIL_EVENT_VISUALS={show,depart,reset,get activeEvent(){return activeId;}};
})();
