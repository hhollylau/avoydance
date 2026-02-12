const messagesEl = document.getElementById("messages");
const inputEl = document.getElementById("input");
const sendBtn = document.getElementById("send");
const toastEl = document.getElementById("toast");

function nowTime() {
  return new Date().toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" });
}

function addMessage(text) {
  const row = document.createElement("div");
  row.className = "row me";

  const bubbleWrap = document.createElement("div");

  const bubble = document.createElement("div");
  bubble.className = "bubble";
  bubble.textContent = text;

  const time = document.createElement("div");
  time.className = "time";
  time.textContent = nowTime();

  bubbleWrap.appendChild(bubble);
  bubbleWrap.appendChild(time);
  row.appendChild(bubbleWrap);

  messagesEl.appendChild(row);
  messagesEl.scrollTop = messagesEl.scrollHeight;
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
  addMessage(text);
  inputEl.value = "";
  updateSendEnabled();
  toast();
}

sendBtn.addEventListener("click", sendCurrent);
inputEl.addEventListener("keydown", (e) => {
  if (e.key === "Enter") sendCurrent();
});
