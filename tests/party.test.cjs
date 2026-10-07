const {test}=require('node:test');
const assert=require('node:assert/strict');
const {awardSkill,SKILLS,sanitizeClass}=require('../party-core.js');
test('a skill award changes points and preserves the reason in records',()=>{
 const c={pts:{1:2},absent:{},log:{}};
 assert.equal(awardSkill(c,1,'teamwork','Oct 8'),2);
 assert.equal(c.pts[1],4);
 assert.equal(c.log[1][0].g,'🤝 Teamwork');
 assert.equal(c.log[1][0].p,2);
});
test('absent students earn no skill points',()=>{
 const c={pts:{1:3},absent:{1:true},log:{}};
 assert.equal(awardSkill(c,1,'reading','Oct 8'),0);
 assert.equal(c.pts[1],3);
 assert.deepEqual(c.log,{});
});
test('unknown skills cannot change points',()=>{
 const c={pts:{},absent:{},log:{}};
 assert.throws(()=>awardSkill(c,1,'made-up','Oct 8'));
 assert.deepEqual(c.pts,{});
});
test('every skill has a unique id and a bounded positive award',()=>{
 assert.equal(new Set(SKILLS.map(s=>s.id)).size,SKILLS.length);
 assert.ok(SKILLS.length>=12);
 assert.ok(SKILLS.every(s=>Number.isInteger(s.points)&&s.points>0&&s.points<=3));
});
test('shared school data cannot inject markup through point values or team seats',()=>{
 const c=sanitizeClass({pts:{1:'<img src=x onerror=alert(1)>'},teamCount:999,teams:[['<script>']],log:{1:[{g:'Kindness',p:'<svg/onload=alert(1)>'}]},goal:'oops'});
 assert.equal(c.pts[1],0);assert.equal(c.teamCount,4);assert.equal(c.teams,null);
 assert.equal(c.log[1][0].p,0);assert.equal(c.goal,300);
});
test('normalizing shared school data preserves ordinary progress',()=>{
 const c=sanitizeClass({pts:{1:42},teamCount:2,teams:[[1],[2]],tscore:[5,6],absent:{2:true},log:{1:[{d:'Oct 8',g:'Teamwork',p:2}]},reward:'Game day!'});
 assert.equal(c.pts[1],42);assert.deepEqual(c.teams,[[1],[2]]);assert.deepEqual(c.tscore,[5,6]);assert.equal(c.absent[2],true);
});
