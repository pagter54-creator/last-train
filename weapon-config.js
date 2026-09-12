window.WEAPON_UPGRADES={
  maxLevel:5,costs:{2:25,3:45,4:60,5:80},
  bossReach:{near:.18,far:1},
  tiers:{
    3:{
      efficiency:{name:'효율 강화',text:'피해 -10% · 발열 -25% · 냉각 +20%',damage:.9,heat:.75,cooling:1.2},
      power:{name:'화력 강화',text:'공격 속도 -15% · 피해 +40% · 발열 +20%',rate:.85,damage:1.4,heat:1.2},
      rapid:{name:'연사 강화',text:'공격 속도 +35% · 피해 -25%',rate:1.35,damage:.75}
    },
    5:{
      piercing:{name:'관통탄',text:'공격 속도 -10% · 피해 +15% · 관통 +25%p',rate:.9,damage:1.15,pierce:.25},
      double:{name:'포대 추가',text:'서로 다른 적 2개체 조준 · 각 발 피해 ×0.7',targets:2,damage:.7},
      impact:{name:'충격탄',text:'명중 시 후퇴 · 발열 +20% · 냉각 -15%',knockback:.035,heat:1.2,cooling:.85},
      spread:{name:'산탄',text:'사거리 -25% · 피해 +35%',range:.75,damage:1.35},
      expanded:{name:'포대 확장',text:'사거리 +30% · 발열 +20% · 공격 속도 -15%',range:1.3,heat:1.2,rate:.85}
    }
  },
  numbers:{seconds:1.2,mergeSeconds:.25,rise:34,max:100},
  ricochet:{seconds:.28,length:35,max:40},knockbackMaxDistance:1
};
