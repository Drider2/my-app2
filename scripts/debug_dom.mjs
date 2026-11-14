import { CDPClient } from './comprehensive_e2e_audit.mjs';

async function main() {
  const c = new CDPClient();
  await c.init('https://b221bf2796f239.app.lhr.life');
  await new Promise(r => setTimeout(r, 2000));
  const text = await c.evaluate('document.body.innerText');
  console.log('BODY TEXT:\n', text);
  const title = await c.evaluate('document.title');
  console.log('TITLE:', title);
  const inputs = await c.evaluate('document.querySelectorAll("input").length');
  console.log('INPUTS COUNT:', inputs);
  const gateState = await c.evaluate(`
    (() => {
      const pwd = document.querySelector('input[type="password"]');
      const nav = document.querySelector('nav, aside, [role="tablist"], [data-tab-id]');
      const rootDiv = document.querySelector('#root > div');
      return { hasPwd: Boolean(pwd), hasNav: Boolean(nav), hasRootDiv: Boolean(rootDiv) };
    })()
  `);
  console.log('GATE STATE:', gateState);
  await c.close();
}
main().catch(console.error);
