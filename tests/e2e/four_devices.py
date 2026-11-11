import os, sys
HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
CHROMIUM = os.environ.get('CHROMIUM') or None          # leave unset to use Playwright's own Chromium
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))   # see tests/e2e/README.md
import asyncio
exec(open(os.path.join(HERE,'pathfinder.py')).read().split('async def main')[0])
async def manual(page, node):
    n = await page.evaluate(f'state.round.nodeShard.{node}')
    sel = '#start-cam .manual-open' if await page.is_visible('#start-cam') else '#tray .manual-open'
    await page.click(sel); await page.click(f'#shard-pick [data-n="{n}"]', timeout=90000); await page.wait_for_timeout(900)
async def main():
    async with async_playwright() as pw:
        b=await pw.chromium.launch(executable_path=CHROMIUM,args=['--use-gl=angle','--use-angle=swiftshader','--enable-unsafe-swiftshader'])
        errs=[]; code='7314'
        d=await mk(b,1440,900,errs,'director')
        await d.goto(BASE+'?round='+code+'#director'); await d.wait_for_timeout(1200)
        if not await d.is_disabled('#dir-reset'):
            d.once('dialog', lambda dlg: asyncio.ensure_future(dlg.accept())); await d.click('#dir-reset'); await d.wait_for_timeout(600)
        x=await mk(b,390,844,errs,'xeno',True); a=await mk(b,390,844,errs,'astro',True)
        await x.goto(BASE+'?round='+code); await x.wait_for_timeout(400); await x.click('a[data-role=xeno]'); await x.wait_for_timeout(800)
        await a.goto(BASE+'?round='+code); await a.wait_for_timeout(400); await a.click('a[data-role=astro]'); await a.wait_for_timeout(800)
        p=await mk(b,1120,700,errs,'pathfinder')
        await p.goto(BASE+'pathfinder?round='+code); await p.wait_for_timeout(2000)
        print('crew:', (await d.inner_text('#dir-crew')).replace('\n',' '))
        await key(p,'s',11500)
        await d.click('#dir-start'); await d.wait_for_timeout(900)
        print('orbs on the ring:', await p.evaluate('__aether.orbCount'))
        # ---- Pressure Vent alarm, vented correctly ----
        await d.click('#dir-vent'); await d.wait_for_timeout(900)
        print('alarm 1  VR sees alarm:', await p.evaluate('__aether.pf.ventOn'), '| astro banner:', await a.is_visible('#vent-banner'), (await a.text_content('#vent-banner'))[:40], '| xeno banner:', await x.is_visible('#vent-banner'), '| director:', await d.text_content('#dir-vent-status'))
        await manual(a,'vent'); await a.screenshot(path='f_astro_vent_holo.png')
        await a.click('#holo-card'); await a.wait_for_timeout(300); await a.screenshot(path='f_astro_vent_card.png')
        ans = await a.evaluate('ventAnswer(ventGaugesFor(state.code, Net.state.vent.index), state.round.last)')
        print('gauges:', await a.evaluate('ventGaugesFor(state.code, Net.state.vent.index)'), 'last digit:', await a.evaluate('state.round.last'), '-> vent', ans)
        await a.click(f'[data-vent="{ans}"]'); await a.wait_for_timeout(900)
        print('after correct vent  active:', await d.evaluate('Net.state.vent.active'), '| strikes:', await d.evaluate('Net.state.strikes'), '| log:', (await d.inner_text('#dir-log')).split('\n')[0])
        # ---- second alarm, vented wrongly ----
        await d.click('#dir-vent'); await a.wait_for_timeout(1200)
        ans2 = await a.evaluate('ventAnswer(ventGaugesFor(state.code, Net.state.vent.index), state.round.last)')
        wrong = [c for c in ['Left','Centre','Right'] if c != ans2][0]
        await a.click(f'[data-vent="{wrong}"]'); await a.wait_for_timeout(900)
        print('after wrong vent  strikes:', await d.evaluate('Net.state.strikes'), '| log:', (await d.inner_text('#dir-log')).split('\n')[0])
        await a.click('#sheet-close'); await a.click('#holo-done')
        # ---- VR: alarm view on orb 06 ----
        await d.click('#dir-vent'); await d.wait_for_timeout(600)
        for _ in range(5): await key(p,'ArrowRight',700)
        await p.wait_for_timeout(900); print('VR on orb:', await p.evaluate('__aether.selectedOrb')); await p.screenshot(path='f_vr_vent.png')
        # ---- live ball: the Xenolinguist rolls, the Pathfinder watches ----
        for _ in range(6): await key(p,'ArrowRight',600)   # 06 -> 07 -> 08 -> 01 -> 02 -> 03 -> 04
        print('VR on orb:', await p.evaluate('__aether.selectedOrb'))
        await manual(x,'descent')
        before = await p.evaluate('__aether.pf.live.descent ? __aether.pf.live.descent.p : null')
        await x.evaluate('gravityIn.drag = [0.9, 0.2]'); await x.wait_for_timeout(1200); await x.evaluate('gravityIn.drag = null'); await x.wait_for_timeout(400)
        after = await p.evaluate('__aether.pf.live.descent ? __aether.pf.live.descent.p : null')
        phone = await x.evaluate('AR.model.phys.p.map(v => Math.round(v*1000)/1000)')
        print('live ball  before:', before, '| after:', after, '| phone ball:', phone)
        await p.wait_for_timeout(600); await p.screenshot(path='f_vr_descent.png')
        await x.click('#holo-done')
        # ---- live glyphs ----
        await key(p,'ArrowLeft',900)
        await manual(x,'glyph')
        ans = await x.evaluate('state.round.glyph.answer'); teeth = await x.evaluate('state.round.glyph.teeth')
        async def tooth(name):
            xy = await x.evaluate(f"AR.model.screenOf({teeth.index(name)})"); await x.mouse.click(xy[0], xy[1]); await x.wait_for_timeout(450)
        await tooth(ans[0]); await tooth(ans[1])
        live = await p.evaluate('__aether.pf.live.glyph')
        print('jaw mirrored on VR  step:', live and live.get('step'), '| teeth down:', live and live.get('down'), '| jaw angle:', live and live.get('ang'))
        await p.wait_for_timeout(700); await p.screenshot(path='f_vr_glyph.png')
        await tooth(ans[2]); await tooth(ans[3]); await x.wait_for_timeout(800)
        print('Jaw opened  director solved:', await d.evaluate('Net.state.solved'), '| log:', (await d.inner_text('#dir-log')).split('\n')[0])
        await x.screenshot(path='f_phone_jaw.png')
        # ---- other stages for screenshots ----
        await key(p,'ArrowLeft',1300); await p.screenshot(path='f_vr_resonator.png')
        await key(p,'ArrowLeft',1300); await key(p,'1',500); await p.screenshot(path='f_vr_conduits.png'); await key(p,'2',300)
        for _ in range(4): await key(p,'ArrowRight',600)
        await p.wait_for_timeout(700); await key(p,'1',500); await p.screenshot(path='f_vr_echo.png')
        print('errors:', [e for e in errs if 'WebSocket' not in e and 'ERR_NAME_NOT_RESOLVED' not in e])
        await b.close()
asyncio.run(main())
