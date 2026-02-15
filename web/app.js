let EMBEDDING_PRESETS = [];

async function loadEmbeddingPresets() {
  try {
    const res = await fetch('/api/embedding_presets');
    const json = await res.json();
    if (json.ok && Array.isArray(json.presets)) EMBEDDING_PRESETS = json.presets;
  } catch (_) {}
}

function toast(msg, ok = true) {
  const el = document.getElementById('saveResult');
  if (!el) return;
  el.textContent = msg;
  el.style.color = ok ? 'green' : 'red';
  setTimeout(() => {
    el.textContent = '';
  }, 3000);
}

async function fillEmbeddingPresets() {
  if (!EMBEDDING_PRESETS.length) await loadEmbeddingPresets();
  const sel = document.getElementById('EMBEDDINGS_MODEL_PRESET');
  if (!sel) return;
  sel.innerHTML = '';
  EMBEDDING_PRESETS.forEach((m) => {
    const opt = document.createElement('option');
    opt.value = m.pull || m.name || '';
    opt.textContent = m.title || m.name || opt.value;
    sel.appendChild(opt);
  });
  const info = document.getElementById('EMBED_INFO');
  function updateInfo() {
    const val = sel.value;
    const m = EMBEDDING_PRESETS.find((x) => (x.pull || x.name) === val);
    if (m && info) {
      const size = m.size || '—';
      const ctx = m.ctx || '—';
      const params = m.params || '—';
      const vram = m.vram || '—';
      info.textContent = `Размер: ${size} · Контекст: ${ctx} · Параметры: ${params} · VRAM: ${vram}`;
    }
    const fld = document.getElementById('EMBEDDINGS_MODEL');
    if (fld) fld.value = val;
  }
  sel.addEventListener('change', updateInfo);
  // выставить сохранённое значение
  const saved = document.getElementById('EMBEDDINGS_MODEL')?.value || '';
  if (saved) sel.value = saved;
  updateInfo();
}

async function refreshLLMModels() {
  try {
    const res = await fetch('/api/llm_models');
    const json = await res.json();
    const sel = document.getElementById('OPENAI_RESPONSE_MODEL_SELECT');
    if (!sel) return;
    sel.innerHTML = '';
    let modelsArr = [];
    if (json.ok && json.data) {
      if (Array.isArray(json.data.data)) {
        modelsArr = json.data.data;
      } else if (Array.isArray(json.data)) {
        modelsArr = json.data;
      }
    }
    if (modelsArr.length > 0) {
      modelsArr.forEach((m) => {
        const id = m.id || m.name || '';
        if (!id) return;
        const opt = document.createElement('option');
        opt.value = id;
        opt.textContent = id;
        sel.appendChild(opt);
      });
      const saved = document.getElementById('OPENAI_RESPONSE_MODEL')?.value || '';
      if (saved) {
        const exists = Array.from(sel.options).some((o) => o.value === saved);
        if (!exists) {
          const opt = document.createElement('option');
          opt.value = saved;
          opt.textContent = saved;
          sel.appendChild(opt);
        }
        sel.value = saved;
      }
    } else {
      const opt = document.createElement('option');
      opt.value = '';
      opt.textContent = 'нет данных';
      sel.appendChild(opt);
    }
    sel.addEventListener('change', () => {
      const fld = document.getElementById('OPENAI_RESPONSE_MODEL');
      if (fld) fld.value = sel.value;
    });
    const fld = document.getElementById('OPENAI_RESPONSE_MODEL');
    if (fld) fld.value = sel.value;
    toast('Список моделей обновлен', true);
  } catch (_) {
    toast('Не удалось загрузить список моделей', false);
  }
}

async function saveConfig() {
  // Сначала загружаем текущие списки пользователей
  let primaryAdmin = '';
  let additionalAdmins = '';
  let regularUsers = '';
  try {
    const res = await fetch('/api/admin/users');
    const json = await res.json();
    if (json.ok) {
      primaryAdmin = json.primary_admin || '';
      additionalAdmins = json.admins.filter(a => a !== primaryAdmin).join(',');
      regularUsers = json.regular_users.join(',');
    }
  } catch (_) {
    // Если не удалось загрузить, используем текущие значения из конфига
  }

  const data = {
    EMBEDDINGS_MODEL: document.getElementById('EMBEDDINGS_MODEL').value,
    OPENAI_BASE_URL: document.getElementById('OPENAI_BASE_URL').value,
    OPENAI_API_KEY: (function () {
      const masked = document.getElementById('OPENAI_API_KEY').value || '';
      const real = document.getElementById('OPENAI_API_KEY_REAL').value || '';
      if (masked.includes('*')) return real;
      return masked;
    })(),
    OPENAI_ORGANIZATION: document.getElementById('OPENAI_ORGANIZATION').value,
    OPENAI_RESPONSE_MODEL: document.getElementById('OPENAI_RESPONSE_MODEL').value,
    ALLOWED_USERS: document.getElementById('ALLOWED_USERS').value,
    // Новые параметры для прав доступа
    ADMIN_ID: primaryAdmin,
    ADDITIONAL_ADMIN_IDS: additionalAdmins,
    INITIAL_USER_IDS: regularUsers,
    // Устаревшие параметры для обратной совместимости
    ALLOWED_ADMIN_IDS: '',
    ALLOWED_USER_IDS: '',
    HISTORY_MAX_PAIRS: (function () {
      const v = Number(document.getElementById('HISTORY_MAX_PAIRS').value || 10);
      if (!Number.isFinite(v)) return 10;
      if (v < 0) return 0;
      if (v > 50) return 50;
      return Math.floor(v);
    })(),
  };
  try {
    const res = await fetch('/api/config', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(data),
    });
    const json = await res.json();
    if (res.ok && json.ok) toast('Сохранено', true);
    else toast('Ошибка сохранения', false);
  } catch (_) {
    toast('Ошибка сети', false);
  }
}

document.addEventListener('DOMContentLoaded', () => {
  document.getElementById('saveBtn')?.addEventListener('click', saveConfig);
  document.getElementById('restartBtn')?.addEventListener('click', async () => {
    try {
      const res = await fetch('/api/restart', { method: 'POST' });
      const json = await res.json();
      toast(json.message || 'Перезапуск…', true);
    } catch (_) {
      toast('Ошибка запроса перезапуска', false);
    }
  });
  document.querySelectorAll('.help').forEach((btn) => {
    btn.addEventListener('click', () => {
      const msg = btn.getAttribute('data-help') || '';
      let pop = btn._popover;
      if (!pop) {
        pop = document.createElement('div');
        pop.className = 'popover-like shadow';
        pop.textContent = msg;
        pop.style.position = 'absolute';
        pop.style.maxWidth = '360px';
        pop.style.background = '#fff';
        pop.style.border = '1px solid #ccc';
        pop.style.padding = '8px';
        pop.style.borderRadius = '6px';
        document.body.appendChild(pop);
        btn._popover = pop;
      }
      const r = btn.getBoundingClientRect();
      pop.style.left = window.scrollX + r.left + 'px';
      pop.style.top = window.scrollY + r.bottom + 6 + 'px';
      pop.style.display = pop.style.display === 'block' ? 'none' : 'block';
      document.addEventListener(
        'click',
        (ev) => {
          if (!btn.contains(ev.target) && pop && !pop.contains(ev.target)) pop.style.display = 'none';
        },
        { once: true }
      );
    });
  });
  fillEmbeddingPresets();
  const refreshBtn = document.getElementById('REFRESH_LLM_MODELS');
  if (refreshBtn) refreshBtn.addEventListener('click', refreshLLMModels);
  refreshLLMModels();

  // Кнопка загрузки и поллинг статуса
  const pullBtn = document.getElementById('EMBED_PULL_BTN');
  const progressEl = document.getElementById('EMBED_PULL_PROGRESS');
  const statusEl = document.getElementById('EMBED_PULL_STATUS');
  let pollTimer = null;

  function setProgress(p) {
    const v = Math.max(0, Math.min(100, Number(p) || 0));
    if (progressEl) {
      progressEl.style.width = v + '%';
      progressEl.setAttribute('aria-valuenow', String(v));
      progressEl.textContent = v ? v + '%' : '';
    }
  }

  async function pollStatusOnce() {
    try {
      const res = await fetch('/api/embeddings/pull_status');
      const json = await res.json();
      if (!json.ok) return;
      const st = json.state || {};
      setProgress(st.progress || 0);
      if (statusEl) statusEl.textContent = (st.status || '').toString();
      if (pullBtn) pullBtn.disabled = !!st.running;
      if (!st.running) {
        if (pollTimer) {
          clearInterval(pollTimer);
          pollTimer = null;
        }
        if (st.error) toast('Ошибка загрузки: ' + st.error, false);
        else if (st.progress >= 100) toast('Модель загружена', true);
      }
    } catch (_) {
      // игнорируем сеть во время поллинга
    }
  }

  async function startPull() {
    const sel = document.getElementById('EMBEDDINGS_MODEL_PRESET');
    const name = sel ? sel.value : '';
    if (!name) return;
    try {
      if (pullBtn) pullBtn.disabled = true;
      setProgress(0);
      if (statusEl) statusEl.textContent = 'Запрос на загрузку…';
      const res = await fetch('/api/embeddings/pull', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name }),
      });
      const json = await res.json();
      if (!res.ok || !json.ok) {
        if (pullBtn) pullBtn.disabled = false;
        toast(json.error || 'Не удалось начать загрузку', false);
        return;
      }
      // Старт поллинга
      pollStatusOnce();
      pollTimer = setInterval(pollStatusOnce, 1000);
    } catch (e) {
      if (pullBtn) pullBtn.disabled = false;
      toast('Ошибка сети', false);
    }
  }

  if (pullBtn) pullBtn.addEventListener('click', startPull);
  // при открытии страницы проверить незавершенную загрузку
  pollStatusOnce();

  // Подключение к стриму логов Docker через SSE
  const dockerLogsDiv = document.getElementById('dockerLogs');
  if (dockerLogsDiv) {
    dockerLogsDiv.textContent = 'Подключение к стриму логов...';
    
    const eventSource = new EventSource('/api/docker/logs');
    const maxLines = 200;
    let firstMessage = true;

    eventSource.onmessage = function(event) {
      const line = event.data;
      if (!line) return;
      
      if (firstMessage) {
        dockerLogsDiv.textContent = '';
        firstMessage = false;
      }
      
      const logLine = document.createElement('div');
      logLine.textContent = line;
      logLine.style.marginBottom = '2px';
      logLine.style.wordBreak = 'break-word';
      
      // Вставляем новые логи в начало списка
      if (dockerLogsDiv.firstChild) {
        dockerLogsDiv.insertBefore(logLine, dockerLogsDiv.firstChild);
      } else {
        dockerLogsDiv.appendChild(logLine);
      }
      
      // Удаляем старые логи снизу
      while (dockerLogsDiv.children.length > maxLines) {
        dockerLogsDiv.removeChild(dockerLogsDiv.lastChild);
      }
      
      // Скролл остается наверху (где новые логи)
      dockerLogsDiv.scrollTop = 0;
    };

    eventSource.onerror = function(err) {
      if (firstMessage) {
        dockerLogsDiv.textContent = '';
        firstMessage = false;
      }
      const errorLine = document.createElement('div');
      errorLine.textContent = 'Ошибка подключения к стриму логов. Проверьте права доступа к Docker socket.';
      errorLine.style.color = '#ff6b6b';
      errorLine.style.marginTop = '10px';
      
      // Ошибку тоже показываем сверху
      if (dockerLogsDiv.firstChild) {
        dockerLogsDiv.insertBefore(errorLine, dockerLogsDiv.firstChild);
      } else {
        dockerLogsDiv.appendChild(errorLine);
      }
      
      eventSource.close();
    };
    
    eventSource.onopen = function() {
      console.log('Подключение к стриму логов установлено');
    };
  }

  // Управление пользователями RBAC
  async function loadUsers() {
    try {
      const res = await fetch('/api/admin/users');
      const json = await res.json();
      if (json.ok) {
        // Рендерим динамические таблицы с кнопками удаления
        renderUsersTable('admin-users-table', json.admins, 'admin');
        renderUsersTable('regular-users-table', json.regular_users, 'user');
        
        // Рендерим статические списки всех пользователей
        renderStaticUsersLists(json.admins, json.regular_users);
      }
    } catch (_) {
      toast('Не удалось загрузить список пользователей', false);
    }
  }

  function renderUsersTable(tableId, users, role) {
    const tableBody = document.getElementById(tableId);
    if (!tableBody) return;
    tableBody.innerHTML = '';
    users.forEach(userId => {
      const row = document.createElement('tr');
      const idCell = document.createElement('td');
      idCell.textContent = userId;
      const actionsCell = document.createElement('td');
      const deleteBtn = document.createElement('button');
      deleteBtn.textContent = 'Удалить';
      deleteBtn.className = 'btn btn-sm btn-danger';
      deleteBtn.addEventListener('click', () => removeUser(userId, role));
      actionsCell.appendChild(deleteBtn);
      row.appendChild(idCell);
      row.appendChild(actionsCell);
      tableBody.appendChild(row);
    });
  }

  // Функция для отображения статических списков всех пользователей
function renderStaticUsersLists(admins, regulars) {
  // Рендеринг списка администраторов
  const adminList = document.getElementById('static-admin-list');
  if (adminList) {
    adminList.innerHTML = '';
    if (admins && admins.length > 0) {
      admins.forEach((userId) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        const span = document.createElement('span');
        span.textContent = userId;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-outline-secondary';
        copyBtn.textContent = '📋';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(userId);
          toast('ID ' + userId + ' скопирован в буфер обмена');
        };
        
        li.appendChild(span);
        li.appendChild(copyBtn);
        adminList.appendChild(li);
      });
      
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'list-group-item text-muted small';
      emptyMsg.textContent = admins.length > 0 
        ? 'Всего администраторов: ' + admins.length 
        : 'Нет администраторов';
      adminList.appendChild(emptyMsg);
    } else {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'list-group-item text-muted';
      emptyMsg.textContent = 'Нет администраторов';
      adminList.appendChild(emptyMsg);
    }
  
  // Рендеринг списка обычных пользователей
  const userList = document.getElementById('static-user-list');
  if (userList) {
    userList.innerHTML = '';
    if (regulars && regulars.length > 0) {
      regulars.forEach((userId) => {
        const li = document.createElement('li');
        li.className = 'list-group-item d-flex justify-content-between align-items-center';
        
        const span = document.createElement('span');
        span.textContent = userId;
        
        const copyBtn = document.createElement('button');
        copyBtn.className = 'btn btn-sm btn-outline-secondary';
        copyBtn.textContent = '📋';
        copyBtn.onclick = () => {
          navigator.clipboard.writeText(userId);
          toast('ID ' + userId + ' скопирован в буфер обмена');
        };
        
        li.appendChild(span);
        li.appendChild(copyBtn);
        userList.appendChild(li);
      });
      
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'list-group-item text-muted small';
      emptyMsg.textContent = regulars.length > 0 
        ? 'Всего пользователей: ' + regulars.length 
        : 'Нет пользователей';
      userList.appendChild(emptyMsg);
    } else {
      const emptyMsg = document.createElement('li');
      emptyMsg.className = 'list-group-item text-muted';
      emptyMsg.textContent = 'Нет пользователей';
      userList.appendChild(emptyMsg);
    }
}

  // Функция очистки ID от лишних пробелов
  function cleanUserIds(idsString) {
    if (!idsString) return [];
    return idsString
      .split(',')
      .map(id => id.trim())
      .filter(id => id !== '');
  }

  // Открыть модальное окно для добавления администраторов
  function openAdminModal() {
    document.getElementById('admin-ids-input').value = '';
    document.getElementById('admin-ids-input').focus();
  }

  // Добавление администраторов прямым нажатием кнопки
  async function addAdmins() {
    const idsInput = document.getElementById('admin-ids-input');
    const userIds = cleanUserIds(idsInput.value);
    
    if (userIds.length === 0) {
      toast('Введите хотя бы один ID', false);
      return;
    }

    let addedCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'admin', user_id: userId }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          addedCount++;
        } else {
          errorCount++;
        }
      } catch (_) {
        errorCount++;
      }
    }

    if (addedCount > 0) {
      toast(`Добавлено администраторов: ${addedCount}`, true);
    }
    if (errorCount > 0) {
      setTimeout(() => toast(`Не удалось добавить: ${errorCount}`, false), 500);
    }

    loadUsers();
    document.getElementById('admin-ids-input').value = '';
  }

  // Добавление пользователей прямым нажатием кнопки
  async function addUsers() {
    const idsInput = document.getElementById('user-ids-input');
    const userIds = cleanUserIds(idsInput.value);
    
    if (userIds.length === 0) {
      toast('Введите хотя бы один ID', false);
      return;
    }

    let addedCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', user_id: userId }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          addedCount++;
        } else {
          errorCount++;
        }
      } catch (_) {
        errorCount++;
      }
    }

    if (addedCount > 0) {
      toast(`Добавлено пользователей: ${addedCount}`, true);
    }
    if (errorCount > 0) {
      setTimeout(() => toast(`Не удалось добавить: ${errorCount}`, false), 500);
    }

    loadUsers();
    document.getElementById('user-ids-input').value = '';
  }

  // Загрузка конфигурации с открытием модального окна для админов
  function openAdminModal() {
    document.getElementById('admin-ids-input').value = '';
    document.getElementById('admin-ids-input').focus();
  }

  // Добавить пользователей (удаление)
  async function removeUser(userId, role) {
    if (!confirm(`Удалить пользователя ${userId}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}?role=${role}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        toast(json.message || 'Пользователь удалён', true);
        loadUsers();
      } else {
        toast(json.error || 'Ошибка удаления', false);
      }
    } catch (_) {
      toast('Ошибка сети', false);
    }
  }

  // Добавление пользователей (удаление)
  async function removeUser(userId, role) {
    if (!confirm(`Удалить пользователя ${userId}?`)) return;
    try {
      const res = await fetch(`/api/admin/users/${userId}?role=${role}`, {
        method: 'DELETE',
      });
      const json = await res.json();
      if (res.ok && json.ok) {
        toast(json.message || 'Пользователь удалён', true);
        loadUsers();
      } else {
        toast(json.error || 'Ошибка удаления', false);
      }
    } catch (_) {
      toast('Ошибка сети', false);
    }
  }

  // Добавление пользователей прямым нажатием кнопки
  async function addAdmins() {
    const idsInput = document.getElementById('admin-ids-input').value;
    const userIds = cleanUserIds(idsInput);
    
    if (userIds.length === 0) {
      toast('Введите хотя бы один ID', false);
      return;
    }

    let addedCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'admin', user_id: userId }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          addedCount++;
        } else {
          errorCount++;
        }
      } catch (_) {
        errorCount++;
      }
    }

    if (addedCount > 0) {
      toast(`Добавлено администраторов: ${addedCount}`, true);
    }
    if (errorCount > 0) {
      setTimeout(() => toast(`Не удалось добавить: ${errorCount}`, false), 500);
    }

    loadUsers();
    document.getElementById('admin-ids-input').value = '';
  }

  // Добавление пользователей прямым нажатием кнопки
  async function addUsers() {
    const idsInput = document.getElementById('user-ids-input').value;
    const userIds = cleanUserIds(idsInput);
    
    if (userIds.length === 0) {
      toast('Введите хотя бы один ID', false);
      return;
    }

    let addedCount = 0;
    let errorCount = 0;

    for (const userId of userIds) {
      try {
        const res = await fetch('/api/admin/users', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ role: 'user', user_id: userId }),
        });
        const json = await res.json();
        if (res.ok && json.ok) {
          addedCount++;
        } else {
          errorCount++;
        }
      } catch (_) {
        errorCount++;
      }
    }

    if (addedCount > 0) {
      toast(`Добавлено пользователей: ${addedCount}`, true);
    }
    if (errorCount > 0) {
      setTimeout(() => toast(`Не удалось добавить: ${errorCount}`, false), 500);
    }

    loadUsers();
    document.getElementById('user-ids-input').value = '';
  }

  // Загружаем список пользователей при инициализации
  loadUsers();

  // Обработчики кнопок добавления пользователей
  document.getElementById('save-admin-btn')?.addEventListener('click', addAdmins);
  document.getElementById('save-user-btn')?.addEventListener('click', addUsers);
  document.getElementById('admin-ids-input')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addAdmins();
    }
  });
  document.getElementById('user-ids-input')?.addEventListener('keydown', async (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      await addUsers();
    }
  });
});
