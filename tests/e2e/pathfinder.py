import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio
from playwright.async_api import async_playwright
LIB={'three.min.js':os.path.join(VENDOR,'three.min.js'),'jsQR.js':os.path.join(VENDOR,'jsQR.js'),'qrcode.js':os.path.join(VENDOR,'qrcode.js')}
async def route(r):
    u=r.request.url
    for k,v in LIB.items():
        if u.endswith(k): return await r.fulfill(path=v, content_type='application/javascript')
    if 'fonts.g' in u: return await r.fulfill(body='', content_type='text/css')
    if 'tailwindcss' in u: return await r.fulfill(body='', content_type='application/javascript')
    await r.continue_()
BASE='http://127.0.0.1:8787/'
async def mk(b,w,h,errs,tag,mobile=False):
    ctx=await b.new_context(viewport={'width':w,'height':h},is_mobile=mobile,has_touch=mobile,device_scale_factor=1)
    p=await ctx.new_page(); await p.route('**/*',route)
    p.on('pageerror',lambda e:errs.append(tag+': '+str(e)))
    p.on('console',lambda m: errs.append(tag+' console: '+m.text) if m.type=='error' else None)
    return p
async def key(p,k,wait=250):
    await p.keyboard.press(k); await p.wait_for_timeout(wait)
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path=CHROMIUM,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader','--autoplay-policy=no-user-gesture-required'])
        errs=[]; code='7314'
        d=await mk(b,1440,900,errs,'director')
        await d.goto(BASE+'?round='+code+'#director'); await d.wait_for_timeout(1200)
        if not await d.is_disabled('#dir-reset'):
            d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(600)
        p=await mk(b,1440,900,errs,'pathfinder')
        await p.goto(BASE+'pathfinder?round='+code); await p.wait_for_timeout(2500)
        print('linked:', await p.text_content('#pf-link-state'), '| crew on director:', (await d.inner_text('#dir-crew')).replace('\n',' '))
        await key(p,'s',11000)
        await p.screenshot(path='pf_conduits.png')
        print('engage in lobby ->', (await key(p,'1',300), await p.evaluate('__aether.pf.engaged'))[1])
        await d.click('#dir-start'); await d.wait_for_timeout(1000)
        print('clock on pathfinder:', await p.text_content('#pf-clock'))
        info = await p.evaluate('({targets: __aether.pf.round.conduits.targets, n: __aether.pf.round.conduits.strands.length})'); print('conduits', info)
        await key(p,'1',500)  # engage
        print('engaged:', await p.evaluate('__aether.pf.engaged'))
        wrong=[i for i in range(1,info['n']+1) if i not in info['targets']][0]
        for _ in range(wrong-1): await key(p,'ArrowRight',120)
        await key(p,'1',600)
        print('after wrong cut  director strikes:', await d.evaluate('Net.state.strikes'), '| pathfinder clock rate:', await p.evaluate('__aether.Net.state.rate'))
        for t in info['targets']:
            cur = await p.evaluate('__aether.pf.cursor')
            for _ in range((t-1-cur) % info['n']): await key(p,'ArrowRight',120)
            await key(p,'1',500)
        await p.wait_for_timeout(800)
        await p.screenshot(path='pf_conduits_open.png')
        print('director solved:', await d.evaluate('Net.state.solved'), '| engaged after solve:', await p.evaluate('__aether.pf.engaged'))
        # walk to every orb for screenshots, then play the Echo Chamber
        for i,name in [(1,'resonator'),(2,'glyph'),(3,'descent'),(4,'echo'),(5,'vent')]:
            await key(p,'ArrowRight',1300)
            await p.screenshot(path=f'pf_{name}.png')
            if name=='echo':
                print('on center:', await p.evaluate('__aether.selectedOrb'))
                await key(p,'1',300); print('echo engaged:', await p.evaluate('__aether.pf.engaged'))
                for st in range(1,5):
                    want = await p.evaluate('(() => { const pf = __aether.pf; const S = pf.echoStages[pf.echoStage-1]; return __aether.echoPress(pf.echoStage, S.shape, S.labels, pf.echoHist, pf.round.cells); })()')
                    cur = await p.evaluate('__aether.pf.cursor')
                    for _ in range((want-1-cur) % 4): await key(p,'ArrowRight',120)
                    await key(p,'1',400)
                await p.wait_for_timeout(600); await p.screenshot(path='pf_echo_open.png')
                print('echo solved on director:', await d.evaluate("Net.state.solved.includes('echo')"))
        await d.screenshot(path='pf_director.png')
        print('director log:', (await d.inner_text('#dir-log')).split('\n')[:5])
        print('errors:', [e for e in errs if 'WebSocket' not in e])
        await b.close()
asyncio.run(main())
