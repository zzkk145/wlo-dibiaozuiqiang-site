(() => {
  let data=window.WLO_CATALOG;
  if(!data)return;
  let containerIds=new Set(data.bags.map(bag=>bag.id));
  let formsById=new Map([...data.pets,...(data.npcs||[])].flatMap(pet=>pet.forms.map(form=>[form.id,form])));
  const modelByGraphic=new Map(Object.values(window.WLO_PET_BASE_IMAGES||{}).map(path=>[Number(path.match(/\/(\d+)\.png$/)?.[1]),path]));
  const titles={pets:'宠物与模型',bags:'福袋资料',packs:'礼包一览',cards:'兑换卡',items:'道具资料',npcs:'NPC图鉴',skills:'技能资料',maps:'地图资料',recipes:'制作配方',quests:'任务与事件',dialogues:'游戏对白',shops:'商店资料',guide:'冒险指南'};
  const intros={pets:'伙伴、可捕捉宠物和兑换券对应形态都可按名称、属性或技能查询。',bags:'福袋资料包含物品说明与已核对的奖池，展开即可查看。',packs:'礼包资料包含物品说明与已核对的内容，展开即可查看。',cards:'兑换卡的可选内容按已接入的生效配置显示。',items:'搜索游戏道具名称、编号和说明。',npcs:'查询本服NPC名称、模型与技能。',skills:'查询本服技能名称、说明和魔力消耗。',maps:'查询地图及资源中登记的NPC；实际出现条件以游戏内为准。',recipes:'查看游戏制作配方、材料和基础时长。',quests:'查询游戏资源中的事件、关联NPC与已识别对白；触发条件与实际流程以游戏内为准。',dialogues:'查询游戏资源中的原始对白；可能包含游戏内控制标记。',shops:'查看当前NPC商店和新登录时使用的商城目录。',guide:'从伙伴、战斗到物品，先熟悉旅途中的基础玩法。'};
  const elements={1:'地',2:'水',3:'火',4:'风'};
  const tabs=[...document.querySelectorAll('[data-tab]')],side=[...document.querySelectorAll('[data-side]')];
  const results=document.getElementById('catalog-results'),count=document.getElementById('catalog-count'),search=document.getElementById('catalog-search');
  const filter=document.getElementById('element-filter'),filterLabel=document.getElementById('element-label'),tools=document.getElementById('catalog-tools');
  const kindFilter=document.getElementById('pet-kind-filter'),kindLabel=document.getElementById('pet-kind-label');
  const bagStatus=document.getElementById('bag-status-filter'),bagStatusLabel=document.getElementById('bag-status-label');
  const more=document.getElementById('load-more'),dialog=document.getElementById('pet-dialog');
  let current='pets',limit=24,lastFocused=null;
  const node=(tag,cls,text)=>{const el=document.createElement(tag);if(cls)el.className=cls;if(text!==undefined)el.textContent=text;return el;};
  const modelSources=new Map(),coloredModels=new Map();
  function readModel(graphic){
    const entry=(window.WLO_MODEL_GRAPHICS||{})[graphic];if(!entry?.image||!entry?.indices)return null;
    const key=window.WLO_MODEL_VERSION+':'+graphic;
    if(!modelSources.has(key))modelSources.set(key,Promise.all([entry.image,entry.indices].map(value=>new Promise((resolve,reject)=>{const image=new Image();image.onload=()=>resolve(image);image.onerror=reject;image.src='data:image/png;base64,'+value;}))));
    return modelSources.get(key);
  }
  function tintedModel(form){
    const source=readModel(form.graphic);if(!source)return null;
    const code=(form.colors||[]).map(number=>String(number).padStart(9,'0')).join('');if(!/^\d{36}$/.test(code))return null;
    const key=window.WLO_MODEL_VERSION+':'+form.graphic+':'+code;
    if(!coloredModels.has(key))coloredModels.set(key,source.then(([image,indices])=>{
      if(image.naturalWidth!==indices.naturalWidth||image.naturalHeight!==indices.naturalHeight)throw Error('Model mask size');
      const canvas=document.createElement('canvas');canvas.width=image.naturalWidth;canvas.height=image.naturalHeight;const context=canvas.getContext('2d',{willReadFrequently:true});context.drawImage(image,0,0);const pixels=context.getImageData(0,0,canvas.width,canvas.height);context.clearRect(0,0,canvas.width,canvas.height);context.drawImage(indices,0,0);const masks=context.getImageData(0,0,canvas.width,canvas.height);
      for(let i=0;i<pixels.data.length;i+=4){if(!pixels.data[i+3])continue;const group=masks.data[i];if(group<1||group>12)continue;for(let c=0;c<3;c++){const digit=Number(code[(group-1)*3+c]);pixels.data[i+c]=Math.max(5,Math.min(250,pixels.data[i+c]+(digit-4)*25));}}
      context.putImageData(pixels,0,0);return canvas.toDataURL('image/png');
    }));
    return coloredModels.get(key);
  }
  function petArt(id,featured,reborn=false){
    const art=node('span','pet-art');
    const form=formsById.get(id);
    const liveAssets=!!window.WLO_MODEL_GRAPHICS,generated=liveAssets&&form?tintedModel(form):null;
    const source=(generated&&'data:image/png;base64,'+window.WLO_MODEL_GRAPHICS[form.graphic].image)||(!liveAssets&&!form?.artChanged&&((window.WLO_PET_IMAGES||{})[id]||(window.WLO_PET_BASE_IMAGES||{})[id]))||(!liveAssets&&form&&modelByGraphic.get(form.graphic));
    if(source){const img=node('img');img.src=source;img.alt='';img.loading='lazy';art.append(img);}
    else if(featured){art.classList.add(id===34580||id===34581?'pet-lubu':'pet-wind');if(reborn)art.classList.add('reborn');}
    else {art.append(node('span','model-note','模型图待更新'));}
    if(generated)generated.then(src=>{const img=art.querySelector('img');if(img){img.src=src;img.dataset.colorReady='true';}}).catch(()=>{art.append(node('span','model-note','配色待更新'));});
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
    if(!dialog.open)lastFocused=document.activeElement;dialog.dataset.petId=pet.id;dialog.dataset.kind=pet.npc?'npc':'pet';document.getElementById('pet-dialog-kicker').textContent=pet.npc?'NPC图鉴':pet.featured?(pet.live?'新伙伴':'新伙伴 · 测试中'):'伙伴图鉴';
    document.getElementById('pet-dialog-title').textContent=pet.name;document.getElementById('pet-dialog-element').textContent=(elements[pet.element]||'其他')+'属性';
    const body=document.getElementById('pet-dialog-body');body.classList.toggle('single-form',pet.forms.length===1);body.replaceChildren();
    pet.forms.forEach((form,index)=>{
      const section=node('section','form-detail');const title=node('h3','',pet.forms.length===1?'伙伴模型':index===0?'普通形态':'转生形态');
      const name=node('p','form-name',form.name);const label=node('p','form-label','技能');const skills=node('div','skill-chips');
      if(form.skills.length)form.skills.forEach(skill=>{const entry=node('div','skill-detail');entry.append(node('strong','',typeof skill==='string'?skill:skill.name));if(typeof skill!=='string'&&skill.description)entry.append(node('p','',skill.description));if(typeof skill!=='string'&&Number.isFinite(skill.sp))entry.append(node('small','','SP '+skill.sp));skills.append(entry);});else skills.append(node('span','skill-chip','请以游戏内显示为准'));
      const art=petArt(form.id,pet.featured,index>0);art.classList.add('form-art');
      section.append(art,title,name,label,skills);
      if(!((window.WLO_MODEL_GRAPHICS||{})[form.graphic])&&(window.WLO_PET_BASE_IMAGES||{})[form.id])section.append(node('p','model-note','基础模型，颜色以游戏内为准'));
      body.append(section);
    });
    const acquisition=node('div','pet-acquisition');
    if(pet.catchable)acquisition.append(node('p','','数据标记为可捕捉'+(pet.level?'，野外等级 '+pet.level:'')));
    if(pet.vouchers&&pet.vouchers.length)acquisition.append(node('p','','相关兑换券：'+pet.vouchers.map(v=>v.name).join('、')));
    if(acquisition.childNodes.length)body.append(acquisition);
    if(changeHash)history.replaceState(null,'','#pet-'+pet.id);
    if(!dialog.open)dialog.showModal();
  }
  function petCard(pet){
    const button=node('button','pet-card');button.type='button';
    const art=petArt(pet.id,pet.featured);art.classList.add('element-'+pet.element);
    const text=node('span','pet-card-text'),top=node('span','pet-card-top');top.append(node('strong','',pet.name),node('span','element-badge element-'+pet.element,(elements[pet.element]||'其他')+'属性'));
    const forms=pet.forms.map(f=>f.name).filter((n,i,a)=>a.indexOf(n)===i).join(' / ');
    const detail=pet.npc?'NPC资料':pet.featured&&!pet.live?'测试中':pet.forms.length>1?'普通 / 转生形态':pet.catchable?'可捕捉资料':pet.vouchers&&pet.vouchers.length?'兑换券资料':'伙伴资料';
    const modelType=(window.WLO_PET_BASE_IMAGES||{})[pet.id]?' · 基础模型':'';
    text.append(top,node('span','pet-forms',detail+modelType+(forms!==pet.name?' · '+forms:'')),node('span','pet-link','查看模型与技能 →'));
    button.append(art,text);button.addEventListener('click',()=>openPet(pet));return button;
  }
  function bagCard(bag){
    const details=node('details','bag-card');details.dataset.itemId=bag.id;const summary=node('summary','bag-summary');
    const top=node('span','bag-top');top.append(node('span','bag-badge '+(bag.kind==='lucky'?'bag-random':'bag-fixed'),bag.kind==='lucky'?'福袋':bag.kind==='card'?'兑换卡':'礼包'));const status=node('span','bag-status');if(bag.disabled)status.append(node('span','bag-unverified','当前已停用'));else if(!bag.known)status.append(node('span','bag-unverified','内容待核对'));else if(bag.snapshot)status.append(node('span','bag-unverified','历史资料'));status.append(node('span','bag-id','#'+bag.id));top.append(status);
    const branchItems=(bag.branches||[]).flatMap(branch=>branch.items);const previewItems=bag.items.length?bag.items:branchItems;
    const name=node('strong','bag-name',bag.name);const preview=node('span','bag-preview',previewItems.length?previewItems.slice(0,3).map(item=>item.name).join(' · ')+(previewItems.length>3?' 等':''):(bag.description||'内容资料待核对'));
    const heading=node('span','bag-heading');const image=itemArt(bag.id);if(image)heading.append(image);const text=node('span','bag-heading-text');text.append(name,preview);heading.append(text);
    const bottom=node('span','bag-expand',bag.branches?.length?'查看 '+bag.branches.length+' 种领取内容':bag.items.length?'查看 '+bag.items.length+' 项内容':'查看物品说明');bottom.append(node('i','','＋'));summary.append(top,heading,bottom);
    const body=node('div','bag-body');if(bag.description)body.append(node('p','bag-description',bag.description));
    function appendItems(items,title){body.append(node('p','bag-body-title',title));const ul=node('ul','bag-items');items.forEach(item=>{const li=node('li'),label=node('span','bag-item-label');const icon=itemArt(item.id);if(icon)label.append(icon);const linked=containerIds.has(item.id);const name=node(linked?'a':'span','',item.name);if(linked)name.href='#item-'+item.id;label.append(name);li.append(label,node('b','','×'+item.count));ul.append(li);});body.append(ul);}
    if(bag.branches?.length)bag.branches.forEach(branch=>appendItems(branch.items,branch.title));
    else if(bag.items.length)appendItems(bag.items,bag.kind==='lucky'?'随机获得其中一项':bag.kind==='card'?'选择其中一项':'礼包内含全部物品');
    else body.append(node('p','bag-body-title','具体内容待核对'));
    details.append(summary,body);return details;
  }
  function itemCard(item){
    const card=node('article','bag-card');const summary=node('div','bag-summary');const top=node('span','bag-top');top.append(node('span','bag-badge bag-fixed',current==='skills'?'技能':'道具'),node('span','bag-id','#'+item.id));
    const heading=node('span','bag-heading');const art=current==='items'?itemArt(item.id):null;if(art)heading.append(art);const text=node('span','bag-heading-text');text.append(node('strong','bag-name',item.name),node('span','bag-preview',(item.description||'暂无说明')+(current==='skills'&&Number.isFinite(item.sp)?' · SP '+item.sp:'')));heading.append(text);summary.append(top,heading);card.append(summary);return card;
  }
  function mapCard(map){
    const card=node('details','bag-card'),summary=node('summary','bag-summary');summary.append(node('span','bag-id','#'+map.id),node('strong','bag-name',map.name),node('span','bag-preview',`登记 ${map.npcs.length} 位NPC`));card.append(summary);const body=node('div','bag-body');body.append(node('p','bag-body-title','资源中登记的NPC，具体出现条件以游戏内为准'));const list=node('ul','bag-items');map.npcs.forEach(npc=>{const row=node('li');row.append(node('span','',npc.name),node('b','','#'+npc.id));list.append(row);});body.append(list);card.append(body);return card;
  }
  function recipeCard(recipe){
    const card=node('details','bag-card'),summary=node('summary','bag-summary');const heading=node('span','bag-heading'),art=itemArt(recipe.product);if(art)heading.append(art);heading.append(node('strong','bag-name',recipe.name));summary.append(node('span','bag-id','#'+recipe.id),heading,node('span','bag-preview',recipe.enabled?'当前允许新制作':'当前暂停新制作'));card.append(summary);const body=node('div','bag-body');body.append(node('p','bag-body-title',`产出 ×${recipe.quantity} · 基础时长 ${recipe.minutes} 分钟`));if(recipe.tool)body.append(node('p','',`工具：${recipe.tool}`));if(recipe.blueprint)body.append(node('p','',`设计图：${recipe.blueprint}`));const list=node('ul','bag-items');recipe.materials.forEach(item=>{const row=node('li');row.append(node('span','',item.name),node('b','','×'+item.count));list.append(row);});body.append(list);card.append(body);return card;
  }
  function questCard(quest){
    const card=node('details','bag-card'),summary=node('summary','bag-summary');summary.append(node('span','bag-id',`地图 #${quest.map} · 事件 #${quest.id}`),node('strong','bag-name',quest.name),node('span','bag-preview',quest.npcs.join('、')||'场景事件'));card.append(summary);
    const body=node('div','bag-body');body.append(node('p','bag-body-title',quest.mechanisms||'原始事件'),node('p','',`资源中登记 ${quest.groups} 个条件分支，实际触发条件以游戏内为准。`));
    if(quest.dialogues.length){body.append(node('p','bag-body-title','关联原始对白'));for(const talk of quest.dialogues)body.append(node('p','',`#${talk.id} ${talk.text}`));}card.append(body);return card;
  }
  function dialogueCard(talk){const card=node('article','bag-card'),body=node('div','bag-summary');body.append(node('span','bag-id','#'+talk.id),node('p','bag-preview',talk.text));card.append(body);return card;}
  function shopCard(shop){
    const card=node('details','bag-card'),summary=node('summary','bag-summary');const title=node('span','bag-heading');const art=shop.kind==='npc'?null:itemArt(shop.id);if(art)title.append(art);title.append(node('strong','bag-name',shop.name));summary.append(node('span','bag-badge bag-fixed',shop.kind==='npc'?'NPC商店':shop.kind==='points'?'点数商城':'红利商城'),title,node('span','bag-preview',shop.kind==='npc'?`出售 ${shop.goods.length} 种物品`:`每份 ${shop.units} 件 · 标价 ${shop.price} · 折扣 ${shop.discount}%`));card.append(summary);
    const body=node('div','bag-body');if(shop.kind==='npc'){const list=node('ul','bag-items');for(const item of shop.goods){const row=node('li'),label=node('span','bag-item-label');const icon=itemArt(item.id);if(icon)label.append(icon);label.append(node('span','',item.name));row.append(label,node('b','',item.price==null?'价格待核对':`${item.price} 飘流币`));list.append(row);}body.append(list);}else body.append(node('p','','当前目录供新登录使用，已打开的商城以原报价为准。'));card.append(body);return card;
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
    if(current==='pets'||current==='npcs')items=(current==='pets'?data.pets:(data.npcs||[])).filter(p=>{const text=[p.name,p.id,...p.forms.flatMap(f=>[f.name,...f.skills.map(s=>typeof s==='string'?s:s.name)]),...(p.vouchers||[]).map(v=>v.name)].join(' ').toLocaleLowerCase();const kind=kindFilter.value;return(!query||text.includes(query))&&(current==='npcs'||filter.value==='all'||String(p.element)===filter.value)&&(current==='npcs'||kind==='all'||kind==='capture'&&p.catchable||kind==='voucher'&&p.vouchers?.length||kind==='reborn'&&p.forms.length>1);});
    else if(current==='items'||current==='skills')items=(data[current]||[]).filter(item=>[item.name,item.id,item.description].join(' ').toLocaleLowerCase().includes(query));
    else if(current==='maps')items=(data.maps||[]).filter(map=>[map.name,map.id,...map.npcs.map(npc=>npc.name)].join(' ').toLocaleLowerCase().includes(query));
    else if(current==='recipes')items=(data.recipes||[]).filter(recipe=>[recipe.name,recipe.id,recipe.tool,recipe.blueprint,...recipe.materials.map(item=>item.name)].join(' ').toLocaleLowerCase().includes(query));
    else if(current==='quests')items=(data.quests||[]).filter(quest=>[quest.name,quest.map,quest.id,quest.mechanisms,...quest.npcs,...quest.dialogues.map(talk=>talk.text)].join(' ').toLocaleLowerCase().includes(query));
    else if(current==='dialogues')items=(data.dialogues||[]).filter(talk=>[talk.id,talk.text].join(' ').toLocaleLowerCase().includes(query));
    else if(current==='shops')items=(data.shops||[]).filter(shop=>[shop.name,shop.id,shop.map,...shop.goods.map(item=>item.name)].join(' ').toLocaleLowerCase().includes(query));
    else {const source=current==='cards'?(data.cards||[]):data.bags;items=source.filter(b=>{const text=[b.name,b.id,b.description,...b.items.map(x=>x.name),...(b.branches||[]).flatMap(branch=>branch.items.map(x=>x.name))].join(' ').toLocaleLowerCase();return (current==='cards'||b.kind===(current==='bags'?'lucky':'pack'))&&(!query||text.includes(query))&&(bagStatus.value==='all'||bagStatus.value==='known'&&b.known||bagStatus.value==='unknown'&&!b.known);});}
    count.textContent='找到 '+items.length+' 条资料'+(current==='bags'||current==='packs'?' · '+items.filter(item=>item.known).length+' 条已整理内容':'')+(query?' · 搜索：'+search.value.trim():'');
    if(!items.length){const empty=node('div','catalog-empty');empty.append(node('strong','','没有找到相关资料'),node('p','','试试其他名称或清除筛选条件。'));results.append(empty);more.hidden=true;return;}
    items.slice(0,limit).forEach(item=>results.append(current==='pets'||current==='npcs'?petCard(item):current==='items'||current==='skills'?itemCard(item):current==='maps'?mapCard(item):current==='recipes'?recipeCard(item):current==='quests'?questCard(item):current==='dialogues'?dialogueCard(item):current==='shops'?shopCard(item):bagCard(item)));
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
  window.addEventListener('wlo-live-game',event=>{
    if(!event.detail.catalog)return;
    data=event.detail.catalog;window.WLO_CATALOG=data;containerIds=new Set(data.bags.map(bag=>bag.id));formsById=new Map([...data.pets,...(data.npcs||[])].flatMap(pet=>pet.forms.map(form=>[form.id,form])));
    const footnote=document.querySelector('.catalog-footnote');if(footnote)footnote.textContent='物品和伙伴字段及标明“当前生效配置”的内容来自游戏；历史资料、缺失模型和继承奖池需进一步核对。';
    render();
    if(dialog.open){const pet=(dialog.dataset.kind==='npc'?(data.npcs||[]):data.pets).find(item=>String(item.id)===dialog.dataset.petId);if(pet)openPet(pet,false);else dialog.close();}
  });
  window.addEventListener('wlo-live-icons',()=>{render();if(dialog.open){const pet=(dialog.dataset.kind==='npc'?(data.npcs||[]):data.pets).find(item=>String(item.id)===dialog.dataset.petId);if(pet)openPet(pet,false);}});
  window.addEventListener('wlo-live-models',()=>{render();if(dialog.open){const pet=(dialog.dataset.kind==='npc'?(data.npcs||[]):data.pets).find(item=>String(item.id)===dialog.dataset.petId);if(pet)openPet(pet,false);}});
  window.addEventListener('hashchange',handleHash);handleHash();
})();
