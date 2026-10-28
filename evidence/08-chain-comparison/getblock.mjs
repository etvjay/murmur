import http2 from 'node:http2';
const host = process.argv[2], heights = process.argv.slice(3).map(Number);
const varint = n => { const b=[]; while(n>127){b.push((n&127)|128); n=Math.floor(n/128);} b.push(n); return Buffer.from(b); };
function call(client, method, msg){ return new Promise((res,rej)=>{
  const frame = Buffer.concat([Buffer.from([0]), Buffer.alloc(4), msg]); frame.writeUInt32BE(msg.length,1);
  const r = client.request({':method':'POST',':path':'/cash.z.wallet.sdk.rpc.CompactTxStreamer/'+method,'content-type':'application/grpc','te':'trailers'});
  const chunks=[]; let status; r.on('trailers',t=>{status=t['grpc-status']+' '+(t['grpc-message']||'')}); r.on('response',h=>{if(h['grpc-status'])status=h['grpc-status']+' '+(h['grpc-message']||'')});
  r.on('data',c=>chunks.push(c)); r.on('end',()=>res({buf:Buffer.concat(chunks),status})); r.on('error',rej); r.setTimeout(20000,()=>rej(new Error('timeout'))); r.end(frame);});}
function fields(buf){ const o={}; let i=0; while(i<buf.length){ let k=0,sh=0,b; do{b=buf[i++];k|=(b&127)<<sh;sh+=7}while(b&128); const f=k>>3,w=k&7;
  if(w===0){let v=0,m=1;do{b=buf[i++];v+=(b&127)*m;m*=128}while(b&128);o[f]=v}
  else if(w===2){let l=0;sh=0;do{b=buf[i++];l|=(b&127)<<sh;sh+=7}while(b&128);o[f]=buf.subarray(i,i+l);i+=l}
  else break;} return o;}
const client = http2.connect('https://'+host);
client.on('error',e=>{console.log('connect error',e.message);process.exit(1)});
for (const h of heights){
  const {buf,status} = await call(client,'GetBlock', Buffer.concat([Buffer.from([0x08]), varint(h)]));
  if (buf.length<5){ console.log(h,'no block', status); continue; }
  const f = fields(buf.subarray(5)); const hash=f[3];
  if(!hash){ console.log(h,'no hash in reply', status); continue; }
  console.log(`height ${f[2]}  hash(as served) ${hash.toString('hex')}  reversed ${Buffer.from(hash).reverse().toString('hex')}`);
}
client.close();
