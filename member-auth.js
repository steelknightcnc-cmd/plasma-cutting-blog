(() => {
  'use strict';

  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const page = document.body?.dataset?.memberPage || '';
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function setMessage(target, text, type = '') {
    if (!target) return;
    target.textContent = text;
    target.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function show(element, visible = true) {
    if (element) element.hidden = !visible;
  }

  if (!window.supabase || !projectUrl || !publishableKey) {
    document.querySelectorAll('[data-member-connection-status]').forEach((element) => {
      setMessage(element, 'Member access is not connected to Supabase.', 'error');
    });
    return;
  }

  const client = window.supabase.createClient(projectUrl, publishableKey, {
    auth: {
      persistSession: true,
      autoRefreshToken: true,
      detectSessionInUrl: true
    }
  });

  window.PCF_MEMBER_AUTH = { client };

  function redirectUrl() {
    const path = page === 'builder' ? '/member-quote-builder.html' : '/members.html';
    return `${window.location.origin}${path}`;
  }

  async function sendMagicLink(email, button, messageTarget) {
    const normalizedEmail = String(email || '').trim().toLowerCase();
    if (!normalizedEmail || !normalizedEmail.includes('@')) {
      setMessage(messageTarget, 'Enter the email address used to purchase the $5 Forge Membership.', 'error');
      return;
    }

    button.disabled = true;
    const originalText = button.textContent;
    button.textContent = 'Sending secure link…';
    setMessage(messageTarget, '');

    try {
      const { error } = await client.auth.signInWithOtp({
        email: normalizedEmail,
        options: {
          shouldCreateUser: true,
          emailRedirectTo: redirectUrl(),
          data: { pcf_member_login: true }
        }
      });
      if (error) throw error;
      setMessage(messageTarget, 'Check your email and open the secure Plasma Cut Forge sign-in link.', 'success');
    } catch (error) {
      console.error(error);
      setMessage(messageTarget, error?.message || 'The secure sign-in link could not be sent.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = originalText;
    }
  }

  async function memberStatus() {
    const { data, error } = await client.rpc('pcf_my_membership');
    if (error) throw error;
    return data || { active: false, status: 'not_found' };
  }

  async function signOut() {
    await client.auth.signOut();
    window.location.href = '/members.html';
  }

  function bindLoginForms() {
    document.querySelectorAll('[data-member-login-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = qs('button[type="submit"]', form);
        const message = qs('[data-member-login-message]', form) || qs('[data-member-connection-status]');
        const email = form.elements.email?.value;
        await sendMagicLink(email, button, message);
      });
    });

    document.querySelectorAll('[data-member-signout]').forEach((button) => {
      button.addEventListener('click', signOut);
    });
  }

  async function initializeMembersHub(session) {
    const guestPanel = qs('[data-member-guest]');
    const memberPanel = qs('[data-member-active]');
    const inactivePanel = qs('[data-member-inactive]');
    const accountEmails = qsa('[data-member-account-email]');
    const tierTargets = qsa('[data-member-tier]');
    const statusTarget = qs('[data-member-connection-status]');

    if (!session?.user) {
      show(guestPanel, true);
      show(memberPanel, false);
      show(inactivePanel, false);
      setMessage(statusTarget, 'Purchase the $5 Forge Membership, then sign in with the same email address used on Ko-fi.');
      return;
    }

    accountEmails.forEach((target) => { target.textContent = session.user.email || 'signed-in member'; });
    setMessage(statusTarget, 'Checking Forge Member access…');

    try {
      const membership = await memberStatus();
      if (membership.active) {
        show(guestPanel, false);
        show(memberPanel, true);
        show(inactivePanel, false);
        tierTargets.forEach((target) => { target.textContent = membership.tier || 'Forge Member'; });
        setMessage(statusTarget, 'Forge Member access confirmed.', 'success');
      } else {
        show(guestPanel, false);
        show(memberPanel, false);
        show(inactivePanel, true);
        setMessage(
          statusTarget,
          'This email is signed in, but an active paid $5 Forge Membership was not found. Use the same email as Ko-fi or contact Plasma Cut Forge.',
          'warning'
        );
      }
    } catch (error) {
      console.error(error);
      show(guestPanel, false);
      show(memberPanel, false);
      show(inactivePanel, true);
      setMessage(statusTarget, 'Member status could not be checked. Please try again.', 'error');
    }
  }

  async function initializeBuilder(session) {
    const loading = qs('[data-member-loading]');
    const guestGate = qs('[data-member-guest]');
    const inactiveGate = qs('[data-member-inactive]');
    const app = qs('[data-member-tool]');
    const accountEmails = qsa('[data-member-account-email]');
    const tierTargets = qsa('[data-member-tier]');
    const statusTarget = qs('[data-member-connection-status]');

    show(loading, true);
    show(guestGate, false);
    show(inactiveGate, false);
    show(app, false);

    if (!session?.user) {
      show(loading, false);
      show(guestGate, true);
      setMessage(statusTarget, 'Sign in to open the member-only quote builder.');
      return;
    }

    accountEmails.forEach((target) => { target.textContent = session.user.email || 'signed-in member'; });
    setMessage(statusTarget, 'Checking Forge Member access…');

    try {
      const membership = await memberStatus();
      show(loading, false);
      if (!membership.active) {
        show(inactiveGate, true);
        setMessage(
          statusTarget,
          'You are signed in, but this email does not currently have an active paid $5 Forge Membership.',
          'warning'
        );
        return;
      }

      tierTargets.forEach((target) => { target.textContent = membership.tier || 'Forge Member'; });
      show(app, true);
      setMessage(statusTarget, 'Member access confirmed.', 'success');
      const context = { client, user: session.user, membership };
      window.PCF_MEMBER_CONTEXT = context;
      document.dispatchEvent(new CustomEvent('pcf:member-ready', { detail: context }));
    } catch (error) {
      console.error(error);
      show(loading, false);
      show(inactiveGate, true);
      setMessage(statusTarget, 'Member access could not be verified. Please try again.', 'error');
    }
  }

  async function initialize() {
    bindLoginForms();
    const { data: { session }, error } = await client.auth.getSession();
    if (error) console.error(error);

    if (page === 'builder') {
      await initializeBuilder(session);
    } else {
      await initializeMembersHub(session);
    }
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'SIGNED_IN' && session) {
      window.setTimeout(() => {
        if (page === 'builder') initializeBuilder(session);
        else initializeMembersHub(session);
      }, 0);
    }
  });

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', initialize, { once: true });
  } else {
    initialize();
  }
})();
