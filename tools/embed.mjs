// Dev tool (node): shared embedding helper using the same model the browser loads (Xenova/all-MiniLM-L6-v2, q8).
// Note: onnxruntime-node sometimes returns garbage on the first runs after load, so we warm up until results are stable.
import {pipeline} from '@huggingface/transformers';
let P=null;export const MODEL='Xenova/all-MiniLM-L6-v2';
const run=async t=>{const o=await P([t],{pooling:'mean',normalize:true});return Float32Array.from(o.data);};
const c=(a,b)=>a.reduce((s,x,i)=>s+x*b[i],0);
async function init(){P=await pipeline('feature-extraction',MODEL,{dtype:'fp32'});let a=await run("warm up probe sentence"),n=0;for(;n<20;n++){const b=await run("warm up probe sentence");if(c(a,b)>0.9999)break;a=b;}}
export async function embed(texts){if(!P)await init();const out=[];for(const t of texts)out.push(await run(t));return out;}
export const entryText=e=>`${e.t}. ${e.g}. ${String(e.a).slice(0,160)}`;
