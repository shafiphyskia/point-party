const {test}=require('node:test');
const assert=require('node:assert/strict');
const dice=require('../lucky-dice.js');
test('random selection reaches every student including numbers above six',()=>{
 for(let i=0;i<26;i++) assert.equal(dice.randomIndex(26,a=>{a[0]=i;}),i);
});
test('random selection rejects the biased tail before choosing a student',()=>{
 const values=[4294967295,25];
 assert.equal(dice.randomIndex(26,a=>{a[0]=values.shift();}),25);
 assert.equal(values.length,0);
});
test('invalid and empty pools cannot produce a winner',()=>{
 for(const n of [0,-1,1.5,NaN]) assert.throws(()=>dice.randomIndex(n),RangeError);
});
