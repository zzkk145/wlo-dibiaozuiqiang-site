(() => {
  const data=window.WLO_CATALOG;
  if(!data)return;
  const titles={pets:'伙伴图鉴',bags:'福袋资料',packs:'礼包一览',guide:'冒险指南'};
  const intros={pets:'在这里查看伙伴的属性、形态与技能。',bags:'搜索福袋名称或内容，展开条目查看物品。',packs:'搜索礼包名称或内容，展开条目查看物品与数量。',guide:'从伙伴、战斗到物品，先熟悉旅途中的基础玩法。'};
  const elements={1:'地',2:'水',3:'火',4:'风'};
  const tabs=[...document.querySelectorAll('[data-tab]')],side=[...document.querySelectorAll('[data-side]')];
  const results=document.getElementById('catalog-results'),count=document.getElementById('catalog-count'),search=document.getElementById('catalog-search');
  const filter=document.getElementById('element-filter'),filterLabel=document.getElementById('element-label'),tools=document.getElementById('catalog-tools');
  const more=document.getElementById('load-more'),dialog=document.getElementById('pet-dialog');
  let current='pets',limit=24,lastFocused=null;
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function petArt(id,featured,reborn=false){
    const art=node('span','pet-art');
    const source=(window.WLO_PET_IMAGES||{})[id];
    if(source){const img=node('img');img.src=source;img.alt='';img.loading='lazy';art.append(img);}
    else if(featured){art.classList.add(id===34580||id===34581?'pet-lubu':'pet-wind');if(reborn)art.classList.add('reborn');}
    return art;
  }
  function itemArt(id){
    const source=(window.WLO_ITEM_IMAGES||{})[id];
    if(!source)return null;
    const img=node('img','item-icon');img.src=source;img.alt='';img.loading='lazy';return img;
  }
  function selectTab(name,updateHash=true){
    if(!titles[name])name='pets';current=name;limit=24;search.value='';filter.value='all';
    document.getElementById('catalog-title').textContent=titles[name];document.getElementById('catalog-intro').textContent=intros[name];
    tabs.forEach(t=>{const active=t.dataset.tab===name;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;t.classList.toggle('selected',active);});
    side.forEach(a=>a.classList.toggle('selected',a.dataset.side===name));
    tools.hidden=name==='guide';filterLabel.hidden=name!=='pets';
    if(updateHash)history.replaceState(null,'','#'+name);
    render();
  }
  function openPet(pet,changeHash=true){
    lastFocused=document.activeElement;document.getElementById('pet-dialog-kicker').textContent=pet.featured?'新伙伴 · 测试中':'伙伴图鉴';
    document.getElementById('pet-dialog-title').textContent=pet.name;document.getElementById('pet-dialog-element').textContent=(elements[pet.element]||'其他')+'属性';
    const body=document.getElementById('pet-dialog-body');body.replaceChildren();
    pet.forms.forEach((form,index)=>{
      const section=node('section','form-detail');const title=node('h3','',index===0?'普通形态':'转生形态');
      const name=node('p','form-name',form.name);const label=node('p','form-label','技能');const skills=node('div','skill-chips');
      if(form.skills.length)form.skills.forEach(skill=>skills.append(node('span','skill-chip',skill)));else skills.append(node('span','skill-chip','请以游戏内显示为准'));
      const art=petArt(form.id,pet.featured,index>0);art.classList.add('form-art');
      section.append(art,title,name,label,skills);body.append(section);
    });
    if(changeHash)history.replaceState(null,'','#pet-'+pet.id);
    dialog.showModal();
  }
  function petCard(pet){
    const button=node('button','pet-card');button.type='button';
    const art=petArt(pet.id,pet.featured);art.classList.add('element-'+pet.element);
    const text=node('span','pet-card-text'),top=node('span','pet-card-top');top.append(node('strong','',pet.name),node('span','element-badge element-'+pet.element,(elements[pet.element]||'其他')+'属性'));
    const forms=pet.forms.map(f=>f.name).filter((n,i,a)=>a.indexOf(n)===i).join(' / ');
    text.append(top,node('span','pet-forms',pet.featured?'测试中 · '+(forms===pet.name?'普通 / 转生形态':forms):(forms===pet.name?'普通 / 转生形态':forms)),node('span','pet-link','查看伙伴详情 →'));
    button.append(art,text);button.addEventListener('click',()=>openPet(pet));return button;
  }
  function bagCard(bag){
    const details=node('details','bag-card');const summary=node('summary','bag-summary');
    const top=node('span','bag-top');top.append(node('span','bag-badge '+(bag.kind==='lucky'?'bag-random':'bag-fixed'),bag.kind==='lucky'?'福袋':'礼包'),node('span','bag-id','#'+bag.id));
    const name=node('strong','bag-name',bag.name);const preview=node('span','bag-preview',bag.items.slice(0,3).map(item=>item.name).join(' · ')+(bag.items.length>3?' 等':''));
    const heading=node('span','bag-heading');const image=itemArt(bag.id);if(image)heading.append(image);const text=node('span','bag-heading-text');text.append(name,preview);heading.append(text);
    const bottom=node('span','bag-expand','查看 '+bag.items.length+' 项内容');bottom.append(node('i','','＋'));summary.append(top,heading,bottom);
    const body=node('div','bag-body');body.append(node('p','bag-body-title',bag.kind==='lucky'?'随机获得其中一项':'礼包内含全部物品'));
    const ul=node('ul','bag-items');bag.items.forEach(item=>{const li=node('li'),label=node('span','bag-item-label');const icon=itemArt(item.id);if(icon)label.append(icon);label.append(node('span','',item.name));li.append(label,node('b','','×'+item.count));ul.append(li);});body.append(ul);details.append(summary,body);return details;
  }
  function guideCards(){
    const guides=[
      ['角色与世界','创建角色后，从熟悉的海岛出发。探索地图、与 NPC 对话、完成任务，逐步认识这个世界。'],
      ['伙伴与出战','在伙伴界面查看已拥有的伙伴与技能，按游戏内条件安排出战、休息和成长。'],
      ['回合战斗','战斗中留意生命、魔力、属性和目标范围，选择攻击、技能、道具或防御。'],
      ['伙伴转生','不同伙伴的转生条件和材料可能不同，开始前请查看游戏内提示与所需物品。'],
      ['福袋与礼包','在资料中心搜索名称或物品，展开条目可查看整理的内容；具体获得方式以游戏内为准。'],
      ['活动与副本','活动时间、参与等级、奖励和入场规则可能调整，请以游戏内的活动窗口及公告为准。']
    ];
    return guides.map((g,i)=>{const card=node('article','guide-card');card.append(node('span','guide-number',String(i+1).padStart(2,'0')),node('h3','',g[0]),node('p','',g[1]));return card;});
  }
  function render(){
    results.replaceChildren();results.className='catalog-grid '+(current==='guide'?'guide-grid':'');
    if(current==='guide'){count.textContent='基础玩法 · 6 篇';guideCards().forEach(card=>results.append(card));more.hidden=true;return;}
    const query=search.value.trim().toLocaleLowerCase();let items;
    if(current==='pets')items=data.pets.filter(p=>{const text=[p.name,p.id,...p.forms.flatMap(f=>[f.name,...f.skills])].join(' ').toLocaleLowerCase();return(!query||text.includes(query))&&(filter.value==='all'||String(p.element)===filter.value);});
    else items=data.bags.filter(b=>{const text=[b.name,b.id,...b.items.map(x=>x.name)].join(' ').toLocaleLowerCase();return b.kind===(current==='bags'?'lucky':'pack')&&(!query||text.includes(query));});
    count.textContent='找到 '+items.length+' 条资料'+(query?' · 搜索：'+search.value.trim():'');
    if(!items.length){const empty=node('div','catalog-empty');empty.append(node('strong','','没有找到相关资料'),node('p','','试试其他名称或清除筛选条件。'));results.append(empty);more.hidden=true;return;}
    items.slice(0,limit).forEach(item=>results.append(current==='pets'?petCard(item):bagCard(item)));
    more.hidden=items.length<=limit;more.firstChild.textContent='查看更多（剩余 '+Math.max(0,items.length-limit)+' 条） ';
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab.dataset.tab));
    tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();});
  });
  side.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();selectTab(a.dataset.side);document.querySelector('.catalog-panel').scrollIntoView({behavior:'smooth',block:'start'});}));
  search.addEventListener('input',()=>{limit=24;render();});filter.addEventListener('change',()=>{limit=24;render();});more.addEventListener('click',()=>{limit+=24;render();});
  dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{if(location.hash.startsWith('#pet-'))history.replaceState(null,'','#pets');if(lastFocused)lastFocused.focus();});
  function handleHash(){const hash=location.hash.slice(1);if(hash.startsWith('pet-')){selectTab('pets',false);const pet=data.pets.find(item=>String(item.id)===hash.slice(4));if(pet && !dialog.open)openPet(pet,false);}else if(titles[hash])selectTab(hash,false);else selectTab('pets',false);}
  window.addEventListener('hashchange',handleHash);handleHash();
})();
