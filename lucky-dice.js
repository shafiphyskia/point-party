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
 const api={randomIndex,markup};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LuckyDice=api;
})(typeof window==='undefined'?globalThis:window);
