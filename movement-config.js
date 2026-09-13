// World units and real seconds. Normalized legacy depth/lane values are adapters,
// never screen pixels: one depth unit always means depthUnits world units.
window.MOVEMENT_CONFIG={width:1920,height:1080,maxDelta:.05,fixedStep:1/120,depthUnits:1080,unitsPerKm:1000,secondsPerMinute:60,relativeWeight:.2,minApproach:.25,maxApproach:2,parallax:{ground:740,mountains:18,hills:58,clouds:9},train:{left:190,right:70,bottom:130,height:185}};
window.worldRect=el=>{const r=el.getBoundingClientRect(),c=document.querySelector('#game-canvas').getBoundingClientRect(),s=c.width/MOVEMENT_CONFIG.width||1;return{left:(r.left-c.left)/s,top:(r.top-c.top)/s,right:(r.right-c.left)/s,bottom:(r.bottom-c.top)/s,width:r.width/s,height:r.height/s};};
window.worldPointer=e=>{const r=document.querySelector('#game-canvas').getBoundingClientRect(),s=r.width/MOVEMENT_CONFIG.width||1;return{x:(e.clientX-r.left)/s,y:(e.clientY-r.top)/s};};
 MOVEMENT_CONFIG.scenerySpeedMultiplier=1.3;
 for(const key of ['ground','mountains','hills'])MOVEMENT_CONFIG.parallax[key]*=MOVEMENT_CONFIG.scenerySpeedMultiplier;
 MOVEMENT_CONFIG.stationMotion={offscreenWidths:1.1,arrivalExponent:3,center:.5};
