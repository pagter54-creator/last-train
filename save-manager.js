(()=>{
 const g=lastRail,F=SAVE_FORMAT,S=SAVE_STORAGE,C=window.LAST_RAIL_CLOUD;let box=null,creditsBox=null,selection=0;
 const parse=(key,fallback)=>{const value=localStorage.getItem(key);return value===null?fallback:JSON.parse(value);};
 function snapshot(){const m=JSON.parse(JSON.stringify(g.meta)),codex=parse('lastRailCodexV2',{});return{game:'last-train',saveFormatVersion:F.saveFormatVersion,gameVersion:F.gameVersion,exportedAt:new Date().toISOString(),metaProgress:m,unlocks:F.unlocked(m,codex),upgrades:Object.fromEntries(Object.entries(m.upgrades).filter(([id])=>META_CONFIG.upgrades[id]?.group!=='captain')),captainUpgrades:Object.fromEntries(Object.entries(m.upgrades).filter(([id])=>META_CONFIG.upgrades[id]?.group==='captain')),trainModifications:{unlocked:m.modifications,enabled:m.enabledMods,points:g.modPoints()},apocalypse:{unlocked:m.apocalypseUnlocked,highestClear:m.apocalypseCleared,selected:m.apocalypseSelected},records:{codex,combatReports:parse('lastRailCombatReports',[]),eliteSeen:parse('lastRailEliteSeen',[])},currentRun:parse(RUN_CHECKPOINT_CONFIG.key,null),settings:{volume:parse('lastRailVolume',GAME_DATA.BALANCE.audio.defaultMaster),saveGuideAcknowledged:parse(RUN_CHECKPOINT_CONFIG.warningKey,false)}};}
 function rawSave(s){const raw=Object.fromEntries(S.keys.map(k=>[k,null]));Object.assign(raw,{lastRailMeta:JSON.stringify(s.metaProgress),lastRailCodexV2:JSON.stringify(s.records.codex),lastRailCombatReports:JSON.stringify(Array.isArray(s.records.combatReports)?s.records.combatReports:[]),lastRailEliteSeen:JSON.stringify(Array.isArray(s.records.eliteSeen)?s.records.eliteSeen.filter(id=>typeof id==='string'):[]),lastRailVolume:JSON.stringify(s.settings.volume)});raw[RUN_CHECKPOINT_CONFIG.warningKey]=JSON.stringify(!!(s.settings.saveGuideAcknowledged??s.settings.saveWarningAcknowledged));if(s.currentRun)raw[RUN_CHECKPOINT_CONFIG.key]=JSON.stringify(s.currentRun);return raw;}
 function download(save){const blob=new Blob([JSON.stringify(save,null,2)],{type:'application/json'}),url=URL.createObjectURL(blob),a=document.createElement('a');a.href=url;a.download=`last-train-save-v${F.gameVersion}-${new Date().toISOString().replace(/[:.]/g,'-')}.json`;document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);}
 function close(){selection++;box?.close();box?.remove();box=null;document.querySelector('#save-manager-btn')?.focus();}
 function status(message,type=''){if(!box)return;const el=box.querySelector('[data-status]');el.textContent=message||'';el.dataset.type=type;}
 function setBusy(button,busy,label){if(!button)return;if(busy){button.dataset.originalText=button.textContent;button.disabled=true;button.textContent=label||'처리 중...';}else{button.disabled=false;button.textContent=button.dataset.originalText||button.textContent;delete button.dataset.originalText;}}
 function previewSave(json,source){
  const result=F.validateSave(json),preview=box.querySelector('[data-preview]');
  preview.replaceChildren();
  const card=document.createElement('div');card.className='save-preview-card';
  const heading=document.createElement('div');heading.className='save-preview-heading';
  heading.innerHTML='<small>IMPORT PREVIEW</small><b>불러올 저장 데이터</b>';
  const info=document.createElement('p');
  info.textContent=`${source}\nv${json.gameVersion} · 보유 잔해 ${result.save.metaProgress.relics} · 누적 사용 ${result.save.metaProgress.spent}\n현재 로컬 진행이 이 저장으로 교체됩니다. 적용 직전에 복구용 내부 백업이 생성됩니다.${result.notes.length?`\n${result.notes.join('\n')}`:''}`;
  const actions=document.createElement('div');actions.className='save-preview-actions';
  const cancel=document.createElement('button');cancel.className='save-action ghost';cancel.textContent='취소';cancel.onclick=()=>{selection++;preview.replaceChildren();status('불러오기를 취소했습니다.');};
  const apply=document.createElement('button');apply.className='save-action danger';apply.textContent='이 저장으로 교체';apply.onclick=()=>{apply.disabled=true;try{S.apply(rawSave(result.save));try{sessionStorage.setItem('lastTrainImportResult',JSON.stringify([`${source}을(를) 불러왔습니다.`,...result.notes]));}catch{}g.update=()=>{};location.reload();}catch(e){apply.disabled=false;status(e.message,'error');}};
  actions.append(cancel,apply);card.append(heading,info,actions);preview.append(card);status('저장 데이터 검사가 끝났습니다. 내용을 확인한 뒤 교체를 선택하세요.','ok');cancel.focus();
 }
 async function copyCode(code,button){
  try{await navigator.clipboard.writeText(code);button.textContent='복사됨';setTimeout(()=>{if(button.isConnected)button.textContent='코드 복사';},1600);status('공유 코드를 클립보드에 복사했습니다.','ok');}
  catch{const input=box?.querySelector('[data-created-code]');input?.select();status('자동 복사가 차단되었습니다. 코드를 선택해 직접 복사해 주세요.','warn');}
 }
 g.showSaveManager=function(){
  if(this.mode!=='menu')return;close();
  box=document.createElement('dialog');box.className='admin-dialog save-manager';
  box.innerHTML=`
   <header class="save-manager-head"><small>SAVE DATA · CLOUD SHARE</small><h2>세이브 관리</h2><p>브라우저 자동 저장은 그대로 유지됩니다. <strong>공유 코드</strong>로 현재 저장의 복사본을 다른 브라우저·기기나 다른 플레이어에게 전달할 수 있습니다.</p></header>
   <div class="save-manager-body">
    <section class="save-manager-local-note"><b>현재 저장 방식</b><span>게임 진행은 이 브라우저에 자동 저장됩니다. 공유 코드는 자동 동기화 계정이 아니라 <strong>생성 시점의 저장 복사본</strong>입니다.</span></section>
    <section class="save-manager-panel cloud-panel">
     <div class="save-panel-title"><span class="save-panel-icon">☁</span><div><small>ONLINE SHARE</small><h3>공유 코드</h3><p>현재 저장을 Supabase에 올리고 10자리 코드를 발급합니다. 코드를 아는 사람은 해당 저장을 불러올 수 있습니다.</p></div></div>
     <div class="cloud-create-row"><button data-cloud-create class="save-action primary">새 공유 코드 생성</button><span class="cloud-hint">새 코드를 만들 때마다 별도의 복사본이 생성됩니다.</span></div>
     <div data-cloud-created class="cloud-created" hidden><label>생성된 공유 코드</label><div><input data-created-code readonly spellcheck="false"><button data-copy-code class="save-action">코드 복사</button></div><small>이 코드는 필요한 사람에게만 전달하세요. 기존 코드는 자동으로 갱신되지 않습니다.</small></div>
     <div class="cloud-divider"><span>공유 세이브 불러오기</span></div>
     <div class="cloud-load-row"><input data-cloud-code maxlength="11" autocomplete="off" autocapitalize="characters" spellcheck="false" placeholder="XXXXX-XXXXX" aria-label="공유 코드"><button data-cloud-load class="save-action">코드 확인</button></div>
    </section>
    <section class="save-manager-panel file-panel">
     <div class="save-panel-title"><span class="save-panel-icon">▣</span><div><small>OFFLINE BACKUP</small><h3>JSON 파일 백업</h3><p>인터넷 없이 보관할 수 있는 수동 백업입니다. 큰 업데이트 전이나 장기 보관용으로 권장합니다.</p></div></div>
     <div class="save-file-actions"><button data-export class="save-action">저장 파일 내보내기</button><label class="save-file-label">저장 파일 불러오기<input data-import type="file" accept=".json,application/json"></label></div>
    </section>
    <section data-preview class="save-preview"></section>
    <p data-status class="save-manager-status" role="status" aria-live="polite"></p>
   </div>
   <footer class="save-manager-foot"><span>공식 주소 · pagter54-creator.github.io/last-train/</span><button data-close class="save-action">닫기</button></footer>`;
  document.body.append(box);
  box.querySelector('[data-close]').onclick=close;box.addEventListener('cancel',e=>{e.preventDefault();close();});
  box.querySelector('[data-export]').onclick=()=>{try{download(snapshot());status('저장 파일 다운로드를 요청했습니다. 다운로드 폴더를 확인하세요.','ok');}catch(e){status('내보내기에 실패했습니다. '+e.message,'error');}};
  box.querySelector('[data-import]').onchange=async e=>{const file=e.target.files[0],ticket=++selection;box.querySelector('[data-preview]').replaceChildren();if(!file)return;try{if(file.size>F.maxBytes)throw Error('저장 파일이 너무 큽니다. 최대 8MB까지 지원합니다.');const text=await file.text();if(!box||ticket!==selection)return;let json;try{json=JSON.parse(text,(key,value)=>{if(['__proto__','prototype','constructor'].includes(key))throw Error('잘못된 필드');return value;});}catch{throw Error('올바른 JSON 저장 파일이 아닙니다.');}previewSave(json,`파일 · ${file.name}`);}catch(e){status(e.message,'error');}};

  const createButton=box.querySelector('[data-cloud-create]'),created=box.querySelector('[data-cloud-created]'),createdCode=box.querySelector('[data-created-code]'),copyButton=box.querySelector('[data-copy-code]'),codeInput=box.querySelector('[data-cloud-code]'),loadButton=box.querySelector('[data-cloud-load]');
  codeInput.addEventListener('input',()=>{if(C)codeInput.value=C.formatCode(codeInput.value);});
  codeInput.addEventListener('keydown',e=>{if(e.key==='Enter'){e.preventDefault();loadButton.click();}});
  createButton.onclick=async()=>{
   if(!C?.isConfigured()){status('클라우드 저장 설정을 찾지 못했습니다.','error');return;}
   setBusy(createButton,true,'업로드 중...');status('현재 저장의 공유 복사본을 생성하고 있습니다...');
   try{const code=await C.createShare(snapshot());createdCode.value=code;created.hidden=false;status('공유 코드가 생성되었습니다. 이 코드는 생성 시점의 저장 복사본을 가리킵니다.','ok');}
   catch(e){status('공유 코드 생성에 실패했습니다. '+e.message,'error');}
   finally{setBusy(createButton,false);}
  };
  copyButton.onclick=()=>createdCode.value&&copyCode(createdCode.value,copyButton);
  loadButton.onclick=async()=>{
   if(!C?.isConfigured()){status('클라우드 저장 설정을 찾지 못했습니다.','error');return;}
   const ticket=++selection;box.querySelector('[data-preview]').replaceChildren();setBusy(loadButton,true,'조회 중...');status('공유 코드를 확인하고 있습니다...');
   try{const remote=await C.getShare(codeInput.value);if(!box||ticket!==selection)return;codeInput.value=remote.code;const date=remote.createdAt?new Date(remote.createdAt).toLocaleString('ko-KR'):'생성 시각 정보 없음';previewSave(remote.saveData,`클라우드 공유 · ${remote.code} · ${date}`);}
   catch(e){if(box&&ticket===selection)status(e.message,'error');}
   finally{if(box&&ticket===selection)setBusy(loadButton,false);}
  };
  box.showModal();
 };
 function closeCredits(){creditsBox?.close();creditsBox?.remove();creditsBox=null;document.querySelector('#credits-btn')?.focus();}
 g.showCredits=function(){
  if(this.mode!=='menu')return;
  closeCredits();
  creditsBox=document.createElement('dialog');
  creditsBox.className='admin-dialog credits-dialog';
  creditsBox.innerHTML=`<div class="credits-head"><small>LAST RAIL · CREDITS</small><h2>크레딧</h2></div><div class="credits-list"><div><span>기획</span><b>정지석</b></div><div><span>사용 모델</span><b>astra</b></div><div><span>이미지</span><b>ChatGPT</b></div><div><span>음악</span><b>Suno AI</b></div></div><p class="credits-note">LAST RAIL을 플레이해 주셔서 감사합니다.</p><button data-close class="credits-close">닫기</button>`;
  document.body.append(creditsBox);
  creditsBox.querySelector('[data-close]').onclick=closeCredits;
  creditsBox.addEventListener('cancel',e=>{e.preventDefault();closeCredits();});
  creditsBox.showModal();
 };
 function mount(){
  const how=document.querySelector('#howto-btn');if(!how)return;
  let save=document.querySelector('#save-manager-btn');
  if(!save){save=document.createElement('button');save.id='save-manager-btn';save.textContent='세이브 관리';save.onclick=()=>g.showSaveManager();how.after(save);}
  if(!document.querySelector('#credits-btn')){const credits=document.createElement('button');credits.id='credits-btn';credits.textContent='크레딧';credits.onclick=()=>g.showCredits();save.after(credits);}
 }
 const menu=g.showMainMenu.bind(g);g.showMainMenu=function(...args){const r=menu(...args);mount();return r;};mount();
 window.addEventListener('keydown',e=>{if(box?.open||creditsBox?.open)e.stopImmediatePropagation();},true);
 const style=document.createElement('style');style.textContent=`
 .menu-actions{flex-wrap:wrap}
 .save-manager{width:min(820px,94vw);max-height:90vh;padding:0;overflow:auto;background:linear-gradient(180deg,#14282a,#0d181b);color:#e6ece8;border:1px solid #607875;border-radius:16px;box-shadow:0 28px 90px #000c}
 .save-manager::backdrop{background:#02090cdb;backdrop-filter:blur(4px)}
 .save-manager-head{padding:26px 30px 22px;background:linear-gradient(135deg,#1d3839,#172d2f);border-bottom:1px solid #ffffff18}
 .save-manager-head small,.save-panel-title small{font-size:11px;letter-spacing:.16em;color:#96b9b5}
 .save-manager-head h2{margin:4px 0 8px;font-size:34px;line-height:1.15}.save-manager-head p{margin:0;line-height:1.7;color:#cbd6d2}.save-manager-head strong{color:#f0d498}
 .save-manager-body{display:grid;gap:14px;padding:20px 22px}.save-manager-local-note{display:grid;grid-template-columns:130px 1fr;gap:14px;padding:12px 14px;border-left:3px solid #79b8b2;background:#0b2022}.save-manager-local-note b{color:#d9c184}.save-manager-local-note span{color:#b9c7c3;line-height:1.55}
 .save-manager-panel{padding:18px;border:1px solid #ffffff17;border-radius:12px;background:#ffffff08}.cloud-panel{border-color:#65a9a33f;background:linear-gradient(135deg,#173235aa,#102427aa)}.file-panel{background:#ffffff05}
 .save-panel-title{display:grid;grid-template-columns:42px 1fr;gap:12px;align-items:start}.save-panel-icon{width:40px;height:40px;display:grid;place-items:center;border:1px solid #78a9a4;border-radius:10px;color:#dfe9e6;background:#203a3c;font-size:20px}.save-panel-title h3{margin:2px 0 4px;font-size:21px;color:#f0dfb2}.save-panel-title p{margin:0;color:#b9c6c3;line-height:1.55;font-size:13px}
 .save-action,.save-file-label{display:inline-flex;align-items:center;justify-content:center;min-height:42px;padding:0 16px;border:1px solid #6d8985;border-radius:8px;background:#21383a;color:#edf2ef;cursor:pointer;font:inherit;box-sizing:border-box}.save-action:hover,.save-file-label:hover{border-color:#d9ba77;color:#ffe2a1}.save-action:disabled{opacity:.55;cursor:wait}.save-action.primary{background:#274a49;border-color:#86bdb5;color:#fff1c7}.save-action.ghost{background:transparent}.save-action.danger{border-color:#bd776c;background:#492b29;color:#ffe1dc}
 .cloud-create-row{display:flex;align-items:center;gap:12px;margin-top:16px}.cloud-hint{color:#819b97;font-size:12px}.cloud-created{margin-top:14px;padding:13px;border:1px solid #91c8bf55;border-radius:10px;background:#081a1c}.cloud-created>label{display:block;margin-bottom:7px;font-size:12px;color:#9db7b3}.cloud-created>div{display:flex;gap:8px}.cloud-created input,.cloud-load-row input{min-width:0;flex:1;height:44px;padding:0 14px;border:1px solid #6d8783;border-radius:8px;background:#091719;color:#f4e2ac;font:700 19px/1 monospace;letter-spacing:.08em;outline:none;box-sizing:border-box}.cloud-created small{display:block;margin-top:8px;color:#7f9793;font-size:11px}.cloud-load-row input:focus{border-color:#d4b775;box-shadow:0 0 0 2px #d4b77522}.cloud-divider{display:flex;align-items:center;gap:10px;margin:18px 0 10px;color:#8fa8a4;font-size:12px}.cloud-divider:before,.cloud-divider:after{content:'';height:1px;flex:1;background:#ffffff17}.cloud-load-row{display:flex;gap:8px}
 .save-file-actions{display:flex;flex-wrap:wrap;align-items:center;gap:8px;margin-top:16px}.save-file-label{position:relative;overflow:hidden}.save-file-label input{position:absolute;inset:0;opacity:0;cursor:pointer}
 .save-preview:not(:empty){margin-top:2px}.save-preview-card{padding:15px;border:1px solid #d2b46b66;border-radius:10px;background:#221f16aa}.save-preview-heading{display:flex;align-items:center;justify-content:space-between;gap:10px}.save-preview-heading small{letter-spacing:.13em;color:#ac9462}.save-preview-heading b{color:#f4dfaa}.save-preview-card p{white-space:pre-line;line-height:1.65;color:#cbd2ce}.save-preview-actions{display:flex;justify-content:flex-end;gap:8px}
 .save-manager-status{min-height:1.5em;margin:0;padding:0 2px;color:#9db1ad;white-space:pre-line}.save-manager-status[data-type=ok]{color:#91d3a4}.save-manager-status[data-type=warn]{color:#e4c171}.save-manager-status[data-type=error]{color:#ff9f91}
 .save-manager-foot{display:flex;align-items:center;justify-content:space-between;gap:16px;padding:14px 22px 18px;border-top:1px solid #ffffff14;color:#718985;font-size:11px;background:#0c1719}
 .credits-dialog{width:min(520px,92vw);padding:0;overflow:hidden;background:linear-gradient(180deg,#172527,#0f1719);color:#e7ece8;border:1px solid #5f706d;border-radius:14px;box-shadow:0 24px 80px #000b}.credits-dialog::backdrop{background:#02090cd9;backdrop-filter:blur(4px)}.credits-head{padding:28px 30px 20px;border-bottom:1px solid #ffffff18;background:#1b2f31}.credits-head small{font-size:11px;letter-spacing:.18em;color:#d8b477}.credits-head h2{margin:6px 0 0;font-size:34px}.credits-list{display:grid;gap:1px;margin:20px 24px;background:#ffffff12;border:1px solid #ffffff14}.credits-list>div{display:grid;grid-template-columns:140px 1fr;align-items:center;padding:14px 16px;background:#111d1f}.credits-list span{color:#8f9c99;font-size:13px}.credits-list b{font-size:18px;color:#efe4c5}.credits-note{margin:18px 24px;color:#8f9c99;font-size:12px}.credits-close{margin:0 24px 24px auto;display:block;padding:9px 18px;border:1px solid #657875;background:#1d2a2c;color:#fff;cursor:pointer;border-radius:6px}.credits-close:hover{border-color:#d8b477;color:#f2d89f}
 @media(max-width:620px){.save-manager-head{padding:22px 20px 18px}.save-manager-body{padding:14px}.save-manager-local-note{grid-template-columns:1fr;gap:4px}.cloud-create-row,.cloud-created>div,.cloud-load-row,.save-manager-foot{align-items:stretch;flex-direction:column}.cloud-create-row{display:flex}.cloud-hint{line-height:1.5}.save-manager-foot span{display:none}.save-preview-actions{flex-direction:column-reverse}.save-preview-actions .save-action{width:100%}.credits-list>div{grid-template-columns:105px 1fr}}
 `;document.head.append(style);
 try{const messages=JSON.parse(sessionStorage.getItem('lastTrainImportResult')||'null');if(Array.isArray(messages)){sessionStorage.removeItem('lastTrainImportResult');g.showSaveManager();status(messages.join('\n'),'ok');}}catch{}
})();
