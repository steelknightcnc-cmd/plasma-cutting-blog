(() => {
  "use strict";

  if (document.querySelector('script[data-pcf-analytics-consent]')) {
    return;
  }

  const consentScript = document.createElement("script");
  consentScript.src = "/analytics-consent.js";
  consentScript.async = true;
  consentScript.setAttribute("data-pcf-analytics-consent", "");

  document.head.appendChild(consentScript);
})();
(() => {
  "use strict";

  const widgets = [...document.querySelectorAll("[data-membership-widget]")];
  if (!widgets.length) return;

  const AUTO_COLLAPSE_MS = 15000;
  const LEAVE_COLLAPSE_MS = 700;

  widgets.forEach((widget) => {
    const toggle = widget.querySelector("[data-membership-toggle]");
    const panel = widget.querySelector("[data-membership-panel]");
    if (!toggle || !panel) return;

    let autoTimer = null;
    let leaveTimer = null;

    function setExpanded(expanded) {
      widget.classList.toggle("is-expanded", expanded);
      widget.classList.toggle("is-collapsed", !expanded);
      toggle.setAttribute("aria-expanded", String(expanded));
      toggle.setAttribute(
        "aria-label",
        expanded
          ? "Hide Plasma Cut Forge membership options"
          : "Open Plasma Cut Forge membership options"
      );
    }

    function startAutoCollapse() {
      window.clearTimeout(autoTimer);
      autoTimer = window.setTimeout(() => {
        if (!widget.matches(":hover") && !widget.contains(document.activeElement)) {
          setExpanded(false);
        }
      }, AUTO_COLLAPSE_MS);
    }

    function scheduleCollapse() {
      window.clearTimeout(leaveTimer);
      leaveTimer = window.setTimeout(() => {
        if (!widget.matches(":hover") && !widget.contains(document.activeElement)) {
          setExpanded(false);
        }
      }, LEAVE_COLLAPSE_MS);
    }

    function openWidget() {
      window.clearTimeout(leaveTimer);
      setExpanded(true);
    }

    widget.addEventListener("mouseenter", openWidget);
    widget.addEventListener("mouseleave", scheduleCollapse);
    widget.addEventListener("focusin", openWidget);
    widget.addEventListener("focusout", scheduleCollapse);

    toggle.addEventListener("click", () => {
      const expanded = widget.classList.contains("is-expanded");
      setExpanded(!expanded);
      if (!expanded) window.clearTimeout(autoTimer);
    });

    // Start open on every page, then collapse after 15 seconds.
    setExpanded(true);
    startAutoCollapse();
  });
})();

(() => {
  "use strict";

  const STORAGE_KEY = "pcf_site_visitor_key_v1";
  const CONFIG = window.PLASMA_FEEDBACK_CONFIG || {};
  const SUPABASE_URL = CONFIG.supabaseUrl || "https://rgovijwnalhlivhdtpen.supabase.co";
  const SUPABASE_KEY =
    CONFIG.supabasePublishableKey ||
    "sb_publishable_P0KTOF8cBoVC0YlwOgpGtw_E1MLyiCW";

  const styles = `
    .pcf-site-feedback {
      position: relative;
      overflow: hidden;
      width: 100%;
      margin: 0;
      padding: clamp(38px, 5vw, 68px) 20px;
      border-top: 1px solid rgba(255, 138, 31, 0.28);
      background:
        linear-gradient(135deg, rgba(255, 118, 20, 0.08), transparent 38%),
        radial-gradient(circle at 85% 10%, rgba(255, 138, 31, 0.10), transparent 34%),
        #080d16;
      color: #f6f8fb;
    }

    .pcf-site-feedback::before {
      content: "";
      position: absolute;
      inset: 0;
      pointer-events: none;
      background-image:
        linear-gradient(rgba(255,255,255,.018) 1px, transparent 1px),
        linear-gradient(90deg, rgba(255,255,255,.018) 1px, transparent 1px);
      background-size: 36px 36px;
      mask-image: linear-gradient(to bottom, rgba(0,0,0,.55), transparent 90%);
    }

    .pcf-site-feedback__inner {
      position: relative;
      z-index: 1;
      width: min(1180px, 100%);
      margin: 0 auto;
      display: grid;
      grid-template-columns: minmax(240px, .8fr) minmax(0, 1.7fr);
      gap: clamp(24px, 4vw, 54px);
      align-items: center;
    }

    .pcf-site-feedback__eyebrow {
      margin: 0 0 10px;
      color: #ff8a1f;
      font: 800 .82rem/1.2 Inter, system-ui, sans-serif;
      letter-spacing: .15em;
      text-transform: uppercase;
    }

    .pcf-site-feedback h2 {
      margin: 0 0 12px;
      color: #ffffff;
      font: 800 clamp(1.8rem, 3vw, 2.8rem)/1 Barlow Condensed, Inter, system-ui, sans-serif;
      letter-spacing: .01em;
      text-transform: uppercase;
    }

    .pcf-site-feedback__intro > p:last-child {
      max-width: 540px;
      margin: 0;
      color: #aab4c3;
      font: 500 .98rem/1.65 Inter, system-ui, sans-serif;
    }

    .pcf-site-feedback__cards {
      display: grid;
      grid-template-columns: minmax(190px, .72fr) minmax(300px, 1.28fr);
      gap: 16px;
    }

    .pcf-site-feedback__card {
      min-width: 0;
      border: 1px solid rgba(255,255,255,.1);
      border-radius: 15px;
      background: linear-gradient(145deg, rgba(20,28,41,.96), rgba(11,17,28,.96));
      box-shadow: 0 18px 46px rgba(0,0,0,.24);
    }

    .pcf-site-feedback__visitors {
      display: flex;
      min-height: 190px;
      padding: 24px;
      flex-direction: column;
      justify-content: center;
      text-align: center;
    }

    .pcf-site-feedback__label {
      color: #aeb8c7;
      font: 800 .76rem/1.2 Inter, system-ui, sans-serif;
      letter-spacing: .12em;
      text-transform: uppercase;
    }

    .pcf-site-feedback__number {
      display: block;
      margin: 8px 0 5px;
      color: #ffffff;
      font: 900 clamp(2.6rem, 6vw, 4.5rem)/.95 Barlow Condensed, Inter, system-ui, sans-serif;
      letter-spacing: .02em;
      font-variant-numeric: tabular-nums;
    }

    .pcf-site-feedback__note {
      color: #778397;
      font: 600 .76rem/1.4 Inter, system-ui, sans-serif;
    }

    .pcf-site-feedback__rating {
      min-height: 190px;
      padding: 22px 24px;
      display: grid;
      grid-template-columns: minmax(110px, .65fr) minmax(190px, 1.35fr);
      gap: 18px;
      align-items: center;
    }

    .pcf-site-feedback__score {
      margin: 7px 0 3px;
      color: #ffffff;
      font: 900 clamp(2.2rem, 4vw, 3.6rem)/1 Barlow Condensed, Inter, system-ui, sans-serif;
      font-variant-numeric: tabular-nums;
    }

    .pcf-site-feedback__score small {
      color: #8792a4;
      font-size: .45em;
      font-family: Inter, system-ui, sans-serif;
      font-weight: 700;
    }

    .pcf-site-feedback__rating-count {
      margin: 0;
      color: #808b9d;
      font: 600 .8rem/1.4 Inter, system-ui, sans-serif;
    }

    .pcf-site-feedback__question {
      margin: 0 0 10px;
      color: #dbe1e9;
      font: 700 .88rem/1.35 Inter, system-ui, sans-serif;
    }

    .pcf-site-feedback__stars {
      display: flex;
      flex-wrap: nowrap;
      gap: 5px;
    }

    .pcf-site-feedback__star {
      appearance: none;
      width: 42px;
      height: 42px;
      padding: 0;
      border: 1px solid rgba(255, 138, 31, .38);
      border-radius: 9px;
      background: rgba(255, 138, 31, .055);
      color: #586273;
      cursor: pointer;
      font: 900 1.55rem/1 Inter, system-ui, sans-serif;
      transition: transform .16s ease, color .16s ease, border-color .16s ease, background .16s ease, box-shadow .16s ease;
    }

    .pcf-site-feedback__star:hover,
    .pcf-site-feedback__star:focus-visible {
      transform: translateY(-2px);
      outline: none;
      border-color: #ff8a1f;
      box-shadow: 0 0 0 3px rgba(255, 138, 31, .13);
    }

    .pcf-site-feedback__star.is-filled {
      color: #ff9a2f;
      border-color: rgba(255, 138, 31, .72);
      background: rgba(255, 138, 31, .13);
      text-shadow: 0 0 18px rgba(255, 138, 31, .35);
    }

    .pcf-site-feedback__star:disabled {
      cursor: wait;
      opacity: .66;
      transform: none;
    }

    .pcf-site-feedback__status {
      min-height: 1.25em;
      margin: 9px 0 0;
      color: #7f8a9b;
      font: 600 .75rem/1.35 Inter, system-ui, sans-serif;
    }

    .pcf-site-feedback__status.is-success { color: #9fdaa8; }
    .pcf-site-feedback__status.is-error { color: #efacac; }

    @media (max-width: 920px) {
      .pcf-site-feedback__inner { grid-template-columns: 1fr; }
      .pcf-site-feedback__intro { text-align: center; }
      .pcf-site-feedback__intro > p:last-child { margin-inline: auto; }
    }

    @media (max-width: 650px) {
      .pcf-site-feedback { padding-inline: 14px; }
      .pcf-site-feedback__cards { grid-template-columns: 1fr; }
      .pcf-site-feedback__visitors { min-height: 150px; }
      .pcf-site-feedback__rating {
        min-height: 0;
        grid-template-columns: 1fr;
        text-align: center;
      }
      .pcf-site-feedback__stars { justify-content: center; }
    }

    @media (max-width: 370px) {
      .pcf-site-feedback__rating { padding-inline: 14px; }
      .pcf-site-feedback__star { width: 38px; height: 38px; }
    }
  `;

  function addStyles() {
    if (document.getElementById("pcf-site-feedback-styles")) return;
    const style = document.createElement("style");
    style.id = "pcf-site-feedback-styles";
    style.textContent = styles;
    document.head.appendChild(style);
  }

  function createVisitorKey() {
    const randomId =
      window.crypto && typeof window.crypto.randomUUID === "function"
        ? window.crypto.randomUUID()
        : `${Date.now().toString(36)}_${Math.random().toString(36).slice(2)}_${Math.random()
            .toString(36)
            .slice(2)}`;
    return `pcf_${randomId}`;
  }

  function getVisitorKey() {
    try {
      let key = window.localStorage.getItem(STORAGE_KEY);
      if (!key) {
        key = createVisitorKey();
        window.localStorage.setItem(STORAGE_KEY, key);
      }
      return key;
    } catch (_error) {
      if (!window.__PCF_TEMP_VISITOR_KEY__) {
        window.__PCF_TEMP_VISITOR_KEY__ = createVisitorKey();
      }
      return window.__PCF_TEMP_VISITOR_KEY__;
    }
  }

  function buildWidget() {
    if (document.querySelector("[data-pcf-site-feedback]")) {
      return document.querySelector("[data-pcf-site-feedback]");
    }

    const section = document.createElement("section");
    section.className = "pcf-site-feedback";
    section.setAttribute("data-pcf-site-feedback", "");
    section.setAttribute("aria-labelledby", "pcf-site-feedback-title");
    section.innerHTML = `
      <div class="pcf-site-feedback__inner">
        <div class="pcf-site-feedback__intro">
          <p class="pcf-site-feedback__eyebrow">Forge community</p>
          <h2 id="pcf-site-feedback-title">Help Shape Plasma Cut Forge</h2>
          <p>See how the Forge is growing and tell us how the website is working for you.</p>
        </div>

        <div class="pcf-site-feedback__cards">
          <article class="pcf-site-feedback__card pcf-site-feedback__visitors" aria-label="Site visitor count">
            <span class="pcf-site-feedback__label">Site visitors</span>
            <strong class="pcf-site-feedback__number" data-pcf-visitor-count>—</strong>
            <small class="pcf-site-feedback__note">Unique browsers counted</small>
          </article>

          <article class="pcf-site-feedback__card pcf-site-feedback__rating" aria-label="Website rating">
            <div>
              <span class="pcf-site-feedback__label">Website rating</span>
              <div class="pcf-site-feedback__score"><span data-pcf-rating-average>—</span><small>/5</small></div>
              <p class="pcf-site-feedback__rating-count"><span data-pcf-rating-count>—</span> ratings</p>
            </div>

            <div>
              <p class="pcf-site-feedback__question">How would you rate the website?</p>
              <div class="pcf-site-feedback__stars" role="radiogroup" aria-label="Rate Plasma Cut Forge from 1 to 5 stars">
                ${[1, 2, 3, 4, 5]
                  .map(
                    (rating) =>
                      `<button class="pcf-site-feedback__star" type="button" role="radio" aria-checked="false" aria-label="${rating} out of 5 stars" data-pcf-rating="${rating}">★</button>`
                  )
                  .join("")}
              </div>
              <p class="pcf-site-feedback__status" data-pcf-rating-status aria-live="polite">Select a star to rate the website.</p>
            </div>
          </article>
        </div>
      </div>
    `;

    const footer = document.querySelector("footer.site-footer") || document.querySelector("footer");
    if (footer && footer.parentNode) {
      footer.parentNode.insertBefore(section, footer);
    } else {
      document.body.appendChild(section);
    }
    return section;
  }

  async function callRpc(functionName, payload) {
    if (!SUPABASE_URL || !SUPABASE_KEY) {
      throw new Error("Missing Supabase configuration.");
    }

    const response = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${functionName}`, {
      method: "POST",
      headers: {
        apikey: SUPABASE_KEY,
        Authorization: `Bearer ${SUPABASE_KEY}`,
        "Content-Type": "application/json"
      },
      body: JSON.stringify(payload)
    });

    if (!response.ok) {
      const message = await response.text();
      throw new Error(message || `Request failed with status ${response.status}.`);
    }

    const data = await response.json();
    return Array.isArray(data) ? data[0] || {} : data || {};
  }

  function formatCount(value) {
    const number = Number(value);
    return Number.isFinite(number) ? new Intl.NumberFormat().format(number) : "—";
  }

  function normalizeStats(data) {
    return {
      visitorCount: Number(data.visitor_count ?? 0),
      averageRating: Number(data.average_rating ?? 0),
      ratingCount: Number(data.rating_count ?? 0),
      visitorRating:
        data.visitor_rating === null || data.visitor_rating === undefined
          ? null
          : Number(data.visitor_rating)
    };
  }

  function initWidget(section) {
    const visitorCount = section.querySelector("[data-pcf-visitor-count]");
    const ratingAverage = section.querySelector("[data-pcf-rating-average]");
    const ratingCount = section.querySelector("[data-pcf-rating-count]");
    const ratingStatus = section.querySelector("[data-pcf-rating-status]");
    const starButtons = [...section.querySelectorAll("[data-pcf-rating]")];
    const visitorKey = getVisitorKey();
    let selectedRating = null;
    let isSaving = false;

    function showStars(value) {
      starButtons.forEach((button) => {
        const rating = Number(button.dataset.pcfRating);
        const isFilled = value !== null && rating <= value;
        button.classList.toggle("is-filled", isFilled);
        button.setAttribute("aria-checked", String(value === rating));
      });
    }

    function displayStats(rawData) {
      const stats = normalizeStats(rawData);
      selectedRating = stats.visitorRating;
      visitorCount.textContent = formatCount(stats.visitorCount);
      ratingCount.textContent = formatCount(stats.ratingCount);
      ratingAverage.textContent = stats.ratingCount > 0 ? stats.averageRating.toFixed(1) : "—";
      showStars(selectedRating);
    }

    function setSaving(saving) {
      isSaving = saving;
      starButtons.forEach((button) => {
        button.disabled = saving;
      });
    }

    starButtons.forEach((button) => {
      const rating = Number(button.dataset.pcfRating);

      button.addEventListener("mouseenter", () => {
        if (!isSaving) showStars(rating);
      });

      button.addEventListener("focus", () => {
        if (!isSaving) showStars(rating);
      });

      button.addEventListener("click", async () => {
        if (isSaving) return;
        setSaving(true);
        ratingStatus.className = "pcf-site-feedback__status";
        ratingStatus.textContent = "Saving your rating…";

        try {
          const data = await callRpc("pcf_submit_site_rating", {
            p_visitor_key: visitorKey,
            p_rating: rating
          });
          displayStats(data);
          ratingStatus.classList.add("is-success");
          ratingStatus.textContent = `Thank you — your ${rating}-star rating was saved.`;
        } catch (error) {
          console.error("Plasma Cut Forge rating error:", error);
          showStars(selectedRating);
          ratingStatus.classList.add("is-error");
          ratingStatus.textContent = "The rating could not be saved. Please try again.";
        } finally {
          setSaving(false);
        }
      });
    });

    const starGroup = section.querySelector(".pcf-site-feedback__stars");
    starGroup.addEventListener("mouseleave", () => showStars(selectedRating));
    starGroup.addEventListener("focusout", (event) => {
      if (!starGroup.contains(event.relatedTarget)) showStars(selectedRating);
    });

    callRpc("pcf_register_site_visitor", { p_visitor_key: visitorKey })
      .then((data) => {
        displayStats(data);
        if (selectedRating !== null) {
          ratingStatus.textContent = `Your current rating is ${selectedRating} out of 5. Select another star to change it.`;
        }
      })
      .catch((error) => {
        console.error("Plasma Cut Forge visitor counter error:", error);
        ratingStatus.classList.add("is-error");
        ratingStatus.textContent = "Visitor and rating totals are temporarily unavailable.";
      });
  }

  function start() {
    addStyles();
    const section = buildWidget();
    initWidget(section);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", start, { once: true });
  } else {
    start();
  }
})();

(() => {
  "use strict";

  function routeMembershipNavigationToPortal() {
    const membershipLinks = document.querySelectorAll(
      'a.membership-nav-button, header nav a[href*="ko-fi.com/plasmacutforge/tiers"], .site-header a[href*="ko-fi.com/plasmacutforge/tiers"]'
    );

    membershipLinks.forEach((link) => {
      link.setAttribute("href", "/members.html");
      link.removeAttribute("target");
      link.removeAttribute("rel");
      link.setAttribute("aria-label", "Open Plasma Cut Forge member portal");
    });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", routeMembershipNavigationToPortal, {
      once: true
    });
  } else {
    routeMembershipNavigationToPortal();
  }
})();

(() => {
  "use strict";

  function startPublicMemberCount() {
    const header = document.querySelector(".site-header");
    const searchForm = header?.querySelector(".global-search-form");

    if (!header || !searchForm || header.querySelector("[data-public-member-count]")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pcf-public-member-count-styles";
    style.textContent = `
      .site-header {
        position: relative;
      }

      .pcf-public-member-count {
        position: absolute;
        top: calc(100% + 14px);
        right: 18px;
        z-index: 30;
        display: grid;
        grid-template-columns: auto minmax(120px, 1fr);
        align-items: center;
        gap: 2px 12px;
        min-width: 244px;
        padding: 12px 15px;
        color: #eef5ff;
        text-decoration: none;
        background: rgba(8, 18, 28, 0.97);
        border: 1px solid rgba(0, 213, 255, 0.58);
        border-radius: 12px;
        box-shadow: 0 12px 30px rgba(0, 0, 0, 0.28);
        backdrop-filter: blur(8px);
        transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
      }

      .pcf-public-member-count:hover,
      .pcf-public-member-count:focus-visible {
        color: #ffffff;
        background: rgba(9, 28, 40, 0.99);
        border-color: #00d5ff;
        transform: translateY(-2px);
      }

      .pcf-public-member-count-number {
        grid-row: 1 / span 2;
        min-width: 54px;
        color: #00d5ff;
        font-family: "Barlow Condensed", Inter, system-ui, sans-serif;
        font-size: clamp(1.75rem, 2.2vw, 2.4rem);
        font-weight: 900;
        line-height: 1;
        text-align: center;
        font-variant-numeric: tabular-nums;
      }

      .pcf-public-member-count-title {
        align-self: end;
        color: #f5f8fc;
        font-family: Inter, system-ui, sans-serif;
        font-size: 0.78rem;
        font-weight: 900;
        line-height: 1.15;
        letter-spacing: 0.09em;
        text-transform: uppercase;
      }

      .pcf-public-member-count-cta {
        align-self: start;
        color: #9eb9dc;
        font-family: Inter, system-ui, sans-serif;
        font-size: 0.72rem;
        font-weight: 700;
        line-height: 1.25;
      }

      .pcf-public-member-count.is-loading .pcf-public-member-count-number {
        animation: pcf-member-count-pulse 1.1s ease-in-out infinite;
      }

      .pcf-public-member-count.is-error {
        border-color: rgba(255, 171, 64, 0.58);
      }

      .pcf-public-member-count.is-error .pcf-public-member-count-number {
        color: #ffb24d;
      }

      @keyframes pcf-member-count-pulse {
        0%, 100% { opacity: 0.45; }
        50% { opacity: 1; }
      }

      @media (max-width: 1050px) {
        .pcf-public-member-count {
          right: 12px;
          min-width: 220px;
          padding: 10px 12px;
        }
      }

      @media (max-width: 780px) {
        .pcf-public-member-count {
          display: none;
        }
      }

      @media (prefers-reduced-motion: reduce) {
        .pcf-public-member-count,
        .pcf-public-member-count.is-loading .pcf-public-member-count-number {
          transition: none;
          animation: none;
        }
      }
    `;
    document.head.appendChild(style);

    const badge = document.createElement("a");
    badge.className = "pcf-public-member-count is-loading";
    badge.href = "/members.html";
    badge.setAttribute("data-public-member-count", "");
    badge.setAttribute("aria-label", "View Plasma Cut Forge membership");
    badge.innerHTML = `
      <strong class="pcf-public-member-count-number" data-public-member-count-value>—</strong>
      <span class="pcf-public-member-count-title">Active Forge Members</span>
      <span class="pcf-public-member-count-cta">Join the Forge →</span>
    `;
    header.appendChild(badge);

    const valueNode = badge.querySelector("[data-public-member-count-value]");
    const titleNode = badge.querySelector(".pcf-public-member-count-title");
    const ctaNode = badge.querySelector(".pcf-public-member-count-cta");
    const config = window.PLASMA_FEEDBACK_CONFIG || {};
    const projectUrl = String(
      config.supabaseUrl || "https://rgovijwnalhlivhdtpen.supabase.co"
    ).replace(/\/+$/, "");
    const publishableKey = String(
      config.supabasePublishableKey ||
        "sb_publishable_P0KTOF8cBoVC0YlwOgpGtw_E1MLyiCW"
    );

    function renderCount(rawCount) {
      const count = Number(rawCount);

      if (!Number.isFinite(count) || count < 0) {
        throw new Error("The member-count response was not a valid number.");
      }

      const rounded = Math.floor(count);
      const formatted = rounded.toLocaleString("en-US");
      valueNode.textContent = formatted;
      titleNode.textContent = rounded === 1 ? "Active Forge Member" : "Active Forge Members";
      ctaNode.textContent = "Join the Forge →";
      badge.setAttribute(
        "aria-label",
        `${formatted} active Forge ${rounded === 1 ? "member" : "members"}. Open membership.`
      );
      badge.classList.remove("is-loading", "is-error");
    }

    function showError(error) {
      console.error("Plasma Cut Forge member count could not be loaded.", error);
      valueNode.textContent = "!";
      titleNode.textContent = "Member Count Unavailable";
      ctaNode.textContent = "Open Membership →";
      badge.classList.remove("is-loading");
      badge.classList.add("is-error");
    }

    fetch(`${projectUrl}/rest/v1/rpc/pcf_active_member_count`, {
      method: "POST",
      headers: {
        apikey: publishableKey,
        Authorization: `Bearer ${publishableKey}`,
        "Content-Type": "application/json"
      },
      body: "{}"
    })
      .then(async (response) => {
        if (!response.ok) {
          const details = await response.text();
          throw new Error(
            `Member-count request failed with status ${response.status}: ${details}`
          );
        }
        return response.json();
      })
      .then((payload) => {
        const count =
          typeof payload === "number" || typeof payload === "string"
            ? payload
            : Array.isArray(payload)
              ? payload[0]?.pcf_active_member_count ??
                payload[0]?.active_paid_members ??
                payload[0]?.count ??
                payload[0]
              : payload?.pcf_active_member_count ??
                payload?.active_paid_members ??
                payload?.count;
        renderCount(count);
      })
      .catch(showError);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", startPublicMemberCount, { once: true });
  } else {
    startPublicMemberCount();
  }
})();
