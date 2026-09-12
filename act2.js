/* Extensible enemy behavior handlers and independently destructible boss systems. */
(() => {
  'use strict';
  const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,C=window.ACT2_CONFIG,A=window.LAST_RAIL_SCENE;
  const old={};for(const k of ['update','updateEnemies','enemyAttack','damageEnemy','moduleData','moduleEffect','turretStats','availableEnginePower','updateBoss','startBoss','startBattle','drawBoss','draw','threatStatus','threatLimit','showEnding','carEffectsHTML'])old[k]=g[k].bind(g);
  let allocationRead=0;
  const alive=e=>e&&!e.dead&&!e.destroyed,clamp=(n,a,b)=>Math.max(a,Math.min(b,n)),choose=a=>a[Math.floor(Math.random()*a.length)];
  const active=()=>g.mode==='battle',effects=()=>active()?(g.state.interference||[]).filter(e=>e.left>0&&alive(e.owner)):[];
  const has=(kind,ci)=>effects().some(e=>e.kind===kind&&e.car===ci);
  const nearby=(a,b,r)=>Math.hypot(a.x-b.x,(a.y-b.y)/B.projectile.laneSpan)<=r;
  function reset(){g.state.interference=[];g.state.systemWindups=[];g.state.grabs=[];}
  for(const method of ['startBattle','startBoss'])g[method]=function(...args){reset();old[method](...args);if(this.state.combatRecord){this.state.combatRecord.act=this.state.actId;this.state.combatRecord.stage=this.globalStage();}if(method==='startBoss'&&this.state.battle.bossId==='arachne')Object.assign(this.state.battle,{grabTimer:C.boss.initialGrabDelay,disruptTimer:C.boss.disruption.interval,droneTimer:C.boss.summonInterval});};
  function effect(kind,owner,car,seconds){const s=g.state;s.interference??=[];const prev=s.interference.find(e=>e.kind===kind&&e.owner===owner&&e.car===car);if(prev)prev.left=seconds;else s.interference.push({kind,owner,car,left:seconds});}
  function telegraph(kind,owner,car,seconds){const s=g.state;if(!alive(owner)||s.systemWindups.some(w=>w.owner===owner)||!g.allowMajorThreat(owner))return false;s.systemWindups.push({kind,owner,car,left:seconds,total:seconds});g.playSound('alarm');return true;}
  g.effectiveCarPower=function(ci){const s=this.state,powers=s.cars.map(c=>c.power);
    const generation=s.cars.reduce((n,c)=>n+(c.hp>0&&c.power>0&&c.armor<=0?c.equipment.reduce((v,e)=>v+(e.kind==='module'?(this.moduleData(e).extraPower||0)*(e.model==='wide'?s.cars.length:1):0),0):0),0);
    let available=B.train.enginePower.start+(s.cars.length-1)*B.train.baseCarPower+Math.floor(generation)-powers.slice(1).reduce((a,b)=>a+b,0);
    for(let i=powers.length-1;i>0&&available<B.train.enginePower.min;i--){const loss=Math.min(Math.max(0,powers[i]-1),B.train.enginePower.min-available);powers[i]-=loss;available+=loss;}
    powers[0]=clamp(available,B.train.enginePower.min,B.train.enginePower.max);
    const power=powers[ci];return has('power',ci)?Math.max(Math.min(power,1),power-C.power.amount):power;};
  // Temporary suppression changes effective output, never the player's saved allocation.
  g.availableEnginePower=function(){allocationRead++;try{return old.availableEnginePower();}finally{allocationRead--;}};
  g.isCarGrabbed=ci=>active()&&(g.state.grabs||[]).some(x=>x.car===ci&&x.left>0&&alive(x.owner));
  function infiltrated(ci){return active()&&g.state.enemies.some(e=>alive(e)&&e.boarded&&e.targetCar===ci&&D.ENEMIES[e.type].behavior==='infiltrator');}
  function moduleFactor(ci){return (has('suppress',ci)?C.suppress.moduleMultiplier:1)*(infiltrated(ci)?C.infiltrator.moduleMultiplier:1);}
  g.moduleData=function(eq){const m=old.moduleData(eq),ci=this.state?.cars.findIndex(c=>c.equipment.includes(eq))??-1,factor=ci<0||allocationRead?1:moduleFactor(ci);for(const key of ['heatMult','coolingMult','stageHealMult','repairMult','ammoDamageMult'])if(key in m)m[key]=1+(m[key]-1)*factor;if('extraPower'in m)m.extraPower*=factor;return m;};
  g.moduleEffect=function(ci,effectName,key){return old.moduleEffect(ci,effectName,key)*(key==='repairMult'&&has('hook',ci)?C.hook.repairMultiplier:1);};
  g.turretStats=function(eq,ci,op){const stats=old.turretStats(eq,ci,op);stats.interval/=(has('suppress',ci)?C.suppress.rateMultiplier:1)*(infiltrated(ci)?C.infiltrator.rateMultiplier:1);return stats;};
  g.trainDisruptionMultiplier=()=> (effects().some(e=>e.kind==='bomber')?C.bomber.trainMultiplier:1)*(g.isCarGrabbed(0)?C.boss.grab.engineSpeed:1);
  g.titanSpeedNow=()=>B.titan.speedBase+(g.globalStage()-1)*B.titan.speedPerStage;
  g.carEffectsHTML=function(ci){let html=old.carEffectsHTML(ci);const notes=[];if(has('power',ci))notes.push(`전력 교란: 할당 ${this.state.cars[ci].power} → 유효 ${this.effectiveCarPower(ci)} (기본 1 보존)`);if(has('hook',ci))notes.push(`갈고리: 수리 효율 ×${C.hook.repairMultiplier}`);if(has('suppress',ci))notes.push(`억제: 연사 ×${C.suppress.rateMultiplier} · 모듈 효과량 ×${C.suppress.moduleMultiplier}`);if(infiltrated(ci))notes.push(`침투 방해: 연사 ×${C.infiltrator.rateMultiplier} · 모듈 효과량 ×${C.infiltrator.moduleMultiplier}`);if(this.isCarGrabbed(ci))notes.push('포획 중: 다리를 파괴하면 즉시 해제 · 직원 수리 가능');return html+notes.map(n=>`<p class="negative">${n}</p>`).join('');};
  g.threatStatus=function(exclude){const result=old.threatStatus(exclude),owners=new Set();for(const x of [...effects(),...(this.state.systemWindups||[]),...(this.state.grabs||[])])if(x.owner!==exclude&&alive(x.owner)&&!x.owner.boarded&&!x.owner.majorActive&&!(this.state.attackWindups||[]).some(w=>w.owner===x.owner))owners.add(x.owner);result.major+=owners.size;return result;};
  g.threatLimit=function(){if(this.state.actId!=='act2')return old.threatLimit();const stage=this.globalStage(),r=this.state.battle?.rhythm,L=C.limits;let limit=stage<L.middleStage?L.early:stage<L.lateStage?L.middle:L.late;if(r&&['CRISIS','FINAL'].includes(r.phase?.kind)&&r.clock-r.phase.start<window.COMBAT_CONFIG.burstSeconds)limit=Math.max(limit,this.state.battle.elite&&stage>=L.lateStage?L.eliteBurst:L.burst);return limit;};
  // Attack semantics are keyed by behavior, rather than scattered enemy IDs.
  const attacks={
    hook(e){if(e.x<=C.hook.range&&g.allowMajorThreat(e))effect('hook',e,e.targetCar,Infinity);},
    power(e){telegraph('power',e,e.targetCar,C.suppress.windup);},
    suppress(e){telegraph('suppress',e,e.targetCar,C.suppress.windup);},
    bomber(e){telegraph('bomber',e,e.targetCar,C.bomber.windup);},
    transport(){},shield(e){old.enemyAttack(e);},repair(e){old.enemyAttack(e);}
  };
  g.enemyAttack=function(e){const handler=attacks[D.ENEMIES[e.type]?.behavior];if(handler&&!e.boarded)return handler(e);return old.enemyAttack(e);};
  g.damageEnemy=function(e,damage,pierce){if(!('destroyed'in e)&&this.state.enemies.some(a=>a!==e&&alive(a)&&a.majorActive&&D.ENEMIES[a.type].behavior==='shield'&&nearby(a,e,C.shield.radius)))damage*=C.shield.damageMultiplier;old.damageEnemy(e,damage,pierce);if(!alive(e)){this.state.grabs=(this.state.grabs||[]).filter(x=>x.owner!==e);this.state.interference=(this.state.interference||[]).filter(x=>x.owner!==e);this.state.systemWindups=(this.state.systemWindups||[]).filter(x=>x.owner!==e);}};
  g.updateEnemies=function(dt){
    // Hooked targets attract boarders and accelerate only their approach, not attacks.
    for(const e of this.state.enemies)if(alive(e)&&D.ENEMIES[e.type].boards&&!e.boarded){const hook=effects().find(x=>x.kind==='hook');if(hook){e.targetCar=hook.car;e.x=Math.max(B.battle.boardDistance,e.x-dt*B.battle.enemyApproachSpeed*e.speed*(C.hook.boardingSpeed-1));}}
    old.updateEnemies(dt);
    for(const e of [...this.state.enemies]){
      if(!alive(e)||!this.enemyOnScreen(e))continue;const behavior=D.ENEMIES[e.type].behavior;
      if(['shield','repair'].includes(behavior)&&e.x<=B.targeting.medium&&!e.majorActive&&this.allowMajorThreat(e))e.majorActive=true;
      if(behavior==='repair'&&e.majorActive)for(const target of this.state.enemies)if(alive(target)&&target!==e&&nearby(e,target,C.repair.radius))target.hp=Math.min(target.maxHp,target.hp+C.repair.hpPerSecond*dt);
      if(behavior==='transport'&&!e.deployed&&e.x<=C.transport.range&&this.state.battle.elapsed<this.state.battle.duration&&this.allowMajorThreat(e)){
        const cap=window.COMBAT_CONFIG.tagCaps.BOARDING,room=Math.min(B.battle.maxAlive-this.state.enemies.filter(alive).length,cap-this.state.enemies.filter(x=>alive(x)&&D.ENEMIES[x.type].tags?.includes('BOARDING')).length),count=Math.min(C.transport.count,room);if(count<window.COMBAT_CONFIG.swarm.min)continue;
        for(let i=0;i<count;i++){const before=this.state.enemies.length;this.spawnEnemy('boarder');if(this.state.enemies.length>before){const child=this.state.enemies.at(-1);child.x=e.x;child.y=clamp(e.y+(i-(count-1)/2)*C.transport.laneSpacing,.25,.73);child.targetCar=e.targetCar;}}
        e.deployed=true;e.dead=true;this.playSound('boardingAlarm');
      }
    }
  };
  function hullDamage(ci,amount){const car=g.state.cars[ci];if(car.hp<=0||car.armor>0)return;const before={car:car.hp,crew:g.state.crew.filter(c=>c.car===ci).map(c=>({id:c.id,hp:c.hp,dead:c.dead}))};car.hp=Math.max(0,car.hp-amount);car.hitFlash=B.feedback.carFlashSeconds;if(car.hp===0&&!car.destroyedLogged){car.destroyedLogged=true;g.log(`${car.name} 파괴! 장비가 정지합니다.`,'bad');for(const c of g.state.crew.filter(c=>!c.dead&&!c.moving&&c.car===ci&&c.hp<=0)){c.dead=true;g.log(`${c.name} 사망`,'bad');}}g.onHullImpact(ci,before);}
  function tickSystems(dt){const s=g.state;
    s.interference=(s.interference||[]).filter(e=>{e.left-=dt;return e.left>0&&alive(e.owner)&&('destroyed'in e.owner||s.enemies.includes(e.owner));});
    for(const w of s.systemWindups||[]){if(!alive(w.owner)||(!('destroyed'in w.owner)&&!s.enemies.includes(w.owner))){w.left=0;continue;}w.left-=dt;if(w.left>0)continue;
      if(w.kind==='grab'){s.grabs.push({owner:w.owner,car:w.car,left:C.boss.grab.seconds});g.playSound('metal');g.playSound('cannonBass');}
      else {effect(w.kind,w.owner,w.car,w.kind==='power'?C.power.seconds:w.kind==='suppress'?C.suppress.seconds:C.bomber.seconds);g.playSound(w.kind==='bomber'?'explosion':'enemyShot');if(w.kind==='bomber')old.enemyAttack(w.owner);}
    }
    s.systemWindups=(s.systemWindups||[]).filter(w=>w.left>0&&alive(w.owner));
    for(const grab of s.grabs||[]){if(!alive(grab.owner)){grab.left=0;continue;}const step=Math.min(dt,grab.left);grab.left-=dt;const car=s.cars[grab.car];hullDamage(grab.car,car.maxHp*C.boss.grab.hpPerSecond*(grab.car===0?C.boss.grab.engineDamage:1)*step);}
    s.grabs=(s.grabs||[]).filter(x=>x.left>0&&alive(x.owner)&&s.cars[x.car].hp>0);
  }
  g.update=function(dt){if(active()&&this.state.speed>0)tickSystems(dt*this.state.speed);old.update(dt);};
  g.updateBoss=function(dt){const b=this.state.battle;if(b.bossId!=='arachne')return old.updateBoss(dt);const data=D.BOSSES[b.bossId],core=b.parts.find(p=>p.victory),ratio=core.hp/core.maxHp,phase=ratio>C.boss.thresholds[0]?1:ratio>C.boss.thresholds[1]?2:3,legs=b.parts.filter(p=>p.type.startsWith('grab_leg')&&alive(p)),rage=ratio<=C.boss.thresholds[2]?C.boss.rageInterval:1;
    if(!alive(core))return;
    b.attackTimer-=dt;if(b.attackTimer<=0){old.enemyAttack({targetCar:this.pickTargetCar(false),carDamage:data.attack.carDamage,crewDamage:data.attack.crewDamage,name:data.name});b.attackTimer=data.attack.interval*rage*(legs.length?1:C.boss.leglessInterval);}
    b.grabTimer-=dt;const occupied=new Set([...(this.state.grabs||[]),...(this.state.systemWindups||[]).filter(w=>w.kind==='grab')].map(x=>x.car)),busy=new Set([...(this.state.grabs||[]),...(this.state.systemWindups||[])].map(x=>x.owner));
    if(b.grabTimer<=0&&legs.length&&(phase===3||!occupied.size)){
      const leg=legs.find(p=>!busy.has(p)),cars=this.state.cars.map((c,i)=>({c,i})).filter(({c,i})=>c.hp>0&&!occupied.has(i));let choices=cars.filter(x=>x.i!==0);if(!choices.length||Math.random()<C.boss.grab.engineChance)choices=cars;const target=choose(choices);
      if(leg&&target&&telegraph('grab',leg,target.i,C.boss.grab.windup))b.grabTimer=(phase===3&&!occupied.size?C.boss.grab.secondDelay:C.boss.grab.interval)*rage;
    }
    if(phase<2)return;
    const disruptor=b.parts.find(p=>p.type==='disruptor'),bay=b.parts.find(p=>p.type==='drone_bay');b.disruptTimer-=dt;b.droneTimer-=dt;
    if(alive(disruptor)&&b.disruptTimer<=0&&telegraph('power',disruptor,this.pickTargetCar(false),C.boss.disruption.windup))b.disruptTimer=C.boss.disruption.interval*rage;
    if(alive(bay)&&b.elapsed<b.duration&&b.droneTimer<=0&&this.allowMajorThreat(bay)){this.spawnBossWave(data.summon.enemy);b.droneTimer=C.boss.summonInterval*rage;}
  };
  g.showEnding=function(earned){old.showEnding(earned);const act=D.ACTS[this.state.actId],boss=D.BOSSES[this.state.battle?.bossId];document.querySelector('.ending .eyebrow').textContent=`${boss?.name||'보스'} 격파 · 고대 잔해 ◆ ${earned}`;document.querySelector('.ending .clear').textContent=`ACT ${act.label} CLEAR`;};
  // Shop generation clones data; price/crew changes never leak back into registries.
  g.stationCrewPrice=function(i){const prices=this.state.actId==='act2'?C.shop.crewPrices:B.station.crewPrices;return prices[Math.min(i,prices.length-1)];};
  g.prepareActShop=function(){if(this.state.actId!=='act2'||this.stationOffers.act2)return;const offers=this.stationOffers;offers.act2=true;
    const gear=[];for(const [kind,registry,count] of [['turret',D.TURRETS,B.station.turretOfferCount],['module',D.MODULES,B.station.moduleOfferCount]]){const pool=Object.entries(registry).filter(([,d])=>!d.unlockSpent||this.meta.spent>=d.unlockSpent).sort((a,b)=>b[1].price-a[1].price);while(pool.length&&gear.filter(x=>x.kind===kind).length<count){const index=Math.random()<C.shop.advancedChance?0:Math.floor(Math.random()*pool.length),[id,d]=pool.splice(index,1)[0];gear.push({id,kind,d:{...d,price:Math.ceil(d.price*C.shop.priceMultiplier)}});}}
    offers.gear=gear;offers.crew=offers.crew.map(c=>({...c,stats:Object.fromEntries(Object.entries(c.stats).map(([k,v])=>[k,v+C.shop.crewBonus])),traits:[...c.traits]}));};
  g.drawTitanFoot=function(ctx,w,h,elapsed){const v=C.visual,land=clamp(elapsed/B.launch.impactAt,0,1),escape=clamp((elapsed-B.launch.impactAt)/(B.launch.seconds-B.launch.impactAt),0,1),ground=h*v.footGround,fw=w*v.footWidth,fh=h*v.footHeight;
    if(land===1&&!this.state.footLanded){this.state.footLanded=true;this.playSound('titan');this.playSound('cannonBass');this.playSound('debris');if(!matchMedia('(prefers-reduced-motion: reduce)').matches){document.body.style.setProperty('--quake-duration',`${B.launch.shakeSeconds}s`);document.body.style.setProperty('--quake-pixels',`${B.launch.shakePixels}px`);document.body.classList.add('launch-quake');setTimeout(()=>document.body.classList.remove('launch-quake'),B.launch.shakeSeconds*1000);}}
    ctx.save();ctx.fillStyle='#111d2877';ctx.beginPath();ctx.ellipse(fw*.36,ground,fw*.7*land,22*land,0,0,Math.PI*2);ctx.fill();ctx.translate(-w*v.footTravel*escape*escape,ground-(1-land*land)*h*1.2);ctx.fillStyle='#1c2a30';ctx.strokeStyle='#607078';ctx.lineWidth=5;
    ctx.beginPath();ctx.moveTo(-fw*.15,-fh);ctx.lineTo(fw*.5,-fh);ctx.lineTo(fw*.44,-fh*.25);ctx.lineTo(fw*.72,-fh*.16);ctx.lineTo(fw*.9,-fh*.06);ctx.lineTo(fw*.86,0);ctx.lineTo(-fw*.2,0);ctx.closePath();ctx.fill();ctx.stroke();
    ctx.fillStyle='#435058';ctx.fillRect(fw*.06,-fh,fw*.18,fh*.65);ctx.fillStyle='#b96656';ctx.fillRect(fw*.04,-fh*.35,fw*.33,8);for(let i=0;i<4;i++){ctx.fillStyle='#35434b';ctx.fillRect(fw*(.02+i*.2),-fh*.07,fw*.16,fh*.07);}
    if(land===1){ctx.strokeStyle=`rgba(220,192,153,${1-escape})`;ctx.lineWidth=9*(1-escape);ctx.beginPath();ctx.ellipse(fw*.3,0,fw*(.5+escape*2),h*.04*(1+escape*3),0,0,Math.PI*2);ctx.stroke();for(let i=0;i<16;i++){const p=(escape+i/16)%1;ctx.fillStyle=`rgba(173,153,123,${(1-p)*(1-escape)*.8})`;ctx.beginPath();ctx.arc(fw*.3+Math.cos(i*2.4)*fw*p*2,-Math.sin(p*Math.PI)*h*.18,5+p*22,0,Math.PI*2);ctx.fill();}}
    ctx.restore();
  };
  g.drawBoss=function(ctx,w,h){if(this.state.battle.bossId!=='arachne')return old.drawBoss(ctx,w,h);const parts=this.state.battle.parts,core=parts.find(p=>p.victory),center=A.project(core,w,h),t=A.visualClock;ctx.save();
    // Extend existing code-native boss art with articulated limbs sharing hit coordinates.
    for(const p of parts.filter(p=>p!==core)){const point=A.project(p,w,h);ctx.strokeStyle=p.destroyed?'#3b3235':'#627878';ctx.lineWidth=p.type.startsWith('grab_leg')?18:9;ctx.beginPath();ctx.moveTo(center.x,center.y);ctx.lineTo((center.x+point.x)/2,Math.min(center.y,point.y)-35-Math.sin(t*3)*6);ctx.lineTo(point.x,point.y);ctx.stroke();}
    for(const p of parts){const point=A.project(p,w,h);ctx.fillStyle=p.hitFlash>0?'#fff':p.destroyed?'#342e31':p.victory?'#344c52':'#53696b';ctx.beginPath();ctx.ellipse(point.x,point.y,p.victory?57:34,p.victory?36:22,0,0,Math.PI*2);ctx.fill();ctx.strokeStyle=p.destroyed?'#4e3d3e':'#a3b9ad';ctx.lineWidth=2;ctx.stroke();ctx.fillStyle=p.destroyed?'#483c3c':'#f08b78';ctx.fillRect(point.x-9,point.y-5,18,9);ctx.fillStyle='#172026';ctx.fillRect(point.x-34,point.y-35,68,5);ctx.fillStyle='#efb27c';ctx.fillRect(point.x-34,point.y-35,68*p.hp/p.maxHp,5);ctx.fillStyle='#eee8d6';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,point.x,point.y+37);}
    ctx.restore();
  };
  g.draw=function(){old.draw();if(!active())return;const ctx=this.ctx,w=this.view.w,h=this.view.h,t=A.visualClock;ctx.save();
    for(const e of this.state.enemies){if(!alive(e)||!e.majorActive)continue;const kind=D.ENEMIES[e.type].behavior;if(!['shield','repair'].includes(kind))continue;const p=A.project(e,w,h);ctx.strokeStyle=kind==='shield'?'#ec8580':'#e9b7e9';ctx.lineWidth=2;ctx.beginPath();ctx.ellipse(p.x,p.y,C.visual.ringRadius*p.scale,18*p.scale,0,0,Math.PI*2);ctx.stroke();for(const ally of this.state.enemies)if(ally!==e&&alive(ally)&&nearby(e,ally,kind==='shield'?C.shield.radius:C.repair.radius)){const q=A.project(ally,w,h);ctx.globalAlpha=.4;ctx.beginPath();ctx.moveTo(p.x,p.y);ctx.lineTo(q.x,q.y);ctx.stroke();ctx.globalAlpha=1;}}
    for(const x of [...effects(),...(this.state.systemWindups||[]),...(this.state.grabs||[])]){const from=A.project(x.owner,w,h),to=A.getCarPosition(x.car);if(!to)continue;const pending='total'in x;ctx.strokeStyle=pending?'#ff7676':x.kind==='hook'?'#df9677':'#cf7d99';ctx.lineWidth=pending?2:C.visual.tetherWidth;ctx.setLineDash(pending?[7,6]:[]);ctx.beginPath();ctx.moveTo(from.x,from.y);ctx.quadraticCurveTo((from.x+to.x)/2,to.y-100,to.x,to.y);ctx.stroke();ctx.setLineDash([]);ctx.fillStyle=`rgba(255,60,60,${.08+Math.abs(Math.sin(t*5))*.12})`;ctx.beginPath();ctx.ellipse(to.x,to.y+18,65,20,0,0,Math.PI*2);ctx.fill();if(pending){ctx.strokeStyle='#ff7777';ctx.beginPath();ctx.arc(to.x,to.y,45,-Math.PI/2,-Math.PI/2+Math.PI*2*(1-x.left/x.total));ctx.stroke();}}
    ctx.restore();
  };
})();
