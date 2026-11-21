(() => {
  'use strict';
  const endpoint = 'https://wlo-rhode-website-bridge.onrender.com/dragon-raid-ballot';
  const get = id => document.getElementById(id);
  const form = get('ballot-form');
  const codeInput = get('ballot-code');
  const submit = get('ballot-submit');
  const refresh = get('ballot-refresh');
  const dateText = new Intl.DateTimeFormat('zh-CN', {
    timeZone: 'Asia/Shanghai', year: 'numeric', month: '2-digit', day: '2-digit',
    hour: '2-digit', minute: '2-digit', hourCycle: 'h23',
  });
  const time = date => dateText.format(new Date(date));
  let current, voted, reviewing, submitting, changeAt;

  function say(message, error = false) {
    const feedback = get('ballot-message');
    feedback.textContent = message;
    feedback.dataset.error = String(error);
    feedback.hidden = !message;
  }

  function imageFor(item) {
    const src = window.WLO_ITEM_IMAGES?.[item];
    if (!src) return null;
    const icon = new Image();
    icon.src = src;
    icon.alt = '';
    icon.onerror = () => icon.remove();
    return icon;
  }

  function details(row, text) {
    const link = document.createElement('a');
    link.href = 'gameinfo.html#item-' + row.item;
    link.textContent = text;
    return link;
  }

  function renderChoices(round, selected) {
    get('ballot-choices').replaceChildren(...round.choices.map(row => {
      const card = document.createElement('div');
      card.className = 'ballot-option';
      const select = document.createElement('label');
      const radio = document.createElement('input');
      radio.name = 'item';
      radio.type = 'radio';
      radio.value = row.item;
      radio.required = true;
      radio.checked = radio.value === selected;
      select.append(radio);
      const icon = imageFor(row.item);
      if (icon) select.append(icon);
      select.append(row.name);
      const count = document.createElement('span');
      count.textContent = row.votes + ' 票';
      card.append(select, count, details(row, '查看内容'));
      return card;
    }));
  }

  function renderResults(round) {
    get('ballot-results').hidden = !round;
    if (!round) return;
    get('ballot-result-period').textContent = '北京时间 ' + time(round.starts_at) + ' 至 ' + time(round.ends_at);
    get('ballot-winners').replaceChildren(...round.winners.map(row => {
      const entry = document.createElement('li');
      const icon = imageFor(row.item);
      if (icon) entry.append(icon);
      const count = document.createElement('span');
      count.textContent = row.votes + ' 票';
      entry.append(details(row, row.name), count);
      return entry;
    }));
    get('ballot-result-summary').textContent = round.winners.length
      ? '下期入选 ' + round.winners.length + ' 种福袋，共收到 ' + round.total_votes + ' 票。'
      : '本期没有收到投票，未产生入选福袋。';
  }

  function render(view) {
    const sameRound = current?.id === view.current?.id;
    const selected = sameRound ? form.querySelector('input[name="item"]:checked')?.value : null;
    current = view.current;
    if (!sameRound) {
      codeInput.value = '';
      say('');
    }
    form.hidden = !current || current.id === voted;
    get('ballot-state').textContent = current
      ? '北京时间 ' + time(current.starts_at) + ' 至 ' + time(current.ends_at) +
        ' · 最多选出 ' + current.winner_count + ' 种 · 已投 ' + current.total_votes + ' 票'
      : '当前没有开放的福袋投票。';
    if (current) renderChoices(current, selected);
    get('ballot-upcoming').hidden = !view.upcoming;
    if (view.upcoming) get('ballot-upcoming-text').textContent = '北京时间 ' + time(view.upcoming.starts_at) + ' 开放。';
    renderResults(view.result);
    clearTimeout(changeAt);
    const nextChange = current?.ends_at || view.upcoming?.starts_at;
    if (nextChange) {
      const remaining = Date.parse(nextChange) - Date.parse(view.server_time);
      if (remaining >= 0) changeAt = setTimeout(load, remaining + 500);
    }
  }

  async function request(options = {}) {
    const response = await fetch(endpoint, {
      cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(15000), ...options,
    });
    return response.json();
  }

  async function load() {
    if (reviewing || submitting) return;
    reviewing = true;
    refresh.disabled = true;
    try {
      const view = await request();
      if (!view.ok || !Object.hasOwn(view, 'current')) throw Error('Ballot unavailable');
      render(view);
    } catch {
      current = null;
      form.hidden = true;
      get('ballot-upcoming').hidden = true;
      get('ballot-results').hidden = true;
      get('ballot-state').textContent = '暂时无法读取福袋投票，请稍后刷新。';
    } finally {
      reviewing = false;
      refresh.disabled = false;
    }
  }

  refresh.addEventListener('click', load);
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (submitting || reviewing || !current) return;
    const code = codeInput.value.replace(/[\s\-]+/g, '').toLowerCase();
    const item = Number(new FormData(form).get('item'));
    if (!/^[a-f0-9]{32}$/.test(code)) {
      say('请输入游戏中显示的 32 位投票码。', true);
      codeInput.focus();
      return;
    }
    if (!current.choices.some(row => row.item === item)) return;
    const period = current.id;
    submitting = true;
    submit.disabled = refresh.disabled = true;
    say('正在提交投票…');
    let update = false;
    try {
      const result = await request({
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ period, item, code }),
      });
      if (result.ok && result.status === 'recorded' && result.period === period && result.item === item) {
        say('投票成功，已投给「' + result.name + '」。');
        voted = period;
        codeInput.value = '';
        form.hidden = true;
        update = true;
      } else if (result.status === 'unavailable') {
        say('暂未确认投票结果，可以用同一投票码和同一福袋重试。', true);
      } else {
        say(result.message || '暂未确认投票结果。', true);
        if (result.status === 'closed' || result.status === 'invalid_choice') update = true;
        if (result.status === 'already_voted') {
          voted = period;
          codeInput.value = '';
          form.hidden = true;
        }
      }
    } catch {
      say('暂未确认投票结果，可以用同一投票码和同一福袋重试。', true);
    } finally {
      submitting = false;
      submit.disabled = refresh.disabled = false;
      if (update) load();
    }
  });
  load();
})();
