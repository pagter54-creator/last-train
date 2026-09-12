window.REVISION_CONFIG={stages:15,heat:{drag:2,exponent:2,gatlingGrowth:1.2},power:[{}, {intervalMult:.8},{intervalMult:.8,damageMult:1.4,heatMult:1.35}],modulePower:[0,1,1.2,1.45],repairCap:.3,crewLevelBonus:2,elite:{budget:1.85,hp:1.35,damage:1.4},act2:{hp:1.55,damage:1.4,budget:1.45},stop:{seconds:.8,shift:35,shake:10},hpColors:[[.25,'#f16868'],[.5,'#ed9b54'],[.7,'#e7cf5c'],[1,'#83da96']]};
(()=>{const D=GAME_DATA,C=COMBAT_CONFIG,R=REVISION_CONFIG,N=R.stages,old=D.STAGE_CURVE.slice(),bud=C.budgets.slice(),dur=C.durations.slice(),act2=Object.values(C.stageOverrides.act2);D.STAGE_CURVE=[];
  for(const [ai,act]of Object.values(D.ACTS).entries()){const nodes=act.stages.slice();act.stageOffset=ai*N;act.stages=[...nodes.slice(0,9),{node:'station'},{node:'branch',options:['battle','event']},{node:'elite',title:'정예 봉쇄선'},{node:'event'},nodes[9],{node:'station'}];C.stageOverrides[act.id]={};
    for(let i=0;i<N;i++){const t=i/(N-1)*9,lo=Math.floor(t),hi=Math.min(9,lo+1),mix=(a,b)=>a+(b-a)*(t-lo),a=old[ai*10+lo],b=old[ai*10+hi],curve={...a,stage:ai*N+i+1};for(const k of ['hp','damage','count','duration'])curve[k]=mix(a[k]||1,b[k]||1);if(ai){curve.hp*=R.act2.hp;curve.damage*=R.act2.damage;}D.STAGE_CURVE.push(curve);C.stageOverrides[act.id][i+1]={budget:ai?mix(act2[lo].budget,act2[hi].budget)*R.act2.budget:mix(bud[lo],bud[hi]),duration:ai?mix(act2[lo].duration,act2[hi].duration):mix(dur[lo],dur[hi])};}
  }
  D.BALANCE.titan.speedPerStage*=(old.length-1)/(D.STAGE_CURVE.length-1);
  C.eliteBudget=R.elite.budget;for(const t of Object.values(D.TURRETS))t.power=R.power.map(p=>({...p}));
  for(const e of Object.values(D.ENEMIES))for(const k of ['fromStage','rhythmMinStage'])if(e[k]>=11)e[k]+=5;
  for(const r of Object.values(C.roles))if(r.min>=11)r.min+=5;for(const t of C.templates)if(t.min>=11)t.min+=5;
  for(const k of ['middleStage','lateStage'])ACT2_CONFIG.limits[k]+=5;PROGRESSION_CONFIG.stars.progressStages=N*2;
  D.BALANCE.audio.brake={frequency:2100,end:100,duration:.8,noise:true,gain:.65};
})();
