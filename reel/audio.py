import numpy as np, soundfile as sf
from scipy.signal import butter, sosfilt
SR=44100; DUR=35.0; N=int(SR*DUR)
rng=np.random.default_rng(7)
mus=np.zeros((N,2))
def add(sig,t,gain=1.0,pan=0.0):
    i=int(t*SR); j=min(N,i+len(sig)); s=sig[:j-i]*gain
    mus[i:j,0]+=s*(1-max(pan,0))
    mus[i:j,1]+=s*(1+min(pan,0))
def bp(x,lo,hi): return sosfilt(butter(2,[lo,hi],btype='band',fs=SR,output='sos'),x)
def hp(x,f): return sosfilt(butter(2,f,btype='high',fs=SR,output='sos'),x)
def lp(x,f): return sosfilt(butter(2,f,btype='low',fs=SR,output='sos'),x)
tt=lambda d: np.arange(int(d*SR))/SR
# kick
t=tt(0.45); f=45+90*np.exp(-t*25); kick=np.sin(2*np.pi*np.cumsum(f)/SR)*np.exp(-t*7)
kick+=0.3*np.exp(-t*200)*rng.standard_normal(len(t))*0.3
clap=bp(rng.standard_normal(int(0.2*SR)),900,3500)*np.exp(-tt(0.2)*22)
hat=hp(rng.standard_normal(int(0.06*SR)),7000)*np.exp(-tt(0.06)*60)
oh=hp(rng.standard_normal(int(0.25*SR)),6000)*np.exp(-tt(0.25)*14)
START=1.0; BEAT=0.5
END_DRUMS=33.0
# progression Am F C G (per bar = 4 beats = 2s)
roots=[55.0, 43.65, 65.41, 49.0]
chords=[[220,261.63,329.63],[174.61,220,261.63],[261.63,329.63,392],[196,246.94,293.66]]
def saw(freq,d):
    t=tt(d); return 2*((t*freq)%1)-1
k=0; tb=START
while tb<END_DRUMS:
    bar=int((tb-START)//2)%4; beat=int(round((tb-START)/BEAT))%4
    # breakdown 21.5-22.5: no kick
    if not (21.4<tb<22.5): add(kick,tb,0.9)
    if beat in (1,3): add(clap,tb,0.35)
    add(hat,tb+0.25,0.22,0.3); add(hat,tb+0.125,0.08,-0.3); add(hat,tb+0.375,0.08,-0.3)
    if beat==3: add(oh,tb+0.25,0.12)
    # bass eighths
    for e in (0,0.25):
        d=0.22; t=tt(d); b=lp(saw(roots[bar],d)+0.5*saw(roots[bar]*2.003,d),700)*np.minimum(1,t*200)*np.exp(-t*6)
        add(b,tb+e,0.32 if e else 0.4)
    tb+=BEAT
# pad
for b in range(18):
    t0=b*2.0; d=2.1; t=tt(d); bar=b%4
    sig=sum(saw(fq,d)+saw(fq*1.004,d) for fq in chords[bar])
    sig=lp(sig,1400)*np.minimum(1,t/0.4)*np.minimum(1,(d-t)/0.4)
    add(sig,t0,0.035)
# risers/whooshes at transitions
for tr in [0.0,4.2,9.0,14.0,22.0,28.0]:
    d=0.9; t=tt(d); w=rng.standard_normal(len(t))
    w=bp(w,800,5000)*(t/d)**2*np.exp(-np.maximum(0,t-0.8)*40)
    add(w,max(0,tr-0.8),0.25)
# impacts
t=tt(1.5); boom=np.sin(2*np.pi*np.cumsum(38+60*np.exp(-t*8))/SR)*np.exp(-t*2.5)
for ti in [1.0,4.2,9.0,14.0,22.5,28.0]: add(boom,ti,0.5)
# stamp sounds on ticket pops
for ti in [24.0,24.5,25.0,25.5]: add(clap*1.5+kick[:len(clap)]*0.5,ti,0.3)
# voice
vt=[1.1,4.6,9.6,14.6,22.6,29.2]
vo=np.zeros((N,2))
for i,t0 in enumerate(vt):
    v,sr=sf.read(f"vd{i}.wav"); assert sr==SR
    a=int(t0*SR); vo[a:a+len(v)]+=v[:N-a]
vo*=0.95/np.max(np.abs(vo))
env=np.abs(vo).mean(1); env=lp(env,8); env=np.convolve(env>0.01,np.ones(int(0.25*SR))/int(0.25*SR),'same')
duck=1-0.5*np.clip(env*3,0,1)
mus*=duck[:,None]
# fades
fade=np.ones(N); fi=int(0.3*SR); fo=int(2.5*SR); fade[:fi]=np.linspace(0,1,fi); fade[-fo:]=np.linspace(1,0,fo)
mus*=fade[:,None]
mus*=0.55/np.max(np.abs(mus))
mix=mus+vo*0.9
mix=np.tanh(mix*1.1)/np.tanh(1.1)
sf.write("mix.wav",mix.astype(np.float32),SR)
print("ok",np.max(np.abs(mix)))
