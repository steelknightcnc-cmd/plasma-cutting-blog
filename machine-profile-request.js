(() => {
  const form = document.querySelector("#machine-profile-request-form");
  const message = document.querySelector("#machine-request-message");
  const submitButton = document.querySelector("#machine-request-submit");
  const successPanel = document.querySelector("#machine-request-success");
  const referenceTarget = document.querySelector("#machine-request-reference");
  const notes = document.querySelector("#request-notes");
  const notesCount = document.querySelector("#request-notes-count");

  if (!form || !message || !submitButton) return;

  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");

  const configured =
    projectUrl.startsWith("https://") &&
    !projectUrl.includes("YOUR-PROJECT") &&
    publishableKey.length > 20 &&
    !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

  function setMessage(text, type = "") {
    message.textContent = text;
    message.className = `machine-request-message ${type}`.trim();
  }

  function setBusy(busy) {
    submitButton.disabled = busy;
    submitButton.textContent = busy
      ? "Submitting Request…"
      : "Submit Machine Request";
  }

  function clean(value) {
    return String(value || "").trim();
  }

  function optional(value) {
    const normalized = clean(value);
    return normalized || null;
  }

  function createReference() {
    const date = new Date();
    const stamp = [
      date.getUTCFullYear(),
      String(date.getUTCMonth() + 1).padStart(2, "0"),
      String(date.getUTCDate()).padStart(2, "0")
    ].join("");

    let randomPart = "";

    if (window.crypto?.getRandomValues) {
      const values = new Uint32Array(2);
      window.crypto.getRandomValues(values);
      randomPart = [...values]
        .map((value) => value.toString(36).toUpperCase().slice(-4))
        .join("");
    } else {
      randomPart = Math.random().toString(36).slice(2, 10).toUpperCase();
    }

    return `PCF-${stamp}-${randomPart.slice(0, 8)}`;
  }

  function validOptionalUrl(value) {
    const normalized = clean(value);
    if (!normalized) return true;

    try {
      const url = new URL(normalized);
      return url.protocol === "http:" || url.protocol === "https:";
    } catch {
      return false;
    }
  }

  notes?.addEventListener("input", () => {
    notesCount.textContent = String(notes.value.length);
  });

  form.addEventListener("submit", async (event) => {
    event.preventDefault();
    setMessage("");

    const data = new FormData(form);

    if (clean(data.get("website"))) {
      form.reset();
      setMessage("Request received.", "success");
      return;
    }

    if (!configured) {
      setMessage(
        "The request system is not connected yet. Please try again after the database setup is completed.",
        "error"
      );
      return;
    }

    const manualUrl = clean(data.get("manual_url"));
    const chartUrl = clean(data.get("cut_chart_url"));

    if (!validOptionalUrl(manualUrl) || !validOptionalUrl(chartUrl)) {
      setMessage(
        "Use a complete link beginning with http:// or https:// for documentation URLs.",
        "error"
      );
      return;
    }

    const maximumAmps = Number(data.get("maximum_amps"));

    if (!Number.isFinite(maximumAmps) || maximumAmps < 10 || maximumAmps > 400) {
      setMessage(
        "Enter a maximum output amperage between 10 A and 400 A.",
        "error"
      );
      return;
    }

    const rateLimitKey = "pcf-machine-profile-request-last-submit";
    const lastSubmit = Number(localStorage.getItem(rateLimitKey) || 0);
    const now = Date.now();

    if (lastSubmit && now - lastSubmit < 10 * 60 * 1000) {
      const remainingMinutes = Math.ceil(
        (10 * 60 * 1000 - (now - lastSubmit)) / 60000
      );
      setMessage(
        `Please wait approximately ${remainingMinutes} minute${remainingMinutes === 1 ? "" : "s"} before submitting another request.`,
        "warning"
      );
      return;
    }

    const reference = createReference();

    const payload = {
      request_reference: reference,
      manufacturer: clean(data.get("manufacturer")),
      model: clean(data.get("model")),
      maximum_amps: maximumAmps,
      torch_model: optional(data.get("torch_model")),
      process_type: clean(data.get("process_type")),
      country: optional(data.get("country")),
      manual_url: optional(manualUrl),
      cut_chart_url: optional(chartUrl),
      notes: optional(data.get("notes")),
      requester_name: optional(data.get("requester_name")),
      contact_email: clean(data.get("email")).toLowerCase(),
      consent_to_contact: data.get("consent") === "on",
      source_page: window.location.pathname,
      status: "pending"
    };

    setBusy(true);
    setMessage("Submitting your machine-profile request…");

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/machine_profile_requests`,
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
      notesCount.textContent = "0";

      referenceTarget.textContent = reference;
      successPanel.hidden = false;
      setMessage("Machine-profile request submitted successfully.", "success");
      successPanel.scrollIntoView({ behavior: "smooth", block: "center" });
    } catch (error) {
      console.error(error);
      setMessage(
        "The request could not be submitted. Confirm the Supabase table setup and try again.",
        "error"
      );
    } finally {
      setBusy(false);
    }
  });
})();
