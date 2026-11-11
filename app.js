(() => {
  const menu = document.querySelector('.menu-toggle');
  const nav = document.querySelector('.main-nav');
  if (menu && nav) {
    menu.addEventListener('click', () => { const open = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-expanded', String(!open)); nav.classList.toggle('open', !open); });
    nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { menu.setAttribute('aria-expanded', 'false'); nav.classList.remove('open'); }));
  }
  document.querySelectorAll('[data-back-top]').forEach(link => link.addEventListener('click', event => { event.preventDefault(); window.scrollTo({top:0,behavior:'smooth'}); }));
  if (window.WLO_CATALOG || window.WLO_SITE_COUNTS) {
    const petCount=document.querySelector('[data-pet-count]'),bagCount=document.querySelector('[data-bag-count]');
    if(petCount)petCount.textContent=window.WLO_SITE_COUNTS ? window.WLO_SITE_COUNTS.pets : window.WLO_CATALOG.pets.length;
    if(bagCount)bagCount.textContent=window.WLO_SITE_COUNTS ? window.WLO_SITE_COUNTS.bags : window.WLO_CATALOG.bags.length;
  }

  const list=document.getElementById('news-list');
  const dialog=document.getElementById('news-dialog');
  if(list && dialog && window.SITE_CONTENT) {
    let lastFocused=null;
    const tabs=[...document.querySelectorAll('[data-news]')];
    function openNews(item){
      lastFocused=document.activeElement;
      document.getElementById('dialog-category').textContent='新闻中心 / '+item.category;
      document.getElementById('dialog-title').textContent=item.title;
      document.getElementById('dialog-date').textContent=item.date || '地表最强 · 玩家资讯';
      document.getElementById('dialog-body').replaceChildren(...item.body.map(text=>{const p=document.createElement('p');p.textContent=text;return p;}));
      dialog.showModal();
    }
    function render(category){
      const items=window.SITE_CONTENT.news.filter(item=>category==='全部'||item.category===category);
      list.replaceChildren();
      if(!items.length){const p=document.createElement('p');p.className='empty-news';p.textContent='暂无相关资讯。';list.append(p);return;}
      items.forEach(item=>{
        const button=document.createElement('button');button.type='button';button.className='news-row';
        const tag=document.createElement('span');tag.className='news-tag';tag.textContent=item.category;
        const title=document.createElement('span');title.className='news-row-title';title.textContent=item.title;
        const date=document.createElement('time');date.textContent=item.date?item.date.slice(5).replace('-','/'):'—';if(item.date)date.dateTime=item.date;
        button.append(tag,title,date);button.addEventListener('click',()=>openNews(item));list.append(button);
      });
    }
    tabs.forEach((tab,index)=>{
      tab.addEventListener('click',()=>{tabs.forEach(other=>{const active=other===tab;other.classList.toggle('selected',active);other.setAttribute('aria-selected',String(active));other.tabIndex=active?0:-1;});render(tab.dataset.news);});
      tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();});
    });
    dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(button=>button.addEventListener('click',()=>dialog.close()));
    dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{if(lastFocused)lastFocused.focus();});
    render('全部');
  }

  const carousel=document.querySelector('.feature-carousel');
  if(carousel){
    const slides=[...carousel.querySelectorAll('.promo-slide')],dots=[...carousel.querySelectorAll('[data-slide-to]')];let current=0,timer;
    const show=index=>{current=index;slides.forEach((slide,i)=>{slide.hidden=i!==index;slide.classList.toggle('active',i===index);});dots.forEach((dot,i)=>{dot.classList.toggle('active',i===index);dot.setAttribute('aria-pressed',String(i===index));});};
    const stop=()=>{if(timer)clearInterval(timer);timer=null;};
    const start=()=>{stop();if(!matchMedia('(prefers-reduced-motion: reduce)').matches && !document.hidden)timer=setInterval(()=>show((current+1)%slides.length),6500);};
    dots.forEach(dot=>dot.addEventListener('click',()=>{show(Number(dot.dataset.slideTo));start();}));
    carousel.addEventListener('mouseenter',stop);carousel.addEventListener('mouseleave',start);carousel.addEventListener('focusin',stop);carousel.addEventListener('focusout',event=>{if(!carousel.contains(event.relatedTarget))start();});
    document.addEventListener('visibilitychange',()=>document.hidden?stop():start());show(0);start();
  }
})();
