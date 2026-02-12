const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const toastEl = document.getElementById("toast");
const topbarEl = document.querySelector(".topbar");
const titleEl = topbarEl.querySelector(".title");
const subtitleEl = topbarEl.querySelector(".subtitle");
const composerEl = document.querySelector(".composer");

const STORAGE_KEY = "avoydance.app.v1";
const AUTH_KEY = "avoydance.auth.v1";

let state = loadState();
let isEditingThreads = false;
let auth = loadAuth();
let isLocked = Boolean(auth.passHash);

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
newThreadBtn.className = "top-action top-action-primary";
newThreadBtn.type = "button";
newThreadBtn.innerHTML =
  '<svg viewBox="0 0 24 24" aria-hidden="true" focusable="false"><path d="M4 17.25V20h2.75l8.1-8.1-2.75-2.75L4 17.25zm12.71-9.04a1.003 1.003 0 0 0 0-1.42l-1.5-1.5a1.003 1.003 0 0 0-1.42 0l-1.17 1.17 2.75 2.75 1.34-1z"/></svg>';
newThreadBtn.setAttribute("aria-label", "Compose note thread");
newThreadBtn.title = "Compose note thread";

const previewBtn = document.createElement("button");
previewBtn.className = "top-action";
previewBtn.type = "button";

const timerBtn = document.createElement("button");
timerBtn.className = "top-action";
timerBtn.type = "button";
timerBtn.textContent = "Timer";

const clearBtn = document.createElement("button");
clearBtn.className = "top-action";
clearBtn.type = "button";
clearBtn.textContent = "Clear";

const clearAllBtn = document.createElement("button");
clearAllBtn.className = "top-action";
clearAllBtn.type = "button";
clearAllBtn.textContent = "Clear All";

const passcodeBtn = document.createElement("button");
passcodeBtn.className = "top-action";
passcodeBtn.type = "button";
passcodeBtn.textContent = "Passcode";

const lockBtn = document.createElement("button");
lockBtn.className = "top-action";
lockBtn.type = "button";
lockBtn.textContent = "Lock";

const spacerEl = document.createElement("div");
spacerEl.className = "top-spacer";

const quickActionsEl = document.createElement("div");
quickActionsEl.className = "top-quick-actions";
quickActionsEl.appendChild(newThreadBtn);
topbarEl.appendChild(quickActionsEl);

actionsEl.appendChild(backBtn);
actionsEl.appendChild(spacerEl);
actionsEl.appendChild(editBtn);
actionsEl.appendChild(previewBtn);
actionsEl.appendChild(clearBtn);
actionsEl.appendChild(clearAllBtn);
actionsEl.appendChild(passcodeBtn);
actionsEl.appendChild(lockBtn);
actionsEl.appendChild(timerBtn);
topbarEl.appendChild(actionsEl);

const lockScreenEl = document.createElement("div");
lockScreenEl.className = "lock-screen hidden";

const lockCardEl = document.createElement("div");
lockCardEl.className = "lock-card";

const lockTitleEl = document.createElement("div");
lockTitleEl.className = "lock-title";
lockTitleEl.textContent = "Avoydance";

const lockSubtitleEl = document.createElement("div");
lockSubtitleEl.className = "lock-subtitle";
lockSubtitleEl.textContent = "Enter passcode";

const lockInputEl = document.createElement("input");
lockInputEl.className = "lock-input";
lockInputEl.type = "password";
lockInputEl.placeholder = "Passcode";
lockInputEl.autocomplete = "current-password";

const unlockBtn = document.createElement("button");
unlockBtn.className = "unlock-btn";
unlockBtn.type = "button";
unlockBtn.textContent = "Unlock";

const lockErrorEl = document.createElement("div");
lockErrorEl.className = "lock-error";

lockCardEl.appendChild(lockTitleEl);
lockCardEl.appendChild(lockSubtitleEl);
lockCardEl.appendChild(lockInputEl);
lockCardEl.appendChild(unlockBtn);
lockCardEl.appendChild(lockErrorEl);
lockScreenEl.appendChild(lockCardEl);
document.body.appendChild(lockScreenEl);

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function appVersion() {
  return window.APP_VERSION || "dev";
}

function createThread(title = "Unsent") {
  return {
    id: uid(),
    title,
    messages: [],
    updatedAt: Date.now(),
    disappearAfterMs: null,
  };
}

function defaultState() {
  const thread = createThread("Unsent");
  return {
    activeThreadId: null,
    threads: [thread],
    settings: { hidePreviews: false },
  };
}

function loadAuth() {
  try {
    const raw = localStorage.getItem(AUTH_KEY);
    if (!raw) return { passHash: null };
    const parsed = JSON.parse(raw);
    if (!parsed || typeof parsed.passHash !== "string") return { passHash: null };
    return { passHash: parsed.passHash || null };
  } catch {
    return { passHash: null };
  }
}

function saveAuth() {
  localStorage.setItem(AUTH_KEY, JSON.stringify(auth));
}

async function hashPasscode(passcode) {
  if (window.crypto && window.crypto.subtle) {
    const bytes = new TextEncoder().encode(passcode);
    const hashBuffer = await window.crypto.subtle.digest("SHA-256", bytes);
    const hashBytes = Array.from(new Uint8Array(hashBuffer));
    return hashBytes.map((b) => b.toString(16).padStart(2, "0")).join("");
  }
  return `plain:${passcode}`;
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.threads)) return defaultState();
    if (!parsed.settings || typeof parsed.settings !== "object") {
      parsed.settings = { hidePreviews: false };
    }
    if (typeof parsed.settings.hidePreviews !== "boolean") {
      parsed.settings.hidePreviews = false;
    }
    for (const thread of parsed.threads) {
      if (!Array.isArray(thread.messages)) thread.messages = [];
      if (thread.disappearAfterMs == null) thread.disappearAfterMs = null;
      if (!thread.updatedAt) {
        thread.updatedAt = thread.messages.length
          ? thread.messages[thread.messages.length - 1].ts
          : Date.now();
      }
    }
    return {
      activeThreadId: parsed.activeThreadId || null,
      threads: parsed.threads,
      settings: parsed.settings,
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

function formatTimerLabel(ms) {
  if (!ms) return "off";
  const hours = Math.round(ms / 3600000);
  return hours === 24 ? "1 day" : `${hours}h`;
}

function expireThreadMessages(thread, now = Date.now()) {
  if (!thread.disappearAfterMs) return false;
  const before = thread.messages.length;
  thread.messages = thread.messages.filter((msg) => now - msg.ts < thread.disappearAfterMs);
  if (thread.messages.length > 0) {
    thread.updatedAt = thread.messages[thread.messages.length - 1].ts;
  }
  return thread.messages.length !== before;
}

function expireAllThreads() {
  let changed = false;
  const now = Date.now();
  for (const thread of state.threads) {
    if (expireThreadMessages(thread, now)) changed = true;
  }
  return changed;
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
    emptyEl.textContent = "No threads yet. Tap the pencil.";
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
    if (state.settings.hidePreviews) {
      preview.textContent = "Note hidden";
    } else {
      preview.textContent = thread.messages.length
        ? thread.messages[thread.messages.length - 1].text
        : "No notes yet";
    }

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
    titleEl.textContent = "Avoydance";
    subtitleEl.textContent = `private local notes | v${appVersion()}`;
    backBtn.classList.add("hidden");
    editBtn.classList.remove("hidden");
    previewBtn.classList.remove("hidden");
    editBtn.textContent = isEditingThreads ? "Done" : "Edit";
    previewBtn.textContent = state.settings.hidePreviews ? "Show Preview" : "Hide Preview";
    newThreadBtn.classList.remove("hidden");
    clearBtn.classList.add("hidden");
    clearAllBtn.classList.remove("hidden");
    passcodeBtn.classList.remove("hidden");
    if (auth.passHash) lockBtn.classList.remove("hidden");
    else lockBtn.classList.add("hidden");
    timerBtn.classList.add("hidden");
    return;
  }

  titleEl.textContent = activeThread.title;
  subtitleEl.textContent = `unsent notes | timer ${formatTimerLabel(activeThread.disappearAfterMs)} | v${appVersion()}`;
  backBtn.classList.remove("hidden");
  editBtn.classList.add("hidden");
  previewBtn.classList.add("hidden");
  newThreadBtn.classList.add("hidden");
  clearBtn.classList.remove("hidden");
  clearAllBtn.classList.add("hidden");
  passcodeBtn.classList.add("hidden");
  if (auth.passHash) lockBtn.classList.remove("hidden");
  else lockBtn.classList.add("hidden");
  timerBtn.classList.remove("hidden");
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
  if (isLocked) {
    composerEl.classList.add("hidden");
    lockScreenEl.classList.remove("hidden");
    lockInputEl.focus();
    return;
  }
  lockScreenEl.classList.add("hidden");
  const expired = expireAllThreads();
  if (expired) saveState();
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

function setTimerForActiveThread() {
  const activeThread = getActiveThread();
  if (!activeThread) return;
  const currentHours = activeThread.disappearAfterMs
    ? Math.round(activeThread.disappearAfterMs / 3600000)
    : 0;
  const input = prompt(
    `Disappearing timer for "${activeThread.title}"\nEnter hours (0=off, 1-24):`,
    String(currentHours)
  );
  if (input == null) return;
  const hours = Number(input.trim());
  if (!Number.isInteger(hours) || hours < 0 || hours > 24) {
    toast("Use a whole number from 0 to 24.");
    return;
  }

  activeThread.disappearAfterMs = hours === 0 ? null : hours * 3600000;
  expireThreadMessages(activeThread);
  saveState();
  render();
  toast(hours === 0 ? "Timer off for this thread." : `Timer set: ${formatTimerLabel(activeThread.disappearAfterMs)}`);
}

function clearActiveThreadMessages() {
  const activeThread = getActiveThread();
  if (!activeThread) return;
  if (activeThread.messages.length === 0) {
    toast("No notes to clear.");
    return;
  }
  const ok = confirm(`Clear all notes in "${activeThread.title}"?`);
  if (!ok) return;
  activeThread.messages = [];
  activeThread.updatedAt = Date.now();
  saveState();
  render();
  toast("Thread content cleared.");
}

function clearAllThreadMessages() {
  const total = state.threads.reduce((count, thread) => count + thread.messages.length, 0);
  if (total === 0) {
    toast("No notes to clear.");
    return;
  }
  const ok = confirm(`Clear all notes from all threads? (${total} note${total === 1 ? "" : "s"})`);
  if (!ok) return;

  for (const thread of state.threads) {
    thread.messages = [];
    thread.updatedAt = Date.now();
  }
  saveState();
  render();
  toast("All thread content cleared.");
}

async function unlockApp() {
  if (!auth.passHash) {
    isLocked = false;
    render();
    return;
  }
  const passcode = lockInputEl.value.trim();
  if (!passcode) return;
  const hash = await hashPasscode(passcode);
  if (hash !== auth.passHash) {
    lockErrorEl.textContent = "Incorrect passcode.";
    lockInputEl.select();
    return;
  }
  lockInputEl.value = "";
  lockErrorEl.textContent = "";
  isLocked = false;
  render();
}

function lockApp() {
  if (!auth.passHash) return;
  isLocked = true;
  lockInputEl.value = "";
  lockErrorEl.textContent = "";
  render();
}

async function managePasscode() {
  if (!auth.passHash) {
    const pass1 = prompt("Set a passcode (4+ characters):");
    if (pass1 == null) return;
    if (pass1.trim().length < 4) {
      toast("Use at least 4 characters.");
      return;
    }
    const pass2 = prompt("Re-enter passcode:");
    if (pass2 == null) return;
    if (pass1 !== pass2) {
      toast("Passcodes did not match.");
      return;
    }
    auth.passHash = await hashPasscode(pass1);
    saveAuth();
    toast("Passcode enabled.");
    render();
    return;
  }

  const current = prompt("Enter current passcode:");
  if (current == null) return;
  const currentHash = await hashPasscode(current);
  if (currentHash !== auth.passHash) {
    toast("Current passcode is incorrect.");
    return;
  }

  const change = confirm("Press OK to change passcode. Press Cancel to remove passcode.");
  if (!change) {
    auth.passHash = null;
    saveAuth();
    toast("Passcode removed.");
    isLocked = false;
    render();
    return;
  }

  const pass1 = prompt("New passcode (4+ characters):");
  if (pass1 == null) return;
  if (pass1.trim().length < 4) {
    toast("Use at least 4 characters.");
    return;
  }
  const pass2 = prompt("Re-enter new passcode:");
  if (pass2 == null) return;
  if (pass1 !== pass2) {
    toast("Passcodes did not match.");
    return;
  }

  auth.passHash = await hashPasscode(pass1);
  saveAuth();
  toast("Passcode updated.");
  render();
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
previewBtn.addEventListener("click", () => {
  state.settings.hidePreviews = !state.settings.hidePreviews;
  saveState();
  render();
});
timerBtn.addEventListener("click", setTimerForActiveThread);
clearBtn.addEventListener("click", clearActiveThreadMessages);
clearAllBtn.addEventListener("click", clearAllThreadMessages);
passcodeBtn.addEventListener("click", () => {
  void managePasscode();
});
lockBtn.addEventListener("click", lockApp);
backBtn.addEventListener("click", () => {
  state.activeThreadId = null;
  isEditingThreads = false;
  saveState();
  render();
});
unlockBtn.addEventListener("click", () => {
  void unlockApp();
});
lockInputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") void unlockApp();
});

if (!state.settings) state.settings = { hidePreviews: false };
if (expireAllThreads()) saveState();
setInterval(() => {
  if (!expireAllThreads()) return;
  saveState();
  render();
}, 30000);

render();
