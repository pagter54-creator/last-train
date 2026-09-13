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
  [520,'turrets',['phosphorus']], [585,'skills',['overloadEngineer','heatTuner','steadyStance','toughness']],
  [650,'modules',['grinder']], [725,'events',['skill_militaryBase','skill_instructor']],
  [800,'skills',['throughFlames','lastStand','railOath']],
  [900,'skills',['ancientWhisper','wastelandHunter','lifeDebt']]
 ].map(([at,kind,ids])=>({at,kind,ids}));
 const registries={turrets:D.TURRETS,modules:D.MODULES,skills:D.TRAITS,events:Object.fromEntries(EVENT_CONFIG.events.map(e=>[e.id,e]))};
 const labels={turrets:'포탑',modules:'모듈',skills:'직원 스킬',events:'직원 성장 이벤트'};
 for(const row of rows){row.hiddenName='새로운 '+labels[row.kind]+(row.ids.length>1?' 묶음':'');row.name=labels[row.kind]+' · '+row.ids.map(id=>{const d=registries[row.kind][id];d.unlockSpent=row.at;return d.name||d.title;}).join(', ');}
 // Story encounters must not offer a training reward whose entire pool is locked.
 for(const e of EVENT_CONFIG.events){const ids=e.choices.flatMap(c=>[c.reward,...(c.outcomes||[]).map(o=>o.reward)]).flatMap(r=>Array.isArray(r?.skillReward?.pool)?r.skillReward.pool:[]);if(ids.length&&ids.every(id=>D.TRAITS[id]?.eventExclusive))e.unlockSpent=Math.min(...ids.map(id=>D.TRAITS[id].unlockSpent||0));}
})();
