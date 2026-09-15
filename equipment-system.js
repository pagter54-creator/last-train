(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,B=D.BALANCE,C=EQUIPMENT_REFORM,W=WEAPON_UPGRADES,A=LAST_RAIL_SCENE;
 const clamp=(v,a,b)=>Math.max(a,Math.min(b,v)),copy=v=>JSON.parse(JSON.stringify(v));
 const alive=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 const distance=(a,b)=>Math.hypot(a.x-b.x,(a.y-b.y)/B.projectile.laneSpan);
 let shot=null,personal=null;
 g.resetTurretHeat=function(){for(const car of this.state?.cars||[])for(const eq of car.equipment)if(eq.kind==='turret'){eq.heat=0;eq.overheated=false;eq.rageLeft=0;eq.rageCooling=false;delete eq.minimumCooling;}};
 g.isTurretOverheated=eq=>!!(eq.overheated||eq.rageCooling)&&!(eq.rageLeft>0);
 // Apply after crew, module, branch and nonlinear heat corrections, including UI readouts.
 const cooling=g.turretCooling.bind(g);g.turretCooling=function(eq,...args){return cooling(eq,...args)*((eq.overheated||eq.rageCooling)&&!(eq.rageLeft>0)?C.overheatCoolingMultiplier:1);};
 const findEquipment=g.findEquipment.bind(g);
 g.findEquipment=function(id){if(!this.state)return null;const direct=findEquipment(id);if(direct)return direct;for(const car of this.state.cars||[])for(const host of car.equipment)if(host.aux?.id===id)return host.aux;return null;};
 g.auxHostFor=function(eqOrId){const id=typeof eqOrId==='string'?eqOrId:eqOrId?.id;if(!id)return null;for(const car of this.state?.cars||[])for(const host of car.equipment)if(host.aux?.id===id)return host;return null;};
 g.equipmentLocation=eq=>g.state?.cars.findIndex(c=>c.equipment.includes(eq)||c.equipment.some(h=>h.aux===eq))??-1;
 g.moduleSources=function(ci){
  const out=[];if(!this.state)return out;
  this.state.cars.forEach((car,i)=>{if(!this.equipmentActive(i)||this.bossCarSealed?.(i))return;
   for(const host of car.equipment){if(host.kind!=='module'||this.eventEquipmentDisabled?.(host))continue;
    for(const eq of [host,...(host.aux?[host.aux]:[])]){if(this.eventEquipmentDisabled?.(eq))continue;
     const aux=eq!==host,base=D.MODULES[eq.type];if(!base)continue;
     const model=aux?null:B.moduleUpgrade.branches[eq.model],range=aux?base.range:this.moduleData(eq).range;
     if(ci!==undefined&&Math.abs(i-ci)>range)continue;
     const power=REVISION_CONFIG.modulePower[this.effectiveCarPower(i)]||0;
     let strength=(aux?C.auxEfficiency:(1+((eq.level||1)-1)*C.moduleGrowth)*(model?.factor||1))*power*(this.state.eventModifiers?.module??1)*(this.moduleInterferenceFactor?.(i)??1);
     if(!aux&&(eq.level||1)>=C.moduleCapLevel)strength*=C.modules[eq.type]?.capFactor||1;
     out.push({eq,host,car:i,aux,range,strength,cap:!aux&&(eq.level||1)>=C.moduleCapLevel});
    }
   }
  });return out;
 };
 const moduleReadout=g.moduleReadout.bind(g);g.moduleReadout=function(eq,ci){const source=this.moduleSources(ci).find(s=>s.eq.id===eq.id);if(!source?.aux)return moduleReadout(eq,ci);const m=D.MODULES[eq.type],active=this.equipmentActive(ci),keys={heatMult:['발열 배율',true],coolingMult:['냉각 배율',false],stageHealMult:['회복 배율',false],repairMult:['수리 배율',false],ammoDamageMult:['실탄 피해 배율',false],extraPower:['추가 전력',false]};return Object.entries(keys).filter(([key])=>key in m).map(([key,[name,lower]])=>{const current=!active?(key==='extraPower'?0:1):key==='extraPower'?m[key]*source.strength:Math.max(0,1+(m[key]-1)*source.strength);return [name,m[key],current,lower];});};
 g.moduleBonus=function(ci,type,key){return this.moduleSources(ci).filter(s=>s.eq.type===type).reduce((sum,s)=>sum+(C.modules[type]?.[key]||0)*s.strength,0);};
 const module=g.moduleData.bind(g);g.moduleData=function(eq){const m=module(eq),factor=(eq.level||1)>=5?(C.modules[eq.type]?.capFactor||1):1;for(const k of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(k in m)m[k]=1+(m[k]-1)*factor;return m;};
 const effect=g.moduleEffect.bind(g);g.moduleEffect=function(ci,id,key){let n=effect(ci,id,key);for(const s of this.moduleSources(ci)){if(!s.aux||D.MODULES[s.eq.type].effect!==id)continue;const v=D.MODULES[s.eq.type][key];if(v!==undefined)n*=Math.max(0,1+(v-1)*s.strength);}return n;};
 const engine=g.availableEnginePower.bind(g);g.availableEnginePower=function(){const main=this.state.cars.reduce((sum,c)=>sum+(c.hp>0&&c.power>0&&c.armor<=0?c.equipment.reduce((n,e)=>n+(e.kind==='module'?(this.moduleData(e).extraPower||0)*(e.model==='wide'?this.state.cars.length:1):0),0):0),0);let extra=0;
  // Avoid moduleSources/effectiveCarPower here: the power budget must not recurse.
  extra=this.auxGeneratedPower();
  return engine()+Math.floor(main+extra)-Math.floor(main);
 };
 g.auxGeneratedPower=function(){return this.state.cars.reduce((sum,c,i)=>sum+(c.hp>0&&c.power>0&&c.armor<=0&&!this.bossCarSealed?.(i)?c.equipment.reduce((n,h)=>n+(h.aux?.type==='generator'&&!this.eventEquipmentDisabled?.(h)&&!this.eventEquipmentDisabled?.(h.aux)?D.MODULES.generator.extraPower*C.auxEfficiency*(this.moduleInterferenceFactor?.(i)??1)*(this.state.eventModifiers?.module??1):0),0):0),0);};
 g.applyHeatProfile=function(s,eq){const d=C.turret[eq.type]||C.turret.cannon,t=D.TURRETS[eq.type],hot=(eq.heat||0)>=d.high,critical=(eq.heat||0)>=d.critical;
  const heatEffect=critical?d.criticalEffect:hot?d.highEffect:{},cap=(eq.level||1)>=8?d.cap.effect:{};
  const gated=['gatling','cannon','mortar'].includes(eq.type);const p={...heatEffect,...(!gated||hot?cap:{})};
  s.damage*=p.damage||1;s.interval/=p.rate||1;s.projectileSpeed=p.projectileSpeed||1;s.splash=(p.splash??s.splash)*(p.splashMult||1);s.armorPierce=clamp(s.armorPierce+(p.pierce||0),0,1);
  s.pellets=(t.pellets||1);if(p.pellets){s.damage*=(s.pellets+p.pellets)/s.pellets;s.pellets+=p.pellets;}
  s.chains+=(p.chains||0);s.chainRange=(d.chainRange||0)*(p.chainRange||1);s.chainRatio=p.chainRatio??s.chainRatio;s.knockback=Math.max(s.knockback||0,p.knockback||0,eq.type==='repulsor'?C.ballistics.knockback:0);
  Object.assign(s,{reform:p,hot,critical,sourceId:eq.id});return s;
 };
 const stats=g.turretStats.bind(g);g.turretStats=function(eq,ci,op){const s=this.applyHeatProfile(stats(eq,ci,op),eq),amp=C.modules.overdrive,tier=amp.thresholds.filter(n=>(eq.heat||0)>=n).length;
  s.damage*=1+this.moduleBonus(ci,'overdrive','damage')*tier;s.interval/=1+this.moduleBonus(ci,'overdrive','rate')*tier;return s;
 };
 const range=g.rangeBounds.bind(g);g.rangeBounds=function(t,eq){const r=range(t,eq),ci=eq?this.equipmentLocation(eq):-1;if(ci>=0)r.max*=1+this.moduleBonus(ci,'targeting','range');if(eq?.type==='repulsor'&&eq.level>=8)r.max*=C.turret.repulsor.cap.effect.waveRange;return r;};
 const fire=g.fireTurret.bind(g);g.fireTurret=function(eq,s,target,ci){
  const d=C.turret[eq.type],p=s.reform||{};eq.lastTargetId=target.id;
  const edge=this.moduleSources(ci).filter(x=>x.eq.type==='targeting'&&x.cap).reduce((n,x)=>n+C.modules.targeting.edgeDamage*x.strength,0);
  if(eq.type==='phosphorus')s.heat+=(this.state.weaponZones||[]).filter(z=>z.sourceId===eq.id).length*d.heatPerZone;
  const from=this.state.projectiles.length;fire(eq,s,target,ci);const shots=this.state.projectiles.slice(from);
  for(const projectile of shots){projectile.sourceId=eq.id;projectile.stats={...projectile.stats,reform:p};const victim=[...this.state.enemies,...(this.state.battle?.parts||[])].find(e=>e.id===projectile.targetId)||target;if(p.unarmored&&(victim.armor||0)<=C.unarmoredThreshold)projectile.stats.damage*=p.unarmored;if(p.breach&&(victim.x<=C.closeDistance||victim.grip>0))projectile.stats.armorPierce=Math.max(projectile.stats.armorPierce,C.ballistics.breachPierce);if(victim.x>=this.rangeBounds(D.TURRETS[eq.type],eq).max*C.modules.targeting.edge)projectile.stats.damage*=1+edge;projectile.duration/=s.projectileSpeed||1;projectile.life=projectile.duration;
   if(p.extraShells)for(let i=0;i<p.extraShells;i++){const extra={...projectile,stats:{...projectile.stats,damage:projectile.stats.damage*p.extraDamage,reform:{}},duration:projectile.duration+(i+1)*C.ballistics.extraDelay,tx:clamp(projectile.tx+(i?-C.ballistics.extraOffset:C.ballistics.extraOffset),0,1),end:{...projectile.end,x:projectile.end.x+(i?-C.ballistics.extraOffset:C.ballistics.extraOffset)}};const point=A.project({x:extra.tx,y:extra.ty},this.view.w,this.view.h);extra.end={x:point.x/this.view.w,y:point.y/this.view.h};extra.life=extra.duration;this.state.projectiles.push(extra);}
  }
 };
 const turrets=g.updateTurrets.bind(g);g.updateTurrets=function(dt){for(const car of this.state.cars)for(const eq of car.equipment){if(eq.kind!=='turret')continue;eq.heat=clamp(Number.isFinite(eq.heat)?eq.heat:0,0,B.heat.max);delete eq.minimumCooling;if(eq.heat>=B.heat.max)eq.overheated=true;if(eq.type==='gatling'&&eq.level>=8&&eq.heat>=C.turret.gatling.high&&eq.lastTargetId&&!this.state.enemies.some(e=>alive(e)&&e.id===eq.lastTargetId)&&!this.state.battle?.parts?.some(e=>alive(e)&&e.id===eq.lastTargetId)){eq.cooldown=Math.min(eq.cooldown,D.TURRETS.gatling.interval*C.retargetFactor);eq.lastTargetId=null;}}return turrets(dt);};
 function heat(eq,amount){if(!eq||amount<=0)return;eq.heat=clamp((eq.heat||0)+amount,0,B.heat.max);if(eq.heat>=B.heat.max)eq.overheated=true;}
 function statusHit(e,p){const a=C.armor;
  if(p.type==='breaker'||p.stats.reform?.breach&&(e.x<=C.closeDistance||e.grip>0)){e.originalArmor??=e.armor||0;e.breakStacks=Math.min(a.maxStacks,(e.breakStacks||0)+1);e.breakLeft=a.duration;let loss=p.type==='breaker'?e.breakStacks*a.perHit:a.breach;if(p.stats.reform?.shatter&&e.breakStacks>=a.shatterStacks)loss+=a.shatter;e.armorLoss=Math.max(e.armorLoss||0,loss);e.armor=Math.max(0,e.originalArmor-e.armorLoss);}
  if(p.type==='frost'){const f=C.slow;e.slowStacks=Math.min(f.maxStacks,(e.slowStacks||0)+(p.stats.reform?.slowStacks||1));e.slowLeft=f.duration;e.deepFreeze=!!p.stats.reform?.freeze&&e.slowStacks>=f.maxStacks;if(p.stats.reform?.freeze&&e.slowStacks>=f.maxStacks&&!('destroyed'in e)&&!D.ENEMIES[e.type]?.elite&&(e.freezeImmunity||0)<=0){e.frozen=f.freeze;e.freezeImmunity=f.duration+f.freeze;}}
  if(p.stats.reform?.stun&&!('destroyed'in e))e.frozen=Math.max(e.frozen||0,C.slow.stun*(e.maxHp>=C.slow.heavyHp?C.slow.heavyKnockback:1));
 }
 const damage=g.damageEnemy.bind(g);g.damageEnemy=function(e,amount,pierce=0){if(!alive(e))return;
  if(personal){amount*=this.crewWeaponMultiplier(personal);pierce=Math.max(pierce,this.crewWeaponPierce(personal));}
  if(shot)statusHit(e,shot);if(e.breakLeft>0)e.armor=Math.max(0,(e.baseArmor??e.originalArmor??e.armor)+(e.drained||0)*(D.ENEMIES[e.type]?.armorPerPower||0)-(e.armorLoss||0));
  const hp=e.hp;damage(e,amount,pierce);
  if(shot&&e.hp<hp&&shot.type==='scatter'&&(e.x<=C.closeDistance||e.grip>0))heat(this.findEquipment(shot.sourceId),C.turret.scatter.heatPerHit*(shot.stats.pellets||1));
 };
 function zone(p,extra={}){g.state.weaponZones??=[];if(g.state.weaponZones.length>=C.maxZones)g.state.weaponZones.shift();const d=C.turret.phosphorus,power=p.stats.reform||{};g.state.weaponZones.push({x:p.tx,y:p.ty,sourceId:p.sourceId,from:p.from,radius:d.zone.radius*(power.zoneRadius||1),left:d.zone.seconds,clock:0,damage:p.stats.damage*d.zone.damageRatio*(power.zoneDamage||1),spread:power.spread?C.zoneSpreadLimit:0,...extra});}
 const resolve=g.resolveProjectile.bind(g);g.resolveProjectile=function(p){if(p.hostile)return resolve(p);const previous=shot;shot=p;
  try{
   if(p.type==='repulsor'){
    const eq=this.findEquipment(p.sourceId),r=this.rangeBounds(D.TURRETS.repulsor,eq);for(const e of this.turretTargets(D.TURRETS.repulsor,eq).filter(e=>this.targetInRange(e,r))){resolve({...p,targetId:e.id,target:e,tx:e.x,ty:e.y,stats:{...p.stats,chains:1,splash:0,knockback:(p.stats.knockback||C.ballistics.knockback)*(e.maxHp>=C.slow.heavyHp?C.slow.heavyKnockback:1)}});}
    this.state.impacts??=[];this.state.impacts.push({world:{x:r.max/2,y:p.ty},radius:r.max/2,screen:p.end,life:B.projectile.impactSeconds});this.playSound('explosion');return;
   }
   if(p.type==='tesla'){
    const pool=this.turretTargets(D.TURRETS.tesla,this.findEquipment(p.sourceId)),first=pool.find(e=>e.id===p.targetId);if(!first)return;let current=first;const visited=[];
    for(let i=0;i<p.stats.chains&&current;i++){visited.push(current);resolve({...p,targetId:current.id,target:current,tx:current.x,ty:current.y,stats:{...p.stats,damage:p.stats.damage*Math.pow(p.stats.chainRatio,i),chains:1,splash:0,armorPierce:1}});const next=pool.filter(e=>alive(e)&&!visited.includes(e)&&distance(e,current)<=p.stats.chainRange).sort((a,b)=>distance(a,current)-distance(b,current))[0];if(next){const a=A.project(current,this.view.w,this.view.h),b=A.project(next,this.view.w,this.view.h);this.state.projectiles.push({start:{x:a.x/this.view.w,y:a.y/this.view.h},end:{x:b.x/this.view.w,y:b.y/this.view.h},life:C.ballistics.chainSeconds,duration:C.ballistics.chainSeconds,resolved:true,stats:{},type:'tesla'});}current=next;}
    heat(this.findEquipment(p.sourceId),Math.max(0,visited.length-1)*C.turret.tesla.heatPerHit);if(p.stats.reform?.revisit&&p.stats.hot&&visited.length>=3&&alive(first))resolve({...p,targetId:first.id,target:first,stats:{...p.stats,damage:p.stats.damage*p.stats.chainRatio,chains:1,splash:0,armorPierce:1}});return;
   }
   resolve(p);if(p.type==='phosphorus')zone(p);
  }finally{shot=previous;}
 };
 function slow(e){if(e.frozen>0)return 0;if(!(e.slowLeft>0))return 1;const floor='destroyed'in e?C.slow.bossFloor:D.ENEMIES[e.type]?.elite?C.slow.eliteFloor:.2;return Math.max(floor,e.deepFreeze&&D.ENEMIES[e.type]?.elite?floor:1-(e.slowStacks||0)*C.slow.perHit);}
 const enemies=g.updateEnemies.bind(g);g.updateEnemies=function(dt){const saved=[];for(const e of [...this.state.enemies,...(this.state.battle?.parts||[])]){for(const k of ['slowLeft','frozen','freezeImmunity','breakLeft'])e[k]=Math.max(0,(e[k]||0)-dt);if(!e.breakLeft&&e.originalArmor!==undefined){e.armor=e.originalArmor;delete e.originalArmor;e.armorLoss=0;e.breakStacks=0;}if(!e.slowLeft)e.slowStacks=0;if(!('destroyed'in e)){saved.push([e,e.speed,e.interval]);const f=slow(e);e.speed*=f;e.interval/=(f||.01);}}
  try{enemies(dt);}finally{for(const[e,speed,interval]of saved){e.speed=speed;e.interval=interval;}}
  for(const z of [...(this.state.weaponZones||[])]){const step=Math.min(dt,Math.max(0,z.left));z.left-=step;z.clock+=step;if(z.clock<C.zoneTick)continue;const elapsed=Math.floor(z.clock/C.zoneTick)*C.zoneTick;z.clock-=elapsed;for(const e of [...this.state.enemies,...(this.state.battle?.parts||[])].filter(e=>alive(e)&&this.enemyOnScreen(e)&&distance(e,z)<=z.radius)){resolve({hostile:false,type:'phosphorus',from:z.from,sourceId:z.sourceId,targetId:e.id,target:e,stats:{damage:z.damage*elapsed,armorPierce:C.ballistics.zonePierce,splash:0,chains:1}});if(!alive(e)&&z.spread>0){z.spread--;zone({tx:e.x,ty:e.y,sourceId:z.sourceId,from:z.from,stats:{damage:z.damage/C.turret.phosphorus.zone.damageRatio,reform:{}}},{spread:0});}}}
  this.state.weaponZones=(this.state.weaponZones||[]).filter(z=>z.left>0);
 };
 const attack=g.enemyAttack.bind(g);g.enemyAttack=function(e){if(e.frozen>0)return;return attack(e);};
 const boss=g.updateBoss.bind(g);g.updateBoss=function(dt){const parts=this.state.battle?.parts||[];return boss(dt*Math.min(1,...parts.filter(alive).map(slow)));};
 g.crewWeaponMultiplier=c=>1+g.moduleBonus(c.car,'crewArms','damage');
 g.crewWeaponPierce=c=>Math.min(1,g.moduleSources(c.car).filter(x=>x.eq.type==='crewArms'&&x.cap).reduce((n,x)=>n+C.modules.crewArms.pierce*x.strength,0));
 for(const name of ['crewReturnFire','bossCrewReturnFire']){const old=g[name].bind(g);g[name]=function(c,dt){const before=personal,range=PROGRESSION_CONFIG.returnFire.range;personal=c;PROGRESSION_CONFIG.returnFire.range=range*(1+this.moduleBonus(c.car,'crewArms','range'));const target=this.state.battle?.parts?.find(p=>p.grip>0&&p.car===c.car),grip=target?.grip;try{const result=old(c,dt);if(target&&target.grip>0&&grip>target.grip){target.grip=Math.max(0,target.grip-(grip-target.grip)*this.moduleBonus(c.car,'crewArms','grip'));if(!target.grip)this.releaseBossGrip(target);}return result;}finally{personal=before;PROGRESSION_CONFIG.returnFire.range=range;}};}
 g.absorbHullDamage=function(ci,amount){const car=this.state.cars[ci];if(!car||amount<=0)return amount;const usable=this.moduleSources(ci).some(x=>x.eq.type==='shield'),blocked=usable?Math.min(car.shieldHp||0,amount):0;car.shieldHp=Math.max(0,(car.shieldHp||0)-blocked);if(blocked){car.shieldFlash=.2;this.playSound('metal');if(!car.shieldHp)car.shieldTimer=car.shieldRecharge||C.modules.shield.recharge;}return amount-blocked;};
 const crew=g.updateCrew.bind(g);g.updateCrew=function(dt){crew(dt);const s=this.state,before={state:s,cars:s.cars.map(c=>c.hp),crew:s.crew.map(c=>({id:c.id,hp:c.hp}))};s.moduleTick=(s.moduleTick||0)+dt;const tick=Math.floor(s.moduleTick);s.moduleTick-=tick;
  s.cars.forEach((car,ci)=>{car.shieldFlash=Math.max(0,(car.shieldFlash||0)-dt);const sources=this.moduleSources(ci),shields=sources.filter(x=>x.eq.type==='shield');car.shieldMax=shields.reduce((n,x)=>n+C.modules.shield.capacity*x.strength,0);car.shieldRecharge=shields.some(x=>x.cap)?C.modules.shield.recharge*C.modules.shield.capRecharge:C.modules.shield.recharge;if(!car.shieldMax||car.hp<=0){car.shieldHp=0;car.shieldTimer=car.shieldRecharge;}else{car.shieldHp=Math.min(car.shieldMax,car.shieldHp||0);if(!car.shieldHp){car.shieldTimer=Math.max(0,(car.shieldTimer??0)-dt);if(!car.shieldTimer){car.shieldHp=car.shieldMax;this.playSound('armor');}}}
   if(tick&&car.hp>0){const repair=sources.filter(x=>x.eq.type==='autoRepair').reduce((n,x)=>n+C.modules.autoRepair.repair*x.strength*(x.cap&&car.hp/car.maxHp<=C.lowHull?C.modules.autoRepair.emergency:1),0);car.hp=Math.min(car.maxHp,car.hp+repair*tick);}
  });if(tick)this.reportHealthChanges?.(before,true);
 };
 for(const name of ['startBattle','startBoss']){const old=g[name].bind(g);g[name]=function(...args){const result=old(...args);this.state.weaponZones=[];this.state.battle.moduleEconomy=this.moduleSources().filter(s=>s.eq.type==='grinder').map(s=>({id:s.eq.id,money:C.modules.grinder.money*s.strength*(s.cap?C.modules.grinder.capBonus:1),scrap:C.modules.grinder.scrap*s.strength*(s.cap?C.modules.grinder.capBonus:1)}));return result;};}
 function payout(){const b=g.state?.battle;if(!b||b.modulePaid)return;b.modulePaid=true;const active=new Set(g.moduleSources().map(s=>s.eq.id)),mult=b.boss?C.modules.grinder.boss:b.elite?C.modules.grinder.elite:1;for(const k of ['money','scrap']){const n=Math.round((b.moduleEconomy||[]).filter(s=>active.has(s.id)).reduce((n,s)=>n+s[k],0)*mult);g.state[k]+=g.metaGain?.(k,n)??n;} }
 for(const name of ['battleClear','bossClear']){const old=g[name].bind(g);g[name]=function(...args){payout();return old(...args);};}
 const init=g.makeInitialState.bind(g);g.makeInitialState=function(){const s=init();B.train.maxCars=5+(s.metaRun?.upgrades.extraCar?1:0);return s;};
 const restore=g.restoreMetaRun.bind(g);g.restoreMetaRun=function(){restore();B.train.maxCars=5+(this.state.metaRun?.upgrades.extraCar?1:0);};
 g.moduleUpgradePlan=eq=>D.MODULES[eq.type].upgradeable===false?null:!eq.model&&eq.level>=2?{level:Math.max(3,eq.level),branch:true,cost:eq.level>=3?0:C.moduleCosts[3]}:eq.level>=C.maxModuleLevel?null:{level:(eq.level||1)+1,branch:false,cost:C.moduleCosts[(eq.level||1)+1]};
 const cost=g.upgradeCost.bind(g);g.upgradeCost=eq=>eq.kind==='module'?g.moduleUpgradePlan(eq)?.cost??null:cost(eq);
 const upgrade=g.upgradeEquipment.bind(g);g.upgradeEquipment=function(id,choice){const eq=this.findEquipment(id);if(eq?.kind!=='module')return upgrade(id,choice);const plan=this.moduleUpgradePlan(eq);if(!plan)return false;if(plan.branch&&this.mode!=='station'){this.toast('모듈 분기 강화는 정비 스테이션에서만 가능합니다.');return false;}if(plan.branch&&!B.moduleUpgrade.branches[choice])return false;if(this.state.scrap<plan.cost){this.toast('고철이 부족합니다.');return false;}this.state.scrap-=plan.cost;eq.investedScrap=(eq.investedScrap||0)+plan.cost;eq.level=plan.level;if(plan.branch)eq.model=choice;this.rebalancePower();this.renderAll();this.playSound('upgrade');return true;};
 const seconds=g.equipmentUpgradeSeconds.bind(g);g.equipmentUpgradeSeconds=eq=>eq.kind==='module'?(g.moduleUpgradePlan(eq)?.branch?B.station.actionSeconds.upgrade:0):seconds(eq);
 g.attachAux=function(hostId,sourceId){if(this.mode!=='station')return false;const host=this.findEquipment(hostId),source=this.findEquipment(sourceId);if(!host||!source||host===source||host.kind!=='module'||source.kind!=='module'||this.auxHostFor(host)||this.auxHostFor(source)||host.level<C.auxUnlock||host.aux||source.aux||D.MODULES[host.type].upgradeable===false)return false;const car=this.state.cars.find(c=>c.equipment.includes(source));if(!car)return false;car.equipment.splice(car.equipment.indexOf(source),1);host.aux=source;this.rebalancePower();this.renderAll();this.playSound('equip');return true;};
 g.detachAux=function(hostId,ci){if(this.mode!=='station')return false;const host=this.findEquipment(hostId),car=this.state.cars[ci];if(!host?.aux||!car||car.equipment.length>=this.equipmentCapacity(ci))return false;car.equipment.push(host.aux);delete host.aux;this.rebalancePower();this.renderAll();this.playSound('equip');return true;};
 const prepare=g.prepareActShop.bind(g);g.prepareActShop=function(){prepare();const o=this.stationOffers;if(o.reformReady)return;o.reformReady=true;const turrets=this.state.cars.flatMap(c=>c.equipment).filter(e=>e.kind==='turret'),mean=turrets.reduce((n,e)=>n+(e.level||1),0)/Math.max(1,turrets.length),band=C.shop.bands.filter(b=>mean>=b.at).at(-1)||C.shop.bands[0];let index=0;
  for(const offer of o.gear){const eq={id:crypto.randomUUID(),type:offer.id,kind:offer.kind,level:1,heat:0,cooldown:0,branch:false,weaponBranches:{},investedScrap:0};
   if(offer.kind==='turret'&&index++>0&&Math.random()<C.shop.chance){let roll=Math.random();eq.level=band.levels.at(-1);for(let i=0;i<band.levels.length;i++){roll-=band.weights[i];if(roll<=0){eq.level=band.levels[i];break;}}eq.level=Math.min(C.shop.maxLevel,eq.level);for(const[tier,choices]of Object.entries(W.tiers))if(eq.level>=Number(tier)){const ids=Object.keys(choices);eq.weaponBranches[tier]=ids[Math.floor(Math.random()*ids.length)];}for(let l=2;l<=eq.level;l++)eq.investedScrap+=W.costs[l];}
   offer.equipment=this.randomizeMetaEquipment(eq);offer.id=offer.equipment.type;offer.d={...(offer.kind==='turret'?D.TURRETS:D.MODULES)[offer.id],price:Math.ceil((offer.d.price+eq.investedScrap*C.shop.moneyPerScrap)*(eq.level>1?C.shop.premium:1))};
  }
 };
 const action=g.stationAction.bind(g);g.stationAction=function(button){return action(button);};
 g.equipmentSaleQuote=function(eq){const all=[eq,...(eq.aux?[eq.aux]:[])];return{money:all.reduce((n,e)=>n+Math.floor((e.kind==='turret'?D.TURRETS:D.MODULES)[e.type].price*B.sale.moneyRatio),0),scrap:all.reduce((n,e)=>n+(e.kind==='turret'?Math.floor((e.investedScrap??Object.entries(W.costs).filter(([l])=>Number(l)<=e.level).reduce((n,[,v])=>n+v,0))*B.sale.turretScrapRatio):0),0)};};
})();
