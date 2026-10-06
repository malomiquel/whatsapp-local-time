(() => {
  'use strict';

  const { diffLabel } = globalThis.WTZ;
  const list = document.getElementById('people');
  const empty = document.getElementById('empty');
  const perMessage = document.getElementById('per-message');

  const timeIn = (tz) => new Intl.DateTimeFormat(undefined, { timeZone: tz, hour: '2-digit', minute: '2-digit' }).format(new Date());

  function render(people) {
    const entries = Object.entries(people).sort(([, a], [, b]) => (a.name || '').localeCompare(b.name || ''));
    empty.hidden = entries.length > 0;
    list.replaceChildren(...entries.map(([key, { tz, name }]) => {
      const who = document.createElement('strong');
      who.textContent = name || key;
      const where = document.createElement('span');
      where.textContent = `${timeIn(tz)} · ${tz.replace(/_/g, ' ')} (${diffLabel(tz)})`;
      const info = document.createElement('div');
      info.append(who, where);

      const remove = document.createElement('button');
      remove.type = 'button';
      remove.title = 'Oublier ce fuseau';
      remove.textContent = '✕';
      remove.addEventListener('click', () => {
        const next = { ...people };
        delete next[key];
        chrome.storage.sync.set({ people: next });
      });

      const item = document.createElement('li');
      item.append(info, remove);
      return item;
    }));
  }

  chrome.storage.sync.get({ people: {}, perMessage: true }, (data) => {
    perMessage.checked = data.perMessage;
    render(data.people);
  });

  chrome.storage.onChanged.addListener((changes, area) => {
    if (area === 'sync' && changes.people) render(changes.people.newValue || {});
  });

  perMessage.addEventListener('change', () => chrome.storage.sync.set({ perMessage: perMessage.checked }));
})();
