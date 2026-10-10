(function(root){
 function nextLevel(level,correct,streak){return Math.max(1,Math.min(4,level+(correct?(streak>=2?1:0):-1)));}
 function question(level){const cap=[5,10,20,50][Math.max(0,Math.min(3,level-1))],a=Math.floor(Math.random()*(cap+1)),b=Math.floor(Math.random()*(cap+1)),answer=a+b,choices=[answer,answer+1,Math.max(0,answer-1)];if(new Set(choices).size<3)choices[2]=answer+2;for(let i=2;i>0;i--){const j=Math.floor(Math.random()*(i+1));[choices[i],choices[j]]=[choices[j],choices[i]];}return {a,b,answer,choices};}
 function teacherPrompt(topic,grade,kind){topic=String(topic||'').trim().slice(0,160);if(!topic)throw new Error('Add a lesson topic first.');grade=Math.max(1,Math.min(6,Number(grade)||2));return `Create a short ${kind==='explain'?'explanation':kind==='question'?'discussion question':'classroom warm-up'} about ${topic} for Grade ${grade}. Use simple English, no student personal data, and a positive tone. Include one concrete example. Keep it under 80 words.`;}
 const api={question,nextLevel,teacherPrompt};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.LearningCore=api;
})(typeof window==='undefined'?globalThis:window);
