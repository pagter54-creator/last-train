/* TITAN: engine-driven continuous positioning and three destructible phases. */
(()=>{
 'use strict';
 const g=lastRail,D=GAME_DATA,C=UPDATE09_PART2.titan;
 const active=()=>g.mode==='battle'&&g.state?.battle?.bossId==='titan';
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const alive=e=>e&&!e.dead&&!e.destroyed&&e.hp>0;
 function targetCar(a,b){const pos=(a.aim-b.titanPosition09*.36)*(g.state.cars.length-1);return g.state.cars.map((c,i)=>({c,i})).filter(x=>x.c.hp>0).sort((x,y)=>Math.abs(x.i-pos)-Math.abs(y.i-pos))[0]?.i??0;}
 const labels=[['발로 밟기','충격파','원거리 파편'],['무한궤도 충돌','기관포 제압','거대 곡사포'],['비행 머리 돌진','중앙 견제','고에너지 원거리탄']];
 const panel=document.createElement('section');panel.className='titan-position09';panel.hidden=true;panel.innerHTML='<b>TITAN</b><p></p><div><button data-titan-power="1">전력 1 · 접근</button><button data-titan-power="2">전력 2 · 중앙</button><button data-titan-power="3">전력 3 · 이탈</button></div><small>근접 공격 → 이탈 / 원거리 공격 → 접근 / 중앙 공격 → 피격 객차 조절</small>';
 document.body.append(panel);panel.onclick=e=>{const b=e.target.closest('[data-titan-power]');if(b&&active())g.setCarPower(0,Number(b.dataset.titanPower));};
 function phase(n){const b=g.state.battle;b.previousPhase09=b.bossMotion09?b.phase:null;b.bossMotion09??={x:-170,y:-100,vx:0,vy:0};b.phase=n;b.pattern09=0;b.nextAttack09=3;b.attack09=null;b.phaseTransition09=window.ESCALATION09?.motion.titanArrival||2;
  for(const p of b.parts){p.destroyed=p.phase!==n;p.dead=false;p.bossPart=false;p.titanPart09=true;if(p.phase===n)p.hp=p.maxHp;}
  g.state.projectiles=g.state.projectiles.filter(p=>p.hostile);g.state.orders.focus.target=null;
  g.showBanner(`TITAN · PHASE ${n}`,n===1?'거대한 다리를 파괴하라':n===2?'다리 붕괴 · 보조 무한궤도 전개': '상체 붕괴 · 머리 분리 · 비행 추격');
 }
 const start=g.startBoss.bind(g);
 g.startBoss=function(id){start(id);if(id!=='titan')return;const b=this.state.battle;b.rework=false;b.titanPosition09=0;b.titanVelocity09=0;b.defeated=false;this.state.titanEnginePower09=2;
  this.state.cars.forEach(c=>this.clearCarElectrical09?.(c));phase(1);this.renderAll();};
 const power=g.effectiveCarPower.bind(g);
 g.effectiveCarPower=function(ci){const p=power(ci);return active()&&ci===0?Math.min(p,this.state.titanEnginePower09??2):p;};
 const setPower=g.setCarPower.bind(g);
 g.setCarPower=function(ci,n){if(active()&&ci===0&&Number.isInteger(n)&&n>=1&&n<=3){this.state.titanEnginePower09=n;this.renderAll();return;}return setPower(ci,n);};
 const titan=g.updateTitan.bind(g);
 g.updateTitan=function(dt){if(!active())return titan(dt);const s=this.state,b=s.battle,p=this.effectiveCarPower(0),target=p<=1?-1:p>=3?1:0;
  b.titanVelocity09+=(target-b.titanPosition09)*C.travelSpring*dt-b.titanVelocity09*C.travelDamping*dt;
  b.titanPosition09=clamp(b.titanPosition09+b.titanVelocity09*dt,-1,1);
  s.currentTrainSpeed=D.BALANCE.train.speedByPower[p]||0;s.currentTitanSpeed=s.currentTrainSpeed;s.trainSpeed=s.currentTrainSpeed*1000/60;s.titanSpeed=s.trainSpeed;
  s.titanDistance=clamp(s.titanDistance,0,D.BALANCE.run.maxTitanDistance);
 };
 function hit(ci,amount){const s=g.state,car=s.cars[ci];if(!car||car.hp<=0||car.armor>0)return;const before={car:car.hp,crew:s.crew.map(c=>({id:c.id,hp:c.hp,dead:c.dead}))};car.hp=Math.max(0,car.hp-g.absorbHullDamage(ci,amount));car.hitFlash=.4;for(const c of s.crew.filter(c=>!c.dead&&!c.moving&&c.car===ci))g.hurtCrew(c,C.crewDamage,'attack');g.onHullImpact(ci,before);}
 function impact(a){const s=g.state,b=s.battle,pos=b.titanPosition09,near=a.zone==='near',far=a.zone==='far';
  if(near&&pos>C.nearLimit||far&&pos<C.farLimit){g.log('Titan 위치 공격 회피','hot');return;}
  const ci=targetCar(a,b);
  let damage=C.damage[b.phase-1][a.zone];if(b.phase===2){const type=far?'titanMortar':!near?'titanGun':null;if(type&&b.parts.find(p=>p.type===type)?.destroyed)damage*=.35;}
  hit(ci,damage);b.impact09={car:ci,left:.55,zone:a.zone};g.playSound('explosion');
 }
 const update=g.updateBoss.bind(g);
 g.updateBoss=function(dt){if(!active())return update(dt);const b=this.state.battle;if(b.defeated){b.defeatFadeLeft-=dt;return;}
  const motion=b.bossMotion09;if(motion){const a=b.attack09,t=a?1-a.left/a.total:0,pulse=Math.sin(Math.PI*clamp(t,0,1)),x=a?.zone==='near'?180*pulse:a?.zone==='far'?-40*pulse:Math.sin(b.elapsed*1.2)*8,y=b.phase===3?Math.sin(b.elapsed*3)*14:b.phase===1?Math.sin(b.elapsed*2)*5:0;for(const [key,target,velocity]of [['x',x,'vx'],['y',y,'vy']]){motion[velocity]+=((target-motion[key])*24-motion[velocity]*9)*dt;motion[key]+=motion[velocity]*dt;}}
  b.phaseTransition09=Math.max(0,b.phaseTransition09-dt);if(b.phaseTransition09>0)return;
  if(b.impact09){b.impact09.left-=dt;if(b.impact09.left<=0)b.impact09=null;}
  if(b.attack09){b.attack09.left-=dt;if(b.attack09.left<=0){impact(b.attack09);b.attack09=null;b.nextAttack09=C.interval[b.phase-1];}return;}
  b.nextAttack09-=dt;if(b.nextAttack09>0)return;
  const sequence=b.phase===3?['near','far','near','center','far']:['near','center','far'];const zone=sequence[b.pattern09++%sequence.length];
  b.attack09={zone,left:C.warning[b.phase-1],total:C.warning[b.phase-1],aim:.25+(b.pattern09%3)*.25};this.playSound('alarm');
 };
 const damage=g.damageEnemy.bind(g);
 g.damageEnemy=function(e,amount,pierce=0){if(!e?.titanPart09)return damage(e,amount,pierce);if(!active()||!alive(e)||e.phase!==this.state.battle.phase||this.state.battle.phaseTransition09>0)return;return damage(e,amount,pierce);};
 const check=g.checkBattleState.bind(g);
 g.checkBattleState=function(){if(!active())return check();const s=this.state,b=s.battle;
  if(s.cars.every(c=>c.hp<=0))return this.gameOver('Titan의 공격으로 모든 객차가 파괴되었습니다.');if(this.hasTrainMod?.('captain')&&s.crew.some(c=>c.captain&&c.dead))return this.gameOver('현장 열차장이 사망했습니다.');
  if(b.defeated){if(b.defeatFadeLeft<=0)this.bossClear();return;}
  const down=b.phase===1?b.parts.filter(p=>p.phase===1).every(p=>p.destroyed):b.parts.find(p=>p.type===(b.phase===2?'titanBody':'titanHead'))?.destroyed;
  if(!down)return;if(b.phase<3){phase(b.phase+1);return;}b.defeated=true;b.defeatFadeLeft=2;b.attack09=null;this.showBanner('TITAN DESTROYED','추격의 끝');
 };
 const project=g.projectBossEntity?.bind(g);
 g.projectBossEntity=function(e,w,h){if(e.titanPart09){const m=this.state.battle.bossMotion09;return{x:w*e.x+(m?.x||0),y:h*e.y+(m?.y||0),r:e.weapon?38:65,scale:1};}return project?.(e,w,h);};
 const range=g.targetInRange.bind(g);g.targetInRange=function(e,r){if(e.titanPart09&&(!active()||e.phase!==this.state.battle.phase||this.state.battle.phaseTransition09>0))return false;return range(e,r);};
 const inspect=g.inspectEnemy.bind(g);g.inspectEnemy=function(e){if(!e?.titanPart09)return inspect(e);document.querySelector('#inspector').innerHTML=`<h3>TITAN · ${e.name}</h3><p>HP ${Math.ceil(e.hp)} / ${e.maxHp} · 장갑 ${Math.round(e.armor*100)}%</p><p>${e.weapon?'파괴 시 해당 위치 공격 피해 65% 감소.':'이 부위를 파괴하면 다음 단계로 진행합니다.'}</p>`;};
 const codex=g.bossCodexHTML.bind(g);g.bossCodexHTML=function(id){if(id!=='titan')return codex(id);return '<p>전력 1 이하: 접근 / 2: 중앙 / 3 이상: 이탈. 가속·감속 시간이 있으므로 공격 예고를 보고 미리 전력을 조절하세요.</p><p>1단계: 양쪽 다리 파괴 → 보조 무한궤도 전개. 2단계: 상체 파괴 → 머리 분리. 곡사포·기관포를 먼저 파괴하면 대응 공격 피해가 줄어듭니다. 3단계: 비행 머리의 연속 위치 공격.</p><p>근거리·원거리 강공격은 거리로 회피할 수 있습니다. 중앙 공격은 위치로 피격 객차를 선택하며, 파괴된 객차 뒤에 숨어 완전히 피할 수 없습니다.</p>';};
 const ending=g.showEnding.bind(g);g.showEnding=function(earned){const r=ending(earned);if(this.state?.actId==='titan'){const box=document.querySelector('.ending');box.querySelector('.clear').textContent='LAST RAIL · TITAN CLEAR';box.querySelector('h2').textContent='이제, 쫓기지 않는다.';box.querySelector('p').innerHTML='거대한 추격자의 머리가 황무지로 떨어졌다.<br>고요해진 선로 위로 마지막 열차가 달린다.<br><b>살아남은 이들이 다음 길을 선택한다.</b>';}return r;};
 const hud=g.updateHUD.bind(g);g.updateHUD=function(){const r=hud();if(this.state?.actId==='titan'){const stage=document.querySelector('#stage-label');if(stage)stage.textContent=active()?'TITAN':'최후의 정비';}const distance=document.querySelector('#titan-distance');if(distance)distance.title=`Titan 거리 상한 ${D.BALANCE.run.maxTitanDistance} km`;return r;};
 const bossArt=g.drawBoss.bind(g);
 g.drawBoss=function(ctx,w,h){if(!active())return bossArt(ctx,w,h);const b=this.state.battle;ctx.save();
  const x=w*.25,y=h*.46,motion=b.bossMotion09;ctx.translate(motion?.x||0,motion?.y||0);ctx.strokeStyle='#182529';ctx.lineWidth=7;ctx.fillStyle='#52605b';
  if(b.phaseTransition09>0){const t=1-b.phaseTransition09/(window.ESCALATION09?.motion.titanArrival||2);if(b.previousPhase09){ctx.save();ctx.globalAlpha=(1-t)*.7;ctx.fillStyle='#606b63';for(let i=0;i<6;i++){ctx.save();ctx.translate(x+(i-2.5)*55,y-80+t*t*200);ctx.rotate((i%2?1:-1)*t);ctx.fillRect(-24,-60,48,120);ctx.restore();}ctx.restore();}ctx.globalAlpha=Math.max(.05,t*t*(3-2*t));}
  if(b.phase===1){for(const side of [-1,1]){ctx.fillRect(x+side*95-48,h*.03,96,h*.49);ctx.strokeRect(x+side*95-48,h*.03,96,h*.49);ctx.fillStyle='#38423e';ctx.fillRect(x+side*95-90,h*.51,180,60);ctx.fillStyle='#52605b';}}
  else if(b.phase===2){ctx.fillStyle='#202c2c';ctx.beginPath();ctx.roundRect(x-210,y+85,420,105,40);ctx.fill();for(let i=0;i<7;i++){ctx.fillStyle='#606962';ctx.beginPath();ctx.arc(x-160+i*54,y+138,27,0,Math.PI*2);ctx.fill();}ctx.fillStyle='#57645b';ctx.fillRect(x-160,y-190,320,280);ctx.strokeRect(x-160,y-190,320,280);ctx.fillStyle='#aa9671';ctx.fillRect(x-125,y-155,95,180);ctx.fillRect(x+35,y-155,90,180);ctx.fillStyle='#e4ab60';ctx.fillRect(x-15,y-125,26,180);}
  else {ctx.fillStyle='#527578';ctx.beginPath();ctx.moveTo(x-150,y-180);ctx.lineTo(x+120,y-200);ctx.lineTo(x+170,y-70);ctx.lineTo(x+40,y+10);ctx.lineTo(x-120,y-40);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#ffbc64';ctx.fillRect(x-60,y-140,130,18);for(let i=0;i<3;i++){ctx.fillStyle='#7cdef5aa';ctx.beginPath();ctx.moveTo(x-105+i*75,y-20);ctx.lineTo(x-70+i*75,y+70+Math.sin(b.elapsed*20+i)*15);ctx.lineTo(x-40+i*75,y-20);ctx.fill();}}
  ctx.restore();ctx.save();ctx.textAlign='center';ctx.font='bold 16px sans-serif';if(b.phaseTransition09>0){const t=1-b.phaseTransition09/(window.ESCALATION09?.motion.titanArrival||2);ctx.globalAlpha=Math.max(.05,t*t*(3-2*t));}
  for(const p of b.parts.filter(p=>p.phase===b.phase)){const q=this.projectBossEntity(p,w,h);ctx.fillStyle=p.destroyed?'#332d28':p.hitFlash>0?'#fff1c5':p.weapon?'#c5b188':'#708274';ctx.fillRect(q.x-q.r,q.y-25,q.r*2,50);ctx.strokeStyle='#182b2c';ctx.lineWidth=3;ctx.strokeRect(q.x-q.r,q.y-25,q.r*2,50);ctx.fillStyle='#112426';ctx.fillRect(q.x-q.r,q.y-40,q.r*2,7);ctx.fillStyle='#e5b065';ctx.fillRect(q.x-q.r,q.y-40,q.r*2*Math.max(0,p.hp/p.maxHp),7);ctx.fillStyle='#fff0ce';ctx.fillText(p.name,q.x,q.y-50);}
  if(b.attack09){const a=b.attack09,ci=targetCar(a,b),el=document.querySelector(`[data-car-index="${ci}"]`),r=el&&worldRect(el);if(r){ctx.fillStyle=a.zone==='center'?'#efc85a44':'#ff5e5e66';ctx.fillRect(r.left,r.top,r.width,r.height);ctx.strokeStyle='#ffb65a';ctx.lineWidth=4;ctx.strokeRect(r.left,r.top,r.width,r.height);}}
  ctx.restore();
 };
 const draw=g.draw.bind(g);g.draw=function(){const on=active(),deck=document.querySelector('#train-cars');document.body.classList.toggle('titan-final09',on);panel.hidden=!on;
  if(on){const b=this.state.battle,travel=1660/this.state.cars.length*.7;deck.style.transform=`translateX(${b.titanPosition09*travel}px) scale(.7)`;deck.style.transformOrigin='center bottom';const a=b.attack09,index=a?['near','center','far'].indexOf(a.zone):0;panel.querySelector('b').textContent=`TITAN · PHASE ${b.phase} · ${b.titanPosition09<-.3?'접근':b.titanPosition09>.3?'이탈':'중앙'} · 실제 전력 ${this.effectiveCarPower(0)}`;panel.querySelector('p').textContent=a?`${labels[b.phase-1][index]} · ${a.left.toFixed(1)}초`:'다음 공격 대기';for(const button of panel.querySelectorAll('button'))button.classList.toggle('active',Number(button.dataset.titanPower)===this.state.titanEnginePower09);}
  else if(deck&&deck.dataset.titanTransformed09){deck.style.removeProperty('transform');deck.style.removeProperty('transform-origin');delete deck.dataset.titanTransformed09;}if(on)deck.dataset.titanTransformed09='true';return draw();};
})();
