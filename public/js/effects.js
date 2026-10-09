export function celebrate(theme,combo,settings){
  const fx=document.querySelector('#fx');fx.replaceChildren();if(settings.effects==='off')return;
  const reduced=matchMedia('(prefers-reduced-motion: reduce)').matches;
  const milestone=[5,10,20].includes(combo),word=document.createElement('div');word.className='fx-word';word.textContent=theme==='boss'&&combo%10===0?'BOSS BREAK!':theme==='cyber'?'DEFENSE!':milestone?combo+' COMBO!':'PERFECT!';
  const sub=document.createElement('small');sub.textContent=milestone?combo===20?'UNSTOPPABLE':combo===10?'OVERDRIVE':'ON FIRE':theme==='boss'?'-'+(100+combo*25)+' DAMAGE':'+ SECURITY XP';word.append(sub);fx.append(word);
  if(!reduced&&settings.effects!=='low'){
    for(let i=0;i<2;i++){const ring=document.createElement('i');ring.className='shock'+(i?' second':'');fx.append(ring);}
    const count=settings.effects==='high'?(milestone?55:32):16;
    for(let i=0;i<count;i++){const p=document.createElement('i');p.className='particle';const angle=2*Math.PI*i/count,distance=120+Math.random()*280;p.style.setProperty('--dx',Math.cos(angle)*distance+'px');p.style.setProperty('--dy',Math.sin(angle)*distance+'px');p.style.background=i%2?'var(--hot)':'var(--cool)';fx.append(p);}
    if(settings.effects==='high')for(let i=0;i<10;i++){const l=document.createElement('i');l.className='speed-line';l.style.rotate=(i*36)+'deg';fx.append(l);}
    if(theme==='cyber'){const shield=document.createElement('i');shield.className='shield-pulse';fx.append(shield);}
    if(theme==='boss'){document.querySelector('main').classList.add('hit');setTimeout(()=>document.querySelector('main').classList.remove('hit'),400);}
  }
  if(settings.vibration)navigator.vibrate?.(milestone?[35,40,50]:25);
  setTimeout(()=>{if(fx.contains(word))fx.replaceChildren();},1100);
}
