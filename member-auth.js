(() => {
  'use strict';

  const config = window.PLASMA_FEEDBACK_CONFIG || {};
  const projectUrl = String(config.supabaseUrl || '').replace(/\/+$/, '');
  const publishableKey = String(config.supabasePublishableKey || '');
  const page = document.body?.dataset?.memberPage || '';
  const qs = (selector, root = document) => root.querySelector(selector);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  let recoveryMode = new URLSearchParams(window.location.search).get('reset') === '1';

  function setMessage(target, text, type = '') {
    if (!target) return;
    target.textContent = text;
    target.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function show(element, visible = true) {
    if (element) element.hidden = !visible;
  }

  function normalizeEmail(value) {
    return String(value || '').trim().toLowerCase();
  }

  function passwordIsValid(value) {
    return String(value || '').length >= 8;
  }

  function friendlyAuthError(error) {
    const message = String(error?.message || '').toLowerCase();
    if (message.includes('invalid login credentials')) {
      return 'The email or password is incorrect. Use Forgot / Set Password if this account previously used email-link sign-in.';
    }
    if (message.includes('email not confirmed')) {
      return 'Confirm your email address before signing in.';
    }
    if (message.includes('rate limit')) {
      return 'The email service limit has been reached. Password sign-in still works for existing accounts; account confirmation and password-reset email require the email limit to clear.';
    }
    if (message.includes('user already registered')) {
      return 'An account already exists for this email. Sign in or use Forgot / Set Password.';
    }
    return error?.message || 'The member account request could not be completed.';
  }

  if (!window.supabase || !projectUrl || !publishableKey) {
    qsa('[data-member-connection-status]').forEach((element) => {
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

  function passwordResetUrl() {
    return `${window.location.origin}/members.html?reset=1`;
  }

  function readCredentials(form) {
    return {
      email: normalizeEmail(form.elements.email?.value),
      password: String(form.elements.password?.value || '')
    };
  }

  function validateCredentials(email, password, messageTarget) {
    if (!email || !email.includes('@')) {
      setMessage(messageTarget, 'Enter the exact email address used for the $5 Ko-fi membership.', 'error');
      return false;
    }
    if (!passwordIsValid(password)) {
      setMessage(messageTarget, 'Enter a password containing at least 8 characters.', 'error');
      return false;
    }
    return true;
  }

  async function withBusy(button, busyText, task) {
    if (!button) return task();
    const original = button.textContent;
    button.disabled = true;
    button.textContent = busyText;
    try {
      return await task();
    } finally {
      button.disabled = false;
      button.textContent = original;
    }
  }

  async function signIn(form, button, messageTarget) {
    const { email, password } = readCredentials(form);
    if (!validateCredentials(email, password, messageTarget)) return;
    setMessage(messageTarget, '');

    await withBusy(button, 'Signing in…', async () => {
      try {
        const { error } = await client.auth.signInWithPassword({ email, password });
        if (error) throw error;
        setMessage(messageTarget, 'Signed in. Checking paid Forge Membership…', 'success');
      } catch (error) {
        console.error(error);
        setMessage(messageTarget, friendlyAuthError(error), 'error');
      }
    });
  }

  async function createAccount(form, button, messageTarget) {
    const { email, password } = readCredentials(form);
    if (!validateCredentials(email, password, messageTarget)) return;
    setMessage(messageTarget, '');

    await withBusy(button, 'Creating account…', async () => {
      try {
        const { data, error } = await client.auth.signUp({
          email,
          password,
          options: {
            emailRedirectTo: redirectUrl(),
            data: { pcf_member_account: true }
          }
        });
        if (error) throw error;

        if (data?.session) {
          setMessage(messageTarget, 'Account created. Checking paid Forge Membership…', 'success');
        } else {
          setMessage(messageTarget, 'Account created. Open the confirmation email once, then return and sign in with your password.', 'success');
        }
      } catch (error) {
        console.error(error);
        setMessage(messageTarget, friendlyAuthError(error), 'error');
      }
    });
  }

  async function requestPasswordReset(form, button, messageTarget) {
    const email = normalizeEmail(form.elements.email?.value);
    if (!email || !email.includes('@')) {
      setMessage(messageTarget, 'Enter the member email first, then select Forgot / Set Password.', 'error');
      return;
    }
    setMessage(messageTarget, '');

    await withBusy(button, 'Sending reset…', async () => {
      try {
        const { error } = await client.auth.resetPasswordForEmail(email, {
          redirectTo: passwordResetUrl()
        });
        if (error) throw error;
        setMessage(messageTarget, 'Check your email for the password setup link. This email is only needed when setting or recovering a password.', 'success');
      } catch (error) {
        console.error(error);
        setMessage(messageTarget, friendlyAuthError(error), 'error');
      }
    });
  }

  async function updatePassword(form, button, messageTarget) {
    const password = String(form.elements.new_password?.value || '');
    const confirm = String(form.elements.confirm_password?.value || '');
    if (!passwordIsValid(password)) {
      setMessage(messageTarget, 'Use a password containing at least 8 characters.', 'error');
      return;
    }
    if (password !== confirm) {
      setMessage(messageTarget, 'The two password entries do not match.', 'error');
      return;
    }

    setMessage(messageTarget, '');
    await withBusy(button, 'Saving password…', async () => {
      try {
        const { error } = await client.auth.updateUser({ password });
        if (error) throw error;
        form.reset();
        setMessage(messageTarget, 'Password saved. Future sign-ins will use your email and password without sending a new email.', 'success');
        if (recoveryMode) {
          recoveryMode = false;
          window.history.replaceState({}, document.title, '/members.html');
          const { data: { session } } = await client.auth.getSession();
          await initializeMembersHub(session);
        }
      } catch (error) {
        console.error(error);
        setMessage(messageTarget, friendlyAuthError(error), 'error');
      }
    });
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
    qsa('[data-member-login-form]').forEach((form) => {
      const message = qs('[data-member-login-message]', form) || qs('[data-member-connection-status]');

      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = qs('[data-auth-action="sign-in"]', form);
        await signIn(form, button, message);
      });

      qsa('[data-auth-action]', form).forEach((button) => {
        button.addEventListener('click', async () => {
          const action = button.dataset.authAction;
          if (action === 'sign-in') await signIn(form, button, message);
          if (action === 'create-account') await createAccount(form, button, message);
          if (action === 'reset-password') await requestPasswordReset(form, button, message);
        });
      });
    });

    qsa('[data-member-password-form]').forEach((form) => {
      form.addEventListener('submit', async (event) => {
        event.preventDefault();
        const button = qs('button[type="submit"]', form);
        const message = qs('[data-member-password-message]', form);
        await updatePassword(form, button, message);
      });
    });

    qsa('[data-member-signout]').forEach((button) => {
      button.addEventListener('click', signOut);
    });
  }

  function showRecoveryPanel() {
    show(qs('[data-member-guest]'), false);
    show(qs('[data-member-active]'), false);
    show(qs('[data-member-inactive]'), false);
    show(qs('[data-member-password-recovery]'), true);
    setMessage(qs('[data-member-connection-status]'), 'Create a new password for this member account.', 'success');
  }

  async function initializeMembersHub(session) {
    const guestPanel = qs('[data-member-guest]');
    const memberPanel = qs('[data-member-active]');
    const inactivePanel = qs('[data-member-inactive]');
    const recoveryPanel = qs('[data-member-password-recovery]');
    const accountEmails = qsa('[data-member-account-email]');
    const tierTargets = qsa('[data-member-tier]');
    const statusTarget = qs('[data-member-connection-status]');

    show(recoveryPanel, false);

    if (recoveryMode && session?.user) {
      showRecoveryPanel();
      return;
    }

    if (!session?.user) {
      show(guestPanel, true);
      show(memberPanel, false);
      show(inactivePanel, false);
      setMessage(statusTarget, 'Purchase the $5 Forge Membership, then sign in with the same Ko-fi email and your member password.');
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
          'This account is signed in, but an active paid $5 Forge Membership was not found for the same email.',
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
      setMessage(statusTarget, 'Sign in with your member email and password to open the quote builder.');
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

    if (page === 'builder') await initializeBuilder(session);
    else await initializeMembersHub(session);
  }

  client.auth.onAuthStateChange((event, session) => {
    if (event === 'PASSWORD_RECOVERY') {
      recoveryMode = true;
      window.setTimeout(showRecoveryPanel, 0);
      return;
    }

    if (['SIGNED_IN', 'SIGNED_OUT', 'USER_UPDATED'].includes(event)) {
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
