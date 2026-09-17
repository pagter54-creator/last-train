/* Boss state machines. Legacy encounter timers/grabs are deliberately not reused. */
(() => {
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,C=window.BOSS_REWORK,A=window.LAST_RAIL_SCENE;
  const old={};for(const k of ['startBoss','updateBoss','damageEnemy','targetInRange','executeFocus','executeArmor','effectiveCarPower','crewForCar','trainDisruptionMultiplier','moveCrew','swapCrew','inspectEnemy','enemyAttack','checkBattleState','pickTurretTarget'])if(g[k])old[k]=g[k].bind(g);
  const active=()=>g.mode==='battle'&&g.state?.battle?.rework;
  const alive=e=>e&&!e.dead&&!e.destroyed;
  const pick=a=>a[Math.floor(Math.random()*a.length)];
  const equipmentLevel=eq=>Math.max(1,Number(eq?.level)||1);
  const carEquipmentLevel=car=>(car?.equipment||[]).reduce((sum,eq)=>sum+equipmentLevel(eq),0);
  const bossTargetWeight=entry=>1+Math.min(.10,carEquipmentLevel(entry.c)*.01);
  const weightedPick=entries=>{if(!entries?.length)return null;const weights=entries.map(bossTargetWeight),total=weights.reduce((a,b)=>a+b,0);let roll=Math.random()*total;for(let i=0;i<entries.length;i++){roll-=weights[i];if(roll<=0)return entries[i];}return entries.at(-1);};
  g.pickBossTargetCar09=function(entries){return weightedPick(entries)?.i;};
  g.bossTargetWeight09=bossTargetWeight;
  function turretOrdinal(eq,ci){let n=0;for(let i=0;i<g.state.cars.length;i++)for(const item of g.state.cars[i].equipment||[])if(item.kind==='turret'){if(item===eq)return n;n++;}return Math.max(0,ci||0);}
  function ruleDamage(car,rule,legacyValue=1){if(!car||!rule)return 0;const scale=rule.legacyBase?Math.max(0,legacyValue)/rule.legacyBase:1;if(rule.type==='max')return car.maxHp*(rule.rate??rule.ratePerSecond??0)*scale;if(rule.type==='current')return Math.max(car.hp*(rule.rate||0),car.maxHp*(rule.min||0))*scale;return 0;}
  const grips=()=>active()?g.state.battle.parts.filter(p=>alive(p)&&p.grip>0):[];
  const core=()=>g.state.battle.parts.find(p=>p.victory);
  const nonCoreParts=b=>b.parts.filter(p=>!p.victory);
  const allPartsDown=b=>nonCoreParts(b).length>0&&nonCoreParts(b).every(p=>p.destroyed);
  const warn=text=>{g.state.battle.notice=text;g.state.battle.noticeLeft=C.noticeSeconds;g.playSound('alarm');};
  function reviveAllParts(b){for(const p of nonCoreParts(b)){if(p.grip>0)release(p);p.destroyed=false;p.hp=p.maxHp;p.repairLeft=0;p.windup=null;p.rest=C.armRest;p.stun=0;}b.allPartsDownLatched=false;g.playSound('upgrade');}
  function forceCoreOpen(b){
    if(b.allPartsDownLatched)return;
    b.allPartsDownLatched=true;
    b.forcedCoreOpen=true;
    b.repairCycleLeft=0;
    b.coreLeft=Math.max(b.coreLeft,C.core.forcedSeconds);
    b.coreTimer=C.core.interval;
    warn('ALL PARTS DESTROYED · CORE FORCED OPEN!');
    g.playSound('steam');
  }
  function finishForcedCoreOpen(b){
    if(!b.forcedCoreOpen)return;
    b.forcedCoreOpen=false;
    b.coreTimer=C.core.interval;
    reviveAllParts(b);
    warn('EMERGENCY RECONSTRUCTION · ALL PARTS RESTORED!');
  }
  function startRepairCycle(b){
    b.repairCycleLeft=C.core.repairPattern.seconds;
    b.coreLeft=0;
    b.lastAutoWasRepair=true;
    warn('CORE SEALED · SYSTEM REPAIR CYCLE');
    g.playSound('upgrade');
  }
  function release(p){p.grip=0;p.gripLeft=0;if(Number.isFinite(p.baseArmor))p.armor=p.baseArmor;p.stun=C.armStun;p.rest=C.armRest;g.playSound('metal');}
  g.releaseBossGrip=release;
  function hull(ci,amount){const c=g.state.cars[ci];if(!c||c.hp<=0||c.armor>0)return;const before={car:c.hp,crew:g.state.crew.map(x=>({id:x.id,hp:x.hp,dead:x.dead}))};c.hp=Math.max(0,c.hp-(g.absorbHullDamage?.(ci,amount)??amount));c.hitFlash=D.BALANCE.feedback.carFlashSeconds;g.onHullImpact(ci,before);g.playSound('hull');}
  g.startBoss=function(id){old.startBoss(id);const b=this.state.battle;Object.assign(b,{rework:true,sharedHp:D.BOSSES[id].sharedHp,maxSharedHp:D.BOSSES[id].sharedHp,coreTimer:C.core.interval,coreLeft:0,forcedCoreOpen:false,repairCycleLeft:0,lastAutoWasRepair:false,patternTimer:C.firstPattern,patternIndex:0,phase:1,slowLeft:0,noticeLeft:0,arrivalLeft:C.arrivalSeconds,allPartsDownLatched:false,defeated:false,defeatFadeLeft:0});for(const p of b.parts)Object.assign(p,{bossPart:true,repairLeft:0,grip:0,rest:0,stun:0,baseArmor:p.armor});};
  g.targetInRange=function(e,r){if(e.bossPart){const b=g.state.battle;if(b?.arrivalLeft>0||b?.defeated||!alive(e)||e.victory&&!b.coreLeft)return false;if(e.grip>0)return r.min<=D.BALANCE.battle.boardDistance;}return old.targetInRange(e,r);};
  g.pickTurretTarget=function(ci,turret,eq){const chosen=old.pickTurretTarget(ci,turret,eq);if(!active()||!chosen?.bossPart)return chosen;const focus=this.state.orders.focus,parts=this.turretTargets?this.turretTargets(turret,eq).filter(e=>e.bossPart&&alive(e)):this.state.battle.parts.filter(p=>p.bossPart&&alive(p));if(focus.active>0&&focus.target){const forced=parts.find(p=>p.id===focus.target);if(forced)return forced;}if(parts.length<=1)return chosen;const n=turretOrdinal(eq,ci);return parts[n%parts.length]||chosen;};
  g.executeFocus=function(e){if(e.bossPart){const b=this.state.battle;if(b?.arrivalLeft>0){this.toast('보스가 전장에 진입 중입니다.');return;}if(b?.defeated)return;if(!alive(e)||e.victory&&!b.coreLeft){this.toast('CORE가 닫혀 있습니다. 다른 부위를 조준하세요.');return;}}return old.executeFocus(e);};
  g.damageEnemy=function(e,amount,pierce=0){
    if(!e?.bossPart)return old.damageEnemy(e,amount,pierce);
    const b=this.state.battle;if(!active()||b.arrivalLeft>0||b.defeated||!alive(e)||e.victory&&!b.coreLeft)return;
    const before=e.hp;old.damageEnemy(e,amount*(e.victory?C.core.damage:1),pierce);
    const dealt=Math.max(0,before-e.hp);b.sharedHp=Math.max(0,b.sharedHp-dealt);
    if(e.grip>0){e.grip=Math.max(0,e.grip-dealt*C.gripDamagePerHp);if(!e.grip)release(e);}
    if(e.destroyed&&!e.victory){e.repairLeft=e.regen*C.phases[b.phase-1].repair;e.windup=null;if(e.type==='drive')b.slowLeft=0;if(e.grip>0)release(e);}
    if(allPartsDown(b))forceCoreOpen(b);
    const c=core();c.hp=b.sharedHp;c.destroyed=b.sharedHp<=0;
  };
  g.bossCarSealed=ci=>grips().some(p=>p.car===ci&&p.type==='seal');
  const readout=g.turretReadout.bind(g),effectsHTML=g.carEffectsHTML.bind(g);
  g.turretReadout=function(eq,ci){const r=readout(eq,ci);if(this.bossCarSealed(ci)){r.active=false;for(const row of r.rows)if(['1회 피해','이론 DPS'].includes(row[0]))row[2]=0;}return r;};
  g.carEffectsHTML=function(ci){return effectsHTML(ci)+grips().filter(p=>p.car===ci).map(p=>`<p class="negative">${C.grips[p.type].name} 구속 · ${C.grips[p.type].help}</p>`).join('');};
  const moduleData=g.moduleData.bind(g);
  g.moduleData=function(eq){const m=moduleData(eq),ci=this.state?.cars.findIndex(c=>c.equipment.includes(eq))??-1;if(ci<0)return m;let factor=1;if(this.bossCarSealed(ci))factor=0;else if(grips().some(p=>p.car===ci&&p.type==='drain')){const power=this.state.cars[ci].power,levels=window.REVISION_CONFIG?.modulePower||[0,1,1.2,1.45],reduced=Math.max(Math.min(1,power),power-C.grips.drain.power);factor=levels[reduced]/(levels[power]||1);}for(const k of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(k in m)m[k]=1+(m[k]-1)*factor;if('extraPower'in m)m.extraPower*=factor;return m;};
  g.bossCrewStopped=c=>grips().some(p=>p.car===c.car&&['seal','suppress'].includes(p.type));
  g.crewForCar=function(ci){return old.crewForCar(ci).filter(c=>!this.bossCrewStopped(c));};
  g.effectiveCarPower=function(ci){const power=old.effectiveCarPower(ci);return grips().some(p=>p.car===ci&&p.type==='drain')?Math.max(Math.min(1,power),power-C.grips.drain.power):power;};
  g.trainDisruptionMultiplier=function(){return old.trainDisruptionMultiplier()*(active()&&this.state.battle.slowLeft>0?C.behemoth.drive.speed:1);};
  g.moveCrew=function(id,to){const c=this.state.crew.find(c=>c.id===id);if(c&&this.bossCrewStopped(c)){this.toast('구속된 팔을 해제해야 이동할 수 있습니다.');return;}return old.moveCrew(id,to);};
  if(old.swapCrew)g.swapCrew=function(a,b,...args){if(this.state.crew.some(c=>[a,b].includes(c.id)&&this.bossCrewStopped(c))){this.toast('구속 중에는 자리를 교환할 수 없습니다.');return;}return old.swapCrew(a,b,...args);};
  g.executeArmor=function(ci){const p=grips().find(p=>p.car===ci);if(p&&this.state.targetMode==='armor'&&this.state.armorCharge>=D.BALANCE.armor.maxCharge){this.state.armorCharge=0;this.state.cars[ci].armor=this.armorDuration?.()||D.BALANCE.armor.duration;release(p);A.cancelSelection();this.playSound('armor');this.renderAll();return;}return old.executeArmor(ci);};
  g.bossCrewReturnFire=function(c,dt){const p=grips().find(p=>p.car===c.car);if(!p||c.moving||c.dead||c.hp<=0)return false;c.bossShot=Math.max(0,(c.bossShot||0)-dt);if(c.bossShot>0)return true;const r=C.crew,combat=Math.max(0,this.effectiveStat(c,'combat')),hit=Math.random()<Math.min(r.hitMax,r.hitBase+combat*r.hitPerCombat),q=A.project(p,this.view.w,this.view.h);c.bossShot=r.interval;c.returnFireVisual={x:q.x/this.view.w,y:q.y/this.view.h,life:r.visualSeconds,hit};this.playSound('shot');if(hit){if(this.crewAttack)this.crewAttack(c,p,r.damageBase+combat*r.damagePerCombat,0);else this.damageEnemy(p,r.damageBase+combat*r.damagePerCombat,0);}return true;};
  g.enemyAttack=function(e){if(e.type==='infiltrationTruck')return;if(e?.bossBoarder09){const car=this.state.cars[e.targetCar];if(!car)return;const saved=e.carDamage;e.carDamage=ruleDamage(car,C.truck.damageRule,C.truck.carDamage);const r=old.enemyAttack(e);e.carDamage=saved;return r;}return old.enemyAttack(e);};
  function target(kind,occupied=[]){let choices=g.state.cars.map((c,i)=>({c,i})).filter(x=>x.c.hp>0&&!occupied.includes(x.i));if(g.state.battle.bossId==='arachne'&&(g.state.battle.phase<3||Math.random()>C.engineChance))choices=choices.filter(x=>x.i!==0);if(kind==='drain'){const powered=choices.filter(x=>g.effectiveCarPower(x.i)>=2);if(powered.length)choices=powered;}if(kind==='bay'){choices=choices.filter(x=>g.state.crew.some(c=>!c.dead&&c.hp>0&&c.car===x.i));if(!choices.length)return undefined;}else if(kind==='suppress'){const staffed=choices.filter(x=>g.state.crew.some(c=>!c.dead&&c.hp>0&&c.car===x.i));if(staffed.length)choices=staffed;}return weightedPick(choices)?.i;}
  function truck(p){const t=C.truck,b=g.state.battle;g.state.enemies.push({id:crypto.randomUUID(),type:'infiltrationTruck',name:'침투 트럭',hp:t.hp,maxHp:t.hp,armor:t.armor,speed:0,x:.9,y:p.y,targetCar:p.car,attackTimer:99,interval:99,carDamage:0,crewDamage:0,dead:false,boarded:false,truckTravel:0,origin:{x:p.x,y:p.y}});g.recordEncounter?.('enemies','infiltrationTruck');g.playSound('engine');}
  function deliver(e){const t=C.truck,count=t.boarders[0]+Math.floor(Math.random()*(t.boarders[1]-t.boarders[0]+1)),d=D.ENEMIES.boarder;for(let i=0;i<count;i++){const child={...d,id:crypto.randomUUID(),type:'boarder',hp:t.boarderHp,maxHp:t.boarderHp,carDamage:t.carDamage,crewDamage:t.crewDamage,x:D.BALANCE.battle.boardDistance,y:e.y,targetCar:e.targetCar,boarded:true,dead:false,attackTimer:d.interval||2,interval:d.interval||2,bossBoarder09:true};g.state.enemies.push(child);g.onBoarding?.(child);}e.dead=true;e.deathTime=0;g.playSound('boardingAlarm');}
  g.updateBoss=function(dt){if(!active())return old.updateBoss(dt);const b=this.state.battle;
    if(b.defeated){b.defeatFadeLeft=Math.max(0,b.defeatFadeLeft-dt);return;}
    b.noticeLeft=Math.max(0,b.noticeLeft-dt);
    if(b.arrivalLeft>0){b.arrivalLeft=Math.max(0,b.arrivalLeft-dt);return;}
    b.phase=C.phases.findIndex(p=>b.sharedHp/b.maxSharedHp>p.above)+1||3;const phase=C.phases[b.phase-1];b.slowLeft=Math.max(0,b.slowLeft-dt);
    b.coreTimer-=dt;
    const coreBefore=b.coreLeft;
    b.coreLeft=Math.max(0,b.coreLeft-dt);
    if(b.forcedCoreOpen&&coreBefore>0&&b.coreLeft<=0)finishForcedCoreOpen(b);
    if(b.repairCycleLeft>0)b.repairCycleLeft=Math.max(0,b.repairCycleLeft-dt);
    if(!b.forcedCoreOpen&&b.repairCycleLeft<=0&&b.coreTimer<=0){
      b.coreTimer=C.core.interval;
      const damaged=nonCoreParts(b).some(p=>p.destroyed||p.hp<p.maxHp-.01);
      const useRepair=damaged&&!b.lastAutoWasRepair&&Math.random()<C.core.repairPattern.chance;
      if(useRepair)startRepairCycle(b);else{b.lastAutoWasRepair=false;b.coreLeft=C.core.seconds;warn('CORE OPEN · 코어에 집중 사격!');this.playSound('steam');}
    }
    for(const p of b.parts){p.hitFlash=Math.max(0,(p.hitFlash||0)-dt);p.stun=Math.max(0,(p.stun||0)-dt);p.rest=Math.max(0,(p.rest||0)-dt);
      if(!p.victory&&b.repairCycleLeft>0&&!p.destroyed)p.hp=Math.min(p.maxHp,p.hp+p.maxHp*C.core.repairPattern.healPerSecond*dt);
      if(p.destroyed&&!p.victory){if(b.forcedCoreOpen)continue;const before=p.repairLeft,repairMult=b.repairCycleLeft>0?C.core.repairPattern.destroyedRepairMult:1;p.repairLeft-=dt*C.core.repairSpeed*repairMult;if(before>C.repairWarning&&p.repairLeft<=C.repairWarning)warn('PART REPAIRING · '+p.name+' 재생 임박');if(p.repairLeft<=0){p.destroyed=false;p.hp=p.maxHp;p.rest=C.armRest;b.allPartsDownLatched=false;this.playSound('upgrade');}continue;}
      if(p.grip>0){if(this.state.cars[p.car].hp<=0){release(p);continue;}let rate=1;if(p.type==='suppress')rate+=this.state.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving&&c.car===p.car).reduce((n,c)=>n+Math.max(0,this.effectiveStat(c,'combat')),0)*C.suppressionCombatPerSecond;p.gripLeft-=dt*rate;if(p.type==='crush'){const car=this.state.cars[p.car];hull(p.car,ruleDamage(car,{...C.grips.crush.damageRule,rate:C.grips.crush.damageRule.ratePerSecond},C.grips.crush.damagePerSecond)*dt);}if(p.gripLeft<=0)release(p);}
      if(p.windup){p.windup.left-=dt;if(p.windup.left<=0){p.windup=null;if(p.type==='cannon'){const car=this.state.cars[p.car];hull(p.car,ruleDamage(car,C.behemoth.cannon.damageRule,C.behemoth.cannon.damage));b.shot={from:p,car:p.car,left:C.shotSeconds};this.playSound('cannonBass');}else if(p.type==='bay')truck(p);else if(p.type==='drive')b.slowLeft=C.behemoth.drive.seconds;else if(this.state.cars[p.car].armor<=0){p.grip=C.gripMax;p.gripLeft=C.gripSeconds;p.armor=Math.min(.95,(p.baseArmor??p.armor)+C.gripArmorBonus);this.playSound('metal');}}}
    }
    if(!allPartsDown(b)&&!b.forcedCoreOpen)b.allPartsDownLatched=false;
    if(b.shot)b.shot.left-=dt;
    for(const e of this.state.enemies.filter(e=>alive(e)&&e.type==='infiltrationTruck')){const valid=this.state.cars[e.targetCar]?.hp>0&&this.state.crew.some(c=>!c.dead&&c.hp>0&&c.car===e.targetCar);if(!valid){const next=target('bay');if(next===undefined){e.dead=true;continue;}e.targetCar=next;}e.truckTravel+=dt/C.truck.travel;e.x=Math.max(D.BALANCE.battle.boardDistance,.9*(1-e.truckTravel));if(e.truckTravel>=1)deliver(e);}
    b.patternTimer-=dt;if(b.patternTimer>0)return;
    const busy=b.parts.filter(p=>alive(p)&&(p.windup||p.grip>0)).length+(b.slowLeft>0?1:0)+this.state.enemies.filter(e=>alive(e)&&e.type==='infiltrationTruck').length;
    if(busy>=phase.concurrent)return;
    const candidates=b.parts.filter(p=>!p.victory&&alive(p)&&!p.windup&&!p.grip&&!p.rest&&!p.stun&&(b.phase>1||!['drain','suppress'].includes(p.type))&&(p.type!=='bay'||this.state.enemies.filter(e=>alive(e)&&e.type==='infiltrationTruck').length<C.truck.maxAlive));
    if(!candidates.length)return;const p=candidates[b.patternIndex++%candidates.length],ci=target(p.type,b.parts.filter(p=>p.grip>0||p.windup).map(p=>p.car));if(ci===undefined)return;p.car=ci;const seconds=p.type==='cannon'?C.behemoth.cannon.warning:p.type==='bay'?C.truck.warning:p.type==='drive'?C.behemoth.drive.warning:C.gripWindup;p.windup={left:seconds,total:seconds};b.patternTimer=C.patternGap*phase.interval;
    warn(p.type==='cannon'?'주포 조준 · 주포 파괴 / 해당 객차 비상 장갑':p.type==='bay'?'침투 트럭 출격 준비 · 트럭 집중 사격':p.type==='drive'?'감속 공격 · 구동부를 파괴하세요':C.grips[p.type].name+' 구속 예고 · '+C.grips[p.type].help);
  };
  g.checkBattleState=function(){const b=this.state?.battle;if(!b?.rework)return old.checkBattleState();
    if(this.state.cars.every(c=>c.hp<=0)||this.state.titanDistance<=D.BALANCE.titan.forcedBattleAt)return old.checkBattleState();
    const c=core();
    if(c?.destroyed){
      if(!b.defeated){b.defeated=true;b.defeatFadeLeft=C.defeatFadeSeconds;b.notice='BOSS DESTROYED';b.noticeLeft=C.defeatFadeSeconds;for(const p of b.parts){p.windup=null;if(p.grip>0)release(p);}for(const e of this.state.enemies)e.dead=true;this.state.attackWindups=[];this.playSound('explosion');}
      if(b.defeatFadeLeft<=0)return this.bossClear();
      return;
    }
    return old.checkBattleState();
  };
  g.inspectEnemy=function(e){if(!e.bossPart)return old.inspectEnemy(e);const b=this.state.battle;document.querySelector('#inspector').innerHTML=`<h3>${e.name}</h3><p>공유 HP ${Math.ceil(b.sharedHp)} / ${b.maxSharedHp}</p><p>${e.victory?(b.coreLeft>0?'CORE OPEN · 받는 피해 ×'+C.core.damage:b.repairCycleLeft>0?'CORE REPAIR · 코어 폐쇄 / 부위 회복 중':'CORE CLOSED · 공격 불가'):'부위 내구 '+Math.ceil(e.hp)+' / '+e.maxHp+' · 재생 '+e.regen+'초'}</p>${C.grips[e.type]?'<p>'+C.grips[e.type].help+'</p>':''}${e.grip>0?'<p>Grip '+Math.ceil(e.grip)+' / '+C.gripMax+'</p>':''}`;};
  g.bossCodexHTML=function(id){const b=D.BOSSES[id],r=C.core.repairPattern,rows=[['공유 HP',b.sharedHp],['CORE',`${C.core.interval}초 주기 · 기본 ${C.core.seconds}초 개방 · 피해 ×${C.core.damage}`],['전 부위 격파',`${C.core.forcedSeconds}초 강제 개방 · 종료 즉시 모든 비코어 부위 완전 부활`],['재생 사이클',`자동 CORE 주기 중 ${Math.round(r.chance*100)}% 확률(연속 발동 없음) · ${r.seconds}초간 CORE 대신 폐쇄 유지 · 살아 있는 부위 초당 ${Math.round(r.healPerSecond*100)}% 회복 · 파괴 부위 재생 ×${r.destroyedRepairMult}`],['코어 재생 보조',`파괴된 모든 부위의 기본 재생 진행 속도 +${Math.round((C.core.repairSpeed-1)*100)}%`],...b.parts.filter(p=>!p.victory).map(p=>[p.name,`내구 ${p.hp} · 장갑 ${Math.round(p.armor*100)}% · 재생 ${p.regen}초`]),['재생 예고',`${C.repairWarning}초 전 경고`],['3페이즈',`공유 HP ${C.phases[1].above*100}% 이하 · 패턴 간격 ×${C.phases[2].interval} · 재생 시간 ×${C.phases[2].repair}`]];
    if(id==='behemoth')rows.push(['주포',`${C.behemoth.cannon.warning}초 조준 · 현재 HP ${Math.round(C.behemoth.cannon.damageRule.rate*100)}% 피해 (최소 최대 HP ${Math.round(C.behemoth.cannon.damageRule.min*100)}%)`],['구동부',`${C.behemoth.drive.seconds}초간 속도 ×${C.behemoth.drive.speed}`],['침투 트럭',`HP ${C.truck.hp} · 장갑 ${C.truck.armor*100}% · 이동 ${C.truck.travel}초 · 승선병 ${C.truck.boarders.join('~')}명`],['승선병',`HP ${C.truck.boarderHp} · 객차 최대 HP ${Math.round(C.truck.damageRule.rate*1000)/10}% 피해 · 직원 피해 ${C.truck.crewDamage}`]);
    else rows.push(['Grip',`${C.gripMax} · 실제 피해 1당 ${C.gripDamagePerHp} 감소 · 0이면 해제`],['구속',`기본 ${C.gripSeconds}초 · 1페이즈 최대 1개 / 이후 최대 2개`],...Object.values(C.grips).map(p=>[p.name,p.help+(p.damageRule?.ratePerSecond?` · 초당 최대 HP ${Math.round(p.damageRule.ratePerSecond*1000)/10}% 피해`:'')]),['진압 해제',`지속 시간 = ${C.gripSeconds} ÷ (1 + 직원 전투 합 × ${C.suppressionCombatPerSecond})초`],['비상 장갑',`Grip 즉시 0 · ${C.armStun}초 경직 후 후퇴 · 부위 내구 유지`]);return '<p>부위에 준 실제 피해는 공유 HP에도 적용됩니다. 부위 내구를 넘는 초과 피해는 제외합니다.</p><table class="codex-table">'+rows.map(([k,v])=>`<tr><th>${k}</th><td>${v}</td></tr>`).join('')+'</table>';};
})();
