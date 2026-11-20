/* Live public gameplay data; no player accounts, GM credentials or game writes. */
((scope) => {
  'use strict';
  const FEED = 'https://wlo-rhode-website-bridge.onrender.com/public-game-content';
  const ICON_FEED = 'https://wlo-rhode-website-bridge.onrender.com/public-game-icons';
  const MODEL_FEED = 'https://wlo-rhode-website-bridge.onrender.com/public-game-models';
  const stage = {10045:5,10046:6,10047:7,10048:8,10050:9,10051:10,10049:11,10052:12,10054:13,10055:14,10056:15,10104:16,10105:17,10106:18,10107:19,10108:20,10109:21,10110:22,10111:23,10112:24,10113:25,10114:26,10115:27,10116:28,10119:29,10120:30};
  const zeus = {'13502:3:4':'第一关','13503:3:3':'第二关','13500:3:3':'第三关','13501:2:3':'第四关','13501:4:11':'隐藏关'};
  const zodiac = ['巨蟹宫','狮子宫','处女宫','天秤宫','天蝎宫','射手宫','摩羯宫','水瓶宫','双鱼宫'];
  const exchangeNames = {'exchange:dialog:11094:5':'游乐场兑换员','exchange:dialog:12000:40':'克兰村兑换员','exchange:12230':'兑换窗口 12230','exchange:12231':'兑换窗口 12231'};
  const clone = value => JSON.parse(JSON.stringify(value));
  const rows = (value) => Array.isArray(value) ? value : [];
  const validId = value => Number.isInteger(value) && value > 0 && value <= 65535;
  function project(raw, original) {
    if (!raw || raw.schema !== 'wlo-public-game-content-v1' || !Array.isArray(raw.items) || !Array.isArray(raw.pets) || !Array.isArray(raw.skills) || !Array.isArray(raw.maps) || !Array.isArray(raw.recipes) || !Array.isArray(raw.quests) || !Array.isArray(raw.dialogues) || !Array.isArray(raw.shops) || !Array.isArray(raw.mall) || !Array.isArray(raw.definitions) || !Array.isArray(raw.rebirth) || !raw.shenting || !/^[a-f0-9]{64}$/.test(raw.model_feed_version) || !raw.active_content || !raw.operations) throw Error('资料格式不匹配');
    const items = new Map(raw.items.filter(x => x && validId(x.id) && typeof x.name === 'string').map(x => [x.id,x]));
    const native = new Map(raw.pets.filter(x => x && validId(x.id) && typeof x.name === 'string').map(x => [x.id,x]));
    const active = raw.active_content;
    const definitions=new Map(raw.definitions.filter(def=>def&&typeof def.key==='string').map(def=>[def.key,def]));
    const effective=new Map();
    for(const def of definitions.values()){const value=Object.prototype.hasOwnProperty.call(active,def.key)?active[def.key]:def.baseline;if(value)effective.set(def.key,value);}
    for(const [key,value] of Object.entries(active))if(!definitions.has(key))effective.set(key,value);
    // The one-yuan bag's legacy fixed-object record is converted by the actual
    // game only when it matches every original reward; reuse original weights.
    if(!Object.prototype.hasOwnProperty.call(active,'lucky:34296')&&active['pack:34296']){
      const legacy=active['pack:34296'],source=rows(definitions.get('lucky:34296')?.baseline?.rows).map(row=>({...row}));let valid=true;
      const projected=rows(legacy.rows).map(row=>{const at=source.findIndex(x=>Number(x.item)===Number(row.item)&&Number(x.count)===Number(row.count));if(at<0||Number(row.cost)||Number(row.costCount)||Number(row.group)){valid=false;return row;}return {...row,weight:source.splice(at,1)[0].weight};});
      effective.set('lucky:34296',{enabled:legacy.enabled===true&&valid&&source.length===0,rows:projected,settings:legacy.settings||{}});
      effective.delete('pack:34296');
    }
    const knownImages=new Set(Object.values(original.itemImages||{}));const itemImages={};
    for(const item of items.values()){const path=`assets/item-icons/${item.picture}.png`;if(knownImages.has(path))itemImages[item.id]=path;}
    const containerIds=new Set();
    for(const item of items.values())if(item.type===41||item.type===26||item.name.includes('福袋')||item.name.includes('礼包'))containerIds.add(item.id);
    for(const key of effective.keys()){const match=/^(?:lucky|pack):(\d+)$/.exec(key);if(match)containerIds.add(Number(match[1]));}
    const itemName = id => items.get(Number(id))?.name || `道具 ${id}`;
    const reward = (row) => {
      const result={id:Number(row.item),name:itemName(row.item),count:Number(row.count)};
      if (Number(row.costCount)>0) {result.costId=Number(row.cost)||0;result.costName=Number(row.cost)?itemName(row.cost):'飘流币';result.costCount=Number(row.costCount);}
      return result;
    };
    const rewardRows = (value,weighted=false) => rows(value?.rows).filter(x => validId(Number(x.item)) && Number(x.count)>0 && (!weighted || Number(x.weight)>0)).map(reward);
    const catalog = original.catalog ? clone(original.catalog) : null;
    if (catalog) {
      const vouchers = new Map();
      for (const item of items.values()) if (item.effect===146 && validId(item.npc)) {
        if (!vouchers.has(item.npc)) vouchers.set(item.npc,[]);
        vouchers.get(item.npc).push({id:item.id,name:item.name});
      }
      const rebirth=new Map(),rebornIds=new Set();
      for(const pair of raw.rebirth){const base=Number(pair.baseNpc),next=Number(pair.rebornNpc);if(!native.has(base)||!native.has(next))continue;if(!rebirth.has(base))rebirth.set(base,new Set());rebirth.get(base).add(next);rebornIds.add(next);}
      const used = new Set(), pets = [],oldPets=new Map(rows(catalog.pets).map(pet=>[pet.id,pet]));
      const addPet=(base,old={})=>{
        if(!native.has(base)||used.has(base))return;const previous=new Map(rows(old.forms).map(form=>[form.id,form]));
        const ids=[base,...(rebirth.get(base)||[])];const forms=ids.filter(id=>native.has(id)).map(id=>{const form=native.get(id),before=previous.get(id);return {id:form.id,name:form.name,element:form.element,skills:rows(form.skills),graphic:form.graphic,colors:rows(form.colors),artChanged:!!before&&(before.graphic!==form.graphic||JSON.stringify(rows(before.colors))!==JSON.stringify(rows(form.colors)))};});
        forms.forEach(form=>used.add(form.id));const first=native.get(base);
        pets.push({...old,id:base,name:first.name,element:first.element,forms,live:true,catchable:first.type===7&&first.catchable===true,level:first.level,vouchers:vouchers.get(base)||[]});
      };
      for(const old of rows(catalog.pets)){if(rebornIds.has(old.id)&&!rebirth.has(old.id))continue;addPet(old.id,old);}
      for(const base of rebirth.keys())addPet(base,oldPets.get(base)||{});
      for (const pet of native.values()) {
        if (used.has(pet.id) || !(pet.type===7&&pet.catchable===true) && !vouchers.has(pet.id)) continue;
        addPet(pet.id,{featured:false});
      }
      catalog.pets=pets;
      catalog.npcs=[...native.values()].map(pet=>({id:pet.id,name:pet.name,element:pet.element,forms:[{id:pet.id,name:pet.name,element:pet.element,skills:rows(pet.skills),graphic:pet.graphic,colors:rows(pet.colors)}],npc:true,live:true,catchable:pet.type===7&&pet.catchable===true,level:pet.level,vouchers:[]}));
      catalog.skills=raw.skills.map(skill=>({id:skill.id,name:skill.name,description:skill.description||'',sp:skill.sp}));
      catalog.maps=raw.maps.filter(map=>map&&validId(map.id)&&typeof map.name==='string').map(map=>({id:map.id,name:map.name,npcs:rows(map.npcs).filter(id=>native.has(id)).map(id=>({id,name:native.get(id).name}))}));
      const mapNames=new Map(catalog.maps.map(map=>[map.id,map.name]));
      const dialogues=new Map(raw.dialogues.filter(talk=>talk&&validId(talk.id)&&typeof talk.text==='string').map(talk=>[talk.id,talk.text]));
      catalog.quests=raw.quests.filter(quest=>quest&&validId(quest.map)&&validId(quest.evt)).map(quest=>({id:quest.evt,map:quest.map,name:mapNames.get(quest.map)||`地图 ${quest.map}`,npcs:rows(quest.npcs).map(id=>native.get(id)?.name||`NPC ${id}`),mechanisms:quest.mechanisms||'',groups:Number(quest.groups)||0,dialogues:rows(quest.talks).filter(id=>dialogues.has(id)).map(id=>({id,text:dialogues.get(id)}))}));
      catalog.dialogues=[...dialogues].map(([id,text])=>({id,text}));
      catalog.shops=raw.shops.map(shop=>({id:shop.id,map:shop.map,name:`${mapNames.get(shop.map)||`地图 ${shop.map}`} · 商店 ${shop.id}`,kind:'npc',goods:rows(shop.goods).map(g=>({id:g.item,name:itemName(g.item),price:g.buy}))}));
      for(const offer of raw.mall){if(!offer||!validId(offer.item))continue;catalog.shops.push({id:offer.item,name:itemName(offer.item),kind:offer.kind===1?'points':'bonus',units:offer.units,price:offer.price,discount:offer.discount,category:offer.category,mark:offer.mark,goods:[]});}
      const manufacture=raw.manufacture_operations||{},setting=(key,fallback)=>Object.prototype.hasOwnProperty.call(manufacture,key)?Number(manufacture[key]):fallback;
      catalog.recipes=raw.recipes.filter(recipe=>recipe&&validId(recipe.id)&&validId(recipe.product)).map(recipe=>({id:recipe.id,product:recipe.product,name:itemName(recipe.product),quantity:recipe.quantity,minutes:recipe.minutes,tool:recipe.tool?itemName(recipe.tool):'',blueprint:recipe.blueprint?itemName(recipe.blueprint):'',enabled:setting('manufacture.0.enabled',1)!==0&&setting(`manufacture.${recipe.id}.enabled`,1)!==0,materials:rows(recipe.materials).map(reward)}));
      const bags=new Map();
      for(const def of definitions.values()){
        const match=/^(lucky|pack):(\d+)$/.exec(def.key);if(def.kind!=='bags'||!match||def.parent)continue;
        const id=Number(match[2]),kind=match[1],item=items.get(id);if(!item)continue;
        const value=effective.get(def.key),members=value?.enabled?rewardRows(value,kind==='lucky'):[];
        bags.set(def.key,{id,name:item.name,kind,description:item.description||'',items:members,branches:[],known:members.length>0,disabled:!!active[def.key]&&active[def.key].enabled!==true,source:Object.prototype.hasOwnProperty.call(active,def.key)?'当前生效配置':'游戏继承规则',snapshot:false});
      }
      for(const def of definitions.values()){
        if(def.kind!=='bags'||!def.parent||!bags.has(def.parent))continue;
        const bag=bags.get(def.parent),value=effective.get(def.key),members=value?.enabled?rewardRows(value,bag.kind==='lucky'):[];
        if(members.length){bag.branches.push({title:def.group||def.name,items:members});bag.known=true;}
      }
      for (const item of items.values()) {
        const kind=item.type===41||item.name.includes('福袋')?'lucky':item.type===26||item.name.includes('礼包')?'pack':null;
        if (!kind || bags.has(`${kind}:${item.id}`)) continue;
        bags.set(`${kind}:${item.id}`,{id:item.id,name:item.name,kind,items:[],branches:[],description:item.description||'',known:false,source:'游戏物品资料',snapshot:false});
      }
      for (const [key,value] of effective) {
        const match=/^(lucky|pack):(\d+)$/.exec(key);if(!match)continue;
        const kind=match[1],id=Number(match[2]),item=items.get(id);if(!item)continue;
        if(definitions.has(key))continue;
        const old=bags.get(key)||{id,name:item.name,kind,description:item.description||''};
        const projected=rewardRows(value,kind==='lucky');
        bags.set(key,{...old,items:value.enabled?projected:[],branches:[],known:value.enabled===true&&projected.length>0,source:value.enabled?'当前生效配置':'当前已停用',disabled:value.enabled!==true,snapshot:false});
      }
      catalog.bags=[...bags.values()];
      catalog.items=[...items.values()].map(item=>({id:item.id,name:item.name,description:item.description||'',type:item.type}));
      catalog.cards=[...items.values()].filter(item=>item.type===40||effective.has(`card:${item.id}`)).map(item=>{
        const key=`card:${item.id}`,value=effective.get(key),members=value?.enabled?rewardRows(value):[];
        return {id:item.id,name:item.name,kind:'card',description:item.description||'',items:members,branches:[],known:members.length>0,disabled:!!active[key]&&active[key].enabled!==true};
      });
      catalog.updated=raw.server_version;
    }
    const activities = original.activities ? clone(original.activities) : null;
    if (activities) {
      const base=activities.events||{}, events={};for(const name of Object.keys(base))events[name]=clone(base[name]).map(group=>({...group,snapshot:true}));events.more=[];
      for(const name of ['zodiac','challenge','zeus','pirate','treasure','cooperation','dungeon','newbie','exchange','arcade','limited','world','draw','campaign','shenting'])events[name]=[];
      const dungeonNames=new Map(rows(base.dungeon).map(x=>[Number(x.order),x.title]));
      const add=(kind,title,mode,order,value,note) => {const entries=rewardRows(value,mode==='random'||mode==='pool');if(entries.length)events[kind].push({title,mode,order,items:entries,...(note?{note}:{})});};
      for(const [key,value] of effective) {
        if(!value || value.enabled!==true)continue;
        const def=definitions.get(key);
        if(['play:','drop:','arcade:','exchange:'].some(prefix=>key.startsWith(prefix))){const entries=rows(value.rows),weighted=entries.some(row=>Number(row.weight)>0);const title=def?`${def.name}${def.group&&def.group!=='通关奖励'?' · '+def.group:''}`:`游戏内容 ${key.slice(key.indexOf(':')+1).replaceAll(':',' / ')}`;add('more',title,'unknown',events.more.length,{rows:weighted?entries.filter(row=>Number(row.weight)>0):entries},'触发条件和领取方式以游戏内为准');}
        let m;
        if((m=/^play:zodiac:(128\d+)$/.exec(key))){const index=Number(m[1])-12819;if(zodiac[index])add('zodiac',zodiac[index],'all',index+4,value);}
        else if(key==='play:zodiac:athena')add('zodiac','雅典娜宝箱','random',13,value);
        else if((m=/^play:activity:challenge:claim:(\d+):/.exec(key))){const n=stage[m[1]];if(n)add('challenge',`第${n}关`,'all',n,value);}
        else if((m=/^play:activity:zeus:claim:(\d+:\d+:\d+)$/.exec(key))&&zeus[m[1]])add('zeus',zeus[m[1]],'all',Object.keys(zeus).indexOf(m[1])+1,value);
        else if(key==='play:activity:pirate:gift')add('pirate','守卫谢礼','choice',2,value);
        else if(key==='play:activity:pirate:claim:12050:78:9')add('pirate','击败海盗','all',1,value);
        else if(key==='play:treasure:clear')add('treasure','第六关宝箱','all',1,value);
        else if((m=/^play:activity:cooperation:([012])$/.exec(key)))add('cooperation',['协力对战','挑战麦哲伦','挑战郑和'][Number(m[1])],'all',Number(m[1])+1,value);
        else if((m=/^play:instance:(\d+):claim:/.exec(key))){const id=Number(m[1]),state=raw.operations[`instance.${id}.enabled`];add('dungeon',def?.name||dungeonNames.get(id)||`副本 ${id}`,'all',id,value,state===0?'入口当前关闭':state===1?'入口当前开启':null);}
        else if(key==='newbie:creation')add('newbie','新角色福利','all',1,value);
        else if(key.startsWith('exchange:'))add('exchange',exchangeNames[key]||def?.name||`兑换窗口 ${key.slice(9)}`,'exchange',events.exchange.length,value);
        else if((m=/^arcade:(16|21|7:machine:\d+)$/.exec(key))){
          const label=m[1]==='16'?'翻翻乐':m[1]==='21'?'转转乐':`娃娃机 ${m[1].split(':').pop()} 号`;
          const groups=new Map();for(const row of rows(value.rows)){if(Number(row.weight)<=0)continue;const group=Number(row.group)||0;if(!groups.has(group))groups.set(group,[]);groups.get(group).push(row);}
          for(const [group,entries] of groups)add('arcade',`${label} · 奖池 ${group}`,'pool',events.arcade.length,{rows:entries});
        }
        else if(key==='drop-event:limited'){
          const entries=rows(value.rows).filter(r=>Number(r.weight)>0).map(r=>({...reward(r),probability:Number(r.weight)/100}));
          const s=value.settings||{};const fmt=t=>Number.isFinite(Number(t))&&Number(t)>0?new Date(Number(t)*1000).toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false}):'未设置';
          if(entries.length)events.limited.push({title:'限时怪物额外掉落',mode:'drop',order:1,items:entries,note:`当前配置 · ${fmt(s.event_start_utc)} 至 ${fmt(s.event_end_utc)} · 怪物等级 ${Number(s.min_level)||0} 级及以上 · ${Number(s.include_training)===1?'包含练功岛':'不含练功岛'}`});
        }
      }
      const seen=new Set();events.dungeon=events.dungeon.filter(g=>{const signature=g.order+':'+g.items.map(i=>`${i.id}:${i.count}`).join(',');if(seen.has(signature))return false;seen.add(signature);return true;});
      const op=(name,fallback)=>Object.prototype.hasOwnProperty.call(raw.operations,name)?Number(raw.operations[name]):fallback;
      const shentingRows=(prefix,original)=>{
        const entries=Object.entries(original||{}).sort((a,b)=>Number(a[0])-Number(b[0])),result=[];
        for(let index=0;index<8;index++){const [oldId,oldCount]=entries[index]||[0,0],id=op(`${prefix}reward.${index+1}.id`,Number(oldId)),count=op(`${prefix}reward.${index+1}.count`,Number(oldId)?op(`${prefix}item.${oldId}`,Number(oldCount)):0);if(id>0&&count>0)result.push({id,name:itemName(id),count});}
        return result;
      };
      for(const stageData of rows(raw.shenting.stages)){
        const prefix=`shenting.stage.${stageData.stage}.`,items=shentingRows(prefix,stageData.reward?.items),marks=op(`${prefix}marks`,Number(stageData.reward?.marks)||0);
        if(marks>0)items.push({id:0,name:'神庭印记',count:marks});
        events.shenting.push({title:`第${stageData.stage}关 · ${stageData.title}`,mode:'all',order:Number(stageData.stage),items});
      }
      for(const offer of rows(raw.shenting.exchange)){
        const prefix=`shenting.exchange.${offer.key}.`;if(op(`${prefix}enabled`,1)===0)continue;
        const names={'forge.limiter':'限制器锻造','forge.seraph':'炽天使锻造','candy':'伙伴糖果','recharge':'储值卡'},cost=op(`${prefix}cost`,Number(offer.cost_marks));
        events.shenting.push({title:`印记兑换 · ${names[offer.key]||offer.key}`,mode:'exchange',order:20+events.shenting.length,items:shentingRows(prefix,offer.items),note:`消耗 ${cost} 枚神庭印记，每周限 ${offer.weekly_limit} 次${offer.shared_limit_group?'，同组兑换共享次数':''}`});
      }
      for(const kind of rows(raw.world_pvp?.kinds))add('world',({10001:'木箱',10002:'银箱',10003:'金箱'})[kind.id]||`宝箱 ${kind.id}`,'random',kind.id,{rows:kind.rewards});
      add('draw','线上抽奖奖池','random',1,{rows:raw.online_draw?.rewards});
      for(const campaign of rows(raw.commerce?.campaigns))for(const tier of rows(campaign.tiers)){
        const threshold=campaign.kind==='first'?'首次储值':campaign.kind==='recharge'?`储值 ${Number(tier.threshold)/100} 元`:`消费 ${tier.threshold} 点`;
        const formatDate=value=>{const date=new Date(value);return Number.isNaN(date.getTime())?'时间待核对':date.toLocaleString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false});};
        const dates=campaign.starts_at&&campaign.ends_at?` · ${formatDate(campaign.starts_at)} 至 ${formatDate(campaign.ends_at)}（北京时间）`:'';
        add('campaign',`${campaign.name} · ${threshold}`,'all',campaign.enabled?0:1,{rows:tier.rewards},`${campaign.enabled?'当前启用':'当前未启用'}${dates}`);
      }
      for(const list of Object.values(events))list.sort((a,b)=>(a.order||0)-(b.order||0));
      activities.events=events;activities.updated=raw.server_version;activities.live=true;
    }
    const news=original.news ? clone(original.news) : null;
    if(news){const announcement=String(raw.announcement||'').trim();if(announcement&&announcement!=='暂无公告。')news.news.unshift({category:'公告',date:'',title:'游戏最新公告',body:announcement.split(/\r?\n/).filter(Boolean)});}
    return {catalog,activities,news,itemImages,containerIds:[...containerIds],raw};
  }
  if (typeof module !== 'undefined' && module.exports) module.exports={project};
  if (!scope || !scope.document) return;
  const needsIcons=!!scope.WLO_ITEM_IMAGES;
  const needsModels=!!scope.WLO_CATALOG;
  const original={catalog:scope.WLO_CATALOG?clone(scope.WLO_CATALOG):null,activities:scope.WLO_ACTIVITIES?clone(scope.WLO_ACTIVITIES):null,news:scope.SITE_CONTENT?clone(scope.SITE_CONTENT):null,itemImages:scope.WLO_ITEM_IMAGES?clone(scope.WLO_ITEM_IMAGES):{}};
  let version='',lastContent=null,timer=null,failures=0,inflight=false,iconVersion='',iconGraphics=null,iconPending=false,iconRetryAt=0,iconState=needsIcons?'pending':'none',modelFeedVersion='',modelPending=false,modelRetryAt=0,lastConnected=false,lastChecked='';
  const status=scope.document.createElement('p');status.className='live-sync-status';status.setAttribute('role','status');status.textContent='正在连接游戏资料…';
  const main=scope.document.querySelector('main');if(main)main.prepend(status);
  const updateStatus=(connected,checked) => {lastConnected=connected;lastChecked=checked;status.classList.toggle('live-sync-offline',!connected);status.textContent=connected?`已连接游戏数据 · ${new Date(checked).toLocaleTimeString('zh-CN',{timeZone:'Asia/Shanghai',hour12:false})}${iconState==='pending'?' · 正在同步图标':iconState==='failed'?' · 图标暂不可用':''}`:'实时资料暂不可用，当前展示上次资料';};
  const schedule=delay=>{clearTimeout(timer);if(!scope.document.hidden)timer=setTimeout(poll,delay);};
  const scheduleRetry=()=>{
    failures++;
    schedule(Math.min(30000,5000*2**Math.min(failures-1,3)));
  };
  function applyIcons(raw){
    if(!iconGraphics||!raw)return;const images={...scope.WLO_ITEM_IMAGES};
    const paths=new Map(Object.entries(iconGraphics).map(([picture,png])=>[Number(picture),'data:image/png;base64,'+png]));
    for(const item of raw.items){const src=paths.get(item.picture);if(src)images[item.id]=src;}
    scope.WLO_ITEM_IMAGES=images;scope.dispatchEvent(new CustomEvent('wlo-live-icons'));
  }
  async function pollIcons(){
    if(!needsIcons||!lastContent||iconPending||Date.now()<iconRetryAt)return;
    const expected=lastContent.icon_version,player=lastContent.model_version;
    if(!/^[a-f0-9]{64}$/.test(expected)||! /^[a-f0-9]{64}$/.test(player))return;
    if(iconVersion===expected&&iconGraphics){if(iconState!=='ready')applyIcons(lastContent);iconState='ready';return;}
    iconPending=true;iconState='pending';updateStatus(lastConnected,lastChecked);
    try{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let response;
      try{response=await fetch(`${ICON_FEED}${iconVersion?'?v='+encodeURIComponent(iconVersion):''}`,{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}
      if(!response.ok)throw Error('图标服务不可用');const result=await response.json();
      if(!result.ok||!result.connected||result.version!==expected||result.unchanged||result.content?.schema!=='wlo-public-game-icons-v1'||result.content.player_version!==player||!result.content.graphics)throw Error('图标版本不匹配');
      if(!lastContent||lastContent.icon_version!==expected||lastContent.model_version!==player)return;
      iconVersion=expected;iconGraphics=result.content.graphics;iconState='ready';iconRetryAt=0;applyIcons(lastContent);
    }catch(_){iconState='failed';iconRetryAt=Date.now()+30000;}
    finally{iconPending=false;updateStatus(lastConnected,lastChecked);}
  }
  async function pollModels(){
    if(!needsModels||!lastContent||modelPending||Date.now()<modelRetryAt)return;
    const expected=lastContent.model_feed_version,player=lastContent.model_version;
    if(!/^[a-f0-9]{64}$/.test(expected)||!/^[a-f0-9]{64}$/.test(player)||modelFeedVersion===expected)return;
    modelPending=true;
    try{
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);let response;
      try{response=await fetch(`${MODEL_FEED}`,{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}
      if(!response.ok)throw Error('模型服务不可用');const result=await response.json();
      if(!result.ok||!result.connected||result.version!==expected||result.unchanged||result.content?.schema!=='wlo-public-game-models-v1'||result.content.player_version!==player||!result.content.graphics)throw Error('模型版本不匹配');
      if(!lastContent||lastContent.model_feed_version!==expected||lastContent.model_version!==player)return;
      modelFeedVersion=expected;scope.WLO_MODEL_GRAPHICS=result.content.graphics;scope.WLO_MODEL_VERSION=player;modelRetryAt=0;scope.dispatchEvent(new CustomEvent('wlo-live-models'));
    }catch(_){modelRetryAt=Date.now()+30000;}
    finally{modelPending=false;}
  }
  async function poll(){
    if(inflight || scope.document.hidden)return;inflight=true;
    try {
      const controller=new AbortController(),timeout=setTimeout(()=>controller.abort(),15000);
      let response;try{response=await fetch(`${FEED}${version?'?v='+encodeURIComponent(version):''}`,{cache:'no-store',signal:controller.signal});}finally{clearTimeout(timeout);}
      if(!response.ok)throw Error('资料服务不可用');
      const result=await response.json();
      if(!result.ok || !/^[a-f0-9]{64}$/.test(result.version) || typeof result.connected!=='boolean')throw Error('资料返回无效');
      if(!result.unchanged){lastContent=result.content;const value=project(lastContent,original);version=result.version;scope.WLO_ITEM_IMAGES=value.itemImages;if(needsModels&&modelFeedVersion!==lastContent.model_feed_version){scope.WLO_MODEL_GRAPHICS={};scope.WLO_MODEL_VERSION=lastContent.model_version;}scope.WLO_CONTAINER_IDS=value.containerIds;scope.dispatchEvent(new CustomEvent('wlo-live-game',{detail:value}));if(iconVersion===lastContent.icon_version)applyIcons(lastContent);}
      else if(!lastContent || result.version!==version)throw Error('缺少资料版本');
      updateStatus(result.connected,result.checked_at);
      if(!result.connected){scheduleRetry();return;}
      failures=0;
      pollIcons();
      pollModels();
      schedule(5000);
    } catch (_) {updateStatus(false,'');scheduleRetry();}
    finally{inflight=false;}
  }
  scope.document.addEventListener('visibilitychange',()=>{if(scope.document.hidden)clearTimeout(timer);else schedule(0);});
  schedule(0);
})(typeof window==='undefined'?null:window);
