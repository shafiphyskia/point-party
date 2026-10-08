const {test}=require('node:test');
const assert=require('node:assert/strict');
const M=require('../materials-core.js');

test('materials retain plans and teacher suggestions while rejecting unsafe links',()=>{
 const data=M.clean({plans:[{id:'p',classId:'601',title:'Animals',objective:'Name animals',steps:[{minutes:5,title:'Warm up',notes:'Ask students'}],resources:['r']}],resources:[{id:'r',title:'Game',url:'https://wordwall.net/resource/123',kind:'game'},{id:'bad',title:'Unsafe',url:'javascript:alert(1)'}],suggestions:[{id:'s',planId:'p',body:'Use pair work',author:'Teacher',resolved:false}]});
 assert.equal(data.plans[0].steps[0].minutes,5);assert.equal(data.resources.length,1);assert.equal(data.suggestions[0].body,'Use pair work');
 assert.equal(M.clean(data).plans[0].resources[0],'r');
});
test('video embeds accept only documented video providers and discard credential URLs',()=>{
 assert.equal(M.videoEmbed('https://youtu.be/abcdefghijk'),'https://www.youtube-nocookie.com/embed/abcdefghijk');
 assert.equal(M.videoEmbed('https://www.youtube.com/watch?v=abcdefghijk&t=70s'),'https://www.youtube-nocookie.com/embed/abcdefghijk?start=70');
 assert.equal(M.videoEmbed('https://youtube.com.evil.test/watch?v=abcdefghijk'),'');
 assert.equal(M.safeUrl('https://user:secret@example.com'),'');
});
test('upload validation rejects executable content and oversized files',()=>{
 assert.equal(M.fileError({name:'Lesson.pptx',size:2000}),'');
 assert.match(M.fileError({name:'page.html',size:100}),/supported/);
 assert.match(M.fileError({name:'Lesson.pptx',size:30*1024*1024}),/25 MB/);
 assert.match(M.fileError({name:'empty.pdf',size:0}),/empty/);
});
test('screen quiz awards once per seat and question, and never awards absent students',()=>{
 const c={pts:{},absent:{3:true},log:{}};const results=[];const q={choices:['Cat','Dog'],answer:0};
 assert.equal(M.awardQuiz(c,results,{run:'run',question:0,seat:1,choice:0,quiz:q,points:2,date:'2026-10-09',title:'Animals'}).points,2);
 assert.equal(c.pts[1],2);
 assert.equal(M.awardQuiz(c,results,{run:'run',question:0,seat:1,choice:0,quiz:q,points:2}).duplicate,true);
 assert.equal(c.pts[1],2);
 assert.equal(M.awardQuiz(c,results,{run:'run',question:0,seat:2,choice:1,quiz:q,points:2}).points,0);
 assert.equal(M.awardQuiz(c,results,{run:'run',question:0,seat:3,choice:0,quiz:q,points:2}).absent,true);
 assert.equal(c.pts[3],undefined);
});
test('report receipts normalize rows to block an identical game import',()=>{
 const a=[{nick:' 01 Amy ',scoreText:'20',seat:1,pts:2},{nick:'02 Bob',scoreText:'10',seat:2,pts:1}];
 assert.equal(M.reportKey('601','Gimkit','2026-10-09',a),M.reportKey('601','Gimkit','2026-10-09',a.slice().reverse()));
 assert.notEqual(M.reportKey('601','Gimkit','2026-10-09',a),M.reportKey('602','Gimkit','2026-10-09',a));
});
