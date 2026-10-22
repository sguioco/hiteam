const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const ts = require('typescript');
const crypto = require('node:crypto');

const context = { exports: {}, require, Buffer, Response, Request, AbortSignal, URL, Uint8Array, process, fetch };
vm.runInNewContext(ts.transpileModule(fs.readFileSync(path.join(__dirname, '../lib/support-proxy.ts'), 'utf8'),
  { compilerOptions: { module: ts.ModuleKind.CommonJS, target: ts.ScriptTarget.ES2022 } }).outputText, context);
const { allowedSupportPath, signedSupportIdentity, proxySupportRequest } = context.exports;
const env = { HITEAM_SUPPORT_ENABLED: 'true', HITEAM_SUPPORT_BASE_URL: 'http://support:8094',
  HITEAM_SUPPORT_API_KEY: 'private-api', HITEAM_SUPPORT_IDENTITY_SECRET: 'private-identity', INTERNAL_API_URL: 'http://api:4000' };

(async () => {
  for (const [method, route] of [['GET','tickets'], ['POST','integrations/telegram/webhook'],
      ['GET','sessions/../tickets'], ['DELETE','sessions/abc']]) assert.equal(allowedSupportPath(method,route),false);
  assert.equal(allowedSupportPath('POST','sessions'),true);
  assert.equal(allowedSupportPath('POST','sessions/abc/turns/def/feedback'),true);
  const envelope = JSON.parse(Buffer.from(signedSupportIdentity('u','T','secret',100).slice(3),'base64url'));
  assert.equal(envelope.identity.company_code,'t');
  assert.equal(envelope.identity.product_id,'hiteam');
  assert.equal(envelope.identity.expires_at,400);
  assert.equal(envelope.signature,crypto.createHmac('sha256','secret').update(JSON.stringify(envelope.identity)).digest('hex'));
  const missingAuth = await proxySupportRequest(new Request('http://localhost/api/support/sessions',{ method:'POST' }), 'sessions', {env});
  assert.equal(missingAuth.status,401);
  let calls = [];
  const fetcher = async (url, options) => {
    calls.push({url,options});
    if (url.endsWith('/auth/me')) return Response.json({id:'verified-user',tenantId:'verified-tenant'});
    return Response.json({session_id:'session-a'});
  };
  const request = () => new Request('http://localhost/api/support/sessions',{ method:'POST',
    headers:{ Authorization:'Bearer user-token','Content-Type':'application/json' },
    body:JSON.stringify({actor_id:'forged',company_code:'another-tenant'}) });
  const result = await proxySupportRequest(request(),'sessions',{env,fetcher});
  assert.equal(result.status,200);
  assert.equal(calls.length,2);
  assert.equal(calls[0].url,'http://api:4000/api/v1/auth/me');
  assert.equal(calls[1].options.headers.Authorization,'Bearer private-api');
  const signed = JSON.parse(Buffer.from(calls[1].options.headers['X-Product-Identity'].slice(3),'base64url')).identity;
  assert.equal(signed.actor_id,'verified-user');
  assert.equal(signed.company_code,'verified-tenant');
  calls = [];
  const rejected = await proxySupportRequest(request(),'sessions',{env,fetcher:async()=>{ calls.push(1); return new Response('',{status:401}); }});
  assert.equal(rejected.status,401);
  assert.equal(calls.length,1);
  const disabled = await proxySupportRequest(request(),'sessions',{env:{...env,HITEAM_SUPPORT_ENABLED:'false'},fetcher});
  assert.equal(disabled.status,503);
  console.log('Support proxy identity, isolation and perimeter tests passed');
})().catch(error=>{console.error(error);process.exitCode=1;});
