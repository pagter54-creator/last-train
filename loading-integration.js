/* Connect staged loading to run/ACT/boss/event entry points without storing loader state in saves. */
(()=>{
 'use strict';
 const g=window.lastRail,A=window.LAST_RAIL_ASSETS,C=window.LAST_RAIL_ASSET_CONFIG;
 if(!g||!A||!C)return;
 const wrap=(name,groups,title)=>{
  if(typeof g[name]!=='function')return;const old=g[name].bind(g);
  g[name]=function(...args){const list=typeof groups==='function'?groups.call(this,...args):groups;if(!list||!(Array.isArray(list)?list:[list]).some(Boolean))return old(...args);const wanted=(Array.isArray(list)?list:[list]).filter(Boolean);if(wanted.every(A.isGroupReady))return old(...args);return A.withGate(wanted,()=>old(...args),{title:typeof title==='function'?title.call(this,...args):title});};
 };
 const eventGroup=function(){const groups=C.contentGroups.events;if(typeof groups==='string')return groups;return groups?.[this.state?.actId]||groups?.act1||null;};
 wrap('newRun',()=>A.groupForAct('act1'),'출발 준비 중...');
 wrap('advanceStage',function(){return A.groupForAct(this.state?.actId);},'다음 구간 준비 중...');
 wrap('startBoss',id=>A.groupForBoss(id),'보스 구간 준비 중...');
 wrap('showEvent',eventGroup,'사건 현장 준비 중...');
 if(typeof g.continueRun==='function'){
  const old=g.continueRun.bind(g);g.continueRun=function(...args){const p=this.runCheckpoint?.read?.();if(!p)return old(...args);const groups=[A.groupForAct(p.state?.actId)];if(p.node?.type==='boss')groups.push(A.groupForBoss(p.node.bossId));if(p.node?.type==='event'){const eventGroups=C.contentGroups.events;groups.push(typeof eventGroups==='string'?eventGroups:eventGroups?.[p.state?.actId]);}const needed=groups.filter(Boolean);if(needed.every(A.isGroupReady))return old(...args);return A.withGate(needed,()=>old(...args),{title:'저장된 구간 준비 중...'});};
 }
 // Future ACT3/Titan systems can call LAST_RAIL_ASSETS.ensureGroups(['act3','titan']) before entry.
})();
