(() => {
  const data=window.WLO_CATALOG;
  if(!data)return;
  const containerIds=new Set(data.bags.map(bag=>bag.id));
  const titles={pets:'宠物与模型',bags:'福袋资料',packs:'礼包一览',guide:'冒险指南'};
  const intros={pets:'伙伴、可捕捉宠物和兑换券对应形态都可按名称、属性或技能查询。',bags:'福袋资料包含物品说明与已核对的奖池，展开即可查看。',packs:'礼包资料包含物品说明与已核对的内容，展开即可查看。',guide:'从伙伴、战斗到物品，先熟悉旅途中的基础玩法。'};
  const elements={1:'地',2:'水',3:'火',4:'风'};
  const tabs=[...document.querySelectorAll('[data-tab]')],side=[...document.querySelectorAll('[data-side]')];
  const results=document.getElementById('catalog-results'),count=document.getElementById('catalog-count'),search=document.getElementById('catalog-search');
  const filter=document.getElementById('element-filter'),filterLabel=document.getElementById('element-label'),tools=document.getElementById('catalog-tools');
  const kindFilter=document.getElementById('pet-kind-filter'),kindLabel=document.getElementById('pet-kind-label');
  const bagStatus=document.getElementById('bag-status-filter'),bagStatusLabel=document.getElementById('bag-status-label');
  const more=document.getElementById('load-more'),dialog=document.getElementById('pet-dialog');
  let current='pets',limit=24,lastFocused=null;
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  function petArt(id,featured,reborn=false){
    const art=node('span','pet-art');
    const source=(window.WLO_PET_IMAGES||{})[id]||(window.WLO_PET_BASE_IMAGES||{})[id];
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
    if(!titles[name])name='pets';current=name;limit=48;search.value='';filter.value='all';kindFilter.value='all';bagStatus.value='all';
    document.getElementById('catalog-title').textContent=titles[name];document.getElementById('catalog-intro').textContent=intros[name];
    tabs.forEach(t=>{const active=t.dataset.tab===name;t.setAttribute('aria-selected',String(active));t.tabIndex=active?0:-1;t.classList.toggle('selected',active);});
    side.forEach(a=>a.classList.toggle('selected',a.dataset.side===name));
    tools.hidden=name==='guide';filterLabel.hidden=name!=='pets';kindLabel.hidden=name!=='pets';bagStatusLabel.hidden=name!=='bags'&&name!=='packs';
    if(updateHash)history.replaceState(null,'','#'+name);
    render();
  }
  function openPet(pet,changeHash=true){
    lastFocused=document.activeElement;document.getElementById('pet-dialog-kicker').textContent=pet.featured?'新伙伴 · 测试中':'伙伴图鉴';
    document.getElementById('pet-dialog-title').textContent=pet.name;document.getElementById('pet-dialog-element').textContent=(elements[pet.element]||'其他')+'属性';
    const body=document.getElementById('pet-dialog-body');body.classList.toggle('single-form',pet.forms.length===1);body.replaceChildren();
    pet.forms.forEach((form,index)=>{
      const section=node('section','form-detail');const title=node('h3','',pet.forms.length===1?'伙伴模型':index===0?'普通形态':'转生形态');
      const name=node('p','form-name',form.name);const label=node('p','form-label','技能');const skills=node('div','skill-chips');
      if(form.skills.length)form.skills.forEach(skill=>{const entry=node('div','skill-detail');entry.append(node('strong','',typeof skill==='string'?skill:skill.name));if(typeof skill!=='string'&&skill.description)entry.append(node('p','',skill.description));if(typeof skill!=='string'&&Number.isFinite(skill.sp))entry.append(node('small','','SP '+skill.sp));skills.append(entry);});else skills.append(node('span','skill-chip','请以游戏内显示为准'));
      const art=petArt(form.id,pet.featured,index>0);art.classList.add('form-art');
      section.append(art,title,name,label,skills);
      if((window.WLO_PET_BASE_IMAGES||{})[form.id])section.append(node('p','model-note','基础模型，颜色以游戏内为准'));
      body.append(section);
    });
    const acquisition=node('div','pet-acquisition');
    if(pet.catchable)acquisition.append(node('p','','数据标记为可捕捉'+(pet.level?'，野外等级 '+pet.level:'')));
    if(pet.vouchers&&pet.vouchers.length)acquisition.append(node('p','','相关兑换券：'+pet.vouchers.map(v=>v.name).join('、')));
    if(acquisition.childNodes.length)body.append(acquisition);
    if(changeHash)history.replaceState(null,'','#pet-'+pet.id);
    dialog.showModal();
  }
  function petCard(pet){
    const button=node('button','pet-card');button.type='button';
    const art=petArt(pet.id,pet.featured);art.classList.add('element-'+pet.element);
    const text=node('span','pet-card-text'),top=node('span','pet-card-top');top.append(node('strong','',pet.name),node('span','element-badge element-'+pet.element,(elements[pet.element]||'其他')+'属性'));
    const forms=pet.forms.map(f=>f.name).filter((n,i,a)=>a.indexOf(n)===i).join(' / ');
    const detail=pet.featured?'测试中':pet.forms.length>1?'普通 / 转生形态':pet.catchable?'可捕捉资料':pet.vouchers&&pet.vouchers.length?'兑换券资料':'伙伴资料';
    const modelType=(window.WLO_PET_BASE_IMAGES||{})[pet.id]?' · 基础模型':'';
    text.append(top,node('span','pet-forms',detail+modelType+(forms!==pet.name?' · '+forms:'')),node('span','pet-link','查看模型与技能 →'));
    button.append(art,text);button.addEventListener('click',()=>openPet(pet));return button;
  }
  function bagCard(bag){
    const details=node('details','bag-card');details.dataset.itemId=bag.id;const summary=node('summary','bag-summary');
    const top=node('span','bag-top');top.append(node('span','bag-badge '+(bag.kind==='lucky'?'bag-random':'bag-fixed'),bag.kind==='lucky'?'福袋':'礼包'));const status=node('span','bag-status');if(!bag.known)status.append(node('span','bag-unverified','内容待核对'));status.append(node('span','bag-id','#'+bag.id));top.append(status);
    const branchItems=(bag.branches||[]).flatMap(branch=>branch.items);const previewItems=bag.items.length?bag.items:branchItems;
    const name=node('strong','bag-name',bag.name);const preview=node('span','bag-preview',previewItems.length?previewItems.slice(0,3).map(item=>item.name).join(' · ')+(previewItems.length>3?' 等':''):(bag.description||'内容资料待核对'));
    const heading=node('span','bag-heading');const image=itemArt(bag.id);if(image)heading.append(image);const text=node('span','bag-heading-text');text.append(name,preview);heading.append(text);
    const bottom=node('span','bag-expand',bag.branches?.length?'查看 '+bag.branches.length+' 种领取内容':bag.items.length?'查看 '+bag.items.length+' 项内容':'查看物品说明');bottom.append(node('i','','＋'));summary.append(top,heading,bottom);
    const body=node('div','bag-body');if(bag.description)body.append(node('p','bag-description',bag.description));
    function appendItems(items,title){body.append(node('p','bag-body-title',title));const ul=node('ul','bag-items');items.forEach(item=>{const li=node('li'),label=node('span','bag-item-label');const icon=itemArt(item.id);if(icon)label.append(icon);const linked=containerIds.has(item.id);const name=node(linked?'a':'span','',item.name);if(linked)name.href='#item-'+item.id;label.append(name);li.append(label,node('b','','×'+item.count));ul.append(li);});body.append(ul);}
    if(bag.branches?.length)bag.branches.forEach(branch=>appendItems(branch.items,branch.title));
    else if(bag.items.length)appendItems(bag.items,bag.kind==='lucky'?'随机获得其中一项':'礼包内含全部物品');
    else body.append(node('p','bag-body-title','具体内容待核对'));
    details.append(summary,body);return details;
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
    if(current==='pets')items=data.pets.filter(p=>{const text=[p.name,p.id,...p.forms.flatMap(f=>[f.name,...f.skills.map(s=>typeof s==='string'?s:s.name)]),...(p.vouchers||[]).map(v=>v.name)].join(' ').toLocaleLowerCase();const kind=kindFilter.value;return(!query||text.includes(query))&&(filter.value==='all'||String(p.element)===filter.value)&&(kind==='all'||kind==='capture'&&p.catchable||kind==='voucher'&&p.vouchers?.length||kind==='reborn'&&p.forms.length>1);});
    else items=data.bags.filter(b=>{const text=[b.name,b.id,b.description,...b.items.map(x=>x.name),...(b.branches||[]).flatMap(branch=>branch.items.map(x=>x.name))].join(' ').toLocaleLowerCase();return b.kind===(current==='bags'?'lucky':'pack')&&(!query||text.includes(query))&&(bagStatus.value==='all'||bagStatus.value==='known'&&b.known||bagStatus.value==='unknown'&&!b.known);});
    count.textContent='找到 '+items.length+' 条资料'+(current==='bags'||current==='packs'?' · '+items.filter(item=>item.known).length+' 条已整理内容':'')+(query?' · 搜索：'+search.value.trim():'');
    if(!items.length){const empty=node('div','catalog-empty');empty.append(node('strong','','没有找到相关资料'),node('p','','试试其他名称或清除筛选条件。'));results.append(empty);more.hidden=true;return;}
    items.slice(0,limit).forEach(item=>results.append(current==='pets'?petCard(item):bagCard(item)));
    more.hidden=items.length<=limit;more.firstChild.textContent='查看更多（剩余 '+Math.max(0,items.length-limit)+' 条） ';
  }
  tabs.forEach((tab,index)=>{
    tab.addEventListener('click',()=>selectTab(tab.dataset.tab));
    tab.addEventListener('keydown',event=>{if(!['ArrowLeft','ArrowRight'].includes(event.key))return;event.preventDefault();const next=tabs[(index+(event.key==='ArrowRight'?1:tabs.length-1))%tabs.length];next.focus();next.click();});
  });
  side.forEach(a=>a.addEventListener('click',event=>{event.preventDefault();selectTab(a.dataset.side);document.querySelector('.catalog-panel').scrollIntoView({behavior:'smooth',block:'start'});}));
  search.addEventListener('input',()=>{limit=48;render();});for(const control of [filter,kindFilter,bagStatus])control.addEventListener('change',()=>{limit=48;render();});more.addEventListener('click',()=>{limit+=48;render();});
  dialog.querySelectorAll('.dialog-close,.dialog-done').forEach(button=>button.addEventListener('click',()=>dialog.close()));
  dialog.addEventListener('click',event=>{if(event.target===dialog)dialog.close();});dialog.addEventListener('close',()=>{if(location.hash.startsWith('#pet-'))history.replaceState(null,'','#pets');if(lastFocused)lastFocused.focus();});
  function handleHash(){const hash=location.hash.slice(1);if(hash.startsWith('pet-')){selectTab('pets',false);const pet=data.pets.find(item=>item.forms.some(form=>String(form.id)===hash.slice(4)));if(pet && !dialog.open)openPet(pet,false);}else if(hash.startsWith('item-')){if(dialog.open)dialog.close();const id=hash.slice(5),bag=data.bags.find(item=>String(item.id)===id);if(bag){selectTab(bag.kind==='lucky'?'bags':'packs',false);search.value=id;render();const card=results.querySelector(`[data-item-id="${id}"]`);if(card){card.open=true;card.scrollIntoView({block:'center'});}}}else if(titles[hash])selectTab(hash,false);else selectTab('pets',false);}
  window.addEventListener('hashchange',handleHash);handleHash();
})();
