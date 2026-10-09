import {createRequire} from 'node:module';
import {readdir,readFile,mkdir,writeFile} from 'node:fs/promises';
import {join,extname,resolve} from 'node:path';
const require=createRequire(import.meta.url);
let esbuild;try{esbuild=require('esbuild');}catch{esbuild=require(process.env.CODEX_PRIMARY_RUNTIME_NODE_MODULES+'/esbuild');}
const mime={'.html':'text/html;charset=utf-8','.js':'text/javascript;charset=utf-8','.css':'text/css;charset=utf-8','.json':'application/json;charset=utf-8','.webmanifest':'application/manifest+json','.txt':'text/plain;charset=utf-8','.png':'image/png'};
const assets={};async function walk(dir,relative=''){for(const f of await readdir(dir,{withFileTypes:true})){const path=join(dir,f.name),name=relative+'/'+f.name;if(f.isDirectory())await walk(path,name);else assets[name]=[mime[extname(f.name)]||'application/octet-stream',(await readFile(path)).toString('base64')];}}
await walk(resolve('public'));await mkdir('dist',{recursive:true});
const entry=`import app from './worker/index.js';const assets=${JSON.stringify(assets)};const buffers=new Map();const ASSETS={async fetch(request){const u=new URL(request.url);if(!['GET','HEAD'].includes(request.method))return new Response('Method not allowed',{status:405});const path=u.pathname==='/'?'/index.html':u.pathname,asset=assets[path];if(!asset)return new Response('Not found',{status:404});if(!buffers.has(path)){const raw=atob(asset[1]),bytes=new Uint8Array(raw.length);for(let i=0;i<raw.length;i++)bytes[i]=raw.charCodeAt(i);buffers.set(path,bytes);}return new Response(request.method==='HEAD'?null:buffers.get(path),{headers:{'Content-Type':asset[0]}});}};export default{fetch(request,env){return app.fetch(request,{...env,ASSETS});}};`;
const result=await esbuild.build({stdin:{contents:entry,resolveDir:process.cwd(),sourcefile:'embedded.js'},bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,write:false});
await writeFile('dist/worker.js',result.outputFiles[0].contents);
await writeFile('dist/assets.json',JSON.stringify({files:Object.keys(assets),bytes:result.outputFiles[0].contents.length},null,2));
console.log(`Built ${Object.keys(assets).length} assets; Worker ${result.outputFiles[0].contents.length} bytes`);
