const STORAGE_KEY = 'sahelwaga_tasks';

let tasks = load();
let filter = 'all';

const form       = document.getElementById('add-form');
const input      = document.getElementById('task-input');
const taskList   = document.getElementById('task-list');
const countEl    = document.getElementById('count');
const clearBtn   = document.getElementById('clear-completed');
const filterBtns = document.querySelectorAll('.filters button');

function load() {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY)) || [];
  } catch {
    return [];
  }
}

function save() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(tasks));
}

function addTask(text) {
  tasks.push({ id: Date.now(), text: text.trim(), done: false });
  save();
  render();
}

function toggleTask(id) {
  const task = tasks.find(t => t.id === id);
  if (task) {
    task.done = !task.done;
    save();
    render();
  }
}

function deleteTask(id) {
  tasks = tasks.filter(t => t.id !== id);
  save();
  render();
}

function clearCompleted() {
  tasks = tasks.filter(t => !t.done);
  save();
  render();
}

function setFilter(f) {
  filter = f;
  filterBtns.forEach(btn => {
    btn.classList.toggle('active', btn.dataset.filter === f);
  });
  render();
}

function filteredTasks() {
  if (filter === 'active')    return tasks.filter(t => !t.done);
  if (filter === 'completed') return tasks.filter(t => t.done);
  return tasks;
}

function render() {
  const visible = filteredTasks();
  const remaining = tasks.filter(t => !t.done).length;

  countEl.textContent = remaining === 1
    ? '1 task left'
    : `${remaining} tasks left`;

  if (visible.length === 0) {
    taskList.innerHTML = '<li class="empty-state">No tasks to show.</li>';
    return;
  }

  taskList.innerHTML = visible.map(task => `
    <li class="task-item${task.done ? ' done' : ''}" data-id="${task.id}">
      <input type="checkbox" ${task.done ? 'checked' : ''} aria-label="Mark as done">
      <span class="task-text">${escapeHtml(task.text)}</span>
      <button class="delete-btn" aria-label="Delete task">✕</button>
    </li>
  `).join('');
}

function escapeHtml(str) {
  return str
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

form.addEventListener('submit', e => {
  e.preventDefault();
  const text = input.value.trim();
  if (text) {
    addTask(text);
    input.value = '';
  }
});

taskList.addEventListener('change', e => {
  if (e.target.type === 'checkbox') {
    const id = Number(e.target.closest('.task-item').dataset.id);
    toggleTask(id);
  }
});

taskList.addEventListener('click', e => {
  if (e.target.classList.contains('delete-btn')) {
    const id = Number(e.target.closest('.task-item').dataset.id);
    deleteTask(id);
  }
});

clearBtn.addEventListener('click', clearCompleted);

filterBtns.forEach(btn => {
  btn.addEventListener('click', () => setFilter(btn.dataset.filter));
});

render();
