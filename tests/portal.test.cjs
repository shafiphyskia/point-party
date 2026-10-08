const {test}=require('node:test');
const assert=require('node:assert/strict');
const core=require('../portal-core.js');

test('grade averages include zero and exclude missing work',()=>{
 const portal=core.clean({assessments:[{id:'a',classId:'607',title:'Reading',maximum:20},{id:'b',classId:'607',title:'Speaking',maximum:10},{id:'c',classId:'607',title:'Later',maximum:100}],scores:{a:{1:{score:0}},b:{1:{score:10}}}});
 assert.deepEqual(core.progress(portal,'607',1).grades,{earned:10,possible:30,percentage:33,graded:2});
 assert.equal(core.progress(portal,'607',2).grades.percentage,null);
});
test('attendance is dated and separated by class and seat',()=>{
 const portal=core.clean({attendance:{'2026-10-08':{'607':{1:'present',2:'absent',3:'late',4:'made-up'},'606':{1:'absent'}}}});
 assert.deepEqual(core.progress(portal,'607',1).attendance,{present:1,absent:0,late:0,excused:0,total:1});
 assert.equal(core.progress(portal,'607',3).attendance.late,1);
 assert.equal(core.progress(portal,'607',4).attendance.total,0);
});
test('lesson sanitization limits fields and rejects unsafe resource URLs',()=>{
 const p=core.clean({lessons:[{id:'x',classId:'607',title:'Test',body:'<script>',url:'javascript:alert(1)',kind:'quiz',published:true,questions:[{prompt:'Hello?',choices:['A','B'],answer:0}]}]});
 assert.equal(p.lessons[0].url,''); assert.equal(p.lessons[0].body,'<script>');
 assert.equal(p.lessons[0].questions[0].answer,0);
 assert.equal(core.safeUrl('https://example.org/lesson'),'https://example.org/lesson');
});
test('quiz format validates every question and answer',()=>{
 assert.deepEqual(core.parseQuiz('Hello? | Hi | Bye | 1'),[{prompt:'Hello?',choices:['Hi','Bye'],answer:0}]);
 assert.throws(()=>core.parseQuiz('Hello? | Hi | Bye | 3'),/answer/i);
 assert.throws(()=>core.parseQuiz('bad line'),/format/i);
});
test('auth errors distinguish SMTP delivery, rate limits, expired codes and setup',()=>{
 assert.match(core.authError({code:'over_email_send_rate_limit'}),/wait/i);
 assert.match(core.authError({code:'email_address_not_authorized'}),/email delivery/i);
 assert.match(core.authError({code:'otp_expired'}),/new code/i);
 assert.match(core.authError({message:'relation public.pp_schools does not exist'}),/database setup/i);
});
