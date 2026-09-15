/* =========================================================
   NOVA — YOUR SECOND MIND
   FINAL CONNECTION + MEMORY ENGINE
   ========================================================= */

(() => {
  "use strict";

  const WORKER_URL =
    "https://nova-ai-brain.aniksar028.workers.dev/api/chat";

  const MIND_KEY = "nova_mind";
  const MESSAGE_KEY = "nova_messages";
  const MODE_KEY = "nova_mode";
  const TASK_KEY = "nova_tasks";
  const PENDING_KEY = "nova_pending_memory";

  let novaMode =
    localStorage.getItem(MODE_KEY) || "ASK";

  let messages =
    JSON.parse(localStorage.getItem(MESSAGE_KEY) || "[]");

  let mind =
    JSON.parse(localStorage.getItem(MIND_KEY) || "[]");

  let pendingMemory =
    JSON.parse(localStorage.getItem(PENDING_KEY) || "null");

  /* =========================================================
     BASIC HELPERS
     ========================================================= */

  function saveAll() {
    localStorage.setItem(MIND_KEY, JSON.stringify(mind));
    localStorage.setItem(MESSAGE_KEY, JSON.stringify(messages));
    localStorage.setItem(MODE_KEY, novaMode);
    localStorage.setItem(PENDING_KEY, JSON.stringify(pendingMemory));
  }

  function toast(text) {
    const el = document.getElementById("toast");

    if (!el) return;

    el.innerText = text;
    el.classList.add("show");

    clearTimeout(window.__novaToastTimer);

    window.__novaToastTimer = setTimeout(() => {
      el.classList.remove("show");
    }, 2200);
  }

  function status(text) {
    const el = document.getElementById("status");
    if (el) el.innerText = text;
  }

  function escapeHTML(text) {
    return String(text)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#039;");
  }

  /* =========================================================
     MODE
     ========================================================= */

  function novaSetMode(mode) {
    novaMode = mode;
    localStorage.setItem(MODE_KEY, mode);

    document
      .querySelectorAll(".mode")
      .forEach(btn => btn.classList.remove("active"));

    if (mode === "ASK") {
      document.getElementById("askMode")?.classList.add("active");
    }

    if (mode === "LEARN") {
      document.getElementById("learnMode")?.classList.add("active");
    }

    if (mode === "DO") {
      document.getElementById("doMode")?.classList.add("active");
    }

    status(mode + " mode • NOVA is ready.");
    toast(mode + " mode selected");
  }

  /* =========================================================
     TEXTAREA
     ========================================================= */

  function novaAutoResize(element) {
    if (!element) return;

    element.style.height = "auto";

    element.style.height =
      Math.min(element.scrollHeight, 180) + "px";
  }

  /* =========================================================
     MEMORY
     ========================================================= */

  const sensitivePatterns = [
    /password/i,
    /passcode/i,
    /otp/i,
    /one time password/i,
    /verification code/i,
    /credit card/i,
    /debit card/i,
    /cvv/i,
    /pin number/i,
    /bank account/i,
    /nid number/i,
    /national id/i
  ];

  function isSensitive(text) {
    return sensitivePatterns.some(pattern =>
      pattern.test(text)
    );
  }

  function getMemoryContext() {
    if (!mind.length) {
      return "No saved memories.";
    }

    return mind
      .map((item, index) =>
        `${index + 1}. [${item.category}] ${item.text}`
      )
      .join("\n");
  }

  function renderMind() {
    let panel = document.getElementById("novaMindPanel");

    if (!panel) {
      panel = document.createElement("section");
      panel.id = "novaMindPanel";
      panel.className = "section";

      const app =
        document.querySelector(".app");

      if (app) {
        app.appendChild(panel);
      }
    }

    if (!panel) return;

    panel.innerHTML = `
      <div class="section-title">My Mind</div>

      <div style="
        background:#111416;
        border:1px solid rgba(255,255,255,.08);
        border-radius:18px;
        padding:16px;
      ">
        ${
          mind.length
            ? mind.map((item, index) => `
                <div style="
                  padding:12px 0;
                  border-bottom:${
                    index === mind.length - 1
                      ? "none"
                      : "1px solid rgba(255,255,255,.06)"
                  };
                ">
                  <div style="
                    font-size:10px;
                    color:#C8FF4A;
                    letter-spacing:1px;
                    text-transform:uppercase;
                    margin-bottom:5px;
                  ">
                    ${escapeHTML(item.category)}
                  </div>

                  <div style="
                    color:#F3F5F2;
                    font-size:14px;
                    line-height:1.5;
                  ">
                    ${escapeHTML(item.text)}
                  </div>
                </div>
              `).join("")
            : `
              <div style="
                color:#89918D;
                font-size:14px;
                line-height:1.5;
              ">
                Nothing saved yet.
              </div>
            `
        }
      </div>
    `;

    panel.style.display = "none";
  }

  function saveMemory(text, category = "other") {
    text = String(text || "").trim();

    if (!text || isSensitive(text)) {
      return false;
    }

    const exists = mind.some(
      item =>
        item.text.toLowerCase() === text.toLowerCase()
    );

    if (exists) return false;

    mind.push({
      text,
      category,
      savedAt: new Date().toISOString()
    });

    saveAll();
    renderMind();

    return true;
  }

  function forgetMemory(text) {
    const before = mind.length;

    mind = mind.filter(
      item =>
        !item.text
          .toLowerCase()
          .includes(String(text).toLowerCase())
    );

    saveAll();
    renderMind();

    return mind.length < before;
  }

  function detectMemoryCategory(text) {
    const t = text.toLowerCase();

    if (
      t.includes("my name") ||
      t.includes("i am") ||
      t.includes("i'm")
    ) {
      return "profile";
    }

    if (
      t.includes("goal") ||
      t.includes("want to") ||
      t.includes("dream")
    ) {
      return "goals";
    }

    if (
      t.includes("prefer") ||
      t.includes("like") ||
      t.includes("don't like")
    ) {
      return "preferences";
    }

    if (
      t.includes("routine") ||
      t.includes("schedule")
    ) {
      return "routine";
    }

    return "other";
  }

  function checkMemoryRequest(text) {
    const t = text.toLowerCase();

    const explicit =
      t.includes("remember this") ||
      t.includes("remember that") ||
      t.includes("save this") ||
      t.includes("save that") ||
      t.includes("keep this in mind");

    if (explicit) {
      const cleaned = text
        .replace(/remember this/gi, "")
        .replace(/remember that/gi, "")
        .replace(/save this/gi, "")
        .replace(/save that/gi, "")
        .replace(/keep this in mind/gi, "")
        .trim();

      if (cleaned && !isSensitive(cleaned)) {
        saveMemory(
          cleaned,
          detectMemoryCategory(cleaned)
        );

        return true;
      }
    }

    return false;
  }

  function checkForgetRequest(text) {
    const t = text.toLowerCase();

    if (
      !t.includes("forget") &&
      !t.includes("remove from memory")
    ) {
      return false;
    }

    const cleaned = text
      .replace(/forget/gi, "")
      .replace(/remove from memory/gi, "")
      .trim();

    if (cleaned) {
      if (forgetMemory(cleaned)) {
        toast("Memory removed");
      } else {
        toast("I couldn't find that memory");
      }
    } else {
      toast("Tell me what to forget.");
    }

    return true;
  }

  function detectPossibleMemory(text) {
    if (!text || isSensitive(text)) return null;

    const t = text.toLowerCase();

    const possible =
      t.includes("my name is") ||
      t.includes("i am") ||
      t.includes("i'm") ||
      t.includes("i want") ||
      t.includes("my goal") ||
      t.includes("i prefer") ||
      t.includes("i like");

    if (!possible) return null;

    const alreadySaved = mind.some(
      item =>
        item.text.toLowerCase() ===
        text.toLowerCase()
    );

    if (alreadySaved) return null;

    return {
      text,
      category: detectMemoryCategory(text)
    };
  }

  /* =========================================================
     CHAT UI
     ========================================================= */

  function ensureChatPanel() {
    let panel =
      document.getElementById("novaChatPanel");

    if (panel) return panel;

    panel = document.createElement("section");

    panel.id = "novaChatPanel";
    panel.className = "section";

    panel.innerHTML = `
      <div class="section-title">Conversation</div>

      <div id="novaChatMessages" style="
        display:flex;
        flex-direction:column;
        gap:10px;
      "></div>
    `;

    const composer =
      document.querySelector(".composer");

    if (composer) {
      composer.after(panel);
    } else {
      document.querySelector(".app")?.appendChild(panel);
    }

    return panel;
  }

  function renderChat() {
    const panel = ensureChatPanel();

    const box =
      panel.querySelector("#novaChatMessages");

    if (!box) return;

    if (!messages.length) {
      box.innerHTML = "";
      return;
    }

    box.innerHTML = messages
      .slice(-30)
      .map(item => `
        <div style="
          background:${
            item.role === "user"
              ? "rgba(200,255,74,.08)"
              : "#111416"
          };
          border:1px solid rgba(255,255,255,.07);
          border-radius:16px;
          padding:13px 15px;
          color:#F3F5F2;
          font-size:14px;
          line-height:1.55;
        ">
          <div style="
            font-size:10px;
            color:${
              item.role === "user"
                ? "#C8FF4A"
                : "#89918D"
            };
            margin-bottom:5px;
            letter-spacing:1px;
          ">
            ${
              item.role === "user"
                ? "YOU"
                : "NOVA"
            }
          </div>

          ${escapeHTML(item.content)
            .replace(/\n/g, "<br>")}
        </div>
      `)
      .join("");

    panel.style.display = "block";
  }

  function addMessage(role, content) {
    messages.push({
      role,
      content: String(content),
      time: Date.now()
    });

    messages = messages.slice(-40);

    localStorage.setItem(
      MESSAGE_KEY,
      JSON.stringify(messages)
    );

    renderChat();
  }

  /* =========================================================
     AI CONNECTION
     ========================================================= */

  async function askAI(message) {

    const history = messages
      .slice(-12)
      .map(item => ({
        role:
          item.role === "assistant"
            ? "assistant"
            : "user",
        content: String(item.content || "")
      }));

    const payload = {
      message: String(message),
      mode: novaMode,
      history,
      memory: getMemoryContext()
    };

    const controller =
      new AbortController();

    const timeout =
      setTimeout(() => {
        controller.abort();
      }, 30000);

    try {

      /*
        IMPORTANT:
        text/plain avoids browser CORS preflight issues
        on some static hosting environments.
      */

      const response = await fetch(
        WORKER_URL,
        {
          method: "POST",
          mode: "cors",

          headers: {
            "Content-Type":
              "text/plain;charset=UTF-8",
            "Accept": "application/json"
          },

          body: JSON.stringify(payload),

          signal: controller.signal
        }
      );

      const raw =
        await response.text();

      if (!response.ok) {
        throw new Error(
          `HTTP ${response.status}: ${raw}`
        );
      }

      let data;

      try {
        data = JSON.parse(raw);
      } catch {
        throw new Error(
          "Worker returned invalid JSON."
        );
      }

      if (data.success === false) {
        throw new Error(
          data.error || "AI request failed."
        );
      }

      const answer =
        data.answer ||
        data.response ||
        data.result?.response ||
        data.result?.choices?.[0]?.message?.content ||
        data.choices?.[0]?.message?.content;

      if (!answer) {
        throw new Error(
          "AI returned no answer."
        );
      }

      return String(answer);

    } finally {
      clearTimeout(timeout);
    }
  }

  /* =========================================================
     MAIN ASK NOVA
     ========================================================= */

  async function novaAskNova() {

    const input =
      document.getElementById("prompt");

    if (!input) return;

    const text =
      input.value.trim();

    if (!text) {
      toast("Tell NOVA what you need.");
      return;
    }

    /* Pending memory confirmation */

    if (pendingMemory) {

      const lower =
        text.toLowerCase();

      const yes =
        /^(yes|yeah|yep|sure|ok|okay|save it|remember it|হ্যাঁ|জি|ঠিক আছে|সেভ করো)$/i
          .test(lower);

      const no =
        /^(no|nope|don't|cancel|না|বাদ দাও)$/i
          .test(lower);

      if (yes) {

        saveMemory(
          pendingMemory.text,
          pendingMemory.category
        );

        pendingMemory = null;
        saveAll();

        input.value = "";

        toast("Saved to My Mind");

        status("Memory saved.");
        renderMind();

        return;
      }

      if (no) {

        pendingMemory = null;
        saveAll();

        input.value = "";

        toast("Okay, I won't save it.");

        status("Memory not saved.");

        return;
      }

      pendingMemory = null;
      saveAll();
    }

    /* Explicit forget */

    if (checkForgetRequest(text)) {
      input.value = "";
      novaAutoResize(input);
      return;
    }

    /* Explicit save */

    if (checkMemoryRequest(text)) {

      addMessage("user", text);

      input.value = "";
      novaAutoResize(input);

      status("Saved to My Mind.");
      toast("Memory saved");

      return;
    }

    /* Possible automatic memory */

    const possibleMemory =
      detectPossibleMemory(text);

    if (possibleMemory) {

      pendingMemory = possibleMemory;

      saveAll();

      addMessage("user", text);

      input.value = "";
      novaAutoResize(input);

      status(
        "Should I remember this?"
      );

      toast(
        "Reply YES to save or NO to skip"
      );

      return;
    }

    /* Normal AI request */

    addMessage("user", text);

    input.value = "";
    novaAutoResize(input);

    status("NOVA is thinking...");
    toast("Thinking...");

    try {

      const answer =
        await askAI(text);

      addMessage(
        "assistant",
        answer
      );

      status(
        novaMode +
        " mode • NOVA is ready."
      );

    } catch (error) {

      console.error(
        "NOVA CONNECTION ERROR:",
        error
      );

      status(
        "NOVA could not connect."
      );

      toast(
        "NOVA could not connect"
      );

      /*
        Keep the actual error available
        for debugging without changing UI.
      */

      window.NOVA_LAST_ERROR =
        error?.message || String(error);
    }
  }

  /* =========================================================
     VOICE
     ========================================================= */

  function novaStartVoice() {

    const SpeechRecognition =
      window.SpeechRecognition ||
      window.webkitSpeechRecognition;

    if (!SpeechRecognition) {
      toast(
        "Voice input isn't supported here."
      );
      return;
    }

    const recognition =
      new SpeechRecognition();

    recognition.lang = "bn-BD";
    recognition.interimResults = false;
    recognition.continuous = false;

    status("NOVA is listening...");

    recognition.onresult =
      function(event) {

        const text =
          event.results?.[0]?.[0]?.transcript || "";

        const input =
          document.getElementById("prompt");

        if (!input) return;

        input.value = text;

        novaAutoResize(input);

        status(
          "Got it. Press Ask NOVA."
        );
      };

    recognition.onerror =
      function() {
        toast("Voice input stopped.");
        status("NOVA is ready.");
      };

    try {
      recognition.start();
    } catch (error) {
      console.error(error);
    }
  }

  /* =========================================================
     QUICK ACTION
     ========================================================= */

  function novaQuickAction(text) {

    const input =
      document.getElementById("prompt");

    if (!input) return;

    input.value = text;

    input.focus();

    novaAutoResize(input);

    toast("Ready to send");
  }

  /* =========================================================
     TASKS
     ========================================================= */

  function novaSaveTasks() {

    const tasks = {};

    ["task1", "task2", "task3"]
      .forEach(id => {

        const task =
          document.getElementById(id);

        if (task) {
          tasks[id] =
            task.classList.contains("done");
        }
      });

    localStorage.setItem(
      TASK_KEY,
      JSON.stringify(tasks)
    );
  }

  function novaLoadTasks() {

    const saved =
      localStorage.getItem(TASK_KEY);

    if (!saved) return;

    try {

      const tasks =
        JSON.parse(saved);

      Object.keys(tasks)
        .forEach(id => {

          const el =
            document.getElementById(id);

          if (
            el &&
            tasks[id]
          ) {
            el.classList.add("done");
          }
        });

    } catch (error) {
      console.error(error);
    }
  }

  function novaToggleTask(id) {

    const task =
      document.getElementById(id);

    if (!task) return;

    task.classList.toggle("done");

    novaSaveTasks();

    if (task.classList.contains("done")) {
      toast("Nice. Task completed.");
    } else {
      toast("Task reopened.");
    }
  }

  /* =========================================================
     NAV
     ========================================================= */

  function novaNavClick(name) {

    if (name === "Mind") {

      const panel =
        document.getElementById(
          "novaMindPanel"
        );

      if (panel) {

        panel.style.display =
          panel.style.display === "none"
            ? "block"
            : "none";

        panel.scrollIntoView({
          behavior: "smooth",
          block: "start"
        });
      }

      return;
    }

    toast(
      name + " will open here."
    );
  }

  /* =========================================================
     KEYBOARD
     ========================================================= */

  function keyboardHandler(event) {

    if (
      event.key === "Enter" &&
      !event.shiftKey
    ) {

      const target =
        event.target;

      if (
        target &&
        target.id === "prompt"
      ) {

        event.preventDefault();

        novaAskNova();
      }
    }
  }

  /* =========================================================
     IMPORTANT:
     INLINE FUNCTIONS IN index.html CAN OVERRIDE app.js.
     
     So after the page finishes loading,
     we deliberately expose the FINAL versions.
     ========================================================= */

  function exposeNOVA() {

    window.askNova =
      novaAskNova;

    window.setMode =
      novaSetMode;

    window.startVoice =
      novaStartVoice;

    window.quickAction =
      novaQuickAction;

    window.toggleTask =
      novaToggleTask;

    window.saveTasks =
      novaSaveTasks;

    window.loadTasks =
      novaLoadTasks;

    window.autoResize =
      novaAutoResize;

    window.navClick =
      novaNavClick;

    window.showToast =
      toast;

    window.NOVA = {

      ask: novaAskNova,

      askAI,

      setMode: novaSetMode,

      saveMemory,

      forgetMemory,

      getMemoryContext,

      getMind: () =>
        JSON.parse(
          JSON.stringify(mind)
        ),

      getMessages: () =>
        JSON.parse(
          JSON.stringify(messages)
        )
    };
  }

  /* =========================================================
     BOOT
     ========================================================= */

  function bootNOVA() {

    /*
      Wait until inline <script> in index.html
      has finished executing.
    */

    exposeNOVA();

    novaLoadTasks();

    renderMind();

    renderChat();

    novaSetMode(novaMode);

    const input =
      document.getElementById("prompt");

    if (input) {
      novaAutoResize(input);
    }

    document.addEventListener(
      "keydown",
      keyboardHandler
    );

    status(
      novaMode +
      " mode • NOVA is ready."
    );

    console.log(
      "NOVA FINAL ENGINE READY"
    );
  }

  if (
    document.readyState ===
    "loading"
  ) {

    document.addEventListener(
      "DOMContentLoaded",
      bootNOVA,
      { once: true }
    );

  } else {

    bootNOVA();
  }

})();
