import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio, os, subprocess, time
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
    srv=subprocess.Popen(['python3','-m','http.server','8765','-d',OUT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROMIUM,args=['--use-fake-ui-for-media-stream','--use-fake-device-for-media-stream','--use-file-for-fake-video-capture='+os.path.join(HERE,'shard1.y4m')+'','--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True,permissions=['camera'])
        page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e:errs.append(str(e))); page.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' else None)
        await page.route('**/*',route)
        await page.goto('http://localhost:8765/index.html'); await page.wait_for_timeout(500)
        await page.fill('#round-input','4821'); await page.screenshot(path='s_home.png')
        await page.click('a[data-role=xeno]'); await page.wait_for_timeout(300)
        await page.click('#start-btn'); await page.wait_for_timeout(4000)
        print('status:',await page.text_content('#status'),'| ar-bar hidden:',await page.get_attribute('#ar-bar','hidden'),'| chips:',await page.inner_text('#chips'))
        print('anchor visible:',await page.evaluate('AR.anchor && AR.anchor.visible'),'W,H',await page.evaluate('[W,H]'))
        await page.screenshot(path='s_ar.png')
        
        await page.click('#holo-card'); await page.wait_for_timeout(300); await page.screenshot(path='s_flat.png')
        await page.click('#sheet-close'); await page.click('#holo-done'); await page.wait_for_timeout(300)
        # the Jaw via manual entry: press teeth on the hologram
        async def tooth(name):
            i = await page.evaluate(f"state.round.glyph.teeth.indexOf('{name}')")
            xy = await page.evaluate(f'AR.model.screenOf({i})'); await page.mouse.click(xy[0], xy[1]); await page.wait_for_timeout(300)
        # leave and come back without the camera, so the Jaw shows as a 3D preview that can be pressed
        await page.evaluate("location.hash = 'home'"); await page.wait_for_timeout(300)
        await page.click('a[data-role=xeno]'); await page.wait_for_timeout(300)
        n6 = await page.evaluate('state.round.nodeShard.glyph')
        await page.click('#start-cam .manual-open'); await page.click(f'#shard-pick [data-n="{n6}"]'); await page.wait_for_timeout(1200)
        ans = await page.evaluate('state.round.glyph.answer'); teeth = await page.evaluate('state.round.glyph.teeth')
        await page.screenshot(path='s_glyph.png')
        for g in ans[:3]: await tooth(g)
        await tooth([t for t in teeth if t not in ans][0]); await page.wait_for_timeout(200)
        print('strikes after wrong tap:',await page.evaluate('state.strikes'))
        await page.wait_for_timeout(1900)
        for g in ans: await tooth(g)
        await page.wait_for_timeout(500)
        print('glyph solved:',await page.evaluate("state.solved.has('glyph')"))
        await page.screenshot(path='s_glyph_done.png')
        await page.click('#holo-done')
        # wrong specialist + dead shard
        await page.click('#tray .manual-open'); await page.click('#shard-pick [data-n="3"]'); await page.wait_for_timeout(200)
        print('toast wrong:',await page.text_content('#toast'))
        await page.wait_for_timeout(2700)
        await page.click('#tray .manual-open'); await page.click('#shard-pick [data-n="5"]'); await page.wait_for_timeout(200)
        print('toast dead:',await page.text_content('#toast'))
        # astro: resonator + conduits
        await page.goto('http://localhost:8765/index.html#astrophysicist'); await page.wait_for_timeout(400)
        await page.click('#tray .manual-open'); await page.click('#shard-pick [data-n="3"]'); await page.wait_for_timeout(300); await page.click('#holo-card'); await page.wait_for_timeout(200)
        await page.evaluate("document.querySelector('#freq').value=586; document.querySelector('#freq').dispatchEvent(new Event('input'))")
        await page.screenshot(path='s_reso.png')
        await page.click('#transmit'); await page.wait_for_timeout(300)
        print('resonator solved:',await page.evaluate("state.solved.has('resonator')"))
        await page.click('#sheet-close'); await page.click('#holo-done'); await page.click('#tray .manual-open'); await page.click('#shard-pick [data-n="2"]'); await page.wait_for_timeout(300)
        await page.screenshot(path='s_cond.png', full_page=False)
        await page.goto('http://localhost:8765/index.html#shards'); await page.wait_for_timeout(400); await page.screenshot(path='s_shards.png')
        print('qr count',await page.evaluate("document.querySelectorAll('.shard-card svg.qr').length"))
        await page.goto('http://localhost:8765/index.html#test'); await page.wait_for_timeout(400); await page.screenshot(path='s_test.png',full_page=True)
        # dark mode home
        await page.emulate_media(color_scheme='dark'); await page.goto('http://localhost:8765/index.html#home'); await page.wait_for_timeout(300); await page.screenshot(path='s_home_dark.png')
        print('errors:',errs)
        await b.close()
    srv.terminate()
asyncio.run(main())
