/* Compact crew identity header shared by inspection and recruitment. */
(()=>{
 const g=lastRail,esc=v=>String(v??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
 const previous=g.crewHTML.bind(g);
 g.crewHTML=function(c,...args){
  const root=document.createElement('div');root.innerHTML=previous(c,...args);
  const name=root.querySelector('h3');
  if(name){const header=document.createElement('header');header.className='crew-identity';const location=this.state?.cars?.[c.car]?.name||'영입 후보';
   header.innerHTML=`<div class="crew-identity-name"><span class="crew-stars" aria-label="${c.stars||1}성">${'★'.repeat(c.stars||1)}</span><h3>${esc(c.name)}</h3></div><div class="crew-identity-info"><div>HP ${Math.ceil(Math.max(0,c.hp??c.maxHp))} / ${Math.ceil(c.maxHp)} · ${esc(location)}</div><div>Lv.${c.level||1} · ${c.level>=PROGRESSION_CONFIG.crew.maxLevel?'최대 레벨':`경험치 ${Number((c.xp||0).toFixed(2))}/${this.crewXpRequired(c)}`}</div>${c.pendingStats?`<div class="positive">능력 선택 ${c.pendingStats}회 대기 !</div>`:''}</div>`;
   name.replaceWith(header);
  }
  for(const p of root.querySelectorAll('p')){
   const text=p.textContent.trim();
   if(p.classList.contains('crew-growth')||text.startsWith('최고 기본 능력:')||text.startsWith('성급 재능 ')||text.startsWith('HP '))p.remove();
   else if(text.startsWith('모듈 반영 개인화기 피해')){p.className='crew-weapon-summary';p.replaceChildren(...text.split(' · ').map(line=>{const row=document.createElement('span');row.textContent=line;return row;}));}
  }
  return root.innerHTML;
 };
 const inspect=g.inspectCrew.bind(g);g.inspectCrew=function(...args){const result=inspect(...args);const label=document.querySelector('.tactical-head span');if(label)label.textContent='빈칸을 눌러 이동 명령';return result;};
 const style=document.createElement('style');style.textContent=`
 .crew-identity{display:flex;align-items:center;gap:14px;margin:8px 0 18px;min-width:0}
 .crew-identity-name{flex:0 1 auto;min-width:0;max-width:45%}
 .crew-identity-name h3{margin:0!important;overflow-wrap:anywhere}
 .crew-stars{display:block;color:#d8dfd2;font-size:15px;letter-spacing:2px;margin-bottom:3px}
 .crew-identity-info{flex:1;min-width:0;font-size:12px;line-height:1.6;color:#c3d0ca;overflow-wrap:anywhere}
 .crew-weapon-summary span{display:block;line-height:1.7}
 `;document.head.append(style);
})();
