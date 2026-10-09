/* A tiny wizard companion. Decorative only: never intercept classroom actions. */
(()=>{
 'use strict';
 if(document.getElementById('magic-companion'))return;
 const style=document.createElement('style');
 style.textContent=`
 .magic-layer{position:fixed;inset:0;pointer-events:none!important;z-index:2147483000;overflow:hidden;contain:layout style paint}
 .magic-buddy{position:absolute;width:62px;height:70px;left:0;top:0;opacity:0;transition:opacity .15s;filter:drop-shadow(0 3px 2px #30295d22);will-change:transform}
 .magic-buddy.is-visible{opacity:1}
 .magic-buddy svg{width:100%;height:100%;overflow:visible}
 .magic-buddy.is-casting .magic-wand{animation:magic-cast .35s ease-out;transform-origin:41px 45px}
 .magic-mote{position:absolute;left:0;top:0;line-height:1;will-change:transform,opacity;text-shadow:0 1px 1px #30295d35}
 .magic-ring{position:absolute;border:2px solid #ffd166;border-radius:50%;width:28px;height:28px;box-shadow:0 0 10px #ffd16666}
 @keyframes magic-cast{50%{transform:rotate(-25deg)}}
 .v-paused .magic-layer{display:none}
 @media(prefers-reduced-motion:reduce){.magic-layer{display:none}}
 @media print{.magic-layer{display:none}}
 `;
 document.head.appendChild(style);
 const layer=document.createElement('div');layer.className='magic-layer';layer.setAttribute('aria-hidden','true');
 const buddy=document.createElement('div');buddy.id='magic-companion';buddy.className='magic-buddy';
 // The native pointer stays visible and precise; the wizard follows just beside it.
 buddy.innerHTML=`<svg viewBox="0 0 64 74" focusable="false" aria-hidden="true">
 <ellipse cx="29" cy="68" rx="17" ry="3" fill="#30295d" opacity=".12"/>
 <g stroke="#30295d" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
 <path d="m17 47-5 17q16 7 33-1l-7-17" fill="#bba6ff"/>
 <path d="M20 64v4m15-4v4" stroke-width="5"/>
 <path d="m17 47-7 7m27-7 7 2" fill="none" stroke="#70dcc2" stroke-width="6"/>
 <circle cx="28" cy="35" r="16" fill="#fff5db"/>
 <path d="M12 27 23 4q2-4 5 0l13 23" fill="#bba6ff"/>
 <path d="M10 27q19-5 34 0l-1 5H11Z" fill="#70dcc2"/>
 <path d="m25 13 1 3 4 1-3 2 1 4-3-2-3 2 1-4-3-2 4-1Z" fill="#ffd166" stroke="none"/>
 <ellipse cx="22" cy="36" rx="1.2" ry="2" fill="#30295d"/>
 <ellipse cx="34" cy="36" rx="1.2" ry="2" fill="#30295d"/>
 <path d="M24 42q4 4 8 0" fill="none"/>
 <g fill="#ff9baf" stroke="none"><circle cx="17" cy="41" r="3"/><circle cx="39" cy="41" r="3"/></g>
 <path d="m27 52 2 4 4 1-3 3 1 4-4-2-4 2 1-4-3-3 4-1Z" fill="#ffd166" stroke="none"/>
 <g class="magic-wand"><path d="m42 48 10-23" stroke-width="3"/>
 <path d="m53 15 2 5 6 1-5 4 1 6-5-3-5 3 1-6-4-4 6-1Z" fill="#ffd166"/></g>
 </g></svg>`;
 layer.appendChild(buddy);document.body.appendChild(layer);
 const reduced=matchMedia('(prefers-reduced-motion: reduce)');
 const palette=['#ffd166','#70dcc2','#bba6ff','#ff9baf','#85c9ff'];
 let frame=0,visible=false,lastTrail=0,lastBurst=0,castTimer=0;
 let x=0,y=0,targetX=0,targetY=0;
 const particles=new Set();
 const allowed=()=>!reduced.matches&&!document.hidden&&!document.body.classList.contains('v-paused');
 const editable=target=>target instanceof Element&&!!target.closest('input,textarea,select,[contenteditable]:not([contenteditable="false"])');
 function hide(){visible=false;buddy.classList.remove('is-visible');}
 function clear(){
  hide();cancelAnimationFrame(frame);frame=0;clearTimeout(castTimer);
  particles.forEach(p=>{p.animation.cancel();p.node.remove();});particles.clear();
 }
 function particle(px,py,dx,dy,burst=false,ring=false){
  if(particles.size>=64)return;
  const node=document.createElement('span');node.className=ring?'magic-ring':'magic-mote';
  node.textContent=ring?'':(burst?'✦':'✧');
  node.style.color=palette[Math.floor(Math.random()*palette.length)];
  node.style.fontSize=(burst?12+Math.random()*11:9+Math.random()*6)+'px';
  layer.appendChild(node);
  const animation=node.animate([
   {transform:`translate(${px}px,${py}px) translate(-50%,-50%) scale(.5)`,opacity:.95},
   {transform:`translate(${px+dx}px,${py+dy}px) translate(-50%,-50%) rotate(90deg) scale(${ring?3.5:.2})`,opacity:0}
  ],{duration:burst?700:450,easing:'cubic-bezier(.16,.7,.3,1)',fill:'forwards'});
  const entry={node,animation};particles.add(entry);
  animation.onfinish=()=>{node.remove();particles.delete(entry);};
 }
 function tick(now){
  frame=0;if(!allowed()){clear();return;}
  const distance=Math.hypot(targetX-x,targetY-y);
  x+=(targetX-x)*.28;y+=(targetY-y)*.28;
  // Keep the whole companion in the viewport, including near the right edge.
  const bx=Math.max(2,Math.min(innerWidth-66,x+14)),by=Math.max(2,Math.min(innerHeight-76,y+12));
  buddy.style.transform=`translate3d(${bx}px,${by}px,0)`;
  if(visible&&distance>2&&now-lastTrail>55){particle(bx+50,by+21,-8-Math.random()*12,15+Math.random()*14);lastTrail=now;}
  if(visible&&distance>.3)frame=requestAnimationFrame(tick);
 }
 document.addEventListener('pointermove',e=>{
  if(e.pointerType!=='mouse'||!allowed()||editable(e.target)){hide();return;}
  targetX=e.clientX;targetY=e.clientY;
  if(!visible){x=targetX;y=targetY;visible=true;buddy.classList.add('is-visible');}
  if(!frame)frame=requestAnimationFrame(tick);
 },{passive:true});
 document.addEventListener('pointerout',e=>{if(!e.relatedTarget)hide();},{passive:true});
 document.addEventListener('pointerdown',e=>{
  if(e.button!==0||!allowed()||editable(e.target)||e.target.closest('[data-visual="pause"]'))return;
  const now=performance.now();if(now-lastBurst<120)return;lastBurst=now;
  for(let i=0;i<14;i++){
   const angle=i*Math.PI*2/14,radius=35+Math.random()*35;
   particle(e.clientX,e.clientY,Math.cos(angle)*radius,Math.sin(angle)*radius-12,true);
  }
  particle(e.clientX,e.clientY,0,0,true,true);
  if(e.pointerType==='mouse'){
   targetX=e.clientX;targetY=e.clientY;x=targetX;y=targetY;
   visible=true;buddy.classList.add('is-visible');
   if(!frame)frame=requestAnimationFrame(tick);
   buddy.classList.remove('is-casting');void buddy.offsetWidth;buddy.classList.add('is-casting');
   clearTimeout(castTimer);castTimer=setTimeout(()=>buddy.classList.remove('is-casting'),360);
  }
 },{passive:true});
 document.addEventListener('keydown',hide,{passive:true});
 document.addEventListener('visibilitychange',()=>{if(document.hidden)clear();});
 window.addEventListener('blur',clear);
 reduced.addEventListener('change',clear);
 new MutationObserver(()=>{if(document.body.classList.contains('v-paused'))clear();}).observe(document.body,{attributes:true,attributeFilter:['class']});
})();
