(() => {
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");

  const workingPanel = document.querySelector("#email-confirm-working");
  const statusTarget = document.querySelector("#email-confirm-status");
  const errorPanel = document.querySelector("#email-confirm-error");
  const errorTarget = document.querySelector("#email-confirm-error-message");
  const preferencesPanel = document.querySelector("#email-preferences-panel");
  const addressTarget = document.querySelector("#email-preferences-address");
  const preferencesForm = document.querySelector("#email-preferences-form");
  const preferencesMessage = document.querySelector("#email-preferences-message");
  const saveButton = document.querySelector("#email-preferences-save");
  const unsubscribeButton = document.querySelector("#email-preferences-unsubscribe");

  function showError(message) {
    if (workingPanel) workingPanel.hidden = true;
    if (preferencesPanel) preferencesPanel.hidden = true;
    if (errorPanel) errorPanel.hidden = false;
    if (errorTarget) errorTarget.textContent = message;
  }

  if (!window.supabase || !projectUrl || !publishableKey) {
    showError("The subscription system is not connected.");
    return;
  }

  const db = window.supabase.createClient(projectUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  const parameters = new URLSearchParams(window.location.search);
  const mode = parameters.get("mode") || "manage";
  const queryTopics = String(parameters.get("topics") || "")
    .split(",")
    .map((topic) => topic.trim())
    .filter(Boolean);

  const allowedTopics = ["calculator", "machines", "articles", "projects"];

  function validTopics(input) {
    return [...new Set(input)].filter((topic) => allowedTopics.includes(topic));
  }

  function setPreferenceMessage(text, type = "") {
    preferencesMessage.textContent = text;
    preferencesMessage.className = type;
  }

  function setSelectedTopics(topics) {
    const selected = new Set(topics);

    preferencesForm
      .querySelectorAll('input[name="topics"]')
      .forEach((input) => {
        input.checked = selected.has(input.value);
      });
  }

  function getSelectedTopics() {
    return [...preferencesForm.querySelectorAll('input[name="topics"]:checked')]
      .map((input) => input.value);
  }

  async function waitForSession() {
    for (let attempt = 0; attempt < 15; attempt += 1) {
      const {
        data: { session },
        error
      } = await db.auth.getSession();

      if (error) throw error;
      if (session?.user) return session;

      await new Promise((resolve) => setTimeout(resolve, 250));
    }

    return null;
  }

  async function loadCurrentPreferences() {
    const { data, error } = await db.rpc(
      "get_my_email_update_subscription"
    );

    if (error) throw error;
    return data || null;
  }

  async function confirmOrUpdate(topics) {
    const { data, error } = await db.rpc(
      "confirm_email_update_subscription",
      {
        p_topics: validTopics(topics),
        p_source_page: window.location.pathname
      }
    );

    if (error) throw error;
    return data;
  }

  async function initialize() {
    try {
      const session = await waitForSession();

      if (!session?.user) {
        showError(
          "The secure session was not found. The link may have expired or already been used. Request a new link from the Email Updates page."
        );
        return;
      }

      addressTarget.textContent = session.user.email || "confirmed email";

      let currentPreferences = null;

      if (mode === "subscribe") {
        const metadataTopics = validTopics(
          Array.isArray(session.user.user_metadata?.pcf_email_updates_topics)
            ? session.user.user_metadata.pcf_email_updates_topics
            : []
        );

        const requestedTopics = validTopics(
          queryTopics.length ? queryTopics : metadataTopics
        );

        if (!requestedTopics.length) {
          showError(
            "The selected update categories were not included in the confirmation link. Request a new subscription link."
          );
          return;
        }

        statusTarget.textContent = "Activating your selected update categories…";
        currentPreferences = await confirmOrUpdate(requestedTopics);
      } else {
        statusTarget.textContent = "Loading your current email preferences…";
        currentPreferences = await loadCurrentPreferences();
      }

      const activeTopics = currentPreferences?.topics || [];

      if (!activeTopics.length && mode !== "subscribe") {
        showError(
          "No active Email Updates subscription was found for this address. Return to the Email Updates page to subscribe."
        );
        return;
      }

      setSelectedTopics(activeTopics);
      workingPanel.hidden = true;
      errorPanel.hidden = true;
      preferencesPanel.hidden = false;

      setPreferenceMessage(
        mode === "subscribe"
          ? "Your subscription is confirmed. You may adjust the selections below."
          : "Your current preferences are loaded.",
        "success"
      );
    } catch (error) {
      console.error(error);
      showError(
        error?.message ||
          "The subscription could not be confirmed. Request a new secure link."
      );
    }
  }

  preferencesForm?.addEventListener("submit", async (event) => {
    event.preventDefault();
    setPreferenceMessage("");

    const topics = getSelectedTopics();

    if (!topics.length) {
      setPreferenceMessage(
        "Choose at least one topic, or use Unsubscribe from All.",
        "error"
      );
      return;
    }

    saveButton.disabled = true;
    saveButton.textContent = "Saving…";

    try {
      const updated = await confirmOrUpdate(topics);
      setSelectedTopics(updated?.topics || topics);
      setPreferenceMessage("Your email preferences were saved.", "success");
    } catch (error) {
      console.error(error);
      setPreferenceMessage(
        error?.message || "The preferences could not be saved.",
        "error"
      );
    } finally {
      saveButton.disabled = false;
      saveButton.textContent = "Save Preferences";
    }
  });

  unsubscribeButton?.addEventListener("click", async () => {
    const confirmed = window.confirm(
      "Unsubscribe this email address from all Plasma Cut Forge updates?"
    );

    if (!confirmed) return;

    unsubscribeButton.disabled = true;
    unsubscribeButton.textContent = "Unsubscribing…";
    setPreferenceMessage("");

    try {
      const { data, error } = await db.rpc(
        "unsubscribe_my_email_updates"
      );

      if (error) throw error;

      setSelectedTopics([]);
      setPreferenceMessage(
        data?.message ||
          "You have been unsubscribed from all Plasma Cut Forge email updates.",
        "success"
      );
    } catch (error) {
      console.error(error);
      setPreferenceMessage(
        error?.message || "The unsubscribe request could not be completed.",
        "error"
      );
    } finally {
      unsubscribeButton.disabled = false;
      unsubscribeButton.textContent = "Unsubscribe from All";
    }
  });

  initialize();
})();
