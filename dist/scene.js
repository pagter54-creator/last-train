/* Presentation/controller layer. The original combat, content, economy and save model stay shared. */
(() => {
  'use strict';
  const game = window.lastRail, D = window.GAME_DATA, B = D.BALANCE, V = window.SCENE_CONFIG;
  const $ = selector => document.querySelector(selector);
  const clamp = (v,a,b) => Math.max(a,Math.min(b,v));
  const tacticalPercent = Math.round(B.simulation.tacticalScale * 100);
  const original = {};
  for (const method of ['update','updateHUD','newRun','modalShell','closeOverlay','moveCrew','renderOrders','showStation','showHowTo','executeCommand','executeFocus','advanceStage','startBattle','spawnEnemy','log']) original[method] = game[method].bind(game);
  const menuHTML = $('#modal').innerHTML;
  let menuPreview = game.makeInitialState();
  let visualClock = 0, lastVisual = performance.now(), lastUI = 0;
  let tacticalSpeed = null, selectedEquipment = null, pausedSpeed = 1, dialogReturn = null;
  const crewPositions = new Map(), carPositions = new Map();
  const lowMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
  const scene = $('.canvas-wrap');
  const veil = document.createElement('div'); veil.className = 'tactical-veil'; document.body.append(veil);
  const panel = document.createElement('section'); panel.className = 'tactical-panel'; panel.setAttribute('aria-label','선택 대상 정보');
  panel.innerHTML = `<div class="tactical-head"><span>전술 선택 · 시간 ${tacticalPercent}%</span><button aria-label="선택 취소">×</button></div>`;
  panel.append($('#inspector'));
  const guide = document.createElement('div'); guide.className = 'selection-guide'; panel.append(guide); document.body.append(panel);
  panel.querySelector('button').onclick = () => cancelSelection();
  const dock = document.createElement('div'); dock.className = 'orders-dock'; dock.setAttribute('aria-label','열차장 명령');
  dock.append($('#focus-order'),$('#command-order'),$('#armor-order')); document.body.append(dock);
  const route = document.createElement('div'); route.className = 'stage-route'; $('.threat-strip').append(route);
  const routeLabel = document.createElement('div'); routeLabel.className='route-label'; $('.threat-strip').append(routeLabel);
  const note = document.createElement('div'); note.className='battle-note'; note.textContent='직원 클릭 → 빛나는 빈자리 클릭 · 포탑 클릭 → 장비 정보'; scene.append(note);
  $('.brand small').textContent='THE ASHLINE EXPRESS';
  $('.titan-pin').textContent='▲'; $('.train-pin').textContent='열차 ▸';
  $('.threat-copy span').textContent='타이탄까지';
  $('#menu-btn').setAttribute('aria-label','일시정지');
  $('#menu-btn').textContent='Ⅱ';
  $('#hint').textContent='지붕 위 포탑과 객차 안의 직원을 직접 눌러보세요.';

  // Small authored vector sprites share a coherent silhouette, palette and outline.
  const svg = (content, view='0 0 80 60') => `<svg viewBox="${view}" aria-hidden="true" xmlns="http://www.w3.org/2000/svg">${content}</svg>`;
  function portrait(crew) {
    const index = Math.max(0,D.CREW_TEMPLATES.findIndex(c=>c.name===crew.name));
    const color = crew.name==='열차장'?'#1c3157':V.crewColors[index % V.crewColors.length];
    const hat = crew.name==='열차장' ? '<path d="M10 12L15 5H32L37 12 33 16H13Z" fill="#172742" stroke="#d7b55e" stroke-width="2"/><path d="M12 16H35L30 20H15Z" fill="#0c192b"/><path d="M23 7L25 10 23 13 21 10Z" fill="#f4dd8f"/><path d="M10 32H17M30 32H37" stroke="#edca6b" stroke-width="4"/><circle cx="29" cy="38" r="3" fill="#edd484"/>' : index % 3 === 0 ? '<path d="M13 15L16 6 29 5 33 14 36 16H10Z" fill="#394a47"/><rect x="14" y="12" width="18" height="4" fill="#b5a575"/>' : index % 3 === 1 ? '<path d="M13 18V8L27 5 34 11V20L28 16 15 17Z" fill="#c0a171"/><rect x="14" y="10" width="18" height="5" rx="2" fill="#273e46"/><path d="M17 12h5m3 0h4" stroke="#93cace" stroke-width="2"/>' : '<path d="M13 17V9L19 5H29L34 12V23H30V15Z" fill="#403c35"/><path d="M11 19H15M31 19H35" stroke="#c8c0aa" stroke-width="4"/>';
    return svg(`<path d="M16 47L14 59H22L24 48 27 59H35L32 44" fill="#1d2c32" stroke="#101f25" stroke-width="2"/><path d="M12 31L17 27H30L35 33 37 47 31 48 29 37V50H17V37L13 47 8 44Z" fill="${color}" stroke="#192931" stroke-width="2"/><path d="M19 28L24 34 29 28M18 40H30" fill="none" stroke="#efe0b6" stroke-width="3"/><path d="M15 15H31V24L26 29H20L15 24Z" fill="#dab393" stroke="#2a3336" stroke-width="2"/>${hat}<path d="M18 20H21M26 20H29" stroke="#243038" stroke-width="2"/><path d="M25 33V47" stroke="#30404a" stroke-width="4"/><rect x="15" y="47" width="18" height="4" fill="#766951"/>`,'0 0 46 64');
  }
  function equipmentArt(eq) {
    const module = eq.kind==='module';
    const outline='stroke="#192c32" stroke-width="3" stroke-linejoin="round"';
    const base='<path d="M20 50H62L66 58H14Z" fill="#798a80" stroke="#1a3036" stroke-width="3"/><rect x="32" y="36" width="15" height="17" fill="#374f55"/>';
    const art = {
      gatling:`<path d="M30 22L39 14 58 16 65 29 55 43H28Z" fill="#667b7a" ${outline}/><path d="M5 20H37V29H5ZM3 30H35V38H3Z" fill="#a3b0a0" ${outline}/><path d="M8 18V40M17 19V38" stroke="#263d45" stroke-width="3"/><circle cx="49" cy="28" r="8" fill="#263e44"/><circle cx="49" cy="28" r="3" fill="#dfc687"/>`,
      cannon:`<path d="M30 24L43 16 62 20 66 37 52 46H29Z" fill="#819082" ${outline}/><path d="M0 11L9 7 42 26 37 36 0 18Z" fill="#afb29a" ${outline}/><path d="M8 10L6 21M20 15L16 27" stroke="#344d52" stroke-width="4"/><path d="M43 24H58V33H43Z" fill="#263f47"/>`,
      scatter:`<path d="M25 24H57L64 41H23Z" fill="#a59068" ${outline}/><path d="M1 19H35V28H1ZM1 30H35V39H1Z" fill="#919c8c" ${outline}/><path d="M7 19V40" stroke="#1a313a" stroke-width="4"/>`,
      mortar:`<path d="M23 44L41 20 49 22 42 46Z" fill="#a8a587" ${outline}/><path d="M17 5L29 1 49 35 37 43Z" fill="#899b94" ${outline}/><path d="M19 8L30 4" stroke="#293c42" stroke-width="6"/>`,
      tesla:`<path d="M28 47L32 12H47L54 47Z" fill="#546d6e" ${outline}/><path d="M27 21H52M26 28H54M24 35H56" stroke="#8ad9d8" stroke-width="4"/><ellipse cx="39" cy="10" rx="18" ry="7" fill="#94bfb6" ${outline}/><path d="M37 2L31 15H45L39 30" stroke="#caf6e5" fill="none" stroke-width="3"/>`
    };
    if(module) return svg(`${base}<rect x="20" y="17" width="40" height="33" rx="5" fill="#5e8481" ${outline}/><rect x="27" y="23" width="26" height="20" rx="3" fill="#213e47"/><text x="40" y="39" text-anchor="middle" font-family="sans-serif" font-size="19" fill="#b0e0ce">${D.MODULES[eq.type].icon}</text>`);
    return svg(base+(art[eq.type]||art.cannon));
  }
  function cancelSelection() {
    game.inspectedEquipment=null;game.inspectedCrew=null;game.moduleRange=null;
    if(game.state){game.state.selectedCrew=null;game.state.targetMode=null;game.state.selectedCar=null;}
    selectedEquipment=null;game.setTactical(false);game.renderCars();
    guide.textContent='';
  }
  game.setTactical = function(on) {
    if(on && (!this.state || this.mode!=='battle' || $('#overlay').classList.contains('show')))return;
    if(on && tacticalSpeed===null){tacticalSpeed=this.state.speed;this.state.speed=tacticalSpeed===0?0:B.simulation.tacticalScale;}
    if(!on && tacticalSpeed!==null){if(this.state)this.state.speed=tacticalSpeed;tacticalSpeed=null;}
    document.body.classList.toggle('is-tactical',on);
    panel.querySelector('.tactical-head span').textContent=this.state?.speed===0?'전술 선택 · 일시정지':`전술 선택 · 시간 ${tacticalPercent}%`;
    this.renderSpeed();
  };
  game.selectCrew = function(id){
    if(this.mode!=='battle'||$('#overlay').classList.contains('show'))return;
    const c=this.state.crew.find(x=>x.id===id);if(!c)return;
    if(this.state.selectedCrew&&this.state.selectedCrew!==id)return this.swapCrew(this.state.selectedCrew,id);
    if(c.dead||c.hp<=0){this.toast(c.dead?'이 직원은 사망했습니다.':'전투불능 상태에서는 이동할 수 없습니다.');return;}
    if(c.moving){this.toast('직원이 이동 중입니다.');return;}
    if(this.state.cars[c.car].armor>0){this.toast('비상 장갑이 해제된 후 이동할 수 있습니다.');return;}
    selectedEquipment=null;this.state.selectedCrew=id;this.state.targetMode=null;this.setTactical(true);this.inspectCrew(c);
    guide.textContent='열차 안의 빛나는 빈자리를 누르면 이동합니다. Esc로 선택을 취소할 수 있습니다.';this.renderCars();
  };
  game.moveCrew = function(id,to){
    const s=this.state,c=s?.crew.find(x=>x.id===id);if(!c||!s.cars[to])return;
    if(c.dead||c.hp<=0||c.moving||s.cars[c.car].armor>0||s.cars[to].armor>0)return this.toast('지금은 이동할 수 없습니다.');
    const reserved=s.crew.filter(x=>x.id!==id&&(x.moving?x.moving.to===to:x.car===to)).length;
    if(reserved>=this.crewCapacity(to))return this.toast('해당 객차에 빈자리가 없습니다.');
    if(to===c.car)return cancelSelection();
    original.moveCrew(id,to);cancelSelection();this.hint(`${c.name} → ${s.cars[to].name} 이동 중`);
  };
  function inspectEquipment(id){
    const eq=game.findEquipment(id);if(!eq||game.mode!=='battle')return;
    game.state.selectedCrew=null;game.state.targetMode=null;selectedEquipment=id;game.setTactical(true);
    if(game.showEquipmentDetails){game.showEquipmentDetails(id);game.renderCars();return;}
    const data=eq.kind==='turret'?D.TURRETS[eq.type]:D.MODULES[eq.type];
    const ci=game.state.cars.findIndex(c=>c.equipment.includes(eq));
    const stats=eq.kind==='turret'?game.turretStats(eq,ci,null):null;
    $('#inspector').innerHTML=`<h3>${data.name}</h3><p>${game.state.cars[ci].name} · ${data.role||game.moduleDescription(data)}</p>${stats?`<div class="stat-grid"><span><b>${Math.round(stats.damage)}</b>피해</span><span><b>${stats.interval.toFixed(2)}</b>간격/초</span><span><b>${Math.round(eq.heat)}</b>발열</span><span><b>${eq.level}</b>레벨</span></div><p>${eq.overheated?'과열 · 냉각 중':'가까운 적부터 자동 사격'}<br>전력 ${game.state.cars[ci].power} · ${eq.branch?data.branch.name:'기본 강화'}</p>`:`<p>효과 범위: 현재 객차 + 좌우 ${data.range}칸</p>`}`;
    guide.textContent='각 객차 아래 전력 버튼으로 출력을 조절하세요. 전력을 옮기면 기관실 속도도 달라집니다.';
    game.renderCars();
  }

  game.renderCars=function(){
    const s=this.state||menuPreview;if(!s)return;
    const html=s.cars.map((car,i)=>{
      const crew=s.crew.filter(c=>c.car===i&&!c.moving), incoming=s.crew.filter(c=>c.moving?.to===i).length;
      const available=!!s.selectedCrew&&car.armor<=0&&crew.length+incoming<this.crewCapacity(i);
      const art=car.equipment.map(eq=>`<button class="equipment-button ${eq.overheated?'overheated':''} ${selectedEquipment===eq.id?'targeted':''}" data-equipment="${eq.id}" aria-label="${(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type].name} 정보">${equipmentArt(eq)}<span class="eq-label">${(eq.kind==='turret'?D.TURRETS:D.MODULES)[eq.type].name}</span>${eq.kind==='turret'?`<span class="equipment-heat"><i style="width:${clamp(eq.heat/B.heat.max*100,0,100)}%"></i></span>`:''}</button>`).join('');
      const blankEquipment=Array.from({length:Math.max(0,this.equipmentCapacity(i)-car.equipment.length)},()=>'<span class="empty-equipment" title="장비 슬롯">+</span>').join('');
      const people=crew.map(c=>`<button class="crew-sprite ${c.dead||c.hp<=0?'ko':''} ${s.selectedCrew===c.id?'selected':''}" data-crew="${c.id}" aria-label="직원 ${c.name} 선택 · HP ${Math.ceil(c.hp)}">${portrait(c)}<span class="crew-health"><i style="width:${c.hp/c.maxHp*100}%"></i></span><span class="crew-tag">${c.dead?'사망':c.hp<=0?'전투불능':c.name}</span></button>`).join('');
      const blanks=Array.from({length:Math.max(0,this.crewCapacity(i)-crew.length)},(_,slot)=>`<button class="empty-crew ${available&&slot>=incoming?'available':''}" data-destination="${i}" aria-label="${car.name} 빈자리 ${slot+1}" ${available&&slot>=incoming?'':'disabled'}>${slot<incoming?'↘':'+'}</button>`).join('');
      const powerSteps=Math.max(...Object.values(D.TURRETS).map(t=>t.power.length));
      const p=i===0?`<span>엔진</span> ϟ ${car.power} <span>${(B.train.speedByPower[car.power]||0).toFixed(2)}</span>`:`<span>ϟ</span>${Array.from({length:powerSteps+1},(_,n)=>n).map(n=>`<button data-output="${n}" data-car="${i}" class="${car.power===n?'on':''}" aria-label="${car.name} 전력 ${n}">${n}</button>`).join('')}`;
      return `<article class="railcar ${i===0?'engine':''} ${car.hp<=0?'destroyed':''} ${car.armor>0?'armored':''}" data-car-index="${i}" aria-label="${car.name}"><div class="car-hull"></div><div class="equipment-row">${art}${blankEquipment}</div><span class="car-name">${i===0?'01 · 기관실':`${String(i+1).padStart(2,'0')} · ${car.name}`}</span>${i===0?'<span class="engine-badge">LAST RAIL</span>':''}<div class="car-window">${people}${blanks}</div><div class="wheels"><i class="wheel"></i><i class="wheel"></i></div><div class="hull-hp" title="객차 HP ${Math.ceil(car.hp)}"><i style="width:${car.hp/car.maxHp*100}%;background:${car.hp<=car.maxHp*.3?'#da8d6e':''}"></i></div><div class="power-console">${p}</div></article>`;
    }).join('');
    const deck=$('#train-cars');
    // Preserve buttons under the pointer; rebuild only when visible content changes.
    const structure=html.replace(/<span class="equipment-heat">.*?<\/span>/g,'');
    if(deck._markup!==structure){deck.innerHTML=html;deck._markup=structure;}
    s.cars.forEach(car=>car.equipment.filter(eq=>eq.kind==='turret').forEach(eq=>{const bar=deck.querySelector(`[data-equipment="${eq.id}"] .equipment-heat i`);if(bar)bar.style.width=`${clamp(eq.heat/B.heat.max*100,0,100)}%`;}));
    deck.querySelectorAll('.railcar').forEach(el=>{const r=el.getBoundingClientRect();carPositions.set(Number(el.dataset.carIndex),{x:r.left+r.width/2,y:r.top+16,w:r.width,h:r.height});});
    deck.querySelectorAll('[data-crew]').forEach(el=>{const r=el.getBoundingClientRect();crewPositions.set(el.dataset.crew,{x:r.left+r.width/2,y:r.top});});
    this.renderMovingCrew(s);
  };
  game.renderCrew=()=>{};
  game.log=function(message,kind=''){original.log(message,kind);note.textContent=message;note.style.color=kind==='bad'?'var(--negative)':kind==='hot'?'var(--positive)':'#f0ede2';};
  game.renderMovingCrew=function(s){
    document.querySelectorAll('.moving-sprite').forEach(el=>{if(!s.crew.some(c=>c.moving&&c.id===el.dataset.id))el.remove();});
    for(const c of s.crew.filter(c=>c.moving)){
      let el=document.querySelector(`.moving-sprite[data-id="${c.id}"]`);
      if(!el){el=document.createElement('div');el.className='moving-sprite';el.dataset.id=c.id;el.innerHTML=portrait(c);document.body.append(el);}
      const a=carPositions.get(c.moving.from),b=carPositions.get(c.moving.to);if(!a||!b)continue;
      const progress=clamp(1-c.moving.left/c.moving.total,0,1);
      el.style.left=`${a.x+(b.x-a.x)*progress-17}px`;el.style.top=`${a.y+15}px`;
      const walk=(c.moving.total-c.moving.left)*B.feedback.walkCyclesPerSecond*Math.PI*2;
      el.style.transform=`translateY(${-Math.abs(Math.sin(walk))*B.feedback.walkLift}px) rotate(${Math.sin(walk)*B.feedback.walkAngle}deg)`;
    }
  };
  $('#train-cars').onclick=e=>{
    if(!game.state||game.mode!=='battle')return;
    const crew=e.target.closest('[data-crew]'),eq=e.target.closest('[data-equipment]'),dest=e.target.closest('[data-destination]'),power=e.target.closest('[data-output]'),car=e.target.closest('[data-car-index]');
    if(power){game.setCarPower(Number(power.dataset.car),Number(power.dataset.output));return;}
    if(game.state.targetMode==='command'&&car){game.executeCommand(Number(car.dataset.carIndex));return;}
    if(game.state.targetMode==='armor'&&car){game.executeArmor(Number(car.dataset.carIndex));return;}
    if(e.target.closest('[data-captain]')){game.openCaptain();return;}
    if(crew){game.selectCrew(crew.dataset.crew);return;}
    if(eq){inspectEquipment(eq.dataset.equipment);return;}
    if(dest&&game.state.selectedCrew){game.moveCrew(game.state.selectedCrew,Number(dest.dataset.destination));}
  };
  game.executeCommand=function(i){if(this.state.cars[i].hp<=0)return this.toast('파괴된 객차에는 직접 지휘를 배치할 수 없습니다.');original.executeCommand(i);cancelSelection();};
  game.executeFocus=function(t){original.executeFocus(t);cancelSelection();};
  const activate=game.activateOrder.bind(game);
  game.activateOrder=function(type){if($('#overlay').classList.contains('show'))return;activate(type);if(this.state?.targetMode!==type)return;
    this.inspectedEquipment=null;this.inspectedCrew=null;this.moduleRange=null;selectedEquipment=null;
    $('#inspector').innerHTML=`<h3>${type==='focus'?'집중 사격':'직접 지휘'}</h3><p>${type==='focus'?'황무지의 적을 누르세요. 모든 포탑이 해당 적을 우선 공격합니다.':'지휘할 객차를 누르세요. 해당 객차 직원의 능력이 상승합니다.'}</p>`;
    guide.textContent='Esc 또는 ×로 선택 취소';
  };
  const armor=game.activateArmor.bind(game);
  game.activateArmor=function(){if(!$('#overlay').classList.contains('show')){armor();cancelSelection();}};
  window.addEventListener('keydown',e=>{if(e.key==='Escape'){e.stopImmediatePropagation();if(document.body.classList.contains('is-tactical'))cancelSelection();else if($('#overlay').classList.contains('show'))game.dismissDialog();else game.openPause();}},true);

  game.updateHUD=function(){
    if(this.state)original.updateHUD();
    const s=this.state||menuPreview,act=D.ACTS[s.actId],b=s.battle;
    $('#stage-label').textContent=`${Math.min(s.stageIndex+1,act.stages.length)} / ${act.stages.length}`;
    route.innerHTML=act.stages.map((_,i)=>`<i class="${i<s.stageIndex?'done':i===s.stageIndex?'current':''}"></i>`).join('');
    const progress=this.mode==='result'?1:b?clamp(b.elapsed/b.duration,0,1):0;
    $('#threat-fill').style.width=`${progress*100}%`;
    $('.train-pin').style.left=`${progress*100}%`;$('.train-pin').style.right='auto';
    routeLabel.textContent=b?.boss?`${b.title} · 보스전`:`구간 진행 ${Math.round(progress*100)}%`;
    const resources=$('.shop-resources');if(resources)resources.textContent=`돈 ¤ ${Math.floor(s.money)}　 고철 ▰ ${Math.floor(s.scrap)}　 잔해 ◆ ${s.relics}`;
  };
  game.modalShell=function(title,kicker,text){
    cancelSelection();const modal=original.modalShell(title,kicker,text);
    modal.querySelector('.close-btn').onclick=()=>this.dismissDialog();
    if(['event','result','station','gameover','ending','run'].includes(this.mode))modal.querySelector('.close-btn').classList.add('hidden');
    return modal;
  };
  game.dismissDialog=function(){if(this.mode==='menu')return this.showMainMenu();if(dialogReturn){const f=dialogReturn;dialogReturn=null;return f();}if(this.mode==='battle')this.closeOverlay();};
  game.openPause=function(){
    if(!this.state||this.mode==='menu')return this.showMainMenu();
    if(this.mode!=='battle')return;
    cancelSelection();if(!$('#overlay').classList.contains('show'))pausedSpeed=this.state.speed;this.state.speed=0;
    const modal=this.modalShell('작전 일시정지','LAST RAIL','열차장, 숨을 고르십시오.');
    modal.querySelector('.dialog-body').innerHTML=`<div class="doctrine-row"><div><b>긴급 자동 수리 교리</b><p>수리 능력이 높은 직원이 심하게 손상된 객차를 수리합니다.</p></div><button class="switch ${this.state.doctrine?'on':''}" id="doctrine-switch" aria-label="자동 수리 교리 전환"></button></div><div class="station-actions"><button id="pause-howto">조작법</button><button id="abandon">런 종료</button><button class="depart" id="resume">계속 달리기 →</button></div>`;
    $('#doctrine-switch').onclick=()=>{this.state.doctrine=!this.state.doctrine;$('#doctrine-switch').classList.toggle('on',this.state.doctrine);};
    $('#resume').onclick=()=>this.closeOverlay();$('#abandon').onclick=()=>this.returnMenu();$('#pause-howto').onclick=()=>{dialogReturn=()=>this.openPause();this.showHowTo();};
    this.renderSpeed();
  };
  game.closeOverlay=function(){original.closeOverlay();if(this.mode==='battle')this.state.speed=pausedSpeed;this.renderSpeed();};
  game.showHowTo=function(){
    const modal=this.modalShell('열차장 교범','HOW TO PLAY','열차 위에서 직접 선택하고 지휘하세요.');
modal.querySelector('.dialog-body').innerHTML=`<div class="choices"><div class="choice-card"><span class="choice-icon">01</span><div><b>직원을 누르고, 빈자리를 누르세요</b><p>직원 선택 중에는 시간이 ${tacticalPercent}%로 느려집니다. 밝게 표시되는 빈자리를 누르면 이동합니다.</p></div></div><div class="choice-card"><span class="choice-icon">02</span><div><b>포탑을 눌러 성능 확인</b><p>지붕 위 포탑은 가까운 적을 자동 공격합니다. 포탑을 누르면 피해량, 발열, 강화 상태를 확인합니다.</p></div></div><div class="choice-card"><span class="choice-icon">03</span><div><b>객차 아래 전력 버튼</b><p>1 / 2 / 3으로 출력을 바꿉니다. 포탑에 전력을 더 주면 열차 속도가 낮아집니다.</p></div></div><div class="choice-card"><span class="choice-icon">04</span><div><b>오른쪽 아래 열차장 명령</b><p>집중 사격 → 적 선택. 직접 지휘 → 객차 선택. 비상 장갑 → 즉시 전개. Esc는 선택 취소, 다시 누르면 일시정지입니다.</p></div></div></div>`;
  };
  game.showMainMenu=function(){
    this.mode='menu';this.state=null;tacticalSpeed=null;selectedEquipment=null;document.body.classList.remove('is-tactical');
    const modal=$('#modal');modal.className='modal menu-modal';modal.innerHTML=menuHTML;$('#overlay').classList.add('show');
    $('#new-run-btn').onclick=()=>this.newRun();$('#meta-btn').onclick=()=>this.showMeta();$('#codex-btn').onclick=()=>this.showCodex();$('#howto-btn').onclick=()=>this.showHowTo();
    $('#new-run-btn').innerHTML='출발하기 <span>ACT I →</span>';$('.menu-deck').textContent='재의 황무지를 가로지르는 마지막 열차. 승무원을 움직이고, 포대를 지휘하고, 타이탄의 추격에서 벗어나세요.';
    this.drawMenuState();this.renderCars();this.updateHUD();
  };
  game.drawMenuState=function(){const label=$('#menu-relics');if(label)label.textContent=`${this.meta.relics} ◆`;};
  game.returnMenu=function(){this.showMainMenu();};
  game.newRun=function(){tacticalSpeed=null;selectedEquipment=null;pausedSpeed=1;original.newRun();};
  game.setSpeed=function(v){if(v>0&&B.simulation.speedOptions.includes(v))this.preferredSpeed=v;if(!this.state||$('#overlay').classList.contains('show'))return;if(tacticalSpeed!==null){tacticalSpeed=v;this.state.speed=v===0?0:B.simulation.tacticalScale;}else this.state.speed=v;this.state.priorSpeed=v;pausedSpeed=v;this.renderSpeed();};
  game.loop=function(now){const dt=Math.min((now-this.lastFrame)/1000,B.simulation.maxDelta);this.lastFrame=now;this.update(dt);this.draw();requestAnimationFrame(t=>this.loop(t));};
  game.update=function(dt){if($('#overlay').classList.contains('show'))return;original.update(dt);};
  game.resolveEventChoice=function(choice){
    if(this.eventPending)return;if(!this.canPay(choice.cost))return this.toast('자원이 부족합니다.');this.eventPending=true;
    this.pay(choice.cost);let ok=true;
    if(choice.req)ok=this.state.crew.some(c=>!c.dead&&c.hp>0&&c.stats[choice.req]>=choice.value);
    if(choice.reqTrait)ok=this.state.crew.some(c=>!c.dead&&c.hp>0&&c.traits.includes(choice.reqTrait));
    this.applyResult(ok?choice.result:choice.risk||{});
    this.showDialog(ok?'보급 확보':'예상 밖의 변수','선택 결과',ok?'확보한 자원을 열차에 실었습니다.':'조건을 충족하지 못해 위험이 발생했습니다.',[{label:'다음 구간으로',text:'다시 황무지로 출발합니다.',icon:'→'}],()=>{this.eventPending=false;this.closeOverlay();this.advanceStage();});
  };
  game.showStation=function(){
    original.showStation();
    const resources=document.createElement('div');resources.className='shop-resources';$('.dialog-body').prepend(resources);
    const decorate=()=>{
      document.querySelectorAll('.shop-item').forEach(card=>{
        const buy=card.querySelector('[data-buy="gear"]');
        if(buy&&!card.querySelector('.shop-preview')){const art=document.createElement('div');art.className='shop-preview';art.innerHTML=equipmentArt({type:buy.dataset.id,kind:buy.dataset.kind});card.prepend(art);}
      });this.updateHUD();
    };
    $('#modal').addEventListener('click',()=>queueMicrotask(decorate));decorate();
  };

  // A single projection is used by drawing, hit testing and projectile endpoints.
  function project(enemy,w,h){
    if('destroyed' in enemy)return {x:w*enemy.x,y:h*(.26+(enemy.y-.3)*.65),scale:1,r:40};
    const depth=clamp(1-enemy.x,0,1);
    const lane=clamp((enemy.y-.25)/.48,0,1);
    const x=w*(.08+lane*.84),ground=h*V.horizon+V.groundOffset+V.spawnInset,y=ground+(h*V.perspective.approachEnd-ground)*depth*depth;
    const scale=V.perspective.farScale+depth*(V.perspective.nearScale-V.perspective.farScale);
    if(enemy.boarded){const p=carPositions.get(enemy.targetCar);if(p)return{x:p.x-18,y:p.y+36,scale:1,r:24};}
    if(enemy.entrySide==='left'){const p=carPositions.get(enemy.targetCar),progress=clamp((enemy.entryStart-enemy.x)/(enemy.entryStart-B.battle.boardDistance),0,1);if(p)return{x:-45+(p.x+27)*progress,y:p.y+36-Math.sin(progress*Math.PI)*h*.1,scale:.7+progress*.3,r:24};}
    return{x,y,scale,r:Math.max(15,25*scale)};
  }
  game.canvasClick=function(event){
    if(this.mode!=='battle'||$('#overlay').classList.contains('show'))return;
    const r=this.canvas.getBoundingClientRect(),x=event.clientX-r.left,y=event.clientY-r.top;
    const candidates=[...this.state.enemies.filter(e=>!e.dead),...(this.state.battle?.parts||[]).filter(p=>!p.destroyed)];
    const target=candidates.map(e=>({e,p:project(e,this.view.w,this.view.h)})).filter(({p})=>Math.hypot(p.x-x,p.y-y)<p.r+12).sort((a,b)=>Math.hypot(a.p.x-x,a.p.y-y)-Math.hypot(b.p.x-x,b.p.y-y))[0];
    if(target){if(this.state.targetMode==='focus')this.executeFocus(target.e);else{cancelSelection();this.setTactical(true);this.state.selectedEnemy=target.e.id;this.inspectEnemy(target.e);guide.textContent='집중 사격 명령을 선택한 뒤 적을 누르면 공격을 집중합니다.';}}
    else if(document.body.classList.contains('is-tactical'))cancelSelection();
  };
  game.pickTurretTarget=function(ci,t){
    const focus=this.state.orders.focus,bonus=focus.active>0?B.focus.rangeBonus+(this.meta.upgrades.focus?B.meta.focusRangeBonus:0):0;
    const targets=this.state.enemies.filter(e=>!e.dead&&Math.max(0,e.x)<=B.targeting[t.range]*(1+bonus)&&Math.max(0,e.x)>=(t.minRange?B.targeting[t.minRange]:0));
    const parts=(this.state.battle.parts||[]).filter(p=>!p.destroyed);
    if(focus.active>0){const target=[...targets,...parts].find(e=>e.id===focus.target);if(target)return target;}
    return targets.sort((a,b)=>a.x-b.x)[0]||parts.find(p=>p.victory)||parts[0]||null;
  };
  game.draw=function(){
    const ctx=this.ctx,w=this.view?.w||1,h=this.view?.h||1,now=performance.now();
    const dt=Math.min((now-lastVisual)/1000,.1);lastVisual=now;
    const inMenu=this.mode==='menu',overlay=$('#overlay').classList.contains('show');
    let pace=inMenu?V.motion.idle:this.mode==='battle'?(overlay?0:this.state.speed):V.motion.idle;
    if(this.mode==='run'&&this.state?.launchElapsed<B.launch.seconds)pace=1+B.launch.visualSpeed*(this.state.launchElapsed/B.launch.seconds);
    if(this.sceneTransition)pace=this.sceneTransition.boost;
    pace*=((this.state?.currentTrainSpeed||B.train.speedByPower[B.train.enginePower.start])/B.train.speedByPower[B.train.enginePower.start]);
    visualClock+=dt*pace;
    const t=visualClock,horizon=h*V.horizon;
    ctx.clearRect(0,0,w,h);
    const sky=ctx.createLinearGradient(0,0,0,horizon+80);sky.addColorStop(0,V.palette.sky);sky.addColorStop(1,V.palette.haze);ctx.fillStyle=sky;ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#e7d7aa';ctx.globalAlpha=.62;ctx.beginPath();ctx.arc(w*.76,h*.16,h*.046,0,Math.PI*2);ctx.fill();ctx.globalAlpha=1;
    for(let j=0;j<7;j++){const x=((j*w/5-t*V.motion.clouds)%(w+300)+(w+300))%(w+300)-200;ctx.fillStyle='#b4c4bc14';ctx.fillRect(x,h*(.10+(j%3)*.055),150+j*15,3+j%3);}
    this.drawMountainLayers?.(ctx,w,h,visualClock);
    const ground=ctx.createLinearGradient(0,horizon+20,0,h);ground.addColorStop(0,'#9b8b70');ground.addColorStop(.28,V.palette.sand);ground.addColorStop(1,V.palette.earth);ctx.fillStyle=ground;ctx.fillRect(0,horizon+28,w,h);
    const launching=this.mode==='run'&&this.state?.launchElapsed<B.launch.seconds;
    const launchProgress=launching?clamp(this.state.launchElapsed/B.launch.seconds,0,1):1;
    if(launching){
      ctx.save();ctx.globalAlpha=1-launchProgress;
      ctx.translate(w*.12,horizon+V.groundOffset);ctx.scale(1-launchProgress*.8,1-launchProgress*.8);
      ctx.fillStyle='#192b30';ctx.beginPath();ctx.moveTo(-70,0);ctx.lineTo(-52,-70);ctx.lineTo(-28,-84);ctx.lineTo(-18,-130);ctx.lineTo(20,-138);ctx.lineTo(38,-76);ctx.lineTo(65,-55);ctx.lineTo(85,0);ctx.closePath();ctx.fill();
      ctx.fillStyle='#ff8585';ctx.fillRect(-8,-105,22,5);ctx.restore();
    }
    $('#train-cars').style.translate=this.sceneTransition?`${this.sceneTransition.offset}px 0`:lowMotion?'none':`${(launchProgress-1)*V.launchSlide}px 0`;
    const motion=lowMotion?.22:1;
    // Perspective grit / shadows: nearest terrain crosses the screen much faster.
    for(let i=0;i<V.motion.debris;i++){
      const depth=(i*.61803398875)%1,y=horizon+32+Math.pow(depth,1.35)*(h-horizon),speed=V.motion.ground*(.09+depth*depth)*motion;
      const x=((i*137.93-t*speed)%(w+200)+(w+200))%(w+200)-100;
      const size=1+depth*5;
      ctx.fillStyle=i%3===0?'#c4ae8242':'#292e294d';ctx.beginPath();ctx.ellipse(x,y,size*3.5,size*.42,0,0,Math.PI*2);ctx.fill();
      if(i%7===0){ctx.strokeStyle='#2d393866';ctx.lineWidth=1+depth;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+size*.4,y-size*3);ctx.lineTo(x+size*1.4,y-size*2);ctx.moveTo(x+size*.5,y-size*1.6);ctx.lineTo(x-size,y-size*2.6);ctx.stroke();}
    }
    // Rail sleepers visibly travel left, so the train runs to the right.
    const deck=$('#train-cars').getBoundingClientRect(),railY=deck.bottom-5;
    ctx.fillStyle='#222c2e';ctx.fillRect(0,railY,w,20);
    for(let x=-80-(t*V.motion.ground*motion)%65;x<w+80;x+=65){ctx.fillStyle='#766d57';ctx.fillRect(x,railY+2,22,25);ctx.fillStyle='#202d2c';ctx.fillRect(x+2,railY+3,17,4);}
    ctx.fillStyle='#b0ada0';ctx.fillRect(0,railY+1,w,3);ctx.fillStyle='#636e66';ctx.fillRect(0,railY+19,w,4);
    // Subtle long peripheral wind streaks rather than a full-screen blur.
    if(pace>0&&!lowMotion){ctx.strokeStyle='#e4ddba25';ctx.lineWidth=1;for(let i=0;i<V.motion.streaks;i++){const phase=(t*1.7+i*.317)%1,side=i%2,x=side?w-phase*80:phase*80,y=h*(.32+(i*.173)% .46),length=40+phase*120;ctx.globalAlpha=(1-phase)*.5;ctx.beginPath();ctx.moveTo(x,y);ctx.lineTo(x+(side?-length:length),y);ctx.stroke();}ctx.globalAlpha=1;}
    if(this.state){this.drawTacticalRanges?.(ctx,w,h);this.drawImpactAreas?.(ctx,w,h);if(this.state.battle?.boss)this.drawBoss(ctx,w,h);this.drawEnemies(ctx,w,h,t);this.drawProjectiles(ctx,w,h);this.drawParticles(ctx,w,h);this.renderMovingCrew(this.state);}
    if(now-lastUI>V.refreshMs){lastUI=now;this.updateHUD();this.renderCars();if(this.state)this.renderOrders();}
    const wheelDuration=pace===0?'paused':'running';document.querySelectorAll('.wheel').forEach(el=>{el.style.animationPlayState=wheelDuration;el.style.animationDuration=`${.22/Math.max(.2,pace)}s`;});
  };
  game.drawEnemies=function(ctx,w,h,t){
    for(const e of [...this.state.enemies].sort((a,b)=>b.x-a.x)){
      if(e.dead)continue;const d=D.ENEMIES[e.type],p=project(e,w,h);ctx.save();ctx.globalAlpha=clamp((e.age||0)/V.emergenceSeconds,0,1);ctx.translate(p.x+(e.hitFlash>0?Math.sin(e.hitFlash*130)*4:0),p.y);ctx.scale(p.scale,p.scale);
      ctx.fillStyle='#14202b50';ctx.beginPath();ctx.ellipse(0,13,28,6,0,0,Math.PI*2);ctx.fill();
      ctx.strokeStyle='#203338';ctx.lineWidth=2;
      if(d.special){ctx.fillStyle='#617e78';ctx.beginPath();ctx.moveTo(-25,0);ctx.lineTo(0,-13);ctx.lineTo(25,0);ctx.lineTo(0,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#b8ece0';ctx.fillRect(-8,-4,16,5);}
      else if(d.boards){ctx.fillStyle='#baac8d';ctx.beginPath();ctx.arc(0,-16,6,0,Math.PI*2);ctx.fill();ctx.fillStyle='#586964';ctx.fillRect(-7,-9,14,17);ctx.strokeStyle='#243536';ctx.lineWidth=5;ctx.beginPath();ctx.moveTo(-4,8);ctx.lineTo(-9,19);ctx.moveTo(4,8);ctx.lineTo(10,19);ctx.stroke();ctx.strokeStyle='#cdb982';ctx.lineWidth=3;ctx.beginPath();ctx.moveTo(6,-1);ctx.lineTo(18,-6);ctx.stroke();}
      else{
        ctx.fillStyle='#172a2e';ctx.fillRect(-24,0,11,18);ctx.fillRect(13,0,11,18);ctx.fillStyle=d.armor>.4?'#697669':'#9a8061';ctx.beginPath();ctx.moveTo(-22,-7);ctx.lineTo(-12,-16);ctx.lineTo(12,-16);ctx.lineTo(22,-7);ctx.lineTo(24,10);ctx.lineTo(-24,10);ctx.closePath();ctx.fill();ctx.stroke();ctx.fillStyle='#243c43';ctx.fillRect(-12,-12,24,8);ctx.fillStyle='#e2c896';ctx.fillRect(-18,5,6,3);ctx.fillRect(12,5,6,3);ctx.fillStyle='#afad90';ctx.fillRect(-3,-25,6,14);
      }
      if(e.hitFlash>0){ctx.fillStyle='#ffffffbb';ctx.beginPath();ctx.ellipse(0,-2,26,23,0,0,Math.PI*2);ctx.fill();}
      ctx.fillStyle='#1b2a2dc4';ctx.fillRect(-24,-35,48,4);ctx.fillStyle=e.boarded?'#ef7777':'#e0bd7e';ctx.fillRect(-24,-35,48*e.hp/e.maxHp,4);
      if(this.state.targetMode==='focus'||this.state.selectedEnemy===e.id){ctx.strokeStyle='#ffe4a1';ctx.lineWidth=1.5;ctx.setLineDash([6,4]);ctx.strokeRect(-31,-30,62,55);}
      if(p.scale>1.05){ctx.font='9px sans-serif';ctx.textAlign='center';ctx.fillStyle='#f0e4c8';ctx.fillText(d.name,0,-40);}
      ctx.restore();
    }
  };
  game.drawBoss=function(ctx,w,h){
    const parts=this.state.battle.parts;ctx.save();ctx.fillStyle='#273638';ctx.strokeStyle='#afb194';ctx.lineWidth=2;ctx.beginPath();ctx.roundRect(w*.68,h*.25,w*.27,h*.31,15);ctx.fill();ctx.stroke();
    for(const p of parts){const xy=project(p,w,h);ctx.fillStyle=p.hitFlash>0?'#ffffff':p.destroyed?'#403b35':'#5b6c64';ctx.fillRect(xy.x-32,xy.y-19,64,38);ctx.fillStyle='#edcea0';ctx.fillRect(xy.x-32,xy.y-25,64*p.hp/p.maxHp,3);ctx.fillStyle='#efe9d2';ctx.font='12px sans-serif';ctx.textAlign='center';ctx.fillText(p.name,xy.x,xy.y+4);}ctx.restore();
  };
  game.drawProjectiles=function(ctx,w,h){
    if(this.mode!=='battle')return;
    for(const p of this.state.projectiles){
      const from=carPositions.get(p.from);if(!from)continue;
      // Stored simulation coordinates are projected exactly like the target.
      const bossPart=this.state.battle?.parts?.find(part=>part.x===p.tx&&part.y===p.ty);
      const tracked=this.state.enemies.find(e=>e.id===p.targetId);
      const target=project(bossPart||tracked||{x:p.tx,y:p.ty},w,h);const phase=clamp(1-p.life/.18,0,1),sx=from.x,sy=from.y-42;
      ctx.save();ctx.strokeStyle=p.type==='tesla'?'#adf5e3':'#ffe4a6';ctx.lineWidth=p.type==='cannon'?3:1.5;ctx.globalAlpha=.8;ctx.beginPath();ctx.moveTo(sx+(target.x-sx)*Math.max(0,phase-.2),sy+(target.y-sy)*Math.max(0,phase-.2));ctx.lineTo(sx+(target.x-sx)*phase,sy+(target.y-sy)*phase);ctx.stroke();
      if(phase<.45){ctx.fillStyle='#ffe6b1';ctx.beginPath();ctx.arc(sx,sy,5*(1-phase),0,Math.PI*2);ctx.fill();}ctx.restore();
    }
  };
  game.showMainMenu();
  window.LAST_RAIL_SCENE = { project, portrait, equipmentArt, cancelSelection, getCarPosition: i=>carPositions.get(i), get visualClock(){return visualClock;} };
})();
