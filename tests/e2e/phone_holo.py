import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio, subprocess, time
from playwright.async_api import async_playwright
OUT=os.path.join(ROOT,'public')
LIB={'three.min.js':os.path.join(VENDOR,'three.min.js'),'jsQR.js':os.path.join(VENDOR,'jsQR.js'),'qrcode.js':os.path.join(VENDOR,'qrcode.js')}
async def route(r):
    u=r.request.url
    for k,v in LIB.items():
        if u.endswith(k): return await r.fulfill(path=v, content_type='application/javascript')
    if 'fonts.g' in u: return await r.fulfill(body='', content_type='text/css')
    await r.continue_()
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8766','-d',OUT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROMIUM,args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+os.path.join(HERE,'shard1.y4m')+'','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,permissions=['camera'])
        page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e:errs.append(str(e))); page.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await page.route('**/*',route)
        await page.goto('http://localhost:8766/index.html'); await page.wait_for_timeout(400)
        await page.fill('#round-input','4821'); await page.click('a[data-role=xeno]'); await page.wait_for_timeout(200)
        await page.click('#start-btn'); await page.wait_for_timeout(3500)
        print('status:',await page.text_content('#status'),'visible:',await page.evaluate('AR.anchor.visible'))
        await page.screenshot(path='h_default.png')
        await page.evaluate('view3d.tilt=0.95'); await page.wait_for_timeout(900); await page.screenshot(path='h_tilt.png')
        await page.evaluate('Object.assign(view3d,{tilt:0.5,zoom:1.7,spin:0.7})'); await page.wait_for_timeout(900); await page.screenshot(path='h_zoom.png')
        await page.click('#holo-reset'); await page.wait_for_timeout(200)
        print('after reset',await page.evaluate('JSON.stringify(view3d)'))
        # mouse drag: right 100, up 120
        await page.mouse.move(195,400); await page.mouse.down(); await page.mouse.move(295,280,steps=8); await page.mouse.up()
        print('after drag',await page.evaluate('JSON.stringify(view3d)'))
        # synthetic two-finger pinch
        await page.evaluate('''() => { const s=document.querySelector('.cam-stage'); const ev=(t,id,x,y)=>s.dispatchEvent(new PointerEvent(t,{pointerId:id,clientX:x,clientY:y,bubbles:true,pointerType:'touch',isPrimary:id===11}));
          ev('pointerdown',11,150,400); ev('pointerdown',12,240,400); ev('pointermove',11,100,400); ev('pointermove',12,290,400); ev('pointerup',11,100,400); ev('pointerup',12,290,400); }''')
        print('after pinch',await page.evaluate('JSON.stringify(view3d)'))
        # wheel
        await page.mouse.move(195,400); await page.mouse.wheel(0,-300); await page.wait_for_timeout(100)
        print('after wheel',await page.evaluate('view3d.zoom.toFixed(2)'))
        # switch maze -> materialize
        await page.click('#holo-reset'); await page.click('#maze-seg-ar [data-maze=C]'); await page.wait_for_timeout(250); await page.screenshot(path='h_build.png')
        await page.wait_for_timeout(900); await page.screenshot(path='h_c.png')
        # dark/light irrelevant; check no errors
        print('errors:',errs)
        await b.close()
    srv.terminate()
asyncio.run(main())
