(() => {
  const data = window.WLO_ACTIVITIES;
  if (!data) return;
  const descriptions = {
    zodiac: {
      name: '圣殿十二宫', kicker: 'ZODIAC PALACE', style: 'zodiac',
      description: '穿越星座守卫的试炼，向雅典娜发起最后的挑战。',
      facts: ['入口：前往雅典城，按游戏内提示报名', '面板配置时段：周日 00:00–24:00', '挑战各宫守卫，胜利后获得对应奖励', '雅典娜宝箱需由本人开启'],
      rewards: '下列为第 4–12 宫的通关奖励与最终宝箱奖池。'
    },
    challenge: {
      name: '勇闯30关', kicker: 'THIRTY STAGES', style: 'zodiac',
      description: '与旅伴逐关前进，挑战一波又一波守卫。',
      facts: ['入口：威灵村国会大楼四楼', '面板配置时段：周五 00:00–24:00', '按顺序通关，挑战下一层', '下方列出第 5–30 关奖励'],
      rewards: '每个关卡列出该关配置的物品和数量。'
    },
    zeus: {
      name: '宙斯挑战', kicker: 'ZEUS TRIAL', style: 'zeus',
      description: '踏入天空神殿，迎接众神与隐藏关的考验。',
      facts: ['入口：从游戏内活动面板参加', '面板配置时段：周三 00:00–24:00', '依次挑战四个关卡', '隐藏关奖励按对应通关资格领取'],
      rewards: '下列物品为各关战胜后的配置奖励。'
    },
    pirate: {
      name: '海盗来袭', kicker: 'PIRATE INVASION', style: 'pirate',
      description: '集结伙伴迎战海盗，守护海岛。',
      facts: ['入口：威灵村至海底通道或游戏内活动面板', '面板配置时段：每天 00:01–23:59', '击败海盗后领取战斗奖励', '守卫谢礼两项任选一项，每个角色每日一次'],
      rewards: '击败海盗与守卫谢礼分别列出，留意每组的领取方式。'
    },
    treasure: {
      name: '夺宝大作战', kicker: 'TREASURE HUNT', style: 'pirate',
      description: '穿越六关，击败最终首领，打开属于自己的宝箱。',
      facts: ['入口：从游戏内活动面板参加', '面板配置时段：周一 00:00–24:00', '依次挑战六关，击败首领后本人开启宝箱', '每个角色每次活动领取一次'],
      rewards: '下列为最终宝箱配置的物品和数量。'
    },
    cooperation: {
      name: '协力战', kicker: 'COOPERATION', style: 'pirate',
      description: '与队友并肩对战，或共同挑战麦哲伦与郑和。',
      facts: ['入口：游戏内活动面板选择协力战', '面板资料：每天 00:01–23:59', '协力对战由 2–4 人组队，每人每日三次', '挑战麦哲伦与郑和需三场共同胜利'],
      rewards: '三种玩法分别列出对应的通关奖励。'
    },
    shenting: {
      name: '神庭回响', kicker: 'DIVINE TRIAL', style: 'zodiac',
      description: '挑战八关强敌，积累神庭印记并兑换奖励。',
      facts: ['入口：十二宫报名员，选择神庭回响', '快照时段：周四 00:00–24:00', '快照报名费：每人 50,000 金币', '未转生 180 级或转职／转生后 100 级起'],
      rewards: '列出八关通关奖励和印记兑换内容，印记按游戏内资格领取。'
    },
    world: {
      name: '世界PK', kicker: 'WORLD PVP', style: 'zeus',
      description: '参加世界PK，获胜并满足资格后可获得宝箱。',
      facts: ['入口：游戏内世界PK界面', '木箱、银箱和金箱分别有各自奖池', '开启宝箱时随机获得其中一项', '具体参赛条件与次数以游戏内显示为准'],
      rewards: '下列为木箱、银箱、金箱的配置奖池。'
    },
    dungeon: {
      name: '副本奖励', kicker: 'DUNGEONS', style: 'zodiac',
      description: '查找不同副本的通关奖励，出发前先看看。',
      facts: ['按副本名称或物品名称搜索', '每个卡片展示对应副本的奖励配置', '部分入口在快照中处于关闭状态', '入场条件、次数及开启状态以游戏内为准'],
      rewards: '列出快照中已配置奖励的副本。'
    },
    campaign: {
      name: '福利活动', kicker: 'CAMPAIGNS', style: 'pirate',
      description: '查看储值、消费与累计活动的档位、时间和奖励。',
      facts: ['开启与时间均按 11 月 11 日配置快照展示', '储值档位按元展示，消费档位按游戏点数展示', '循环活动按卡片注明的额度重复计算', '实际开启、资格与领取以游戏内为准'],
      rewards: '包含快照中启用和未启用的活动档位，启用项排在前面。'
    },
    limited: {
      name: '限时怪物额外掉落', kicker: 'LIMITED DROPS', style: 'pirate',
      description: '活动时间内击败符合条件的怪物，有机会获得额外物品。',
      facts: ['快照条件：怪物等级 10 级及以上', '快照范围包含练功岛', '每只符合条件的怪物死亡时额外抽取一次', '捕捉和玩家PK不触发此掉落', '合击与幸运草可能使获得数量增加'],
      rewards: '列出快照中的额外掉落物品、数量和对应概率；活动时间见下方卡片。'
    },
    draw: {
      name: '线上抽奖', kicker: 'DAILY DRAW', style: 'pirate',
      description: '每天参与线上抽奖，查看转盘里的物品与数量。',
      facts: ['入口：游戏内线上抽奖界面', '每天三次，按北京时间日期计算', '每次从奖池中随机获得一项', '奖品与实际开放状态以游戏内为准'],
      rewards: '列出快照中权重大于零的抽奖格。'
    },
    newbie: {
      name: '新手福利', kicker: 'NEW ADVENTURER', style: 'pirate',
      description: '新角色开始冒险时可以领取的本服福利。',
      facts: ['对象：新创建的角色', '首次进入游戏并完成原新手发放后领取一次', '具体领取提示以游戏内显示为准', '福利内容可由后台调整'],
      rewards: '下列为新角色福利配置中的物品和数量。'
    },
    exchange: {
      name: '活动兑换', kicker: 'EXCHANGE', style: 'pirate',
      description: '查看兑换窗口的材料、数量和可换取物品。',
      facts: ['查看各兑换员或兑换窗口的物品', '每项显示所需材料与数量', '兑换开关与材料以游戏内实际窗口为准', '部分兑换窗口的具体位置以游戏内为准'],
      rewards: '列出快照中已启用并配置材料的兑换项目。'
    },
    arcade: {
      name: '游戏屋', kicker: 'ARCADE', style: 'pirate',
      description: '查看翻翻乐、转转乐和娃娃机已配置的奖池。',
      facts: ['从游戏内游戏屋选择玩法', '翻翻乐与转转乐有不同奖池和结果规则', '娃娃机按机台分别配置', '实际费用、可参与状态和奖品以游戏内为准'],
      rewards: '按玩法和奖池分组，池内物品不等同于每次都能获得。'
    },
    temple: {
      name: '神殿挑战', kicker: 'TEMPLE', style: 'zodiac',
      description: '从活动面板前往神殿，挑战对应守卫。',
      facts: ['入口：游戏内活动面板', '开放时段与入场资格以游戏内显示为准', '战胜后按对应资格领取奖励', '当前快照没有可核对的专用奖励清单'],
      rewards: '奖励名称和数量尚未核对。'
    },
    quiz: {
      name: '机智问答', kicker: 'QUIZ', style: 'pirate',
      description: '根据题目选择答案，挑战连续答对的纪录。',
      facts: ['入口：游戏内活动面板', '11 月 11 日快照中各日入口关闭', '题目与参与规则以游戏内显示为准', '当前快照没有可核对的奖励清单'],
      rewards: '奖励名称和数量尚未核对。'
    },
    wind: {
      name: '全民大风吹', kicker: 'MOVING ANSWERS', style: 'pirate',
      description: '根据题目移动到对应答案区域，连续答对获得更高分数。',
      facts: ['入口：游戏内活动面板', '当前基线的报名入口暂未开放', '面板预设时段：周二 19:00–19:30', '10 级及以上单人参加，需退出队伍'],
      rewards: '奖励名称和数量尚未核对。'
    },
    team: {
      name: '团P大竞赛', kicker: 'TEAM PVP', style: 'zeus',
      description: '与队友报名参加团队对战。',
      facts: ['入口：游戏内活动面板或报名员', '面板配置时段：周六 00:00–24:00', '组队与参赛条件以游戏内显示为准', '当前快照没有可核对的专用奖励清单'],
      rewards: '奖励名称和数量尚未核对。'
    },
    arena: {
      name: '无界PK擂台', kicker: 'ARENA', style: 'zeus',
      description: '报名进入擂台，与其他冒险者对战。',
      facts: ['入口：游戏内活动面板或报名员', '面板配置时段：周六、周日 00:00–24:00', '具体资格与次数以游戏内显示为准', '当前快照没有可核对的专用奖励清单'],
      rewards: '奖励名称和数量尚未核对。'
    },
    siege: {
      name: '组织攻城战', kicker: 'SIEGE', style: 'zodiac',
      description: '组织成员集结，参与攻城争夺。',
      facts: ['入口：游戏内组织与攻城界面', '面板配置时段：周日 12:00–24:00', '参赛资格与规则以游戏内显示为准', '当前快照没有可核对的专用奖励清单'],
      rewards: '奖励名称和数量尚未核对。'
    }
  };
  const tabs = [...document.querySelectorAll('[data-event]')];
  const groups = document.getElementById('reward-groups');
  const search = document.getElementById('reward-search');
  let currentKey = 'zodiac';
  const element = (tag, className, text) => {
    const node = document.createElement(tag);
    if (className) node.className = className;
    if (text !== undefined) node.textContent = text;
    return node;
  };
  function show(name) {
    const current = descriptions[name] || descriptions.zodiac;
    const key = descriptions[name] ? name : 'zodiac';
    tabs.forEach(tab => {
      const active = tab.dataset.event === key;
      tab.classList.toggle('selected', active);
      if (active) tab.setAttribute('aria-current', 'page');
      else tab.removeAttribute('aria-current');
    });
    document.getElementById('activity-title').textContent = current.name;
    document.getElementById('activity-kicker').textContent = current.kicker;
    document.getElementById('activity-description').textContent = current.description;
    document.getElementById('activity-visual').className = `activity-detail-hero visual-${current.style}`;
    document.getElementById('reward-intro').textContent = current.rewards;
    document.getElementById('activity-facts').replaceChildren(...current.facts.map(fact => element('p', '', fact)));
    currentKey = key;
    search.value = '';
    renderGroups();
  }
  function renderGroups() {
    const query = search.value.trim().toLocaleLowerCase();
    const rows = data.events[currentKey].filter(group => [group.title,group.note,...group.items.flatMap(item=>[item.name,item.costName])].join(' ').toLocaleLowerCase().includes(query));
    document.getElementById('reward-result-count').textContent = rows.length ? `显示 ${rows.length} 组奖励资料` : query ? '没有找到相关奖励' : '当前快照暂无已核对的奖励清单';
    groups.replaceChildren();
    for (const group of rows) {
      const card = element('article', 'reward-card');
      const heading = element('div', 'reward-card-heading');
      heading.append(element('h4', '', group.title));
      const mode = group.mode === 'random' ? '随机获得一项' : group.mode === 'choice' ? '任选一项' : group.mode === 'pool' ? '奖池内容' : group.mode === 'drop' ? '额外掉落' : group.mode === 'exchange' || group.title.startsWith('印记兑换') ? '兑换项目' : currentKey === 'campaign' ? '档位奖励' : currentKey === 'newbie' ? '领取奖励' : '通关奖励';
      heading.append(element('span', 'reward-mode', mode));
      const list = element('ul', 'reward-items');
      for (const item of group.items) {
        const line = element('li', 'reward-item');
        const imagePath = (window.WLO_ITEM_IMAGES || {})[item.id];
        if (imagePath) {
          const img = element('img', 'reward-item-image');
          img.src = imagePath; img.alt = ''; img.loading = 'lazy';
          line.append(img);
        }
        const linked = (window.WLO_CONTAINER_IDS || []).includes(item.id);
        const label = element(linked ? 'a' : 'span', 'reward-item-name', item.name);
        if (linked) { label.href = `gameinfo.html#item-${item.id}`; label.title = '查看福袋或礼包内容'; }
        const text = element('span', 'reward-item-text');text.append(label);
        if (item.costName) text.append(element('small', 'reward-cost', `需要 ${item.costName} × ${item.costCount}`));
        if (Number.isFinite(item.probability)) text.append(element('small', 'reward-cost', `概率 ${item.probability}%`));
        line.append(text, element('b', 'reward-quantity', `× ${item.count}`));
        list.append(line);
      }
      card.append(heading);
      if (group.note) card.append(element('p', 'reward-note', group.note));
      card.append(list);
      groups.append(card);
    }
  }
  function fromHash() { show(location.hash.slice(1)); }
  search.addEventListener('input', renderGroups);
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
