/* World-coordinate station scenery: no gameplay time or viewport-sized movement. */
(()=>{
 'use strict';
 const g=lastRail,C=MOVEMENT_CONFIG,V=C.stationMotion,station=document.querySelector('.station-backdrop');
 let departure=null,titanDeparture=false;
 const low=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const style=document.createElement('style');style.textContent=`#world-stage .station-backdrop{left:${V.center*100}%}`;document.head.append(style);
 function reset(){departure?.remove();departure=null;titanDeparture=false;station.style.translate='';}
 function cloneDeparture(forTitan=false){
  if(station.hidden||departure)return;
  departure=station.cloneNode();departure.hidden=false;departure.classList.add('station-departing');
  if(forTitan)departure.classList.add('titan-station-departing10');
  departure.style.translate='0px 0';station.parentElement.append(departure);titanDeparture=forTitan;
 }
 const advance=g.advanceStage.bind(g);g.advanceStage=function(...args){cloneDeparture(false);return advance(...args);};
 // FINAL station does not use advanceStage: preserve a visual copy before startBoss hides/leaves the station state.
 const startBoss=g.startBoss.bind(g);g.startBoss=function(id,...args){if(id==='titan'){cloneDeparture(true);station.hidden=true;}return startBoss(id,...args);};
 const update=g.update.bind(g);g.update=function(dt){
  const result=update(dt);
  if(this.mode==='arrival'&&this.stationArrivalKind==='station'){
   const p=this.stationArrivalProgress||0;station.style.translate=`${low()?0:C.width*V.offscreenWidths*Math.pow(1-p,V.arrivalExponent)}px 0`;
  }else if(this.mode==='station'||this.mode==='station-placement')station.style.translate='0px 0';
  if(departure){
   const intro=this.state?.battle?.bossId==='titan'?this.state.battle.titan10?.intro:null;
   if(titanDeparture&&intro){
    const p=Math.max(0,Math.min(1,(intro.elapsed||0)/5));
    // Train is running left, so the station must slide to the RIGHT across the world.
    departure.style.translate=`${C.width*(.15+V.offscreenWidths)*p}px 0`;
    departure.style.opacity=String(Math.max(0,1-Math.max(0,(p-.68)/.32)));
    if(p>=1){departure.remove();departure=null;titanDeparture=false;}
   }else if(this.sceneTransition?.phase==='exit'){
    departure.style.translate=`${low()?0:-this.sceneTransition.offset*V.offscreenWidths}px 0`;
   }else if(!titanDeparture){departure.remove();departure=null;}
  }
  return result;
 };
 for(const name of ['showMainMenu','newRun','gameOver','showEnding']){const old=g[name].bind(g);g[name]=function(...args){reset();return old(...args);};}
})();
