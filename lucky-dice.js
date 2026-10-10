(function(root){
 'use strict';
 function randomIndex(size,fill=a=>root.crypto.getRandomValues(a)){
  if(!Number.isInteger(size)||size<1||size>4294967296)throw new RangeError('A nonempty pool is required');
  const limit=Math.floor(4294967296/size)*size,word=new Uint32Array(1);
  do{fill(word);}while(word[0]>=limit);
  return word[0]%size;
 }
 const patterns=[[5],[1,9],[1,5,9],[1,3,7,9],[1,3,5,7,9],[1,3,4,6,7,9]];
 const EFFECTS=[
  {id:'original',label:'Original',icon:'\u{1f3b2}',hint:'Classic 3D die with clatter and sparkle'},
  {id:'show',label:'Dice show',icon:'\u{1f31f}',hint:'Animated buddy and full-screen celebration'},
  {id:'machine',label:'Dice machine',icon:'\u{1f579}',hint:'Shake the chamber and reveal a lucky seat'},
  {id:'magic',label:'Magic wand',icon:'\u{1fa84}',hint:'A wand tap and a magical roll'}
 ];
 function resolveEffect(value){
  if(['buddy','cinema','surprise'].includes(value))return 'show';
  return EFFECTS.some(e=>e.id===value)?value:'show';
 }
 function preference(){try{return resolveEffect(root.localStorage.getItem('pointparty-dice-effect'));}catch{return 'show';}}
 function setPreference(value){try{root.localStorage.setItem('pointparty-dice-effect',resolveEffect(value));}catch{}}
 function buddy(){
  return `<div class="dice-buddy" aria-hidden="true"><div class="baby-talk">Let's roll!</div><svg viewBox="0 0 200 260"><ellipse cx="100" cy="245" rx="65" ry="10" fill="#0002"/><g class="buddy-arm"><path d="M145 158Q192 112 184 69" fill="none" stroke="#48bca5" stroke-width="23" stroke-linecap="round"/><circle cx="184" cy="65" r="15" fill="#ffd166"/></g><path d="M55 158Q16 150 23 120" fill="none" stroke="#48bca5" stroke-width="23" stroke-linecap="round"/><path d="M74 215v22m52-22v22" stroke="#24425c" stroke-width="23" stroke-linecap="round"/><rect x="56" y="140" width="88" height="83" rx="35" fill="#70dcc2" stroke="#24425c" stroke-width="4"/><rect x="29" y="35" width="142" height="120" rx="45" fill="#70dcc2" stroke="#24425c" stroke-width="4"/><rect x="42" y="58" width="116" height="72" rx="30" fill="#fff5db"/><ellipse cx="72" cy="89" rx="7" ry="11" fill="#24425c"/><ellipse cx="128" cy="89" rx="7" ry="11" fill="#24425c"/><path d="M88 108q12 13 24 0" fill="none" stroke="#24425c" stroke-width="4" stroke-linecap="round"/><circle cx="59" cy="110" r="7" fill="#ff9baf"/><circle cx="141" cy="110" r="7" fill="#ff9baf"/><path d="M100 35V15" stroke="#24425c" stroke-width="4"/><circle cx="100" cy="12" r="9" fill="#ffd166"/><path d="m100 165 7 13 14 2-10 10 2 14-13-7-13 7 2-14-10-10 14-2Z" fill="#ffd166"/></svg></div>`;
 }
 function markup(mode='show'){
  const character=mode==='magic'?'<div class="dice-magician"><div class="baby-talk">A touch of magic!</div><img src="dice-magician.png" alt="" width="1152" height="1408" draggable="false"><span class="wand-contact"></span></div>':mode==='original'?'<div class="original-caption"><span class="baby-talk">Ready to roll!</span></div>':mode==='machine'?'<div class="machine-side"><div class="baby-talk">Powering up!</div><span class="machine-lever">&#x1F579;</span></div>':buddy();
  return `<div class="dice-play-table mode-${mode}" aria-hidden="true">${character}<div class="lucky-dice-scene ${mode==='machine'?'machine-chamber':''}"><span class="dice-star star-one">✦</span><span class="dice-star star-two">✧</span><div class="dice-shadow"></div><div class="dice-hop"><div class="lucky-cube">${patterns.map((p,i)=>`<div class="dice-face face-${i+1}"><div class="dice-pips">${Array.from({length:9},(_,j)=>`<i class="${p.includes(j+1)?'pip':''}"></i>`).join('')}</div>${i===0?'<div class="dice-smile"><span></span><span></span><i></i></div><div class="dice-result"><b id="dice-number"></b><span id="dice-student"></span></div>':''}</div>`).join('')}</div><span class="dice-hand hand-left">✦</span><span class="dice-hand hand-right">✦</span></div></div></div>`;
 }
 function cinema(quiet,onAgain,mode='show'){
  const magic=mode==='magic',casting=magic&&!quiet;
  const dialog=document.createElement('dialog');dialog.className='dice-cinema '+(casting?'is-casting':'is-rolling')+(magic?' cinema-magic':mode==='machine'?' cinema-machine':'')+(quiet?' cinema-quiet':'');
  dialog.setAttribute('aria-label','Lucky dice show');
  dialog.innerHTML=`<button class="cinema-close" aria-label="Close dice show">✕</button><div class="cinema-aura" aria-hidden="true"></div><div class="cinema-floor" aria-hidden="true"></div><div class="cinema-sparks" aria-hidden="true">${Array.from({length:36},(_,i)=>`<i style="--x:${(i*37)%100}%;--delay:${(i%9)*.17}s;--turn:${i*43}deg"></i>`).join('')}</div><header class="cinema-heading"><p>${magic?'THE MAGIC DICE':mode==='machine'?'THE DICE MACHINE':'LUCKY DICE SHOW'}</p><h2 class="cinema-title" role="status" aria-live="polite">${casting?'Watch the wand…':"Let's roll!"}</h2><span class="cinema-subtitle">${casting?'One little tap. A whole lot of magic.':'A little bounce. A little luck.'}</span></header><div class="cinema-camera">${markup(mode).replace('id="dice-number"','id="cinema-number"').replace('id="dice-student"','id="cinema-student"')}</div><footer class="cinema-controls"><button class="cinema-again" hidden>Roll again 🎲</button><button class="cinema-back" hidden>Back to class</button><p class="cinema-wait">${casting?'The magician is waking the dice…':'Shaking up the luck…'}</p></footer>`;
  dialog.querySelector('.baby-talk').textContent=magic?'Abracadabra!':mode==='machine'?'Shake the chamber!':'Shake, shake!';
  let castTimer;
  const previousOverflow=document.body.style.overflow;
  const close=()=>{clearTimeout(castTimer);if(!dialog.isConnected)return;document.body.style.overflow=previousOverflow;dialog.close();dialog.remove();};
  dialog.querySelector('.cinema-close').addEventListener('click',close);
  dialog.querySelector('.cinema-back').addEventListener('click',close);
  dialog.querySelector('.cinema-again').addEventListener('click',()=>{close();onAgain();});
  dialog.addEventListener('cancel',e=>{e.preventDefault();close();});
  if(!quiet)dialog.addEventListener('pointermove',e=>{
   dialog.style.setProperty('--camera-x',((e.clientX/innerWidth-.5)*5)+'deg');
   dialog.style.setProperty('--camera-y',((e.clientY/innerHeight-.5)*-4)+'deg');
  },{passive:true});
  document.body.appendChild(dialog);document.body.style.overflow='hidden';dialog.showModal();
  if(casting)castTimer=setTimeout(()=>{
   if(!dialog.isConnected)return;dialog.classList.remove('is-casting');dialog.classList.add('is-rolling');
   dialog.querySelector('.cinema-title').textContent='Magic in motion!';dialog.querySelector('.cinema-wait').textContent='Rolling toward our lucky student…';
  },1250);
  return {close,finish(student){
   if(!dialog.isConnected)return;
   clearTimeout(castTimer);dialog.classList.remove('is-rolling','is-casting');dialog.classList.add('has-winner');
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
 function sound(mode,tone){
  const notes=mode==='machine'?[130,175,220,260]:mode==='magic'?[523,784,1047,1568]:mode==='original'?[240,320,280,400]:[392,523,659,784];
  notes.forEach((f,i)=>tone(f,.10,mode==='machine'?'sawtooth':'triangle',i*.11,.06));
 }
 const api={sound,randomIndex,markup,cinema,EFFECTS,resolveEffect,preference,setPreference};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LuckyDice=api;
})(typeof window==='undefined'?globalThis:window);
