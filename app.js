const NOVA = {

  // =====================================
  // BASIC STATE
  // =====================================

  mode: localStorage.getItem("nova_mode") || "ASK",


  // =====================================
  // MODE
  // =====================================

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
      role: role,
      content: content,
      time: Date.now()
    });

    localStorage.setItem(
      "nova_messages",
      JSON.stringify(messages.slice(-40))
    );
  },


  clearMemory() {

    localStorage.removeItem("nova_messages");

    this.renderChat();

    if (typeof showToast === "function") {
      showToast("Conversation cleared.");
    }
  },


  // =====================================
  // 🧠 MY MIND - LONG TERM MEMORY
  // =====================================

  getMind() {

    try {

      return JSON.parse(
        localStorage.getItem("nova_mind") || "[]"
      );

    } catch {

      return [];

    }
  },


  saveMind(content) {

    const text = String(content || "").trim();

    if (!text) return;


    const memories = this.getMind();


    // Avoid exact duplicates

    const exists = memories.some(
      item =>
        String(item.content).toLowerCase() ===
        text.toLowerCase()
    );


    if (exists) return;


    memories.push({

      id: Date.now(),

      content: text,

      time: Date.now()

    });


    // Keep latest 100 memories

    localStorage.setItem(
      "nova_mind",
      JSON.stringify(memories.slice(-100))
    );


    this.renderMind();

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


  getMindContext() {

    const memories = this.getMind();


    if (!memories.length) {
      return "No saved personal memories.";
    }


    return memories
      .map(
        (item, index) =>
          `${index + 1}. ${item.content}`
      )
      .join("\n");
  },


  // =====================================
  // AUTOMATIC "REMEMBER THIS" DETECTION
  // =====================================

  detectMemory(message) {

    const text =
      String(message || "").trim();


    if (!text) return null;


    const lower =
      text.toLowerCase();


    const triggers = [

      "remember this",

      "remember that",

      "remember my",

      "remember i",

      "remember i'm",

      "don't forget",

      "dont forget",

      "save this",

      "save that",

      "keep this in mind"

    ];


    const matched =
      triggers.some(
        trigger =>
          lower.includes(trigger)
      );


    if (!matched) {
      return null;
    }


    let memory = text;


    // Remove common command phrases

    memory = memory
      .replace(
        /remember this/gi,
        ""
      )
      .replace(
        /remember that/gi,
        ""
      )
      .replace(
        /don't forget/gi,
        ""
      )
      .replace(
        /dont forget/gi,
        ""
      )
      .replace(
        /save this/gi,
        ""
      )
      .replace(
        /save that/gi,
        ""
      )
      .replace(
        /keep this in mind/gi,
        ""
      )
      .trim();


    if (!memory) {
      return text;
    }


    return memory;

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


    // -------------------------------------
    // Conversation history
    // -------------------------------------

    const history =
      this.getMessages()
        .slice(-12)
        .map(item => ({

          role: item.role,

          content: item.content

        }));


    // -------------------------------------
    // Save user message
    // -------------------------------------

    this.saveMessage(
      "user",
      message
    );


    // -------------------------------------
    // Detect long-term memory
    // -------------------------------------

    const detectedMemory =
      this.detectMemory(message);


    if (detectedMemory) {

      this.saveMind(
        detectedMemory
      );

    }


    // -------------------------------------
    // My Mind context
    // -------------------------------------

    const mindContext =
      this.getMindContext();


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
                mindContext

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


      // -------------------------------------
      // Save AI response
      // -------------------------------------

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
  // CREATE CHAT UI
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
      document.createElement(
        "style"
      );


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
        margin-bottom: 2px;
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


      .nova-clear-btn:active {
        color: #C8FF4A;
      }


      /* =================================
         MY MIND
      ================================= */

      #novaMind {

        margin-top: 26px;

        padding: 17px;

        border-radius: 20px;

        background: #111416;

        border: 1px solid
          rgba(255,255,255,.07);

      }


      .nova-mind-head {

        display: flex;

        justify-content:
          space-between;

        align-items: center;

        margin-bottom: 14px;

      }


      .nova-mind-title {

        color: #F3F5F2;

        font-size: 13px;

        font-weight: 800;

        letter-spacing: .4px;

      }


      .nova-mind-subtitle {

        color: #69716D;

        font-size: 9px;

        margin-top: 3px;

      }


      .nova-mind-clear {

        border: 0;

        background:
          rgba(200,255,74,.08);

        color: #C8FF4A;

        border-radius: 10px;

        padding: 7px 9px;

        font-size: 9px;

      }


      .nova-mind-empty {

        color: #69716D;

        font-size: 11px;

        line-height: 1.5;

        padding: 7px 0;

      }


      .nova-mind-item {

        display: flex;

        justify-content:
          space-between;

        gap: 12px;

        padding: 11px 0;

        border-top: 1px solid
          rgba(255,255,255,.05);

      }


      .nova-mind-text {

        color: #DDE2DE;

        font-size: 11px;

        line-height: 1.45;

        flex: 1;

      }


      .nova-mind-delete {

        border: 0;

        background: transparent;

        color: #69716D;

        font-size: 14px;

        width: 25px;

        height: 25px;

      }


      .nova-mind-delete:active {

        color: #C8FF4A;

      }

    `;


    document.head.appendChild(
      style
    );


    const composer =
      document.querySelector(
        ".composer"
      );


    if (!composer) return;


    const chat =
      document.createElement(
        "section"
      );


    chat.id =
      "novaChat";


    composer.insertAdjacentElement(
      "afterend",
      chat
    );


    this.renderChat();

    this.createMindUI();

  },


  // =====================================
  // RENDER CHAT
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


    messages.forEach(
      item => {

        const bubble =
          document.createElement(
            "div"
          );


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

      }
    );


    if (messages.length > 0) {

      const bar =
        document.createElement(
          "div"
        );


      bar.className =
        "nova-memory-bar";


      bar.innerHTML = `

        <span class="nova-memory-label">
          Conversation •
          ${messages.length} messages
        </span>


        <button
          class="nova-clear-btn"
          onclick="NOVA.clearMemory()"
        >
          Clear
        </button>

      `;


      chat.appendChild(
        bar
      );

    }

  },


  // =====================================
  // CREATE MY MIND UI
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


    mind.id =
      "novaMind";


    chat.insertAdjacentElement(
      "afterend",
      mind
    );


    this.renderMind();

  },


  // =====================================
  // RENDER MY MIND
  // =====================================

  renderMind() {

    const mind =
      document.getElementById(
        "novaMind"
      );


    if (!mind) return;


    const memories =
      this.getMind();


    let html = `

      <div class="nova-mind-head">

        <div>

          <div class="nova-mind-title">
            🧠 My Mind
          </div>

          <div class="nova-mind-subtitle">
            Things NOVA remembers about you
          </div>

        </div>


        ${
          memories.length
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

    `;


    if (!memories.length) {

      html += `

        <div class="nova-mind-empty">

          No saved memories yet.

          <br>

          Tell NOVA:
          <b>“My name is Anik. Remember this.”</b>

        </div>

      `;

      mind.innerHTML =
        html;

      return;

    }


    memories
      .slice()
      .reverse()
      .forEach(
        item => {

          html += `

            <div
              class="nova-mind-item"
            >

              <div
                class="nova-mind-text"
              >
                ${this.escapeHTML(
                  item.content
                )}
              </div>


              <button
                class="nova-mind-delete"
                onclick="NOVA.deleteMind(${item.id})"
                aria-label="Delete memory"
              >
                ×
              </button>

            </div>

          `;

        }
      );


    mind.innerHTML =
      html;

  },


  // =====================================
  // HTML SAFETY
  // =====================================

  escapeHTML(text) {

    const div =
      document.createElement(
        "div"
      );


    div.textContent =
      text;


    return div.innerHTML;

  }

};


// =====================================
// GLOBAL NOVA
// =====================================

window.NOVA =
  NOVA;


// =====================================
// CONNECT TO EXISTING UI
// =====================================

window.addEventListener(
  "load",
  () => {


    // Create UI

    NOVA.createChatUI();


    // ---------------------------------
    // Existing mode system
    // ---------------------------------

    const originalSetMode =
      window.setMode;


    window.setMode =
      function(mode) {

        NOVA.setMode(
          mode
        );


        if (
          typeof originalSetMode ===
          "function"
        ) {

          originalSetMode(
            mode
          );

        }

      };


    // ---------------------------------
    // Main Ask button
    // ---------------------------------

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


        // ---------------------------------
        // Mode
        // ---------------------------------

        NOVA.setMode(

          window.currentMode ||
          NOVA.getMode() ||
          "ASK"

        );


        // ---------------------------------
        // Clear input
        // ---------------------------------

        input.value = "";


        if (
          typeof autoResize ===
          "function"
        ) {

          autoResize(
            input
          );

        }


        // ---------------------------------
        // Status
        // ---------------------------------

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


        // ---------------------------------
        // Refresh UI
        // ---------------------------------

        NOVA.renderChat();


        const chat =
          document.getElementById(
            "novaChat"
          );


        let thinking =
          null;


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


        // ---------------------------------
        // Ask AI
        // ---------------------------------

        const result =
          await NOVA.ask(
            text
          );


        // ---------------------------------
        // Remove thinking
        // ---------------------------------

        if (thinking) {

          thinking.remove();

        }


        // ---------------------------------
        // Result
        // ---------------------------------

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


    // ---------------------------------
    // Initial render
    // ---------------------------------

    NOVA.renderChat();

    NOVA.renderMind();

  }
);
