import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio, json, time
from playwright.async_api import async_playwright
LIB={'three.min.js':os.path.join(VENDOR,'three.min.js'),'jsQR.js':os.path.join(VENDOR,'jsQR.js'),'qrcode.js':os.path.join(VENDOR,'qrcode.js')}
async def route(r):
    u=r.request.url
    for k,v in LIB.items():
        if u.endswith(k): return await r.fulfill(path=v, content_type='application/javascript')
    if 'fonts.g' in u: return await r.fulfill(body='', content_type='text/css')
    await r.continue_()
BASE='http://127.0.0.1:8787/'
async def page_for(b, w, h, mobile, errs, tag):
    ctx=await b.new_context(viewport={'width':w,'height':h},device_scale_factor=1 if not mobile else 2,is_mobile=mobile,has_touch=mobile)
    p=await ctx.new_page(); await p.route('**/*',route)
    p.on('pageerror',lambda e:errs.append(tag+': '+str(e))); p.on('console',lambda m: errs.append(tag+' console: '+m.text) if m.type=='error' else None)
    return p
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path=CHROMIUM,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        errs=[]
        code='7314'
        # reset the room so reruns start clean
        d=await page_for(b,1440,900,False,errs,'director')
        await d.goto(BASE+'?round='+code+'#director'); await d.wait_for_timeout(1500)
        if not await d.is_disabled('#dir-reset'):
            d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(500)
        print('director phase:', await d.text_content('#dir-phase'), '| code:', await d.text_content('#dir-code'))
        x=await page_for(b,390,844,True,errs,'xeno'); a=await page_for(b,390,844,True,errs,'astro')
        await x.goto(BASE+'?round='+code); await x.wait_for_timeout(500); await x.click('a[data-role=xeno]'); await x.wait_for_timeout(1200)
        await a.goto(BASE+'?round='+code); await a.wait_for_timeout(500); await a.click('a[data-role=astro]'); await a.wait_for_timeout(1200)
        print('crew on director:', (await d.inner_text('#dir-crew')).replace('\n',' | '))
        print('phone clock before start:', await x.text_content('#clock'))
        await d.select_option('#dir-length','480000'); await d.wait_for_timeout(400)
        await d.click('#dir-start'); await d.wait_for_timeout(1500)
        print('after start  director:', await d.text_content('#dir-clock'), await d.text_content('#dir-phase'), '| xeno clock:', await x.text_content('#clock'), '| astro clock:', await a.text_content('#clock'))
        await d.screenshot(path='r_director_live.png')
        # astro makes a mistake on the Resonator
        n3 = await a.evaluate('state.round.nodeShard.resonator')
        await a.click('#start-cam .manual-open'); await a.click(f'#shard-pick [data-n="{n3}"]'); await a.wait_for_timeout(800)
        await a.click('#holo-card'); await a.wait_for_timeout(300)
        await a.evaluate("document.querySelector('#freq').value=401; document.querySelector('#freq').dispatchEvent(new Event('input'))")
        await a.click('#transmit'); await a.wait_for_timeout(1200)
        print('after astro strike  director strikes:', await d.evaluate('Net.state.strikes'), '| xeno sees:', await x.evaluate('state.strikes'), '| clock rate:', await d.evaluate('Net.state.rate'))
        # astro solves it
        freq = await a.evaluate('state.round.resonator.freq')
        await a.evaluate(f"document.querySelector('#freq').value={freq}; document.querySelector('#freq').dispatchEvent(new Event('input'))")
        await a.click('#transmit'); await a.wait_for_timeout(1200)
        print('after solve  director solved:', await d.evaluate('Net.state.solved'))
        print('log:', [l for l in (await d.inner_text('#dir-log')).split('\n')][:4])
        await x.screenshot(path='r_phone_live.png')
        # director reset clears everyone
        d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(1200)
        print('after reset  director:', await d.text_content('#dir-phase'), '| astro strikes:', await a.evaluate('state.strikes'), 'solved:', await a.evaluate('[...state.solved]'), '| astro chips:', await a.inner_text('#chips'))
        # three strikes ends it for all
        await d.click('#dir-start'); await d.wait_for_timeout(800)
        for i in range(3): await x.evaluate("addStrike('test strike')"); await x.wait_for_timeout(500)
        await x.wait_for_timeout(800)
        print('three strikes  director:', await d.text_content('#dir-phase'), '| astro overlay:', await a.is_visible('#lost'), await a.text_content('#lost-title'), '| xeno:', await x.text_content('#lost-text'))
        await a.screenshot(path='r_phone_lost.png')
        # phone reconnects after the server drops it
        await x.evaluate('Net.ws.close()'); await x.wait_for_timeout(2500)
        print('xeno reconnected:', await x.evaluate('Net.online'))
        # timer: tiny length can't be set (only 8-15 min); check clock math instead
        await d.screenshot(path='r_director_end.png')
        print('errors:', errs)
        await b.close()
asyncio.run(main())
