/* =========================================================
   NOVA — YOUR SECOND MIND
   app.js
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
  const PENDING_MEMORY_KEY = "nova_pending_memory";

  const MAX_MESSAGES = 40;
  const MAX_HISTORY_TO_AI = 12;
  const MAX_MEMORIES = 100;


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

  function normalize(value) {
    return String(value ?? "")
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();
  }

  function nowISO() {
    return new Date().toISOString();
  }


  /* =======================================================
     TOAST
     ======================================================= */

  function showToast(message) {
    const toast = $("#toast");

    if (!toast) {
      console.log(message);
      return;
    }

    toast.innerText = message;
    toast.classList.add("show");

    clearTimeout(window.__novaToastTimer);

    window.__novaToastTimer = setTimeout(() => {
      toast.classList.remove("show");
    }, 2200);
  }

  window.showToast = showToast;


  /* =======================================================
     MODE
     ======================================================= */

  let currentMode =
    localStorage.getItem(MODE_KEY) || "ASK";

  function setMode(mode) {
    currentMode = mode;
    localStorage.setItem(MODE_KEY, mode);

    document
      .querySelectorAll(".mode")
      .forEach(button => {
        button.classList.remove("active");
      });

    if (mode === "ASK" && $("#askMode")) {
      $("#askMode").classList.add("active");
    }

    if (mode === "LEARN" && $("#learnMode")) {
      $("#learnMode").classList.add("active");
    }

    if (mode === "DO" && $("#doMode")) {
      $("#doMode").classList.add("active");
    }

    const status = $("#status");

    if (status) {
      status.innerText =
        `${mode} mode • NOVA is ready.`;
    }

    showToast(`${mode} mode selected`);
  }

  window.setMode = setMode;


  /* =======================================================
     MESSAGE STORAGE
     ======================================================= */

  function getMessages() {
    try {
      const raw = localStorage.getItem(MESSAGE_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }

  function saveMessages(messages) {
    const clean = Array.isArray(messages)
      ? messages.slice(-MAX_MESSAGES)
      : [];

    localStorage.setItem(
      MESSAGE_KEY,
      JSON.stringify(clean)
    );
  }

  function addMessage(role, content) {
    if (!content) return;

    const messages = getMessages();

    messages.push({
      role:
        role === "assistant"
          ? "assistant"
          : "user",

      content: String(content),

      time: nowISO()
    });

    saveMessages(messages);
  }


  /* =======================================================
     MEMORY — READ
     ======================================================= */

  function getMind() {
    try {
      const raw =
        localStorage.getItem(MEMORY_KEY);

      if (!raw) return [];

      const parsed = JSON.parse(raw);

      return Array.isArray(parsed)
        ? parsed
        : [];
    } catch {
      return [];
    }
  }


  /* =======================================================
     MEMORY — SENSITIVE DATA PROTECTION
     ======================================================= */

  function isSensitiveMemory(text) {
    const t = normalize(text);

    const sensitivePatterns = [
      "password",
      "passcode",
      "pin code",
      "pin:",
      "api key",
      "api_key",
      "secret key",
      "secret_key",
      "private key",
      "private_key",
      "credit card",
      "debit card",
      "cvv",
      "cvc",
      "otp",
      "one time password",
      "verification code",
      "bank account",
      "account number",
      "routing number",
      "nid number",
      "national id",
      "passport number"
    ];

    return sensitivePatterns.some(pattern =>
      t.includes(pattern)
    );
  }


  /* =======================================================
     MEMORY — CATEGORY
     ======================================================= */

  function detectCategory(text) {
    const t = normalize(text);

    if (
      t.includes("my name") ||
      t.includes("my birthday") ||
      t.includes("my dob") ||
      t.includes("date of birth") ||
      t.includes("i was born") ||
      t.includes("my age")
    ) {
      return "profile";
    }

    if (
      t.includes("my goal") ||
      t.includes("i want to become") ||
      t.includes("i want to learn") ||
      t.includes("i plan to") ||
      t.includes("my target")
    ) {
      return "goals";
    }

    if (
      t.includes("i like") ||
      t.includes("i love") ||
      t.includes("i prefer") ||
      t.includes("i don't like") ||
      t.includes("i dont like") ||
      t.includes("i hate")
    ) {
      return "preferences";
    }

    if (
      t.includes("my routine") ||
      t.includes("i wake up") ||
      t.includes("i sleep") ||
      t.includes("i study") ||
      t.includes("i work") ||
      t.includes("my schedule")
    ) {
      return "routine";
    }

    return "other";
  }


  /* =======================================================
     MEMORY — DETECTION
     ======================================================= */

  function detectMemory(text) {
    const original =
      String(text || "").trim();

    if (!original) {
      return null;
    }

    /*
      Never automatically store sensitive information.
    */
    if (isSensitiveMemory(original)) {
      return null;
    }

    const t = normalize(original);

    const explicitTriggers = [
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

    const explicit =
      explicitTriggers.some(trigger =>
        t.includes(trigger)
      );

    const automaticPatterns = [
      "my name is",
      "my birthday is",
      "my dob is",
      "my date of birth is",
      "i was born",
      "my goal is",
      "my goal ",
      "i want to become",
      "i want to learn",
      "i plan to",
      "my target is",
      "i like",
      "i love",
      "i prefer",
      "i don't like",
      "i dont like",
      "my routine",
      "my schedule",
      "i study",
      "i work"
    ];

    const automatic =
      automaticPatterns.some(pattern =>
        t.includes(pattern)
      );

    if (!explicit && !automatic) {
      return null;
    }

    let content = original;

    /*
      Clean only command prefixes.
      Do NOT destroy the actual information.
    */

    content = content
      .replace(
        /^remember this[\s:,.!?-]*/i,
        ""
      )
      .replace(
        /^remember that[\s:,.!?-]*/i,
        ""
      )
      .replace(
        /^save this[\s:,.!?-]*/i,
        ""
      )
      .replace(
        /^save that[\s:,.!?-]*/i,
        ""
      )
      .trim();

    if (!content) {
      content = original;
    }

    return {
      content,
      category: detectCategory(original),
      explicit,
      automatic
    };
  }


  /* =======================================================
     MEMORY — SAVE
     ======================================================= */

  function saveMind(content, category = "other") {
    const cleanContent =
      String(content || "").trim();

    if (!cleanContent) {
      return false;
    }

    /*
      Security:
      never save sensitive information.
    */

    if (isSensitiveMemory(cleanContent)) {
      return false;
    }

    let memories = getMind();

    const normalizedContent =
      normalize(cleanContent)
        .replace(/[.,!?]/g, "");

    const duplicate =
      memories.some(memory => {
        const existing =
          normalize(memory.content)
            .replace(/[.,!?]/g, "");

        return existing === normalizedContent;
      });

    if (duplicate) {
      return false;
    }

    memories.unshift({
      id:
        `${Date.now()}-${Math.random()
          .toString(36)
          .slice(2, 8)}`,

      content: cleanContent,

      category,

      time: nowISO()
    });

    memories =
      memories.slice(0, MAX_MEMORIES);

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(memories)
    );

    return true;
  }


  /* =======================================================
     MEMORY — DELETE
     ======================================================= */

  function deleteMind(id) {
    const memories = getMind();

    const updated =
      memories.filter(memory =>
        String(memory.id) !== String(id)
      );

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(updated)
    );

    renderMind();

    showToast("Memory deleted.");
  }


  /* =======================================================
     MEMORY — CLEAR
     ======================================================= */

  function clearMind() {
    const confirmed =
      window.confirm(
        "Clear all memories from My Mind?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(MEMORY_KEY);
    localStorage.removeItem(
      PENDING_MEMORY_KEY
    );

    renderMind();

    showToast("My Mind cleared.");
  }


  /* =======================================================
     MEMORY — EDIT
     ======================================================= */

  function editMind(id) {
    const memories = getMind();

    const memory =
      memories.find(item =>
        String(item.id) === String(id)
      );

    if (!memory) {
      return;
    }

    const updated =
      window.prompt(
        "Edit this memory:",
        memory.content
      );

    if (updated === null) {
      return;
    }

    const clean =
      updated.trim();

    if (!clean) {
      return;
    }

    if (isSensitiveMemory(clean)) {
      showToast(
        "Sensitive information can't be saved."
      );
      return;
    }

    memory.content = clean;
    memory.category =
      detectCategory(clean);
    memory.time = nowISO();

    localStorage.setItem(
      MEMORY_KEY,
      JSON.stringify(memories)
    );

    renderMind();

    showToast("Memory updated.");
  }


  /* =======================================================
     MEMORY — PENDING CONFIRMATION
     ======================================================= */

  function getPendingMemory() {
    try {
      const raw =
        localStorage.getItem(
          PENDING_MEMORY_KEY
        );

      if (!raw) {
        return null;
      }

      return JSON.parse(raw);
    } catch {
      localStorage.removeItem(
        PENDING_MEMORY_KEY
      );

      return null;
    }
  }


  function setPendingMemory(memory) {
    localStorage.setItem(
      PENDING_MEMORY_KEY,
      JSON.stringify(memory)
    );
  }


  function clearPendingMemory() {
    localStorage.removeItem(
      PENDING_MEMORY_KEY
    );
  }


  /* =======================================================
     MEMORY — CONFIRMATION
     ======================================================= */

  function handleMemoryConfirmation(text) {
    const pending =
      getPendingMemory();

    if (!pending) {
      return null;
    }

    const t = normalize(text);

    const yesWords = [
      "yes",
      "yes save",
      "save it",
      "save this",
      "remember it",
      "remember this",
      "ok",
      "okay",
      "sure",
      "do it",
      "go ahead",
      "save"
    ];

    const noWords = [
      "no",
      "nope",
      "don't save",
      "dont save",
      "do not save",
      "don't remember",
      "dont remember",
      "skip",
      "cancel"
    ];

    const isYes =
      yesWords.some(word =>
        t === word ||
        t.startsWith(word + " ")
      );

    const isNo =
      noWords.some(word =>
        t === word ||
        t.startsWith(word + " ")
      );

    if (isYes) {
      const saved =
        saveMind(
          pending.content,
          pending.category
        );

      clearPendingMemory();

      return {
        type: "saved",

        message: saved
          ? `Saved to My Mind: "${pending.content}"`
          : "That memory is already saved."
      };
    }

    if (isNo) {
      clearPendingMemory();

      return {
        type: "rejected",

        message:
          "Okay. I won't save it."
      };
    }

    /*
      User asked something unrelated.
      Keep pending memory so they can answer later.
    */

    return null;
  }


  /* =======================================================
     SMART MEMORY HANDLER
     ======================================================= */

  function handleSmartMemory(text) {
    const detected =
      detectMemory(text);

    if (!detected) {
      return null;
    }

    /*
      Explicit:
      "Remember this..."
      => save immediately.
    */

    if (detected.explicit) {
      const saved =
        saveMind(
          detected.content,
          detected.category
        );

      if (saved) {
        return {
          type: "saved",

          message:
            `Got it. I'll remember this: "${detected.content}"`
        };
      }

      return null;
    }

    /*
      Automatic detection:
      Ask before storing.
    */

    const pending = {
      content: detected.content,
      category: detected.category,
      createdAt: Date.now()
    };

    setPendingMemory(pending);

    return {
      type: "pending",

      message:
        `I noticed something that may be useful to remember:\n\n"${detected.content}"\n\nShould I save this to My Mind?`
    };
  }


  /* =======================================================
     MEMORY — FORGET COMMAND
     ======================================================= */

  function processForgetCommand(text) {
    const t = normalize(text);

    if (
      t === "forget everything about me" ||
      t === "forget everything" ||
      t === "clear all my memories" ||
      t === "clear my mind"
    ) {
      localStorage.removeItem(MEMORY_KEY);
      clearPendingMemory();

      return {
        handled: true,

        message:
          "Okay. I've cleared the memories stored in this browser."
      };
    }

    const forgetPrefixes = [
      "forget my ",
      "forget "
    ];

    for (const prefix of forgetPrefixes) {
      if (!t.startsWith(prefix)) {
        continue;
      }

      const target =
        t.slice(prefix.length).trim();

      if (!target) {
        continue;
      }

      const memories =
        getMind();

      const before =
        memories.length;

      const updated =
        memories.filter(memory => {
          const content =
            normalize(memory.content);

          return !content.includes(target);
        });

      localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify(updated)
      );

      if (updated.length < before) {
        return {
          handled: true,

          message:
            `Okay. I removed the memory related to "${target}".`
        };
      }

      return {
        handled: true,

        message:
          `I couldn't find a saved memory related to "${target}".`
      };
    }

    return null;
  }


  /* =======================================================
     MEMORY — CONTEXT FOR AI
     ======================================================= */

  function getMindContext() {
    const memories =
      getMind();

    if (!memories.length) {
      return "No saved memories.";
    }

    return memories
      .map((memory, index) => {
        return `${index + 1}. [${memory.category}] ${memory.content}`;
      })
      .join("\n");
  }


  /* =======================================================
     RENDER MY MIND
     ======================================================= */

  function renderMind() {
    let container =
      $("#novaMind");

    /*
      Create My Mind panel if HTML doesn't have one.
    */

    if (!container) {
      container =
        document.createElement("section");

      container.id = "novaMind";
      container.className = "nova-mind-panel";

      const composer =
        $(".composer");

      if (composer) {
        composer.parentNode.insertBefore(
          container,
          composer.nextSibling
        );
      } else {
        document.body.appendChild(container);
      }
    }

    const memories =
      getMind();

    container.innerHTML = `
      <div class="nova-mind-header">
        <div>
          <div class="nova-mind-label">
            MY MIND
          </div>

          <h2>
            Your saved memories
          </h2>
        </div>

        <button
          type="button"
          class="nova-mind-clear"
          onclick="NOVA.clearMind()"
        >
          Clear
        </button>
      </div>

      <div class="nova-mind-tools">

        <input
          id="novaMindSearch"
          type="search"
          placeholder="Search your memories..."
          oninput="NOVA.renderMind()"
        />

        <div class="nova-memory-filters">

          <button
            type="button"
            class="nova-filter active"
            onclick="NOVA.setMemoryFilter('all')"
          >
            All
          </button>

          <button
            type="button"
            class="nova-filter"
            onclick="NOVA.setMemoryFilter('profile')"
          >
            Profile
          </button>

          <button
            type="button"
            class="nova-filter"
            onclick="NOVA.setMemoryFilter('goals')"
          >
            Goals
          </button>

          <button
            type="button"
            class="nova-filter"
            onclick="NOVA.setMemoryFilter('preferences')"
          >
            Preferences
          </button>

          <button
            type="button"
            class="nova-filter"
            onclick="NOVA.setMemoryFilter('routine')"
          >
            Routine
          </button>

        </div>
      </div>

      <div id="novaMemoryList">
        ${
          memories.length
            ? memories
                .map(memory => `
                  <div
                    class="nova-memory-card"
                    data-category="${escapeHTML(memory.category)}"
                  >

                    <div class="nova-memory-top">

                      <span class="nova-memory-category">
                        ${escapeHTML(memory.category)}
                      </span>

                      <span class="nova-memory-time">
                        ${formatMemoryDate(memory.time)}
                      </span>

                    </div>

                    <div class="nova-memory-content">
                      ${escapeHTML(memory.content)}
                    </div>

                    <div class="nova-memory-actions">

                      <button
                        type="button"
                        onclick="NOVA.editMind('${escapeHTML(memory.id)}')"
                      >
                        Edit
                      </button>

                      <button
                        type="button"
                        onclick="NOVA.deleteMind('${escapeHTML(memory.id)}')"
                      >
                        Delete
                      </button>

                    </div>

                  </div>
                `)
                .join("")
            : `
              <div class="nova-empty-mind">
                <div class="nova-empty-icon">
                  ◉
                </div>

                <strong>
                  Your Mind is empty
                </strong>

                <span>
                  Important things you choose to save
                  will appear here.
                </span>
              </div>
            `
        }
      </div>
    `;

    applyMindFilter();
  }


  function formatMemoryDate(time) {
    if (!time) return "";

    try {
      return new Date(time)
        .toLocaleDateString(
          undefined,
          {
            day: "numeric",
            month: "short",
            year: "numeric"
          }
        );
    } catch {
      return "";
    }
  }


  let memoryFilter = "all";

  function setMemoryFilter(filter) {
    memoryFilter = filter;
    renderMind();
  }


  function applyMindFilter() {
    const list =
      $("#novaMemoryList");

    if (!list) return;

    const search =
      normalize(
        $("#novaMindSearch")?.value || ""
      );

    const cards =
      list.querySelectorAll(
        ".nova-memory-card"
      );

    cards.forEach(card => {
      const category =
        card.dataset.category || "";

      const content =
        normalize(card.innerText);

      const categoryMatch =
        memoryFilter === "all" ||
        category === memoryFilter;

      const searchMatch =
        !search ||
        content.includes(search);

      card.style.display =
        categoryMatch && searchMatch
          ? ""
          : "none";
    });

    document
      .querySelectorAll(".nova-filter")
      .forEach(button => {
        button.classList.remove("active");
      });

    const buttons =
      document.querySelectorAll(
        ".nova-filter"
      );

    buttons.forEach(button => {
      if (
        normalize(button.innerText) ===
        memoryFilter
      ) {
        button.classList.add("active");
      }

      if (
        memoryFilter === "all" &&
        normalize(button.innerText) === "all"
      ) {
        button.classList.add("active");
      }
    });
  }


  /* =======================================================
     RENDER CHAT
     ======================================================= */

  function renderChat() {
    let container =
      $("#novaChat");

    if (!container) {
      container =
        document.createElement("section");

      container.id = "novaChat";
      container.className = "nova-chat-panel";

      const composer =
        $(".composer");

      if (composer) {
        composer.parentNode.insertBefore(
          container,
          composer
        );
      } else {
        document.body.prepend(container);
      }
    }

    const messages =
      getMessages();

    if (!messages.length) {
      container.innerHTML = "";
      return;
    }

    container.innerHTML = `
      <div class="nova-chat-header">
        <div>
          <div class="nova-chat-label">
            NOVA
          </div>
          <h2>
            Conversation
          </h2>
        </div>

        <button
          type="button"
          onclick="NOVA.clearChat()"
        >
          Clear
        </button>
      </div>

      <div class="nova-chat-messages">
        ${
          messages
            .map(message => `
              <div
                class="nova-message ${
                  message.role === "assistant"
                    ? "nova-assistant"
                    : "nova-user"
                }"
              >

                <div class="nova-message-role">
                  ${
                    message.role === "assistant"
                      ? "NOVA"
                      : "YOU"
                  }
                </div>

                <div class="nova-message-content">
                  ${formatAIText(message.content)}
                </div>

              </div>
            `)
            .join("")
        }
      </div>
    `;

    /*
      Keep newest message visible.
    */

    const messagesBox =
      container.querySelector(
        ".nova-chat-messages"
      );

    if (messagesBox) {
      messagesBox.scrollTop =
        messagesBox.scrollHeight;
    }
  }


  function formatAIText(text) {
    return escapeHTML(text)
      .replace(/\n/g, "<br>");
  }


  function clearChat() {
    const confirmed =
      window.confirm(
        "Clear NOVA conversation?"
      );

    if (!confirmed) {
      return;
    }

    localStorage.removeItem(
      MESSAGE_KEY
    );

    renderChat();

    showToast("Conversation cleared.");
  }


  /* =======================================================
     ASK NOVA — API
     ======================================================= */

  async function askAI(message) {
    const allMessages =
      getMessages();

    const history =
      allMessages
        .slice(-MAX_HISTORY_TO_AI)
        .map(item => ({
          role:
            item.role === "assistant"
              ? "assistant"
              : "user",

          content:
            String(item.content || "")
        }));

    const payload = {
      message: String(message),

      mode: currentMode,

      history,

      memory:
        getMindContext()
    };

    const response =
      await fetch(
        WORKER_URL,
        {
          method: "POST",

          headers: {
            "Content-Type":
              "application/json"
          },

          body:
            JSON.stringify(payload)
        }
      );

    if (!response.ok) {
      throw new Error(
        `Worker error: ${response.status}`
      );
    }

    const data =
      await response.json();

    if (
      data &&
      data.success === false
    ) {
      throw new Error(
        data.error ||
        "NOVA Worker returned an error."
      );
    }

    const answer =
      data?.answer ??
      data?.response ??
      data?.result?.response ??
      data?.result?.choices?.[0]?.message?.content ??
      data?.choices?.[0]?.message?.content;

    if (!answer) {
      throw new Error(
        "NOVA returned an empty answer."
      );
    }

    return String(answer);
  }


  /* =======================================================
     MAIN ASK FUNCTION
     ======================================================= */

  async function askNova() {
    const input =
      $("#prompt");

    if (!input) {
      return;
    }

    const text =
      input.value.trim();

    if (!text) {
      showToast(
        "Tell NOVA what you need."
      );
      return;
    }

    /*
      First check pending memory confirmation.
    */

    const confirmation =
      handleMemoryConfirmation(text);

    if (confirmation) {
      addMessage(
        "user",
        text
      );

      addMessage(
        "assistant",
        confirmation.message
      );

      input.value = "";

      autoResize(input);

      renderChat();
      renderMind();

      showToast(
        confirmation.type === "saved"
          ? "Memory saved."
          : "Memory not saved."
      );

      return;
    }


    /*
      Forget commands.
    */

    const forget =
      processForgetCommand(text);

    if (forget?.handled) {
      addMessage(
        "user",
        text
      );

      addMessage(
        "assistant",
        forget.message
      );

      input.value = "";

      autoResize(input);

      renderChat();
      renderMind();

      return;
    }


    /*
      Smart memory detection.
    */

    const smartMemory =
      handleSmartMemory(text);

    /*
      Explicit memory:
      save immediately and continue to AI,
      so NOVA can still respond naturally.
    */

    if (
      smartMemory?.type === "saved"
    ) {
      addMessage(
        "user",
        text
      );

      addMessage(
        "assistant",
        smartMemory.message
      );

      input.value = "";

      autoResize(input);

      renderChat();
      renderMind();

      showToast("Memory saved.");

      return;
    }


    /*
      Automatic memory:
      ask for confirmation BEFORE sending
      to AI.
    */

    if (
      smartMemory?.type === "pending"
    ) {
      addMessage(
        "user",
        text
      );

      addMessage(
        "assistant",
        smartMemory.message
      );

      input.value = "";

      autoResize(input);

      renderChat();
      renderMind();

      showToast(
        "Memory confirmation needed."
      );

      return;
    }


    /*
      Normal AI request.
    */

    addMessage(
      "user",
      text
    );

    input.value = "";

    autoResize(input);

    renderChat();

    const status =
      $("#status");

    if (status) {
      status.innerText =
        "NOVA is thinking...";
    }

    showToast(
      "NOVA is thinking..."
    );

    try {
      const answer =
        await askAI(text);

      addMessage(
        "assistant",
        answer
      );

      renderChat();
      renderMind();

      if (status) {
        status.innerText =
          `${currentMode} mode • NOVA is ready.`;
      }

    } catch (error) {
      console.error(
        "NOVA ERROR:",
        error
      );

      const errorMessage =
        "I couldn't connect to my AI brain right now. Please try again.";

      addMessage(
        "assistant",
        errorMessage
      );

      renderChat();

      if (status) {
        status.innerText =
          "Connection problem. Try again.";
      }

      showToast(
        "NOVA connection problem."
      );
    }
  }

  window.askNova = askNova;


  /* =======================================================
     QUICK ACTIONS
     ======================================================= */

  function quickAction(text) {
    const input =
      $("#prompt");

    if (!input) return;

    input.value = text;

    input.focus();

    autoResize(input);

    showToast(
      "Ready to send"
    );
  }

  window.quickAction =
    quickAction;


  /* =======================================================
     VOICE INPUT
     ======================================================= */

  function startVoice() {
    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      showToast(
        "Voice input isn't supported here."
      );
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang =
      "bn-BD";

    recognition.interimResults =
      false;

    recognition.continuous =
      false;

    const status =
      $("#status");

    if (status) {
      status.innerText =
        "NOVA is listening...";
    }

    showToast(
      "NOVA is listening..."
    );

    recognition.onresult =
      function(event) {
        const text =
          event.results?.[0]?.[0]
            ?.transcript || "";

        const input =
          $("#prompt");

        if (!input) return;

        input.value = text;

        autoResize(input);

        if (status) {
          status.innerText =
            "Got it. Press Ask NOVA.";
        }

        showToast(
          "Voice captured."
        );
      };

    recognition.onerror =
      function() {
        if (status) {
          status.innerText =
            "Voice input stopped.";
        }

        showToast(
          "Voice input stopped."
        );
      };

    recognition.onend =
      function() {
        if (
          status &&
          status.innerText ===
          "NOVA is listening..."
        ) {
          status.innerText =
            `${currentMode} mode • NOVA is ready.`;
        }
      };

    try {
      recognition.start();
    } catch (error) {
      console.warn(
        "Voice start error:",
        error
      );
    }
  }

  window.startVoice =
    startVoice;


  /* =======================================================
     TEXTAREA AUTO RESIZE
     ======================================================= */

  function autoResize(element) {
    if (!element) return;

    element.style.height =
      "auto";

    element.style.height =
      Math.min(
        element.scrollHeight,
        180
      ) + "px";
  }

  window.autoResize =
    autoResize;


  /* =======================================================
     ENTER TO SEND
     ======================================================= */

  document.addEventListener(
    "keydown",
    event => {
      const target =
        event.target;

      if (
        target &&
        target.id === "prompt" &&
        event.key === "Enter" &&
        !event.shiftKey
      ) {
        event.preventDefault();

        askNova();
      }
    }
  );


  /* =======================================================
     TASK SYSTEM
     ======================================================= */

  function saveTasks() {
    const tasks = {};

    [
      "task1",
      "task2",
      "task3"
    ].forEach(id => {
      const task =
        document.getElementById(id);

      if (task) {
        tasks[id] =
          task.classList.contains(
            "done"
          );
      }
    });

    localStorage.setItem(
      "nova_tasks",
      JSON.stringify(tasks)
    );
  }

  window.saveTasks =
    saveTasks;


  function loadTasks() {
    try {
      const saved =
        localStorage.getItem(
          "nova_tasks"
        );

      if (!saved) return;

      const tasks =
        JSON.parse(saved);

      Object.keys(tasks)
        .forEach(id => {
          const task =
            document.getElementById(id);

          if (
            task &&
            tasks[id]
          ) {
            task.classList.add(
              "done"
            );
          }
        });
    } catch {
      console.warn(
        "Could not load tasks."
      );
    }
  }


  function toggleTask(id) {
    const task =
      document.getElementById(id);

    if (!task) return;

    task.classList.toggle(
      "done"
    );

    saveTasks();

    if (
      task.classList.contains("done")
    ) {
      showToast(
        "Nice. Task completed."
      );
    } else {
      showToast(
        "Task reopened."
      );
    }
  }

  window.toggleTask =
    toggleTask;


  /* =======================================================
     NAVIGATION
     ======================================================= */

  function navClick(name) {
    if (name === "Mind") {
      const mind =
        $("#novaMind");

      if (mind) {
        mind.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });

        return;
      }
    }

    if (name === "Home") {
      window.scrollTo({
        top: 0,
        behavior: "smooth"
      });

      return;
    }

    showToast(
      `${name} will open here.`
    );
  }

  window.navClick =
    navClick;


  /* =======================================================
     GLOBAL NOVA OBJECT
     ======================================================= */

  window.NOVA = {

    getMind,

    saveMind,

    deleteMind,

    editMind,

    clearMind,

    renderMind,

    renderChat,

    clearChat,

    getMindContext,

    detectMemory,

    detectCategory,

    isSensitiveMemory,

    handleSmartMemory,

    handleMemoryConfirmation,

    processForgetCommand,

    setMemoryFilter,

    askAI
  };


  /* =======================================================
     STARTUP
     ======================================================= */

  function bootNOVA() {
    setMode(currentMode);

    loadTasks();

    renderChat();

    renderMind();

    const status =
      $("#status");

    if (status) {
      status.innerText =
        `${currentMode} mode • NOVA is ready.`;
    }

    console.log(
      "NOVA — Your Second Mind: ONLINE"
    );
  }


  /*
    Wait until DOM is ready.
  */

  if (
    document.readyState ===
    "loading"
  ) {
    document.addEventListener(
      "DOMContentLoaded",
      bootNOVA
    );
  } else {
    bootNOVA();
  }

})();
