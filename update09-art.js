/* Code-native JANUS art follows the supplied concept: tracked wedges, amber vents,
 * a long-barrel crusher and twin thermal emitters. No bitmap boss dependency. */
(()=>{
 'use strict';
 const g=lastRail,A=LAST_RAIL_SCENE,D=GAME_DATA;
 const oldBoss=g.drawBoss.bind(g),oldDraw=g.draw.bind(g),oldProject=g.projectBossEntity.bind(g);
 SCENE_CONFIG.actPalettes.act3={sky:'#1b2935',haze:'#68737b',groundTop:'#646365',sand:'#494a4d',earth:'#252a2d',sun:'#b9c8cd',sunX:.68,sunY:.22};
 const overlay=document.createElement('canvas');overlay.className='act3-effects09';overlay.setAttribute('aria-hidden','true');document.body.append(overlay);const fx=overlay.getContext('2d');
 const line=(c,a,b,color,width=2)=>{c.strokeStyle=color;c.lineWidth=width;c.beginPath();c.moveTo(a.x,a.y);c.lineTo(b.x,b.y);c.stroke();};
 const text=(c,label,x,y,color='#ffcf8c',size=14)=>{c.fillStyle=color;c.font=`600 ${size}px sans-serif`;c.textAlign='center';c.fillText(label,x,y);};
 function plate(c,x,y,w,h,color){c.fillStyle=color;c.strokeStyle='#292d2d';c.lineWidth=2;c.beginPath();c.moveTo(x+7,y);c.lineTo(x+w-7,y);c.lineTo(x+w,y+7);c.lineTo(x+w,y+h);c.lineTo(x,y+h);c.lineTo(x,y+7);c.closePath();c.fill();c.stroke();for(const px of [x+6,x+w-6])for(const py of [y+7,y+h-6]){c.fillStyle='#363a38';c.fillRect(px,py,3,3);}}
 function vehicle(c,part,x,y,scale,dir,t){
  c.save();c.translate(x,y);c.scale(scale*dir,scale);if(part.destroyed)c.globalAlpha=.38;
  const metal=part.hitFlash>0?'#fff0d3':'#726d5c',edge='#9b9276',amber=part.destroyed?'#443e36':'#ffb64f';
  c.fillStyle='#10191dbb';c.beginPath();c.ellipse(0,46,151,20,0,0,Math.PI*2);c.fill();
  // Wide continuous tracks and interlocking shoes.
  plate(c,-137,10,255,49,'#242c2c');for(let i=0;i<11;i++){c.fillStyle='#4f5149';c.beginPath();c.arc(-121+i*22,35,19,0,Math.PI*2);c.fill();c.strokeStyle='#191e20';c.lineWidth=4;c.stroke();c.fillStyle='#303a3b';c.beginPath();c.arc(-121+i*22,35,9,0,Math.PI*2);c.fill();}
  for(let i=0;i<20;i++){const x=-136+(i*13+t*30)%260;c.fillStyle='#7c7866';c.fillRect(x,8,9,6);c.fillRect(x,56,9,5);}
  plate(c,-134,-32,235,47,metal);plate(c,-109,-61,125,47,'#5c5d53');
  // Sloping ram, headlights, and the tall slatted cowcatcher.
  c.fillStyle=metal;c.strokeStyle=edge;c.lineWidth=2;c.beginPath();c.moveTo(8,-30);c.lineTo(111,-5);c.lineTo(146,42);c.lineTo(89,42);c.lineTo(57,6);c.lineTo(-6,-6);c.closePath();c.fill();c.stroke();
  for(let i=0;i<5;i++)line(c,{x:91+i*11,y:9},{x:112+i*10,y:54},'#383e3c',7);
  c.fillStyle=amber;c.fillRect(80,-10,18,6);c.fillRect(105,-3,14,5);
  // Rear smoke stacks, cooling grille and communications mast.
  for(const x of [-121,-98]){plate(c,x,-102,12,54,'#343f40');c.fillStyle='#171e23';c.fillRect(x-3,-105,18,6);for(let n=0;n<3;n++){c.fillStyle=`rgba(25,32,37,${.2-n*.04})`;c.beginPath();c.arc(x+Math.sin(t+n)*6,-116-n*17-(t*9%17),9+n*6,0,Math.PI*2);c.fill();}}
  line(c,{x:-75,y:-64},{x:-75,y:-153},'#334143',3);line(c,{x:-60,y:-64},{x:-60,y:-129},'#343b3c',2);
  for(let i=0;i<5;i++){c.fillStyle='#263133';c.fillRect(-124,-53+i*7,33,4);}plate(c,-55,-78,53,46,'#817a65');
  c.fillStyle='#c0ac79';c.beginPath();c.moveTo(-43,-65);c.lineTo(-36,-56);c.lineTo(-30,-65);c.lineTo(-22,-56);c.lineTo(-15,-65);c.lineTo(-25,-42);c.lineTo(-30,-50);c.lineTo(-36,-42);c.closePath();c.fill();
  // Trunnion and layered turret armor.
  c.fillStyle='#333f40';c.beginPath();c.arc(10,-51,25,0,Math.PI*2);c.fill();c.strokeStyle=edge;c.lineWidth=5;c.stroke();
  plate(c,-43,-118,90,58,metal);plate(c,-54,-111,21,49,'#8b8169');
  if(part.type==='janusCrusher'){
   plate(c,34,-103,130,15,'#3f4a48');plate(c,151,-109,27,27,'#716f5e');c.fillStyle='#222d30';for(let i=0;i<3;i++)c.fillRect(156+i*6,-104,3,17);c.fillStyle=amber;c.fillRect(-21,-88,21,5);
  }else{
   for(const x of [20,61]){line(c,{x:2,y:-59},{x,y:-91},'#414c4a',12);plate(c,x-21,-135,35,54,metal);c.fillStyle='#312d29';c.fillRect(x-16,-129,25,42);c.shadowColor=amber;c.shadowBlur=12;c.fillStyle=amber;c.fillRect(x-12,-125,5,34);c.fillRect(x-2,-125,5,34);c.shadowBlur=0;}
   for(let i=0;i<3;i++){plate(c,-118+i*22,-77,17,29,'#49534e');c.fillStyle=amber;c.fillRect(-113+i*22,-72,5,19);}
  }
  c.restore();
 }
 g.projectBossEntity=function(e,w,h){if(e?.janusPart)return{x:e.x*w,y:e.y*h,scale:1,r:Math.min(110,w*.073)};if(e?.dropLeft>0){const to=A.getCarPosition(e.targetCar);if(to)return{x:to.x,y:to.y-65-e.dropLeft/e.dropTotal*h*.55,scale:1,r:24};}if(e?.attached&&['connectorBlocker','tetherDrone'].includes(e.type)){const p=A.getCarPosition(e.targetCar);if(p)return{x:p.x+42,y:p.y-46,scale:1,r:23};}return oldProject(e,w,h);};
 g.drawBoss=function(c,w,h){const b=this.state?.battle;if(b?.bossId!=='janus')return oldBoss(c,w,h);if(this.mode!=='battle'||!b.janus09)return;
  const scale=Math.min(1.1,w/1600),t=A.visualClock;c.save();if(b.defeated)c.globalAlpha=Math.max(0,b.defeatFadeLeft/2);
  for(const p of b.parts){const q=A.project(p,w,h);vehicle(c,p,q.x,q.y,scale,p.facing09??(p.x<.55?1:-1),t);const barW=220*scale;c.fillStyle='#17272d';c.fillRect(q.x-barW/2,q.y-169*scale,barW,7);c.fillStyle=p.destroyed?'#64716d':'#f4bd70';c.fillRect(q.x-barW/2,q.y-169*scale,barW*p.hp/p.maxHp,7);text(c,p.name,q.x,q.y-180*scale,'#f6d79c',14);}
  const j=b.janus09;if(j.phase==='merge')text(c,`합체 · 동시 피해 ${j.phaseLeft.toFixed(1)}초`,w*.5,h*.16,'#a5f0ec',19);if(j.vulnerableLeft>0)text(c,`과부하 · 받는 피해 +25% · ${j.vulnerableLeft.toFixed(1)}초`,w*.5,h*.195,'#ffd08a',17);c.restore();
 };
 function effects(c,w,h){const s=g.state,b=s.battle,t=A.visualClock,L=b.lightning09;
  for(const warning of [...(L?.warning?[L.warning]:[]),...(L?.warnings09||[])]){const p=A.getCarPosition(warning.car);if(p){c.setLineDash([10,7]);line(c,{x:p.x,y:0},{x:p.x,y:p.y+25},'#99eaff',3);c.setLineDash([]);text(c,`낙뢰 ${warning.left.toFixed(1)}초 · 전력 0 → 과충전`,p.x,p.y-119,'#b5f1ff',14);}}
  for(const hit of [...(L?.flash>0?[{car:L.hit}]:[]),...(L?.flashes09||[])]){const p=A.getCarPosition(hit.car);if(p){c.shadowColor='#8ddfff';c.shadowBlur=24;line(c,{x:p.x,y:0},p,'#edffff',8);c.shadowBlur=0;}}
  for(const [ci,car] of s.cars.entries()){const p=A.getCarPosition(ci);if(!p)continue;if(car.breakerBroken||car.overchargeLeft>0){const color=car.breakerBroken?'#ff997f':'#8ceaff';c.strokeStyle=color;c.lineWidth=2;c.strokeRect(p.x-58,p.y-58,116,65);text(c,car.breakerBroken?`차단기 ${Math.floor((car.breakerRepair||0)/UPDATE09.lightning.repairSeconds*100)}%`:`${car.specialOvercharge?'특수 ':''}ϟ 3 · ${car.overchargeLeft.toFixed(1)}초`,p.x,p.y-71,color,13);}}
  for(const e of s.enemies.filter(e=>!e.dead)){
   const p=A.project(e,w,h);if(e.dropLeft>0){const target=A.getCarPosition(e.targetCar);if(!target)continue;c.setLineDash([4,6]);line(c,p,{x:target.x,y:target.y-55},'#ffbd89');c.setLineDash([]);c.fillStyle='#a18b68';c.beginPath();c.arc(p.x,p.y-14,23,Math.PI,0);c.fill();line(c,{x:p.x-23,y:p.y-14},{x:p.x,y:p.y+10},'#ecd4a5');line(c,{x:p.x+23,y:p.y-14},{x:p.x,y:p.y+10},'#ecd4a5');c.fillStyle='#b9614f';c.fillRect(p.x-5,p.y-4,10,19);text(c,`공습 ${e.dropLeft.toFixed(1)}`,target.x,target.y-102,'#ffbd89',12);}
   if(e.type==='tetherDrone'&&e.attached){const to=A.getCarPosition(e.targetCar);line(c,p,to,'#cd99fa',3);c.strokeStyle='#b7a3d3';c.strokeRect(p.x-13,p.y-7,26,14);for(const side of [-1,1]){c.beginPath();c.ellipse(p.x+side*20,p.y-9,12,4,0,0,Math.PI*2);c.stroke();}}
   if(e.type==='signalElite'){for(let i=0;i<3;i++){c.strokeStyle='#c1a1f1';c.beginPath();c.arc(p.x,p.y-24,12+i*10+Math.sin(t*3)*3,Math.PI,Math.PI*2);c.stroke();}}
   if(e.type==='assaultElite'){plate(c,p.x-43,p.y-24,86,33,'#798271');plate(c,p.x-46,p.y-5,15,42,'#a49b7d');text(c,'전진 소환 거점',p.x,p.y-38,'#dfcba1',12);}
  }
  for(const i of g.blockedConnectors09()){const a=A.getCarPosition(i),b=A.getCarPosition(i+1);if(!a||!b)continue;const x=(a.x+b.x)/2,y=(a.y+b.y)/2;plate(c,x-8,y-80,16,107,'#9b7757');for(let k=0;k<5;k++)line(c,{x:x-9,y:y-70+k*20},{x:x+9,y:y-58+k*20},'#f1c760',4);}
  const j=b.janus09,wall=j?.wall;
  if(wall?.hp>0){const a=A.getCarPosition(wall.connector),z=A.getCarPosition(wall.connector+1);if(a&&z){const q={x:(a.x+z.x)/2,y:(a.y+z.y)/2-55};text(c,`봉쇄벽 ${Math.ceil(wall.hp)} / ${wall.maxHp}`,q.x,q.y-45,'#ffe0a3',13);
   for(const crew of s.crew)if(crew.wallShot09>0){const el=document.querySelector(`[data-crew="${crew.id}"]`);if(!el)continue;const r=worldRect(el),from={x:r.left+r.width/2,y:r.top+12};line(c,from,q,'#fff1a3',2);c.fillStyle='#fff6bd';c.beginPath();c.arc(from.x,from.y,6,0,Math.PI*2);c.fill();c.beginPath();c.arc(q.x,q.y,5+Math.sin(t*42)*3,0,Math.PI*2);c.fill();}}
  }
  if(j?.shot?.left>0){const p=b.parts.find(p=>p.type===j.shot.part),to=A.getCarPosition(j.shot.car);if(p&&to)line(c,A.project(p,w,h),to,'#ffcc85',4);}
  for(const e of s.enemies.filter(e=>!e.dead&&e.janusHeatDrone)){const p=A.getCarPosition(e.targetCar);if(!p)continue;c.save();c.translate(p.x,p.y-82);c.strokeStyle='#ff9a63';c.lineWidth=2;c.beginPath();c.arc(0,0,13,0,Math.PI*2);c.stroke();for(const side of [-1,1]){c.beginPath();c.ellipse(side*19,-3,9,4,0,0,Math.PI*2);c.stroke();}c.fillStyle='#ffb06f';c.fillRect(-5,-5,10,10);c.restore();text(c,'발열 드론 · 냉각 저하',p.x,p.y-108,'#ffad7d',12);}
  for(const t of j?.telegraphs||[]){if(t.resolved)continue;for(const ci of t.cars){const p=A.getCarPosition(ci);if(!p)continue;const verdict=t.kind==='verdict',mark=verdict?(t.payload?.marks?.[ci]||'heat'):null,color=verdict?(mark==='destroy'?'#ff756d':'#77e9ff'):(t.kind.startsWith('heater')||t.kind==='heatDrone'?'#ff9b63':'#ff6f6f');c.save();c.strokeStyle=color;c.lineWidth=3;c.setLineDash([8,6]);c.strokeRect(p.x-57,p.y-78,114,82);c.setLineDash([]);c.restore();const label=verdict?(mark==='destroy'?'파괴':'과열'):t.kind==='crusherHeavy'?'강공격':t.kind==='crusherMulti'?'다중 포격':t.kind==='heaterShot'?'과열탄':'발열 드론';text(c,`${label} ${t.left.toFixed(1)}`,p.x,p.y-91,color,13);}}
 }
 g.draw=function(){oldDraw();const w=this.view?.w||1,h=this.view?.h||1,rect=document.querySelector('#game-canvas').getBoundingClientRect(),dpr=Math.min(devicePixelRatio||1,2);if(overlay.width!==Math.round(w*dpr)||overlay.height!==Math.round(h*dpr)){overlay.width=Math.round(w*dpr);overlay.height=Math.round(h*dpr);}Object.assign(overlay.style,{left:rect.left+'px',top:rect.top+'px',width:rect.width+'px',height:rect.height+'px'});fx.setTransform(dpr,0,0,dpr,0,0);fx.clearRect(0,0,w,h);if(this.mode==='battle'&&this.state?.actId==='act3'&&!this.sceneTransition)effects(fx,w,h);};
})();
