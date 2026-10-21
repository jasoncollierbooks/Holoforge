// Optional on-device "meaning" matcher. Loads a small sentence-embedding model (all-MiniLM-L6-v2, ~23 MB, quantized)
// with transformers.js from a public CDN the first time it is needed, then runs it locally in the browser. No account, no key, no server.
// The knowledge base vectors are precomputed (kb/emb.bin). If anything fails to load, the keyword matcher keeps working alone.
import {key,cos} from './brain.js';
const LIB="https://cdn.jsdelivr.net/npm/@huggingface/transformers@3.8.1/dist/transformers.min.js";
let st="off",pipe=null,vec=null,p0=null;const extra=new Map();
export const status=()=>st;
export function init(onStatus=()=>{}){if(p0)return p0;st="loading";onStatus(st);
 p0=(async()=>{try{const T=await import(LIB);T.env.allowLocalModels=false;
   const [m,b]=await Promise.all([fetch("kb/emb.json").then(r=>r.json()),fetch("kb/emb.bin").then(r=>r.arrayBuffer())]);const B=new Int8Array(b),d=m.dim;
   vec=new Map(m.keys.map((k,i)=>[k,Float32Array.from(B.subarray(i*d,(i+1)*d),x=>x/m.scale)]));
   pipe=await T.pipeline("feature-extraction",m.model,{dtype:"q8"});st="on";}catch(e){console.warn("meaning model unavailable",e);st="failed";}onStatus(st);return st=="on";})();return p0;}
export async function embed(text){const o=await pipe(text,{pooling:"mean",normalize:true});return Float32Array.from(o.data);}
// make sure taught entries (not in the shipped vectors) get a vector too
export async function addEntries(entries,txt){if(st!="on")return;for(const e of entries){const k=key(e);if(!vec.has(k)&&!extra.has(k))extra.set(k,await embed(txt(e)));}}
export async function sims(q){if(st!="on")return null;const v=await embed(q),m=new Map();for(const[k,x]of vec)m.set(k,cos(v,x));for(const[k,x]of extra)m.set(k,cos(v,x));return m;}
