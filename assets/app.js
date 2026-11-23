const DEFAULT_ENTRIES = window.QUANT_NAV_ENTRIES || [];

const STORAGE_KEY = 'quant-nav.entries.v1';
const ICONS = {
  grid: '<rect x="3.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="3.5" width="7" height="7" rx="1.3"/><rect x="3.5" y="13.5" width="7" height="7" rx="1.3"/><rect x="13.5" y="13.5" width="7" height="7" rx="1.3"/>',
  folder: '<path d="M3.5 7.2A1.7 1.7 0 0 1 5.2 5.5h4l1.8 1.8h7.8a1.7 1.7 0 0 1 1.7 1.7v8.8a1.7 1.7 0 0 1-1.7 1.7H5.2a1.7 1.7 0 0 1-1.7-1.7z"/><path d="M3.8 10h16.4"/>',
  workflow: '<rect x="3.5" y="3.5" width="6" height="6" rx="1.5"/><rect x="14.5" y="14.5" width="6" height="6" rx="1.5"/><path d="M9.5 6.5h4a2 2 0 0 1 2 2v6M14.5 17.5h-4a2 2 0 0 1-2-2v-6"/>',
  database: '<ellipse cx="12" cy="5.5" rx="7.5" ry="3"/><path d="M4.5 5.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6M4.5 11.5v6c0 1.7 3.4 3 7.5 3s7.5-1.3 7.5-3v-6"/>',
  chart: '<path d="M4 19.5V15M9.3 19.5V9.5M14.7 19.5v-7M20 19.5V5"/><path d="m4 11 5.3-4 5.4 2 5.3-5"/>',
  history: '<path d="M4.5 8.2A8 8 0 1 1 4 13"/><path d="M4.5 4.5v4.2h4.2M12 7.5v5l3.2 1.8"/>',
  terminal: '<rect x="3.5" y="4.5" width="17" height="15" rx="2"/><path d="m7 9 3 2.7L7 14.5M12.5 15h4"/>',
  pulse: '<path d="M3 12h4l2.1-6 4.2 12 2.2-6H21"/><path d="M3.5 4.5h17v15h-17z"/>',
  layers: '<path d="m12 3.5 8.5 4.7-8.5 4.7-8.5-4.7z"/><path d="m3.5 12 8.5 4.7 8.5-4.7M3.5 16.3l8.5 4.2 8.5-4.2"/>',
  shield: '<path d="M12 3.5 19 6v5.3c0 4.5-2.9 7.6-7 9.2-4.1-1.6-7-4.7-7-9.2V6z"/><path d="m9 12 2 2 4-4"/>',
  search: '<circle cx="10.8" cy="10.8" r="6.8"/><path d="m16 16 4.5 4.5"/>',
  plus: '<path d="M12 5v14M5 12h14"/>',
  arrow: '<path d="M5 12h14M13 6l6 6-6 6"/>',
  external: '<path d="M13 5h6v6M19 5l-9 9"/><path d="M17 13v5a1 1 0 0 1-1 1H6a1 1 0 0 1-1-1V8a1 1 0 0 1 1-1h5"/>',
  star: '<path d="m12 3.8 2.5 5.1 5.6.8-4 3.9 1 5.5-5.1-2.6-5.1 2.6 1-5.5-4-3.9 5.6-.8z"/>',
  edit: '<path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4z"/>',
  menu: '<path d="M4 6h16M4 12h16M4 18h16"/>',
  close: '<path d="m6 6 12 12M18 6 6 18"/>',
};

const state = {
  entries: loadEntries(),
  activeCategory: '全部入口',
  query: '',
};

const categoryNav = document.querySelector('#category-nav');
const filterRow = document.querySelector('#filter-row');
const entryGrid = document.querySelector('#entry-grid');
const favoritesGrid = document.querySelector('#favorites-grid');
const emptyState = document.querySelector('#empty-state');
const searchInput = document.querySelector('#search-input');
const dialog = document.querySelector('#entry-dialog');
const form = document.querySelector('#entry-form');
const toast = document.querySelector('#toast');
let toastTimeout;

function icon(name, className = '') {
  const shape = ICONS[name] || ICONS.grid;
  return `<svg class="${className}" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.65" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true">${shape}</svg>`;
}

function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (character) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;',
  })[character]);
}

function normalizeEntry(entry, index) {
  return {
    id: String(entry.id || `entry-${index + 1}`),
    name: String(entry.name || '未命名入口'),
    category: String(entry.category || '未分类'),
    description: String(entry.description || ''),
    url: normalizeStoredUrl(entry.url),
    favorite: Boolean(entry.favorite),
    icon: ICONS[entry.icon] ? entry.icon : 'grid',
    tone: ['green', 'amber', 'blue', 'violet'].includes(entry.tone) ? entry.tone : 'green',
  };
}

function normalizeStoredUrl(value) {
  const url = String(value || '').trim();
  if (!url) return '';
  if (/^\.\/docs\/architecture\/[\w.-]+\.(svg|drawio)$/i.test(url)) return url;
  try {
    const parsed = new URL(url);
    if (parsed.protocol === 'file:') {
      const localPath = decodeURIComponent(parsed.pathname)
        .replace(/^\/([a-z]:)/i, '$1')
        .replace(/\//g, '\\')
        .toLowerCase();
      if (localPath === 'd:\\tool\\dataset\\catalog\\index.html') {
        const isLocalNavHost = ['quant-nav.localhost', 'localhost', '127.0.0.1'].includes(window.location.hostname);
        return isLocalNavHost ? `${window.location.origin}/data-assets/index.html` : '';
      }
    }
    return ['http:', 'https:', 'file:'].includes(parsed.protocol) && (parsed.protocol !== 'file:' || !parsed.hostname)
      ? parsed.href
      : '';
  } catch {
    return '';
  }
}

function loadEntries() {
  try {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (!saved) return DEFAULT_ENTRIES.map(normalizeEntry);
    const parsed = JSON.parse(saved);
    if (!Array.isArray(parsed)) return DEFAULT_ENTRIES.map(normalizeEntry);
    return parsed.map(normalizeEntry);
  } catch {
    return DEFAULT_ENTRIES.map(normalizeEntry);
  }
}

function persistEntries(nextEntries) {
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(nextEntries));
    state.entries = nextEntries;
    render();
    return true;
  } catch {
    showToast('浏览器未能保存配置，请检查本地存储空间。');
    return false;
  }
}

function getCategories() {
  return [...new Set(state.entries.map((entry) => entry.category).filter(Boolean))];
}

function getVisibleEntries() {
  const query = state.query.trim().toLocaleLowerCase();
  return state.entries.filter((entry) => {
    const inCategory = state.activeCategory === '全部入口' || entry.category === state.activeCategory;
    const inQuery = !query || `${entry.name} ${entry.category} ${entry.description}`.toLocaleLowerCase().includes(query);
    return inCategory && inQuery;
  });
}

function toneClass(entry) {
  return entry.tone === 'amber' ? 'icon-amber' : entry.tone === 'blue' ? 'icon-blue' : entry.tone === 'violet' ? 'icon-violet' : '';
}

function appIcon(entry) {
  return `<span class="app-icon ${toneClass(entry)}">${icon(entry.icon)}</span>`;
}

function renderCategories() {
  const categories = getCategories();
  const categoryButtons = categories.map((category) => {
    const count = state.entries.filter((entry) => entry.category === category).length;
    const active = state.activeCategory === category ? ' is-active' : '';
    return `<button class="nav-link${active}" type="button" data-category="${escapeHtml(category)}">
      <span class="nav-icon">${icon('folder')}</span><span>${escapeHtml(category)}</span><span class="nav-count">${count}</span>
    </button>`;
  }).join('');

  categoryNav.innerHTML = categoryButtons;
  document.querySelector('#all-count').textContent = String(state.entries.length);
  document.querySelector('#all-entries').classList.toggle('is-active', state.activeCategory === '全部入口');
  document.querySelector('#category-options').innerHTML = categories.map((category) => `<option value="${escapeHtml(category)}"></option>`).join('');
}

function renderFilters() {
  const categories = ['全部入口', ...getCategories()];
  filterRow.innerHTML = categories.map((category) => {
    const active = state.activeCategory === category ? ' is-active' : '';
    const label = category === '全部入口' ? `全部 <span>${state.entries.length}</span>` : escapeHtml(category);
    return `<button class="filter-chip${active}" type="button" data-category="${escapeHtml(category)}">${label}</button>`;
  }).join('');
}

function renderFavorites() {
  const favorites = state.entries.filter((entry) => entry.favorite);
  document.querySelector('#favorite-count').textContent = String(favorites.length);

  if (!favorites.length) {
    favoritesGrid.innerHTML = `<div class="favorite-empty">${icon('star')}<span>还没有常用网站，点亮网站卡片上的星标即可固定在这里。</span></div>`;
    return;
  }

  favoritesGrid.innerHTML = favorites.map((entry) => {
    const tag = entry.url
      ? `<a class="favorite-card" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer" aria-label="打开${escapeHtml(entry.name)}">${favoriteMarkup(entry)}</a>`
      : `<button class="favorite-card" type="button" data-configure-id="${escapeHtml(entry.id)}" aria-label="填写${escapeHtml(entry.name)}网址">${favoriteMarkup(entry)}</button>`;
    return tag;
  }).join('');
}

function favoriteMarkup(entry) {
  const hint = entry.url ? `${entry.category} · 点击打开` : `${entry.category} · 点击填写网址`;
  return `${appIcon(entry)}<span class="favorite-copy"><strong>${escapeHtml(entry.name)}</strong><span>${escapeHtml(hint)}</span></span><span class="favorite-arrow">${icon(entry.url ? 'external' : 'edit')}</span>`;
}

function renderEntryCard(entry) {
  const action = entry.url
    ? `<a class="entry-action" href="${escapeHtml(entry.url)}" target="_blank" rel="noopener noreferrer">打开网站 ${icon('external')}</a>`
    : `<button class="entry-action is-unconfigured" type="button" data-configure-id="${escapeHtml(entry.id)}">填写网址 ${icon('edit')}</button>`;
  const favoriteClass = entry.favorite ? ' is-favorite' : '';
  const statusText = entry.url ? '可打开' : '待填写网址';

  return `<article class="entry-card">
    <div class="entry-card-top">
      ${appIcon(entry)}
      <div class="card-tools">
        <button class="icon-button favorite-toggle${favoriteClass}" type="button" data-favorite-id="${escapeHtml(entry.id)}" aria-label="${entry.favorite ? '取消常用' : '设为常用'}：${escapeHtml(entry.name)}" aria-pressed="${entry.favorite}">${icon('star')}</button>
        <button class="icon-button" type="button" data-edit-id="${escapeHtml(entry.id)}" aria-label="编辑${escapeHtml(entry.name)}">${icon('edit')}</button>
      </div>
    </div>
    <h3 title="${escapeHtml(entry.name)}">${escapeHtml(entry.name)}</h3>
    <p class="entry-description">${escapeHtml(entry.description || '添加简介，帮助团队快速识别网站用途。')}</p>
    <div class="entry-card-footer">
      <span class="category-tag" title="${escapeHtml(entry.category)}">${escapeHtml(entry.category)} · ${statusText}</span>
      ${action}
    </div>
  </article>`;
}

function renderEntries() {
  const visibleEntries = getVisibleEntries();
  entryGrid.innerHTML = visibleEntries.map(renderEntryCard).join('');
  entryGrid.hidden = visibleEntries.length === 0;
  emptyState.hidden = visibleEntries.length > 0;
  document.querySelector('#entry-count').textContent = String(visibleEntries.length);
  document.querySelector('#directory-meta').textContent = state.query ? `搜索“${state.query}”` : `${state.entries.length} 个系统入口`;
}

function render() {
  renderCategories();
  renderFilters();
  renderFavorites();
  renderEntries();
  document.querySelector('#stat-total').textContent = String(state.entries.length);
  document.querySelector('#stat-ready').textContent = String(state.entries.filter((entry) => entry.url).length);
  document.querySelector('#stat-pending').textContent = String(state.entries.filter((entry) => !entry.url).length);
}

function makeId() {
  return globalThis.crypto?.randomUUID?.() || `entry-${Date.now()}-${Math.random().toString(16).slice(2, 8)}`;
}

function openDialog(entry = null) {
  form.reset();
  document.querySelector('#form-error').hidden = true;
  document.querySelector('#form-error').textContent = '';
  document.querySelector('#entry-id').value = entry?.id || '';
  document.querySelector('#entry-name').value = entry?.name || '';
  document.querySelector('#entry-category').value = entry?.category || '';
  document.querySelector('#entry-url').value = entry?.url || '';
  document.querySelector('#entry-description').value = entry?.description || '';
  document.querySelector('#dialog-title').textContent = entry ? '编辑网站入口' : '添加网站';
  document.querySelector('#delete-entry').hidden = !entry;
  dialog.showModal();
  requestAnimationFrame(() => document.querySelector('#entry-name').focus());
}

function showToast(message) {
  window.clearTimeout(toastTimeout);
  toast.textContent = message;
  toast.classList.add('is-visible');
  toastTimeout = window.setTimeout(() => toast.classList.remove('is-visible'), 2600);
}

function formatUrl(value) {
  const trimmed = value.trim();
  if (!trimmed) return '';
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return new URL(trimmed, window.location.href).href;
  }
  if (trimmed.startsWith('./')) {
    return new URL(trimmed, window.location.href).href;
  }
  const isLocalHost = /^(localhost|127(?:\.\d{1,3}){3}|\[::1\])(?::|\/|$)/i.test(trimmed);
  const isFileUrl = /^file:\/\/\//i.test(trimmed);
  if (/^[a-z][a-z0-9+.-]*:/i.test(trimmed) && !/^https?:\/\//i.test(trimmed) && !isFileUrl && !isLocalHost) {
    throw new Error('网址仅支持 http、https 或本地 file:/// 地址。');
  }
  const hasScheme = /^https?:\/\//i.test(trimmed);
  const protocol = isLocalHost ? 'http://' : 'https://';
  const candidate = hasScheme || isFileUrl ? trimmed : `${protocol}${trimmed}`;
  let parsed;
  try {
    parsed = new URL(candidate);
  } catch {
    throw new Error('请输入有效的网站地址。');
  }
  if (!['http:', 'https:', 'file:'].includes(parsed.protocol) || (parsed.protocol === 'file:' && parsed.hostname)) {
    throw new Error('请输入有效的 http、https 或本地 file:/// 地址。');
  }
  return parsed.href;
}

function setActiveCategory(category) {
  state.activeCategory = category;
  render();
}

function editEntryById(id) {
  const entry = state.entries.find((item) => item.id === id);
  if (entry) openDialog(entry);
}

document.querySelectorAll('[data-icon]').forEach((element) => {
  element.innerHTML = icon(element.dataset.icon);
});

document.querySelector('#add-entry').addEventListener('click', () => openDialog());
document.querySelector('#all-entries').addEventListener('click', () => setActiveCategory('全部入口'));
categoryNav.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (button) setActiveCategory(button.dataset.category);
});
filterRow.addEventListener('click', (event) => {
  const button = event.target.closest('[data-category]');
  if (button) setActiveCategory(button.dataset.category);
});

searchInput.addEventListener('input', () => {
  state.query = searchInput.value;
  renderEntries();
});

entryGrid.addEventListener('click', (event) => {
  const favoriteButton = event.target.closest('[data-favorite-id]');
  if (favoriteButton) {
    const nextEntries = state.entries.map((entry) => entry.id === favoriteButton.dataset.favoriteId
      ? { ...entry, favorite: !entry.favorite }
      : entry);
    persistEntries(nextEntries);
    return;
  }

  const editButton = event.target.closest('[data-edit-id]');
  if (editButton) editEntryById(editButton.dataset.editId);
});

document.addEventListener('click', (event) => {
  const configureButton = event.target.closest('[data-configure-id]');
  if (configureButton) editEntryById(configureButton.dataset.configureId);
});

form.addEventListener('submit', (event) => {
  event.preventDefault();
  const error = document.querySelector('#form-error');
  const id = document.querySelector('#entry-id').value;
  const name = document.querySelector('#entry-name').value.trim();
  const category = document.querySelector('#entry-category').value.trim() || '未分类';
  const description = document.querySelector('#entry-description').value.trim();
  let url;

  if (!name) {
    error.textContent = '请填写网站名称。';
    error.hidden = false;
    document.querySelector('#entry-name').focus();
    return;
  }

  try {
    url = formatUrl(document.querySelector('#entry-url').value);
  } catch (exception) {
    error.textContent = exception.message || '网站地址格式不正确。';
    error.hidden = false;
    document.querySelector('#entry-url').focus();
    return;
  }

  const existing = state.entries.find((entry) => entry.id === id);
  const entry = existing
    ? { ...existing, name, category, description, url }
    : { id: makeId(), name, category, description, url, favorite: false, icon: inferIcon(category, name), tone: inferTone(category) };
  const nextEntries = existing
    ? state.entries.map((item) => item.id === id ? entry : item)
    : [...state.entries, entry];

  if (persistEntries(nextEntries)) {
    dialog.close();
    showToast(existing ? '网站信息已更新。' : '网站已添加。');
  }
});

function inferIcon(category, name) {
  const label = `${category} ${name}`;
  if (/数据|资产|库|行情/.test(label)) return 'database';
  if (/调度|任务|工作流/.test(label)) return 'workflow';
  if (/策略|研究|因子/.test(label)) return 'chart';
  if (/回测|历史/.test(label)) return 'history';
  if (/监控|告警|指标/.test(label)) return 'pulse';
  if (/交易|执行|终端/.test(label)) return 'terminal';
  if (/架构|文档|设计/.test(label)) return 'layers';
  return 'grid';
}

function inferTone(category) {
  if (/数据|监控/.test(category)) return 'blue';
  if (/交易|调度/.test(category)) return 'amber';
  if (/策略|研究/.test(category)) return 'violet';
  return 'green';
}

document.querySelector('#delete-entry').addEventListener('click', () => {
  const id = document.querySelector('#entry-id').value;
  const entry = state.entries.find((item) => item.id === id);
  if (!entry || !window.confirm(`确定删除“${entry.name}”吗？`)) return;
  const nextEntries = state.entries.filter((item) => item.id !== id);
  if (persistEntries(nextEntries)) {
    if (state.activeCategory === entry.category && !nextEntries.some((item) => item.category === entry.category)) {
      state.activeCategory = '全部入口';
    }
    render();
    dialog.close();
    showToast('网站已删除。');
  }
});

document.querySelector('#close-dialog').addEventListener('click', () => dialog.close());
document.querySelector('#cancel-dialog').addEventListener('click', () => dialog.close());
dialog.addEventListener('click', (event) => {
  if (event.target === dialog) dialog.close();
});
document.querySelector('#clear-filters').addEventListener('click', () => {
  state.activeCategory = '全部入口';
  state.query = '';
  searchInput.value = '';
  render();
});

const sidebar = document.querySelector('#sidebar');
const sidebarBackdrop = document.querySelector('#sidebar-backdrop');
function setSidebarOpen(open) {
  sidebar.classList.toggle('is-open', open);
  sidebarBackdrop.classList.toggle('is-open', open);
  sidebarBackdrop.setAttribute('aria-hidden', String(!open));
}

document.querySelector('#mobile-menu-button').addEventListener('click', () => setSidebarOpen(true));
sidebarBackdrop.addEventListener('click', () => setSidebarOpen(false));
categoryNav.addEventListener('click', (event) => {
  if (event.target.closest('[data-category]')) setSidebarOpen(false);
});
document.querySelector('#all-entries').addEventListener('click', () => setSidebarOpen(false));

document.addEventListener('keydown', (event) => {
  if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === 'k') {
    event.preventDefault();
    searchInput.focus();
    searchInput.select();
  }
  if (event.key === '/' && !dialog.open && !['INPUT', 'TEXTAREA'].includes(document.activeElement.tagName)) {
    event.preventDefault();
    searchInput.focus();
  }
});

render();
