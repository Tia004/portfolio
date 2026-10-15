// Exercise actual SMTP preparation and Nodemailer's MIME compiler offline.
import assert from 'node:assert/strict';
import { createRequire } from 'node:module';
import { loadTsModules } from './load-ts-module.mjs';
const require=createRequire(import.meta.url);
const nodemailer=require('nodemailer');const {ImapFlow}=require('imapflow');const {simpleParser}=require('mailparser');
process.env.ARUBA_EMAIL_USER='sender@example.test';process.env.ARUBA_EMAIL_PASSWORD='synthetic-not-a-credential';
const original=nodemailer.createTransport;const connect=ImapFlow.prototype.connect;const warn=console.warn;
let compiled;let prepared;let partial=false;
try {
 console.warn=()=>{};
 ImapFlow.prototype.connect=async function(){throw new Error('Synthetic IMAP unavailable, no connection attempted');};
 nodemailer.createTransport=()=>({sendMail:async options=>{
  prepared=options;
  const stream=original({streamTransport:true,buffer:true,newline:'unix'});
  compiled=(await stream.sendMail(options)).message;
  return {messageId:'<synthetic@example.test>',accepted:['recipient@example.test'],rejected:partial?['other@example.test']:[]};
 }});
 const {'aruba-mail':{sendArubaEmail}}=loadTsModules(['email-delivery','aruba-mail']);
 const result=await sendArubaEmail({to:'recipient@example.test',subject:'Caffè 🧠',html:'<p>Caffè 🧠</p><img src="cid:TiaDesignsLogo-white.png"><p>Best,<br>Tia</p>'});
 assert.equal(result.success,true);assert.equal(result.sentCopySaved,false);
 assert.ok(prepared.html.includes('https://tiadesigns.it/TiaDesignsLogo-white.png'));assert.ok(!prepared.html.includes('cid:'));
 const parsed=await simpleParser(compiled);
 assert.equal(parsed.subject,'Caffè 🧠');assert.ok(parsed.text.includes('Best,\nTia'));assert.equal(parsed.attachments.length,0);
 assert.ok(parsed.html.includes('https://tiadesigns.it/TiaDesignsLogo-white.png'));
 partial=true;assert.equal((await sendArubaEmail({to:['recipient@example.test','other@example.test'],subject:'Partial fixture',html:'<p>Test</p>'})).success,false);
 console.log(JSON.stringify({passed:9,realEmailsSent:0,scope:'Actual outbound preparation + Nodemailer MIME compilation/parsing; missing inline logo normalized, UTF8/plain-text, partial acceptance and IMAP failure separated from SMTP acceptance'}));
} finally {nodemailer.createTransport=original;ImapFlow.prototype.connect=connect;console.warn=warn;}
