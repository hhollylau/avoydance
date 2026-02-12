const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const toastEl = document.getElementById("toast");
const topbarEl = document.querySelector(".topbar");
const titleEl = topbarEl.querySelector(".title");
const subtitleEl = topbarEl.querySelector(".subtitle");
const composerEl = document.querySelector(".composer");

const STORAGE_KEY = "avoydance.app.v1";

let state = loadState();
let isEditingThreads = false;

const actionsEl = document.createElement("div");
actionsEl.className = "top-actions";

const backBtn = document.createElement("button");
backBtn.className = "top-action";
backBtn.type = "button";
backBtn.textContent = "Back";

const editBtn = document.createElement("button");
editBtn.className = "top-action";
editBtn.type = "button";
editBtn.textContent = "Edit";

const newThreadBtn = document.createElement("button");
newThreadBtn.className = "top-action";
newThreadBtn.type = "button";
newThreadBtn.textContent = "New";

actionsEl.appendChild(backBtn);
actionsEl.appendChild(editBtn);
actionsEl.appendChild(newThreadBtn);
topbarEl.appendChild(actionsEl);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function createThread(title = "Unsent") {
  return {
    id: uid(),
    title,
    messages: [],
    updatedAt: Date.now(),
  };
}

function defaultState() {
  const thread = createThread("Unsent");
  return {
    activeThreadId: null,
    threads: [thread],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.threads)) return defaultState();
    for (const thread of parsed.threads) {
      if (!Array.isArray(thread.messages)) thread.messages = [];
      if (!thread.updatedAt) {
        thread.updatedAt = thread.messages.length
          ? thread.messages[thread.messages.length - 1].ts
          : Date.now();
      }
    }
    return {
      activeThreadId: parsed.activeThreadId || null,
      threads: parsed.threads,
    };
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActiveThread() {
  return state.threads.find((thread) => thread.id === state.activeThreadId) || null;
}

function sortThreadsByRecent() {
  state.threads.sort((a, b) => (b.updatedAt || 0) - (a.updatedAt || 0));
}

function toast(msg = "Sent to the void.") {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 900);
}

function updateSendEnabled() {
  sendBtn.disabled = inputEl.value.trim().length === 0;
}

function renderThreadList() {
  messagesEl.className = "messages thread-list";
  messagesEl.innerHTML = "";

  if (state.threads.length === 0) {
    const emptyEl = document.createElement("div");
    emptyEl.className = "empty-state";
    emptyEl.textContent = "No threads yet. Tap New.";
    messagesEl.appendChild(emptyEl);
    return;
  }

  sortThreadsByRecent();

  for (const thread of state.threads) {
    const row = document.createElement("div");
    row.className = "thread-row";
    if (isEditingThreads) row.classList.add("editing");

    const avatar = document.createElement("div");
    avatar.className = "thread-avatar";
    avatar.textContent = thread.title.trim().charAt(0).toUpperCase() || "U";

    const main = document.createElement("div");
    main.className = "thread-main";

    const meta = document.createElement("div");
    meta.className = "thread-meta";

    const title = document.createElement("div");
    title.className = "thread-title";
    title.textContent = thread.title;

    const time = document.createElement("div");
    time.className = "thread-time";
    time.textContent = formatTime(thread.updatedAt || Date.now());

    const preview = document.createElement("div");
    preview.className = "thread-preview";
    preview.textContent = thread.messages.length
      ? thread.messages[thread.messages.length - 1].text
      : "No messages yet";

    const del = document.createElement("button");
    del.className = "thread-delete";
    del.type = "button";
    del.textContent = "-";
    del.setAttribute("aria-label", `Delete ${thread.title}`);
    del.addEventListener("click", (e) => {
      e.stopPropagation();
      deleteThread(thread.id);
    });

    const chevron = document.createElement("div");
    chevron.className = "thread-chevron";
    chevron.textContent = ">";

    meta.appendChild(title);
    meta.appendChild(time);
    main.appendChild(meta);
    main.appendChild(preview);

    row.appendChild(avatar);
    row.appendChild(del);
    row.appendChild(main);
    row.appendChild(chevron);

    row.addEventListener("click", () => {
      if (isEditingThreads) return;
      state.activeThreadId = thread.id;
      saveState();
      render();
    });

    messagesEl.appendChild(row);
  }
}

function addMessageRow(message) {
  const row = document.createElement("div");
  row.className = "row me";

  const content = document.createElement("div");
  content.className = "row-content";

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = message.text;

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = formatTime(message.ts);

  content.appendChild(bubble);
  content.appendChild(time);
  row.appendChild(content);
  messagesEl.appendChild(row);
}

function renderChatView(activeThread) {
  messagesEl.className = "messages";
  messagesEl.innerHTML = "";
  for (const message of activeThread.messages) {
    addMessageRow(message);
  }
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function renderTopbar(activeThread) {
  if (!activeThread) {
    titleEl.textContent = "Messages";
    subtitleEl.textContent = "avoydance";
    backBtn.classList.add("hidden");
    editBtn.classList.remove("hidden");
    editBtn.textContent = isEditingThreads ? "Done" : "Edit";
    newThreadBtn.classList.remove("hidden");
    return;
  }

  titleEl.textContent = activeThread.title;
  subtitleEl.textContent = "unsent messages";
  backBtn.classList.remove("hidden");
  editBtn.classList.add("hidden");
  newThreadBtn.classList.add("hidden");
}

function renderComposer(activeThread) {
  if (!activeThread) {
    composerEl.classList.add("hidden");
    inputEl.value = "";
    updateSendEnabled();
    return;
  }
  composerEl.classList.remove("hidden");
  updateSendEnabled();
}

function render() {
  const activeThread = getActiveThread();
  renderTopbar(activeThread);
  renderComposer(activeThread);
  if (!activeThread) renderThreadList();
  else renderChatView(activeThread);
}

function addThread() {
  const name = prompt("Thread name");
  if (!name) return;
  const title = name.trim();
  if (!title) return;

  const thread = createThread(title);
  state.threads.unshift(thread);
  state.activeThreadId = null;
  isEditingThreads = false;
  saveState();
  render();
}

function deleteThread(threadId) {
  const thread = state.threads.find((t) => t.id === threadId);
  if (!thread) return;
  if (!confirm(`Delete "${thread.title}"?`)) return;

  state.threads = state.threads.filter((t) => t.id !== threadId);
  if (state.activeThreadId === threadId) state.activeThreadId = null;
  saveState();
  render();
  toast("Thread deleted.");
}

function sendCurrent() {
  const text = inputEl.value.trim();
  if (!text) return;
  const activeThread = getActiveThread();
  if (!activeThread) return;

  const message = { id: uid(), text, ts: Date.now() };
  activeThread.messages.push(message);
  activeThread.updatedAt = message.ts;
  saveState();

  inputEl.value = "";
  updateSendEnabled();
  renderChatView(activeThread);
  toast();
}

inputEl.addEventListener("input", updateSendEnabled);
sendBtn.addEventListener("click", sendCurrent);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendCurrent();
});
newThreadBtn.addEventListener("click", addThread);
editBtn.addEventListener("click", () => {
  isEditingThreads = !isEditingThreads;
  render();
});
backBtn.addEventListener("click", () => {
  state.activeThreadId = null;
  isEditingThreads = false;
  saveState();
  render();
});

render();
