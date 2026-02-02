// ===== State Management =====
const state = {
  tasks: [],
  habits: [],
  favorites: [],
  theme: 'light',
  currentSection: 'dashboard',
  editingTaskId: null
};

// ===== Storage Functions =====
const storage = {
  get(key, defaultValue) {
    try {
      const item = localStorage.getItem(key);
      return item ? JSON.parse(item) : defaultValue;
    } catch (e) {
      console.error('Error reading from localStorage:', e);
      return defaultValue;
    }
  },

  set(key, value) {
    try {
      localStorage.setItem(key, JSON.stringify(value));
    } catch (e) {
      console.error('Error writing to localStorage:', e);
    }
  },

  clear() {
    localStorage.removeItem('studybuddy-tasks');
    localStorage.removeItem('studybuddy-habits');
    localStorage.removeItem('studybuddy-favorites');
  }
};

// ===== Utility Functions =====
function generateId() {
  return Date.now().toString(36) + Math.random().toString(36).substr(2);
}

function formatDate(dateStr) {
  const date = new Date(dateStr);
  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);

  const dateOnly = new Date(date);
  dateOnly.setHours(0, 0, 0, 0);

  if (dateOnly.getTime() === today.getTime()) return 'Today';
  if (dateOnly.getTime() === tomorrow.getTime()) return 'Tomorrow';

  return date.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
}

function getWeekStartDate() {
  const now = new Date();
  const day = now.getDay();
  const diff = now.getDate() - day + (day === 0 ? -6 : 1) - 1; // Start from Saturday
  const saturday = new Date(now);
  saturday.setDate(diff);
  saturday.setHours(0, 0, 0, 0);
  return saturday.toISOString().split('T')[0];
}

function isWithinDays(dateStr, days) {
  const date = new Date(dateStr);
  const now = new Date();
  const future = new Date();
  future.setDate(now.getDate() + days);
  return date >= now && date <= future;
}

const DAYS = ['Sat', 'Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri'];

// ===== Initialize App =====
function init() {
  // Load state from localStorage
  state.tasks = storage.get('studybuddy-tasks', []);
  state.habits = storage.get('studybuddy-habits', []);
  state.favorites = storage.get('studybuddy-favorites', []);
  state.theme = storage.get('studybuddy-theme', 'light');

  // Apply theme
  applyTheme(state.theme);

  // Reset habits if new week
  resetHabitsIfNewWeek();

  // Set up navigation
  setupNavigation();

  // Set up event listeners
  setupEventListeners();

  // Initial render
  renderDashboard();
  renderTasks();
  renderHabits();
  loadResources();

  // Set current date on dashboard
  document.getElementById('currentDate').textContent =
    `Here's your study progress for ${new Date().toLocaleDateString('en-US', { weekday: 'long', month: 'long', day: 'numeric' })}`;
}

// ===== Theme Functions =====
function applyTheme(theme) {
  document.body.classList.toggle('dark', theme === 'dark');
  document.getElementById('lightThemeBtn').classList.toggle('active', theme === 'light');
  document.getElementById('darkThemeBtn').classList.toggle('active', theme === 'dark');
}

function setTheme(theme) {
  state.theme = theme;
  storage.set('studybuddy-theme', theme);
  applyTheme(theme);
}

// ===== Navigation =====
function setupNavigation() {
  // Handle hash change
  window.addEventListener('hashchange', handleHashChange);

  // Initial hash
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigateTo(hash);
}

function handleHashChange() {
  const hash = window.location.hash.slice(1) || 'dashboard';
  navigateTo(hash);
}

function navigateTo(sectionId) {
  // Hide all sections
  document.querySelectorAll('.section').forEach(s => s.classList.remove('active'));

  // Show target section
  const section = document.getElementById(sectionId);
  if (section) {
    section.classList.add('active');
    state.currentSection = sectionId;
  }

  // Update nav links
  document.querySelectorAll('.nav-link, .nav-link-mobile').forEach(link => {
    link.classList.toggle('active', link.dataset.section === sectionId);
  });

  // Close mobile menu
  document.getElementById('navMobile').classList.add('hidden');
  document.querySelector('.hamburger-open').classList.remove('hidden');
  document.querySelector('.hamburger-close').classList.add('hidden');
}

// ===== Event Listeners Setup =====
function setupEventListeners() {
  // Navigation links
  document.querySelectorAll('[data-section]').forEach(link => {
    link.addEventListener('click', (e) => {
      e.preventDefault();
      const section = link.dataset.section;
      window.location.hash = section;
    });
  });

  // Hamburger menu
  document.getElementById('hamburgerBtn').addEventListener('click', () => {
    const navMobile = document.getElementById('navMobile');
    const openIcon = document.querySelector('.hamburger-open');
    const closeIcon = document.querySelector('.hamburger-close');

    navMobile.classList.toggle('hidden');
    openIcon.classList.toggle('hidden');
    closeIcon.classList.toggle('hidden');
  });

  // Theme buttons
  document.getElementById('lightThemeBtn').addEventListener('click', () => setTheme('light'));
  document.getElementById('darkThemeBtn').addEventListener('click', () => setTheme('dark'));

  // Reset data
  document.getElementById('resetDataBtn').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.remove('hidden');
  });

  document.getElementById('cancelConfirmBtn').addEventListener('click', () => {
    document.getElementById('confirmModal').classList.add('hidden');
  });

  document.getElementById('confirmResetBtn').addEventListener('click', () => {
    storage.clear();
    state.tasks = [];
    state.habits = [];
    state.favorites = [];
    renderDashboard();
    renderTasks();
    renderHabits();
    loadResources();
    document.getElementById('confirmModal').classList.add('hidden');
  });

  // Task events
  setupTaskEvents();

  // Habit events
  setupHabitEvents();

  // Resource events
  setupResourceEvents();
}

// ===== Task Functions =====
function setupTaskEvents() {
  // Add task button
  document.getElementById('addTaskBtn').addEventListener('click', () => {
    state.editingTaskId = null;
    document.getElementById('taskModalTitle').textContent = 'Add New Task';
    document.getElementById('saveTaskBtn').textContent = 'Add Task';
    document.getElementById('taskForm').reset();
    document.getElementById('taskDueDate').value = new Date().toISOString().split('T')[0];
    document.getElementById('taskModal').classList.remove('hidden');
  });

  // Close modal
  document.getElementById('closeTaskModal').addEventListener('click', () => {
    document.getElementById('taskModal').classList.add('hidden');
  });

  document.getElementById('cancelTaskBtn').addEventListener('click', () => {
    document.getElementById('taskModal').classList.add('hidden');
  });

  // Submit form
  document.getElementById('taskForm').addEventListener('submit', (e) => {
    e.preventDefault();
    const task = {
      id: state.editingTaskId || generateId(),
      title: document.getElementById('taskTitle').value.trim(),
      description: document.getElementById('taskDescription').value.trim(),
      dueDate: document.getElementById('taskDueDate').value,
      priority: document.getElementById('taskPriority').value,
      category: document.getElementById('taskCategory').value,
      status: state.editingTaskId ?
        state.tasks.find(t => t.id === state.editingTaskId)?.status || 'active' :
        'active',
      createdAt: state.editingTaskId ?
        state.tasks.find(t => t.id === state.editingTaskId)?.createdAt || new Date().toISOString() :
        new Date().toISOString()
    };

    if (state.editingTaskId) {
      const index = state.tasks.findIndex(t => t.id === state.editingTaskId);
      if (index !== -1) state.tasks[index] = task;
    } else {
      state.tasks.push(task);
    }

    storage.set('studybuddy-tasks', state.tasks);
    renderTasks();
    renderDashboard();
    document.getElementById('taskModal').classList.add('hidden');
  });

  // Filters
  document.getElementById('taskSearch').addEventListener('input', renderTasks);
  document.getElementById('taskStatusFilter').addEventListener('change', renderTasks);
  document.getElementById('taskCategoryFilter').addEventListener('change', renderTasks);
  document.getElementById('taskSortBy').addEventListener('change', renderTasks);

  // Event delegation for task actions
  document.getElementById('tasksList').addEventListener('click', handleTaskAction);
}

function handleTaskAction(e) {
  const target = e.target.closest('[data-action]');
  if (!target) return;

  const action = target.dataset.action;
  const taskId = target.dataset.id;

  switch (action) {
    case 'toggle':
      toggleTask(taskId);
      break;
    case 'edit':
      editTask(taskId);
      break;
    case 'delete':
      deleteTask(taskId);
      break;
  }
}

function toggleTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    task.status = task.status === 'active' ? 'completed' : 'active';
    storage.set('studybuddy-tasks', state.tasks);
    renderTasks();
    renderDashboard();
  }
}

function editTask(id) {
  const task = state.tasks.find(t => t.id === id);
  if (task) {
    state.editingTaskId = id;
    document.getElementById('taskModalTitle').textContent = 'Edit Task';
    document.getElementById('saveTaskBtn').textContent = 'Save Changes';
    document.getElementById('taskTitle').value = task.title;
    document.getElementById('taskDescription').value = task.description;
    document.getElementById('taskDueDate').value = task.dueDate;
    document.getElementById('taskPriority').value = task.priority;
    document.getElementById('taskCategory').value = task.category;
    document.getElementById('taskModal').classList.remove('hidden');
  }
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  storage.set('studybuddy-tasks', state.tasks);
  renderTasks();
  renderDashboard();
}

function renderTasks() {
  const search = document.getElementById('taskSearch').value.toLowerCase();
  const statusFilter = document.getElementById('taskStatusFilter').value;
  const categoryFilter = document.getElementById('taskCategoryFilter').value;
  const sortBy = document.getElementById('taskSortBy').value;

  let filtered = state.tasks.filter(task => {
    if (statusFilter !== 'all' && task.status !== statusFilter) return false;
    if (categoryFilter !== 'all' && task.category !== categoryFilter) return false;
    if (search && !task.title.toLowerCase().includes(search) && !task.description.toLowerCase().includes(search)) return false;
    return true;
  });

  // Sort
  filtered.sort((a, b) => {
    if (sortBy === 'dueDate') {
      return new Date(a.dueDate) - new Date(b.dueDate);
    }
    const priorityOrder = { high: 0, medium: 1, low: 2 };
    return priorityOrder[a.priority] - priorityOrder[b.priority];
  });

  const container = document.getElementById('tasksList');

  if (filtered.length === 0) {
    container.innerHTML = '<p class="empty-state">No tasks found. Add your first task to get started!</p>';
    return;
  }

  container.innerHTML = filtered.map(task => `
    <div class="task-card ${task.status === 'completed' ? 'completed' : ''}">
      <div class="task-card-header">
        <div class="task-checkbox ${task.status === 'completed' ? 'checked' : ''}" 
             data-action="toggle" data-id="${task.id}">
          ${task.status === 'completed' ? '✓' : ''}
        </div>
        <div class="task-content">
          <div class="task-title-row">
            <span class="task-title ${task.status === 'completed' ? 'completed' : ''}">${escapeHtml(task.title)}</span>
            <div class="task-actions">
              <button class="task-action-btn" data-action="edit" data-id="${task.id}" aria-label="Edit">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M17 3a2.85 2.83 0 1 1 4 4L7.5 20.5 2 22l1.5-5.5Z"/><path d="m15 5 4 4"/></svg>
              </button>
              <button class="task-action-btn delete" data-action="delete" data-id="${task.id}" aria-label="Delete">
                <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
              </button>
            </div>
          </div>
          ${task.description ? `<p class="task-description">${escapeHtml(task.description)}</p>` : ''}
          <div class="task-meta">
            <span class="task-tag priority-${task.priority}">${task.priority}</span>
            <span class="task-tag category">${task.category}</span>
            <span class="task-tag date">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><rect width="18" height="18" x="3" y="4" rx="2" ry="2"/><line x1="16" x2="16" y1="2" y2="6"/><line x1="8" x2="8" y1="2" y2="6"/><line x1="3" x2="21" y1="10" y2="10"/></svg>
              ${formatDate(task.dueDate)}
            </span>
          </div>
        </div>
      </div>
    </div>
  `).join('');
}

// ===== Habit Functions =====
function setupHabitEvents() {
  // Add habit button
  document.getElementById('addHabitBtn').addEventListener('click', () => {
    document.getElementById('habitForm').reset();
    document.getElementById('goalValue').textContent = '5';
    document.getElementById('habitModal').classList.remove('hidden');
  });

  // Close modal
  document.getElementById('closeHabitModal').addEventListener('click', () => {
    document.getElementById('habitModal').classList.add('hidden');
  });

  document.getElementById('cancelHabitBtn').addEventListener('click', () => {
    document.getElementById('habitModal').classList.add('hidden');
  });

  // Goal slider
  document.getElementById('habitGoal').addEventListener('input', (e) => {
    document.getElementById('goalValue').textContent = e.target.value;
  });

  // Submit form
  document.getElementById('habitForm').addEventListener('submit', (e) => {
    e.preventDefault();

    const habit = {
      id: generateId(),
      name: document.getElementById('habitName').value.trim(),
      goal: parseInt(document.getElementById('habitGoal').value),
      progress: [false, false, false, false, false, false, false],
      weekStartDate: getWeekStartDate()
    };

    state.habits.push(habit);
    storage.set('studybuddy-habits', state.habits);
    renderHabits();
    renderDashboard();
    document.getElementById('habitModal').classList.add('hidden');
  });

  // Event delegation for habit actions
  document.getElementById('habitsList').addEventListener('click', handleHabitAction);
}

function handleHabitAction(e) {
  const dayBtn = e.target.closest('.habit-day');
  const deleteBtn = e.target.closest('[data-action="delete-habit"]');

  if (dayBtn) {
    const habitId = dayBtn.dataset.habitId;
    const dayIndex = parseInt(dayBtn.dataset.day);
    toggleHabitDay(habitId, dayIndex);
  }

  if (deleteBtn) {
    deleteHabit(deleteBtn.dataset.id);
  }
}

function toggleHabitDay(habitId, dayIndex) {
  const habit = state.habits.find(h => h.id === habitId);
  if (habit) {
    habit.progress[dayIndex] = !habit.progress[dayIndex];
    storage.set('studybuddy-habits', state.habits);
    renderHabits();
    renderDashboard();
  }
}

function deleteHabit(id) {
  state.habits = state.habits.filter(h => h.id !== id);
  storage.set('studybuddy-habits', state.habits);
  renderHabits();
  renderDashboard();
}

function resetHabitsIfNewWeek() {
  const currentWeekStart = getWeekStartDate();
  let changed = false;

  state.habits.forEach(habit => {
    if (habit.weekStartDate !== currentWeekStart) {
      habit.progress = [false, false, false, false, false, false, false];
      habit.weekStartDate = currentWeekStart;
      changed = true;
    }
  });

  if (changed) {
    storage.set('studybuddy-habits', state.habits);
  }
}

function renderHabits() {
  // Update summary
  const totalDaysCompleted = state.habits.reduce((acc, h) => acc + h.progress.filter(Boolean).length, 0);
  const totalGoals = state.habits.reduce((acc, h) => acc + h.goal, 0);
  const goalsAchieved = state.habits.filter(h => h.progress.filter(Boolean).length >= h.goal).length;
  const overallProgress = totalGoals > 0 ? Math.round((totalDaysCompleted / totalGoals) * 100) : 0;

  document.getElementById('totalDaysCompleted').textContent = totalDaysCompleted;
  document.getElementById('goalsAchieved').textContent = goalsAchieved;
  document.getElementById('overallHabitProgress').textContent = overallProgress + '%';

  const container = document.getElementById('habitsList');

  if (state.habits.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M8.5 14.5A2.5 2.5 0 0 0 11 12c0-1.38-.5-2-1-3-1.072-2.143-.224-4.054 2-6 .5 2.5 2 4.9 4 6.5 2 1.6 3 3.5 3 5.5a7 7 0 1 1-14 0c0-1.153.433-2.294 1-3a2.5 2.5 0 0 0 2.5 2.5z"/></svg>
        <p>No habits yet. Add your first habit to start tracking!</p>
      </div>
    `;
    return;
  }

  container.innerHTML = state.habits.map(habit => {
    const completed = habit.progress.filter(Boolean).length;
    const isGoalMet = completed >= habit.goal;
    const progressPercent = Math.min((completed / habit.goal) * 100, 100);

    return `
      <div class="habit-card">
        <div class="habit-header">
          <div>
            <div class="habit-name">
              ${escapeHtml(habit.name)}
              ${isGoalMet ? '🔥' : ''}
            </div>
            <div class="habit-goal">
              <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><circle cx="12" cy="12" r="6"/><circle cx="12" cy="12" r="2"/></svg>
              Goal: ${habit.goal} days/week • ${completed}/${habit.goal} completed
            </div>
          </div>
          <button class="task-action-btn delete" data-action="delete-habit" data-id="${habit.id}" aria-label="Delete">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 6h18"/><path d="M19 6v14c0 1-1 2-2 2H7c-1 0-2-1-2-2V6"/><path d="M8 6V4c0-1 1-2 2-2h4c1 0 2 1 2 2v2"/></svg>
          </button>
        </div>
        <div class="habit-days">
          ${DAYS.map((day, index) => `
            <button class="habit-day ${habit.progress[index] ? 'active' : ''}" 
                    data-habit-id="${habit.id}" data-day="${index}">
              <span>${day}</span>
              ${habit.progress[index] ? '<span class="check">✓</span>' : ''}
            </button>
          `).join('')}
        </div>
        <div class="habit-progress">
          <div class="habit-progress-fill ${isGoalMet ? 'complete' : ''}" style="width: ${progressPercent}%"></div>
        </div>
      </div>
    `;
  }).join('');
}

// ===== Resource Functions =====
let resources = [];

function setupResourceEvents() {
  document.getElementById('resourceSearch').addEventListener('input', renderResources);
  document.getElementById('resourceCategoryFilter').addEventListener('change', renderResources);
  document.getElementById('favoritesOnlyBtn').addEventListener('click', () => {
    const btn = document.getElementById('favoritesOnlyBtn');
    btn.classList.toggle('active');
    renderResources();
  });
  document.getElementById('retryResourcesBtn').addEventListener('click', loadResources);

  // Event delegation for favorite buttons
  document.getElementById('resourcesList').addEventListener('click', (e) => {
    const favoriteBtn = e.target.closest('.favorite-btn');
    if (favoriteBtn) {
      const id = favoriteBtn.dataset.id;
      toggleFavorite(id);
    }
  });
}

function loadResources() {
  document.getElementById('resourcesLoading').classList.remove('hidden');
  document.getElementById('resourcesError').classList.add('hidden');
  document.getElementById('resourcesList').classList.add('hidden');

  fetch('./resources.json')
    .then(response => {
      if (!response.ok) throw new Error('Failed to load');
      return response.json();
    })
    .then(data => {
      resources = data;
      populateResourceCategories();
      renderResources();
      document.getElementById('resourcesLoading').classList.add('hidden');
      document.getElementById('resourcesList').classList.remove('hidden');
    })
    .catch(error => {
      console.error('Error loading resources:', error);
      document.getElementById('resourcesLoading').classList.add('hidden');
      document.getElementById('resourcesError').classList.remove('hidden');
    });
}

function populateResourceCategories() {
  const categories = [...new Set(resources.map(r => r.category))];
  const select = document.getElementById('resourceCategoryFilter');
  select.innerHTML = '<option value="all">All Categories</option>' +
    categories.map(cat => `<option value="${cat}">${cat}</option>`).join('');
}

function toggleFavorite(id) {
  if (state.favorites.includes(id)) {
    state.favorites = state.favorites.filter(fid => fid !== id);
  } else {
    state.favorites.push(id);
  }
  storage.set('studybuddy-favorites', state.favorites);
  renderResources();
}

function renderResources() {
  const search = document.getElementById('resourceSearch').value.toLowerCase();
  const categoryFilter = document.getElementById('resourceCategoryFilter').value;
  const favoritesOnly = document.getElementById('favoritesOnlyBtn').classList.contains('active');

  let filtered = resources.filter(resource => {
    if (favoritesOnly && !state.favorites.includes(resource.id)) return false;
    if (categoryFilter !== 'all' && resource.category !== categoryFilter) return false;
    if (search && !resource.title.toLowerCase().includes(search) &&
      !resource.description.toLowerCase().includes(search) &&
      !resource.category.toLowerCase().includes(search)) return false;
    return true;
  });

  const container = document.getElementById('resourcesList');

  if (filtered.length === 0) {
    container.innerHTML = `
      <div class="empty-state-box" style="grid-column: 1/-1;">
        <svg xmlns="http://www.w3.org/2000/svg" width="48" height="48" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="empty-icon"><path d="M4 19.5v-15A2.5 2.5 0 0 1 6.5 2H20v20H6.5a2.5 2.5 0 0 1 0-5H20"/></svg>
        <p>No resources found matching your criteria.</p>
      </div>
    `;
    return;
  }

  container.innerHTML = filtered.map(resource => {
    const isFavorite = state.favorites.includes(resource.id);
    return `
      <div class="resource-card">
        <div class="resource-header">
          <span class="resource-category">${resource.category}</span>
          <button class="favorite-btn ${isFavorite ? 'active' : ''}" data-id="${resource.id}" aria-label="Toggle favorite">
            <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="${isFavorite ? 'currentColor' : 'none'}" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>
          </button>
        </div>
        <h3 class="resource-title">${escapeHtml(resource.title)}</h3>
        <p class="resource-description">${escapeHtml(resource.description)}</p>
        <a href="${resource.link}" target="_blank" rel="noopener noreferrer" class="resource-link">
          Visit Resource
          <svg xmlns="http://www.w3.org/2000/svg" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M18 13v6a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V8a2 2 0 0 1 2-2h6"/><polyline points="15 3 21 3 21 9"/><line x1="10" x2="21" y1="14" y2="3"/></svg>
        </a>
      </div>
    `;
  }).join('');
}

// ===== Dashboard Functions =====
function renderDashboard() {
  // Task stats
  const completedTasks = state.tasks.filter(t => t.status === 'completed').length;
  const activeTasks = state.tasks.filter(t => t.status === 'active').length;
  const tasksDueSoon = state.tasks.filter(t =>
    t.status === 'active' && isWithinDays(t.dueDate, 2)
  ).length;

  document.getElementById('tasksDueSoon').textContent = tasksDueSoon;
  document.getElementById('completedTasks').textContent = completedTasks;
  document.getElementById('totalTasks').textContent = `of ${state.tasks.length} total`;
  document.getElementById('activeTasks').textContent = activeTasks;

  // Task progress
  const taskProgress = state.tasks.length > 0
    ? Math.round((completedTasks / state.tasks.length) * 100)
    : 0;
  document.getElementById('taskProgressPercent').textContent = taskProgress + '%';
  document.getElementById('taskProgressBar').style.width = taskProgress + '%';

  // Habit stats
  const totalHabitProgress = state.habits.reduce((acc, h) => acc + h.progress.filter(Boolean).length, 0);
  const totalHabitGoals = state.habits.reduce((acc, h) => acc + h.goal, 0);
  const habitsGoalsMet = state.habits.filter(h => h.progress.filter(Boolean).length >= h.goal).length;

  document.getElementById('habitsGoalsMet').textContent = habitsGoalsMet;
  document.getElementById('totalHabits').textContent = `of ${state.habits.length} habits`;

  // Habit progress
  const habitProgress = totalHabitGoals > 0
    ? Math.round((totalHabitProgress / totalHabitGoals) * 100)
    : 0;
  document.getElementById('habitProgressPercent').textContent = habitProgress + '%';
  document.getElementById('habitProgressBar').style.width = habitProgress + '%';

  // Upcoming tasks
  const upcoming = state.tasks
    .filter(t => t.status === 'active')
    .filter(t => isWithinDays(t.dueDate, 7))
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))
    .slice(0, 5);

  const upcomingContainer = document.getElementById('upcomingTasks');

  if (upcoming.length === 0) {
    upcomingContainer.innerHTML = '<p class="empty-state">No upcoming tasks. Add some to get started!</p>';
  } else {
    upcomingContainer.innerHTML = upcoming.map(task => `
      <div class="upcoming-item">
        <div class="priority-dot ${task.priority}"></div>
        <div class="upcoming-content">
          <div class="upcoming-title">${escapeHtml(task.title)}</div>
          <div class="upcoming-category">${task.category}</div>
        </div>
        <div class="upcoming-date">${formatDate(task.dueDate)}</div>
      </div>
    `).join('');
  }
}

// ===== Helper Functions =====
function escapeHtml(text) {
  const div = document.createElement('div');
  div.textContent = text;
  return div.innerHTML;
}

// ===== Initialize =====
document.addEventListener('DOMContentLoaded', init);
