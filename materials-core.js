(function(root){
 'use strict';
 const text=(v,n=120)=>String(v??'').slice(0,n);
 const list=(v,n=200)=>Array.isArray(v)?v.filter(x=>x&&typeof x==='object').slice(0,n):[];
 const number=(v,min,max,fallback)=>Number.isFinite(Number(v))?Math.max(min,Math.min(max,Number(v))):fallback;
 function safeUrl(v){try{const u=new URL(v);return u.protocol==='https:'&&!u.username&&!u.password?u.href:'';}catch{return '';}}
 function clean(input){
  const v=input&&typeof input==='object'?input:{};
  const resources=list(v.resources,400).map(r=>({id:text(r.id,80),classId:text(r.classId,40),title:text(r.title),kind:['slides','video','game','board','worksheet','audio','file','link'].includes(r.kind)?r.kind:'link',url:safeUrl(r.url),path:/^[a-f0-9-]{36}\/[a-f0-9-]{36}\/[A-Za-z0-9._-]+$/.test(r.path||'')?r.path:'',filename:text(r.filename,180),size:number(r.size,0,26214400,0),notes:text(r.notes,1500),author:text(r.author,120),archived:r.archived===true})).filter(r=>r.id&&r.title&&(r.url||r.path));
  const plans=list(v.plans,200).map(p=>({id:text(p.id,80),classId:text(p.classId,40),title:text(p.title),date:/^\d{4}-\d{2}-\d{2}$/.test(p.date||'')?p.date:'',objective:text(p.objective,2000),notes:text(p.notes,4000),duration:number(p.duration,5,180,40),resources:Array.isArray(p.resources)?p.resources.filter(id=>resources.some(r=>r.id===id)).slice(0,50):[],steps:list(p.steps,20).map(s=>({title:text(s.title,150),minutes:number(s.minutes,1,180,5),notes:text(s.notes,1000)})),author:text(p.author,120),archived:p.archived===true})).filter(p=>p.id&&p.title&&p.classId);
  const suggestions=list(v.suggestions,500).map(s=>({id:text(s.id,80),planId:text(s.planId,80),body:text(s.body,2000),author:text(s.author,120),date:text(s.date,40),resolved:s.resolved===true})).filter(s=>s.id&&s.body&&plans.some(p=>p.id===s.planId));
  const results=list(v.results,1000).map(r=>({key:text(r.key,180),run:text(r.run,80),classId:text(r.classId,40),seat:number(r.seat,1,60,1),correct:r.correct===true,points:number(r.points,0,10,0),date:text(r.date,40),title:text(r.title)})).filter(r=>r.key);
  return {plans,resources,suggestions,results};
 }
 function videoEmbed(value){
  const url=safeUrl(value);if(!url)return '';const u=new URL(url);let id='';
  if(['youtube.com','www.youtube.com','m.youtube.com'].includes(u.hostname))id=u.pathname==='/watch'?u.searchParams.get('v'):u.pathname.match(/^\/(?:shorts|embed)\/([^/]+)/)?.[1];
  if(u.hostname==='youtu.be')id=u.pathname.slice(1);
  if(id&&/^[\w-]{11}$/.test(id)){const raw=u.searchParams.get('t')||u.searchParams.get('start')||'',parts=raw.match(/^(?:(\d+)h)?(?:(\d+)m)?(?:(\d+)s)?$/);const start=/^\d+$/.test(raw)?Number(raw):parts?Number(parts[1]||0)*3600+Number(parts[2]||0)*60+Number(parts[3]||0):0;return 'https://www.youtube-nocookie.com/embed/'+id+(start?'?start='+Math.min(start,86400):'');}
  if(['vimeo.com','www.vimeo.com'].includes(u.hostname)&&/^\/\d+$/.test(u.pathname))return 'https://player.vimeo.com/video'+u.pathname;
  return '';
 }
 function fileError(file){
  if(!file||!file.size)return 'Choose a file that is not empty.';
  if(file.size>25*1024*1024)return 'Files must be 25 MB or smaller. Link larger videos instead.';
  if(!/\.(pptx?|pdf|docx|png|jpe?g|webp|mp3|mp4|txt|csv)$/i.test(file.name))return 'Choose a supported PPT, PDF, document, image, audio, video or text file.';
  return '';
 }
 function parseSteps(value){
  return String(value).split(/\r?\n/).filter(s=>s.trim()).slice(0,20).map((line,i)=>{const [minutes,title,...notes]=line.split('|').map(x=>x.trim());if(!title||!(Number(minutes)>=1&&Number(minutes)<=180))throw new Error('Step '+(i+1)+': use minutes | activity | instructions.');return {minutes:Number(minutes),title:title.slice(0,150),notes:notes.join(' | ').slice(0,1000)};});
 }
 function awardQuiz(c,results,entry){
  const {run,question,seat,choice,quiz}=entry;
  if(!run||!Number.isInteger(question)||!Number.isInteger(seat)||seat<1||seat>60||!quiz||!Number.isInteger(choice)||choice<0||choice>=quiz.choices.length)throw new Error('Invalid quiz attempt.');
  const key=run+':'+question+':'+seat;
  if(results.some(r=>r.key===key))return {duplicate:true,points:0};
  if(c.absent[seat])return {absent:true,points:0};
  const correct=choice===quiz.answer,points=correct?Math.round(number(entry.points,0,10,2)):0;
  results.push({key,run,classId:entry.classId||'',seat,correct,points,date:entry.date||'',title:entry.title||'Screen quiz'});
  if(results.length>1000)results.shift();
  if(points){c.pts[seat]=(c.pts[seat]||0)+points;(c.log[seat]??=[]).unshift({d:entry.date||'',g:'Screen quiz · '+(entry.title||'Quiz'),s:'Correct answer',r:null,p:points});c.log[seat].length=Math.min(c.log[seat].length,30);}
  return {correct,points};
 }
 function reportKey(classId,game,date,items){
  return JSON.stringify([classId,String(game).trim(),date,items.map(i=>[String(i.nick).trim(),String(i.scoreText||'').trim(),i.seat,Math.round(Number(i.pts)||0)]).sort((a,b)=>JSON.stringify(a).localeCompare(JSON.stringify(b)))]);
 }
 const api={clean,safeUrl,videoEmbed,fileError,parseSteps,awardQuiz,reportKey};
 if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.MaterialCore=api;
})(typeof window==='undefined'?globalThis:window);
