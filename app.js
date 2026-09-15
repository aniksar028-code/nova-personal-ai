const NOVA = {

  mode: localStorage.getItem("nova_mode") || "ASK",

  getMode() {
    return this.mode;
  },

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("nova_mode", mode);
  },


  // =====================================
  // CONVERSATION MEMORY
  // =====================================

  getMessages() {
    try {
      return JSON.parse(
        localStorage.getItem("nova_messages") || "[]"
      );
    } catch {
      return [];
    }
  },

  saveMessage(role, content) {
    const messages = this.getMessages();

    messages.push({
      role,
      content,
      time: Date.now()
    });

    localStorage.setItem(
      "nova_messages",
      JSON.stringify(messages.slice(-40))
    );
  },

  clearConversation() {
    localStorage.removeItem("nova_messages");
    this.renderChat();

    if (typeof showToast === "function") {
      showToast("Conversation cleared.");
    }
  },


  // =====================================
  // MY MIND 2.0
  // =====================================

  categories: {
    profile: "Profile",
    goals: "Goals",
    preferences: "Preferences",
    routine: "Routine",
    other: "Other"
  },


  getMind() {
    try {
      return JSON.parse(
        localStorage.getItem("nova_mind") || "[]"
      );
    } catch {
      return [];
    }
  },


  saveMind(content, category = "other") {

    const text = String(content || "").trim();

    if (!text) return false;

    const memories = this.getMind();

    const normalized =
      text.toLowerCase().replace(/\s+/g, " ");


    const duplicate = memories.some(item =>
      String(item.content)
        .toLowerCase()
        .replace(/\s+/g, " ") === normalized
    );


    if (duplicate) {
      return false;
    }


    memories.push({
      id: Date.now() + Math.random(),
      content: text,
      category: this.categories[category]
        ? category
        : "other",
      time: Date.now()
    });


    localStorage.setItem(
      "nova_mind",
      JSON.stringify(memories.slice(-100))
    );


    this.renderMind();

    return true;
  },


  updateMind(id, content, category) {

    const text =
      String(content || "").trim();

    if (!text) return;

    const memories = this.getMind();

    const index =
      memories.findIndex(
        item => item.id === id
      );

    if (index === -1) return;


    memories[index].content = text;

    if (this.categories[category]) {
      memories[index].category = category;
    }


    memories[index].time = Date.now();


    localStorage.setItem(
      "nova_mind",
      JSON.stringify(memories)
    );


    this.renderMind();


    if (typeof showToast === "function") {
      showToast("Memory updated.");
    }
  },


  deleteMind(id) {

    const memories = this.getMind();

    const updated =
      memories.filter(
        item => item.id !== id
      );


    localStorage.setItem(
      "nova_mind",
      JSON.stringify(updated)
    );


    this.renderMind();


    if (typeof showToast === "function") {
      showToast("Memory removed.");
    }
  },


  clearMind() {

    const confirmed =
      confirm(
        "Clear all NOVA memories?"
      );


    if (!confirmed) return;


    localStorage.removeItem(
      "nova_mind"
    );


    this.renderMind();


    if (typeof showToast === "function") {
      showToast("My Mind cleared.");
    }
  },


  // =====================================
  // MEMORY SEARCH
  // =====================================

  searchMind(query) {

    const memories = this.getMind();

    const text =
      String(query || "")
        .toLowerCase()
        .trim();


    if (!text) {
      return memories;
    }


    return memories.filter(item =>
      String(item.content)
        .toLowerCase()
        .includes(text)
      ||
      String(item.category)
        .toLowerCase()
        .includes(text)
    );
  },


  // =====================================
  // MEMORY CONTEXT FOR AI
  // =====================================

  getMindContext() {

    const memories = this.getMind();

    if (!memories.length) {
      return "No saved personal memories.";
    }


    return memories
      .map((item, index) => {

        const category =
          this.categories[item.category]
          || "Other";

        return (
          `${index + 1}. ` +
          `[${category}] ` +
          item.content
        );

      })
      .join("\n");
  },


  // =====================================
  // AUTOMATIC MEMORY DETECTION
  // =====================================

  detectMemory(message) {

    const text =
      String(message || "").trim();

    const lower =
      text.toLowerCase();


    if (!text) return null;


    // Explicit memory commands

    const explicit =
      [
        "remember this",
        "remember that",
        "remember my",
        "remember i",
        "remember i'm",
        "save this",
        "save that",
        "don't forget",
        "dont forget",
        "keep this in mind"
      ].some(trigger =>
        lower.includes(trigger)
      );


    if (explicit) {

      const cleaned =
        text
          .replace(/remember this/gi, "")
          .replace(/remember that/gi, "")
          .replace(/remember my/gi, "My ")
          .replace(/remember i'm/gi, "I'm ")
          .replace(/remember i/gi, "I ")
          .replace(/save this/gi, "")
          .replace(/save that/gi, "")
          .replace(/don't forget/gi, "")
          .replace(/dont forget/gi, "")
          .replace(/keep this in mind/gi, "")
          .trim();


      return {
        content: cleaned || text,
        category: this.detectCategory(text)
      };
    }


    // Automatic important personal information

    const automaticPatterns = [

      /\bmy name is\b/i,
      /\bmy birthday is\b/i,
      /\bmy dob is\b/i,
      /\bmy date of birth is\b/i,
      /\bi was born\b/i,
      /\bmy goal is\b/i,
      /\bmy goal\b/i,
      /\bi want to\b/i,
      /\bi like\b/i,
      /\bi love\b/i,
      /\bi prefer\b/i,
      /\bi don't like\b/i,
      /\bi dont like\b/i,
      /\bmy routine\b/i,
      /\bi study\b/i,
      /\bi work\b/i
    ];


    const matched =
      automaticPatterns.some(
        pattern => pattern.test(text)
      );


    if (!matched) {
      return null;
    }


    return {
      content: text,
      category: this.detectCategory(text)
    };
  },


  detectCategory(text) {

    const lower =
      String(text || "")
        .toLowerCase();


    if (
      lower.includes("name") ||
      lower.includes("birthday") ||
      lower.includes("dob") ||
      lower.includes("date of birth") ||
      lower.includes("born") ||
      lower.includes("age") ||
      lower.includes("study") ||
      lower.includes("work")
    ) {
      return "profile";
    }


    if (
      lower.includes("goal") ||
      lower.includes("want to") ||
      lower.includes("target") ||
      lower.includes("dream")
    ) {
      return "goals";
    }


    if (
      lower.includes("like") ||
      lower.includes("love") ||
      lower.includes("prefer") ||
      lower.includes("don't like") ||
      lower.includes("dont like")
    ) {
      return "preferences";
    }


    if (
      lower.includes("routine") ||
      lower.includes("sleep") ||
      lower.includes("wake") ||
      lower.includes("exercise") ||
      lower.includes("diet")
    ) {
      return "routine";
    }


    return "other";
  },


  // =====================================
  // FORGET COMMAND
  // =====================================

  processForgetCommand(message) {

    const text =
      String(message || "").trim();

    const lower =
      text.toLowerCase();


    if (
      lower === "forget everything about me" ||
      lower === "forget everything" ||
      lower === "clear all my memories"
    ) {

      this.clearMind();

      return true;
    }


    if (
      lower.startsWith("forget my ")
    ) {

      const target =
        lower
          .replace("forget my ", "")
          .trim();


      const memories =
        this.getMind();


      const updated =
        memories.filter(item =>
          !String(item.content)
            .toLowerCase()
            .includes(target)
        );


      localStorage.setItem(
        "nova_mind",
        JSON.stringify(updated)
      );


      this.renderMind();


      return true;
    }


    if (
      lower.startsWith("forget ")
    ) {

      const target =
        lower
          .replace("forget ", "")
          .trim();


      if (target) {

        const memories =
          this.getMind();


        const updated =
          memories.filter(item =>
            !String(item.content)
              .toLowerCase()
              .includes(target)
          );


        localStorage.setItem(
          "nova_mind",
          JSON.stringify(updated)
        );


        this.renderMind();

        return true;
      }
    }


    return false;
  },


  // =====================================
  // ASK NOVA
  // =====================================

  async ask(message) {

    if (
      !message ||
      !message.trim()
    ) {

      return {
        success: false,
        message:
          "Tell NOVA what you need."
      };
    }


    // Forget command first

    const forgot =
      this.processForgetCommand(
        message
      );


    if (forgot) {

      this.saveMessage(
        "user",
        message
      );


      const answer =
        "Done. I've updated your My Mind memories.";


      this.saveMessage(
        "assistant",
        answer
      );


      return {
        success: true,
        message: answer
      };
    }


    // Conversation history

    const history =
      this.getMessages()
        .slice(-12)
        .map(item => ({
          role: item.role,
          content: item.content
        }));


    // Detect memory

    const memory =
      this.detectMemory(message);


    if (memory) {

      this.saveMind(
        memory.content,
        memory.category
      );
    }


    // Save user message

    this.saveMessage(
      "user",
      message
    );


    try {

      const response =
        await fetch(
          "https://nova-ai-brain.aniksar028.workers.dev/api/chat",
          {
            method: "POST",

            headers: {
              "Content-Type":
                "application/json"
            },

            body: JSON.stringify({

              message: message,

              mode:
                this.getMode(),

              history:
                history,

              memory:
                this.getMindContext()

            })
          }
        );


      const data =
        await response.json();


      if (
        !response.ok ||
        !data.success
      ) {

        return {
          success: false,
          message:
            data.error ||
            "NOVA AI request failed."
        };
      }


      this.saveMessage(
        "assistant",
        data.answer
      );


      return {
        success: true,
        message:
          data.answer
      };


    } catch (error) {

      console.error(
        "NOVA connection error:",
        error
      );


      return {
        success: false,
        message:
          "NOVA could not connect to its AI brain."
      };
    }
  },


  // =====================================
  // CREATE UI
  // =====================================

  createChatUI() {

    if (
      document.getElementById(
        "novaChat"
      )
    ) {
      return;
    }


    const style =
      document.createElement("style");


    style.innerHTML = `

      #novaChat {
        margin: 28px 0 0;
        display: flex;
        flex-direction: column;
        gap: 10px;
      }

      .nova-chat-title {
        color: #89918D;
        font-size: 10px;
        font-weight: 800;
        letter-spacing: 1.8px;
        text-transform: uppercase;
      }

      .nova-message {
        max-width: 88%;
        padding: 13px 15px;
        border-radius: 17px;
        font-size: 14px;
        line-height: 1.55;
        white-space: pre-wrap;
        word-break: break-word;
      }

      .nova-user {
        align-self: flex-end;
        background: #C8FF4A;
        color: #090B0C;
        border-bottom-right-radius: 5px;
      }

      .nova-ai {
        align-self: flex-start;
        background: #111416;
        color: #F3F5F2;
        border: 1px solid rgba(255,255,255,.08);
        border-bottom-left-radius: 5px;
      }

      .nova-thinking {
        opacity: .55;
        font-style: italic;
      }

      .nova-memory-bar {
        display: flex;
        justify-content: space-between;
        align-items: center;
        margin-top: 8px;
      }

      .nova-memory-label {
        color: #69716D;
        font-size: 9px;
      }

      .nova-clear-btn {
        border: 0;
        background: transparent;
        color: #69716D;
        font-size: 9px;
        padding: 4px 0;
      }

      #novaMind {
        margin-top: 26px;
        padding: 17px;
        border-radius: 20px;
        background: #111416;
        border: 1px solid rgba(255,255,255,.07);
      }

      .nova-mind-head {
        display: flex;
        justify-content: space-between;
        align-items: center;
        gap: 10px;
      }

      .nova-mind-title {
        color: #F3F5F2;
        font-size: 14px;
        font-weight: 800;
      }

      .nova-mind-subtitle {
        color: #69716D;
        font-size: 9px;
        margin-top: 3px;
      }

      .nova-mind-clear {
        border: 0;
        background: rgba(200,255,74,.08);
        color: #C8FF4A;
        border-radius: 10px;
        padding: 7px 9px;
        font-size: 9px;
      }

      .nova-mind-search {
        width: 100%;
        box-sizing: border-box;
        margin-top: 14px;
        padding: 10px 12px;
        border-radius: 11px;
        border: 1px solid rgba(255,255,255,.07);
        background: #090B0C;
        color: #F3F5F2;
        outline: none;
        font-size: 11px;
      }

      .nova-mind-search:focus {
        border-color: rgba(200,255,74,.4);
      }

      .nova-mind-filter {
        display: flex;
        gap: 6px;
        overflow-x: auto;
        margin-top: 9px;
        padding-bottom: 2px;
      }

      .nova-filter-btn {
        border: 0;
        white-space: nowrap;
        background: #090B0C;
        color: #89918D;
        border-radius: 9px;
        padding: 6px 9px;
        font-size: 9px;
      }

      .nova-filter-btn.active {
        background: #C8FF4A;
        color: #090B0C;
      }

      .nova-mind-item {
        padding: 13px 0;
        border-top: 1px solid rgba(255,255,255,.05);
      }

      .nova-mind-item-top {
        display: flex;
        justify-content: space-between;
        gap: 10px;
      }

      .nova-mind-text {
        color: #DDE2DE;
        font-size: 11px;
        line-height: 1.5;
        flex: 1;
      }

      .nova-mind-category {
        display: inline-block;
        margin-top: 7px;
        color: #C8FF4A;
        background: rgba(200,255,74,.07);
        padding: 4px 7px;
        border-radius: 7px;
        font-size: 8px;
      }

      .nova-mind-actions {
        display: flex;
        gap: 3px;
      }

      .nova-mind-action {
        border: 0;
        background: transparent;
        color: #69716D;
        font-size: 13px;
        width: 25px;
        height: 25px;
      }

      .nova-mind-action:active {
        color: #C8FF4A;
      }

      .nova-mind-empty {
        color: #69716D;
        font-size: 11px;
        line-height: 1.5;
        padding-top: 15px;
      }

      .nova-edit-area {
        width: 100%;
        min-height: 70px;
        box-sizing: border-box;
        margin-top: 5px;
        padding: 10px;
        border-radius: 10px;
        border: 1px solid rgba(255,255,255,.08);
        background: #090B0C;
        color: #F3F5F2;
        resize: vertical;
        font-size: 11px;
      }

      .nova-edit-buttons {
        display: flex;
        gap: 7px;
        margin-top: 7px;
      }

      .nova-edit-save,
      .nova-edit-cancel {
        border: 0;
        border-radius: 8px;
        padding: 7px 10px;
        font-size: 9px;
      }

      .nova-edit-save {
        background: #C8FF4A;
        color: #090B0C;
      }

      .nova-edit-cancel {
        background: #090B0C;
        color: #89918D;
      }
    `;


    document.head.appendChild(style);


    const composer =
      document.querySelector(".composer");


    if (!composer) return;


    const chat =
      document.createElement("section");


    chat.id = "novaChat";


    composer.insertAdjacentElement(
      "afterend",
      chat
    );


    this.renderChat();

    this.createMindUI();
  },


  // =====================================
  // CHAT RENDER
  // =====================================

  renderChat() {

    const chat =
      document.getElementById(
        "novaChat"
      );


    if (!chat) return;


    const messages =
      this.getMessages();


    chat.innerHTML = `
      <div class="nova-chat-title">
        Conversation
      </div>
    `;


    messages.forEach(item => {

      const bubble =
        document.createElement("div");


      bubble.className =
        "nova-message " +
        (
          item.role === "user"
            ? "nova-user"
            : "nova-ai"
        );


      bubble.textContent =
        item.content;


      chat.appendChild(
        bubble
      );
    });


    if (messages.length) {

      const bar =
        document.createElement("div");


      bar.className =
        "nova-memory-bar";


      bar.innerHTML = `
        <span class="nova-memory-label">
          Conversation • ${messages.length} messages
        </span>

        <button
          class="nova-clear-btn"
          onclick="NOVA.clearConversation()"
        >
          Clear
        </button>
      `;


      chat.appendChild(bar);
    }
  },


  // =====================================
  // MY MIND UI
  // =====================================

  createMindUI() {

    if (
      document.getElementById(
        "novaMind"
      )
    ) {
      return;
    }


    const chat =
      document.getElementById(
        "novaChat"
      );


    if (!chat) return;


    const mind =
      document.createElement(
        "section"
      );


    mind.id = "novaMind";


    chat.insertAdjacentElement(
      "afterend",
      mind
    );


    this.renderMind();
  },


  renderMind(
    query = "",
    category = "all"
  ) {

    const mind =
      document.getElementById(
        "novaMind"
      );


    if (!mind) return;


    let memories =
      this.searchMind(query);


    if (category !== "all") {

      memories =
        memories.filter(
          item =>
            item.category === category
        );
    }


    const total =
      this.getMind().length;


    let html = `

      <div class="nova-mind-head">

        <div>

          <div class="nova-mind-title">
            🧠 My Mind
          </div>

          <div class="nova-mind-subtitle">
            ${total} saved ${total === 1 ? "memory" : "memories"}
          </div>

        </div>

        ${
          total
            ? `
              <button
                class="nova-mind-clear"
                onclick="NOVA.clearMind()"
              >
                Clear all
              </button>
            `
            : ""
        }

      </div>


      <input
        id="novaMindSearch"
        class="nova-mind-search"
        placeholder="Search memories..."
        value="${this.escapeHTML(query)}"
        oninput="NOVA.renderMind(this.value, '${category}')"
      />


      <div class="nova-mind-filter">

        <button
          class="nova-filter-btn ${category === "all" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'all'
          )"
        >
          All
        </button>

        <button
          class="nova-filter-btn ${category === "profile" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'profile'
          )"
        >
          Profile
        </button>

        <button
          class="nova-filter-btn ${category === "goals" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'goals'
          )"
        >
          Goals
        </button>

        <button
          class="nova-filter-btn ${category === "preferences" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'preferences'
          )"
        >
          Preferences
        </button>

        <button
          class="nova-filter-btn ${category === "routine" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'routine'
          )"
        >
          Routine
        </button>

        <button
          class="nova-filter-btn ${category === "other" ? "active" : ""}"
          onclick="NOVA.renderMind(
            document.getElementById('novaMindSearch')?.value || '',
            'other'
          )"
        >
          Other
        </button>

      </div>

    `;


    if (!memories.length) {

      html += `

        <div class="nova-mind-empty">

          ${
            total
              ? "No matching memories found."
              : `
                No saved memories yet.<br><br>
                Try saying:<br>
                <b>“My name is Anik. Remember this.”</b>
              `
          }

        </div>

      `;

      mind.innerHTML = html;

      return;
    }


    memories
      .slice()
      .reverse()
      .forEach(item => {

        const categoryName =
          this.categories[item.category]
          || "Other";


        html += `

          <div
            class="nova-mind-item"
            id="mind-${item.id}"
          >

            <div class="nova-mind-item-top">

              <div
                class="nova-mind-text"
                id="mind-text-${item.id}"
              >
                ${this.escapeHTML(item.content)}
              </div>


              <div class="nova-mind-actions">

                <button
                  class="nova-mind-action"
                  onclick="NOVA.editMind(${item.id})"
                  title="Edit"
                >
                  ✎
                </button>

                <button
                  class="nova-mind-action"
                  onclick="NOVA.deleteMind(${item.id})"
                  title="Delete"
                >
                  ×
                </button>

              </div>

            </div>


            <div class="nova-mind-category">
              ${categoryName}
            </div>

          </div>

        `;

      });


    mind.innerHTML = html;
  },


  // =====================================
  // EDIT MEMORY
  // =====================================

  editMind(id) {

    const memories =
      this.getMind();


    const item =
      memories.find(
        memory => memory.id === id
      );


    if (!item) return;


    const container =
      document.getElementById(
        `mind-${id}`
      );


    if (!container) return;


    container.innerHTML = `

      <textarea
        class="nova-edit-area"
        id="edit-${id}"
      >${this.escapeHTML(item.content)}</textarea>


      <div class="nova-edit-buttons">

        <button
          class="nova-edit-save"
          onclick="NOVA.saveEditedMind(${id})"
        >
          Save
        </button>

        <button
          class="nova-edit-cancel"
          onclick="NOVA.renderMind()"
        >
          Cancel
        </button>

      </div>

    `;
  },


  saveEditedMind(id) {

    const input =
      document.getElementById(
        `edit-${id}`
      );


    if (!input) return;


    const text =
      input.value.trim();


    if (!text) return;


    const memories =
      this.getMind();


    const item =
      memories.find(
        memory => memory.id === id
      );


    if (!item) return;


    item.content =
      text;


    item.category =
      this.detectCategory(text);


    item.time =
      Date.now();


    localStorage.setItem(
      "nova_mind",
      JSON.stringify(memories)
    );


    this.renderMind();


    if (typeof showToast === "function") {
      showToast("Memory updated.");
    }
  },


  // =====================================
  // HTML ESCAPE
  // =====================================

  escapeHTML(text) {

    const div =
      document.createElement("div");


    div.textContent =
      String(text || "");


    return div.innerHTML;
  }

};


// =====================================
// GLOBAL
// =====================================

window.NOVA = NOVA;


// =====================================
// CONNECT EXISTING UI
// =====================================

window.addEventListener(
  "load",
  () => {

    NOVA.createChatUI();


    // Existing mode function

    const originalSetMode =
      window.setMode;


    window.setMode =
      function(mode) {

        NOVA.setMode(mode);


        if (
          typeof originalSetMode ===
          "function"
        ) {

          originalSetMode(mode);
        }
      };


    // Main send function

    window.askNova =
      async function() {

        const input =
          document.getElementById(
            "prompt"
          );


        if (!input) return;


        const text =
          input.value.trim();


        if (!text) {

          if (
            typeof showToast ===
            "function"
          ) {

            showToast(
              "Tell NOVA what you need."
            );
          }

          return;
        }


        NOVA.setMode(
          window.currentMode ||
          NOVA.getMode() ||
          "ASK"
        );


        input.value = "";


        if (
          typeof autoResize ===
          "function"
        ) {

          autoResize(input);
        }


        const status =
          document.getElementById(
            "status"
          );


        if (status) {
          status.innerText =
            "NOVA is thinking...";
        }


        if (
          typeof showToast ===
          "function"
        ) {

          showToast(
            "NOVA is thinking..."
          );
        }


        NOVA.renderChat();


        const chat =
          document.getElementById(
            "novaChat"
          );


        let thinking = null;


        if (chat) {

          thinking =
            document.createElement(
              "div"
            );


          thinking.className =
            "nova-message nova-ai nova-thinking";


          thinking.textContent =
            "NOVA is thinking...";


          chat.appendChild(
            thinking
          );
        }


        const result =
          await NOVA.ask(text);


        if (thinking) {
          thinking.remove();
        }


        if (result.success) {

          if (status) {
            status.innerText =
              "NOVA is ready.";
          }


          NOVA.renderChat();

          NOVA.renderMind();

        } else {

          if (status) {
            status.innerText =
              "NOVA encountered a problem.";
          }


          if (
            typeof showToast ===
            "function"
          ) {

            showToast(
              result.message
            );
          }
        }
      };


    NOVA.renderChat();

    NOVA.renderMind();

  }
);
/* =========================================================
   NOVA — SMART MEMORY INTELLIGENCE + CONNECTION STABILITY
   UI/UX SAFE PATCH
   ========================================================= */

(function () {
  "use strict";

  const WORKER_URL =
    "https://nova-ai-brain.aniksar028.workers.dev/api/chat";

  const MEMORY_KEY = "nova_mind";

  /* ---------- MEMORY HELPERS ---------- */

  function novaGetMemories() {
    try {
      const data = JSON.parse(localStorage.getItem(MEMORY_KEY) || "[]");
      return Array.isArray(data) ? data : [];
    } catch {
      return [];
    }
  }

  function novaSaveMemories(data) {
    try {
      localStorage.setItem(
        MEMORY_KEY,
        JSON.stringify(data.slice(-100))
      );
    } catch {}
  }

  function novaCategory(text) {
    const t = text.toLowerCase();

    if (
      /name|birthday|dob|date of birth|born|age|study|college|school|location/.test(t)
    ) return "profile";

    if (
      /goal|dream|target|want to become|future|career|learn/.test(t)
    ) return "goals";

    if (
      /like|love|prefer|favorite|hate|don't like|dont like/.test(t)
    ) return "preferences";

    if (
      /routine|wake|sleep|exercise|workout|study time|daily/.test(t)
    ) return "routine";

    return "other";
  }

  /* Sensitive information should NEVER be auto-saved */
  function novaIsSensitive(text) {
    return /password|passcode|otp|one[- ]time password|api key|secret key|token|cvv|pin|credit card|debit card|bank account|bkash pin|nagad pin/i.test(
      text
    );
  }

  function novaExtractMemory(text) {
    if (!text || novaIsSensitive(text)) return null;

    const patterns = [
      /my name is (.+)/i,
      /my birthday is (.+)/i,
      /my dob is (.+)/i,
      /my date of birth is (.+)/i,
      /i was born (.+)/i,
      /my goal is (.+)/i,
      /my goal (?:is|:)?\s*(.+)/i,
      /i want to (.+)/i,
      /i like (.+)/i,
      /i love (.+)/i,
      /i prefer (.+)/i,
      /i don't like (.+)/i,
      /i dont like (.+)/i,
      /my routine is (.+)/i,
      /i study (.+)/i,
      /i work (.+)/i
    ];

    for (const pattern of patterns) {
      const match = text.match(pattern);
      if (match && match[1]) {
        return match[0].trim();
      }
    }

    return null;
  }

  function novaSmartRemember(text, explicit = false) {
    if (!text || novaIsSensitive(text)) return false;

    const memory = novaExtractMemory(text);

    /* Explicit "remember/save this" */
    if (
      /remember this|remember that|remember my|remember i|remember i'm|save this|save that|don't forget|dont forget|keep this in mind/i.test(
        text
      )
    ) {
      const clean = text
        .replace(
          /remember this|remember that|remember my|remember i|remember i'm|save this|save that|don't forget|dont forget|keep this in mind/gi,
          ""
        )
        .replace(/[.:,-]\s*$/, "")
        .trim();

      if (clean) {
        return novaStoreMemory(clean);
      }
    }

    /* Automatic memory — only useful, non-sensitive facts */
    if (memory) {
      return novaStoreMemory(memory);
    }

    return false;
  }

  function novaStoreMemory(content) {
    if (!content || novaIsSensitive(content)) return false;

    const memories = novaGetMemories();

    const normalized = content
      .toLowerCase()
      .replace(/\s+/g, " ")
      .trim();

    /* Duplicate protection */
    const duplicate = memories.some(
      m =>
        String(m.content || "")
          .toLowerCase()
          .replace(/\s+/g, " ")
          .trim() === normalized
    );

    if (duplicate) return false;

    const item = {
      id: Date.now().toString(36) + Math.random().toString(36).slice(2, 7),
      content,
      category: novaCategory(content),
      time: new Date().toISOString()
    };

    memories.push(item);
    novaSaveMemories(memories);

    return true;
  }

  /* ---------- SMART SUMMARY ---------- */

  window.NOVA_SMART_MEMORY = {
    getAll() {
      return novaGetMemories();
    },

    getContext() {
      const memories = novaGetMemories();

      if (!memories.length) {
        return "No saved memories.";
      }

      return memories
        .map((m, i) => {
          return `${i + 1}. [${m.category}] ${m.content}`;
        })
        .join("\n");
    },

    remember(text) {
      return novaSmartRemember(text, true);
    },

    clear() {
      localStorage.removeItem(MEMORY_KEY);
    }
  };

  /* ---------- CONNECTION STABILITY ---------- */

  async function novaStableRequest(payload, retries = 2) {
    let lastError;

    for (let attempt = 0; attempt <= retries; attempt++) {
      try {
        const controller = new AbortController();

        const timeout = setTimeout(() => {
          controller.abort();
        }, 30000);

        const response = await fetch(WORKER_URL, {
          method: "POST",
          headers: {
            "Content-Type": "application/json"
          },
          body: JSON.stringify(payload),
          signal: controller.signal,
          cache: "no-store"
        });

        clearTimeout(timeout);

        if (!response.ok) {
          throw new Error(`Worker HTTP ${response.status}`);
        }

        const data = await response.json();

        if (!data) {
          throw new Error("Empty Worker response");
        }

        if (data.success === false) {
          throw new Error(data.error || "Worker returned an error");
        }

        return data;
      } catch (error) {
        lastError = error;

        if (attempt < retries) {
          await new Promise(resolve =>
            setTimeout(resolve, 800 * (attempt + 1))
          );
        }
      }
    }

    throw lastError || new Error("Connection failed");
  }

  window.NOVA_STABLE_REQUEST = novaStableRequest;

  /* ---------- PATCH EXISTING NOVA ASK ---------- */

  if (window.NOVA && typeof window.NOVA.ask === "function") {
    const originalAsk = window.NOVA.ask;

    window.NOVA.ask = async function (message, options = {}) {
      try {
        /*
         * Save useful memory before sending the message.
         * Sensitive data is automatically blocked.
         */
        novaSmartRemember(message);

        const memories = novaGetMemories();

        const payload = {
          message: String(message || ""),
          mode:
            options.mode ||
            localStorage.getItem("nova_mode") ||
            "ASK",

          history: Array.isArray(options.history)
            ? options.history.slice(-12)
            : [],

          memory: memories.length
            ? memories
                .map(
                  (m, i) =>
                    `${i + 1}. [${m.category}] ${m.content}`
                )
                .join("\n")
            : "No saved memories."
        };

        /*
         * Use stable connection first.
         */
        const result = await novaStableRequest(payload, 2);

        return result;
      } catch (error) {
        console.error("NOVA connection error:", error);

        /*
         * IMPORTANT:
         * Do not change UI/UX here.
         * Return a predictable result to the existing UI.
         */
        return {
          success: false,
          answer:
            "I'm having a temporary connection problem. Please try again.",
          error: error.message || "Connection failed"
        };
      }
    };
  }

  /* ---------- MEMORY COMMANDS ---------- */

  window.NOVA_PROCESS_MEMORY = function (message) {
    if (!message) return false;

    const lower = message.toLowerCase().trim();

    /* Clear all */
    if (
      lower === "forget everything" ||
      lower === "forget everything about me" ||
      lower === "clear all my memories"
    ) {
      localStorage.removeItem(MEMORY_KEY);
      return "ALL_CLEARED";
    }

    /* Explicit save */
    if (
      /remember this|remember that|remember my|save this|save that|don't forget|dont forget/i.test(
        message
      )
    ) {
      return novaSmartRemember(message, true);
    }

    return false;
  };

  console.log(
    "NOVA Smart Memory + Connection Stability loaded."
  );
})();
