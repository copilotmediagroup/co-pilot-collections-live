import fs from 'node:fs';
const target='public/config.js';
const existing=fs.existsSync(target)?fs.readFileSync(target,'utf8'):'';
const envUrl=String(process.env.CPCM_SUPABASE_URL||'').trim();
const envKey=String(process.env.CPCM_SUPABASE_PUBLISHABLE_KEY||'').trim();
const deploymentMode=String(process.env.CPCM_DEPLOYMENT_MODE||'').trim().toLowerCase();
if(deploymentMode && !['live','demo'].includes(deploymentMode)) throw new Error('CPCM_DEPLOYMENT_MODE must be live or demo');
if(envUrl||envKey){
  if(!/^https:\/\/[^/]+\.supabase\.co\/?$/i.test(envUrl)) throw new Error('CPCM_SUPABASE_URL must be a Supabase project URL');
  if(!envKey.startsWith('sb_publishable_')) throw new Error('CPCM_SUPABASE_PUBLISHABLE_KEY must be a Supabase publishable key');
  fs.writeFileSync(target,`// Generated at build time from deployment environment.\nwindow.CO_PILOT_SUPABASE_CONFIG = ${JSON.stringify({url:envUrl.replace(/\/$/,''),publishableKey:envKey,deploymentMode:deploymentMode||'live'},null,2)};\n`);
} else if(!existing.includes('CO_PILOT_SUPABASE_CONFIG')) {
  throw new Error('No runtime Supabase config found. Set CPCM_SUPABASE_URL and CPCM_SUPABASE_PUBLISHABLE_KEY.');
}
