import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio
exec(open(os.path.join(HERE,'phone_holo.py')).read().split('async def main')[0])
async def open_jaw(page, code):
    await page.goto('http://localhost:8773/index.html'); await page.wait_for_timeout(300)
    await page.fill('#round-input', code); await page.click('a[data-role=xeno]'); await page.wait_for_timeout(200)
    n = await page.evaluate('state.round.nodeShard.glyph')
    await page.click('#start-cam .manual-open'); await page.click(f'#shard-pick [data-n="{n}"]'); await page.wait_for_timeout(1400)
async def tap(page, i):
    x,y = await page.evaluate(f'AR.model.screenOf({i})'); await page.mouse.click(x,y); await page.wait_for_timeout(350)
async def main():
    srv=subprocess.Popen(['python3','-m','http.server','8773','-d',OUT],stdout=subprocess.DEVNULL,stderr=subprocess.DEVNULL); time.sleep(1)
    async with async_playwright() as p:
        b=await p.chromium.launch(executable_path=CHROMIUM,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        ctx=await b.new_context(viewport={'width':390,'height':844},device_scale_factor=2,is_mobile=True,has_touch=True)
        page=await ctx.new_page(); errs=[]
        page.on('pageerror',lambda e:errs.append(str(e))); page.on('console',lambda m: errs.append('console:'+m.text) if m.type=='error' and 'WebSocket' not in m.text else None)
        await page.route('**/*',route)
        await open_jaw(page,'4821')
        info = await page.evaluate('({teeth: state.round.glyph.teeth, answer: state.round.glyph.answer, glyphs: state.round.glyph.glyphs})'); print(info)
        print('status:', await page.text_content('#status'), '| help:', (await page.text_content('#ar-help'))[:60])
        await page.screenshot(path='j_open.png')
        # right four teeth in order
        for k,g in enumerate(info['answer']):
            await tap(page, info['teeth'].index(g))
            if k==1: await page.screenshot(path='j_closing.png')
        await page.wait_for_timeout(900)
        print('solved:', await page.evaluate("state.solved.has('glyph')"), '| strikes:', await page.evaluate('state.strikes'), '| step:', await page.evaluate('state.glyphStep'))
        await page.screenshot(path='j_solved.png')
        # wrong tooth
        await open_jaw(page,'1234')
        info = await page.evaluate('({teeth: state.round.glyph.teeth, answer: state.round.glyph.answer})')
        wrong = [i for i,g in enumerate(info['teeth']) if g not in info['answer']][0]
        await tap(page, wrong); await page.wait_for_timeout(250); await page.screenshot(path='j_snap.png')
        print('wrong tooth  strikes:', await page.evaluate('state.strikes'), '| snapping:', await page.evaluate('!!state.jaw.snapAt'))
        await page.wait_for_timeout(1800)
        print('after reopen  down:', await page.evaluate('state.jaw.down'), '| step:', await page.evaluate('state.glyphStep'))
        # dragging beside the jaw still turns it; tapping a pressed tooth twice does nothing
        await page.mouse.move(40,300); await page.mouse.down(); await page.mouse.move(120,300,steps=5); await page.mouse.up()
        print('turn by dragging empty space  spin:', await page.evaluate('+view3d.spin.toFixed(2)'))
        await page.click('#holo-reset')
        # timer: first right tooth, then wait it out
        await tap(page, info['teeth'].index(info['answer'][0]))
        print('armed:', await page.evaluate('!!state.jaw.armedAt'), '| step:', await page.evaluate('state.glyphStep'))
        await page.wait_for_timeout(20600)
        print('after 20 s  strikes:', await page.evaluate('state.strikes'), '| toast:', await page.text_content('#toast'))
        # rule card reference lexicon
        await page.click('#holo-card'); await page.wait_for_timeout(300); await page.screenshot(path='j_card.png')
        print('errors:', errs)
        await b.close()
    srv.terminate()
asyncio.run(main())
