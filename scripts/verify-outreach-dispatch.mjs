// Real libsql transactions and real dispatcher; all recipients/receipts synthetic.
// No env loading, SMTP connections, provider calls or actual campaigns.
import assert from 'node:assert/strict';
import { createClient } from '@libsql/client';
import { mkdtempSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { randomUUID } from 'node:crypto';
import { loadTsModules } from './load-ts-module.mjs';
const { 'outreach-dispatch': { outreachStore, deliverOutreach, OUTREACH_INTERVAL_MS }, 'email-delivery': { prepareEmailHtml, emailPlainText, smtpReceipt } } = loadTsModules(['outreach-dispatch','email-delivery']);
const folder=mkdtempSync(join(tmpdir(),'tia-outreach-'));let passes=0;
async function database(name) {
 const client=createClient({url:`file:${join(folder,name+'.db')}`});
 await client.execute('CREATE TABLE SentEmailLog (id TEXT PRIMARY KEY,email TEXT)');
 return client;
}
const input=email=>({email,requestId:randomUUID(),exempt:false});
try {
 assert.equal(prepareEmailHtml('<img src="cid:TiaDesignsLogo-white.png">'),'<img src="https://tiadesigns.it/TiaDesignsLogo-white.png">');
 assert.equal(prepareEmailHtml('<img src="cid:other.png">'),'<img src="cid:other.png">');
 assert.equal(emailPlainText('<p>Caffè 🧠</p><p>Best,<br>Tia &rarr;</p>'),'Caffè 🧠\nBest,\nTia →');
 assert.equal(smtpReceipt({accepted:['one@example.test'],rejected:['two@example.test']},['one@example.test','two@example.test']).success,false);passes+=4;
 let client=await database('500');let store=outreachStore(client);let count=0;
 const send=async()=>{count++;return {success:true,messageId:`mock-${count}`,sentCopySaved:true};};
 // Hundreds of attempted operations including repeat visits and the daily cap.
 for(let i=0;i<500;i++) {
  const result=await deliverOutreach(store,input(`contact${i%200}@example.test`),send,100000000+i*OUTREACH_INTERVAL_MS);
  if(i<150) assert.equal(result.ok,true); else assert.equal(result.ok,false);
 }
 assert.equal(count,150);passes++;client.close();
 client=await database('parallel');
 // Independent stores emulate separate serverless instances sharing one DB.
 const otherClient=createClient({url:`file:${join(folder,'parallel.db')}`});
 const a=outreachStore(client),b=outreachStore(otherClient);let release;
 const waiting=new Promise(r=>release=r);let called=0;
 const first=deliverOutreach(a,input('parallel@example.test'),async()=>{called++;await waiting;return {success:true,messageId:'parallel'};},100000000);
 while(called===0) await new Promise(r=>setTimeout(r,1));
 const second=await deliverOutreach(b,input('parallel@example.test'),send,100000000);
 assert.equal(second.ok,false);assert.equal(second.status,409);assert.equal(second.uncertain,true);release();await first;passes++;
 assert.equal(await a.releaseAccepted('parallel@example.test'),true);
 assert.equal((await a.blocked()).length,0);
 assert.equal(Number((await client.execute('SELECT COUNT(*) AS n FROM OutreachDispatch')).rows[0].n),1,'release must preserve daily accounting');passes++;
 otherClient.close();
 const throttle=await deliverOutreach(a,input('other@example.test'),send,100000001);
 assert.equal(throttle.status,429);assert.equal(throttle.retryAfter,30);passes++;
 client.close();
 client=await database('failures');store=outreachStore(client);
 const unknown=await deliverOutreach(store,input('timeout@example.test'),async()=>{throw Object.assign(new Error('synthetic timeout'),{code:'ETIMEDOUT'});},100000000);
 assert.equal(unknown.uncertain,true);
 assert.equal(await store.releaseAccepted('timeout@example.test'),false,'pending or unknown cannot be cleared as accepted');passes++;
 const restarted=outreachStore(client);let replay=0;
 assert.equal((await deliverOutreach(restarted,input('timeout@example.test'),async()=>{replay++;return {success:true};},100100000)).ok,false);assert.equal(replay,0);passes++;
 const refused=await deliverOutreach(store,input('refused@example.test'),async()=>{throw {responseCode:550};},100100000);
 assert.equal(refused.uncertain,false);
 assert.equal(Number((await client.execute("SELECT COUNT(*) AS n FROM OutreachDispatch WHERE state='rejected'")).rows[0].n),1,'refusals remain in daily accounting');passes++;
 assert.equal((await deliverOutreach(store,input('refused@example.test'),send,100200000)).ok,true);passes++;
 const legacy='legacy@example.test';await client.execute({sql:'INSERT INTO SentEmailLog VALUES (?,?)',args:['existing',legacy]});
 assert.equal((await deliverOutreach(store,input(legacy),send,100300000)).status,409);passes++;
 const partial=await deliverOutreach(store,input('partial@example.test'),async()=>({success:false,messageId:'partial'}),100300000);
 assert.equal(partial.uncertain,true);passes++;
 // Lost post-SMTP database receipt retains pending: never a safe automatic retry.
 let sends=0;const broken={reserve:async()=>({ok:true,id:'lost',attempt:'1'}),settle:async()=>{throw new Error('DB unavailable');}};
 const lost=await deliverOutreach(broken,input('lost@example.test'),async()=>{sends++;return {success:true,messageId:'accepted'};});
 assert.equal(lost.uncertain,true);assert.equal(sends,1);passes++;
 const unavailable={reserve:async()=>{throw new Error('DB unavailable');},settle:async()=>{}};
 await assert.rejects(deliverOutreach(unavailable,input('blocked@example.test'),async()=>{sends++;return {success:true};}));assert.equal(sends,1);passes++;
 client.close();
 console.log(JSON.stringify({passed:passes,attemptedBatchRequests:500,acceptedSynthetic:150,realEmailsSent:0,scope:'Actual SQLite dispatcher/concurrency/rate/duplicate/unknown/receipt tests; inbox placement not verified'}));
} finally { rmSync(folder,{recursive:true,force:true}); }
