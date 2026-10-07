(function(root){
 'use strict';
 const SKILLS=[
  {id:'kindness',icon:'💖',name:'Kindness',hint:'Help someone feel welcome',points:2,color:'pink'},
  {id:'teamwork',icon:'🤝',name:'Teamwork',hint:'Share, listen, and work together',points:2,color:'sea'},
  {id:'perseverance',icon:'🌱',name:'Keep trying',hint:'Try again when it gets tricky',points:3,color:'leaf'},
  {id:'speaking',icon:'🎤',name:'English speaking',hint:'Be brave and use your English',points:2,color:'plum'},
  {id:'reading',icon:'📚',name:'Reading explorer',hint:'Read and share a discovery',points:2,color:'sea'},
  {id:'listening',icon:'👂',name:'Great listening',hint:'Listen with care and attention',points:1,color:'sun'},
  {id:'creative',icon:'🎨',name:'Creative thinking',hint:'Try an original idea',points:3,color:'pink'},
  {id:'curiosity',icon:'🔎',name:'Curiosity',hint:'Ask a thoughtful question',points:2,color:'leaf'},
  {id:'homework',icon:'✏️',name:'Ready to learn',hint:'Bring your work and materials',points:1,color:'sun'},
  {id:'focus',icon:'🎯',name:'Focus power',hint:'Stay with a learning task',points:1,color:'red'},
  {id:'leadership',icon:'🦸',name:'Helpful leader',hint:'Encourage and support others',points:3,color:'plum'},
  {id:'respect',icon:'🌈',name:'Respect',hint:'Care for people and our classroom',points:2,color:'sea'},
  {id:'growth',icon:'🚀',name:'Personal best',hint:'Show progress from your own starting point',points:3,color:'red'},
  {id:'tidy',icon:'🧹',name:'Classroom care',hint:'Leave our space ready for everyone',points:1,color:'leaf'}
 ];
 function awardSkill(c,seat,id,date){
  const skill=SKILLS.find(s=>s.id===id);
  if(!skill)throw new Error('Unknown skill');
  if(c.absent[seat])return 0;
  c.pts[seat]=(c.pts[seat]||0)+skill.points;
  (c.log[seat]=c.log[seat]||[]).unshift({d:date,g:skill.icon+' '+skill.name,s:'',r:null,p:skill.points});
  c.log[seat].length=Math.min(c.log[seat].length,30);
  return skill.points;
 }
 function sanitizeClass(input){
  const v=input&&typeof input==='object'?input:{};
  const number=(x,d=0)=>Number.isFinite(Number(x))?Math.max(0,Math.min(10000000,Math.round(Number(x)))):d;
  const text=(x,n=120)=>String(x??'').slice(0,n);
  const seats=a=>Array.isArray(a)?a.filter(x=>Number.isInteger(x)&&x>=1&&x<=60).slice(0,60):[];
  const map=(obj,clean)=>Object.fromEntries(Object.entries(obj&&typeof obj==='object'?obj:{}).filter(([s])=>/^([1-9]|[1-5][0-9]|60)$/.test(s)).map(([s,x])=>[s,clean(x)]));
  const teamCount=[2,3,4,5,6].includes(v.teamCount)?v.teamCount:4;
  return {
   pts:map(v.pts,x=>number(x)),absent:map(v.absent,x=>x===true),teamCount,
   teams:Array.isArray(v.teams)&&v.teams.length===teamCount?v.teams.map(seats):null,
   tscore:Array.from({length:teamCount},(_,i)=>number(v.tscore?.[i])),
   picked:seats(v.picked),last:Number.isInteger(v.last)&&v.last>=1&&v.last<=60?v.last:null,
   active:Math.min(teamCount-1,number(v.active)),goal:Math.max(1,number(v.goal,300)),reward:text(v.reward||'Game day!'),
   weekBase:map(v.weekBase,x=>number(x)),weekStart:v.weekStart?text(v.weekStart,40):null,
   log:map(v.log,a=>Array.isArray(a)?a.filter(x=>x&&typeof x==='object').slice(0,30).map(x=>({d:text(x.d,40),g:text(x.g),s:text(x.s),r:x.r?number(x.r):null,p:number(x.p)})):[]),
   imports:Array.isArray(v.imports)?v.imports.filter(x=>x&&typeof x==='object').slice(0,20).map(x=>({d:text(x.d,40),g:text(x.g),n:number(x.n),p:number(x.p)})):[],
   boxes:Array.isArray(v.boxes)&&v.boxes.length<=30?v.boxes.filter(x=>x&&typeof x==='object').map(x=>({k:['add','lose','double','steal','all'].includes(x.k)?x.k:'all',v:number(x.v),open:x.open===true,by:Math.min(teamCount-1,number(x.by))})):null,
   msg:text(v.msg,300)
  };
 }
 const api={SKILLS,awardSkill,sanitizeClass};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;
 else root.PartyCore=api;
})(typeof window==='undefined'?globalThis:window);
