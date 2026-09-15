/* =========================================================
   NOVA — YOUR SECOND MIND
   app.js
   My Mind 3.0 — Automatic Memory Intelligence
   ========================================================= */

(() => {
  "use strict";

  /* =======================================================
     CONFIG
     ======================================================= */

  const WORKER_URL =
    "https://nova-ai-brain.aniksar028.workers.dev/api/chat";

  const MEMORY_KEY = "nova_mind";
  const MESSAGE_KEY = "nova_messages";
  const MODE_KEY = "nova_mode";

  const MAX_MESSAGES = 40;
  const MAX_MEMORIES = 100;

  /* =======================================================
     STATE
     ======================================================= */

  let pendingMemory = null;
  let isSending = false;

  /* =======================================================
     BASIC HELPERS
     ======================================================= */

  function $(selector) {
    return document.querySelector(selector);
  }

  function escapeHTML(value) {
    return String(value ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  function now() {
    return new Date().toISOString();
  }

  function makeId() {
    return (
      Date.now().toString(36) +
      Math.random().toString(36).slice(2, 8)
    );
  }

  /* =======================================================
     MODE
     ======================================================= */

  function getMode() {
    return localStorage.getItem(MODE_KEY) || "ASK";
  }

  function setMode(mode) {
    localStorage.setItem(MODE_KEY, mode);

    document
      .querySelectorAll("[data-mode]")
      .forEach((el) => {
        el.classList.toggle(
          "active",
          el.dataset.mode === mode
        );
      });
  }

  /* =======================================================
     MESSAGE STORAGE
     ======================================================= */

  function getMessages() {
    try {
      const data = JSON.parse(
        localStorage.getItem(MESSAGE_KEY) || "[]"
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveMessages(messages) {
    localStorage.setItem(
      MESSAGE_KEY,
      JSON.stringify(messages.slice(-MAX_MESSAGES))
    );
  }

  function addMessage(role, content) {
    const messages = getMessages();

    messages.push({
      role,
      content: String(content || ""),
      time: now()
    });

    saveMessages(messages);
  }

  /* =======================================================
     MEMORY — CORE
     ======================================================= */

  function getMind() {
    try {
      const data = JSON.parse(
        localStorage.getItem(MEMORY_KEY) || "[]"
      );

      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function saveMind(content, category = "other") {
    const clean = String(content || "").trim();

    if (!clean) return false;

    const memories = getMind();

    const duplicate = memories.some(
      (item) =>
        String(item.content || "").toLowerCase() ===
        clean.toLowerCase()
    );

    if (duplicate) return false;

    const memory = {
      id: makeId(),
      content: clean,
      category,
      time: now()
    };

    memories.push(memory);

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(
        memories.slice(-MAX_MEMORIES)
      )
    );

    return true;
  }

  function deleteMind(id) {
    const memories = getMind().filter(
      (item) => item.id !== id
    );

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(memories)
    );

    renderMind();
  }

  function clearMind() {
    localStorage.removeItem(MEMORY_KEY);
    renderMind();
  }

  /* =======================================================
     MEMORY CATEGORY
     ======================================================= */

  function detectCategory(text) {
    const value = String(text || "").toLowerCase();

    if (
      /\b(name|birthday|dob|date of birth|born|age|from|live|location)\b/i.test(
        value
      )
    ) {
      return "profile";
    }

    if (
      /\b(goal|aim|dream|target|want to become|plan to become)\b/i.test(
        value
      )
    ) {
      return "goals";
    }

    if (
      /\b(like|love|prefer|favorite|favourite|dislike|don't like|dont like|hate)\b/i.test(
        value
      )
    ) {
      return "preferences";
    }

    if (
      /\b(routine|wake|sleep|study time|exercise|workout|daily schedule)\b/i.test(
        value
      )
    ) {
      return "routine";
    }

    return "other";
  }

  /* =======================================================
     SENSITIVE INFORMATION PROTECTION
     ======================================================= */

  function isSensitive(text) {
    const value = String(text || "").toLowerCase();

    const sensitivePatterns = [
      /password/i,
      /passcode/i,
      /pin\b/i,
      /otp\b/i,
      /one[- ]time password/i,
      /api[\s_-]?key/i,
      /secret[\s_-]?key/i,
      /private[\s_-]?key/i,
      /access[\s_-]?token/i,
      /auth[\s_-]?token/i,
      /bearer[\s_-]?token/i,
      /credit card/i,
      /debit card/i,
      /card number/i,
      /cvv/i,
      /cvc/i,
      /bank account/i,
      /routing number/i,
      /wallet seed/i,
      /seed phrase/i,
      /recovery phrase/i,
      /national id/i,
      /nid number/i,
      /passport number/i
    ];

    return sensitivePatterns.some((pattern) =>
      pattern.test(value)
    );
  }

  /* =======================================================
     MEMORY DETECTION
     ======================================================= */

  function detectMemory(text) {
    const original = String(text || "").trim();

    if (!original) return null;

    /*
      Never automatically store sensitive information.
    */
    if (isSensitive(original)) {
      return null;
    }

    const value = original.toLowerCase();

    /* -----------------------------------------------------
       Explicit save request
       ----------------------------------------------------- */

    const explicitPatterns = [
      "remember this",
      "remember that",
      "remember my",
      "remember i ",
      "remember i'm",
      "remember im",
      "save this",
      "save that",
      "don't forget",
      "dont forget",
      "keep this in mind"
    ];

    const explicitlyRequested = explicitPatterns.some(
      (phrase) => value.includes(phrase)
    );

    if (explicitlyRequested) {
      let cleaned = original;

      cleaned = cleaned.replace(
        /^(please\s+)?(remember|save|keep)\s+(this|that)\s*[:,-]?\s*/i,
        ""
      );

      cleaned = cleaned.replace(
        /^(please\s+)?remember\s+(my|i|i'm|im)\s*/i,
        (match) => {
          const lower = match.toLowerCase();

          if (lower.includes("my")) return "My ";
          if (
            lower.includes("i'm") ||
            lower.includes("im")
          ) {
            return "I ";
          }

          return "";
        }
      );

      cleaned = cleaned.replace(
        /^(please\s+)?(don't forget|dont forget)\s*/i,
        ""
      );

      cleaned = cleaned.trim();

      if (!cleaned) {
        cleaned = original;
      }

      return {
        content: cleaned,
        category: detectCategory(cleaned),
        explicit: true
      };
    }

    /* -----------------------------------------------------
       Safe automatic memory candidates
       ----------------------------------------------------- */

    const automaticPatterns = [
      /my name is\s+.+/i,
      /my birthday is\s+.+/i,
      /my dob is\s+.+/i,
      /my date of birth is\s+.+/i,
      /i was born\s+.+/i,
      /my goal is\s+.+/i,
      /my goal\s+.+/i,
      /i want to\s+.+/i,
      /i like\s+.+/i,
      /i love\s+.+/i,
      /i prefer\s+.+/i,
      /i don't like\s+.+/i,
      /i dont like\s+.+/i,
      /my routine\s+.+/i,
      /i study\s+.+/i,
      /i work\s+.+/i
    ];

    const matched = automaticPatterns.some(
      (pattern) => pattern.test(original)
    );

    if (!matched) {
      return null;
    }

    return {
      content: original,
      category: detectCategory(original),
      explicit: false
    };
  }

  /* =======================================================
     MEMORY CONFIRMATION
     ======================================================= */

  function requestMemoryConfirmation(memory) {
    pendingMemory = memory;

    removeExistingMemoryPrompt();

    const box = document.createElement("div");

    box.id = "novaMemoryPrompt";

    box.innerHTML = `
      <div class="nova-memory-confirm">
        <div class="nova-memory-title">
          🧠 Remember this?
        </div>

        <div class="nova-memory-text">
          ${escapeHTML(memory.content)}
        </div>

        <div class="nova-memory-actions">
          <button id="novaMemoryYes">
            Save
          </button>

          <button id="novaMemoryNo">
            Don't save
          </button>
        </div>
      </div>
    `;

    const composer = $(".composer");

    if (composer) {
      composer.parentNode.insertBefore(
        box,
        composer
      );
    } else {
      document.body.appendChild(box);
    }

    $("#novaMemoryYes")?.addEventListener(
      "click",
      confirmMemory
    );

    $("#novaMemoryNo")?.addEventListener(
      "click",
      rejectMemory
    );
  }

  function confirmMemory() {
    if (!pendingMemory) return;

    saveMind(
      pendingMemory.content,
      pendingMemory.category
    );

    pendingMemory = null;

    removeExistingMemoryPrompt();
    renderMind();
  }

  function rejectMemory() {
    pendingMemory = null;
    removeExistingMemoryPrompt();
  }

  function removeExistingMemoryPrompt() {
    const existing = $("#novaMemoryPrompt");

    if (existing) {
      existing.remove();
    }
  }

  /* =======================================================
     FORGET COMMANDS
     ======================================================= */

  function processForgetCommand(text) {
    const value = String(text || "")
      .trim()
      .toLowerCase();

    if (
      value === "forget everything about me" ||
      value === "forget everything" ||
      value === "clear all my memories" ||
      value === "delete all my memories"
    ) {
      clearMind();

      return {
        handled: true,
        reply:
          "I cleared the memories stored in NOVA's My Mind on this device."
      };
    }

    if (
      value.startsWith("forget my ") ||
      value.startsWith("forget ")
    ) {
      const target = value
        .replace(/^forget my\s+/, "")
        .replace(/^forget\s+/, "")
        .trim();

      if (!target) {
        return {
          handled: false
        };
      }

      const memories = getMind();

      const remaining = memories.filter(
        (item) =>
          !String(item.content || "")
            .toLowerCase()
            .includes(target)
      );

      const removed =
        memories.length - remaining.length;

      localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify(remaining)
      );

      renderMind();

      return {
        handled: true,
        reply:
          removed > 0
            ? `I forgot ${removed} matching memory${
                removed === 1 ? "" : "ies"
              } from My Mind.`
            : `I couldn't find a memory matching "${target}".`
      };
    }

    return {
      handled: false
    };
  }

  /* =======================================================
     MEMORY CONTEXT FOR AI
     ======================================================= */

  function getMindContext() {
    const memories = getMind();

    if (!memories.length) {
      return "No saved memories.";
    }

    return memories
      .map(
        (item, index) =>
          `${index + 1}. [${item.category}] ${item.content}`
      )
      .join("\n");
  }

  /* =======================================================
     CHAT UI
     ======================================================= */

  function ensureChatUI() {
    if ($("#novaChat")) return;

    const composer = $(".composer");

    const chat = document.createElement("div");

    chat.id = "novaChat";

    chat.innerHTML = `
      <div class="nova-chat-inner"></div>
    `;

    if (composer) {
      composer.parentNode.insertBefore(
        chat,
        composer
      );
    } else {
      document.body.appendChild(chat);
    }
  }

  function renderChat() {
    ensureChatUI();

    const container = $("#novaChat .nova-chat-inner");

    if (!container) return;

    const messages = getMessages();

    container.innerHTML = messages
      .map((item) => {
        const role =
          item.role === "assistant"
            ? "assistant"
            : "user";

        return `
          <div class="nova-message ${role}">
            <div class="nova-message-role">
              ${
                role === "assistant"
                  ? "NOVA"
                  : "YOU"
              }
            </div>

            <div class="nova-message-content">
              ${escapeHTML(item.content).replace(
                /\n/g,
                "<br>"
              )}
            </div>
          </div>
        `;
      })
      .join("");

    container.scrollTop = container.scrollHeight;
  }

  /* =======================================================
     MY MIND UI
     ======================================================= */

  function ensureMindUI() {
    if ($("#novaMind")) return;

    const composer = $(".composer");

    const section = document.createElement("section");

    section.id = "novaMind";

    section.innerHTML = `
      <div class="nova-mind-header">

        <div>
          <div class="nova-mind-title">
            My Mind
          </div>

          <div class="nova-mind-subtitle">
            Things NOVA remembers about you
          </div>
        </div>

        <button
          id="novaClearMind"
          class="nova-mind-clear"
        >
          Clear
        </button>

      </div>

      <div class="nova-mind-search">
        <input
          id="novaMindSearch"
          type="search"
          placeholder="Search your memories..."
        />
      </div>

      <div class="nova-mind-filters">

        <button
          data-memory-filter="all"
          class="active"
        >
          All
        </button>

        <button data-memory-filter="profile">
          Profile
        </button>

        <button data-memory-filter="goals">
          Goals
        </button>

        <button data-memory-filter="preferences">
          Preferences
        </button>

        <button data-memory-filter="routine">
          Routine
        </button>

        <button data-memory-filter="other">
          Other
        </button>

      </div>

      <div id="novaMindList"></div>
    `;

    if (composer) {
      composer.parentNode.insertBefore(
        section,
        composer
      );
    } else {
      document.body.appendChild(section);
    }

    $("#novaClearMind")?.addEventListener(
      "click",
      () => {
        if (!getMind().length) return;

        const ok = confirm(
          "Clear all memories from My Mind?"
        );

        if (ok) {
          clearMind();
        }
      }
    );

    $("#novaMindSearch")?.addEventListener(
      "input",
      renderMind
    );

    document
      .querySelectorAll("[data-memory-filter]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            document
              .querySelectorAll(
                "[data-memory-filter]"
              )
              .forEach((item) =>
                item.classList.remove("active")
              );

            button.classList.add("active");

            renderMind();
          }
        );
      });
  }

  function getCurrentMemoryFilter() {
    return (
      document.querySelector(
        "[data-memory-filter].active"
      )?.dataset.memoryFilter || "all"
    );
  }

  function renderMind() {
    ensureMindUI();

    const list = $("#novaMindList");

    if (!list) return;

    const memories = getMind();

    const search =
      $("#novaMindSearch")?.value
        ?.trim()
        .toLowerCase() || "";

    const filter = getCurrentMemoryFilter();

    const filtered = memories.filter((item) => {
      const categoryMatch =
        filter === "all" ||
        item.category === filter;

      const searchMatch =
        !search ||
        String(item.content || "")
          .toLowerCase()
          .includes(search);

      return categoryMatch && searchMatch;
    });

    if (!filtered.length) {
      list.innerHTML = `
        <div class="nova-empty-memory">
          ${
            memories.length
              ? "No matching memories."
              : "Nothing saved yet."
          }
        </div>
      `;

      return;
    }

    list.innerHTML = filtered
      .slice()
      .reverse()
      .map(
        (item) => `
          <div
            class="nova-memory-card"
            data-memory-id="${escapeHTML(item.id)}"
          >

            <div class="nova-memory-card-top">

              <span class="nova-memory-category">
                ${escapeHTML(item.category)}
              </span>

              <div class="nova-memory-buttons">

                <button
                  data-action="edit"
                  data-id="${escapeHTML(item.id)}"
                >
                  Edit
                </button>

                <button
                  data-action="delete"
                  data-id="${escapeHTML(item.id)}"
                >
                  Delete
                </button>

              </div>

            </div>

            <div class="nova-memory-card-content">
              ${escapeHTML(item.content)}
            </div>

            <div class="nova-memory-time">
              ${formatMemoryTime(item.time)}
            </div>

          </div>
        `
      )
      .join("");

    list
      .querySelectorAll(
        "[data-action='delete']"
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          deleteMind(button.dataset.id);
        });
      });

    list
      .querySelectorAll(
        "[data-action='edit']"
      )
      .forEach((button) => {
        button.addEventListener("click", () => {
          editMind(button.dataset.id);
        });
      });
  }

  function formatMemoryTime(time) {
    if (!time) return "";

    try {
      return new Date(time).toLocaleString();
    } catch {
      return "";
    }
  }

  function editMind(id) {
    const memories = getMind();

    const item = memories.find(
      (memory) => memory.id === id
    );

    if (!item) return;

    const updated = prompt(
      "Edit this memory:",
      item.content
    );

    if (updated === null) return;

    const clean = updated.trim();

    if (!clean) return;

    if (isSensitive(clean)) {
      alert(
        "For security, NOVA won't save passwords, API keys, tokens, card details, or similar sensitive information."
      );

      return;
    }

    item.content = clean;
    item.category = detectCategory(clean);
    item.time = now();

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(memories)
    );

    renderMind();
  }

  /* =======================================================
     STATUS
     ======================================================= */

  function setStatus(text, type = "") {
    const status = $("#status");

    if (!status) return;

    status.textContent = text;

    status.classList.remove(
      "success",
      "error",
      "thinking"
    );

    if (type) {
      status.classList.add(type);
    }
  }

  /* =======================================================
     ASK NOVA
     ======================================================= */

  async function ask(message) {
    const cleanMessage =
      String(message || "").trim();

    if (!cleanMessage) return;

    if (isSending) return;

    /* -----------------------------------------------------
       Forget commands
       ----------------------------------------------------- */

    const forgetResult =
      processForgetCommand(cleanMessage);

    if (forgetResult.handled) {
      addMessage(
        "user",
        cleanMessage
      );

      addMessage(
        "assistant",
        forgetResult.reply
      );

      renderChat();
      renderMind();

      setStatus("Memory updated", "success");

      return;
    }

    /* -----------------------------------------------------
       Memory intelligence
       ----------------------------------------------------- */

    const memoryCandidate =
      detectMemory(cleanMessage);

    /*
      Explicit memory request:
      save immediately because user clearly asked NOVA
      to remember it.

      Automatic candidate:
      ask confirmation first.
    */

    if (
      memoryCandidate &&
      memoryCandidate.explicit
    ) {
      saveMind(
        memoryCandidate.content,
        memoryCandidate.category
      );

      renderMind();
    }

    if (
      memoryCandidate &&
      !memoryCandidate.explicit
    ) {
      const alreadySaved = getMind().some(
        (item) =>
          String(item.content || "")
            .toLowerCase() ===
          memoryCandidate.content.toLowerCase()
      );

      if (!alreadySaved) {
        requestMemoryConfirmation(
          memoryCandidate
        );
      }
    }

    /* -----------------------------------------------------
       UI
       ----------------------------------------------------- */

    addMessage("user", cleanMessage);

    renderChat();

    setStatus(
      "NOVA is thinking...",
      "thinking"
    );

    isSending = true;

    try {
      const history = getMessages()
        .slice(-12)
        .map((item) => ({
          role:
            item.role === "assistant"
              ? "assistant"
              : "user",
          content: String(
            item.content || ""
          )
        }));

      const response = await fetch(
        WORKER_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body: JSON.stringify({
            message: cleanMessage,
            mode: getMode(),
            history,
            memory: getMindContext()
          })
        }
      );

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}`
        );
      }

      const data =
        await response.json();

      if (
        !data ||
        data.success !== true
      ) {
        throw new Error(
          data?.error ||
            "Invalid response from NOVA"
        );
      }

      const answer =
        String(
          data.answer ||
          data.response ||
          data.message ||
          ""
        ).trim();

      if (!answer) {
        throw new Error(
          "NOVA returned an empty answer."
        );
      }

      addMessage(
        "assistant",
        answer
      );

      renderChat();

      renderMind();

      setStatus(
        "NOVA is online",
        "success"
      );
    } catch (error) {
      console.error(
        "NOVA connection error:",
        error
      );

      addMessage(
        "assistant",
        "I couldn't connect to NOVA's AI brain right now. Please try again."
      );

      renderChat();

      setStatus(
        "NOVA could not connect",
        "error"
      );
    } finally {
      isSending = false;
    }
  }

  /* =======================================================
     GLOBAL ASK FUNCTION
     ======================================================= */

  window.askNova = function () {
    const input = $("#prompt");

    if (!input) return;

    const message = input.value.trim();

    if (!message) return;

    input.value = "";

    ask(message);
  };

  /* =======================================================
     ENTER KEY
     ======================================================= */

  function setupComposer() {
    const input = $("#prompt");

    if (!input) return;

    input.addEventListener(
      "keydown",
      (event) => {
        if (
          event.key === "Enter" &&
          !event.shiftKey
        ) {
          event.preventDefault();

          window.askNova();
        }
      }
    );
  }

  /* =======================================================
     VOICE INPUT
     ======================================================= */

  window.startVoice = function () {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      alert(
        "Voice input is not supported by this browser."
      );

      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "en-US";
    recognition.interimResults = false;
    recognition.maxAlternatives = 1;

    setStatus(
      "Listening...",
      "thinking"
    );

    recognition.start();

    recognition.onresult = (event) => {
      const transcript =
        event.results[0][0].transcript;

      const input = $("#prompt");

      if (input) {
        input.value = transcript;
      }

      setStatus(
        "Voice captured",
        "success"
      );
    };

    recognition.onerror = (event) => {
      console.error(
        "Voice error:",
        event.error
      );

      setStatus(
        "Voice input failed",
        "error"
      );
    };

    recognition.onend = () => {
      if (
        $("#status")?.textContent ===
        "Listening..."
      ) {
        setStatus("");
      }
    };
  };

  /* =======================================================
     MODE BUTTONS
     ======================================================= */

  function setupModes() {
    document
      .querySelectorAll("[data-mode]")
      .forEach((button) => {
        button.addEventListener(
          "click",
          () => {
            const mode =
              button.dataset.mode;

            if (!mode) return;

            setMode(mode);
          }
        );
      });

    setMode(getMode());
  }

  /* =======================================================
     CLEAR CHAT
     ======================================================= */

  function setupClearChat() {
    const button =
      document.querySelector(
        "[data-clear-chat]"
      );

    if (!button) return;

    button.addEventListener(
      "click",
      () => {
        const ok = confirm(
          "Clear NOVA conversation history?"
        );

        if (!ok) return;

        localStorage.removeItem(
          MESSAGE_KEY
        );

        renderChat();
      }
    );
  }

  /* =======================================================
     INITIALIZATION
     ======================================================= */

  function init() {
    ensureChatUI();
    ensureMindUI();

    renderChat();
    renderMind();

    setupComposer();
    setupModes();
    setupClearChat();

    setStatus(
      "NOVA is online",
      "success"
    );

    console.log(
      "NOVA My Mind 3.0 initialized."
    );
  }

  /* =======================================================
     START
     ======================================================= */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      init
    );
  } else {
    init();
  }

})();
