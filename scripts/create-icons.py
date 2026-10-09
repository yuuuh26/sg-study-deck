from PIL import Image,ImageDraw,ImageFilter
from pathlib import Path
root=Path(__file__).resolve().parents[1]/'public/icons';root.mkdir(exist_ok=True)
N=1536;s=N/512
im=Image.new('RGB',(N,N));p=im.load()
for y in range(N):
 for x in range(N):
  r=((x-N*.65)**2+(y-N*.3)**2)**.5/(N*.85);w=max(0,1-r)
  p[x,y]=(int(13+34*w),int(10+9*w),int(39+48*w))
d=ImageDraw.Draw(im)
P=lambda pts:[(round(x*s),round(y*s)) for x,y in pts]
for offset in range(0,4):
 box=[int((62+offset*12)*s),int((62+offset*12)*s),int((450-offset*12)*s),int((450-offset*12)*s)]
 d.arc(box,225,322,fill=(76,220,236),width=int(2*s));d.arc(box,28,175,fill=(161,80,238),width=int(2*s))
shield=[(256,124),(356,163),(345,282),(313,341),(256,381),(199,341),(167,282),(156,163)]
glow=Image.new('RGBA',(N,N));g=ImageDraw.Draw(glow);g.polygon(P(shield),outline=(190,94,255),width=int(7*s));im=Image.alpha_composite(im.convert('RGBA'),glow.filter(ImageFilter.GaussianBlur(8*s)));d=ImageDraw.Draw(im)
d.polygon(P(shield),fill=(34,22,69),outline=(197,116,255),width=int(6*s))
d.line(P([(256,137),(256,360)]),fill=(63,49,99),width=int(2*s))
lightning=[(274,163),(214,260),(251,260),(234,335),(308,229),(268,229)]
d.polygon(P(lightning),fill=(103,255,231));d.line(P([(274,163),(214,260),(251,260)]),fill=(210,255,247),width=int(3*s))
for x,y in [(95,244),(417,267),(204,98),(349,401)]:d.ellipse((int((x-3)*s),int((y-3)*s),int((x+3)*s),int((y+3)*s)),fill=(251,106,213))
for size in [192,512]:im.convert('RGB').resize((size,size),Image.Resampling.LANCZOS).save(root/f'icon-{size}.png')
im.convert('RGB').resize((512,512),Image.Resampling.LANCZOS).save(root/'maskable-512.png')
