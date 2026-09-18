/* ACT III simulation integration. Allocation is stored separately from temporary output. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,B=D.BALANCE,C=UPDATE09;
 const live=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 const intact=c=>c&&c.hp>0&&c.destroyed!==true;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v));
 const choose=a=>a[Math.floor(Math.random()*a.length)];
 const active=()=>g.mode==='battle'&&g.state?.actId==='act3';
 const charged=c=>(c?.overchargeLeft||0)>0;
 const disrupted=ci=>!intact(g.state?.cars[ci])||!!g.state.cars[ci].breakerBroken;
 const roster=ci=>g.state.crew.filter(c=>!c.dead&&c.hp>0&&!c.moving&&c.car===ci);
 const old={};
 for(const k of ['updateCrew','updateSpecialEnemy','spawnEnemy','setCarPower','effectiveCarPower','availableEnginePower','equipmentActive','moduleData','eventEquipmentDisabled','turretStats','moduleEffect','crewMoveMultiplier','moveCrew','swapCrew','turretTargets','carEffectsHTML','startBattle','startBoss','battleClear','bossClear','trainDisruptionMultiplier','rebalancePower'])if(g[k])old[k]=g[k].bind(g);
 g.clearCarElectrical09=function(c){c.breakerBroken=false;c.breakerRepair=0;c.overchargeLeft=0;c.specialOvercharge=false;c.lightningLocked=false;c.manualOff09=false;};
 g.normalizeCarElectrical09=function(){for(const c of this.state?.cars||[]){
  const restored=Number.isFinite(c._lastHull09)&&c._lastHull09<=0&&c.hp>0;
  if(restored){c.destroyed=false;this.clearCarElectrical09(c);}
  if(c.hp<=0)c.destroyed=true;
  if(c.hp<=0||c.destroyed===true)this.clearCarElectrical09(c);
  c._lastHull09=c.hp;
 }};
 // All restoration paths (combat, station, events, post-stage healing) use this lifecycle.
 const report=g.reportHealthChanges?.bind(g);
 if(report)g.reportHealthChanges=function(...args){const r=report(...args);this.normalizeCarElectrical09();return r;};
 const heal=g.healAfterStage.bind(g);
 g.healAfterStage=function(...args){const r=heal(...args);this.normalizeCarElectrical09();return r;};
 const impact=g.onHullImpact.bind(g);
 g.onHullImpact=function(ci,...args){const r=impact(ci,...args);this.normalizeCarElectrical09();const w=this.state?.battle?.lightning09?.warning;if(w&&(w.car===ci||w.original===ci)&&!intact(this.state.cars[ci]))this.state.battle.lightning09.warning=null;return r;};
 function reset(){g.normalizeCarElectrical09();for(const c of g.state.cars)g.clearCarElectrical09(c);if(g.state.battle)g.state.battle.lightning09={left:C.lightning.interval,warning:null,flash:0};}
 for(const name of ['startBattle','startBoss'])g[name]=function(...args){const r=old[name](...args);reset();return r;};
 for(const name of ['battleClear','bossClear'])g[name]=function(...args){const r=old[name](...args);if(this.mode!=='battle')for(const c of this.state.cars)this.clearCarElectrical09(c);return r;};
 g.availableEnginePower=function(){return old.availableEnginePower()+(Number(this.state?.powerCapacityBonus)||0);};
 g.effectiveCarPower=function(ci){const c=this.state?.cars[ci];if(disrupted(ci))return 0;if(charged(c))return 3;if(c?.manualOff09)return 0;return old.effectiveCarPower(ci);};
 g.equipmentActive=function(ci){const c=this.state?.cars[ci];return intact(c)&&!c.breakerBroken&&c.armor<=0&&(charged(c)||!c.manualOff09&&c.power>0);};
 g.setCarPower=function(ci,power){const c=this.state?.cars[ci];if(c?.lightningLocked||c?.breakerBroken)return this.toast('과충전 또는 차단기 수리 중에는 전력을 조작할 수 없습니다.');if(ci===0&&active()&&c&&[0,1].includes(power)){c.manualOff09=power===0;this.log(c.manualOff09?'기관실 전력 차단 · 엔진 정지':'기관실 전력 재연결','hot');this.renderCars();return;}return old.setCarPower(ci,power);};
 g.trainDisruptionMultiplier=function(){const c=this.state?.cars[0];return old.trainDisruptionMultiplier()*(c?.breakerBroken||c?.manualOff09&&!charged(c)?0:1);};
 g.eventEquipmentDisabled=function(eq){const ci=this.equipmentLocation?.(eq)??-1,c=this.state?.cars[ci];return old.eventEquipmentDisabled(eq)||(ci>=0&&(disrupted(ci)||c.manualOff09&&!charged(c)))||(eq.jam09||0)>0;};
 g.moduleData=function(eq){const m=old.moduleData(eq),ci=this.equipmentLocation?.(eq)??-1;if(ci<0)return m;const c=this.state.cars[ci];let f=1;if(disrupted(ci)||eq.jam09>0||c.manualOff09&&!charged(c))f=0;else if(charged(c)){
   // Re-evaluate with temporary output so an allocation of zero is not a zero multiplier.
   const saved=c.power;c.power=3;try{return old.moduleData(eq);}finally{c.power=saved;}
  }
  for(const key of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(key in m)m[key]=1+(m[key]-1)*f;
  if('extraPower'in m)m.extraPower*=f;return m;
 };
 g.turretStats=function(eq,ci,op){const s=old.turretStats(eq,ci,op);if(charged(this.state.cars[ci]))s.heat/=(D.TURRETS[eq.type].power[2]?.heatMult||1);return s;};
 const attached=ci=>active()&&g.state.enemies.some(e=>live(e)&&e.type==='tetherDrone'&&e.attached&&e.targetCar===ci);
 g.moduleEffect=function(ci,effect,key){return old.moduleEffect(ci,effect,key)*(key==='repairMult'&&attached(ci)?C.enemies.droneRepair:1);};
 g.crewMoveMultiplier=function(c){if(c?.moving&&this.pathBlocked09(c.moving.from,c.moving.to))return 0;return old.crewMoveMultiplier(c)*(attached(c?.moving?.from??c?.car)?C.enemies.droneMove:1);};
 g.blockedConnectors09=function(){const out=[];if(!active())return out;for(const e of this.state.enemies)if(live(e)&&e.type==='connectorBlocker'&&e.attached)out.push(e.connector);const wall=this.state.battle?.janus09?.wall;if(wall?.hp>0)out.push(wall.connector);return out;};
 g.pathBlocked09=(a,b)=>g.blockedConnectors09().some(i=>Math.min(a,b)<=i&&Math.max(a,b)>i);
 g.moveCrew=function(id,to){const c=this.state.crew.find(x=>x.id===id);if(c&&this.pathBlocked09(c.car,to))return this.toast('연결부가 봉쇄되었습니다. 적을 제거하거나 신속 워프를 사용하세요.');return old.moveCrew(id,to);};
 g.swapCrew=function(a,b,instant=false){const one=this.state.crew.find(c=>c.id===a),two=this.state.crew.find(c=>c.id===b);if(!instant&&one&&two&&this.pathBlocked09(one.car,two.car))return this.toast('봉쇄된 연결부는 도보로 통과할 수 없습니다.');return old.swapCrew(a,b,instant);};
 g.interceptionPriority09=e=>Number(e.type==='tetherDrone'||e.dropLeft>0);
 g.turretTargets=function(t,eq){const targets=old.turretTargets(t,eq).filter(e=>!e.janusWall);if(t.intercepts||eq?.type==='interceptor'||t===D.TURRETS.gatling||t===D.TURRETS.tesla)return targets.sort((a,b)=>this.interceptionPriority09(b)-this.interceptionPriority09(a));return targets;};
 // Later command/skill layers can pass {instant:true} after consuming their own cost.
 // Walking and in-flight walking both use the connector check; teleportation does not.
 g.canTraverse09=(from,to,{instant=false}={})=>instant||!g.pathBlocked09(from,to);
 // 1.0.1 Balance Part 2: elite bodies become significantly tougher in later acts without raising their damage.
 // This applies to actual elite-tagged enemies regardless of whether they appear in normal or elite encounters.
 const eliteActHp09={act2:1.25,act3:1.35};
 g.spawnEnemy=function(...args){
  const before=this.state?.enemies?.length||0,r=old.spawnEnemy(...args),e=this.state?.enemies?.length>before?this.state.enemies.at(-1):null,d=e&&D.ENEMIES[e.type],mult=eliteActHp09[this.state?.actId]||1;
  if(e&&d?.elite&&mult!==1&&!e.eliteActHp09){e.hp*=mult;e.maxHp*=mult;e.eliteActHp09=mult;}
  return r;
 };
 g.allowElite09=function(id,list){const d=D.ENEMIES[id],doom=this.state?.metaRun?.apocalypse||0;
  if(d.eliteMinStage>=31&&this.state.actId!=='act3')return false;
  const next=[...list.map(e=>D.ENEMIES[e.type]),d],types=new Set([...list.map(e=>e.type),id]);
  const cap=this.state.actId==='act3'?(doom>=6?4:doom>=3?3:2):(doom<3?2:3);
  if(next.reduce((n,e)=>n+(e.eliteSlots||1),0)>cap)return false;
  if(doom<6&&['airdropElite','signalElite','assaultElite'].every(x=>types.has(x)))return false;
  if(doom<3&&types.has('sniperElite')&&types.has('fireElite'))return false;
  return true;
 };
 const threat=g.threatLimit.bind(g);
 g.threatLimit=function(){return this.state.actId==='act3'?((this.state.metaRun?.apocalypse||0)>=6?4:3):Math.min(3,threat());};
 function liveCars(){return g.state.cars.map((c,i)=>({c,i})).filter(x=>intact(x.c));}
 g.lightningTarget09=function(original){
  if(!intact(this.state.cars[original]))return null;
  // A lightning rod is passive, so zero allocation can still attract the strike.
  const rods=[];for(const {c,i} of liveCars())for(const host of c.equipment)for(const eq of [host,...(host.aux?[host.aux]:[])]){
   if(eq.type!=='lightningRod'||eq.jam09>0||c.breakerBroken)continue;
   const range=eq===host?this.moduleData(eq).range:D.MODULES.lightningRod.range;
   if(Math.abs(i-original)<=range)rods.push({car:i,eq});
  }
  rods.sort((a,b)=>Math.abs(a.car-original)-Math.abs(b.car-original)||a.car-b.car);
  return rods.length?{car:rods[0].car,original,rod:rods[0].eq.id,level:rods[0].eq.level||1}:{car:original,original};
 };
 g.strikeLightning09=function(w){
  if(!w||!intact(this.state.cars[w.car])||!intact(this.state.cars[w.original]))return false;
  const c=this.state.cars[w.car],rod=w.rod&&c.equipment.some(h=>[h,h.aux].some(e=>e?.id===w.rod&&!(e.jam09>0)));
  if(rod||!charged(c)&&(c.manualOff09||c.power===0)){c.breakerBroken=false;c.breakerRepair=0;c.overchargeLeft=rod?C.lightning.rodSeconds+((w.level||1)-1)*C.lightning.rodPerLevel:C.lightning.overcharge;c.specialOvercharge=!!rod;c.lightningLocked=true;this.log(`${c.name} · ${rod?'특수 ':''}과충전 ${c.overchargeLeft}초`,'hot');}
  else{c.breakerBroken=true;c.breakerRepair=0;c.overchargeLeft=0;c.specialOvercharge=false;c.lightningLocked=false;this.log(`${c.name} · 차단기 파괴! 직원을 배치해 수리하세요.`,'bad');}
  this.playSound('explosion');this.renderCars();return true;
 };
 g.tickElectrical09=function(dt){
  this.normalizeCarElectrical09();
  for(const [ci,c] of this.state.cars.entries()){
   for(const host of c.equipment)for(const eq of [host,...(host.aux?[host.aux]:[])])eq.jam09=Math.max(0,(eq.jam09||0)-dt);
   if(!intact(c))continue;
   if(charged(c)){c.overchargeLeft=Math.max(0,c.overchargeLeft-dt);if(!c.overchargeLeft){c.lightningLocked=false;c.specialOvercharge=false;}}
   if(c.breakerBroken){const crew=roster(ci);if(crew.length){const stat=crew.reduce((n,x)=>n+Math.max(0,this.effectiveStat(x,'repair')),0);c.breakerRepair+=(1+stat*C.lightning.repairPerStat)*dt*(attached(ci)?C.enemies.droneRepair:1);for(const x of crew)this.onCrewHammer?.(x);if(c.breakerRepair>=C.lightning.repairSeconds){c.breakerBroken=false;c.breakerRepair=0;this.log(`${c.name} · 차단기 복구`,'hot');}}}
  }
  if(!active())return;
  if(this.tickEscalationLightning09&&this.escalationRules09().at>=3){this.tickEscalationLightning09(dt);return;}
  const b=this.state.battle,bits=b.lightning09??={left:C.lightning.interval,warning:null,flash:0};bits.flash=Math.max(0,bits.flash-dt);
  if(bits.warning){const w=bits.warning;if(!intact(this.state.cars[w.car])||!intact(this.state.cars[w.original])){bits.warning=null;return;}w.left-=dt;if(w.left<=0){if(this.strikeLightning09(w)){bits.flash=.25;bits.hit=w.car;}bits.warning=null;}}
  bits.left-=dt;if(bits.left<=0){bits.left+=C.lightning.interval;const target=choose(liveCars());if(target){bits.warning={...this.lightningTarget09(target.i),left:C.lightning.warning,total:C.lightning.warning};this.playSound('alarm');}}
 };
 g.updateCrew=function(dt){this.tickElectrical09(dt);const r=old.updateCrew(dt);this.normalizeCarElectrical09();return r;};
 g.updateSpecialEnemy=function(e,dt){
  if(e.type==='airdropSoldier'&&e.dropLeft>0){e.dropLeft=Math.max(0,e.dropLeft-dt);if(!e.dropLeft&&live(e)){if(!intact(this.state.cars[e.targetCar])){e.dead=true;return true;}e.boarded=true;e.x=B.battle.boardDistance;this.onBoarding?.(e);this.playSound('boardingAlarm');}return true;}
  if(['connectorBlocker','tetherDrone'].includes(e.type)){
   if(!intact(this.state.cars[e.targetCar])){const target=choose(liveCars());if(!target)return true;e.targetCar=target.i;e.attached=false;}
   e.x=Math.max(B.battle.boardDistance,e.x-B.battle.enemyApproachSpeed*e.speed*dt);
   if(e.x<=B.battle.boardDistance&&this.allowMajorThreat(e)){e.attached=true;e.majorActive=true;e.connector=clamp(e.targetCar,0,this.state.cars.length-2);}return true;
  }
  if(e.type==='saboteur'){const candidates=liveCars().sort((a,b)=>(a.c.hp/a.c.maxHp-(a.c.autoRepair ? .15 : 0))-(b.c.hp/b.c.maxHp-(b.c.autoRepair ? .15 : 0)));if(candidates.length)e.targetCar=candidates[0].i;}
  return old.updateSpecialEnemy?.(e,dt)||false;
 };
 function spawnSoldier(car,drop){
  const s=g.state,limit=B.battle.maxAlive;if(s.enemies.filter(live).length>=limit)return null;
  if(s.enemies.filter(e=>live(e)&&D.ENEMIES[e.type]?.tags?.includes('BOARDING')).length>=COMBAT_CONFIG.tagCaps.BOARDING)return null;
  const before=s.enemies.length;g.spawnEnemy(drop?'airdropSoldier':'boarder');if(s.enemies.length===before)return null;
  const e=s.enemies.at(-1);e.targetCar=car;e.x=drop ? .35 : B.battle.boardDistance+.07;e.dropLeft=drop?C.enemies.airdropSeconds:0;e.dropTotal=e.dropLeft;e.boarded=false;return e;
 }
 g.eliteHandlers.airdrop=function(e,dt){e.attackTimer-=dt;if(e.attackTimer>0||e.x>.46)return;e.attackTimer=18;const targets=liveCars().sort(()=>Math.random()-.5).slice(0,C.enemies.airdropCount);for(const x of targets)spawnSoldier(x.i,true);g.playSound('alarm');};
 g.eliteHandlers.signalJammer=function(e,dt){e.attackTimer-=dt;if(e.attackTimer>0||e.x>(D.ENEMIES.signalElite.attackRange??.95))return;e.attackTimer=C.enemies.jamInterval;const targets=liveCars().flatMap(x=>x.c.equipment).filter(eq=>!(eq.jam09>0)),turrets=targets.filter(eq=>eq.kind==='turret');let eq=null;if(turrets.length){const max=Math.max(...turrets.map(t=>t.level||1)),top=turrets.filter(t=>(t.level||1)===max);eq=choose(top);}else eq=choose(targets);if(eq){eq.jam09=C.enemies.jamSeconds;g.toast(`${(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type].name} · 신호 교란 ${C.enemies.jamSeconds}초`);}};
 g.eliteHandlers.assaultCarrier=function(e,dt){if(e.x>.21)return;e.attackTimer-=dt;if(e.attackTimer>0)return;e.attackTimer=C.enemies.forwardInterval;const target=choose(liveCars());if(target)for(let i=0;i<2;i++)spawnSoldier(target.i,false);};
 g.carEffectsHTML=function(ci){const c=this.state.cars[ci],notes=[];if(c.breakerBroken)notes.push(`차단기 수리 ${Math.floor((c.breakerRepair||0)/C.lightning.repairSeconds*100)}% · 장비/발전 정지`);if(charged(c))notes.push(`${c.specialOvercharge?'특수 ':''}과충전 ${c.overchargeLeft.toFixed(1)}초 · 유효 전력 3 · 전력 발열 페널티 없음`);if(attached(ci))notes.push('견인 드론 · 이동/수리 효율 감소');return old.carEffectsHTML(ci)+notes.map(n=>`<p class="electrical09">${n}</p>`).join('');};
 const render=g.renderCars.bind(g);
 g.renderCars=function(){render();document.querySelectorAll('.engine-isolate09').forEach(el=>el.remove());if(!active())return;const c=this.state.cars[0],host=document.querySelector('[data-car-index="0"]');if(!host)return;const button=document.createElement('button');button.className='engine-isolate09';button.textContent=c.manualOff09?'ϟ 재연결':'ϟ 차단';button.title='기관실 전력을 0으로 차단해 낙뢰에 대비합니다. 차단 중 엔진이 멈춥니다.';button.disabled=!!(c.breakerBroken||c.lightningLocked||!intact(c));button.onclick=e=>{e.preventDefault();e.stopPropagation();this.setCarPower(0,c.manualOff09?1:0);};host.append(button);};
})();
