/* Content eligibility is independent of the encounter-based codex. */
(()=>{
 const D=GAME_DATA;
 const rows=window.CONTENT_UNLOCKS=[
  [15,'skills',['scholar']], [30,'turrets',['tesla']], [45,'modules',['targeting']],
  [60,'skills',['antiAir','armorAmmo','fireTraining']], [80,'turrets',['repulsor']],
  [100,'events',['skill_abandonedSchool','skill_firingRange']], [125,'modules',['autoRepair']],
  [150,'turrets',['breaker']], [180,'skills',['repairForeman','aimExpert','restorationExpert']],
  [210,'modules',['crewArms']], [245,'events',['skill_fieldWorkshop','skill_railAcademy']],
  [280,'turrets',['frost']], [320,'modules',['shield']],
  [365,'skills',['eliteHunter','powerTechnician','fireController','guardian']],
  [410,'modules',['overdrive']], [460,'events',['skill_survivorCamp','skill_rescue']],
  [520,'turrets',['phosphorus']], [550,'turrets',['interceptor']],
  [585,'skills',['overloadEngineer','heatTuner','steadyStance','toughness']],
  [615,'modules',['swiftWarp']], [650,'modules',['grinder']], [690,'turrets',['sludge']],
  [725,'events',['skill_militaryBase','skill_instructor']], [760,'modules',['recoveryDrone']],
  [800,'skills',['throughFlames','lastStand','railOath']], [840,'turrets',['penetrator']],
  [875,'events',['lightning_rod']],
  [900,'skills',['ancientWhisper','wastelandHunter','lifeDebt']], [960,'modules',['makeshiftRepair']]
 ].map(([at,kind,ids])=>({at,kind,ids}));
 const registries={turrets:D.TURRETS,modules:D.MODULES,skills:D.TRAITS,events:Object.fromEntries(EVENT_CONFIG.events.map(e=>[e.id,e]))};
 const labels={turrets:'포탑',modules:'모듈',skills:'직원 스킬',events:'직원 성장 이벤트'};
 for(const row of rows){
  row.hiddenName='새로운 '+labels[row.kind]+(row.ids.length>1?' 묶음':'');
  row.name=labels[row.kind]+' · '+row.ids.map(id=>{const d=registries[row.kind][id];d.unlockSpent=row.at;return d.name||d.title;}).join(', ');
 }
 // The lightning-rod module is event-only, but it belongs to the same 875-spent unlock milestone.
 D.MODULES.lightningRod.unlockSpent=875;
 const rodRow=rows.find(r=>r.at===875&&r.kind==='events'&&r.ids.includes('lightning_rod'));
 if(rodRow){rodRow.hiddenName='ACT III 특수 이벤트 + 신규 모듈';rodRow.name='ACT III 특수 이벤트 · 피뢰침 회수 이벤트 + 피뢰침 모듈';rodRow.text='ACT III에서 피뢰침 회수 이벤트가 등장하며, 이벤트를 통해 피뢰침 모듈을 획득할 수 있습니다.';}
 // Preview builds before this table shipped treated the new 0.9 equipment/event as always unlocked.
 // Remove only those stale retained flags when the account has not reached the new threshold.
 const newlyGated={turrets:{interceptor:550,sludge:690,penetrator:840},modules:{swiftWarp:615,recoveryDrone:760,lightningRod:875,makeshiftRepair:960},events:{lightning_rod:875}};
 const meta=window.lastRail?.meta;
 if(meta?.contentUnlocks){
  for(const[kind,map]of Object.entries(newlyGated))if(Array.isArray(meta.contentUnlocks[kind]))meta.contentUnlocks[kind]=meta.contentUnlocks[kind].filter(id=>!(map[id]&&Number(meta.spent||0)<map[id]));
 }
 // Story encounters must not offer a training reward whose entire pool is locked.
 for(const e of EVENT_CONFIG.events){const ids=e.choices.flatMap(c=>[c.reward,...(c.outcomes||[]).map(o=>o.reward)]).flatMap(r=>Array.isArray(r?.skillReward?.pool)?r.skillReward.pool:[]);if(ids.length&&ids.every(id=>D.TRAITS[id]?.eventExclusive))e.unlockSpent=Math.min(...ids.map(id=>D.TRAITS[id].unlockSpent||0));}
})();
