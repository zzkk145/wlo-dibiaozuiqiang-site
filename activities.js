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
    }
  };
  const tabs = [...document.querySelectorAll('[data-event]')];
  const groups = document.getElementById('reward-groups');
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
    groups.replaceChildren();
    for (const group of data.events[key]) {
      const card = element('article', 'reward-card');
      const heading = element('div', 'reward-card-heading');
      heading.append(element('h4', '', group.title));
      const mode = group.mode === 'random' ? '随机获得一项' : group.mode === 'choice' ? '任选一项' : '通关奖励';
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
        line.append(element('span', 'reward-item-name', item.name), element('b', 'reward-quantity', `× ${item.count}`));
        list.append(line);
      }
      card.append(heading, list);
      groups.append(card);
    }
  }
  function fromHash() { show(location.hash.slice(1)); }
  window.addEventListener('hashchange', fromHash);
  fromHash();
})();
