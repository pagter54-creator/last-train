/* Real-time presentation only: combat and decision costs do not tick during route travel. */
(() => {
  const g=window.lastRail,B=window.GAME_DATA.BALANCE,A=window.LAST_RAIL_SCENE;
  const advance=g.advanceStage.bind(g),update=g.update.bind(g),menu=g.showMainMenu.bind(g),newRun=g.newRun.bind(g);
  const overlay=document.querySelector('#overlay');let travel=null;
  function shake(){if(matchMedia('(prefers-reduced-motion: reduce)').matches)return;document.querySelectorAll('.topbar,.threat-strip,#train-cars').forEach(el=>el.animate([{transform:'translate(0)'},{transform:`translate(${-B.transition.shakePixels}px,4px)`},{transform:`translate(${B.transition.shakePixels/2}px,-2px)`},{transform:'translate(0)'}],{duration:B.transition.shakeSeconds*1000}));}
  function reset(){travel=null;g.sceneTransition=null;document.body.classList.remove('route-travel');}
  g.advanceStage=function(){if(travel||!this.state)return;A.cancelSelection();overlay.classList.remove('show');travel={run:this.state,phase:'exit',elapsed:0};this.mode='transition';this.sceneTransition={offset:0,boost:1};document.body.classList.add('route-travel');shake();this.playSound('engine');};
  g.update=function(dt){if(!travel)return update(dt);if(this.state!==travel.run){reset();return update(dt);}if(document.hidden)return;
    const low=matchMedia('(prefers-reduced-motion: reduce)').matches,tr=travel;tr.elapsed+=dt;
    if(tr.phase==='exit'){const p=Math.min(1,tr.elapsed/B.transition.exitSeconds);this.sceneTransition.offset=low?0:MOVEMENT_CONFIG.width*p*p;this.sceneTransition.boost=1+B.transition.backdropBoost*p;
      if(p===1){advance();tr.targetMode=this.mode;tr.overlay=overlay.classList.contains('show');overlay.classList.remove('show');this.mode='transition';tr.phase='enter';tr.elapsed=0;this.sceneTransition={offset:low?0:MOVEMENT_CONFIG.width,boost:1+B.transition.backdropBoost};}
    }else{const p=Math.min(1,tr.elapsed/B.transition.enterSeconds);this.sceneTransition.offset=low?0:MOVEMENT_CONFIG.width*Math.pow(1-p,3);this.sceneTransition.boost=1+B.transition.backdropBoost*(1-p);
      if(p===1){this.mode=tr.targetMode;if(tr.overlay)overlay.classList.add('show');reset();shake();this.playSound('rail');this.renderAll();}}
  };
  g.showMainMenu=function(...args){reset();return menu(...args);};
  g.newRun=function(...args){reset();return newRun(...args);};
})();
