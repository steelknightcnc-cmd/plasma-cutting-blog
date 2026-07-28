(() => {
  "use strict";

  const MEASUREMENT_ID = "G-DWMTYJPMH9";
  const CONSENT_KEY = "pcf_analytics_consent";
  const BANNER_ID = "pcf-analytics-consent";
  const SETTINGS_BUTTON_ID = "pcf-cookie-settings";

  function getStoredConsent() {
    try {
      return localStorage.getItem(CONSENT_KEY);
    } catch (error) {
      return null;
    }
  }

  function setStoredConsent(value) {
    try {
      localStorage.setItem(CONSENT_KEY, value);
    } catch (error) {
      console.warn("Consent preference could not be saved.");
    }
  }

  function initializeDataLayer() {
    window.dataLayer = window.dataLayer || [];

    window.gtag =
      window.gtag ||
      function () {
        window.dataLayer.push(arguments);
      };
  }

  function loadGoogleAnalytics() {
    if (window.__pcfAnalyticsLoaded) {
      return;
    }

    window.__pcfAnalyticsLoaded = true;
    initializeDataLayer();

    /*
     * Basic Consent Mode:
     * Nothing is sent to Google before the visitor accepts.
     */
    window.gtag("consent", "default", {
      analytics_storage: "denied",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });

    window.gtag("consent", "update", {
      analytics_storage: "granted",
      ad_storage: "denied",
      ad_user_data: "denied",
      ad_personalization: "denied"
    });

    window.gtag("js", new Date());

    window.gtag("config", MEASUREMENT_ID, {
      send_page_view: true
    });

    const analyticsScript = document.createElement("script");
    analyticsScript.async = true;
    analyticsScript.src =
      "https://www.googletagmanager.com/gtag/js?id=" +
      encodeURIComponent(MEASUREMENT_ID);

    analyticsScript.onerror = function () {
      window.__pcfAnalyticsLoaded = false;
      console.warn("Google Analytics could not be loaded.");
    };

    document.head.appendChild(analyticsScript);
  }

  function deleteAnalyticsCookies() {
    const cookies = document.cookie ? document.cookie.split(";") : [];
    const hostname = window.location.hostname;

    cookies.forEach((cookie) => {
      const cookieName = cookie.split("=")[0].trim();

      if (
        cookieName === "_gid" ||
        cookieName === "_gat" ||
        cookieName.startsWith("_ga")
      ) {
        document.cookie =
          cookieName +
          "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/";

        document.cookie =
          cookieName +
          "=; expires=Thu, 01 Jan 1970 00:00:00 GMT; path=/; domain=." +
          hostname;
      }
    });
  }

  function removeBanner() {
    const banner = document.getElementById(BANNER_ID);

    if (banner) {
      banner.remove();
    }
  }

  function showSettingsButton() {
    if (document.getElementById(SETTINGS_BUTTON_ID)) {
      return;
    }

    const button = document.createElement("button");
    button.id = SETTINGS_BUTTON_ID;
    button.type = "button";
    button.textContent = "Cookie settings";
    button.setAttribute("aria-label", "Open cookie and analytics settings");

    button.addEventListener("click", showConsentBanner);

    document.body.appendChild(button);
  }

  function acceptAnalytics() {
    setStoredConsent("granted");
    removeBanner();
    loadGoogleAnalytics();
    showSettingsButton();
  }

  function rejectAnalytics() {
    const analyticsWasLoaded = Boolean(window.__pcfAnalyticsLoaded);

    if (analyticsWasLoaded) {
      initializeDataLayer();

      window.gtag("consent", "update", {
        analytics_storage: "denied",
        ad_storage: "denied",
        ad_user_data: "denied",
        ad_personalization: "denied"
      });
    }

    setStoredConsent("denied");
    deleteAnalyticsCookies();
    removeBanner();
    showSettingsButton();

    /*
     * Reload only when Analytics had already been active.
     * The stored rejection prevents it from loading again.
     */
    if (analyticsWasLoaded) {
      window.location.reload();
    }
  }

  function showConsentBanner() {
    removeBanner();

    const banner = document.createElement("section");
    banner.id = BANNER_ID;
    banner.setAttribute("role", "dialog");
    banner.setAttribute("aria-modal", "false");
    banner.setAttribute("aria-label", "Analytics cookie choices");

    banner.innerHTML = `
      <div class="pcf-consent-content">
        <div class="pcf-consent-copy">
          <strong>Your privacy choices</strong>
          <p>
            Plasma Cut Forge uses optional Google Analytics cookies to understand
            website traffic and improve its calculators, guides, and technical
            resources. Analytics remains off unless you accept.
          </p>
          <a href="/privacy-policy.html">Read the Privacy Policy</a>
        </div>

        <div class="pcf-consent-actions">
          <button type="button" class="pcf-consent-reject">
            Reject analytics
          </button>

          <button type="button" class="pcf-consent-accept">
            Accept analytics
          </button>
        </div>
      </div>
    `;

    banner
      .querySelector(".pcf-consent-reject")
      .addEventListener("click", rejectAnalytics);

    banner
      .querySelector(".pcf-consent-accept")
      .addEventListener("click", acceptAnalytics);

    document.body.appendChild(banner);
  }

  function addConsentStyles() {
    if (document.getElementById("pcf-consent-styles")) {
      return;
    }

    const style = document.createElement("style");
    style.id = "pcf-consent-styles";

    style.textContent = `
      #pcf-analytics-consent {
        position: fixed;
        left: 0;
        right: 0;
        bottom: 0;
        z-index: 100000;
        padding: 18px;
        background: rgba(13, 18, 24, 0.98);
        border-top: 1px solid rgba(255, 255, 255, 0.16);
        box-shadow: 0 -10px 30px rgba(0, 0, 0, 0.35);
        color: #ffffff;
        font-family: inherit;
      }

      .pcf-consent-content {
        width: min(1120px, 100%);
        margin: 0 auto;
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 24px;
      }

      .pcf-consent-copy {
        max-width: 760px;
      }

      .pcf-consent-copy strong {
        display: block;
        margin-bottom: 6px;
        font-size: 1.05rem;
      }

      .pcf-consent-copy p {
        margin: 0 0 7px;
        color: #e7eaed;
        line-height: 1.55;
      }

      .pcf-consent-copy a {
        color: #8fd3ff;
        text-decoration: underline;
      }

      .pcf-consent-actions {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        flex-shrink: 0;
      }

      .pcf-consent-actions button,
      #pcf-cookie-settings {
        min-height: 44px;
        padding: 10px 17px;
        border-radius: 7px;
        font: inherit;
        font-weight: 700;
        cursor: pointer;
      }

      .pcf-consent-reject {
        border: 1px solid #ffffff;
        background: transparent;
        color: #ffffff;
      }

      .pcf-consent-accept {
        border: 1px solid #f2a900;
        background: #f2a900;
        color: #111111;
      }

      .pcf-consent-actions button:focus-visible,
      #pcf-cookie-settings:focus-visible {
        outline: 3px solid #8fd3ff;
        outline-offset: 3px;
      }

      #pcf-cookie-settings {
        position: fixed;
        left: 14px;
        bottom: 14px;
        z-index: 99990;
        border: 1px solid rgba(255, 255, 255, 0.3);
        background: rgba(13, 18, 24, 0.94);
        color: #ffffff;
        box-shadow: 0 4px 18px rgba(0, 0, 0, 0.28);
        font-size: 0.86rem;
      }

      @media (max-width: 760px) {
        .pcf-consent-content {
          align-items: stretch;
          flex-direction: column;
          gap: 16px;
        }

        .pcf-consent-actions {
          display: grid;
          grid-template-columns: 1fr;
        }

        .pcf-consent-actions button {
          width: 100%;
        }
      }
    `;

    document.head.appendChild(style);
  }

  function initializeConsent() {
    addConsentStyles();

    const consent = getStoredConsent();

    if (consent === "granted") {
      loadGoogleAnalytics();
      showSettingsButton();
      return;
    }

    if (consent === "denied") {
      showSettingsButton();
      return;
    }

    showConsentBanner();
  }

  /*
   * Makes it possible to open the choices from another link or button later.
   */
  window.pcfOpenCookieSettings = showConsentBanner;

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", initializeConsent);
  } else {
    initializeConsent();
  }
})();
