(() => {
  const form = document.querySelector("#contact-form");
  const submitButton = document.querySelector("#contact-submit");
  const messageTarget = document.querySelector("#contact-form-message");
  const successPanel = document.querySelector("#contact-success");
  const referenceTarget = document.querySelector("#contact-reference");
  const messageInput = document.querySelector("#contact-message-input");
  const messageCount = document.querySelector("#contact-message-count");

  if (!form || !submitButton || !messageTarget) return;

  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");

  const configured =
    projectUrl.startsWith("https://") &&
    !projectUrl.includes("YOUR-PROJECT") &&
    publishableKey.length > 20 &&
    !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

  function setMessage(text, type = "") {
    messageTarget.textContent = text;
    messageTarget.className = type;
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy ? "Sending Message…" : "Send Message";
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function optional(value) {
    const cleaned = clean(value);
    return cleaned || null;
  }

  function createReference() {
    const date = new Date();
    const dateCode = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("");

    let randomCode = "";

    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      window.crypto.getRandomValues(values);
      randomCode = [...values]
        .map((value) => value.toString(36).toUpperCase().slice(-4))
        .join("");
    } else {
      randomCode = Math.random().toString(36).slice(2, 10).toUpperCase();
    }

    return `MSG-${dateCode}-${randomCode.slice(0, 8)}`;
  }

  messageInput?.addEventListener("input", () => {
    messageCount.textContent = String(messageInput.value.length);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const data = new FormData(form);

    if (clean(data.get("website"))) {
      form.reset();
      setMessage("Message received.", "success");
      return;
    }

    if (!configured) {
      setMessage(
        "The contact system is not connected yet. Please try again after the database setup is completed.",
        "error"
      );
      return;
    }

    const name = clean(data.get("name"));
    const email = clean(data.get("email")).toLowerCase();
    const topic = clean(data.get("topic"));
    const subject = clean(data.get("subject"));
    const body = clean(data.get("message"));
    const consent = data.get("privacy_consent") === "on";

    if (!name || !email || !topic || !subject || body.length < 10 || !consent) {
      setMessage("Complete all required fields before sending.", "error");
      return;
    }

    const rateLimitKey = "pcf-contact-last-submit";
    const lastSubmit = Number(localStorage.getItem(rateLimitKey) || 0);
    const now = Date.now();

    if (lastSubmit && now - lastSubmit < 10 * 60 * 1000) {
      const remainingMinutes = Math.ceil(
        (10 * 60 * 1000 - (now - lastSubmit)) / 60000
      );

      setMessage(
        `Please wait approximately ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before sending another message.`,
        "warning"
      );
      return;
    }

    const reference = createReference();

    const payload = {
      message_reference: reference,
      sender_name: name,
      contact_email: email,
      topic,
      related_reference: optional(data.get("related_reference")),
      subject,
      message_body: body,
      privacy_consent: consent,
      source_page: window.location.pathname,
      status: "pending"
    };

    setBusy(true);
    setMessage("Sending your message…");

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/contact_messages`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            "Content-Type": "application/json",
            Prefer: "return=minimal"
          },
          body: JSON.stringify(payload)
        }
      );

      if (!response.ok) {
        let details = "";

        try {
          const errorBody = await response.json();
          details = errorBody?.message || errorBody?.details || "";
        } catch {
          details = await response.text();
        }

        throw new Error(details || `Request failed with status ${response.status}.`);
      }

      localStorage.setItem(rateLimitKey, String(now));
      form.reset();
      messageCount.textContent = "0";
      referenceTarget.textContent = reference;
      successPanel.hidden = false;
      setMessage("Message sent successfully.", "success");
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error(error);
      setMessage(
        "The message could not be sent. Confirm the Supabase table setup and try again.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  });
})();
