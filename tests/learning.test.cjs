const {test}=require('node:test');const assert=require('node:assert/strict');
const core=require('../learning-core.js');
test('number quest increases difficulty after success and gives a smaller next challenge after misses',()=>{
 assert.equal(core.nextLevel(2,true,2),3);assert.equal(core.nextLevel(2,false,0),1);assert.equal(core.nextLevel(1,false,0),1);assert.equal(core.nextLevel(4,true,2),4);
});
test('number quest choices are unique, contain the answer once, and never go below zero',()=>{
 for(let level=1;level<=4;level++)for(let i=0;i<30;i++){const q=core.question(level);assert.equal(new Set(q.choices).size,3);assert.equal(q.choices.filter(c=>c===q.answer).length,1);assert.ok(q.choices.every(c=>c>=0));assert.equal(q.a+q.b,q.answer);}
});
test('teacher prompt requires a topic and constrains age and length',()=>{
 assert.throws(()=>core.teacherPrompt('',2,'warm-up'),/topic/i);const p=core.teacherPrompt('plants',999,'warm-up');assert.match(p,/Grade 6/);assert.match(p,/plants/);assert.match(p,/no student personal data/i);
});
test('small model gets a short direct prompt and unrelated drafts are rejected',()=>{
 assert.equal(core.modelPrompt('addition','explain'),'What is addition? Explain in simple words.');
 assert.match(core.modelPrompt('plants','warm-up'),/classroom activity about plants/);
 assert.equal(core.answerMatchesTopic('Become a part of the community by donating to the local homeless shelter.','addition'),false);
 assert.equal(core.answerMatchesTopic('A teacher will teach you how to use a computer.','plants'),false);
 assert.equal(core.answerMatchesTopic('Addition means combining numbers to find their total.','addition'),true);
});
