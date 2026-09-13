(()=>{
 const g=lastRail,D=GAME_DATA,C={code:'9789',grant:1000,speeds:[1,2,3]};
 let unlocked=false,dialog=null;
 const update=g.update.bind(g);g.update=function(dt){if(dialog?.open)return;return update(dt);};
 function close(){dialog?.close();dialog?.remove();dialog=null;}
 function open(title,html){close();dialog=document.createElement('dialog');dialog.className='admin-dialog';dialog.innerHTML=`<h2>${title}</h2>${html}<button data-close>닫기</button>`;document.body.append(dialog);dialog.querySelector('[data-close]').onclick=close;dialog.addEventListener('cancel',e=>{e.preventDefault();close();});dialog.showModal();}
 function refresh(){g.renderAll();dialog.querySelector('[data-status]').textContent=`돈 ${Math.floor(g.state.money)} · 고철 ${Math.floor(g.state.scrap)} · 런 잔해 ${Math.floor(g.state.relics)}`;}
 function consolePanel(){
  if(!g.state||['menu','ending','gameover'].includes(g.mode)){open('관리자 콘솔','<p>런을 시작하거나 이어하기 후 사용할 수 있습니다.</p>');return;}
  open('관리자 콘솔',`<p data-status></p><div class="admin-actions"><button data-action="heal">열차 체력 즉시 회복</button><button data-action="money">돈 +${C.grant}</button><button data-action="scrap">고철 +${C.grant}</button><button data-action="relics">런 고대 잔해 +${C.grant}</button><button data-action="cool">포탑 과열 즉시 회복</button></div><label>ACT <select data-act>${Object.entries(D.ACTS).map(([id,a])=>`<option value="${id}" ${id===g.state.actId?'selected':''}>ACT ${a.label}</option>`).join('')}</select></label><label>STAGE <input data-stage type="number" min="1" value="${g.state.stageIndex+1}"></label><p>ACT 이동은 1스테이지부터 시작합니다. 마지막 번호는 보스전입니다.</p><button data-jump>지정 스테이지로 이동</button><button data-act-jump>선택 ACT 1스테이지로 이동</button><p data-error role="status"></p>`);
  const act=dialog.querySelector('[data-act]'),stage=dialog.querySelector('[data-stage]');const limits=()=>stage.max=D.ACTS[act.value].stages.length+(D.ACTS[act.value].boss?1:0);limits();act.onchange=()=>{stage.value=1;limits();};
  dialog.querySelectorAll('[data-action]').forEach(b=>b.onclick=()=>{const s=g.state,id=b.dataset.action;if(id==='heal')s.cars.forEach(c=>{c.hp=c.maxHp;c.repair=0;c.destroyed=false;c.destroyedLogged=false;});else if(id==='cool')g.resetTurretHeat();else s[id]+=C.grant;refresh();});
  function jump(first){const id=act.value,n=first?1:Number(stage.value);if(!Number.isInteger(n)||n<1||n>Number(stage.max)){dialog.querySelector('[data-error]').textContent=`1~${stage.max} 사이의 스테이지 번호를 입력하세요.`;return;}
   close();const s=g.state;LAST_RAIL_SCENE.cancelSelection();g.showMainMenu();g.state=s;g.clearCombatPresentation();g.restoreCheckpointEvent(null);g.resetCheckpointBoundary();
   s.crew.forEach(c=>{c.moving=null;});Object.assign(s,{actId:id,stageIndex:n-1,battle:null,launchPending:false,selectedCrew:null,selectedEnemy:null,targetMode:null,eventNextCombat:null,eventDeparture:false});g.stationOffers=null;g.stationStage=null;g.mode='run';g.closeOverlay();g.enterNode();g.renderAll();
  }
  dialog.querySelector('[data-jump]').onclick=()=>jump(false);dialog.querySelector('[data-act-jump]').onclick=()=>jump(true);refresh();
 }
 window.addEventListener('keydown',e=>{
  if(dialog?.open){e.stopImmediatePropagation();return;}
  if(e.repeat||!e.shiftKey||e.ctrlKey||e.altKey||e.metaKey||e.target.closest?.('input,textarea,select,[contenteditable]'))return;
  if(e.code==='KeyC'&&g.mode==='menu'){e.preventDefault();e.stopImmediatePropagation();open('관리자 모드','<form><label>관리자 모드에 진입하기 위해서 코드를 입력하라<input type="password" inputmode="numeric" autocomplete="off" autofocus></label><button type="submit">해금</button><p role="status"></p></form>');dialog.querySelector('form').onsubmit=e=>{e.preventDefault();if(dialog.querySelector('input').value===C.code){unlocked=true;close();g.toast('관리자 모드 해금 · Shift + T로 콘솔 열기');}else dialog.querySelector('[role=status]').textContent='코드가 일치하지 않습니다.';};}
  else if(e.code==='KeyT'&&unlocked){e.preventDefault();e.stopImmediatePropagation();consolePanel();}
 },true);
 D.BALANCE.simulation.speedOptions=[0,...C.speeds];
 const controls=document.querySelector('.speed-controls');controls.innerHTML='<button data-cycle-speed aria-label="게임 속도 1배">▶</button>';
 controls.firstElementChild.onclick=()=>{const speed=g.preferredSpeed||1;g.setSpeed(C.speeds[(C.speeds.indexOf(speed)+1)%C.speeds.length]);};
 const render=g.renderSpeed.bind(g);g.renderSpeed=function(){render();const b=controls.querySelector('[data-cycle-speed]'),speed=this.preferredSpeed||1;b.textContent='▶'.repeat(speed);b.setAttribute('aria-label',`게임 속도 ${speed}배 · 클릭하여 변경`);b.title=`${speed}배`;b.style.minWidth='100px';b.style.letterSpacing='4px';b.classList.add('active');};g.renderSpeed();
 const style=document.createElement('style');style.textContent='.admin-dialog{width:min(560px,90vw);max-height:85vh;overflow:auto;background:#142a30;color:#e5eee5;border:1px solid #91a996;border-radius:10px;padding:24px}.admin-dialog::backdrop{background:#061014aa}.admin-dialog button,.admin-dialog input,.admin-dialog select{background:#28434a;color:#eef4ea;border:1px solid #79938b;padding:10px;margin:5px;border-radius:5px}.admin-dialog label{display:block;margin:12px 0}.admin-actions{display:flex;flex-wrap:wrap}.admin-dialog [data-error]{color:#ff8b85}';document.head.append(style);
})();
