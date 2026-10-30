import numpy as np, math, subprocess, sys
from PIL import Image, ImageDraw, ImageFont, ImageFilter, ImageChops
W,H=1080,1920; FPS=30; DUR=35.0; NF=int(FPS*DUR)
rng=np.random.default_rng(3)
F_ANTON="Anton-Regular.ttf"; F_PLAY="PlayfairDisplay.ttf"; F_PLAYI="PlayfairDisplay-Italic.ttf"; F_MARK="PermanentMarker-Regular.ttf"
def font(p,s,w=None):
    f=ImageFont.truetype(p,s)
    if w:
        try: f.set_variation_by_axes([w])
        except Exception: pass
    return f
# ---------- easing
cl=lambda x:max(0.0,min(1.0,x))
def eob(x):
    x=cl(x); c1=1.70158; c3=c1+1; return 1+c3*(x-1)**3+c1*(x-1)**2
def eoc(x): x=cl(x); return 1-(1-x)**3
def eic(x): x=cl(x); return x**3
def eel(x):
    x=cl(x)
    if x in (0,1): return x
    return 2**(-10*x)*math.sin((x*10-0.75)*2*math.pi/3)+1
# ---------- denim texture
WASH={"raw":((18,30,66),0.15),"dark":((28,48,95),0.3),"mid":((52,86,140),0.5),"light":((105,140,185),0.6),"black":((34,36,44),0.3),"bleach":((150,178,210),0.5)}
def lowfreq(w,h,cells,seed):
    r=np.random.default_rng(seed); a=(r.random((cells,max(2,int(cells*w/h))))*255).astype(np.uint8)
    return np.asarray(Image.fromarray(a).resize((w,h),Image.BICUBIC),dtype=np.float32)/255
def denim(w,h,wash="dark",seed=0):
    r=np.random.default_rng(seed); base,fade=WASH[wash]
    y,x=np.mgrid[0:h,0:w].astype(np.float32)
    twill=0.5+0.5*np.sin(2*np.pi*(x-y*0.55)/5.0)
    colv=r.standard_normal(w).astype(np.float32); colv=np.convolve(colv,np.ones(3)/3,'same')
    rowv=r.standard_normal(h).astype(np.float32); rowv=np.convolve(rowv,np.ones(5)/5,'same')
    noise=r.standard_normal((h,w)).astype(np.float32)
    lf=lowfreq(w,h,6,seed+1); lf2=lowfreq(w,h,20,seed+2)
    # whiskers: horizontal streaks
    wh=np.clip(np.convolve(r.standard_normal(h),np.ones(9)/9,'same'),0,None).astype(np.float32)[:,None]*lowfreq(w,h,3,seed+5)
    shade=0.78+0.2*twill+0.06*colv[None,:]+0.05*rowv[:,None]+0.07*noise
    weft=np.clip((twill<0.25)*0.25+noise*0.08,0,1)
    b=np.array(base,np.float32)[None,None,:]
    img=b*shade[...,None]
    light=np.array((200,212,230),np.float32)
    m=np.clip(fade*(lf*0.9+lf2*0.3)-0.25+wh*0.35,0,1)[...,None]
    img=img*(1-m*0.75)+light*m*0.75*shade[...,None]
    img=img*(1-weft[...,None]*0.35)+light*weft[...,None]*0.35
    return Image.fromarray(np.clip(img,0,255).astype(np.uint8))
# ---------- cutout helpers
def jagged(poly,amp,step,r):
    out=[]
    for i in range(len(poly)):
        x0,y0=poly[i]; x1,y1=poly[(i+1)%len(poly)]
        L=math.hypot(x1-x0,y1-y0); n=max(1,int(L/step))
        nx,ny=-(y1-y0)/L,(x1-x0)/L
        for k in range(n):
            t=k/n; d=r.uniform(-amp,amp)
            out.append((x0+(x1-x0)*t+nx*d,y0+(y1-y0)*t+ny*d))
    return out
def dashed(dr,pts,closed,color,width,dash=16,gap=9):
    seq=pts+[pts[0]] if closed else pts
    carry=0.0; on=True; rem=dash
    for i in range(len(seq)-1):
        x0,y0=seq[i]; x1,y1=seq[i+1]; L=math.hypot(x1-x0,y1-y0); pos=0
        while pos<L:
            s=min(rem,L-pos); a=pos/L; b=(pos+s)/L
            if on: dr.line([(x0+(x1-x0)*a,y0+(y1-y0)*a),(x0+(x1-x0)*b,y0+(y1-y0)*b)],fill=color,width=width)
            pos+=s; rem-=s
            if rem<=0: on=not on; rem=dash if on else gap
def inset(poly,d):
    cx=sum(p[0] for p in poly)/len(poly); cy=sum(p[1] for p in poly)/len(poly)
    out=[]
    for x,y in poly:
        dx,dy=cx-x,cy-y; L=math.hypot(dx,dy) or 1; out.append((x+dx/L*d*1.3,y+dy/L*d*1.3))
    return out
GOLD=(222,158,62)
def with_shadow(img,off=(14,18),blur=16,op=150):
    pad=blur*3; w,h=img.size
    out=Image.new("RGBA",(w+pad*2,h+pad*2),(0,0,0,0))
    a=img.split()[3]; sh=Image.new("RGBA",img.size,(0,0,0,0)); sh.putalpha(a.point(lambda v:v*op//255))
    sh2=Image.new("RGBA",out.size,(0,0,0,0)); sh2.paste(sh,(pad+off[0],pad+off[1]),sh)
    sh2=sh2.filter(ImageFilter.GaussianBlur(blur))
    out=Image.alpha_composite(sh2,out); out.alpha_composite(img,(pad,pad)); return out
def patch(w,h,wash,seed,shape="rect",stitch=True,fray=True,poly=None):
    r=np.random.default_rng(seed); SS=2
    tex=denim(w,h,wash,seed).convert("RGBA")
    if poly is None:
        m=12
        if shape=="rect": poly=[(m,m),(w-m,m),(w-m,h-m),(m,h-m)]
        elif shape=="pocket": poly=[(m,m),(w-m,m),(w-m,h*0.72),(w/2,h-m),(m,h*0.72)]
        elif shape=="tilt": poly=[(m+r.uniform(0,40),m),(w-m,m+r.uniform(0,40)),(w-m-r.uniform(0,40),h-m),(m,h-m-r.uniform(0,40))]
    edge=jagged(poly,5 if fray else 2,7,r)
    mask=Image.new("L",(w*SS,h*SS),0); md=ImageDraw.Draw(mask)
    md.polygon([(x*SS,y*SS) for x,y in edge],fill=255)
    mask=mask.resize((w,h),Image.LANCZOS)
    d=ImageDraw.Draw(tex)
    if fray:
        for i in range(len(edge)):
            x,y=edge[i]
            if r.random()<0.6:
                cx,cy=w/2,h/2; dx,dy=x-cx,y-cy; L=math.hypot(dx,dy); l=r.uniform(3,12)
                d.line([(x,y),(x+dx/L*l,y+dy/L*l)],fill=(215,222,235,255),width=2)
        d.line(edge+[edge[0]],fill=(170,185,210,255),width=4)
        # expand mask for fray threads
        mask=ImageChops.lighter(mask,mask.filter(ImageFilter.MaxFilter(9)).point(lambda v:255 if v>0 and r.random()<1 else 0).filter(ImageFilter.GaussianBlur(1)).point(lambda v: v*0.0)) 
    if stitch:
        p1=inset(poly,18); dashed(d,p1,True,GOLD,4)
        if shape=="pocket":
            p2=inset(poly,32); dashed(d,p2,True,GOLD,4)
            dashed(d,[(28,h*0.28),(w-28,h*0.28)],False,GOLD,4)
    # darker seam shading near edge
    tex.putalpha(mask)
    return tex
def rivet(img,x,y,r=13):
    d=ImageDraw.Draw(img)
    d.ellipse([x-r,y-r,x+r,y+r],fill=(150,95,45,255)); d.ellipse([x-r+3,y-r+3,x+r-3,y+r-3],fill=(200,140,70,255))
    d.ellipse([x-r+7,y-r+5,x-1,y-2],fill=(240,200,140,255))
def paper(text,fnt,fg,bg,pad=(36,18),seed=0,torn=True):
    r=np.random.default_rng(seed)
    b=fnt.getbbox(text); tw,th=b[2]-b[0],b[3]-b[1]
    w,h=tw+pad[0]*2,th+pad[1]*2
    img=Image.new("RGBA",(w,h),(0,0,0,0))
    if bg is not None:
        m=Image.new("L",(w,h),0); poly=jagged([(4,4),(w-4,4),(w-4,h-4),(4,h-4)],3 if torn else 0.1,6,r)
        ImageDraw.Draw(m).polygon(poly,fill=255)
        layer=Image.new("RGBA",(w,h),bg+(255,))
        n=(r.standard_normal((h,w))*6).astype(np.int16)
        arr=np.asarray(layer).astype(np.int16); arr[...,:3]+=n[...,None]; layer=Image.fromarray(np.clip(arr,0,255).astype(np.uint8))
        layer.putalpha(m); img=layer
    ImageDraw.Draw(img).text((pad[0]-b[0],pad[1]-b[1]),text,font=fnt,fill=fg)
    return img
def textimg(text,fnt,fg,stroke=0,sc=None):
    b=fnt.getbbox(text,stroke_width=stroke); w,h=b[2]-b[0]+4,b[3]-b[1]+4
    img=Image.new("RGBA",(w,h),(0,0,0,0))
    ImageDraw.Draw(img).text((2-b[0],2-b[1]),text,font=fnt,fill=fg,stroke_width=stroke,stroke_fill=sc)
    return img
def denim_text(text,fnt,wash,seed):
    """letters cut out of denim"""
    m=textimg(text,fnt,(255,255,255,255)).split()[3]
    w,h=m.size; t=denim(w,h,wash,seed).convert("RGBA")
    edge=m.filter(ImageFilter.FIND_EDGES)
    t.paste((200,212,230),(0,0),edge)
    t.putalpha(m); return t
# ---------- compositing
def place(canvas,img,cx,cy,scale=1.0,rot=0.0,alpha=1.0):
    if scale<=0.01 or alpha<=0.01: return
    if abs(scale-1)>1e-3: img=img.resize((max(1,int(img.width*scale)),max(1,int(img.height*scale))),Image.BILINEAR)
    if abs(rot)>0.05: img=img.rotate(rot,Image.BICUBIC,expand=True)
    if alpha<0.999:
        a=img.split()[3].point(lambda v:int(v*alpha)); img=img.copy(); img.putalpha(a)
    canvas.alpha_composite(img,(int(cx-img.width/2),int(cy-img.height/2)))
# ---------- pizza
def pizza(D=620):
    SS=2; d=D*SS; img=Image.new("RGBA",(d,d),(0,0,0,0)); dr=ImageDraw.Draw(img); r=np.random.default_rng(11)
    dr.ellipse([0,0,d,d],fill=(196,128,58)); dr.ellipse([18,18,d-18,d-18],fill=(214,150,72))
    dr.ellipse([60,60,d-60,d-60],fill=(186,48,32))
    # cheese blobs
    for _ in range(140):
        a=r.uniform(0,2*math.pi); rr=r.uniform(0,d/2-90); x=d/2+math.cos(a)*rr; y=d/2+math.sin(a)*rr; s=r.uniform(30,70)
        dr.ellipse([x-s,y-s*0.8,x+s,y+s*0.8],fill=(250,206,96))
    for _ in range(60):
        a=r.uniform(0,2*math.pi); rr=r.uniform(0,d/2-100); x=d/2+math.cos(a)*rr; y=d/2+math.sin(a)*rr; s=r.uniform(8,22)
        dr.ellipse([x-s,y-s,x+s,y+s],fill=(255,232,150))
    for _ in range(14):
        a=r.uniform(0,2*math.pi); rr=r.uniform(40,d/2-150); x=d/2+math.cos(a)*rr; y=d/2+math.sin(a)*rr; s=r.uniform(48,62)
        dr.ellipse([x-s,y-s,x+s,y+s],fill=(160,30,28)); dr.ellipse([x-s+10,y-s+10,x+s-14,y+s-14],fill=(190,44,36))
        for _ in range(4):
            ox,oy=r.uniform(-s*0.6,s*0.6),r.uniform(-s*0.6,s*0.6); dr.ellipse([x+ox-5,y+oy-5,x+ox+5,y+oy+5],fill=(130,22,20))
    for _ in range(30):
        a=r.uniform(0,2*math.pi); rr=r.uniform(0,d/2-100); x=d/2+math.cos(a)*rr; y=d/2+math.sin(a)*rr
        dr.ellipse([x-9,y-5,x+9,y+5],fill=(60,120,50))
    for k in range(4):
        a=k*math.pi/4; dr.line([(d/2-math.cos(a)*d/2,d/2-math.sin(a)*d/2),(d/2+math.cos(a)*d/2,d/2+math.sin(a)*d/2)],fill=(150,90,40),width=7)
    return with_shadow(img.resize((D,D),Image.LANCZOS),off=(16,22),blur=18,op=170)
# ---------- ticket
def ticket(n,seed):
    w,h=430,210; img=Image.new("RGBA",(w,h),(0,0,0,0)); m=Image.new("L",(w,h),0); md=ImageDraw.Draw(m)
    md.rounded_rectangle([0,0,w,h],18,fill=255)
    for y in (0,h):
        md.ellipse([w*0.68-22,y-22,w*0.68+22,y+22],fill=0)
    base=Image.new("RGBA",(w,h),(242,232,210,255)); d=ImageDraw.Draw(base)
    d.rectangle([0,0,w*0.68,h],fill=(200,58,48)) if seed%2==0 else d.rectangle([0,0,w*0.68,h],fill=(32,52,100))
    dashed(d,[(w*0.68,26),(w*0.68,h-26)],False,(242,232,210),4,10,8)
    f1=font(F_ANTON,120); f2=font(F_ANTON,34); f3=font(F_MARK,40)
    d.text((26,30),f"0{n}",font=f1,fill=(242,232,210))
    d.text((180,52),"TICKET",font=f2,fill=(242,232,210)); d.text((180,96),"RIFA",font=f2,fill=GOLD)
    d.text((w*0.68+22,64),"JEAN",font=font(F_ANTON,36),fill=(32,52,100)); d.text((w*0.68+22,108),"DAY",font=font(F_ANTON,36),fill=(200,58,48))
    base.putalpha(m); return with_shadow(base,off=(10,14),blur=12,op=150)
def leather_tag(text,sub,w=640,h=380):
    img=Image.new("RGBA",(w,h),(0,0,0,0)); m=Image.new("L",(w,h),0)
    ImageDraw.Draw(m).rounded_rectangle([0,0,w,h],34,fill=255)
    r=np.random.default_rng(5); n=lowfreq(w,h,30,9)*40+r.standard_normal((h,w))*6
    base=np.stack([128+n,78+n*0.7,42+n*0.5],-1); t=Image.fromarray(np.clip(base,0,255).astype(np.uint8)).convert("RGBA")
    d=ImageDraw.Draw(t); dashed(d,[(26,26),(w-26,26),(w-26,h-26),(26,h-26)],True,(236,200,140),5,18,10)
    fb=font(F_ANTON,230); b=fb.getbbox(text); tx=(w-(b[2]-b[0]))/2-b[0]; ty=(h-(b[3]-b[1]))/2-b[1]-30
    d.text((tx+3,ty+4),text,font=fb,fill=(70,38,18)); d.text((tx-2,ty-2),text,font=fb,fill=(190,130,80)); d.text((tx,ty),text,font=fb,fill=(96,54,26))
    fs=font(F_PLAYI,50); fs.set_variation_by_axes([700]); b=fs.getbbox(sub); d.text(((w-(b[2]-b[0]))/2-b[0],h-100),sub,font=fs,fill=(236,200,140))
    t.putalpha(m); return with_shadow(t,off=(14,20),blur=18,op=170)
# ================= ASSETS
print("assets...",file=sys.stderr)
BG=denim(W+160,H+160,"raw",100).convert("RGBA")
BG2=denim(W+160,H+160,"black",101).convert("RGBA")
BG3=denim(W+160,H+160,"mid",102).convert("RGBA")
P={}
P["strip1"]=with_shadow(patch(1300,300,"light",1,"tilt"))
P["strip2"]=with_shadow(patch(1300,260,"bleach",2,"tilt"))
P["strip3"]=with_shadow(patch(1300,240,"black",3,"tilt"))
P["sq1"]=with_shadow(patch(520,460,"mid",4,"tilt"))
P["sq2"]=with_shadow(patch(460,520,"light",5,"tilt"))
P["sq3"]=with_shadow(patch(380,380,"bleach",6,"tilt"))
P["sq4"]=with_shadow(patch(420,340,"black",7,"tilt"))
pk=patch(720,800,"mid",8,"pocket"); rivet(pk,40,40); rivet(pk,680,40); P["pocket"]=with_shadow(pk)
pk2=patch(560,620,"light",9,"pocket"); rivet(pk2,34,34); rivet(pk2,526,34); P["pocket2"]=with_shadow(pk2)
P["wipe"]=patch(2600,900,"dark",10,"rect",stitch=False)
P["wipeb"]=patch(2600,900,"bleach",12,"rect",stitch=False)
FA=lambda s:font(F_ANTON,s)
def FPI(s,w=600): f=font(F_PLAYI,s); f.set_variation_by_axes([w]); return f
def FP(s,w=800): f=font(F_PLAY,s); f.set_variation_by_axes([w]); return f
CREAM=(244,236,220); INK=(18,24,44); RED=(214,58,46)
T={}
T["JEAN"]=with_shadow(denim_text("JEAN",FA(400),"bleach",20),blur=12)
T["DAY"]=with_shadow(textimg("DAY",FA(400),CREAM),blur=12)
T["edition"]=paper("the denim edition",FPI(64),INK,CREAM,seed=1)
T["llega"]=textimg("¡se viene!",font(F_MARK,92),RED)
T["06"]=with_shadow(denim_text("06",FA(760),"light",21),blur=14)
T["NOV"]=with_shadow(paper("NOV",FA(210),CREAM,RED,pad=(40,10),seed=2),blur=10)
T["noviembre"]=paper("noviembre · 2026",FPI(62),INK,CREAM,seed=3)
T["save"]=textimg("save the date",font(F_MARK,80),CREAM)
T["entrada"]=with_shadow(paper("ENTRADA",FA(150),INK,CREAM,pad=(40,8),seed=4),blur=10)
T["tag"]=leather_tag("3K","aporte de entrada")
T["solo"]=textimg("tu pase al look del día",FPI(58,500),CREAM)
T["cancel"]=paper("con la cancelación de tu aporte",FPI(54,600),INK,CREAM,seed=5)
T["part"]=paper("participas en la",FPI(54,600),INK,CREAM,seed=6)
T["RIFA"]=with_shadow(denim_text("RIFA",FA(330),"bleach",22),blur=12)
T["pizza_t"]=with_shadow(paper("UNA PIZZA",FA(150),CREAM,RED,pad=(36,8),seed=7),blur=10)
T["ymas"]=textimg("¡y más!",font(F_MARK,120),GOLD,stroke=4,sc=INK)
T["4"]=with_shadow(denim_text("4",FA(900),"bleach",23),blur=14)
T["oport"]=with_shadow(paper("OPORTUNIDADES",FA(120),CREAM,INK,pad=(30,8),seed=8),blur=10)
T["deganar"]=paper("de ganar",FPI(90,800),INK,CREAM,seed=9)
T["ven"]=textimg("ven en jean",font(F_MARK,110),RED,stroke=5,sc=CREAM)
T["sum1"]=with_shadow(paper("6 NOV",FA(140),CREAM,RED,pad=(34,6),seed=10),blur=10)
T["sum2"]=with_shadow(paper("ENTRADA 3K",FA(110),INK,CREAM,pad=(30,6),seed=11),blur=10)
T["sum3"]=paper("rifa · pizza · y más · 4 chances",FPI(48,600),CREAM,INK,seed=12)
PZ=pizza(600); TK=[ticket(i+1,i) for i in range(4)]
# grain + vignette
GR=[(np.random.default_rng(50+i).standard_normal((H,W))*9).astype(np.float32) for i in range(6)]
yy,xx=np.mgrid[0:H,0:W]; vig=(1-0.45*np.clip(((xx-W/2)/(W*0.75))**2+((yy-H/2)/(H*0.7))**2,0,1)).astype(np.float32)[...,None]
# ================= SCENES
BEAT0=1.0
def bgpan(canvas,bg,t,sp=12):
    ox=int(80+math.sin(t*0.4)*60); oy=int(80+math.cos(t*0.3)*60)
    canvas.paste(bg.crop((ox,oy,ox+W,oy+H)),(0,0))
def slide(t,t0,dur=0.5): return eob((t-t0)/dur)
def s1(c,t):
    bgpan(c,BG,t)
    place(c,P["strip1"],W/2+(1-eoc((t-0.0)/0.6))*-1400,520,1,-12)
    place(c,P["sq1"],230+(1-eob((t-0.15)/0.5))*-700,1300,1,8)
    place(c,P["sq3"],900+(1-eob((t-0.3)/0.5))*700,1560,1,-14)
    place(c,P["strip3"],W/2+(1-eoc((t-0.45)/0.6))*1400,1500,0.95,9)
    k=slide(t,0.95,0.35); place(c,T["JEAN"],W/2,640,2.6-1.6*k if k>0 else 0,-6,cl((t-0.95)/0.1))
    k=slide(t,1.45,0.35); place(c,T["DAY"],W/2+30,1040,2.6-1.6*k if k>0 else 0,4,cl((t-1.45)/0.1))
    place(c,T["edition"],W/2,1330+(1-eoc((t-2.0)/0.4))*120,1,-3,cl((t-2.0)/0.3))
    place(c,T["llega"],760,300,eob((t-2.5)/0.4),-10)
def s2(c,t):
    lt=t-4.2; bgpan(c,BG2,t)
    place(c,P["sq2"],250,620+(1-eoc(lt/0.5))*-900,1,-10)
    place(c,P["strip2"],W/2+(1-eoc((lt-0.1)/0.5))*1400,1450,1,-8)
    k=eob((lt-0.25)/0.5); place(c,T["06"],W/2,820,(0.4+0.6*k) if lt>0.25 else 0,-4+3*math.sin(lt*2),cl((lt-0.25)/0.15))
    place(c,T["NOV"],W/2+170,1240+(1-eob((lt-0.7)/0.4))*500,1,6,cl((lt-0.7)/0.05))
    place(c,T["noviembre"],W/2-80,1460,1,-3,cl((lt-1.1)/0.3))
    place(c,T["save"],W/2,330,eob((lt-1.6)/0.4),-6)
    # stitched circle
    if lt>0.9:
        d=ImageDraw.Draw(c); p=eoc((lt-0.9)/0.8); pts=[]
        for i in range(int(90*p)+2):
            a=-math.pi/2+i/90*2*math.pi; pts.append((W/2+math.cos(a)*440,820+math.sin(a)*400))
        dashed(d,pts,False,GOLD,7,22,12)
def s3(c,t):
    lt=t-9.0; bgpan(c,BG3,t)
    place(c,P["sq4"],880,420+(1-eoc(lt/0.5))*-800,1,12)
    place(c,P["sq1"],180,1620+(1-eoc((lt-0.1)/0.5))*800,0.9,-8)
    place(c,T["entrada"],W/2,520+(1-eob((lt-0.2)/0.4))*-600,1,-4)
    sw=math.sin(lt*2.2)*6*math.exp(-lt*0.3)
    k=eel((lt-0.5)/1.0)
    ty=1000+(1-k)*-900 if lt>0.5 else -900
    if lt>0.5:
        d=ImageDraw.Draw(c); d.line([(W/2,0),(W/2+math.sin(math.radians(-sw))*0,ty-180)],fill=(236,200,140),width=6)
    place(c,T["tag"],W/2,ty,1.15,sw)
    place(c,T["solo"],W/2,1430,1,0,cl((lt-1.4)/0.4))
def s4(c,t):
    lt=t-14.0; bgpan(c,BG,t)
    place(c,P["pocket"],W/2,1080+(1-eoc(lt/0.6))*1300,1.15,-3)
    place(c,PZ,W/2,1130+(1-eob((lt-0.5)/0.6))*1300,1,lt*12)
    place(c,T["cancel"],W/2,250+(1-eoc((lt-0.3)/0.4))*-400,1,-2)
    place(c,T["part"],W/2-140,360+(1-eoc((lt-0.5)/0.4))*-500,1,2)
    k=slide(t,14.0+1.6,0.35); place(c,T["RIFA"],W/2+60,560,2.4-1.4*k if k>0 else 0,-5,cl((lt-1.6)/0.1))
    place(c,T["pizza_t"],W/2,1640+(1-eob((lt-3.2)/0.4))*500,1,-4)
    place(c,T["ymas"],800,1790,eob((lt-4.8)/0.4)*(1+0.05*math.sin(lt*8)),-12)
def s5(c,t):
    lt=t-22.0; bgpan(c,BG2,t)
    place(c,P["strip1"],W/2,300+(1-eoc(lt/0.5))*-700,1,6)
    k=slide(t,22.5,0.4); place(c,T["4"],300,640,2.2-1.2*k if k>0 else 0,-6,cl((lt-0.5)/0.1))
    place(c,T["oport"],640,660+(1-eob((lt-1.0)/0.4))*1200,1,-90 if False else 0)
    place(c,T["deganar"],760,840,eob((lt-1.3)/0.4),-4)
    pos=[(300,1180,-8),(780,1260,7),(320,1560,6),(780,1650,-6)]
    for i,(x,y,r) in enumerate(pos):
        tp=2.0+i*0.5; place(c,TK[i],x,y,(1.6-0.6*eob((lt-tp)/0.3)) if lt>tp else 0,r,cl((lt-tp)/0.08))
def s6(c,t):
    lt=t-28.0; bgpan(c,BG3,t)
    place(c,P["strip3"],W/2+(1-eoc(lt/0.5))*1400,420,1,-8)
    place(c,P["pocket2"],820,1500+(1-eoc((lt-0.1)/0.5))*900,1,10)
    place(c,P["sq3"],200,1380+(1-eoc((lt-0.2)/0.5))*-900,1,-12)
    place(c,T["JEAN"],W/2-20,660,eob((lt-0.2)/0.4)*0.85,-6)
    place(c,T["DAY"],W/2+40,980,eob((lt-0.45)/0.4)*0.85,4)
    place(c,T["sum1"],330,1250+(1-eob((lt-0.9)/0.4))*800,1,-6)
    place(c,T["sum2"],660,1420+(1-eob((lt-1.2)/0.4))*800,1,4)
    place(c,T["sum3"],W/2,1600,1,-2,cl((lt-1.6)/0.4))
    place(c,T["ven"],W/2,240,eob((lt-2.2)/0.4)*(1+0.04*math.sin(lt*6)),-6)
SC=[(0,4.2,s1),(4.2,9.0,s2),(9.0,14.0,s3),(14.0,22.0,s4),(22.0,28.0,s5),(28.0,35.1,s6)]
TRANS=[4.2,9.0,14.0,22.0,28.0]
def frame(i):
    t=i/FPS
    c=Image.new("RGBA",(W,H),(0,0,0,255))
    for a,b,f in SC:
        if a<=t<b: f(c,t); break
    # denim wipe transition
    for k,tr in enumerate(TRANS):
        d=t-tr
        if -0.35<d<0.35:
            p=(d+0.35)/0.7; img=P["wipe"] if k%2==0 else P["wipeb"]
            y=-1300+p*(H+2600); place(c,img,W/2,y,1,-18)
    # beat pulse zoom + shake
    if t>=BEAT0:
        sb=(t-BEAT0)%0.5; z=1+0.018*math.exp(-sb*10)
    else: z=1
    for tr in [1.0,1.5,4.45,9.5,15.6,22.5,28.0]:
        if 0<=t-tr<0.25: z+=0.03*(1-(t-tr)/0.25)
    if z>1.001:
        nw,nh=int(W*z),int(H*z); c=c.resize((nw,nh),Image.BILINEAR)
        sx=(nw-W)//2+int(math.sin(t*90)*3); sy=(nh-H)//2+int(math.cos(t*70)*3)
        c=c.crop((sx,sy,sx+W,sy+H))
    a=np.asarray(c.convert("RGB")).astype(np.float32)
    a=a*vig+GR[i%6][...,None]
    # flash on scene cuts
    for tr in [1.0,1.5]+TRANS:
        d=t-tr
        if 0<=d<0.1: a=a+(1-d/0.1)*45
    # fade out
    if t>33.6: a*=max(0,(35-t)/1.4)
    if t<0.25: a*=t/0.25
    return np.clip(a,0,255).astype(np.uint8)
if __name__=="__main__":
    if len(sys.argv)>1 and sys.argv[1]=="preview":
        for tt in [float(x) for x in sys.argv[2:]]:
            Image.fromarray(frame(int(tt*FPS))).save(f"prev_{tt:05.1f}.jpg",quality=85)
        sys.exit()
    p=subprocess.Popen(["ffmpeg","-y","-loglevel","error","-f","rawvideo","-pix_fmt","rgb24","-s",f"{W}x{H}","-r",str(FPS),"-i","-",
        "-i","mix.wav","-c:v","libx264","-preset","medium","-crf","19","-pix_fmt","yuv420p","-c:a","aac","-b:a","192k","-shortest","-movflags","+faststart","reel_jean_day.mp4"],stdin=subprocess.PIPE)
    for i in range(NF):
        p.stdin.write(frame(i).tobytes())
        if i%60==0: print(i,file=sys.stderr)
    p.stdin.close(); p.wait()
