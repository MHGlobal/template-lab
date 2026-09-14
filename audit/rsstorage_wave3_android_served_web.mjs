import fs from 'node:fs';
import path from 'node:path';
import { chromium } from 'playwright';

const base=(process.argv[2]||'http://127.0.0.1:18080').replace(/\/$/,'');
const out=process.argv[3]||'audit-out/web-android-served';
const session=process.env.AUDIT_RSSESSION||'';
if(!session) throw new Error('AUDIT_RSSESSION is required');
fs.mkdirSync(out,{recursive:true});

const observations={base:'adb-forwarded-device-server',capturedAt:new Date().toISOString(),pages:[],consoleErrors:[],pageErrors:[]};

async function overflowSnapshot(page){
  return await page.evaluate(()=>Array.from(document.querySelectorAll('body *')).filter(el=>{
    const s=getComputedStyle(el); const r=el.getBoundingClientRect();
    return r.width>0&&r.height>0&&s.display!=='none'&&el.scrollWidth>el.clientWidth+3;
  }).slice(0,30).map(el=>({tag:el.tagName.toLowerCase(),cls:String(el.className||''),text:(el.textContent||'').trim().slice(0,120),clientWidth:el.clientWidth,scrollWidth:el.scrollWidth})));
}

async function captureSet(label,viewport){
  const browser=await chromium.launch({headless:true});
  const context=await browser.newContext({viewportSize:viewport,deviceScaleFactor:1});
  await context.addCookies([{name:'RSSESSION',value:session,url:base,httpOnly:true,sameSite:'Strict'}]);
  const page=await context.newPage();
  page.on('console',m=>{if(m.type()==='error')observations.consoleErrors.push({page:page.url(),text:m.text()});});
  page.on('pageerror',e=>observations.pageErrors.push({page:page.url(),text:String(e)}));
  const routes=[['/admin/files','files'],['/ai','ai-chat'],['/cinema','cinema'],['/admin/clients','clients']];
  for(const [route,name] of routes){
    const response=await page.goto(base+route,{waitUntil:'networkidle',timeout:30000});
    const status=response?.status()||0;
    const title=await page.title();
    const overflows=await overflowSnapshot(page);
    observations.pages.push({label,route,name,status,title,overflows});
    if(status!==200)throw new Error(`${route} returned ${status}`);
    if(page.url().includes('/login'))throw new Error(`${route} lost authenticated session`);
    await page.screenshot({path:path.join(out,`${label}-${name}.png`),fullPage:true});
    if(route==='/ai'){
      const modes=page.locator('.mode');
      if(await modes.count()>=2){await modes.nth(1).click();await page.waitForTimeout(250);await page.screenshot({path:path.join(out,`${label}-ai-agent.png`),fullPage:true});}
    }
    if(route==='/admin/files'&&label==='mobile'){
      const more=page.locator('.more').first();
      if(await more.count()){await more.click();await page.waitForTimeout(180);await page.screenshot({path:path.join(out,'mobile-files-context-menu.png'),fullPage:true});}
    }
  }
  await browser.close();
}

await captureSet('desktop',{width:1440,height:1000});
await captureSet('mobile',{width:390,height:844});
fs.writeFileSync(path.join(out,'web-observations.json'),JSON.stringify(observations,null,2));
const pngs=fs.readdirSync(out).filter(x=>x.endsWith('.png'));
if(pngs.length<8)throw new Error(`Insufficient Android-served Web screenshots: ${pngs.length}`);
if(observations.pageErrors.length)throw new Error(`Browser page errors detected: ${JSON.stringify(observations.pageErrors)}`);
console.log(`ANDROID_SERVED_WEB_SCREENSHOTS=${pngs.length}`);
console.log(`ANDROID_SERVED_WEB_PAGES=${observations.pages.length}`);
