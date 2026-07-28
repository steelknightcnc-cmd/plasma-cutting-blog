(() => {
  "use strict";

  const widgets = [...document.querySelectorAll("[data-membership-widget]")];

  if (widgets.length) {
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

        if (!expanded) {
          window.clearTimeout(autoTimer);
        }
      });

      // Start open on every page, then collapse after 15 seconds.
      setExpanded(true);
      startAutoCollapse();
    });
  }
})();

(() => {
  "use strict";

  const header = document.querySelector(".site-header");
  const searchForm = header?.querySelector(".global-search-form");

  if (!header || !searchForm || header.querySelector("[data-public-member-count]")) {
    return;
  }

  const style = document.createElement("style");
  style.textContent = `
    .site-header {
      position: relative;
    }

    .pcf-public-member-count {
      position: absolute;
      top: calc(100% + 14px);
      right: 18px;
      z-index: 18;
      display: grid;
      grid-template-columns: auto 1fr;
      align-items: center;
      gap: 2px 12px;
      min-width: 244px;
      padding: 12px 15px;
      color: #eef5ff;
      text-decoration: none;
      background: rgba(8, 18, 28, 0.96);
      border: 1px solid rgba(0, 213, 255, 0.58);
      border-radius: 12px;
      box-shadow: 0 12px 30px rgba(0, 0, 0, 0.22);
      backdrop-filter: blur(8px);
      transition: border-color 160ms ease, transform 160ms ease, background 160ms ease;
    }

    .pcf-public-member-count:hover,
    .pcf-public-member-count:focus-visible {
      color: #ffffff;
      background: rgba(9, 28, 40, 0.98);
      border-color: #00d5ff;
      transform: translateY(-2px);
    }

    .pcf-public-member-count-number {
      grid-row: 1 / span 2;
      min-width: 54px;
      font-family: inherit;
      font-size: clamp(1.75rem, 2.2vw, 2.4rem);
      font-weight: 900;
      line-height: 1;
      text-align: center;
      color: #00d5ff;
    }

    .pcf-public-member-count-title {
      align-self: end;
      font-size: 0.78rem;
      font-weight: 900;
      line-height: 1.15;
      letter-spacing: 0.09em;
      text-transform: uppercase;
    }

    .pcf-public-member-count-cta {
      align-self: start;
      color: #9eb9dc;
      font-size: 0.72rem;
      font-weight: 700;
      line-height: 1.25;
    }

    .pcf-public-member-count.is-loading .pcf-public-member-count-number {
      animation: pcf-member-count-pulse 1.1s ease-in-out infinite;
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
  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || "").replace(/\/+$/, "");
  const publishableKey = String(config.supabasePublishableKey || "");
  const configured =
    projectUrl.startsWith("https://") &&
    publishableKey.length > 20 &&
    !projectUrl.includes("YOUR-PROJECT") &&
    !publishableKey.includes("YOUR_PUBLISHABLE_KEY");

  function renderCount(rawCount) {
    const count = Number(rawCount);

    if (!Number.isFinite(count) || count < 0) {
      throw new Error("The member-count response was not a valid number.");
    }

    const rounded = Math.floor(count);
    valueNode.textContent = rounded.toLocaleString("en-US");
    titleNode.textContent = rounded === 1 ? "Active Forge Member" : "Active Forge Members";
    badge.setAttribute(
      "aria-label",
      `${rounded.toLocaleString("en-US")} active Forge ${rounded === 1 ? "member" : "members"}. Open membership.`
    );
    badge.classList.remove("is-loading");
  }

  async function loadMemberCount() {
    if (!configured) {
      badge.remove();
      return;
    }

    try {
      const response = await fetch(
        `${projectUrl}/rest/v1/rpc/pcf_active_member_count`,
        {
          method: "POST",
          headers: {
            apikey: publishableKey,
            Authorization: `Bearer ${publishableKey}`,
            "Content-Type": "application/json"
          },
          body: "{}"
        }
      );

      if (!response.ok) {
        throw new Error(`Member-count request failed with status ${response.status}.`);
      }

      const payload = await response.json();
      const count =
        typeof payload === "number" || typeof payload === "string"
          ? payload
          : Array.isArray(payload)
            ? payload[0]?.pcf_active_member_count ?? payload[0]?.active_paid_members ?? payload[0]
            : payload?.pcf_active_member_count ?? payload?.active_paid_members ?? payload?.count;

      renderCount(count);
    } catch (error) {
      console.error("Plasma Cut Forge member count could not be loaded.", error);
      badge.remove();
    }
  }

  loadMemberCount();
})();
