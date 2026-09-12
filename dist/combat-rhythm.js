/* Phase budgets own spawning; the director only adjusts timing, never live enemy stats. */
(() => {
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,C=window.COMBAT_CONFIG,A=window.LAST_RAIL_SCENE;
  const $=s=>document.querySelector(s),clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),pick=a=>a[Math.floor(Math.random()*a.length)];
  const old={};for(const k of ['startBattle','startBoss','spawnEnemy','updateSpawns','updateEnemies','enemyAttack','update','draw','damageEnemy','fireTurret','renderCars','battleClear','bossClear','gameOver','executeFocus','executeCommand','executeArmor','moveCrew','swapCrew','setCarPower'])old[k]=g[k].bind(g);
  const role=id=>D.ENEMIES[id]?.tags||['PRESSURE'];
  const major=id=>role(id).some(t=>t!=='PRESSURE');
  const crisis=p=>p&&(p.kind==='CRISIS'||p.kind==='FINAL');

  const callout=document.createElement('div');callout.className='command-callout';callout.hidden=true;callout.setAttribute('role','status');document.body.append(callout);
  let visualParticles=[],commandLeft=0,engineClock=0,alarmClock=0,metalClock=0;

  function startRecord(){const s=g.state;if(!s.combatHistory){try{const history=JSON.parse(localStorage.getItem('lastRailCombatReports')||'[]');s.combatHistory=Array.isArray(history)?history.slice(-C.historyLimit):[];}catch{s.combatHistory=[];}}s.combatRecord={stage:s.stageIndex+1,boss:!!s.battle.boss,elite:s.battle.elite,carDamage:0,crewDamage:0,destroyedCars:0,incapacitatedCrew:0,crewDeaths:0,focus:0,command:0,armor:0,moves:0,power:0,startTitan:s.titanDistance,worst:{score:0,time:0},targets:s.stageIndex<2?C.actionTargets.early:C.actionTargets.normal};s.attackWindups=[];visualParticles=[];}
  function finishRecord(outcome){const s=g.state,r=s?.combatRecord;if(!r||r.finished)return;r.finished=true;s.attackWindups=[];r.outcome=outcome;r.duration=s.battle?.elapsed||0;r.titanDelta=s.titanDistance-r.startTitan;r.unmetTargets=Object.entries(r.targets).filter(([k,v])=>r[k]<v).map(([k])=>k);s.combatHistory.push({...r});if(s.combatHistory.length>C.historyLimit)s.combatHistory.shift();g.lastCombatReport=r;try{localStorage.setItem('lastRailCombatReports',JSON.stringify(s.combatHistory));}catch{}}
  g.startBattle=function(...args){old.startBattle(...args);const b=this.state.battle,stage=this.state.stageIndex+1,index=Math.min(stage-1,C.budgets.length-1),elite=b.elite;
    const custom=C.stageOverrides[this.state.actId]?.[stage]||{},plan=custom.phases||(elite?C.phases.elite:stage>=C.lateStage?C.phases.late:C.phases.normal),totalDuration=(custom.duration??C.durations[Math.min(index,C.durations.length-1)])*(elite?C.eliteDuration:1),budget=(custom.budget??C.budgets[index])*(elite?C.eliteBudget:1)*C.swarm.budgetMultiplier;
    b.rhythm={stage,budget,clock:0,spent:0,index:-1,queue:[],templates:[],phase:null,phases:plan.map(([kind,ratio,share])=>({kind,duration:clamp(totalDuration*ratio,...C.phaseBounds[kind]),budget:budget*share,spent:0}))};
    b.duration=b.rhythm.phases.reduce((n,p)=>n+p.duration,0);b.spawnLeft=1;startRecord();this.beginCombatPhase();
  };
  g.startBoss=function(...args){old.startBoss(...args);startRecord();};
  g.bossWaveInterval=()=>C.swarm.intervalMin+Math.random()*(C.swarm.intervalMax-C.swarm.intervalMin);
  g.spawnBossWave=function(id){const alive=this.state.enemies.filter(e=>!e.dead),room=Math.min(B.battle.maxAlive-alive.length,...role(id).filter(t=>C.tagCaps[t]).map(t=>C.tagCaps[t]-alive.filter(e=>role(e.type).includes(t)).length));if(room<C.swarm.min)return;const count=Math.min(room,C.swarm.min+Math.floor(Math.random()*(C.swarm.max-C.swarm.min+1)));for(let i=0;i<count;i++)this.spawnEnemy(id);};
  g.spawnEnemy=function(id){if(this.state.battle?.boss){const alive=this.state.enemies.filter(e=>!e.dead);if(alive.length>=B.battle.maxAlive||role(id).some(tag=>C.tagCaps[tag]&&alive.filter(e=>role(e.type).includes(tag)).length>=C.tagCaps[tag]))return;}return old.spawnEnemy(id);};
  g.threatStatus=function(exclude){const s=this.state,alive=s.enemies.filter(e=>!e.dead),destroyed=s.cars.filter(c=>c.hp<=0).length,ko=s.crew.filter(c=>!c.dead&&c.hp<=0).length;
    const boarders=alive.filter(e=>e!==exclude&&e.boarded).length,armored=alive.filter(e=>e!==exclude&&e.majorActive).length,windups=(s.attackWindups||[]).filter(w=>w.owner!==exclude&&!w.owner.dead&&!w.owner.destroyed).length;
    return {integrity:s.cars.reduce((n,c)=>n+c.hp/c.maxHp,0)/s.cars.length,destroyed,ko,boarders,major:destroyed+ko+boarders+armored+windups,titan:s.titanDistance<=B.titan.critical};
  };
  g.threatLimit=function(){const s=this.state,r=s.battle?.rhythm,stage=s.stageIndex+1;let limit=C.limits[Math.min(stage-1,C.limits.length-1)];if(crisis(r?.phase)&&r.clock-r.phase.start<C.burstSeconds){if(stage>=C.midStage)limit=Math.max(limit,3);if(s.battle.elite&&stage>=C.lateStage)limit=C.lateEliteLimit;}return limit;};
  g.allowMajorThreat=function(e){const r=this.state.battle?.rhythm;if(r?.phase?.kind==='RECOVERY')return false;return this.threatStatus(e).major<this.threatLimit();};
  g.beginCombatPhase=function(){const b=this.state.battle,r=b.rhythm;if(++r.index>=r.phases.length)return;const p=r.phases[r.index];r.phase=p;p.start=r.clock??b.elapsed;p.end=p.start+p.duration;
    const pool=Object.entries(D.ENEMIES).filter(([,d])=>(d.rhythmMinStage??d.fromStage)<=r.stage&&(!d.stageMax||r.stage<=d.stageMax)&&d.threatCost>0);
    let template=null;if(crisis(p)){let choices=C.templates.filter(t=>t.min<=r.stage&&t.id!==r.templates.at(-1));if(r.stage===1&&r.index===2)choices=choices.filter(t=>t.id==='boarding');if(!choices.length)choices=C.templates.filter(t=>t.min<=r.stage);template=pick(choices);r.templates.push(template.id);p.template=template;}
    const allowed=pool.filter(([id,d])=>template?d.tags.some(tag=>template.tags.includes(tag)):!major(id));let budget=p.budget,entries=[];
    const add=([id,d])=>{entries.push({type:id,cost:d.threatCost,tags:d.tags,phase:r.index,role:d.tags[0],side:d.boards&&Math.random()<C.director.leftEntryChance?'left':'horizon',lane:.25+Math.random()*.48,adjusted:false});budget-=d.threatCost;};
    if(template){for(const tag of template.tags.filter(t=>t!=='PRESSURE')){const options=allowed.filter(([,d])=>d.tags.includes(tag)&&d.threatCost<=budget);if(options.length)add(pick(options));}}
    while(true){let options=allowed.filter(([,d])=>d.threatCost<=budget&&(entries.length||budget-d.threatCost>=Math.min(...allowed.map(([,x])=>x.threatCost))));if(!options.length)break;const special=Math.random()<(b.elite?C.director.eliteSpecialChance:C.director.specialChance),preferred=options.filter(([id])=>major(id)===special);add(pick(preferred.length?preferred:options));}
    const baseInterval=p.duration/Math.max(1,entries.length/C.swarm.budgetMultiplier);let at=Math.max(p.start,r.nextGroupAt||0),group=0;
    while(entries.length){let size=Math.min(entries.length,C.swarm.min+Math.floor(Math.random()*(C.swarm.max-C.swarm.min+1)));if(entries.length-size===1)size=size<C.swarm.max?size+1:size-1;const members=entries.splice(0,size),counts={};members.forEach((e,i)=>{if(e.tags.some(tag=>C.tagCaps[tag]&&(counts[tag]||0)>=C.tagCaps[tag])){const replacement=pool.find(([,d])=>d.tags.every(t=>t==='PRESSURE')&&d.threatCost<=e.cost);if(replacement){e.type=replacement[0];e.cost=replacement[1].threatCost;e.tags=replacement[1].tags;e.role='PRESSURE';}}e.tags.forEach(tag=>counts[tag]=(counts[tag]||0)+1);e.at=at;e.group=`${r.index}-${group}`;if(template?.split){e.side=i%2?'left':'horizon';e.lane=i%2?.3:.7;}r.queue.push(e);});group++;at+=baseInterval*(C.swarm.intervalMin+Math.random()*(C.swarm.intervalMax-C.swarm.intervalMin));}r.nextGroupAt=at;

  };
  g.updateSpawns=function(dt){const b=this.state.battle,r=b.rhythm;if(!r)return old.updateSpawns(dt);
    if(b.elapsed>=b.duration){if(!r.routeEnded){r.routeEnded=true;r.queue=[];this.state.enemies=this.state.enemies.filter(e=>!e.dead&&this.enemyOnScreen(e));this.state.attackWindups=(this.state.attackWindups||[]).filter(w=>this.state.enemies.includes(w.owner));}b.spawnLeft=0;return;}
    const empty=!this.state.enemies.some(e=>!e.dead&&this.enemyOnScreen(e));r.clock+=dt*(empty?C.emptyFieldClock:1);
    if(r.clock>=r.phase.end&&r.index<r.phases.length-1)this.beginCombatPhase();
    // After the authored queue ends, only light patrols fill remaining route time.
    if(empty&&r.queue.length===0&&r.index===r.phases.length-1&&r.clock>=(r.nextEmptyWave||0)){
      const count=C.swarm.min+Math.floor(Math.random()*(C.swarm.max-C.swarm.min+1)),type=C.emptyReinforcement.type;
      if(this.state.enemies.filter(e=>!e.dead).length+count<=B.battle.maxAlive){for(let i=0;i<count;i++)this.spawnEnemy(type);r.reinforcementCost=(r.reinforcementCost||0)+count*D.ENEMIES[type].threatCost;r.nextEmptyWave=r.clock+C.emptyReinforcement.interval;}
    }
    const status=this.threatStatus(),severe=status.integrity<C.director.lowIntegrity||status.destroyed>=C.director.destroyed||status.ko>=C.director.incapacitated||status.titan;
    r.queue.sort((a,b)=>a.at-b.at);
    for(const id of [...new Set(r.queue.map(e=>e.group))]){
      const batch=r.queue.filter(e=>e.group===id),first=batch[0],special=batch.some(e=>major(e.type)),alive=this.state.enemies.filter(e=>!e.dead);
      if(!first.adjusted){let shift=0;if(special&&(severe||status.major>=this.threatLimit()))shift=Math.min(C.director.delaySeconds,r.phases[first.phase].duration*C.director.maxAdjustment);else if(!special&&status.integrity>=C.director.stableIntegrity&&!status.major)shift=-Math.min(C.director.advanceSeconds,r.phases[first.phase].duration*C.director.maxAdjustment);batch.forEach(e=>{e.at+=shift;e.adjusted=true;});}
      if(first.at>r.clock||r.clock<(r.lastSpawnAt??-Infinity)+(r.lastSpawnGap||0)||alive.length+batch.length>B.battle.maxAlive)continue;
      if(special&&r.phase.kind==='RECOVERY')continue;
      const blocked=Object.entries(C.tagCaps).some(([tag,cap])=>alive.filter(e=>role(e.type).includes(tag)).length+batch.filter(e=>e.tags.includes(tag)).length>cap);
      if(blocked)continue;
      if(special&&r.stage<=C.director.earlyStage&&new Set([...alive.filter(e=>major(e.type)).map(e=>e.type),...batch.filter(e=>major(e.type)).map(e=>e.type)]).size>C.director.earlySpecialTypes)continue;
      for(const item of batch){this.spawnEnemy(item.type);const enemy=this.state.enemies.at(-1);enemy.y=item.lane;enemy.entrySide=item.side;if(item.side==='left'){enemy.x=C.director.leftEntryDistance;enemy.entryStart=enemy.x;}enemy.spawnRole=item.role;r.spent+=item.cost;r.phases[item.phase].spent+=item.cost;r.queue.splice(r.queue.indexOf(item),1);}
      r.lastSpawnAt=r.clock;r.lastSpawnGap=r.phases[first.phase].duration/Math.max(1,r.phases[first.phase].budget/C.swarm.budgetMultiplier/D.ENEMIES.biker.threatCost)*C.swarm.intervalMin;break;
    }
    b.spawnLeft=r.queue.length+(b.elapsed<b.duration?1:0);
  };

  // Telegraph major attacks, then release their projectile only after the countdown.
  g.enemyAttack=function(e){const tags=role(e.type),tag=tags.find(t=>C.windup[t])||(!e.type?'BOSS':null);if(!tag||e.boarded)return old.enemyAttack(e);
    const owner=e.id?e:(this.state.battle.parts||[]).find(p=>p.type==='cannon'&&!p.destroyed)||(this.state.battle.parts||[]).find(p=>p.victory&&!p.destroyed);
    if(!owner||this.state.attackWindups?.some(w=>w.owner===owner)||!this.allowMajorThreat(owner))return;
    this.state.attackWindups??=[];this.state.attackWindups.push({owner,attack:e,left:C.windup[tag],total:C.windup[tag]});this.playSound('alarm');
  };
  g.updateEnemies=function(dt){old.updateEnemies(dt);const s=this.state;for(const e of s.enemies){if(!e.dead&&role(e.type).includes('ARMOR')&&e.x<B.targeting.medium&&!e.majorActive&&this.allowMajorThreat(e))e.majorActive=true;}
    s.attackWindups??=[];for(const w of s.attackWindups){if(w.owner.dead||w.owner.destroyed)continue;w.left-=dt;if(w.left<=0)old.enemyAttack(w.attack);}s.attackWindups=s.attackWindups.filter(w=>w.left>0&&!w.owner.dead&&!w.owner.destroyed);
  };
  function burst(point,color,count=C.feedback.particleCount){for(let i=0;i<count;i++){const angle=Math.random()*Math.PI*2,speed=35+Math.random()*160;visualParticles.push({x:point.x/g.view.w,y:point.y/g.view.h,vx:Math.cos(angle)*speed/g.view.w,vy:Math.sin(angle)*speed/g.view.h,life:C.feedback.particleSeconds,total:C.feedback.particleSeconds,color,size:2+Math.random()*4});}if(visualParticles.length>C.feedback.maxParticles)visualParticles.splice(0,visualParticles.length-C.feedback.maxParticles);}
  function announce(text){callout.textContent=text;callout.hidden=false;commandLeft=C.feedback.commandSeconds;g.playSound('commandRise');}
  g.onBoarding=function(e){this.playSound('boardingAlarm');};
  g.onHullImpact=function(ci,before){const s=this.state,car=s.cars[ci],r=s.combatRecord,damage=before.car-car.hp;if(damage>0){car.impactPulse=C.feedback.recoilSeconds;const p=A.getCarPosition(ci);if(p)burst(p,'#ff9a79',Math.ceil(C.feedback.particleCount/2));this.playSound('metal');}
    if(!r||r.finished)return;r.carDamage+=Math.max(0,damage);if(before.car>0&&car.hp<=0)r.destroyedCars++;
    for(const prev of before.crew){const c=s.crew.find(c=>c.id===prev.id);if(!c)continue;r.crewDamage+=Math.max(0,prev.hp-c.hp);if(prev.hp>0&&c.hp<=0)r.incapacitatedCrew++;if(!prev.dead&&c.dead)r.crewDeaths++;}
  };
  g.damageEnemy=function(e,...args){const alive=!e.dead&&!e.destroyed;old.damageEnemy(e,...args);if(alive&&(e.dead||e.destroyed)){burst(A.project(e,this.view.w,this.view.h),'#ffd09b');this.playSound('explosion');this.playSound('debris');}else if(alive)this.playSound('metal');};
  g.fireTurret=function(eq,...args){old.fireTurret(eq,...args);eq.recoil=C.feedback.recoilSeconds;const svg=$(`[data-equipment="${eq.id}"] svg`);if(svg&&!matchMedia('(prefers-reduced-motion: reduce)').matches)svg.animate([{transform:`translateY(${C.feedback.recoilPixels}px)`},{transform:'translateY(0)'}],{duration:C.feedback.recoilSeconds*1000});this.playSound(D.TURRETS[eq.type].damage>30?'cannonBass':'shotCrack');};
  for(const [method,key] of [['executeFocus','focus'],['executeCommand','command'],['executeArmor','armor']])g[method]=function(...args){const s=this.state,before=key==='armor'?s.armorCharge:s.orders[key].cooldown;old[method](...args);const success=key==='armor'?s.armorCharge<before:s.orders[key].cooldown>before;if(success){if(s.combatRecord&&!s.combatRecord.finished)s.combatRecord[key]++;callout.classList.remove('danger');announce({focus:'집중 사격 · 목표 제압',command:'열차장 직접 지휘',armor:'비상 장갑 · 방어 전개'}[key]);}};
  g.moveCrew=function(id,...args){const c=this.state.crew.find(c=>c.id===id),was=c?.moving;old.moveCrew(id,...args);if(!was&&c?.moving&&this.state.combatRecord&&!this.state.combatRecord.finished)this.state.combatRecord.moves++;};
  g.swapCrew=function(...args){const result=old.swapCrew(...args);if(result&&this.mode==='battle'&&this.state.combatRecord&&!this.state.combatRecord.finished)this.state.combatRecord.moves+=2;return result;};
  g.setCarPower=function(ci,...args){const before=this.state.cars[ci]?.power;old.setCarPower(ci,...args);if(before!==this.state.cars[ci]?.power&&this.mode==='battle'&&this.state.combatRecord&&!this.state.combatRecord.finished)this.state.combatRecord.power++;};
  g.battleClear=function(...args){finishRecord('clear');return old.battleClear(...args);};
  g.bossClear=function(...args){finishRecord('boss-clear');return old.bossClear(...args);};
  g.gameOver=function(...args){finishRecord('defeat');return old.gameOver(...args);};

  g.update=function(dt){const active=this.mode==='battle'&&!$('#overlay').classList.contains('show'),step=active?dt*(this.state?.speed||0):0;old.update(dt);const s=this.state;if(!s){callout.hidden=true;visualParticles=[];return;}
    if(step>0){for(const car of s.cars){car.impactPulse=Math.max(0,(car.impactPulse||0)-step);for(const eq of car.equipment){eq.recoil=Math.max(0,(eq.recoil||0)-step);if(eq.overheated&&!eq.wasHot)this.playSound('heatHiss');eq.wasHot=eq.overheated;}}
      visualParticles.forEach(p=>{p.life-=step;p.x+=p.vx*step;p.y+=p.vy*step;p.vy+=step*.1;});visualParticles=visualParticles.filter(p=>p.life>0);
      commandLeft-=step;if(commandLeft<=0)callout.hidden=true;const status=this.threatStatus(),score=status.major+(1-status.integrity)*3+(status.titan?2:0),r=s.combatRecord;
      if(r&&!r.finished&&score>r.worst.score)r.worst={score,time:s.battle.elapsed,...status};
      engineClock+=step;alarmClock+=step;metalClock+=step;
      if(engineClock>C.feedback.engineInterval){engineClock=0;this.playSound('engine');}
      const danger=status.boarders||status.titan||s.cars.some(c=>c.hp/c.maxHp<C.feedback.criticalHull)||s.cars.some(c=>c.equipment.some(e=>e.overheated));
      if(danger&&alarmClock>C.feedback.alarmInterval){alarmClock=0;this.playSound('alarm');}
      if(status.major&&metalClock>C.feedback.metalInterval){metalClock=0;this.playSound('rail');}
    }

    if(this.mode!=='battle')callout.hidden=true;
  };
  g.renderCars=function(){old.renderCars();if(!this.state)return;this.state.cars.forEach((car,i)=>{const el=$(`[data-car-index="${i}"]`);if(!el)return;el.classList.toggle('hull-critical',car.hp>0&&car.hp/car.maxHp<C.feedback.criticalHull);el.classList.toggle('boarding-danger',this.state.enemies.some(e=>!e.dead&&e.boarded&&e.targetCar===i));el.classList.toggle('hull-impact',car.impactPulse>0);
    for(const eq of car.equipment){const button=$(`[data-equipment="${eq.id}"]`);if(!button)continue;button.classList.toggle('overheated',eq.overheated);button.classList.toggle('heat-warning',eq.heat/B.heat.max>C.feedback.hotRatio);button.style.setProperty('--recoil',`${(eq.recoil||0)/C.feedback.recoilSeconds*C.feedback.recoilPixels}px`);button.setAttribute('title',eq.overheated?'과열 · 냉각 중':eq.kind==='turret'?`발열 ${Math.round(eq.heat)} / ${B.heat.max}`:D.MODULES[eq.type].name);}
  });};
  g.draw=function(){old.draw();const s=this.state;if(!s||this.mode==='menu')return;const ctx=this.ctx,w=this.view.w,h=this.view.h,t=A.visualClock,low=matchMedia('(prefers-reduced-motion: reduce)').matches;ctx.save();
    // Persistent rail dust and rolling foreground debris follow the shared visual clock.
    if(!low){for(let i=0;i<C.feedback.dustCount;i++){const x=((i*113-t*460)%w+w)%w,y=h*(.86+(i%4)*.018);ctx.fillStyle='#c8b69535';ctx.beginPath();ctx.ellipse(x,y,8+i%5*4,2+i%3,0,0,Math.PI*2);ctx.fill();}
      for(let i=0;i<C.feedback.tumbleCount;i++){const x=((i*w/C.feedback.tumbleCount-t*280)%(w+100)+w+100)%(w+100)-50,y=h*.77+Math.sin(t*5+i)*9;ctx.save();ctx.translate(x,y);ctx.rotate(-t*6);ctx.strokeStyle='#ad987366';for(let k=0;k<3;k++){ctx.beginPath();ctx.ellipse(0,0,13,5,k*Math.PI/3,0,Math.PI*2);ctx.stroke();}ctx.restore();}}
    s.cars.forEach((car,i)=>{const p=A.getCarPosition(i);if(!p)return;if(car.hp<=0||car.hp/car.maxHp<C.feedback.criticalHull){for(let n=0;n<C.feedback.smokeCount;n++){const age=(t+n*C.feedback.smokeCycle/C.feedback.smokeCount)%C.feedback.smokeCycle;ctx.globalAlpha=(1-age/C.feedback.smokeCycle)*.4;ctx.fillStyle=car.hp<=0?'#111d23':'#76685e';ctx.beginPath();ctx.arc(p.x-age*24,p.y-30-age*38,8+age*13,0,Math.PI*2);ctx.fill();}ctx.globalAlpha=1;}
      for(const eq of car.equipment){if(eq.overheated){ctx.fillStyle='#f0ecec66';ctx.fillRect(p.x+Math.sin(t*6)*8,p.y-65,3,14);}if(eq.recoil>0){ctx.fillStyle='#fff0a6';ctx.globalAlpha=eq.recoil/C.feedback.recoilSeconds;ctx.beginPath();ctx.arc(p.x,p.y-48,12*ctx.globalAlpha,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;}}
      if(car.armor>0){ctx.strokeStyle='#8bffc0';ctx.fillStyle='#60efa91c';ctx.lineWidth=4;ctx.beginPath();ctx.ellipse(p.x,p.y,85,65,0,0,Math.PI*2);ctx.fill();ctx.stroke();}
    });
    for(const p of visualParticles){ctx.globalAlpha=clamp(p.life/p.total,0,1);ctx.fillStyle=p.color;ctx.fillRect(p.x*w,p.y*h,p.size,p.size);}ctx.globalAlpha=1;
    for(const wind of s.attackWindups||[]){const p=A.project(wind.owner,w,h),car=A.getCarPosition(wind.attack.targetCar);ctx.strokeStyle='#ff6b6b';ctx.lineWidth=2;ctx.setLineDash([6,5]);ctx.beginPath();ctx.moveTo(p.x,p.y);if(car)ctx.lineTo(car.x,car.y);ctx.stroke();ctx.setLineDash([]);ctx.beginPath();ctx.arc(p.x,p.y,p.r+10,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-wind.left/wind.total));ctx.stroke();ctx.fillStyle='#ffb4b4';ctx.font='bold 13px sans-serif';}
    const focus=s.orders.focus;if(focus.active>0){const target=[...s.enemies,...(s.battle?.parts||[])].find(e=>e.id===focus.target&&!e.dead&&!e.destroyed);if(target){const p=A.project(target,w,h);ctx.strokeStyle='#91ffb1';ctx.lineWidth=3;ctx.beginPath();ctx.arc(p.x,p.y,p.r+16,0,Math.PI*2);ctx.moveTo(p.x-p.r-25,p.y);ctx.lineTo(p.x+p.r+25,p.y);ctx.moveTo(p.x,p.y-p.r-25);ctx.lineTo(p.x,p.y+p.r+25);ctx.stroke();}}
    if(s.titanDistance<B.titan.warning){ctx.globalAlpha=low?.2:.18+Math.sin(t*5)*.07;ctx.fillStyle='#ff3939';ctx.fillRect(0,0,8,h);ctx.fillRect(w-8,0,8,h);}ctx.restore();
  };
})();
