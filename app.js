const NOVA = {

  mode: localStorage.getItem("nova_mode") || "ASK",

  getMode() {
    return this.mode;
  },

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("nova_mode", mode);
  },

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

    // Keep latest 40 messages
    localStorage.setItem(
      "nova_messages",
      JSON.stringify(messages.slice(-40))
    );
  },

  clearMemory() {
    localStorage.removeItem("nova_messages");
    this.renderChat();
  },

  async ask(message) {

    if (!message || !message.trim()) {
      return {
        success: false,
        message: "Tell NOVA what you need."
      };
    }

    const history = this.getMessages()
      .slice(-12)
      .map(item => ({
        role: item.role,
        content: item.content
      }));

    this.saveMessage("user", message);

    try {

      const response = await fetch(
        "https://nova-ai-brain.aniksar028.workers.dev/api/chat",
        {
          method: "POST",

          headers: {
            "Content-Type": "application/json"
          },

          body: JSON.stringify({
            message: message,
            mode: this.getMode(),
            history: history
          })
        }
      );

      const data = await response.json();

      if (!response.ok || !data.success) {

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
        message: data.answer
      };

    } catch (error) {

      console.error("NOVA connection error:", error);

      return {
        success: false,
        message:
          "NOVA could not connect to its AI brain."
      };
    }
  },

  createChatUI() {

    if (document.getElementById("novaChat")) {
      return;
    }

    const style = document.createElement("style");

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
    `;

    document.head.appendChild(style);

    const composer =
      document.querySelector(".composer");

    if (!composer) return;

    const chat = document.createElement("section");

    chat.id = "novaChat";

    composer.insertAdjacentElement(
      "afterend",
      chat
    );

    this.renderChat();
  },

  renderChat() {

    const chat =
      document.getElementById("novaChat");

    if (!chat) return;

    const messages = this.getMessages();

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
        (item.role === "user"
          ? "nova-user"
          : "nova-ai");

      bubble.textContent =
        item.content;

      chat.appendChild(bubble);
    });

    if (messages.length > 0) {

      const bar =
        document.createElement("div");

      bar.className =
        "nova-memory-bar";

      bar.innerHTML = `
        <span class="nova-memory-label">
          Memory • ${messages.length} messages
        </span>

        <button
          class="nova-clear-btn"
          onclick="NOVA.clearMemory()"
        >
          Clear
        </button>
      `;

      chat.appendChild(bar);
    }
  }
};


// Make NOVA available globally
window.NOVA = NOVA;


// =====================================
// CONNECT NOVA TO EXISTING UI
// =====================================

window.addEventListener("load", () => {

  NOVA.createChatUI();

  /*
    The original index.html has its own
    askNova() and setMode() functions.
    We replace them here after the page
    finishes loading.
  */

  const originalSetMode =
    window.setMode;

  window.setMode = function(mode) {

    NOVA.setMode(mode);

    if (typeof originalSetMode === "function") {
      originalSetMode(mode);
    }
  };


  window.askNova = async function() {

    const input =
      document.getElementById("prompt");

    if (!input) return;

    const text =
      input.value.trim();

    if (!text) {

      if (typeof showToast === "function") {
        showToast("Tell NOVA what you need.");
      }

      return;
    }


    // Save current mode
    NOVA.setMode(
      window.currentMode ||
      NOVA.getMode() ||
      "ASK"
    );


    // Clear input
    input.value = "";

    if (typeof autoResize === "function") {
      autoResize(input);
    }


    const status =
      document.getElementById("status");

    if (status) {
      status.innerText =
        "NOVA is thinking...";
    }


    if (typeof showToast === "function") {
      showToast("NOVA is thinking...");
    }


    NOVA.renderChat();


    // Add temporary thinking bubble
    const chat =
      document.getElementById("novaChat");

    let thinking = null;

    if (chat) {

      thinking =
        document.createElement("div");

      thinking.className =
        "nova-message nova-ai nova-thinking";

      thinking.textContent =
        "NOVA is thinking...";

      chat.appendChild(thinking);
    }


    // Ask AI
    const result =
      await NOVA.ask(text);


    // Remove thinking bubble
    if (thinking) {
      thinking.remove();
    }


    if (result.success) {

      if (status) {
        status.innerText =
          "NOVA is ready.";
      }

      NOVA.renderChat();

    } else {

      if (status) {
        status.innerText =
          "NOVA encountered a problem.";
      }

      if (typeof showToast === "function") {
        showToast(result.message);
      }
    }
  };


  // Restore previous conversation
  NOVA.renderChat();

});
