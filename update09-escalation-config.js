/* Escalation is encounter composition, not another HP/damage multiplier. */
(()=>{
 window.ESCALATION09={
  tiers:[
   {at:1,chance:.15,slots:2,count:2,gap:25,threat:1,reward:1,eliteReward:1,extraBattles:[],combo:0,lightning:30,strikes:1,targets:1,eliteLightning:1,shopTier:0,advancedChance:.55,starBoost:0,boarders:0},
   {at:2,chance:.25,slots:3,count:3,gap:20,threat:1.08,reward:1.25,eliteReward:1.1,extraBattles:[],combo:1,lightning:30,strikes:1,targets:1,eliteLightning:1,shopTier:1,advancedChance:.65,starBoost:.12,boarders:1},
   {at:3,chance:.35,slots:3,count:4,gap:17,threat:1.16,reward:1.5,eliteReward:1.2,extraBattles:[3,8],combo:2,lightning:27,strikes:1,targets:1,eliteLightning:.9,shopTier:1,advancedChance:.75,starBoost:.22,boarders:2},
   {at:4,chance:.45,slots:4,count:6,gap:14,threat:1.24,reward:1.8,eliteReward:1.3,extraBattles:[3,8,14],combo:3,lightning:24,strikes:2,targets:2,eliteLightning:.85,shopTier:2,advancedChance:.85,starBoost:.32,boarders:3},
   {at:5,chance:.55,slots:4,count:8,gap:11,threat:1.32,reward:2.1,eliteReward:1.4,extraBattles:[1,3,8,14],combo:4,lightning:21,strikes:2,targets:2,eliteLightning:.8,shopTier:2,advancedChance:.95,starBoost:.42,boarders:4},
   {at:8,chance:.60,slots:5,count:10,gap:9,threat:1.45,reward:2.7,eliteReward:1.5,extraBattles:[1,3,7,8,14],combo:4,lightning:18,strikes:3,targets:2,eliteLightning:.8,shopTier:3,advancedChance:1,starBoost:.5,boarders:5}
  ],burstGap:1.3,warning:3.5,
  comboLabels:['강한 조합 제한','저격 + 방화 / 저위험 정예 3종 허용','공습 + 신호 교란 / 공성 + 전력 기생 허용','공습 + 중장 돌격 / 전력 기생 + 신호 교란 / 차단 + 공습 / 대량 승선 허용','최고 난도 조합 개방 (동일 정예 중복·전체 슬롯 상한 유지)'],
  motion:{janusTravel:1.6,janusTurn:5,titanArrival:2}
 };
})();
