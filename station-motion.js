/* World-coordinate station scenery: no gameplay time or viewport-sized movement. */
(()=>{
 const g=lastRail,C=MOVEMENT_CONFIG,V=C.stationMotion,station=document.querySelector('.station-backdrop');
 let departure=null;
 const low=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
 const style=document.createElement('style');style.textContent=`#world-stage .station-backdrop{left:${V.center*100}%}`;document.head.append(style);
 function reset(){departure?.remove();departure=null;station.style.translate='';}
 const advance=g.advanceStage.bind(g);g.advanceStage=function(...args){if(!station.hidden&&!departure){departure=station.cloneNode();departure.hidden=false;departure.classList.add('station-departing');departure.style.translate='0px 0';station.parentElement.append(departure);}return advance(...args);};
 const update=g.update.bind(g);g.update=function(dt){const result=update(dt);if(this.mode==='arrival'&&this.stationArrivalKind==='station'){const p=this.stationArrivalProgress||0;station.style.translate=`${low()?0:C.width*V.offscreenWidths*Math.pow(1-p,V.arrivalExponent)}px 0`;}else if(this.mode==='station'||this.mode==='station-placement')station.style.translate='0px 0';
  if(departure){if(this.sceneTransition?.phase==='exit'){departure.style.translate=`${low()?0:-this.sceneTransition.offset*V.offscreenWidths}px 0`;}else{departure.remove();departure=null;}}
  return result;
 };
 for(const name of ['showMainMenu','newRun','gameOver','showEnding']){const old=g[name].bind(g);g[name]=function(...args){reset();return old(...args);};}
})();
