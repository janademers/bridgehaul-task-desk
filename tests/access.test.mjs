import {test} from 'node:test';
import assert from 'node:assert/strict';
import {verifyAccess} from '../worker/access.mjs';
const pair=await crypto.subtle.generateKey({name:'RSASSA-PKCS1-v1_5',modulusLength:2048,publicExponent:new Uint8Array([1,0,1]),hash:'SHA-256'},true,['sign','verify']);
const jwk=await crypto.subtle.exportKey('jwk',pair.publicKey);jwk.kid='test';
globalThis.fetch=async()=>Response.json({keys:[jwk]});
const env={ACCESS_AUD:'taskdesk',ACCESS_TEAM_DOMAIN:'jana-demers.cloudflareaccess.com'};
const claims={email:'Employee@BridgeHaul.com',iss:'https://'+env.ACCESS_TEAM_DOMAIN,aud:[env.ACCESS_AUD],exp:Date.now()/1000+600};
const encode=x=>Buffer.from(JSON.stringify(x)).toString('base64url');
async function token(c=claims){const body=encode({alg:'RS256',kid:'test'})+'.'+encode(c);return body+'.'+Buffer.from(await crypto.subtle.sign('RSASSA-PKCS1-v1_5',pair.privateKey,new TextEncoder().encode(body))).toString('base64url')}
test('accepts signed correct-audience identity',async()=>assert.equal(await verifyAccess(await token(),env),'employee@bridgehaul.com'));
test('rejects missing token',async()=>assert.rejects(()=>verifyAccess(null,env)));
test('rejects unconfigured audience',async()=>assert.rejects(()=>verifyAccess('anything',{...env,ACCESS_AUD:'SET_AFTER_SETUP'})));
test('rejects other application audience',async()=>assert.rejects(async()=>verifyAccess(await token({...claims,aud:['other-app']}),env)));
test('rejects expired identity',async()=>assert.rejects(async()=>verifyAccess(await token({...claims,exp:1}),env)));
test('rejects altered identity payload',async()=>{const t=await token();const parts=t.split('.');parts[1]=encode({...claims,email:'jana.demers@bridgehaul.com'});await assert.rejects(()=>verifyAccess(parts.join('.'),env))});
