const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const toastEl = document.getElementById("toast");
const topbarEl = document.querySelector(".topbar");

const STORAGE_KEY = "avoydance.app.v1";

let state = loadState();

const threadBarEl = document.createElement("div");
threadBarEl.className = "threadbar";

const threadSelectEl = document.createElement("select");
threadSelectEl.id = "thread-select";
threadSelectEl.setAttribute("aria-label", "Thread");

const newThreadBtn = document.createElement("button");
newThreadBtn.className = "top-action";
newThreadBtn.type = "button";
newThreadBtn.textContent = "New";

const clearBtn = document.createElement("button");
clearBtn.className = "top-action danger";
clearBtn.type = "button";
clearBtn.textContent = "Clear";

threadBarEl.appendChild(threadSelectEl);
threadBarEl.appendChild(newThreadBtn);
threadBarEl.appendChild(clearBtn);
topbarEl.appendChild(threadBarEl);

function addMessage(message) {
  const row = document.createElement("div");
  row.className = "row me";

  const bubbleWrap = document.createElement("div");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = message.text;

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = formatTime(message.ts);

  bubbleWrap.appendChild(bubble);
  bubbleWrap.appendChild(time);
  row.appendChild(bubbleWrap);

  messagesEl.appendChild(row);
}

function scrollMessagesToBottom() {
  messagesEl.scrollTop = messagesEl.scrollHeight;
}

function formatTime(ts) {
  return new Date(ts).toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function uid() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function createThread(title = "Unsent") {
  return {
    id: uid(),
    title,
    messages: [],
  };
}

function defaultState() {
  const thread = createThread("Unsent");
  return {
    activeThreadId: thread.id,
    threads: [thread],
  };
}

function loadState() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    if (!raw) return defaultState();
    const parsed = JSON.parse(raw);
    if (!parsed || !Array.isArray(parsed.threads) || parsed.threads.length === 0) {
      return defaultState();
    }
    const hasActive = parsed.threads.some((t) => t.id === parsed.activeThreadId);
    if (!hasActive) parsed.activeThreadId = parsed.threads[0].id;
    return parsed;
  } catch {
    return defaultState();
  }
}

function saveState() {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
}

function getActiveThread() {
  return state.threads.find((thread) => thread.id === state.activeThreadId);
}

function renderThreadPicker() {
  threadSelectEl.innerHTML = "";
  for (const thread of state.threads) {
    const opt = document.createElement("option");
    opt.value = thread.id;
    opt.textContent = thread.title;
    threadSelectEl.appendChild(opt);
  }
  threadSelectEl.value = state.activeThreadId;
}

function renderMessages() {
  messagesEl.innerHTML = "";
  const activeThread = getActiveThread();
  if (!activeThread) return;
  for (const message of activeThread.messages) {
    addMessage(message);
  }
  scrollMessagesToBottom();
}

function toast(msg = "Sent to the void.") {
  toastEl.textContent = msg;
  toastEl.classList.remove("hidden");
  setTimeout(() => toastEl.classList.add("hidden"), 900);
}

function updateSendEnabled() {
  sendBtn.disabled = inputEl.value.trim().length === 0;
}

inputEl.addEventListener("input", updateSendEnabled);

function sendCurrent() {
  const text = inputEl.value.trim();
  if (!text) return;
  const activeThread = getActiveThread();
  if (!activeThread) return;
  const message = { id: uid(), text, ts: Date.now() };
  activeThread.messages.push(message);
  addMessage(message);
  saveState();
  scrollMessagesToBottom();
  inputEl.value = "";
  updateSendEnabled();
  toast();
}

function addThread() {
  const name = prompt("Thread name");
  if (!name) return;
  const title = name.trim();
  if (!title) return;
  const thread = createThread(title);
  state.threads.push(thread);
  state.activeThreadId = thread.id;
  saveState();
  renderThreadPicker();
  renderMessages();
}

function clearThread() {
  const activeThread = getActiveThread();
  if (!activeThread) return;
  if (!confirm(`Clear all messages in "${activeThread.title}"?`)) return;
  activeThread.messages = [];
  saveState();
  renderMessages();
  toast("Thread cleared.");
}

sendBtn.addEventListener("click", sendCurrent);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendCurrent();
});
threadSelectEl.addEventListener("change", () => {
  state.activeThreadId = threadSelectEl.value;
  saveState();
  renderMessages();
});
newThreadBtn.addEventListener("click", addThread);
clearBtn.addEventListener("click", clearThread);

renderThreadPicker();
renderMessages();
updateSendEnabled();
