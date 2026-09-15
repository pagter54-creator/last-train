/* Run progression, crew growth and spawn warnings: tune here, not in controllers. */
window.PROGRESSION_CONFIG={
  crew:{startingStatReduction:1,statGain:1,xpBase:30,xpPerLevel:12,killXp:1,bossPartXp:4,fullHealXp:2,recruitStageStep:3,maxRecruitLevel:7,maxLevel:10,operateDamagePerPoint:.01,maxOperateDamage:.6,repairStart:.5,repairStop:.7},
  stars:{statBonus:{1:0,2:5,3:13},xpMultiplier:{1:.8,2:1,3:1.3},promotion:{2:6,3:9},eventTalentSlots:1,priceMultiplier:{1:1,2:1.45,3:2.1},
    initialWeights:[.95,.05,0],finalWeights:[.25,.45,.3],progressStages:20},
  returnFire:{range:.22,interval:1.5,damageBase:1,damagePerCombat:.7,hitBase:.4,hitPerCombat:.035,hitMin:.2,hitMax:.95,seconds:.16,missOffset:45},
  leftWarning:{seconds:2,width:62,height:100},
  upgrades:{
    escape:{name:'가속 엔진',costs:[25,40,60,85,115,150,190,235],distance:.08,text:'스테이지 통과 시 확보 거리 +0.08 km'},
    movement:{name:'승무원 통로 개선',costs:[20,35,50,70,95],speed:.15,text:'직원 이동 속도 +15%'},
    armor:{name:'비상 장갑 강화',costs:[30,45,65,90,120],duration:1,charge:.15,text:'무적 지속 +1초 · 충전 획득량 +15%'},
    command:{name:'직접 지휘 강화',costs:[30,45,65,90,120],duration:2,stat:.5,cooldownRate:.12,text:'지속 +2초 · 능력 보너스 +0.5 · 재사용 회복 속도 +12%'},
    focus:{name:'집중 사격 강화',costs:[30,45,65,90,120],duration:.5,damage:.04,cooldownRate:.12,text:'지속 +0.5초 · 피해 보너스 +4%p · 재사용 회복 속도 +12%'}
  }
};
(() => {const D=window.GAME_DATA,B=D.BALANCE,P=window.PROGRESSION_CONFIG;
  D.CREW_TEMPLATES.forEach(c=>Object.keys(c.stats).forEach(k=>c.stats[k]-=P.crew.startingStatReduction));
  D.EVENTS.push({id:'mentor',title:'노련한 여행자',text:'폐역에서 만난 여행자가 승무원에게 자신의 경험을 전수하겠다고 제안했다.',choices:[{label:'경험을 전수받는다',result:{crewTalent:true},hint:'무작위 직원에게 이벤트 재능 1개 · 직원당 추가 재능 최대 1개'},{label:'대화를 마치고 출발한다',result:{},hint:'재능을 받지 않고 출발'}]});
  B.heat.operatorHeatReductionPerPoint=.02;B.heat.operatorCoolingBonusPerPoint=.02;B.heat.maxOperatorModifier=.6;
  B.crew.personalDpsPerCombat=.8;B.crew.boarderDamageReductionPerCombat=.015;B.crew.stageHealPerRecovery=.025;B.train.repairStatScale=.12;
})();
