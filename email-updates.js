(() => {
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");

  const subscribeForm = document.querySelector("#email-updates-subscribe-form");
  const subscribeButton = document.querySelector("#email-updates-submit");
  const subscribeMessage = document.querySelector("#email-updates-message");

  const manageForm = document.querySelector("#email-updates-manage-form");
  const manageButton = document.querySelector("#email-updates-manage-submit");
  const manageMessage = document.querySelector("#email-updates-manage-message");

  if (!window.supabase || !projectUrl || !publishableKey) {
    if (subscribeMessage) {
      subscribeMessage.textContent =
        "The subscription system is not connected yet.";
      subscribeMessage.className = "error";
    }
    return;
  }

  const db = window.supabase.createClient(projectUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  function setMessage(target, text, type = "") {
    if (!target) return;
    target.textContent = text;
    target.className = type;
  }

  function selectedTopics(form) {
    return [...form.querySelectorAll('input[name="topics"]:checked')]
      .map((input) => input.value);
  }

  function confirmationRedirect(mode, topics = []) {
    const parameters = new URLSearchParams({ mode });

    if (topics.length) {
      parameters.set("topics", topics.join(","));
    }

    return `${window.location.origin}/email-updates-confirm.html?${parameters.toString()}`;
  }

  async function sendMagicLink(email, mode, topics, button, messageTarget) {
    button.disabled = true;
    button.textContent =
      mode === "manage" ? "Sending Link…" : "Sending Confirmation…";

    try {
      const { error } = await db.auth.signInWithOtp({
        email,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: confirmationRedirect(mode, topics),
          data: {
            pcf_email_updates_mode: mode,
            pcf_email_updates_topics: topics
          }
        }
      });

      if (error) throw error;

      setMessage(
        messageTarget,
        mode === "manage"
          ? "Check your email and open the secure management link."
          : "Check your email and open the confirmation link to activate your selected updates.",
        "success"
      );
    } catch (error) {
      console.error(error);
      setMessage(
        messageTarget,
        error?.message ||
          "The confirmation email could not be sent. Please try again.",
        "error"
      );
    } finally {
      button.disabled = false;
      button.textContent =
        mode === "manage"
          ? "Send Management Link"
          : "Send Confirmation Link";
    }
  }

  subscribeForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(subscribeMessage, "");

    const email = String(
      subscribeForm.elements.email?.value || ""
    ).trim().toLowerCase();

    const topics = selectedTopics(subscribeForm);
    const consent = Boolean(subscribeForm.elements.consent?.checked);

    if (!email) {
      setMessage(subscribeMessage, "Enter a valid email address.", "error");
      return;
    }

    if (!topics.length) {
      setMessage(
        subscribeMessage,
        "Choose at least one update category.",
        "error"
      );
      return;
    }

    if (!consent) {
      setMessage(
        subscribeMessage,
        "Confirm your consent before requesting the email link.",
        "error"
      );
      return;
    }

    await sendMagicLink(
      email,
      "subscribe",
      topics,
      subscribeButton,
      subscribeMessage
    );
  });

  manageForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage(manageMessage, "");

    const email = String(
      manageForm.elements.email?.value || ""
    ).trim().toLowerCase();

    if (!email) {
      setMessage(manageMessage, "Enter the subscribed email address.", "error");
      return;
    }

    await sendMagicLink(
      email,
      "manage",
      [],
      manageButton,
      manageMessage
    );
  });
})();
