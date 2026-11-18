const decode=s=>Uint8Array.from(atob(s.replace(/-/g,'+').replace(/_/g,'/')),c=>c.charCodeAt(0));
let cached;
export async function verifyAccess(token,env){
 if(!token||!env.ACCESS_AUD||env.ACCESS_AUD.startsWith('SET_'))throw Error('Access not configured');
 const parts=token.split('.');if(parts.length!==3)throw Error('Invalid token');
 const header=JSON.parse(new TextDecoder().decode(decode(parts[0]))),claims=JSON.parse(new TextDecoder().decode(decode(parts[1])));
 const issuer='https://'+env.ACCESS_TEAM_DOMAIN;
 if(header.alg!=='RS256'||claims.iss!==issuer||!Array.isArray(claims.aud)||!claims.aud.includes(env.ACCESS_AUD)||!Number.isFinite(claims.exp)||claims.exp<=Date.now()/1000||claims.nbf>Date.now()/1000||typeof claims.email!=='string')throw Error('Invalid claims');
 if(!cached||cached.until<Date.now()){const r=await fetch(issuer+'/cdn-cgi/access/certs');if(!r.ok)throw Error('Access keys unavailable');cached={keys:(await r.json()).keys,until:Date.now()+300000};}
 const jwk=cached.keys.find(k=>k.kid===header.kid);if(!jwk)throw Error('Unknown signing key');
 const key=await crypto.subtle.importKey('jwk',jwk,{name:'RSASSA-PKCS1-v1_5',hash:'SHA-256'},false,['verify']);
 if(!await crypto.subtle.verify('RSASSA-PKCS1-v1_5',key,decode(parts[2]),new TextEncoder().encode(parts[0]+'.'+parts[1])))throw Error('Invalid signature');
 return claims.email.trim().toLowerCase();
}
