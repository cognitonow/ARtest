"""Makes a fake camera feed for the browser tests: a printed shard lying on a table, seen by a phone.
Usage: python3 tests/e2e/make_camera_video.py 1   (writes tests/e2e/shard1.y4m; needs Pillow and numpy)"""
import json, numpy as np, math
from PIL import Image, ImageDraw
import sys, subprocess, os
SHARD = int(sys.argv[1]) if len(sys.argv) > 1 else 1
HERE = os.path.dirname(os.path.abspath(__file__))
VENDOR = os.environ.get('VENDOR', os.path.join(HERE, 'vendor'))
JS = "global.window={};const q=require(process.argv[1])(2,'M');q.addData('AETHER-SHARD-'+process.argv[2]);q.make();const n=q.getModuleCount(),m=[];for(let i=0;i<n;i++){m.push([]);for(let j=0;j<n;j++)m[i].push(q.isDark(i,j)?1:0);}console.log(JSON.stringify(m))"
m=json.loads(subprocess.check_output(['node','-e',JS,os.path.join(VENDOR,'qrcode.js'),str(SHARD)])); n=len(m); mod=14; qz=4; mg=40
side=(n+2*qz)*mod; card=Image.new('RGB',(side+2*mg,side+2*mg+50),(248,248,246)); d=ImageDraw.Draw(card)
x0=mg+qz*mod; y0=mg+qz*mod
for i in range(n):
    for j in range(n):
        if m[i][j]: d.rectangle([x0+j*mod,y0+i*mod,x0+(j+1)*mod-1,y0+(i+1)*mod-1],fill=(0,0,0))
cw,ch=card.size; S=n*mod
def to_marker(px,py): return ((px-x0)/S-0.5,(py-y0)/S-0.5)
W,H=480,848; f=0.78*max(W,H); cx,cy=W/2,H/2
def Rx(a): c,s=math.cos(a),math.sin(a); return np.array([[1,0,0],[0,c,-s],[0,s,c]])
def Rz(a): c,s=math.cos(a),math.sin(a); return np.array([[c,-s,0],[s,c,0],[0,0,1]])
def coeffs(src,dst):
    A=[];B=[]
    for (x,y),(X,Y) in zip(dst,src):
        A.append([x,y,1,0,0,0,-X*x,-X*y]);B.append(X); A.append([0,0,0,x,y,1,-Y*x,-Y*y]);B.append(Y)
    return np.linalg.solve(np.array(A,float),np.array(B,float)).tolist()
out=open(os.path.join(HERE,f'shard{SHARD}.y4m'),'wb'); out.write(f"YUV4MPEG2 W{W} H{H} F30:1 Ip A1:1 C420jpeg\n".encode())
for k in range(48):
    a=k/48*2*math.pi
    R=Rx(math.radians(-42+5*math.sin(a)))@Rz(math.radians(8*math.sin(a*0.5)))
    t=np.array([0.25*math.sin(a),0.6,4.6+0.3*math.cos(a)])
    def proj(X,Y):
        p=R@np.array([X,Y,0])+t; return (f*p[0]/p[2]+cx, f*p[1]/p[2]+cy)
    corners=[(0,0),(cw,0),(cw,ch),(0,ch)]
    dst=[proj(*to_marker(*c)) for c in corners]
    bg=Image.new('RGB',(W,H),(112,96,82))
    co=coeffs(corners,dst)
    warped=card.transform((W,H),Image.PERSPECTIVE,co,Image.BILINEAR)
    mask=Image.new('L',card.size,255).transform((W,H),Image.PERSPECTIVE,co,Image.BILINEAR)
    bg.paste(warped,(0,0),mask)
    ycc=np.asarray(bg.convert('YCbCr')).astype(np.float32)
    Y=ycc[:,:,0].astype(np.uint8); U=ycc[:,:,1].reshape(H//2,2,W//2,2).mean((1,3)).astype(np.uint8); V=ycc[:,:,2].reshape(H//2,2,W//2,2).mean((1,3)).astype(np.uint8)
    out.write(b"FRAME\n"+Y.tobytes()+U.tobytes()+V.tobytes())
out.close(); print('ok')
