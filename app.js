const NOVA = {
  mode: "ASK",

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("nova_mode", mode);
  },

  getMode() {
    return localStorage.getItem("nova_mode") || "ASK";
  },

  saveMessage(role, content) {
    const messages =
      JSON.parse(localStorage.getItem("nova_messages") || "[]");

    messages.push({
      role,
      content,
      time: Date.now()
    });

    localStorage.setItem(
      "nova_messages",
      JSON.stringify(messages)
    );
  },

  getMessages() {
    return JSON.parse(
      localStorage.getItem("nova_messages") || "[]"
    );
  },

  clearMemory() {
    localStorage.removeItem("nova_messages");
  },

  async ask(message) {

    if (!message || !message.trim()) {
      return {
        success: false,
        message: "Tell NOVA what you need."
      };
    }

    this.saveMessage("user", message);

    /*
      AI BACKEND CONNECTION WILL GO HERE.

      IMPORTANT:
      Never put a private AI API key directly
      inside this public JavaScript file.
    */

    return {
      success: true,
      mode: this.getMode(),
      message: "NOVA is ready for its AI connection."
    };
  }
};

NOVA.mode = NOVA.getMode();

window.NOVA = NOVA;
