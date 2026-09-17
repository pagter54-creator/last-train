/* Authored elite encounters are scheduled independently of ordinary swarm rolls. */
(() => {
 const D=GAME_DATA;
 window.ELITE_CONFIG={tick:1,shotVisual:.22,warningSeconds:3,droneRest:12,lateStage:25,firstDelay:12,
   frequency:[{stage:1,count:0,gap:80},{stage:7,count:1,gap:65,chance:.3},{stage:11,count:2,gap:48,chance:.65},{stage:16,count:3,gap:36,chance:1},{stage:25,count:5,gap:25,chance:1}],eliteExtra:1,
   caps:{act1:1,act2:1,eliteAct1:2,eliteAct2:2,lateNormal:2,lateElite:3},boarderDanger:3,fireCaps:{act1:1,act2:2},fireTick:1,
   boardVisual:{roofOffset:65,spacing:25},heatGrowthMultiplier:.5,spawnDistance:.98,escortSpacing:.025,escortConvergence:1};

 const make=(id,name,icon,hp,armor,speed,stage,behavior,settings,help)=>({id,name,icon,hp,armor,speed,elite:true,majorThreat:true,actMin:stage<16?1:2,eliteMinStage:stage,fromStage:999,rhythmMinStage:999,threatCost:30,tags:['ELITE'],behavior:'elite:'+behavior,attackPattern:behavior,specialBehavior:behavior,targetingRule:'ordinary',ranged:true,carDamage:0,crewDamage:0,interval:settings.interval||10,...settings,help});
 Object.assign(D.ENEMIES,{
  siegeElite:make('siegeElite','공성함포차','◆',480,.3,.4,11,'siege',{hold:.72,windup:3,interval:13,carDamage:55,crewDamage:2},'먼 거리에서 포격합니다. 장거리 화력 또는 비상 장갑으로 대응하세요.'),
  bulwarkElite:make('bulwarkElite','강습 방벽차','▣',630,.6,.55,7,'bulwark',{radius:.27,transfer:.7,escortMin:2,escortMax:4,carDamage:3,crewDamage:1,interval:4},'승선 적의 피해 70%를 대신 받습니다. 곡사·광역 공격은 보호를 우회합니다.'),
  sniperElite:make('sniperElite','인원 저격차','⌖',285,.22,.6,16,'sniper',{hold:.65,windup:2.8,interval:12,crewRatio:.27,lowHpWeight:1,operateWeight:.08,repairWeight:.5},'직원을 직접 저격합니다. 표시된 직원을 이동시키면 조준을 피할 수 있습니다.'),
  parasiteElite:make('parasiteElite','전력 기생차','ϟ',420,.3,.85,16,'parasite',{hold:.15,drainAfter:8,drainMax:2,armorPerPower:.12,maxArmor:.9},'추가 출력을 흡수합니다. 기본 출력 1은 보존됩니다.'),
  commandElite:make('commandElite','사냥개 지휘차','⚑',375,.35,.65,7,'command',{radius:.35,speedBonus:.2,intervalMult:.85,windupMult:.85,orderInterval:9,orderSeconds:5,chargeBonus:.35,carDamage:2,crewDamage:1,interval:5},'주변 일반 적의 이동·공격·특수 행동을 강화합니다.'),
  fireElite:make('fireElite','방화 습격차','♨',330,.2,.85,11,'fire',{hold:.4,windup:2,interval:12,fireSeconds:10,hullRatio:.004,crewRatio:.025,flight:.65},'화재는 직원에게 위험합니다. 대피하거나 비상 장갑으로 피해를 막으세요.'),
  stealthElite:make('stealthElite','스텔스 자폭 드론','◇',300,.2,1,16,'stealth',{travel:15,currentHpRatio:.3,targetingRule:'focusOnly'},'자동 포탑이 감지하지 못합니다. 집중 사격 지정 또는 직원 개인화기로 요격하세요.')
 });
 D.BALANCE.audio.hammer={frequency:1250,end:180,duration:.12,gain:.45};
})();
