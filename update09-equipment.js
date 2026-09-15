/* PART 2 equipment. Shares the existing projectile, armor and power pipelines. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,C=UPDATE09_PART2,A=LAST_RAIL_SCENE;
 const live=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/D.BALANCE.projectile.laneSpan);
 const priority=e=>!!(e.interceptShot09||e.attached||e.boarded&&['connectorBlocker','tetherDrone'].includes(e.type)||e.dropLeft>0||/drone|missile|suicide|airdrop/i.test(e.type||'')||/드론|미사일|공습|자폭/.test(D.ENEMIES[e.type]?.name||''));
 g.interceptionPriority09=e=>Number(priority(e));
 const targets=g.turretTargets.bind(g);
 g.turretTargets=function(t,eq){const out=targets(t,eq);return out.filter(e=>!e.titanPart09||e.phase===this.state.battle.phase);};
 const pick=g.pickTurretTarget.bind(g);
 g.pickTurretTarget=function(ci,t,eq){if(eq?.type==='interceptor')return this.turretTargets(t,eq).sort((a,b)=>Number(priority(b))-Number(priority(a)))[0]||null;return pick(ci,t,eq);};
 const stats=g.turretStats.bind(g);
 g.turretStats=function(eq,...args){const s=stats(eq,...args);if(eq.type==='penetrator')s.armorPierce=C.penetrator.initialPierce;if(eq.type==='interceptor')s.armorPierce=C.interceptor.pierce;return s;};
 const fire=g.fireTurret.bind(g);
 g.fireTurret=function(eq,s,target,ci){const from=this.state.projectiles.length,r=fire(eq,s,target,ci);if(eq.type==='interceptor')for(const p of this.state.projectiles.slice(from))if(priority(p.target||target))p.stats.damage*=C.interceptor.priorityDamage;return r;};
 const resolve=g.resolveProjectile.bind(g);
 g.resolveProjectile=function(p){
  if(p.intercepted09)return;
  if(p.hostile||!['sludge','penetrator'].includes(p.type))return resolve(p);
  const candidates=[...this.state.enemies,...(this.state.battle?.parts||[])].filter(e=>live(e)&&(!e.titanPart09||e.phase===this.state.battle.phase));
  const target=candidates.find(e=>e.id===p.targetId);if(!target)return;
  const hit=(e,damage,pierce)=>resolve({...p,targetId:e.id,target:e,tx:e.x,ty:e.y,stats:{...p.stats,damage,armorPierce:pierce,splash:0,chains:1}});
  if(p.type==='sludge'){
   if((target.armor||0)<=p.stats.armorPierce)return resolve(p);
   for(const e of candidates.filter(e=>dist(e,target)<=C.sludge.radius))hit(e,p.stats.damage*C.sludge.damageMultiplier,C.sludge.burstPierce);
   this.state.impacts??=[];this.state.impacts.push({world:{x:target.x,y:target.y},radius:C.sludge.radius,screen:p.end,life:.45});this.playSound('explosion');return;
  }
  // A straight ray through the aimed enemy; do not bend the shot toward unrelated enemies.
  const origin=p.start,end=p.end,dx=end.x-origin.x,dy=end.y-origin.y,len=Math.hypot(dx,dy)||1;
  const hits=candidates.map(e=>{const q=A.project(e,this.view.w,this.view.h),x=q.x/this.view.w-origin.x,y=q.y/this.view.h-origin.y;return {e,along:(x*dx+y*dy)/len,side:Math.abs(x*dy-y*dx)/len};}).filter(v=>v.along>=0&&v.side<=C.penetrator.lineWidth).sort((a,b)=>a.along-b.along);
  let pierce=p.stats.armorPierce;
  for(const {e}of hits){const armor=Math.max(0,e.armor||0);hit(e,p.stats.damage,pierce);if(!(pierce>armor))break;pierce-=C.penetrator.flatLoss+armor*C.penetrator.armorLoss;if(pierce<=0)break;}
 };
 // Defensive point interception uses actual hostile projectiles, not fake enemies in saves.
 const turrets=g.updateTurrets.bind(g);
 g.updateTurrets=function(dt){
  for(let ci=0;ci<this.state.cars.length;ci++)if(this.equipmentActive(ci))for(const eq of this.state.cars[ci].equipment){
   if(eq.type!=='interceptor'||eq.cooldown>0||this.isTurretOverheated(eq)||this.eventEquipmentDisabled?.(eq))continue;
   const p=this.state.projectiles.find(p=>p.hostile&&!p.resolved&&!p.intercepted09&&/missile|rocket|드론|미사일/i.test(p.type+' '+(p.attack?.name||'')));if(!p)continue;
   const s=this.turretStats(eq,ci,this.crewForCar(ci).reduce((n,c)=>n+this.effectiveStat(c,'operate'),0));
   p.interceptHp09??=30;p.interceptHp09-=s.damage*C.interceptor.priorityDamage;if(p.interceptHp09<=0){p.intercepted09=true;p.resolved=true;p.life=0;}
   eq.cooldown=s.interval;eq.heat=Math.min(D.BALANCE.heat.max,(eq.heat||0)+s.heat);if(eq.heat>=D.BALANCE.heat.max)eq.overheated=true;eq.muzzle=.15;this.playSound('shot');
  }
  return turrets(dt);
 };
 // Every combat hull subtraction calls this before destruction/crew casualty checks.
 const absorb=g.absorbHullDamage.bind(g);
 g.absorbHullDamage=function(ci,amount){return this.preventHullDestruction09(ci,absorb(ci,amount));};
 g.preventHullDestruction09=function(ci,remaining){const car=this.state.cars[ci];if(!car||car.hp<=0||remaining<car.hp)return remaining;
  const host=car.equipment.find(e=>e.type==='makeshiftRepair'||e.aux?.type==='makeshiftRepair');if(!host)return remaining;
  if(host.type==='makeshiftRepair')car.equipment.splice(car.equipment.indexOf(host),1);else delete host.aux;
  this.clearCarElectrical09?.(car);car.destroyed=false;car.destroyedLogged=false;car.repair=0;this.log(`${car.name} · 임시변통 수리 소모 · HP 50% 복구`,'hot');
  // Signed net damage intentionally makes the caller's existing subtraction heal to 50%.
  return car.hp-car.maxHp*C.makeshift.restoreRatio;
 };
 g.moduleCooldown09=function(eq){const lv=Math.max(0,(eq.level||1)-1);return eq.type==='swiftWarp'?Math.max(4,(C.warp[eq.model]||C.warp.cooldown)-lv*C.warp.levelReduction):Math.max(60,C.recoveryDrone.cooldown-lv*C.recoveryDrone.levelReduction);};
 const sources=type=>g.moduleSources().filter(s=>s.eq.type===type&&s.strength>0);
 const warpSource=ci=>sources('swiftWarp').find(s=>s.car===ci&&(s.eq.abilityCooldown09||0)<=0);
 const move=g.moveCrew.bind(g);
 g.moveCrew=function(id,to){const c=this.state.crew.find(x=>x.id===id),source=c&&warpSource(c.car);if(this.mode!=='battle'||!source||!live(c)||c.moving||c.car===to||!this.state.cars[to]||this.bossCrewStopped?.(c))return move(id,to);
  let space=this.crewCapacity(to)-this.state.crew.filter(x=>!x.dead&&(x.moving?.to??x.car)===to).length;if(space<=0)return this.toast('직원 슬롯이 가득 찼습니다.');
  const group=source.eq.model==='wide'?[c,...this.state.crew.filter(x=>x!==c&&live(x)&&!x.moving&&x.car===c.car&&!this.bossCrewStopped?.(x))]:[c];
  for(const x of group.slice(0,space)){x.car=to;x.moving=null;}
  source.eq.abilityCooldown09=this.moduleCooldown09(source.eq);this.state.selectedCrew=null;this.setTactical(false);this.playSound('skill');this.renderAll();return true;
 };
 const swap=g.swapCrew.bind(g);
 g.swapCrew=function(a,b,instant=false){const x=this.state.crew.find(c=>c.id===a),y=this.state.crew.find(c=>c.id===b),source=x&&warpSource(x.car);
  if(!instant&&this.mode==='battle'&&source&&live(x)&&live(y)&&!x.moving&&!y.moving&&x.car!==y.car&&!this.bossCrewStopped?.(x)&&!this.bossCrewStopped?.(y)){const result=swap(a,b,true);if(result!==false){source.eq.abilityCooldown09=this.moduleCooldown09(source.eq);return result;}}
  return swap(a,b,instant);
 };
 g.reviveCrew09=function(id){const c=this.state.crew.find(x=>x.id===id),source=sources('recoveryDrone').find(s=>(s.eq.abilityCooldown09||0)<=0);if(this.mode!=='battle'||!c||c.dead||c.hp>0||!source)return false;
  c.hp=Math.max(1,c.maxHp*C.recoveryDrone.hpRatio);source.eq.abilityCooldown09=this.moduleCooldown09(source.eq);this.playSound('skill');this.log(`${c.name} · 회복 드론으로 전투 복귀`,'hot');this.renderAll();this.inspectCrew(c);return true;
 };
 const crew=g.updateCrew.bind(g);
 g.updateCrew=function(dt){crew(dt);if(this.mode!=='battle')return;
  for(const car of this.state.cars)for(const host of car.equipment)for(const eq of [host,host.aux].filter(Boolean))eq.abilityCooldown09=Math.max(0,(eq.abilityCooldown09||0)-dt);
  for(const s of sources('medical')){s.eq.healTimer09=(s.eq.healTimer09??C.medical.interval)-dt;if(s.eq.healTimer09>0)continue;s.eq.healTimer09+=C.medical.interval;for(const c of this.state.crew)if(live(c)&&!c.moving&&Math.abs(c.car-s.car)<=s.range)c.hp=Math.min(c.maxHp,c.hp+C.medical.hp*s.strength);}
 };
 const inspect=g.inspectCrew.bind(g);
 const select=g.selectCrew.bind(g);g.selectCrew=function(id){const c=this.state?.crew.find(c=>c.id===id);if(this.mode==='battle'&&c&&!c.dead&&c.hp<=0&&!document.querySelector('#overlay').classList.contains('show')){this.state.selectedCrew=null;this.setTactical(true);this.inspectCrew(c);return;}return select(id);};
 g.inspectCrew=function(c,...args){const r=inspect(c,...args);if(c&&!c.dead&&c.hp<=0&&this.mode==='battle'){const box=document.querySelector('#inspector');box?.querySelector('[data-revive09]')?.remove();const b=document.createElement('button');b.dataset.revive09=c.id;b.textContent='회복 드론으로 복귀 · HP 35%';b.disabled=!sources('recoveryDrone').some(s=>(s.eq.abilityCooldown09||0)<=0);b.onclick=()=>this.reviveCrew09(c.id);box?.append(b);}return r;};
 const cards=g.renderCars.bind(g);
 g.renderCars=function(){cards();if(!this.state)return;for(const s of [...sources('swiftWarp'),...sources('recoveryDrone')])document.querySelector(`[data-equipment="${s.host.id}"]`)?.classList.toggle('module-ready09',(s.eq.abilityCooldown09||0)<=0);};
 const html=g.equipmentHTML.bind(g);
 const description=g.moduleDescription.bind(g);g.moduleDescription=function(m){return m.description||description(m);};
 g.equipmentHTML=function(eq,...args){let out=html(eq,...args);const info={interceptor:'드론·미사일·공습·외부 부착 적 우선 / 우선 피해 ×2.4 / 관통 5%',sludge:'적 장갑 > 관통력: 명중점에서 고위력 광역 파열',penetrator:'관통 100% / 현재 관통력 > 장갑일 때 통과 / 매 통과 −5%p −장갑×0.5'}[eq.type]||D.MODULES[eq.type]?.description;if(info)out+=`<p>${info}</p>`;if(['swiftWarp','recoveryDrone'].includes(eq.type))out+=`<p>재사용 ${this.moduleCooldown09(eq)}초 · 남은 시간 ${Math.ceil(eq.abilityCooldown09||0)}초 · 준비 시 발광</p>`;return out;};
 const art=g.reformEquipmentArt?.bind(g);
 g.reformEquipmentArt=function(eq){const colors={interceptor:'#a9e9d5',sludge:'#9eae58',penetrator:'#acd7e8',swiftWarp:'#72f4e3',makeshiftRepair:'#e8ab63',recoveryDrone:'#a5eda6'};if(!colors[eq.type])return art?.(eq);const c=colors[eq.type];return `<svg viewBox="0 0 80 65" aria-hidden="true"><path d="M12 56H68L60 46H20Z" fill="#47595b" stroke="#162c32" stroke-width="3"/><rect x="25" y="24" width="30" height="25" rx="4" fill="#63746d" stroke="${c}" stroke-width="3"/>${eq.kind==='turret'?`<path d="M39 29V5M47 29V${eq.type==='penetrator'?5:15}" stroke="${c}" stroke-width="7"/>`:`<circle cx="40" cy="36" r="8" fill="${c}"/>`}</svg>`;};
})();
