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
  return `<div class="dice-baby"><div class="baby-talk">Let's roll!</div><svg viewBox="0 0 160 240" focusable="false" aria-hidden="true">
  <ellipse cx="80" cy="228" rx="53" ry="8" fill="#30295d" opacity=".12"/>
  <g class="baby-body" stroke="#30295d" stroke-width="3" stroke-linejoin="round" stroke-linecap="round">
   <path d="M54 183 51 215 73 216 80 192 88 216 110 215 105 183" fill="#303748"/><path d="M50 213q-17 13 23 11v-10m15 0v10q38 3 24-11" fill="#202635"/>
   <path d="M50 140q30-17 60 0l9 51q-40 14-78 0Z" fill="#303748"/>
   <path d="m62 135 18 15 18-15-18 48Z" fill="#fffdf5"/><path d="m76 151 8 0 4 22-8 10-8-10Z" fill="#202635"/>
   <path d="m61 136-8 20 17 9-4 7 14 15m20-51 8 20-17 9 4 7-15 15" fill="none" stroke="#758095"/>
   <g class="baby-arm baby-arm-left"><path d="m53 144-16 25-17-12" fill="none" stroke="#303748" stroke-width="19"/><path d="m21 159-8-6q-9-13 0-17l8 4 8-4q8 9-8 23" fill="#f7c9a7"/></g>
   <g class="baby-arm baby-arm-right"><path d="m108 144 17 24 17-18" fill="none" stroke="#303748" stroke-width="19"/><path d="m136 153-5-12q-4-15 5-16l6 9 8-1q12 9-14 20" fill="#f7c9a7"/></g>
   <g class="baby-head"><ellipse cx="29" cy="89" rx="10" ry="15" fill="#f7c9a7"/><ellipse cx="130" cy="89" rx="10" ry="15" fill="#f7c9a7"/>
   <path d="M28 77C22 8 137 9 131 77l-2 25c-5 43-94 47-101 0Z" fill="#ffdab9"/>
   <path d="M39 48q13-31 57-23m-27 5q18-26 40 5" fill="none" stroke="#e9b84f" stroke-width="7"/>
   <path d="m44 68 19-4m33 0 18 5" fill="none" stroke-width="5"/>
   <ellipse cx="54" cy="81" rx="9" ry="11" fill="#fff"/><ellipse cx="105" cy="81" rx="9" ry="11" fill="#fff"/>
   <ellipse cx="57" cy="82" rx="4" ry="6" fill="#50779b" stroke="none"/><ellipse cx="102" cy="82" rx="4" ry="6" fill="#50779b" stroke="none"/>
   <circle cx="58" cy="81" r="2" fill="#202635" stroke="none"/><circle cx="101" cy="81" r="2" fill="#202635" stroke="none"/>
   <path d="m78 88-4 10 9 1" fill="none" stroke="#d79573"/>
   <ellipse cx="44" cy="99" rx="11" ry="5" fill="#f4a391" stroke="none" opacity=".7"/><ellipse cx="113" cy="99" rx="11" ry="5" fill="#f4a391" stroke="none" opacity=".7"/>
   <path d="M64 111q18 14 37-4" fill="none"/><path d="m98 105 5 4" fill="none"/>
   </g>
  </g></svg></div>`;
 }
 function markup(){
  return `<div class="dice-play-table" aria-hidden="true">${baby()}<div class="lucky-dice-scene"><span class="dice-star star-one">✦</span><span class="dice-star star-two">✧</span><div class="dice-shadow"></div><div class="dice-hop"><div class="lucky-cube">${patterns.map((p,i)=>`<div class="dice-face face-${i+1}"><div class="dice-pips">${Array.from({length:9},(_,j)=>`<i class="${p.includes(j+1)?'pip':''}"></i>`).join('')}</div>${i===0?'<div class="dice-smile"><span></span><span></span><i></i></div><div class="dice-result"><b id="dice-number"></b><span id="dice-student"></span></div>':''}</div>`).join('')}</div><span class="dice-hand hand-left">✦</span><span class="dice-hand hand-right">✦</span></div></div></div>`;
 }
 const api={randomIndex,markup};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LuckyDice=api;
})(typeof window==='undefined'?globalThis:window);
