/* LAST RAIL 0.7 — survivability, emergency cover and pressure smoothing. */
(()=>{
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,P=window.PROGRESSION_CONFIG,C=window.SURVIVABILITY_CONFIG,A=window.LAST_RAIL_SCENE;
  if(!g||!D||!P||!C)return;
  const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
  const old={};
  for(const k of ['makeInitialState','recruitCrew','grantCrewXp','hurtCrew','absorbHullDamage','onHullImpact','updateCrew','updateEnemies','update','renderCars','crewHTML','inspectCar','startBattle','startBoss','battleClear','bossClear','gameOver','draw']){
    if(typeof g[k]==='function')old[k]=g[k].bind(g);
  }

  // A high-star recruit has skipped the lower-star progression. Convert those
  // skipped promotion levels into the HP they would already have earned.
  function skippedBirthStarHp(c){
    const birth=Math.max(1,Math.min(3,c.birthStars??c.stars??1));
    if(birth<=1)return 0;
    const threshold=P.stars?.promotion?.[birth];
    return Math.max(0,(Number.isFinite(threshold)?threshold-1:0)*C.crewHpPerLevel);
  }
  g.crewExpectedMaxHp=function(c){
    const level=Math.max(1,Number(c?.level)||1);
    return Math.max(1,B.crew.maxHp+skippedBirthStarHp(c)+(level-1)*C.crewHpPerLevel);
  };
  g.syncCrewMaxHp=function(c,healGrowth=true){
    if(!c)return 0;
    const expected=this.crewExpectedMaxHp(c),previous=Math.max(1,Number(c.maxHp)||B.crew.maxHp);
    if(Math.abs(previous-expected)<1e-9){c.hp=Math.min(expected,Math.max(0,Number(c.hp)||0));return 0;}
    const delta=expected-previous;
    c.maxHp=expected;
    // Preserve existing wounds while granting newly earned maximum HP.
    if(healGrowth&&delta>0)c.hp=Math.min(expected,Math.max(0,(Number(c.hp)||0)+delta));
    else c.hp=Math.min(expected,Math.max(0,Number(c.hp)||0));
    return delta;
  };
  g.syncAllCrewMaxHp=function(healGrowth=true){for(const c of this.state?.crew||[])this.syncCrewMaxHp(c,healGrowth);};

  if(old.makeInitialState)g.makeInitialState=function(){const s=old.makeInitialState();for(const c of s.crew||[])this.syncCrewMaxHp(c,true);return s;};
  if(old.recruitCrew)g.recruitCrew=function(...args){const before=this.state?.crew?.length||0,result=old.recruitCrew(...args);if(result&&this.state?.crew?.length>before)this.syncCrewMaxHp(this.state.crew.at(-1),true);return result;};
  if(old.grantCrewXp)g.grantCrewXp=function(c,...args){const before=this.crewExpectedMaxHp(c),result=old.grantCrewXp(c,...args),after=this.crewExpectedMaxHp(c);if(after!==before)this.syncCrewMaxHp(c,true);return result;};

  function carOf(c){return g.state?.cars?.[c?.car];}
  function boardersAt(ci){return (g.state?.enemies||[]).some(e=>!e.dead&&e.boarded&&e.targetCar===ci);}
  // Destroyed-carriage repair now continues even with boarders present. Boarder
  // attacks are melee, so they still ignore the ranged-only repair cover bonus.
  function repairingDestroyed(c){const car=carOf(c);return !!(c&&!c.dead&&c.hp>0&&!c.moving&&car&&car.hp<=0&&!g.bossCrewStopped?.(c));}
  function rangedKind(kind){return !['boarded','melee','fire'].includes(kind);}

  function ensureRecord(){
    const r=g.state?.combatRecord;if(!r||r.finished)return r;
    r.restoredCars??=0;r.maxConcurrentAttackers??=0;r.repairSeconds??=0;r.repairCrewSeconds??=0;r.emergencyCovers??=0;r.finalAverageHull??=0;
    return r;
  }
  function beginDestruction(ci){
    const s=g.state,car=s?.cars?.[ci];if(!car||car._survivalBreakActive)return;
    car._survivalBreakActive=true;
    car.rubbleCoverLeft=C.rubbleCoverSeconds;
    car.restoredProtectionLeft=0;
    car.recoveryFlash=0;
    const occupants=s.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving&&c.car===ci);
    for(const c of occupants)c.emergencyCoverLeft=Math.max(c.emergencyCoverLeft||0,C.emergencyInvulnerabilitySeconds);
    const r=ensureRecord();if(r)r.emergencyCovers++;
    g.log?.(`${car.name} 파괴 · 비상 엄폐!`,'bad');
    g.toast?.(`${car.name} · 비상 엄폐!`);
  }
  function finishRestoration(ci){
    const car=g.state?.cars?.[ci];if(!car)return;
    car._survivalBreakActive=false;
    car.rubbleCoverLeft=0;
    car.restoredProtectionLeft=C.restoredCarProtectionSeconds;
    car.recoveryFlash=C.recoveryFlashSeconds;
    const r=ensureRecord();if(r)r.restoredCars++;
    g.playSound?.('upgrade');
    g.log?.(`${car.name} 객차 복구 완료`,'hot');
    g.toast?.(`${car.name} · 객차 복구 완료`);
  }

  // Start protection before the very same impact that breaks the carriage can
  // finish off its occupants. All later ranged attacks then use rubble/repair cover.
  if(old.hurtCrew)g.hurtCrew=function(c,amount,kind='attack'){
    const car=carOf(c);
    if(car?.hp<=0&&!car.destroyedLogged&&!car._survivalBreakActive)beginDestruction(c.car);
    if((c?.emergencyCoverLeft||0)>0)return 0;
    let adjusted=amount;
    if(rangedKind(kind)&&car?.hp<=0){
      if((car.rubbleCoverLeft||0)>0)adjusted*=1-C.rubbleRangedDamageReduction;
      else if(repairingDestroyed(c))adjusted*=1-C.repairRangedDamageReduction;
    }
    return old.hurtCrew(c,adjusted,kind);
  };

  if(old.absorbHullDamage)g.absorbHullDamage=function(ci,amount){
    const car=this.state?.cars?.[ci];
    const reduced=car&&(car.restoredProtectionLeft||0)>0?amount*(1-C.restoredCarDamageReduction):amount;
    return old.absorbHullDamage(ci,reduced);
  };

  if(old.onHullImpact)g.onHullImpact=function(ci,before,...rest){
    const car=this.state?.cars?.[ci];
    if(before?.car>0&&car?.hp<=0)beginDestruction(ci);
    return old.onHullImpact(ci,before,...rest);
  };

  if(old.updateCrew)g.updateCrew=function(dt){
    const broken=this.state.cars.map(c=>c.hp<=0);
    const result=old.updateCrew(dt);
    this.state.cars.forEach((car,i)=>{if(broken[i]&&car.hp>0)finishRestoration(i);});
    return result;
  };

  function enemyAttackThreshold(e){
    const d=D.ENEMIES[e.type]||{};
    return Number.isFinite(d.hold)?d.hold:Number.isFinite(d.attackRange)?d.attackRange:(d.ranged?.72:B.battle.boardDistance);
  }
  function isEngaged(e){return !e.dead&&(e.boarded||e.windup||e.majorActive||e.x<=enemyAttackThreshold(e));}
  function pressureCaps(){
    let soft=C.enemyAttackSoftCap,hard=C.enemyAttackHardCap;
    const b=g.state?.battle;
    if(b?.elite||b?.boss){soft+=C.eliteSoftCapBonus;hard+=C.eliteHardCapBonus;}
    if(b?.rhythm?.phase?.kind==='CRISIS'||b?.rhythm?.phase?.kind==='FINAL'){soft+=C.crisisSoftCapBonus;hard+=C.crisisHardCapBonus;}
    return{soft,hard:Math.max(soft+1,hard)};
  }
  function movementMultiplier(rank,caps){return rank<caps.soft?1:rank<caps.hard?C.overflowEnemyMoveMultiplier:C.heavyOverflowEnemyMoveMultiplier;}

  if(old.updateEnemies)g.updateEnemies=function(dt){
    const living=this.state.enemies.filter(e=>!e.dead);
    const engaged=living.filter(isEngaged).length,caps=pressureCaps();
    const approaching=living.filter(e=>!e.boarded&&!isEngaged(e)&&Number.isFinite(e.x)).sort((a,b)=>a.x-b.x);
    const saved=[];
    approaching.forEach((e,i)=>{const mult=movementMultiplier(engaged+i,caps);if(mult!==1){saved.push([e,e.speed]);e.speed*=mult;e.pressureMoveMultiplier=mult;}else e.pressureMoveMultiplier=1;});
    try{return old.updateEnemies(dt);}finally{for(const[e,speed]of saved)e.speed=speed;}
  };

  function activeAttackers(){return (g.state?.enemies||[]).filter(isEngaged).length;}
  function activeRepairers(){return (g.state?.crew||[]).filter(repairingDestroyed);}
  function tickSurvival(step){
    const s=g.state;if(!s||!(step>0))return;
    for(const car of s.cars){
      car.rubbleCoverLeft=Math.max(0,(car.rubbleCoverLeft||0)-step);
      car.restoredProtectionLeft=Math.max(0,(car.restoredProtectionLeft||0)-step);
      car.recoveryFlash=Math.max(0,(car.recoveryFlash||0)-step);
      if(car.hp>0)car._survivalBreakActive=false;
    }
    for(const c of s.crew)c.emergencyCoverLeft=Math.max(0,(c.emergencyCoverLeft||0)-step);
    const r=ensureRecord();if(r){
      const attackers=activeAttackers(),repairers=activeRepairers();
      r.maxConcurrentAttackers=Math.max(r.maxConcurrentAttackers,attackers);
      if(repairers.length){r.repairSeconds+=step;r.repairCrewSeconds+=step*repairers.length;}
    }
  }
  if(old.update)g.update=function(dt){
    const active=this.mode==='battle'&&this.state?.battle&&this.state.speed>0;
    const step=active?dt*this.state.speed:0,result=old.update(dt);
    if(step>0)tickSurvival(step);
    return result;
  };

  function initMetrics(){ensureRecord();g.syncAllCrewMaxHp(true);}
  if(old.startBattle)g.startBattle=function(...args){const result=old.startBattle(...args);initMetrics();return result;};
  if(old.startBoss)g.startBoss=function(...args){const result=old.startBoss(...args);initMetrics();return result;};
  function finalizeMetrics(){const r=ensureRecord(),s=g.state;if(!r||!s)return;r.finalAverageHull=s.cars.length?s.cars.reduce((n,c)=>n+clamp(c.hp/c.maxHp,0,1),0)/s.cars.length:0;r.maxConcurrentAttackers=Math.max(r.maxConcurrentAttackers,activeAttackers());}
  if(old.battleClear)g.battleClear=function(...args){finalizeMetrics();return old.battleClear(...args);};
  if(old.bossClear)g.bossClear=function(...args){finalizeMetrics();return old.bossClear(...args);};
  if(old.gameOver)g.gameOver=function(...args){finalizeMetrics();return old.gameOver(...args);};

  function statusForCrew(c){
    const car=carOf(c);if(!car||c.dead||c.hp<=0||c.moving)return null;
    if((c.emergencyCoverLeft||0)>0)return{label:'비상 엄폐!',cls:'emergency',title:`${c.emergencyCoverLeft.toFixed(1)}초 동안 피해 무효`};
    if(car.hp<=0&&(car.rubbleCoverLeft||0)>0)return{label:'엄폐',cls:'cover',title:`원거리 피해 ${Math.round(C.rubbleRangedDamageReduction*100)}% 감소 · ${car.rubbleCoverLeft.toFixed(1)}초`};
    if(repairingDestroyed(c))return{label:'수리 엄폐',cls:'repair',title:`수리 중 원거리 피해 ${Math.round(C.repairRangedDamageReduction*100)}% 감소`};
    return null;
  }
  if(old.renderCars)g.renderCars=function(...args){
    this.syncAllCrewMaxHp(true);const result=old.renderCars(...args);if(!this.state)return result;
    document.querySelectorAll('#train-cars [data-crew]').forEach(el=>el.querySelector('.survival-status')?.remove());
    for(const c of this.state.crew){const st=statusForCrew(c),el=document.querySelector(`#train-cars [data-crew="${CSS.escape(c.id)}"]`);if(!st||!el)continue;const badge=document.createElement('span');badge.className=`survival-status ${st.cls}`;badge.textContent=st.label;badge.title=st.title;el.append(badge);}
    document.querySelectorAll('#train-cars [data-car-index]').forEach(el=>{const car=this.state.cars[Number(el.dataset.carIndex)];el.classList.toggle('restored-protection',(car?.restoredProtectionLeft||0)>0);});
    return result;
  };
  if(old.crewHTML)g.crewHTML=function(c,...args){
    this.syncCrewMaxHp(c,true);let html=old.crewHTML(c,...args);const st=statusForCrew(c),bonus=this.crewExpectedMaxHp(c)-B.crew.maxHp;
    html+=`<p class="fineprint">최대 HP 성장: 기본 ${B.crew.maxHp}${bonus>0?` + 누적 성장 ${bonus}`:''} · 레벨당 +${C.crewHpPerLevel}</p>`;
    if(st)html+=`<p class="positive"><b>${st.label}</b> · ${st.title}</p>`;
    return html;
  };
  if(old.inspectCar)g.inspectCar=function(i,...args){const result=old.inspectCar(i,...args),car=this.state?.cars?.[i],ins=$('#inspector');if(ins&&car&&(car.restoredProtectionLeft||0)>0)ins.insertAdjacentHTML('beforeend',`<p class="positive">복구 보호 · ${car.restoredProtectionLeft.toFixed(1)}초 · 객차 피해 ${Math.round(C.restoredCarDamageReduction*100)}% 감소</p>`);return result;};

  if(old.draw&&A)g.draw=function(...args){
    const result=old.draw(...args),s=this.state;if(!s||this.mode==='menu')return result;const ctx=this.ctx;
    ctx.save();ctx.textAlign='center';ctx.font='bold 12px sans-serif';
    s.cars.forEach((car,i)=>{const p=A.getCarPosition?.(i);if(!p)return;
      if(car.hp<=0&&(car.rubbleCoverLeft||0)>0){ctx.fillStyle='#91c9bd33';ctx.strokeStyle='#91c9bd';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y-8,52,34,0,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#d8eee8';ctx.fillText(`엄폐 ${Math.ceil(car.rubbleCoverLeft)}s`,p.x,p.y-52);}
      if((car.restoredProtectionLeft||0)>0){ctx.strokeStyle='#9de4c3';ctx.lineWidth=3;ctx.globalAlpha=.45+.25*Math.sin((A.visualClock||0)*8);ctx.beginPath();ctx.ellipse(p.x,p.y-8,58,39,0,0,Math.PI*2);ctx.stroke();ctx.globalAlpha=1;}
    });ctx.restore();return result;
  };

  const style=document.createElement('style');style.textContent=`
    #train-cars [data-crew]{position:relative}
    .survival-status{position:absolute;left:50%;top:-17px;transform:translateX(-50%);z-index:8;padding:2px 5px;border:1px solid #8fb9af;border-radius:4px;background:#102427e8;color:#d8eee8;font-size:9px;font-weight:800;line-height:1;white-space:nowrap;pointer-events:none}
    .survival-status.emergency{border-color:#efc66e;color:#ffe6a7;background:#3b2b16ed}
    .survival-status.repair{border-color:#8ddba3;color:#baf0c8}
    #train-cars .restored-protection{filter:drop-shadow(0 0 5px #8ddbb777)}
  `;document.head.append(style);

  // Existing checkpoints and imported 0.6/0.7 saves are upgraded lazily without
  // changing saveFormatVersion. Missing HP stays missing; earned max HP is restored.
  const firstSync=()=>{if(g.state)g.syncAllCrewMaxHp(true);};
  queueMicrotask(firstSync);
})();
