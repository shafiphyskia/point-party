/* Compact navigation and safe refresh of device schools shared by browser tabs. */
(()=>{
 const seen=new Map();
 const raw=()=>localStorage.getItem(KEY);
 const remember=()=>seen.set(KEY,raw());
 remember();
 function changed(){return !PartyWorkspace.online&&seen.has(KEY)&&raw()!==seen.get(KEY);}
 function refresh(){
  if(!changed())return false;
  if(editCls){toast('Another tab changed this school. Copy your draft, then cancel and reopen it.');return true;}
  let next;try{next=JSON.parse(raw()||'{}');}catch{return true;}
  if(!next||typeof next!=='object'||Array.isArray(next))return true;
  const current={cur:ui.cur,mode:ui.mode,sound:ui.sound};
  PartyWorkspace.applyStore(next);Object.assign(ui,current);
  if(!CLASSES[ui.cur])ui.cur=Object.keys(CLASSES)[0]||null;
  remember();render();return true;
 }
 const save=saveLocal;
 saveLocal=function(){
  if(PartyWorkspace.online)return save();
  if(changed()){toast('This school changed in another tab. Reopen the page before saving.');if(!editCls)refresh();return;}
  save();remember();
 };
 const switchSchool=PartyWorkspace.switchLocal;
 PartyWorkspace.switchLocal=function(id){const result=switchSchool.call(this,id);remember();return result;};
 window.addEventListener('storage',e=>{if(e.key===KEY&&!PartyWorkspace.online)refresh();});
 window.addEventListener('focus',refresh);
 document.addEventListener('visibilitychange',()=>{if(!document.hidden)refresh();});
 // Check before document handlers can change the stale in-memory classroom.
 for(const event of ['click','change'])window.addEventListener(event,e=>{
  if(!changed())return;
  if(e.target.closest('[data-act="cancelcls"]')){queueMicrotask(refresh);return;}
  if(e.target.closest('[data-act="backup"]'))return;
  if(e.target.closest('[data-act],[data-layout],[data-party],select,input[type="file"]')){
   refresh();e.preventDefault();e.stopImmediatePropagation();
   if(!editCls)toast('Class list refreshed from another tab. Please try your action again.');
  }
 },true);
 document.addEventListener('click',e=>{
  if(!e.target.closest('[data-layout="add"]'))return;
  if(PartyWorkspace.online&& !['points','activities','roster','materials'].every(k=>PartyWorkspace.can(k))){toast('Ask your administrator for class editing permission.');return;}
  ui.mode='setup';editCls='new';render();document.querySelector('#cid')?.focus();
 });
})();
