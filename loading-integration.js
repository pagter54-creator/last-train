/* Connect staged loading to run/ACT/boss/event entry points without storing loader state in saves. */
(()=>{
 'use strict';
 const g=window.lastRail,A=window.LAST_RAIL_ASSETS,C=window.LAST_RAIL_ASSET_CONFIG;
 if(!g||!A||!C)return;
 const unique=list=>[...new Set(list.flat(Infinity).filter(Boolean))];
 const wrap=(name,groups,title)=>{
  if(typeof g[name]!=='function')return;const old=g[name].bind(g);
  g[name]=function(...args){
   const list=typeof groups==='function'?groups.call(this,...args):groups;
   const wanted=unique(Array.isArray(list)?list:[list]);
   if(!wanted.length||wanted.every(A.isGroupReady))return old(...args);
   return A.withGate(wanted,()=>old(...args),{title:typeof title==='function'?title.call(this,...args):title});
  };
 };
 /*
  * ACT II can intentionally draw ACT I events as well as ACT II events.
  * Prepare every event group that can be selected at the current ACT so a late
  * ACT I event never opens before its background has been loaded and verified.
  */
 const eventGroupsForAct=actId=>{
  const groups=C.contentGroups.events;
  if(typeof groups==='string')return[groups];
  const order=['act1','act2','act3'];
  let index=order.indexOf(actId);
  if(index<0)index=0;
  const ready=[];
  for(let i=0;i<=index;i++){
   const value=groups?.[order[i]];
   if(Array.isArray(value))ready.push(...value);else ready.push(value);
  }
  return unique(ready.length?ready:[groups?.act1]);
 };
 wrap('newRun',()=>A.groupForAct('act1'),'출발 준비 중...');
 wrap('advanceStage',function(){return A.groupForAct(this.state?.actId);},'다음 구간 준비 중...');
 wrap('startBoss',id=>A.groupForBoss(id),'보스 구간 준비 중...');
 wrap('showEvent',function(){return eventGroupsForAct(this.state?.actId);},'사건 현장 준비 중...');
 if(typeof g.continueRun==='function'){
  const old=g.continueRun.bind(g);
  g.continueRun=function(...args){
   const p=this.runCheckpoint?.read?.();if(!p)return old(...args);
   const groups=[A.groupForAct(p.state?.actId)];
   if(p.node?.type==='boss')groups.push(A.groupForBoss(p.node.bossId));
   if(p.node?.type==='event')groups.push(...eventGroupsForAct(p.state?.actId));
   const needed=unique(groups);
   if(needed.every(A.isGroupReady))return old(...args);
   return A.withGate(needed,()=>old(...args),{title:'저장된 구간 준비 중...'});
  };
 }
 // Future ACT3/Titan systems can call LAST_RAIL_ASSETS.ensureGroups(['act3','titan']) before entry.
})();
