const {test}=require('node:test');
const assert=require('node:assert/strict');
const vm=require('node:vm');
const fs=require('node:fs');
function loginHarness(){
 const events=[];
 const context=vm.createContext({window:{},saveLocal:()=>events.push('backup-device'),render:()=>events.push('render'),ui:{mode:'students'}});
 const source=fs.readFileSync('schools.js','utf8');
 vm.runInContext(source.slice(0,source.indexOf('const PW=')),context);
 const workspace=context.window.PartyWorkspace;
 workspace.loadAccess=async()=>events.push('authorize');
 workspace.applyStore=()=>events.push('open-cloud');
 workspace.switchOnline=async(id)=>events.push('school:'+id);
 return {workspace,events,context};
}
test('email-link login verifies the user with the server before opening cloud data',async()=>{
 const {workspace,events}=loginHarness();
 workspace.client={auth:{getUser:async()=>({data:{user:{id:'owner',email:'owner@example.org'}}})}};
 workspace.admin=true;
 await workspace.enterOnline();
 assert.equal(workspace.online,true);
 assert.deepEqual(events,['authorize','backup-device','open-cloud','render']);
 assert.match(workspace.status,/administrator/);
});
test('rejected email-link sessions cannot replace the device workspace',async()=>{
 const {workspace,events}=loginHarness();
 workspace.client={auth:{getUser:async()=>({data:{},error:new Error('Invalid session')})}};
 await assert.rejects(workspace.enterOnline(),/Invalid session/);
 assert.equal(workspace.online,false);assert.deepEqual(events,[]);
});
test('database authorization failure preserves local classroom data',async()=>{
 const {workspace,events}=loginHarness();
 workspace.client={auth:{getUser:async()=>({data:{user:{id:'teacher'}}})}};
 workspace.loadAccess=async()=>{throw new Error('Database unavailable');};
 await assert.rejects(workspace.enterOnline(),/Database unavailable/);
 assert.equal(workspace.online,false);assert.deepEqual(events,[]);
});
test('family-only login opens the private portal without a teacher school',async()=>{
 const {workspace,events,context}=loginHarness();
 workspace.client={auth:{getUser:async()=>({data:{user:{id:'parent'}}})}};
 workspace.familyLinks=[{id:'child-link'}];
 await workspace.enterOnline();
 assert.equal(context.ui.mode,'family');assert.equal(workspace.school,null);
 assert.deepEqual(events,['authorize','backup-device','open-cloud','render']);
});

test('login reopens the remembered approved cloud school',async()=>{
 const {workspace,events,context}=loginHarness();
 context.window.sessionStorage={getItem:()=> 'school-two'};
 workspace.schools=[{id:'school-one'},{id:'school-two'}];
 workspace.client={auth:{getUser:async()=>({data:{user:{id:'owner'}}})}};
 await workspace.enterOnline();
 assert.equal(events.at(-1),'school:school-two');
});

test('device migration saves the roster online and rejects occupied schools',async()=>{
 const {workspace,events,context}=loginHarness();
 const payload={roster:{601:['Student']},classes:{601:{points:{1:3}}}};
 Object.assign(context,{localSchoolIndex:{schools:[{id:'default',name:'School'}]},localStorage:{getItem:()=>JSON.stringify(payload)},cleanRoster:r=>r,PartyCore:{sanitizeClass:c=>c},PortalCore:{clean:p=>p||{}}});
 workspace.online=true;workspace.admin=true;workspace.schools=[{id:'school',name:'School'}];
 let occupied=false,saved;
 workspace.client={from:()=>({select:()=>({eq:()=>({single:async()=>({data:{revision:2,data:occupied?payload:{}}})})})})};
 workspace.rpc=async(name,args)=>{saved={name,args};return 3;};
 await workspace.importDeviceSchool('default');
 assert.equal(saved.name,'pp_save_school');assert.equal(saved.args.p_revision,2);
 assert.equal(saved.args.p_data.classes[601].points[1],3);
 assert.equal(events.at(-1),'school:school');
 occupied=true;saved=null;
 await assert.rejects(workspace.importDeviceSchool('default'),/already has classes/);
 assert.equal(saved,null);
});

test('device migration rejects teachers before reading device data',async()=>{
 const {workspace}=loginHarness();workspace.online=true;workspace.admin=false;
 await assert.rejects(workspace.importDeviceSchool('default'),/ADMIN_REQUIRED/);
});
