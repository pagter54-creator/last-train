/* PART 2 equipment. Shares the existing projectile, armor and power pipelines. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,C=UPDATE09_PART2,A=LAST_RAIL_SCENE;
 const live=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 const dist=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/D.BALANCE.projectile.laneSpan);
 const priority=e=>!!(e.interceptShot09||e.attached||e.boarded&&['connectorBlocker','tetherDrone'].includes(e.type)||e.dropLeft>0||/drone|missile|suicide|airdrop/i.test(e.type||'')||/드론|미사일|공습|자폭/.test(D.ENEMIES[e.type]?.name||''));
 g.interceptionPriority09=e=>Number(priority(e));
 const ancientScholarFactor=(eq,ci)=>{const def=(eq?.kind==='turret'?D.TURRETS:D.MODULES)[eq?.type];if(!def?.ancient)return 1;const carIndex=ci??g.equipmentLocation?.(eq)??-1,scholar=g.state?.crew?.some(c=>!c.dead&&!c.moving&&c.hp>0&&c.car===carIndex&&c.traits.includes('scholar'))?D.TRAITS.scholar.ancientDamageMult:1,event=g.state?.eventAncientBoost||1;return scholar*event;};
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
   eq.cooldown=s.interval;const maxHeat=this.turretHeatMax(eq);eq.heat=Math.min(maxHeat,(eq.heat||0)+s.heat);if(eq.heat>=maxHeat)eq.overheated=true;eq.muzzle=.15;this.playSound('shot');
  }
  return turrets(dt);
 };
 // Every combat hull subtraction calls this before destruction/crew casualty checks.
 const absorb=g.absorbHullDamage.bind(g);
 g.absorbHullDamage=function(ci,amount){const eventMult=this.state?.eventCombat?.coreDamageMult||1;return this.preventHullDestruction09(ci,absorb(ci,amount*eventMult));};
 g.preventHullDestruction09=function(ci,remaining){const car=this.state.cars[ci];if(!car||car.hp<=0||remaining<car.hp)return remaining;
  const host=car.equipment.find(e=>e.type==='makeshiftRepair'||e.aux?.type==='makeshiftRepair');if(!host)return remaining;
  if(host.type==='makeshiftRepair')car.equipment.splice(car.equipment.indexOf(host),1);else delete host.aux;
  this.clearCarElectrical09?.(car);car.destroyed=false;car.destroyedLogged=false;car.repair=0;const ancientEq=host.type==='makeshiftRepair'?host:host.aux,factor=ancientScholarFactor(ancientEq,ci),ratio=Math.min(.9,C.makeshift.restoreRatio*factor);this.log(`${car.name} · 임시변통 수리 소모 · HP ${Math.round(ratio*100)}% 복구`,'hot');
  // Signed net damage intentionally makes the caller's existing subtraction heal to the restored ratio.
  return car.hp-car.maxHp*ratio;
 };
 g.moduleCooldown09=function(eq){const lv=Math.max(0,(eq.level||1)-1),factor=ancientScholarFactor(eq),base=eq.type==='swiftWarp'?Math.max(4,(C.warp[eq.model]||C.warp.cooldown)-lv*C.warp.levelReduction):Math.max(60,C.recoveryDrone.cooldown-lv*C.recoveryDrone.levelReduction);return base/factor;};
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
  const ratio=Math.min(.9,C.recoveryDrone.hpRatio*ancientScholarFactor(source.eq,source.car));c.hp=Math.max(1,c.maxHp*ratio);source.eq.abilityCooldown09=this.moduleCooldown09(source.eq);this.playSound('skill');this.log(`${c.name} · 회복 드론으로 전투 복귀 · HP ${Math.round(ratio*100)}%`,'hot');this.renderAll();this.inspectCrew(c);return true;
 };
 const crew=g.updateCrew.bind(g);
 g.updateCrew=function(dt){crew(dt);if(this.mode!=='battle')return;
  for(const car of this.state.cars)for(const host of car.equipment)for(const eq of [host,host.aux].filter(Boolean))eq.abilityCooldown09=Math.max(0,(eq.abilityCooldown09||0)-dt);
  for(const s of sources('medical')){s.eq.healTimer09=(s.eq.healTimer09??C.medical.interval)-dt;if(s.eq.healTimer09>0)continue;s.eq.healTimer09+=C.medical.interval;for(const c of this.state.crew)if(live(c)&&!c.moving&&Math.abs(c.car-s.car)<=s.range)c.hp=Math.min(c.maxHp,c.hp+C.medical.hp*s.strength);}
 };
 const inspect=g.inspectCrew.bind(g);
 const select=g.selectCrew.bind(g);g.selectCrew=function(id){const c=this.state?.crew.find(c=>c.id===id);if(this.mode==='battle'&&c&&!c.dead&&c.hp<=0&&!document.querySelector('#overlay').classList.contains('show')){this.state.selectedCrew=null;this.setTactical(true);this.inspectCrew(c);return;}return select(id);};
 g.inspectCrew=function(c,...args){const r=inspect(c,...args);if(c&&!c.dead&&c.hp<=0&&this.mode==='battle'){const box=document.querySelector('#inspector');box?.querySelector('[data-revive09]')?.remove();const ready=sources('recoveryDrone').filter(s=>(s.eq.abilityCooldown09||0)<=0),best=ready.reduce((m,s)=>Math.max(m,ancientScholarFactor(s.eq,s.car)),1),ratio=Math.min(.9,C.recoveryDrone.hpRatio*best),b=document.createElement('button');b.dataset.revive09=c.id;b.textContent=`회복 드론으로 복귀 · HP ${Math.round(ratio*100)}%`;b.disabled=!ready.length;b.onclick=()=>this.reviveCrew09(c.id);box?.append(b);}return r;};
 const cards=g.renderCars.bind(g);
 g.renderCars=function(){cards();if(!this.state)return;for(const s of [...sources('swiftWarp'),...sources('recoveryDrone')])document.querySelector(`[data-equipment="${s.host.id}"]`)?.classList.toggle('module-ready09',(s.eq.abilityCooldown09||0)<=0);};
 const html=g.equipmentHTML.bind(g);
 const description=g.moduleDescription.bind(g);g.moduleDescription=function(m){return m.description||description(m);};
 g.equipmentHTML=function(eq,...args){let out=html(eq,...args);const info={interceptor:'드론·미사일·공습·외부 부착 적 우선 / 우선 피해 ×2.4 / 관통 5%',sludge:'적 장갑 > 관통력: 명중점에서 고위력 광역 파열',penetrator:'관통 100% / 현재 관통력 > 장갑일 때 통과 / 매 통과 −5%p −장갑×0.5'}[eq.type]||D.MODULES[eq.type]?.description;if(info)out+=`<p>${info}</p>`;if(['swiftWarp','recoveryDrone'].includes(eq.type))out+=`<p>재사용 ${this.moduleCooldown09(eq)}초 · 남은 시간 ${Math.ceil(eq.abilityCooldown09||0)}초 · 준비 시 발광</p>`;return out;};
 
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const shotSounds={gatling:'gatlingShot',cannon:'cannonShot',scatter:'scatterShot',mortar:'mortarShot',tesla:'teslaShot',breaker:'breakerShot',phosphorus:'phosphorusShot',repulsor:'repulsorShot',frost:'frostShot',interceptor:'interceptorShot',sludge:'sludgeShot',penetrator:'penetratorShot'};
 const hitSounds={gatling:'sparkHit',cannon:'blastHit',scatter:'sparkHit',mortar:'blastHit',tesla:'sparkHit',breaker:'blastHit',phosphorus:'flameHit',repulsor:'pulseHit',frost:'frostHit',interceptor:'sparkHit',sludge:'sludgeHit',penetrator:'railHit'};
 const samplePoint=(p,u,w,h)=>({x:(p.start.x+(p.end.x-p.start.x)*u)*w,y:(p.start.y+(p.end.y-p.start.y)*u)*h-(p.arc?4*u*(1-u)*h*D.BALANCE.projectile.arcHeight:0)});
 const carPoint=i=>{const p=A.getCarPosition(i);return p?{x:p.x/g.view.w,y:(p.y-35)/g.view.h}:{x:.5,y:.7};};
 const point=e=>{const p=A.project(e,g.view.w,g.view.h);return{x:p.x/g.view.w,y:p.y/g.view.h};};
 
 g.fireTurret=function(eq,stats,target,ci){
  const arc=D.TURRETS[eq.type].trajectory==='arc',duration=arc?D.BALANCE.projectile.arcSeconds:D.BALANCE.projectile.directSeconds;
  const projectile={hostile:false,from:ci,start:carPoint(ci),end:point(target),targetId:target.id,target,tx:target.x,ty:target.y,life:duration,duration,arc,type:eq.type,stats:{...stats}};
  if(eq.type==='interceptor'&&priority(target))projectile.stats.damage*=C.interceptor.priorityDamage;
  this.state.projectiles.push(projectile);
  this.playSound(shotSounds[eq.type]||(arc?'mortarShot':'shot'));
 };
 const baseResolve=resolve;
 g.resolveProjectile=function(p){
  this.state.impacts??=[];
  if(p.intercepted09)return;
  if(p.hostile||!['sludge','penetrator'].includes(p.type)){
   const before=this.state.impacts.length;baseResolve(p);
   if(!p.hostile&&this.state.impacts.length===before)this.state.impacts.push({screen:p.end,hostile:false,life:D.BALANCE.projectile.impactSeconds,type:p.type});
   if(!p.hostile)this.playSound(hitSounds[p.type]||(p.arc||p.stats?.splash?'blastHit':'sparkHit'));
   return;
  }
  const candidates=[...this.state.enemies,...(this.state.battle?.parts||[])].filter(e=>live(e)&&(!e.titanPart09||e.phase===this.state.battle.phase));
  const target=candidates.find(e=>e.id===p.targetId);if(!target)return;
  const hit=(e,damage,pierce)=>baseResolve({...p,targetId:e.id,target:e,tx:e.x,ty:e.y,stats:{...p.stats,damage,armorPierce:pierce,splash:0,chains:1}});
  if(p.type==='sludge'){
   if((target.armor||0)<=p.stats.armorPierce){baseResolve(p);this.state.impacts.push({screen:p.end,hostile:false,life:D.BALANCE.projectile.impactSeconds,type:'sludge'});this.playSound('sludgeHit');return;}
   for(const e of candidates.filter(e=>dist(e,target)<=C.sludge.radius))hit(e,p.stats.damage*C.sludge.damageMultiplier,C.sludge.burstPierce);
   this.state.impacts.push({world:{x:target.x,y:target.y},radius:C.sludge.radius,screen:p.end,life:.45,type:'sludge'});this.playSound('sludgeHit');return;
  }
  const origin=p.start,end=p.end,dx=end.x-origin.x,dy=end.y-origin.y,len=Math.hypot(dx,dy)||1;
  const hits=candidates.map(e=>{const q=A.project(e,this.view.w,this.view.h),x=q.x/this.view.w-origin.x,y=q.y/this.view.h-origin.y;return {e,along:(x*dx+y*dy)/len,side:Math.abs(x*dy-y*dx)/len};}).filter(v=>v.along>=0&&v.side<=C.penetrator.lineWidth).sort((a,b)=>a.along-b.along);
  let pierce=p.stats.armorPierce;
  for(const {e}of hits){const armor=Math.max(0,e.armor||0);hit(e,p.stats.damage,pierce);if(!(pierce>armor))break;pierce-=C.penetrator.flatLoss+armor*C.penetrator.armorLoss;if(pierce<=0)break;}
  this.state.impacts.push({screen:p.end,hostile:false,life:D.BALANCE.projectile.impactSeconds,type:'penetrator'});this.playSound('railHit');
 };
 
 function drawHostile(ctx,p,w,h,t){const from=Math.max(0,t-.1),a=samplePoint(p,from,w,h),b=samplePoint(p,t,w,h);ctx.save();ctx.strokeStyle='#ff977f';ctx.fillStyle='#ff977f';ctx.lineWidth=p.arc?3:2;ctx.beginPath();ctx.moveTo(a.x,a.y);for(let k=1;k<=5;k++){const q=samplePoint(p,from+Math.min(.1,t)*k/5,w,h);ctx.lineTo(q.x,q.y);}ctx.stroke();ctx.beginPath();ctx.arc(b.x,b.y,p.arc?5:3,0,Math.PI*2);ctx.fill();ctx.restore();}
 function lineData(p,t,w,h,tail=.12){const u=Math.max(0,t-tail),a=samplePoint(p,u,w,h),b=samplePoint(p,t,w,h),dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,ux=dx/len,uy=dy/len,nx=-uy,ny=ux;return{u,a,b,dx,dy,len,ux,uy,nx,ny};}
 function drawTracer(ctx,p,w,h,t,c1,c2,width=2,tail=.12){const {u,a,b}=lineData(p,t,w,h,tail);ctx.save();ctx.lineCap='round';ctx.strokeStyle=c1;ctx.lineWidth=width+2;ctx.globalAlpha=.35;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.globalAlpha=1;ctx.strokeStyle=c2;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();ctx.restore();}
 function drawGatling(ctx,p,w,h,t){const d=lineData(p,t,w,h,.08);drawTracer(ctx,p,w,h,t,'rgba(255,207,133,.32)','#ffe8bc',2,.08);ctx.save();ctx.fillStyle='#fff6dc';ctx.beginPath();ctx.arc(d.b.x,d.b.y,2.2,0,Math.PI*2);ctx.fill();ctx.restore();}
 function drawCannon(ctx,p,w,h,t){const d=lineData(p,t,w,h,.12);ctx.save();ctx.strokeStyle='rgba(244,217,164,.28)';ctx.lineWidth=7;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.fillStyle='#e9d6ab';ctx.beginPath();ctx.arc(d.b.x,d.b.y,5,0,Math.PI*2);ctx.fill();ctx.fillStyle='rgba(120,104,86,.35)';for(let i=1;i<=3;i++){ctx.beginPath();ctx.arc(d.a.x-d.ux*i*10,d.a.y-d.uy*i*10,4+i,0,Math.PI*2);ctx.fill();}ctx.restore();}
 function drawScatter(ctx,p,w,h,t){const d=lineData(p,t,w,h,.08);ctx.save();for(const off of [-4,0,4]){ctx.strokeStyle=off?'rgba(255,221,170,.35)':'#ffe7b8';ctx.lineWidth=off?1.8:2.6;ctx.beginPath();ctx.moveTo(d.a.x+d.nx*off,d.a.y+d.ny*off);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();}ctx.fillStyle='#fff2cf';ctx.beginPath();ctx.arc(d.b.x,d.b.y,2.8,0,Math.PI*2);ctx.fill();ctx.restore();}
 function drawMortar(ctx,p,w,h,t){const d=lineData(p,t,w,h,.1);ctx.save();ctx.strokeStyle='rgba(255,210,145,.35)';ctx.lineWidth=4;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.fillStyle='#f4ddb7';ctx.beginPath();ctx.arc(d.b.x,d.b.y,4.6,0,Math.PI*2);ctx.fill();ctx.restore();}
 function drawTesla(ctx,p,w,h,t){const head=samplePoint(p,t,w,h),tail=Math.max(0,t-.14),base=samplePoint(p,tail,w,h),dx=head.x-base.x,dy=head.y-base.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len;const pts=[];for(let i=0;i<=7;i++){const u=tail+(t-tail)*i/7,q=samplePoint(p,u,w,h),j=(i&&i<7)?Math.sin((u*70)+(t*31)+(p.from||0)*2.7)*7:0;pts.push({x:q.x+nx*j,y:q.y+ny*j});}ctx.save();ctx.lineCap='round';ctx.lineJoin='round';ctx.shadowColor='#58deff';ctx.shadowBlur=15;ctx.strokeStyle='rgba(76,226,255,.28)';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(q=>ctx.lineTo(q.x,q.y));ctx.stroke();ctx.strokeStyle='#baf7ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(pts[0].x,pts[0].y);pts.slice(1).forEach(q=>ctx.lineTo(q.x,q.y));ctx.stroke();for(const pivot of [pts[2],pts[4],pts[5]]){const branch=Math.sin(t*30+pivot.x*.02+pivot.y*.01)*10;ctx.strokeStyle='rgba(133,238,255,.9)';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(pivot.x,pivot.y);ctx.lineTo(pivot.x+nx*branch+dx/len*5,pivot.y+ny*branch+dy/len*5);ctx.stroke();}ctx.fillStyle='#edffff';ctx.beginPath();ctx.arc(head.x,head.y,4.5,0,Math.PI*2);ctx.fill();ctx.restore();}
 function drawBreaker(ctx,p,w,h,t){const d=lineData(p,t,w,h,.11);ctx.save();ctx.strokeStyle='rgba(219,177,117,.3)';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.fillStyle='#e8c58b';ctx.beginPath();ctx.moveTo(d.b.x+d.ux*6,d.b.y+d.uy*6);ctx.lineTo(d.b.x-d.nx*4-d.ux*5,d.b.y-d.ny*4-d.uy*5);ctx.lineTo(d.b.x+d.nx*4-d.ux*5,d.b.y+d.ny*4-d.uy*5);ctx.closePath();ctx.fill();ctx.restore();}
 function drawPhosphorus(ctx,p,w,h,t){const d=lineData(p,t,w,h,.1);ctx.save();ctx.strokeStyle='rgba(238,169,92,.4)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();for(let i=0;i<3;i++){ctx.fillStyle=['#ffcf82','#ff9d5d','#ffdcb0'][i];ctx.beginPath();ctx.arc(d.b.x-d.ux*i*4,d.b.y-d.uy*i*4,4.7-i*.9,0,Math.PI*2);ctx.fill();}ctx.restore();}
 function drawRepulsor(ctx,p,w,h,t){const d=lineData(p,t,w,h,.08);ctx.save();ctx.strokeStyle='rgba(120,227,219,.9)';ctx.lineWidth=2.5;for(let r=0;r<3;r++){ctx.beginPath();ctx.arc(d.b.x,d.b.y,3+r*4+Math.sin(t*18+r),0,Math.PI*2);ctx.stroke();}ctx.restore();}
 function drawFrost(ctx,p,w,h,t){const d=lineData(p,t,w,h,.1);ctx.save();ctx.strokeStyle='rgba(201,237,255,.45)';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.strokeStyle='#effcff';ctx.lineWidth=2;ctx.beginPath();ctx.moveTo(d.b.x-5,d.b.y);ctx.lineTo(d.b.x+5,d.b.y);ctx.moveTo(d.b.x,d.b.y-5);ctx.lineTo(d.b.x,d.b.y+5);ctx.moveTo(d.b.x-4,d.b.y-4);ctx.lineTo(d.b.x+4,d.b.y+4);ctx.moveTo(d.b.x-4,d.b.y+4);ctx.lineTo(d.b.x+4,d.b.y-4);ctx.stroke();ctx.restore();}
 function drawInterceptor(ctx,p,w,h,t){const d=lineData(p,t,w,h,.1);ctx.save();for(const off of [-3,0,3]){ctx.strokeStyle=off?'rgba(119,255,215,.35)':'#cffff0';ctx.lineWidth=off?2.5:3.5;ctx.beginPath();ctx.moveTo(d.a.x+d.nx*off,d.a.y+d.ny*off);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();}ctx.fillStyle='#f5fff9';ctx.beginPath();ctx.moveTo(d.b.x+d.ux*8,d.b.y+d.uy*8);ctx.lineTo(d.b.x-d.nx*4-d.ux*3,d.b.y-d.ny*4-d.uy*3);ctx.lineTo(d.b.x+d.nx*4-d.ux*3,d.b.y+d.ny*4-d.uy*3);ctx.closePath();ctx.fill();ctx.restore();}
 function drawSludge(ctx,p,w,h,t){const d=lineData(p,t,w,h,.14);ctx.save();ctx.strokeStyle='rgba(126,144,74,.42)';ctx.lineWidth=8;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();for(let i=1;i<=3;i++){const q=samplePoint(p,Math.max(0,t-.04*i),w,h);ctx.fillStyle=['#6e7a43','#85924f','#b5c76a'][i-1];ctx.beginPath();ctx.arc(q.x-d.ux*i*2,q.y-d.uy*i*2,2+i,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#9eb05c';ctx.beginPath();ctx.arc(d.b.x,d.b.y,6.5,0,Math.PI*2);ctx.fill();ctx.restore();}
 function drawPenetrator(ctx,p,w,h,t){const d=lineData(p,t,w,h,.12);ctx.save();ctx.strokeStyle='rgba(80,207,255,.28)';ctx.lineWidth=9;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.strokeStyle='#d7f9ff';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(d.a.x,d.a.y);ctx.lineTo(d.b.x,d.b.y);ctx.stroke();ctx.fillStyle='#efffff';ctx.beginPath();ctx.moveTo(d.b.x+d.ux*12,d.b.y+d.uy*12);ctx.lineTo(d.b.x-d.nx*5-d.ux*8,d.b.y-d.ny*5-d.uy*8);ctx.lineTo(d.b.x+d.nx*5-d.ux*8,d.b.y+d.ny*5-d.uy*8);ctx.closePath();ctx.fill();ctx.restore();}
 const projectileDrawer={gatling:drawGatling,cannon:drawCannon,scatter:drawScatter,mortar:drawMortar,tesla:drawTesla,breaker:drawBreaker,phosphorus:drawPhosphorus,repulsor:drawRepulsor,frost:drawFrost,interceptor:drawInterceptor,sludge:drawSludge,penetrator:drawPenetrator};
 g.drawProjectiles=function(ctx,w,h){if(this.mode!=='battle')return;for(const p of this.state.projectiles){if(!p.start||!p.end)continue;const t=clamp(1-p.life/p.duration,0,1);if(p.hostile){drawHostile(ctx,p,w,h,t);continue;}(projectileDrawer[p.type]||drawGatling)(ctx,p,w,h,t);}for(const e of [...this.state.enemies,...(this.state.battle?.parts||[])])if(e.muzzle>0){const p=A.project(e,w,h);ctx.save();ctx.globalAlpha=e.muzzle/D.BALANCE.projectile.muzzleSeconds;ctx.fillStyle='#ffd098';ctx.beginPath();ctx.arc(p.x,p.y-10,16,0,Math.PI*2);ctx.fill();ctx.restore();}};
 g.drawImpactAreas=function(ctx,w,h){for(const impact of this.state.impacts||[]){ctx.save();ctx.globalAlpha=clamp(impact.life/(impact.hostile?D.BALANCE.projectile.impactSeconds:D.BALANCE.projectile.impactSeconds),0,1);const t=impact.type||'';const palette=t==='tesla'?['rgba(116,234,255,.24)','#d9fbff']:t==='frost'?['rgba(191,231,255,.22)','#eaffff']:t==='phosphorus'?['rgba(255,161,101,.24)','#ffe0ae']:t==='repulsor'?['rgba(112,233,224,.18)','#a7fff6']:t==='sludge'?['rgba(174,191,106,.2)','#e0efaa']:['rgba(255,222,166,.18)','#ffe6bf'];ctx.fillStyle=impact.hostile?'#ff72724a':palette[0];ctx.strokeStyle=impact.hostile?'#ff8585':palette[1];ctx.lineWidth=2;if(impact.world){ctx.beginPath();for(let i=0;i<=D.BALANCE.projectile.areaSegments;i++){const angle=i/D.BALANCE.projectile.areaSegments*Math.PI*2,p=A.project({x:clamp(impact.world.x+Math.cos(angle)*impact.radius,0,1),y:impact.world.y+Math.sin(angle)*impact.radius*D.BALANCE.projectile.laneSpan},w,h);if(i===0)ctx.moveTo(p.x,p.y);else ctx.lineTo(p.x,p.y);}ctx.closePath();ctx.fill();ctx.stroke();}else{const x=impact.screen.x*w,y=impact.screen.y*h;if(t==='tesla'){for(let i=0;i<3;i++){ctx.beginPath();ctx.arc(x,y,7+i*6,0,Math.PI*2);ctx.stroke();}}else if(t==='repulsor'){ctx.beginPath();ctx.arc(x,y,18,0,Math.PI*2);ctx.stroke();ctx.beginPath();ctx.arc(x,y,9,0,Math.PI*2);ctx.stroke();}else if(t==='frost'){ctx.beginPath();for(let i=0;i<6;i++){const a=i*Math.PI/3;ctx.moveTo(x,y);ctx.lineTo(x+Math.cos(a)*15,y+Math.sin(a)*15);}ctx.stroke();}else if(t==='sludge'){ctx.beginPath();ctx.ellipse(x,y,16,10,0,0,Math.PI*2);ctx.fill();ctx.stroke();}else{ctx.beginPath();ctx.ellipse(x,y,impact.arc?48:18,impact.arc?25:12,0,0,Math.PI*2);ctx.fill();ctx.stroke();}}ctx.restore();}};
 
 const priorArt=g.reformEquipmentArt?.bind(g);
 const baseTurret='M20 50H62L66 58H14Z';
 function turretSvg(inner){return `<svg viewBox="0 0 80 60" aria-hidden="true"><g stroke="#1a2f35" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="${baseTurret}" fill="#7b8880"/><rect x="32" y="36" width="15" height="16" fill="#31474d"/>${inner}</g></svg>`;}
 function moduleSvg(mark){return `<svg viewBox="0 0 80 60" aria-hidden="true"><g stroke="#1a2f35" stroke-width="3" stroke-linejoin="round" stroke-linecap="round"><path d="${baseTurret}" fill="#78867f"/><rect x="22" y="15" width="36" height="32" rx="5" fill="#5e6f70"/><rect x="28" y="21" width="24" height="20" rx="3" fill="#213840"/><g stroke="#d7e1dc" fill="none">${mark}</g></g></svg>`;}
 g.reformEquipmentArt=function(eq){
  const turret={
   tesla:turretSvg('<path d="M27 18H54M29 27H51M31 36H49" stroke="#a7d8e5"/><path d="M39 10L34 23H44L38 38" stroke="#e6fafc"/><path d="M32 18V10M48 18V10" stroke="#7d9195"/>'),
   scatter:turretSvg('<path d="M24 24H57L63 41H22Z" fill="#95856a"/><path d="M9 20H36V28H9ZM7 30H34V38H7Z" fill="#acb19e"/><path d="M12 19V39" stroke="#344d52"/>'),
   mortar:turretSvg('<path d="M24 43L41 21 48 23 42 46Z" fill="#a9a488"/><path d="M18 7L30 3 49 35 37 43Z" fill="#889a94"/><path d="M20 11L29 8" stroke="#31464d"/>'),
   breaker:turretSvg('<path d="M29 24L43 16 58 18 63 30 51 45H29Z" fill="#8b806f"/><path d="M7 16L18 11 41 26 36 35 7 23Z" fill="#b8ab90"/><path d="M43 24H59V34H43Z" fill="#293e44"/><path d="M50 18V14M55 19V15" stroke="#d0c09a"/>'),
   phosphorus:turretSvg('<path d="M25 44L42 21 49 22 43 46Z" fill="#9b8665"/><path d="M19 8L31 4 50 35 38 43Z" fill="#8e988b"/><circle cx="52" cy="29" r="6" fill="#d4b17c" stroke="#efd4ab"/>'),
   repulsor:turretSvg('<path d="M28 43V17L55 14 61 24 56 41Z" fill="#69807e"/><path d="M14 11Q4 28 14 45M22 17Q13 28 22 39" stroke="#c2ddd8"/><path d="M39 21H48" stroke="#eaf5f2"/>'),
   frost:turretSvg('<path d="M21 18H56L62 38H25Z" fill="#7f9297"/><path d="M11 28H46M28 11V43M18 18L38 38M18 38L38 18" stroke="#d9eef4"/>'),
   interceptor:turretSvg('<path d="M31 18L42 14 55 22 56 34 42 42 29 36 26 24Z" fill="#6d7d77"/><path d="M22 28H57" stroke="#dceae4"/><path d="M38 14V8M31 18L24 12M45 18L52 12" stroke="#cfded8"/>'),
   sludge:turretSvg('<ellipse cx="40" cy="35" rx="16" ry="11" fill="#75805d"/><path d="M40 25V11" stroke="#cdd9a2"/><path d="M32 13H48L52 9 56 13V20H24V13L28 9Z" fill="#667051"/><circle cx="40" cy="35" r="5" fill="#dde9b0" stroke="#9ca975"/>'),
   penetrator:turretSvg('<path d="M30 43V30L40 20 50 30V43Z" fill="#7b8f95"/><path d="M40 6V24" stroke="#edf7f8"/><path d="M31 18H49" stroke="#d8ebee"/><path d="M25 31L19 24M55 31L61 24" stroke="#aebfc2"/>')
  };
  const moduleMarks={
   cooling:'<path d="M40 24v14M33 31h14M35 26l10 10M35 36l10-10"/>',
   targeting:'<circle cx="40" cy="31" r="8"/><path d="M40 20v4M40 38v4M29 31h4M47 31h4"/>',
   overdrive:'<path d="M43 22L36 31H43L38 40"/>',
   crewArms:'<path d="M31 35h18M35 29l-4 6 4 6M45 29l4 6-4 6"/>',
   shield:'<path d="M40 21l9 4v6c0 5-4 9-9 11-5-2-9-6-9-11v-6Z"/>',
   autoRepair:'<path d="M34 24l4-4 8 8-4 4"/><path d="M30 36h20"/><path d="M40 26v20"/>',
   grinder:'<circle cx="40" cy="31" r="7"/><path d="M40 19v5M40 38v5M28 31h5M47 31h5M31 22l3 4M49 22l-3 4M31 40l3-4M49 40l-3-4"/>',
   medical:'<path d="M40 23v16M32 31h16"/>',
   ammo:'<rect x="32" y="24" width="4" height="14"/><rect x="38" y="24" width="4" height="14"/><rect x="44" y="24" width="4" height="14"/><path d="M32 24h16"/>',
   generator:'<path d="M43 22L36 31H43L38 40"/><path d="M30 24h5M45 38h5"/>',
   swiftWarp:'<path d="M33 31h12M41 25l6 6-6 6"/><path d="M28 23q-6 8 0 16"/>',
   makeshiftRepair:'<path d="M31 22l18 18"/><path d="M31 40l18-18"/><path d="M40 24v14M33 31h14"/>',
   recoveryDrone:'<circle cx="40" cy="31" r="6"/><path d="M24 24h8M48 24h8M24 38h8M48 38h8"/>'
  };
  const moduleTypeToMark={cooling:'cooling',repair:'autoRepair',ammo:'ammo',generator:'generator',targeting:'targeting',overdrive:'overdrive',crewArms:'crewArms',shield:'shield',autoRepair:'autoRepair',grinder:'grinder',medical:'medical',swiftWarp:'swiftWarp',makeshiftRepair:'makeshiftRepair',recoveryDrone:'recoveryDrone'};
  if(eq.kind==='module')return moduleSvg(moduleMarks[moduleTypeToMark[eq.type]||'cooling']);
  if(turret[eq.type])return turret[eq.type];
  return priorArt?.(eq);
 };
})();
