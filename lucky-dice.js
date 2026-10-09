(function(root){
 'use strict';
 function randomIndex(size,fill=a=>root.crypto.getRandomValues(a)){
  if(!Number.isInteger(size)||size<1||size>4294967296)throw new RangeError('A nonempty pool is required');
  const limit=Math.floor(4294967296/size)*size,word=new Uint32Array(1);
  do{fill(word);}while(word[0]>=limit);
  return word[0]%size;
 }
 const patterns=[[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
 function baby(){
  return `<div class="dice-baby dice-baby-real"><div class="baby-talk">Let's roll!</div><div class="baby-photo-frame"><img src="baby-dice.png" alt="" width="774" height="1000" draggable="false"></div></div>`;
 }
 function markup(){
  return `<div class="dice-play-table" aria-hidden="true">${baby()}<div class="lucky-dice-scene"><span class="dice-star star-one">✦</span><span class="dice-star star-two">✧</span><div class="dice-shadow"></div><div class="dice-hop"><div class="lucky-cube">${patterns.map((p,i)=>`<div class="dice-face face-${i+1}"><div class="dice-pips">${Array.from({length:9},(_,j)=>`<i class="${p.includes(j+1)?'pip':''}"></i>`).join('')}</div>${i===0?'<div class="dice-smile"><span></span><span></span><i></i></div><div class="dice-result"><b id="dice-number"></b><span id="dice-student"></span></div>':''}</div>`).join('')}</div><span class="dice-hand hand-left">✦</span><span class="dice-hand hand-right">✦</span></div></div></div>`;
 }
 function cinema(quiet,onAgain){
  const dialog=document.createElement('dialog');dialog.className='dice-cinema is-rolling'+(quiet?' cinema-quiet':'');
  dialog.setAttribute('aria-label','Lucky dice show');
  dialog.innerHTML=`<button class="cinema-close" aria-label="Close dice show">✕</button><div class="cinema-aura" aria-hidden="true"></div><div class="cinema-floor" aria-hidden="true"></div><div class="cinema-sparks" aria-hidden="true">${Array.from({length:36},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%9)*.17}s;--turn:${i*43}deg"></i>`).join('')}</div><header class="cinema-heading"><p>LUCKY DICE SHOW</p><h2 class="cinema-title" role="status" aria-live="polite">Let's roll!</h2><span class="cinema-subtitle">A little bounce. A little luck.</span></header><div class="cinema-camera">${markup().replace('id="dice-number"','id="cinema-number"').replace('id="dice-student"','id="cinema-student"')}</div><footer class="cinema-controls"><button class="cinema-again" hidden>Roll again 🎲</button><button class="cinema-back" hidden>Back to class</button><p class="cinema-wait">Shaking up the luck…</p></footer>`;
  dialog.querySelector('.baby-talk').textContent='Shake, shake!';
  const previousOverflow=document.body.style.overflow;
  const close=()=>{if(!dialog.isConnected)return;document.body.style.overflow=previousOverflow;dialog.close();dialog.remove();};
  dialog.querySelector('.cinema-close').addEventListener('click',close);
  dialog.querySelector('.cinema-back').addEventListener('click',close);
  dialog.querySelector('.cinema-again').addEventListener('click',()=>{close();onAgain();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  if(!quiet)dialog.addEventListener('pointermove',e=>{
   dialog.style.setProperty('--camera-x',((e.clientX/innerWidth-.5)*5)+'deg');
   dialog.style.setProperty('--camera-y',((e.clientY/innerHeight-.5)*-4)+'deg');
  },{passive:true});
  document.body.appendChild(dialog);document.body.style.overflow='hidden';dialog.showModal();
  return {close,finish(student){
   if(!dialog.isConnected)return;
   dialog.classList.remove('is-rolling');dialog.classList.add('has-winner');
   dialog.querySelector('#cinema-number').textContent=student.seat;
   dialog.querySelector('#cinema-student').textContent=student.name;
   dialog.querySelector('.cinema-title').textContent=student.name;
   dialog.querySelector('.cinema-subtitle').textContent='Lucky student · Seat '+student.seat;
   dialog.querySelector('.baby-talk').textContent='Your turn!';
   dialog.querySelector('.cinema-wait').hidden=true;
   dialog.querySelectorAll('.cinema-controls button').forEach(b=>b.hidden=false);
   dialog.querySelector('.cinema-again').focus();
  }};
 }
 const api={randomIndex,markup,cinema};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LuckyDice=api;
})(typeof window==='undefined'?globalThis:window);
