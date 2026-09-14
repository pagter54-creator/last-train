/* LAST RAIL v0.8 — PC keyboard control layer.
 * Keyboard input reuses existing click/move/order logic instead of duplicating gameplay systems.
 */
(()=>{
 'use strict';
 const g=window.lastRail,D=window.GAME_DATA,B=D.BALANCE,A=window.LAST_RAIL_SCENE;
 if(!g||!A)return;
 const $=s=>document.querySelector(s),$$=s=>[...document.querySelectorAll(s)];
 const clamp=(n,a,b)=>Math.max(a,Math.min(b,n));
 const NON_REPEAT=new Set(['z','x','c','f',' ','1','2','3','q','w','e','r','a','s','d']);
 const MOVE_KEYS={q:3,w:2,e:1,r:0,a:6,s:5,d:4};
 const CAR_HINTS={0:'R',1:'E',2:'W',3:'Q',4:'D',5:'S',6:'A'};
 const AUTO_CAR_ORDER=[0,1,2,3,4,5,6];
 const state={
  lastInputMode:'mouse',lastMouseSelectedTarget:null,keyboardFocusedTarget:null,
  keyboardFocusVisible:false,activeNavigationContext:'battle',enemyFocusId:null,lastBattleTarget:null
 };
 window.LAST_RAIL_PC_INPUT=state;

 const audioControl=$('.volume-control');
 const hint=$('#hint');
 if(hint){hint.textContent='';hint.style.opacity=0;}

 function editableTarget(el){return !!el?.closest?.('input,textarea,[contenteditable]:not([contenteditable="false"])');}
 function visible(el){
  if(!el||!el.isConnected)return false;
  const st=getComputedStyle(el),r=el.getBoundingClientRect();
  return st.display!=='none'&&st.visibility!=='hidden'&&!el.hidden&&r.width>0&&r.height>0;
 }
 function enabled(el){return visible(el)&&!el.matches?.(':disabled')&&el.getAttribute?.('aria-disabled')!=='true';}
 function center(el){const r=el.getBoundingClientRect();return{x:r.left+r.width/2,y:r.top+r.height/2};}
 function clearDomFocus(){document.querySelectorAll('.keyboard-focus').forEach(el=>el.classList.remove('keyboard-focus'));}
 function hideKeyboardFocus(){state.keyboardFocusVisible=false;state.enemyFocusId=null;clearDomFocus();syncEnemyMarker();}
 function syncDomFocus(){if(!state.keyboardFocusVisible||state.keyboardFocusedTarget?.kind==='enemy')return;const el=resolveRemembered(state.keyboardFocusedTarget);if(el&&isElementAllowed(el,contextInfo())){clearDomFocus();el.classList.add('keyboard-focus');}else clearDomFocus();}
 function markKeyboardMode(){state.lastInputMode='keyboard';state.keyboardFocusVisible=true;}
 function activeDialog(){return [...document.querySelectorAll('dialog[open]')].filter(visible).at(-1)||null;}
 function overlayOpen(){return $('#overlay')?.classList.contains('show');}

 function contextInfo(){
  const native=activeDialog();
  if(native)return{type:'modal',root:native};
  if(overlayOpen())return{type:'modal',root:$('#modal')};
  if(g.mode==='battle'&&['command','armor'].includes(g.state?.targetMode))return{type:`${g.state.targetMode}Targeting`,root:$('#train-cars')};
  if(g.mode==='battle'&&document.body.classList.contains('is-tactical')){
   const buttons=$$('#inspector button:not(:disabled)').filter(enabled);
   if(buttons.length)return{type:$('.captain-console')?'captainUpgrade':'detail',root:$('.tactical-panel')};
  }
  return{type:g.mode==='battle'?'battle':'ui',root:document.body};
 }
 function navElements(ctx=contextInfo()){
  if(ctx.type==='modal')return [...ctx.root.querySelectorAll('button:not(:disabled),[role="button"]:not([aria-disabled="true"]),a[href]')].filter(enabled);
  if(ctx.type==='captainUpgrade'||ctx.type==='detail')return [...ctx.root.querySelectorAll('button:not(:disabled),[role="button"]:not([aria-disabled="true"])')].filter(enabled);
  if(ctx.type==='commandTargeting'||ctx.type==='armorTargeting')return $$('#train-cars [data-car-index]').filter(enabled);
  if(ctx.type==='battle')return $$([
   '#train-cars [data-captain]','#train-cars [data-crew]','#train-cars [data-equipment]',
   '#train-cars [data-destination]:not(:disabled)','#train-cars [data-output]:not(:disabled)',
   '.speed-controls button:not(:disabled)','#menu-btn'
  ].join(',')).filter(enabled);
  return [];
 }
 function isElementAllowed(el,ctx=contextInfo()){
  if(!enabled(el))return false;
  if(ctx.type==='modal'||ctx.type==='captainUpgrade'||ctx.type==='detail')return ctx.root?.contains(el)&&navElements(ctx).includes(el);
  return navElements(ctx).includes(el);
 }
 function rememberElement(el){
  if(!el)return null;
  if(el.dataset?.crew)return{kind:'crew',id:el.dataset.crew};
  if(el.dataset?.equipment)return{kind:'equipment',id:el.dataset.equipment};
  if(el.dataset?.captain!==undefined)return{kind:'captain'};
  if(el.dataset?.destination!==undefined)return{kind:'destination',car:Number(el.dataset.destination)};
  if(el.dataset?.output!==undefined)return{kind:'output',car:Number(el.dataset.car),value:Number(el.dataset.output)};
  if(el.dataset?.carIndex!==undefined)return{kind:'car',car:Number(el.dataset.carIndex)};
  if(el.id)return{kind:'id',id:el.id};
  return{kind:'element',el};
 }
 function resolveRemembered(ref){
  if(!ref)return null;
  let el=null;
  if(ref.kind==='crew')el=document.querySelector(`[data-crew="${CSS.escape(ref.id)}"]`);
  else if(ref.kind==='equipment')el=document.querySelector(`[data-equipment="${CSS.escape(ref.id)}"]`);
  else if(ref.kind==='captain')el=document.querySelector('[data-captain]');
  else if(ref.kind==='destination')el=document.querySelector(`[data-destination="${ref.car}"]`);
  else if(ref.kind==='output')el=document.querySelector(`[data-output="${ref.value}"][data-car="${ref.car}"]`);
  else if(ref.kind==='car')el=document.querySelector(`[data-car-index="${ref.car}"]`);
  else if(ref.kind==='id')el=document.getElementById(ref.id);
  else if(ref.kind==='element')el=ref.el;
  return el;
 }
 function defaultElement(ctx=contextInfo()){
  const list=navElements(ctx);
  if(ctx.type==='commandTargeting'||ctx.type==='armorTargeting')return list.find(el=>Number(el.dataset.carIndex)>0&&g.state?.cars[Number(el.dataset.carIndex)]?.hp>0)||list[0]||null;
  if(ctx.type==='battle')return document.querySelector('[data-captain]')||list[0]||null;
  return list[0]||null;
 }
 function focusElement(el){
  if(!el)return false;
  const ctx=contextInfo();if(!isElementAllowed(el,ctx))return false;
  clearDomFocus();state.enemyFocusId=null;state.keyboardFocusedTarget=rememberElement(el);state.activeNavigationContext=ctx.type;
  state.keyboardFocusVisible=true;el.classList.add('keyboard-focus');
  if(ctx.type==='modal')el.scrollIntoView?.({block:'nearest',inline:'nearest'});
  if(ctx.type==='battle'||ctx.type==='commandTargeting'||ctx.type==='armorTargeting')state.lastBattleTarget=state.keyboardFocusedTarget;
  syncEnemyMarker();return true;
 }
 function ensureElementFocus(){
  const ctx=contextInfo();
  let el=resolveRemembered(state.keyboardFocusedTarget);
  if(!isElementAllowed(el,ctx)){
   el=resolveRemembered(state.lastMouseSelectedTarget);
   if(!isElementAllowed(el,ctx))el=(ctx.type==='battle'?resolveRemembered(state.lastBattleTarget):null);
   if(!isElementAllowed(el,ctx))el=defaultElement(ctx);
  }
  if(el)focusElement(el);return el;
 }
 function moveElementFocus(direction){
  const ctx=contextInfo(),items=navElements(ctx);if(!items.length)return false;
  let current=ensureElementFocus();if(!current)return focusElement(items[0]);
  const from=center(current),horizontal=direction==='left'||direction==='right',sign=(direction==='right'||direction==='down')?1:-1;
  let best=null,bestScore=Infinity;
  for(const el of items){if(el===current)continue;const p=center(el),primary=(horizontal?p.x-from.x:p.y-from.y)*sign;if(primary<=4)continue;const secondary=Math.abs(horizontal?p.y-from.y:p.x-from.x);const score=primary+secondary*.42;if(score<bestScore){best=el;bestScore=score;}}
  if(!best){
   best=[...items].sort((a,b)=>{const pa=center(a),pb=center(b);return sign>0?(horizontal?pa.x-pb.x:pa.y-pb.y):(horizontal?pb.x-pa.x:pb.y-pa.y);})[0];
  }
  return focusElement(best);
 }

 function syncEnemyMarker(){}

 function activateFocused(){
  const ctx=contextInfo();
  const el=ensureElementFocus();if(!el)return;
  if((ctx.type==='commandTargeting'||ctx.type==='armorTargeting')&&el.dataset.carIndex!==undefined){
   const ci=Number(el.dataset.carIndex);if(ctx.type==='commandTargeting')g.executeCommand(ci);else g.executeArmor?.(ci);return;
  }
  const before=ctx.type;el.click?.();queueMicrotask(()=>{const after=contextInfo();if(state.keyboardFocusVisible&&after.type!==before){state.keyboardFocusedTarget=null;const next=defaultElement(after);if(next)focusElement(next);}});
 }
 function restoreBattleFocus(){queueMicrotask(()=>{if(!state.keyboardFocusVisible||g.mode!=='battle'||overlayOpen())return;const target=resolveRemembered(state.lastBattleTarget)||document.querySelector('[data-captain]')||defaultElement(contextInfo());if(target)focusElement(target);});}
 function cancelCurrent(){
  const dlg=activeDialog();if(dlg){const cancel=dlg.querySelector('[data-cancel],.close-btn:not(.hidden)');if(cancel){cancel.click();restoreBattleFocus();return;}return;}
  if(overlayOpen()){
   const close=$('#modal .close-btn:not(.hidden)');if(close){close.click();restoreBattleFocus();return;}
   if(g.mode==='battle'&&typeof g.dismissDialog==='function'){g.dismissDialog();restoreBattleFocus();return;}return;
  }
  if(g.mode==='battle'&&(document.body.classList.contains('is-tactical')||g.state?.targetMode||g.state?.selectedCrew||g.inspectedEquipment||g.inspectedCrew)){A.cancelSelection();state.enemyFocusId=null;syncEnemyMarker();restoreBattleFocus();return;}
  hideKeyboardFocus();
 }

 function cycleSpeed(){
  if(!g.state||g.mode!=='battle'||overlayOpen())return;
  const current=[1,2,3].includes(g.preferredSpeed)?g.preferredSpeed:([1,2,3].includes(g.state.priorSpeed)?g.state.priorSpeed:([1,2,3].includes(g.state.speed)?g.state.speed:1));
  const next=current===1?2:current===2?3:1;g.setSpeed(next);g.toast(`${next}배속`);
 }
 function targetCarWithShortcut(key){
  if(!g.state||g.mode!=='battle'||overlayOpen())return false;
  const ctx=contextInfo();if(ctx.type!=='commandTargeting'&&ctx.type!=='armorTargeting')return false;
  const to=MOVE_KEYS[key];if(to===undefined)return false;
  const car=g.state.cars[to];
  if(!car){g.toast(to===0?'기관실을 찾을 수 없습니다.':`${to}번 객차가 연결되어 있지 않습니다.`);return true;}
  if(ctx.type==='commandTargeting')g.executeCommand(to);else g.executeArmor?.(to);
  renderCarKeyHints();return true;
 }
 function moveSelectedCrew(key){
  if(!g.state||g.mode!=='battle'||overlayOpen()||!g.state.selectedCrew)return false;
  const to=MOVE_KEYS[key];if(to===undefined)return false;
  if(!g.state.cars[to]){g.toast(to===0?'기관실을 찾을 수 없습니다.':`${to}번 객차가 연결되어 있지 않습니다.`);return true;}
  g.moveCrew(g.state.selectedCrew,to);return true;
 }
 function saveCrewPreset(){
  if(!g.state||g.mode!=='battle'||overlayOpen())return;
  const placements={};for(const c of g.state.crew){const ci=c.moving?.to??c.car;if(!c.dead&&g.state.cars[ci])placements[c.id]=g.state.cars[ci].id;}
  g.state.crewPreset={version:1,placements,savedAt:Date.now()};g.toast('직원 배치 프리셋 저장됨');g.playSound?.('ui');
 }
 function executeCrewPreset(){
  const s=g.state;if(!s||g.mode!=='battle'||overlayOpen())return;const preset=s.crewPreset;
  if(!preset?.placements){g.toast('저장된 직원 배치 프리셋이 없습니다.');return;}
  A.cancelSelection();
  const capacities=s.cars.map((_,i)=>g.crewCapacity(i)),used=s.cars.map(()=>0),assignment=new Map(),auto=[];
  const movable=c=>!c.dead&&c.hp>0&&!c.moving&&!!s.cars[c.car];
  const usableCar=i=>!!s.cars[i];
  // KO crew reserve capacity in their current carriage. Destroyed/armored cars do not
  // block movement; they are intentionally valid repair/preset destinations.
  for(const c of s.crew)if(!c.dead&&!movable(c)){const ci=c.moving?.to??c.car;if(s.cars[ci])used[ci]++;}
  const reserve=(c,ci)=>{if(!usableCar(ci)||used[ci]>=capacities[ci])return false;assignment.set(c.id,ci);used[ci]++;return true;};
  const active=s.crew.filter(movable);
  for(const c of active){const carId=preset.placements[c.id];if(!carId){auto.push(c);continue;}const ci=s.cars.findIndex(car=>car.id===carId);if(ci<0||!reserve(c,ci))auto.push(c);}
  for(const c of auto){let placed=false;for(const ci of AUTO_CAR_ORDER){if(ci<s.cars.length&&reserve(c,ci)){placed=true;break;}}if(!placed){const current=c.car;if(s.cars[current]&&used[current]<capacities[current]){assignment.set(c.id,current);used[current]++;}}}
  let moved=0,rerouted=0,stuck=0;
  const pending=[];
  for(const c of active){const to=assignment.get(c.id);if(to===undefined){stuck++;continue;}const originalId=preset.placements[c.id],originalIndex=originalId?s.cars.findIndex(car=>car.id===originalId):-1;if(originalId&&to!==originalIndex)rerouted++;if(to!==c.car)pending.push({c,to});}
  // Presets may coordinate many moves, but they do not grant an implicit swap. A
  // crew member can start only when the destination has a real free slot. Starting
  // one move frees its source slot, so chains through an existing vacancy still work;
  // a closed full-car swap cycle correctly remains waiting for a manual mouse swap.
  const occupancy=ci=>s.crew.filter(x=>!x.dead&&x.id!==undefined&&(x.moving?x.moving.to===ci:x.car===ci)).length;
  let progressed=true;
  while(pending.length&&progressed){progressed=false;for(let i=pending.length-1;i>=0;i--){const {c,to}=pending[i];if(occupancy(to)>=capacities[to])continue;const distance=Math.abs(c.car-to);c.moving={from:c.car,to,left:distance*B.train.moveSecondsPerCar,total:distance*B.train.moveSecondsPerCar};pending.splice(i,1);moved++;progressed=true;if(s.combatRecord&&!s.combatRecord.finished)s.combatRecord.moves++;}}
  stuck+=pending.length;
  g.renderCars();if(moved)g.playSound?.('equip');g.toast(`프리셋 배치 실행 · ${moved}명 이동${rerouted?` · ${rerouted}명 대체 배치`:''}${stuck?` · ${stuck}명 대기`:''}`);
 }

 function renderCarKeyHints(){
  $$('#train-cars .car-key-hint').forEach(el=>el.remove());
  const crewMoveHint=document.body.classList.contains('is-tactical')&&!!g.state?.selectedCrew&&!!g.inspectedCrew;
  const skillTargetHint=['command','armor'].includes(g.state?.targetMode);
  const show=g.mode==='battle'&&!overlayOpen()&&(crewMoveHint||skillTargetHint);
  if(!show)return;
  $$('#train-cars [data-car-index]').forEach(car=>{const i=Number(car.dataset.carIndex),key=CAR_HINTS[i];if(!key)return;const el=document.createElement('span');el.className='car-key-hint';el.textContent=key;el.setAttribute('aria-hidden','true');car.append(el);});
 }
 const priorRenderCars=g.renderCars.bind(g);g.renderCars=function(...args){const out=priorRenderCars(...args);renderCarKeyHints();return out;};

 const priorPause=g.openPause.bind(g);g.openPause=function(...args){
  const out=priorPause(...args);const body=$('#modal .dialog-body');if(!body||this.mode!=='battle')return out;
  if(!body.querySelector('.pc-control-guide')){
   const guide=document.createElement('section');guide.className='pc-control-guide';guide.innerHTML=`<div class="pc-guide-head"><b>PC 키보드 조작</b><small>마우스를 클릭하면 키보드 선택 표시가 숨겨집니다.</small></div><div class="pc-guide-grid"><span><kbd>← ↑ ↓ →</kbd> 선택 이동</span><span><kbd>Z / ENTER</kbd> 확인 / 선택</span><span><kbd>X / ESC</kbd> 취소 / 닫기</span><span><kbd>C</kbd> 배속 변경</span><span><kbd>Q W E</kbd> 3 / 2 / 1번 객차</span><span><kbd>A S D</kbd> 6 / 5 / 4번 객차</span><span><kbd>R</kbd> 기관실 이동</span><span><kbd>1 2 3</kbd> 열차장 스킬</span><span><kbd>F</kbd> 현재 직원 배치 저장</span><span><kbd>SPACE</kbd> 저장된 배치 실행</span></div>`;
   body.prepend(guide);
  }
  let volumeWrap=body.querySelector('.pause-volume-wrap');if(!volumeWrap){volumeWrap=document.createElement('div');volumeWrap.className='pause-volume-wrap';volumeWrap.innerHTML='<b>오디오</b>';body.insertBefore(volumeWrap,body.querySelector('.station-actions'));}
  if(audioControl)volumeWrap.append(audioControl);return out;
 };

 function afterSkillKey(key){
  const button={1:'#focus-order',2:'#command-order',3:'#armor-order'}[key],el=$(button);if(!el||el.disabled)return;el.click();
  state.lastInputMode='keyboard';state.keyboardFocusVisible=true;
  if(g.state?.targetMode==='focus'){state.enemyFocusId=null;state.keyboardFocusedTarget=state.lastBattleTarget;syncDomFocus();}
  else if(['command','armor'].includes(g.state?.targetMode)){state.keyboardFocusedTarget=null;focusElement(defaultElement(contextInfo()));}
  renderCarKeyHints();
 }
 function processKey(e){
  if(editableTarget(e.target)||e.altKey||e.ctrlKey||e.metaKey)return;
  const raw=e.key;
  const key=raw===' '?' ':raw==='Enter'?'z':raw==='Escape'?'x':raw.toLowerCase();
  const arrow={ArrowLeft:'left',ArrowRight:'right',ArrowUp:'up',ArrowDown:'down'}[raw];
  const handled=!!arrow||['z','x','c','f',' ','1','2','3','q','w','e','r','a','s','d'].includes(key);
  if(!handled)return;if(e.repeat&&NON_REPEAT.has(key))return;
  e.preventDefault();e.stopPropagation();markKeyboardMode();
  if(arrow){moveElementFocus(arrow);return;}
  if(key==='z'){activateFocused();return;}
  if(key==='x'){cancelCurrent();return;}
  if(['1','2','3'].includes(key)){if(g.mode==='battle'&&!overlayOpen())afterSkillKey(key);return;}
  if(['q','w','e','r','a','s','d'].includes(key)){if(!targetCarWithShortcut(key))moveSelectedCrew(key);return;}
  if(key==='c'){cycleSpeed();return;}
  if(key==='f'){saveCrewPreset();return;}
  if(key===' '){executeCrewPreset();return;}
 }
 document.addEventListener('keydown',processKey,true);
 document.addEventListener('pointerdown',e=>{
  state.lastInputMode='mouse';hideKeyboardFocus();
  if(e.target===g.canvas||g.canvas.contains?.(e.target)){state.lastMouseSelectedTarget=null;return;}
  const el=e.target.closest?.('[data-captain],[data-crew],[data-equipment],[data-destination],[data-output],[data-car-index],button,[role="button"],a[href]');
  state.lastMouseSelectedTarget=el&&enabled(el)?rememberElement(el):null;
 },true);

 const priorDraw=g.draw.bind(g);g.draw=function(...args){const out=priorDraw(...args);syncDomFocus();syncEnemyMarker();return out;};
 const priorNewRun=g.newRun.bind(g);g.newRun=function(...args){hideKeyboardFocus();state.lastMouseSelectedTarget=null;state.keyboardFocusedTarget=null;state.lastBattleTarget=null;return priorNewRun(...args);};
 const priorMain=g.showMainMenu.bind(g);g.showMainMenu=function(...args){hideKeyboardFocus();state.keyboardFocusedTarget=null;return priorMain(...args);};

 // Make the 0.8 skill order explicit even if an older stylesheet reversed it.
 [['focus-order','1'],['command-order','2'],['armor-order','3']].forEach(([id,key])=>{const el=document.getElementById(id);if(el)el.querySelector('.order-key').textContent=key;});
 renderCarKeyHints();
})();
