const NOVA = {
  mode: localStorage.getItem("nova_mode") || "ASK",

  setMode(mode) {
    this.mode = mode;
    localStorage.setItem("nova_mode", mode);
  },

  getMode() {
    return this.mode;
  },

  saveMessage(role, content) {
    const messages = JSON.parse(
      localStorage.getItem("nova_messages") || "[]"
    );

    messages.push({
      role,
      content,
      time: Date.now()
    });

    localStorage.setItem(
      "nova_messages",
      JSON.stringify(messages.slice(-30))
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

    const history = this.getMessages()
      .slice(-10)
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
          message: data.error || "NOVA AI request failed."
        };
      }

      this.saveMessage("assistant", data.answer);

      return {
        success: true,
        mode: this.getMode(),
        message: data.answer
      };

    } catch (error) {
      return {
        success: false,
        message: "NOVA could not connect to its AI brain."
      };
    }
  }
};

window.NOVA = NOVA;
