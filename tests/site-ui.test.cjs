const {test}=require('node:test');
const assert=require('node:assert/strict');
const fs=require('node:fs');
const vm=require('node:vm');
const {JSDOM}=require('jsdom');
function site(){
 const dom=new JSDOM(fs.readFileSync('index.html','utf8'),{url:'http://localhost/',runScripts:'outside-only'}),w=dom.window,ctx=dom.getInternalVMContext();
 w.matchMedia=()=>({matches:true,addEventListener(){}});w.scrollTo=()=>{};
 w.HTMLDialogElement.prototype.showModal=function(){this.setAttribute('open','');};w.HTMLDialogElement.prototype.close=function(){this.removeAttribute('open');};
 for(const script of w.document.querySelectorAll('script')){
  if(script.src){const file=script.getAttribute('src').split('?')[0];if(/^https?:/.test(file))continue;vm.runInContext(fs.readFileSync(file,'utf8'),ctx,{filename:file});}
  else if(script.textContent.includes('PartyWorkspace.init()'))vm.runInContext('render();',ctx);
  else vm.runInContext(script.textContent,ctx,{filename:'index-inline.js'});
 }
 return {dom,w,ctx,run:s=>vm.runInContext(s,ctx)};
}
test('full site opens the learning hub before any class has been added',()=>{
 const h=site();try{
  h.w.document.querySelector('[data-act="nav"][data-page="learning"]').click();
  assert.equal(h.w.document.querySelector('#pageTitle').textContent,'Learning adventures');
  assert.ok(h.w.document.querySelector('[data-learning="tab"][data-tab="numbers"]'));
 }finally{h.w.close();}
});
test('full site keeps the Original dice visible and consolidates legacy show choices',()=>{
 const h=site();try{
  h.run(`CLASSES={'101':{names:['Test learner']}};store.roster=CLASSES;store.classes={};ui.cur='101';ui.mode='picker';LuckyDice.setPreference('original');render();`);
  assert.equal(h.w.document.querySelectorAll('.dice-effects button').length,4);
  assert.ok(h.w.document.querySelector('.effect-original .dice-face.face-6'));
  h.w.document.querySelector('[data-act="diceeffect"][data-v="machine"]').click();
  assert.ok(h.w.document.querySelector('.machine-chamber'));
  assert.equal(h.run(`LuckyDice.resolveEffect('surprise')`),'show');
 }finally{h.w.close();}
});
test('a restricted co-teacher cannot start an activity or mutate student points without permission',()=>{
 const h=site();try{
  h.run(`CLASSES={'101':{names:['Test learner']}};store.roster=CLASSES;store.classes={};ui.cur='101';ui.mode='students';PW.online=true;PW.school='school';PW.user={id:'teacher'};PW.admin=false;PW.permissionsReady=true;PW.members=[{school_id:'school',user_id:'teacher',status:'approved',permissions:{points:false,activities:false}}];render();`);
  h.w.document.querySelector('[data-act="nav"][data-page="picker"]').click();assert.equal(h.run('ui.mode'),'students');
  h.w.document.querySelector('[data-act="stu"]').click();assert.equal(h.run('C().pts[1]||0'),0);
  assert.match(h.w.document.querySelector('#toast').textContent,/points permission/);
 }finally{h.w.close();}
});
