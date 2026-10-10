import {pipeline,env} from 'https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1';
env.allowLocalModels=false;
env.backends.onnx.wasm.numThreads=1;
let generator;
self.onmessage=async ({data})=>{
 if(data.type!=='generate')return;
 try{
  if(!generator){self.postMessage({type:'status',text:'Downloading the small language model. This first load can take a few minutes.'});generator=await pipeline('text2text-generation','Xenova/flan-t5-small',{dtype:'q8',device:'wasm',progress_callback:p=>{if(p.status==='progress')self.postMessage({type:'status',text:'Loading model: '+Math.round(p.progress||0)+'% · '+p.file});}});}
  self.postMessage({type:'status',text:'Creating an idea on this device…'});
  const result=await generator(String(data.prompt).slice(0,600),{max_new_tokens:100,do_sample:false,repetition_penalty:1.2});
  self.postMessage({type:'result',text:result[0].generated_text});
 }catch{generator=null;self.postMessage({type:'error',text:'The local model could not run on this device. Try again on a computer, or copy the prompt into one of the teacher AI tools below.'});}
};
