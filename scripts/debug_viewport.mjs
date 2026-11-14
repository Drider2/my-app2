import { CDPClient } from './comprehensive_e2e_audit.mjs';

async function main() {
  const c = new CDPClient();
  await c.init('https://greendream-app-live.netlify.app');
  await c.unlockGateIfNeeded();
  
  await c.setViewport(1920, 1080);
  await new Promise(r => setTimeout(r, 600));
  const d1 = await c.evaluate(`({ w: window.innerWidth, layout: document.documentElement.getAttribute('data-layout') })`);
  console.log('1920x1080:', d1);

  await c.setViewport(768, 1024);
  await new Promise(r => setTimeout(r, 600));
  const d2 = await c.evaluate(`({ w: window.innerWidth, layout: document.documentElement.getAttribute('data-layout') })`);
  console.log('768x1024:', d2);

  await c.setViewport(390, 844);
  await new Promise(r => setTimeout(r, 600));
  const d3 = await c.evaluate(`({ w: window.innerWidth, layout: document.documentElement.getAttribute('data-layout') })`);
  console.log('390x844:', d3);

  await c.close();
}
main().catch(console.error);
