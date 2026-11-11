(() => {
  const entries = window.SITE_CONTENT.news;
  const list = document.getElementById('news-list');
  const tabs = Array.from(document.querySelectorAll('.news-tabs button'));
  const dialog = document.getElementById('article-dialog');
  let lastFocused = null;

  function openArticle(item) {
    lastFocused = document.activeElement;
    document.getElementById('article-label').textContent = 'WONDERLAND · ' + item.category;
    document.getElementById('article-title').textContent = item.title;
    document.getElementById('article-date').textContent = item.date || '地表最强 · 玩家资讯';
    const body = document.getElementById('article-body');
    body.replaceChildren(...item.body.map(text => { const p = document.createElement('p'); p.textContent = text; return p; }));
    dialog.showModal();
  }
  function render(category) {
    const filtered = category === '全部' ? entries : entries.filter(item => item.category === category);
    list.replaceChildren();
    if (!filtered.length) { const empty = document.createElement('p'); empty.className = 'news-empty'; empty.textContent = '暂无相关资讯，请留意后续更新。'; list.append(empty); return; }
    filtered.forEach(item => {
      const button = document.createElement('button'); button.type = 'button'; button.className = 'news-row';
      const tag = document.createElement('span'); tag.className = 'news-tag'; tag.textContent = item.category;
      const title = document.createElement('span'); title.className = 'news-title'; title.textContent = item.title;
      const date = document.createElement('time'); date.textContent = item.date ? item.date.slice(5).replace('-', '/') : '✦';
      if (item.date) date.dateTime = item.date;
      button.append(tag, title, date); button.addEventListener('click', () => openArticle(item)); list.append(button);
    });
  }
  tabs.forEach(tab => tab.addEventListener('click', () => {
    tabs.forEach(other => { other.classList.toggle('selected', other === tab); other.setAttribute('aria-selected', String(other === tab)); });
    render(tab.dataset.category);
  }));
  tabs.forEach((tab, index) => tab.addEventListener('keydown', event => {
    if (event.key !== 'ArrowLeft' && event.key !== 'ArrowRight') return;
    event.preventDefault();
    const next = tabs[(index + (event.key === 'ArrowRight' ? 1 : tabs.length - 1)) % tabs.length];
    next.focus(); next.click();
  }));
  document.querySelectorAll('.dialog-close, .dialog-done').forEach(button => button.addEventListener('click', () => dialog.close()));
  dialog.addEventListener('close', () => { if (lastFocused) lastFocused.focus(); });
  dialog.addEventListener('click', event => { if (event.target === dialog) dialog.close(); });
  const toggle = document.querySelector('.menu-toggle');
  const nav = document.getElementById('site-nav');
  toggle.addEventListener('click', () => { const opened = toggle.getAttribute('aria-expanded') === 'true'; toggle.setAttribute('aria-expanded', String(!opened)); nav.classList.toggle('open', !opened); });
  nav.querySelectorAll('a').forEach(link => link.addEventListener('click', () => { nav.classList.remove('open'); toggle.setAttribute('aria-expanded', 'false'); }));
  render('全部');
})();
