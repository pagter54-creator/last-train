/* Code-native reference-inspired silhouettes; no bitmap boss images are loaded. */
(() => {
  'use strict';
  const g=window.lastRail,A=window.LAST_RAIL_SCENE,C=window.BOSS_REWORK,D=window.GAME_DATA;
  const old=g.drawBoss.bind(g),clamp=n=>Math.max(0,Math.min(1,n));
  function home(p,w,h){return{x:w*p.x,y:h*p.y,scale:1,r:Math.max(23,Math.min(38,w*.033))};}
  g.projectBossEntity=function(e,w,h){
    if(e.bossPart){const p=home(e,w,h),car=A.getCarPosition(e.car);if(car&&(e.grip>0||e.stun>0)){const blend=e.grip>0?1:clamp(e.stun/C.armStun);p.x+=(car.x-p.x)*blend;p.y+=(car.y-78-p.y)*blend;}return p;}
    if(e.type==='infiltrationTruck'&&e.origin){const from=home(e.origin,w,h),to=A.getCarPosition(e.targetCar);if(!to)return from;const p=clamp(e.truckTravel);return{x:from.x+(to.x-from.x)*p,y:from.y+(to.y-25-from.y)*p,scale:.75+p*.65,r:28};}
    return null;
  };
  function polygon(ctx,points,fill,stroke='#72847e'){ctx.fillStyle=fill;ctx.strokeStyle=stroke;ctx.lineWidth=2;ctx.beginPath();points.forEach(([x,y],i)=>i?ctx.lineTo(x,y):ctx.moveTo(x,y));ctx.closePath();ctx.fill();ctx.stroke();}
  function plate(ctx,x,y,w,h,color='#415457'){polygon(ctx,[[x+7,y],[x+w-7,y],[x+w,y+7],[x+w,y+h-7],[x+w-7,y+h],[x+7,y+h],[x,y+h-7],[x,y+7]],color);ctx.fillStyle='#213237';for(const dx of [8,w-8])for(const dy of [8,h-8]){ctx.beginPath();ctx.arc(x+dx,y+dy,2,0,Math.PI*2);ctx.fill();}}
  function line(ctx,a,b,color,width){ctx.strokeStyle=color;ctx.lineWidth=width;ctx.beginPath();ctx.moveTo(a.x,a.y);ctx.lineTo(b.x,b.y);ctx.stroke();}
  function joint(ctx,x,y,r){ctx.fillStyle='#26373c';ctx.strokeStyle='#99a093';ctx.lineWidth=3;ctx.beginPath();ctx.arc(x,y,r,0,Math.PI*2);ctx.fill();ctx.stroke();ctx.fillStyle='#b49a60';ctx.beginPath();ctx.arc(x,y,r*.43,0,Math.PI*2);ctx.fill();}
  function text(ctx,label,x,y,color='#ede6cd',size=12){ctx.font=`600 ${size}px sans-serif`;ctx.textAlign='center';ctx.fillStyle=color;ctx.fillText(label,x,y);}
  function beam(ctx,a,b,color,width=2,dashed=false){ctx.save();if(dashed)ctx.setLineDash([8,7]);line(ctx,a,b,color,width);ctx.restore();}
  g.drawBoss=function(ctx,w,h){const b=this.state.battle;if(!b.rework)return old(ctx,w,h);const t=A.visualClock,parts=b.parts,core=parts.find(p=>p.victory),cp=A.project(core,w,h),arachne=b.bossId==='arachne';ctx.save();
    if(!arachne){
      // Long tracked hull, stern exhausts, recessed bay and oversized forward cannon.
      const x=w*.18,y=h*.36,bw=w*.7,bh=h*.2;
      plate(ctx,x,y,bw,bh,'#35494b');plate(ctx,x-12,y+bh*.68,bw+28,bh*.4,'#263638');
      for(let i=0;i<13;i++){const wx=x+20+i*(bw-40)/12,wy=y+bh;ctx.fillStyle='#15272c';ctx.beginPath();ctx.arc(wx,wy,Math.min(22,bw/27),0,Math.PI*2);ctx.fill();joint(ctx,wx,wy,Math.min(14,bw/40));}
      for(let i=0;i<6;i++)plate(ctx,x+i*bw/6,y+bh*.72,bw/6-5,bh*.25,'#53605b');
      polygon(ctx,[[x+bw-40,y],[x+bw+40,y+bh*.45],[x+bw+58,y+bh],[x+bw-20,y+bh]],'#4e605e');
      for(let i=0;i<4;i++)line(ctx,{x:x+bw+8+i*9,y:y+bh*.65},{x:x+bw+30+i*12,y:y+bh*1.1},'#889084',5);
      for(let i=0;i<2;i++){plate(ctx,x+12+i*27,y-35,20,45,'#26383d');for(let k=0;k<4;k++){const drift=(t*.35+k*.25)%1;ctx.fillStyle=`rgba(33,46,47,${.3*(1-drift)})`;ctx.beginPath();ctx.arc(x+20+i*27-drift*45,y-35-drift*65,8+drift*18,0,Math.PI*2);ctx.fill();}}
      const bay=parts.find(p=>p.type==='bay'),bp=A.project(bay,w,h);plate(ctx,bp.x-49,bp.y-32,98,66,bay.destroyed?'#292f30':'#65716a');ctx.fillStyle='#15272a';ctx.fillRect(bp.x-40,bp.y-23,80,45);for(let i=0;i<3;i++){ctx.fillStyle=bay.windup?'#ff7c61':'#d7b76b';ctx.fillRect(bp.x-35+i*26,bp.y-28,17,4);}if(!bay.destroyed){plate(ctx,bp.x-21,bp.y-2,42,20);ctx.fillStyle='#cfb77a';ctx.fillRect(bp.x-17,bp.y+4,7,3);}
      const cannon=parts.find(p=>p.type==='cannon'),q=A.project(cannon,w,h),recoil=b.shot?.left>0?Math.sin(b.shot.left/.45*Math.PI)*9:0;plate(ctx,q.x-56-recoil,q.y-23,112,48,cannon.destroyed?'#30373a':'#586963');plate(ctx,q.x-39,q.y+25,75,12);plate(ctx,q.x+55-recoil,q.y-11,w*.19,20,'#2b4045');plate(ctx,q.x+52+w*.19-recoil,q.y-15,20,28,'#4d5e5e');
      const drive=parts.find(p=>p.type==='drive'),dp=A.project(drive,w,h);plate(ctx,dp.x-35,dp.y-20,70,40,drive.destroyed?'#303337':'#536862');for(let i=0;i<4;i++)line(ctx,{x:dp.x-25,y:dp.y-12+i*8},{x:dp.x+25,y:dp.y-12+i*8},'#1e3235',4);
      line(ctx,{x:q.x-30,y:q.y-24},{x:q.x-30,y:q.y-62},'#819187',2);
    }else{
      // Four ground legs support the chassis; four independently aimed tool arms sit above.
      for(const side of [-1,1])for(let i=0;i<2;i++){const start={x:cp.x+side*35,y:cp.y+45},knee={x:cp.x+side*(w*(.12+i*.05)),y:cp.y+75+i*18},foot={x:cp.x+side*w*(.2+i*.05),y:h*.61+Math.sin(t*3+i)*4};line(ctx,start,knee,'#23373c',32);line(ctx,knee,foot,'#23373c',28);line(ctx,start,knee,'#65716a',22);line(ctx,knee,foot,'#53635e',19);joint(ctx,knee.x,knee.y,12);plate(ctx,foot.x-16,foot.y-4,32,12);}
      plate(ctx,cp.x-64,cp.y-55,128,150,'#425958');plate(ctx,cp.x-44,cp.y+63,88,35,'#69746b');for(const side of [-1,1]){plate(ctx,cp.x+side*66-13,cp.y-25,26,65,'#596b64');line(ctx,{x:cp.x+side*34,y:cp.y-55},{x:cp.x+side*34,y:cp.y-94},'#94a092',2);}
      for(const p of parts.filter(p=>!p.victory)){const end=A.project(p,w,h),side=end.x<cp.x?-1:1,start={x:cp.x+side*52,y:cp.y+(p.type==='drain'||p.type==='suppress'?35:-25)},knee={x:(start.x+end.x)/2,y:Math.min(start.y,end.y)-45};line(ctx,start,knee,'#1c3036',23);line(ctx,knee,end,'#1c3036',21);line(ctx,start,knee,p.destroyed?'#363c3c':'#6b7770',15);line(ctx,knee,end,p.destroyed?'#363c3c':'#5c706c',13);joint(ctx,knee.x,knee.y,11);joint(ctx,start.x,start.y,10);const color=p.destroyed?'#444c4b':C.grips[p.type].color;plate(ctx,end.x-19,end.y-17,38,30,p.hitFlash>0?'#fff':color);for(const s of [-1,1]){const gap=p.grip>0?10:24;line(ctx,{x:end.x+s*15,y:end.y+10},{x:end.x+s*gap,y:end.y+28},'#a4aaa0',6);line(ctx,{x:end.x+s*gap,y:end.y+28},{x:end.x+s*8,y:end.y+36},'#a4aaa0',4);}}
    }
    // Shared core shutter is both the rendered object and the actual hit target.
    plate(ctx,cp.x-29,cp.y-41,58,82,'#1a3036');ctx.save();if(b.coreLeft>0){ctx.shadowColor='#ffd381';ctx.shadowBlur=25+Math.sin(t*12)*9;ctx.fillStyle='#ffe2a0';ctx.fillRect(cp.x-12,cp.y-31,24,62);for(let i=0;i<5;i++){const v=(t*.65+i*.2)%1;ctx.fillStyle=`rgba(202,224,206,${(1-v)*.5})`;ctx.beginPath();ctx.arc(cp.x+Math.sin(i*3)*25,cp.y-35-v*70,4+v*16,0,Math.PI*2);ctx.fill();}}ctx.restore();const spread=b.coreLeft>0?21:0;plate(ctx,cp.x-25-spread,cp.y-34,24,68,'#62736c');plate(ctx,cp.x+1+spread,cp.y-34,24,68,'#62736c');
    for(const p of parts){const q=A.project(p,w,h),color=C.grips[p.type]?.color||'#efd08a';if(!p.victory){ctx.fillStyle='#142629';ctx.fillRect(q.x-34,q.y-40,68,5);ctx.fillStyle=p.destroyed?'#999f99':'#ecbd76';ctx.fillRect(q.x-34,q.y-40,68*clamp(p.destroyed?1-p.repairLeft/p.regen:p.hp/p.maxHp),5);}text(ctx,p.victory?(b.coreLeft>0?'CORE OPEN':'CORE CLOSED'):p.name,q.x,q.y-47,p.victory&&b.coreLeft>0?'#98edbc':color);
      if(p.hitFlash>0){ctx.fillStyle='#ffffffaa';ctx.beginPath();ctx.ellipse(q.x,q.y,29,22,0,0,Math.PI*2);ctx.fill();}
      if(p.destroyed&&p.repairLeft<=C.repairWarning){beam(ctx,cp,q,'#85efcd',3);const v=(t*2)%1;ctx.fillStyle='#e1ffe6';ctx.beginPath();ctx.arc(cp.x+(q.x-cp.x)*v,cp.y+(q.y-cp.y)*v,6,0,Math.PI*2);ctx.fill();text(ctx,'PART REPAIRING',q.x,q.y+48,'#a6efc0');}
      if(p.windup||p.grip>0){const to=A.getCarPosition(p.car);if(!to)continue;const c=color;beam(ctx,q,{x:to.x,y:to.y-65},c,p.grip>0?3:2,!!p.windup);ctx.strokeStyle=c;ctx.lineWidth=3;ctx.strokeRect(to.x-42,to.y-68,84,45);text(ctx,p.grip>0?`${C.grips[p.type].name} · GRIP ${Math.ceil(p.grip)}`:`${this.state.cars[p.car].name} 조준`,to.x,to.y-84,c);}
    }
    for(const e of this.state.enemies.filter(e=>!e.dead&&e.type==='infiltrationTruck')){const q=A.project(e,w,h),to=A.getCarPosition(e.targetCar);if(to){beam(ctx,q,{x:to.x,y:to.y-45},'#ff8f76',2,true);text(ctx,'침투 → '+this.state.cars[e.targetCar].name,q.x,q.y-48,'#ffab87');}}
    if(b.shot?.left>0){const from=A.project(b.shot.from,w,h),to=A.getCarPosition(b.shot.car);if(to){beam(ctx,from,to,'#fff0b2',Math.max(1,b.shot.left*18));ctx.fillStyle='#ffce8a99';ctx.beginPath();ctx.arc(to.x,to.y-20,(1-b.shot.left/.45)*60,0,Math.PI*2);ctx.fill();}}
    const barW=Math.min(w*.65,620),barX=(w-barW)/2,barY=h*.16;ctx.fillStyle='#10282de8';ctx.fillRect(barX,barY,barW,10);ctx.fillStyle='#d9ab70';ctx.fillRect(barX,barY,barW*clamp(b.sharedHp/b.maxSharedHp),10);text(ctx,`${D.BOSSES[b.bossId].name} · PHASE ${b.phase} · ${Math.ceil(b.sharedHp)} / ${b.maxSharedHp}`,w/2,barY-8,'#f1e6ca',14);
    if(b.noticeLeft>0||b.coreLeft>0){const label=b.noticeLeft>0?b.notice:`CORE OPEN · ${Math.ceil(b.coreLeft)}초`;ctx.fillStyle='#11292be0';ctx.fillRect(w*.03,h*.65,w*.94,30);text(ctx,label,w/2,h*.65+20,b.coreLeft>0?'#a9f5c4':'#ffcd91',Math.max(10,Math.min(14,w/70)));}
    ctx.restore();
  };
})();
