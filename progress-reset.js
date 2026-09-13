(()=>{
 const g=lastRail;
 // Only this game's known storage entries are removed, after both confirmations.
 const keys=['lastRailMeta','lastRailMetaBeforeV2','lastRailCodexV2','lastRailCombatReports','lastRailEliteSeen','lastRailVolume',EVENT_CONFIG.storageKey,RUN_CHECKPOINT_CONFIG.key,RUN_CHECKPOINT_CONFIG.warningKey];
 let box=null;
 function close(){box?.close();box?.remove();box=null;document.querySelector('#delete-progress')?.focus();}
 function confirm(second=false){
  if(!box){box=document.createElement('dialog');box.className='progress-reset-dialog';document.body.append(box);box.addEventListener('cancel',e=>{e.preventDefault();close();});}
  box.innerHTML=`<h2>${second?'정말로 삭제하시겠습니까?':'모든 진행 사항 삭제'}</h2><p>${second?'삭제한 진행 사항은 복구할 수 없습니다.':'영구 강화, 누적 고대 잔해 사용량과 해금 콘텐츠, 열차 개조, 종말 단계, 도감, 이어하기와 설정을 포함한 이 게임의 모든 저장 데이터가 삭제됩니다.'}</p><div class="reset-actions">${second?'<button data-delete>삭제한다</button><button data-cancel>취소한다</button>':'<button data-cancel>취소한다</button><button data-delete>삭제한다</button>'}</div><p data-error role="alert"></p>`;
  box.querySelector('[data-cancel]').onclick=close;
  box.querySelector('[data-delete]').onclick=()=>{if(!second){confirm(true);return;}try{for(const key of keys)localStorage.removeItem(key);g.update=()=>{};location.reload();}catch{box.querySelector('[data-error]').textContent='저장 데이터 삭제에 실패했습니다. 일부 항목이 삭제되었을 수 있습니다.';}};
  if(!box.open)box.showModal();box.querySelector('[data-cancel]').focus();
 }
 window.addEventListener('keydown',e=>{if(box?.open)e.stopImmediatePropagation();},true);
 const show=g.showMeta.bind(g);g.showMeta=function(...args){const r=show(...args);if(document.querySelector('#growth-tab-unlocks[aria-selected="true"]')){const panel=document.querySelector('#growth-panel');const button=document.createElement('button');button.id='delete-progress';button.textContent='진행 사항 삭제';button.onclick=e=>{e.stopPropagation();confirm();};panel.append(button);}return r;};
 const style=document.createElement('style');style.textContent=`
 #delete-progress{display:block;margin:32px 0 0;padding:12px 20px;border:1px solid #ff7b79;border-radius:6px;background:#712c31;color:#fff;cursor:pointer}
 .progress-reset-dialog{width:min(480px,90vw);padding:24px;background:#172a30;color:#eef0e5;border:1px solid #ed7777;border-radius:10px}
 .progress-reset-dialog::backdrop{background:#060b10bb}.progress-reset-dialog p{line-height:1.7}
 .reset-actions{display:grid;grid-template-columns:1fr 1fr;gap:12px;margin-top:24px}
 .reset-actions button{padding:12px;border:1px solid #92aaa1;border-radius:6px;background:#30474d;color:white;cursor:pointer}
 .reset-actions [data-delete]{background:#8a3037;border-color:#ff7b79}.reset-actions button:focus-visible{outline:3px solid #f4dc98;outline-offset:3px}
 `;document.head.append(style);
})();
