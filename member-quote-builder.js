(() => {
  'use strict';

  const MM_PER_INCH = 25.4;
  const PROFILE_KEY = 'pcf_member_company_profile_v1';
  const CURRENCIES = {
    USD: { symbol: '$', label: 'USD' },
    CAD: { symbol: 'CA$', label: 'CAD' },
    AUD: { symbol: 'A$', label: 'AUD' },
    EUR: { symbol: '€', label: 'EUR' }
  };

  const state = {
    context: null,
    currentQuoteId: null,
    items: [],
    logoDataUrl: '',
    calculations: null
  };

  const $ = (id) => document.getElementById(id);
  const qsa = (selector, root = document) => Array.from(root.querySelectorAll(selector));
  const value = (id, fallback = '') => $(id)?.value ?? fallback;
  const number = (id, fallback = 0) => {
    const parsed = Number.parseFloat(value(id));
    return Number.isFinite(parsed) ? parsed : fallback;
  };
  const round2 = (n) => Math.round((Number(n) + Number.EPSILON) * 100) / 100;
  const escapeHtml = (text) => String(text ?? '').replace(/[&<>"]/g, (char) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[char]));

  function currency() {
    const code = value('mq-currency', 'USD');
    return CURRENCIES[code] ? code : 'USD';
  }

  function money(amount, code = currency()) {
    return new Intl.NumberFormat('en-US', {
      style: 'currency',
      currency: code,
      currencyDisplay: 'symbol'
    }).format(Number(amount) || 0);
  }

  function fixed(valueToFormat, digits = 2) {
    return new Intl.NumberFormat('en-US', {
      minimumFractionDigits: digits,
      maximumFractionDigits: digits
    }).format(Number(valueToFormat) || 0);
  }

  function formatDateInput(date) {
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, '0');
    const day = String(date.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  function generateQuoteNumber() {
    const now = new Date();
    const date = `${now.getFullYear()}${String(now.getMonth() + 1).padStart(2, '0')}${String(now.getDate()).padStart(2, '0')}`;
    const suffix = Math.floor(1000 + Math.random() * 9000);
    return `PCF-${date}-${suffix}`;
  }

  function blankItem(index = 1) {
    return {
      id: crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random()}`,
      description: `Plasma cut part ${index}`,
      material: 'Mild steel',
      thickness: 6,
      thicknessUnit: 'mm',
      cutLength: 1000,
      lengthUnit: 'mm',
      pierces: 1,
      quantity: 1,
      cutSpeed: 1800,
      pierceTime: 0.8,
      machineRate: 120,
      consumablePerPart: 0,
      materialPerPart: 0,
      laborMinutesPerPart: 0,
      laborRate: 65
    };
  }

  function itemField(item, key, label, type = 'number', extras = '') {
    const inputValue = escapeHtml(item[key]);
    return `<label class="mq-field"><span>${label}</span><input data-item-field="${key}" type="${type}" value="${inputValue}" ${extras}></label>`;
  }

  function renderItems() {
    const container = $('mq-items');
    if (!container) return;

    container.innerHTML = state.items.map((item, index) => {
      const calc = calculateItem(item);
      return `
        <article class="mq-item" data-item-id="${escapeHtml(item.id)}">
          <div class="mq-item-header">
            <h3>Part ${index + 1}</h3>
            <button class="mq-button danger" type="button" data-remove-item="${escapeHtml(item.id)}">Remove</button>
          </div>
          <div class="mq-grid three">
            ${itemField(item, 'description', 'Part description', 'text')}
            <label class="mq-field"><span>Material</span><select data-item-field="material">
              ${['Mild steel', 'Stainless steel', 'Aluminum', 'Other'].map((material) => `<option ${item.material === material ? 'selected' : ''}>${material}</option>`).join('')}
            </select></label>
            ${itemField(item, 'thickness', 'Thickness', 'number', 'min="0" step="0.1"')}
            <label class="mq-field"><span>Thickness unit</span><select data-item-field="thicknessUnit">
              <option value="mm" ${item.thicknessUnit === 'mm' ? 'selected' : ''}>mm</option>
              <option value="in" ${item.thicknessUnit === 'in' ? 'selected' : ''}>inches</option>
            </select></label>
            ${itemField(item, 'cutLength', 'Cut length per part', 'number', 'min="0" step="0.01"')}
            <label class="mq-field"><span>Cut length unit</span><select data-item-field="lengthUnit">
              <option value="mm" ${item.lengthUnit === 'mm' ? 'selected' : ''}>mm</option>
              <option value="in" ${item.lengthUnit === 'in' ? 'selected' : ''}>inches</option>
            </select></label>
            ${itemField(item, 'pierces', 'Pierces per part', 'number', 'min="0" step="1"')}
            ${itemField(item, 'quantity', 'Quantity', 'number', 'min="1" step="1"')}
            ${itemField(item, 'cutSpeed', 'Cut speed (mm/min)', 'number', 'min="1" step="1"')}
            ${itemField(item, 'pierceTime', 'Pierce time (sec)', 'number', 'min="0" step="0.1"')}
            ${itemField(item, 'machineRate', 'Machine rate / hour', 'number', 'min="0" step="0.01"')}
            ${itemField(item, 'consumablePerPart', 'Consumables / part', 'number', 'min="0" step="0.01"')}
            ${itemField(item, 'materialPerPart', 'Material cost / part', 'number', 'min="0" step="0.01"')}
            ${itemField(item, 'laborMinutesPerPart', 'Handling labor min / part', 'number', 'min="0" step="0.1"')}
            ${itemField(item, 'laborRate', 'Handling labor / hour', 'number', 'min="0" step="0.01"')}
          </div>
          <div class="mq-item-costs">
            <div><span>Machine time</span><strong data-item-cost="time">${fixed(calc.totalMachineMinutes, 2)} min</strong></div>
            <div><span>Direct cost</span><strong data-item-cost="direct">${money(calc.directCost)}</strong></div>
            <div><span>Sell total</span><strong data-item-cost="sell">${money(itemSellTotal(calc))}</strong></div>
            <div><span>Sell / part</span><strong data-item-cost="unit">${money(itemSellTotal(calc) / Math.max(1, calc.quantity))}</strong></div>
          </div>
        </article>`;
    }).join('');

    container.querySelectorAll('[data-item-field]').forEach((input) => {
      input.addEventListener('input', handleItemInput);
      input.addEventListener('change', handleItemInput);
    });
    container.querySelectorAll('[data-remove-item]').forEach((button) => {
      button.addEventListener('click', () => {
        if (state.items.length === 1) return;
        state.items = state.items.filter((item) => item.id !== button.dataset.removeItem);
        renderItems();
        calculateQuote();
      });
    });
  }

  function handleItemInput(event) {
    const card = event.target.closest('[data-item-id]');
    const item = state.items.find((entry) => entry.id === card?.dataset.itemId);
    if (!item) return;
    const key = event.target.dataset.itemField;
    if (!key) return;
    const numericKeys = new Set(['thickness', 'cutLength', 'pierces', 'quantity', 'cutSpeed', 'pierceTime', 'machineRate', 'consumablePerPart', 'materialPerPart', 'laborMinutesPerPart', 'laborRate']);
    item[key] = numericKeys.has(key) ? Number.parseFloat(event.target.value) || 0 : event.target.value;
    const calc = calculateItem(item);
    const sell = itemSellTotal(calc);
    const setCost = (role, text) => {
      const target = card.querySelector(`[data-item-cost="${role}"]`);
      if (target) target.textContent = text;
    };
    setCost('time', `${fixed(calc.totalMachineMinutes, 2)} min`);
    setCost('direct', money(calc.directCost));
    setCost('sell', money(sell));
    setCost('unit', money(sell / Math.max(1, calc.quantity)));
    calculateQuote();
  }

  function calculateItem(item) {
    const lengthMm = (Number(item.cutLength) || 0) * (item.lengthUnit === 'in' ? MM_PER_INCH : 1);
    const speed = Math.max(1, Number(item.cutSpeed) || 1);
    const quantity = Math.max(1, Math.round(Number(item.quantity) || 1));
    const cutSecondsPerPart = lengthMm / speed * 60;
    const pierceSecondsPerPart = Math.max(0, Number(item.pierces) || 0) * Math.max(0, Number(item.pierceTime) || 0);
    const machineSeconds = (cutSecondsPerPart + pierceSecondsPerPart) * quantity;
    const machineCost = machineSeconds / 3600 * Math.max(0, Number(item.machineRate) || 0);
    const consumableCost = Math.max(0, Number(item.consumablePerPart) || 0) * quantity;
    const materialCost = Math.max(0, Number(item.materialPerPart) || 0) * quantity;
    const laborCost = Math.max(0, Number(item.laborMinutesPerPart) || 0) / 60 * Math.max(0, Number(item.laborRate) || 0) * quantity;
    const directCost = machineCost + consumableCost + materialCost + laborCost;
    return {
      ...item,
      quantity,
      lengthMm,
      cutSecondsPerPart,
      pierceSecondsPerPart,
      machineSeconds,
      totalMachineMinutes: machineSeconds / 60,
      machineCost,
      consumableCost,
      materialCost,
      laborCost,
      directCost
    };
  }

  function pricingMethod() {
    return value('mq-pricing-method', 'markup');
  }

  function itemSellTotal(calc) {
    if (pricingMethod() === 'margin') {
      const margin = Math.min(95, Math.max(0, number('mq-profit-margin', 0))) / 100;
      return calc.directCost / Math.max(.05, 1 - margin);
    }
    const materialMultiplier = 1 + Math.max(0, number('mq-material-markup', 0)) / 100;
    const processingMultiplier = 1 + Math.max(0, number('mq-processing-markup', 0)) / 100;
    const processing = calc.machineCost + calc.consumableCost + calc.laborCost;
    return calc.materialCost * materialMultiplier + processing * processingMultiplier;
  }

  function additionalCosts() {
    const setup = number('mq-setup-hours') * number('mq-setup-rate');
    const design = number('mq-design-hours') * number('mq-design-rate');
    const finishing = number('mq-finishing-hours') * number('mq-finishing-rate');
    const delivery = number('mq-delivery');
    const other = number('mq-other-cost');
    return { setup, design, finishing, delivery, other, total: setup + design + finishing + delivery + other };
  }

  function sellAdditional(additional) {
    if (pricingMethod() === 'margin') {
      const margin = Math.min(95, Math.max(0, number('mq-profit-margin', 0))) / 100;
      return additional.total / Math.max(.05, 1 - margin);
    }
    return additional.total * (1 + Math.max(0, number('mq-processing-markup', 0)) / 100);
  }

  function calculateQuote() {
    const itemCalcs = state.items.map(calculateItem);
    const additional = additionalCosts();
    const itemsDirect = itemCalcs.reduce((sum, item) => sum + item.directCost, 0);
    const directCost = itemsDirect + additional.total;
    const itemSelling = itemCalcs.reduce((sum, item) => sum + itemSellTotal(item), 0);
    const grossSelling = itemSelling + sellAdditional(additional);
    const discount = grossSelling * Math.min(100, Math.max(0, number('mq-discount-percent'))) / 100 + Math.max(0, number('mq-discount-fixed'));
    const afterDiscount = Math.max(0, grossSelling - discount);
    const minimumCharge = Math.max(0, number('mq-minimum-charge'));
    const minimumAdjustment = Math.max(0, minimumCharge - afterDiscount);
    const taxableSubtotal = afterDiscount + minimumAdjustment;
    const tax = taxableSubtotal * Math.max(0, number('mq-tax-rate')) / 100;
    const total = taxableSubtotal + tax;
    const deposit = total * Math.min(100, Math.max(0, number('mq-deposit-percent'))) / 100;
    const grossProfit = total - tax - directCost;
    const actualMargin = taxableSubtotal > 0 ? grossProfit / taxableSubtotal * 100 : 0;

    state.calculations = {
      itemCalcs,
      additional,
      directCost,
      itemSelling,
      grossSelling,
      discount,
      minimumAdjustment,
      taxableSubtotal,
      tax,
      total,
      deposit,
      grossProfit,
      actualMargin
    };

    $('mq-direct-cost').textContent = money(directCost);
    $('mq-gross-profit').textContent = money(grossProfit);
    $('mq-actual-margin').textContent = `${fixed(actualMargin, 1)}%`;
    $('mq-deposit').textContent = money(deposit);
    $('mq-customer-total').textContent = money(total);

    $('mq-summary-breakdown').innerHTML = [
      ['Parts selling total', itemSelling],
      ['Additional work selling total', sellAdditional(additional)],
      ['Discount', -discount],
      ['Minimum-charge adjustment', minimumAdjustment],
      ['Tax / VAT', tax]
    ].map(([label, amount]) => `<div class="mq-summary-row"><span>${label}</span><strong>${money(amount)}</strong></div>`).join('');

    return state.calculations;
  }

  function updatePricingFields() {
    const method = pricingMethod();
    qsa('[data-pricing-field="material-markup"], [data-pricing-field="processing-markup"]').forEach((element) => element.classList.toggle('mq-hidden', method !== 'markup'));
    qsa('[data-pricing-field="margin"]').forEach((element) => element.classList.toggle('mq-hidden', method !== 'margin'));
    renderItems();
    calculateQuote();
  }

  function companyProfile() {
    return {
      name: value('mq-company-name'),
      contact: value('mq-company-contact'),
      email: value('mq-company-email'),
      phone: value('mq-company-phone'),
      address: value('mq-company-address'),
      taxId: value('mq-company-tax-id')
    };
  }

  function saveCompanyProfile() {
    try {
      localStorage.setItem(PROFILE_KEY, JSON.stringify(companyProfile()));
    } catch (error) {
      console.warn('Company profile could not be saved locally.', error);
    }
  }

  function loadCompanyProfile() {
    try {
      const profile = JSON.parse(localStorage.getItem(PROFILE_KEY) || '{}');
      const mapping = {
        name: 'mq-company-name', contact: 'mq-company-contact', email: 'mq-company-email',
        phone: 'mq-company-phone', address: 'mq-company-address', taxId: 'mq-company-tax-id'
      };
      Object.entries(mapping).forEach(([key, id]) => {
        if (profile[key]) $(id).value = profile[key];
      });
    } catch (error) {
      console.warn('Saved company profile could not be loaded.', error);
    }
  }

  function collectQuoteData() {
    const calculations = calculateQuote();
    return {
      version: 1,
      quoteTitle: value('mq-quote-title'),
      quoteNumber: value('mq-quote-number'),
      quoteDate: value('mq-quote-date'),
      validThrough: value('mq-valid-through'),
      company: companyProfile(),
      customer: {
        name: value('mq-customer-name'),
        contact: value('mq-customer-contact'),
        email: value('mq-customer-email'),
        address: value('mq-customer-address')
      },
      currency: currency(),
      items: state.items,
      additional: {
        setupHours: number('mq-setup-hours'), setupRate: number('mq-setup-rate'),
        designHours: number('mq-design-hours'), designRate: number('mq-design-rate'),
        finishingHours: number('mq-finishing-hours'), finishingRate: number('mq-finishing-rate'),
        delivery: number('mq-delivery'), otherCost: number('mq-other-cost'),
        otherDescription: value('mq-other-description')
      },
      pricing: {
        method: pricingMethod(),
        materialMarkup: number('mq-material-markup'),
        processingMarkup: number('mq-processing-markup'),
        profitMargin: number('mq-profit-margin'),
        minimumCharge: number('mq-minimum-charge'),
        discountPercent: number('mq-discount-percent'),
        discountFixed: number('mq-discount-fixed'),
        taxRate: number('mq-tax-rate'),
        depositPercent: number('mq-deposit-percent')
      },
      customerNotes: value('mq-customer-notes'),
      terms: value('mq-terms'),
      totals: calculations
    };
  }

  function applyQuoteData(data) {
    const set = (id, val) => { if ($(id) && val !== undefined && val !== null) $(id).value = val; };
    set('mq-quote-title', data.quoteTitle);
    set('mq-quote-number', data.quoteNumber);
    set('mq-quote-date', data.quoteDate);
    set('mq-valid-through', data.validThrough);
    set('mq-company-name', data.company?.name);
    set('mq-company-contact', data.company?.contact);
    set('mq-company-email', data.company?.email);
    set('mq-company-phone', data.company?.phone);
    set('mq-company-address', data.company?.address);
    set('mq-company-tax-id', data.company?.taxId);
    set('mq-customer-name', data.customer?.name);
    set('mq-customer-contact', data.customer?.contact);
    set('mq-customer-email', data.customer?.email);
    set('mq-customer-address', data.customer?.address);
    set('mq-currency', data.currency);
    state.items = Array.isArray(data.items) && data.items.length ? data.items : [blankItem()];
    const additional = data.additional || {};
    set('mq-setup-hours', additional.setupHours);
    set('mq-setup-rate', additional.setupRate);
    set('mq-design-hours', additional.designHours);
    set('mq-design-rate', additional.designRate);
    set('mq-finishing-hours', additional.finishingHours);
    set('mq-finishing-rate', additional.finishingRate);
    set('mq-delivery', additional.delivery);
    set('mq-other-cost', additional.otherCost);
    set('mq-other-description', additional.otherDescription);
    const pricing = data.pricing || {};
    set('mq-pricing-method', pricing.method);
    set('mq-material-markup', pricing.materialMarkup);
    set('mq-processing-markup', pricing.processingMarkup);
    set('mq-profit-margin', pricing.profitMargin);
    set('mq-minimum-charge', pricing.minimumCharge);
    set('mq-discount-percent', pricing.discountPercent);
    set('mq-discount-fixed', pricing.discountFixed);
    set('mq-tax-rate', pricing.taxRate);
    set('mq-deposit-percent', pricing.depositPercent);
    set('mq-customer-notes', data.customerNotes);
    set('mq-terms', data.terms);
    updatePricingFields();
    renderItems();
    calculateQuote();
  }

  function newQuote() {
    state.currentQuoteId = null;
    state.items = [blankItem()];
    $('mq-quote-title').value = 'CNC Plasma Cutting Quote';
    $('mq-quote-number').value = generateQuoteNumber();
    const today = new Date();
    const valid = new Date(today);
    valid.setDate(valid.getDate() + 30);
    $('mq-quote-date').value = formatDateInput(today);
    $('mq-valid-through').value = formatDateInput(valid);
    ['mq-customer-name', 'mq-customer-contact', 'mq-customer-email', 'mq-customer-address', 'mq-customer-notes'].forEach((id) => { $(id).value = ''; });
    renderItems();
    calculateQuote();
    setSaveMessage('New unsaved quote created.');
  }

  function setSaveMessage(text, type = '') {
    const target = $('mq-save-message');
    target.textContent = text;
    target.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  async function saveQuote() {
    const context = state.context;
    if (!context) return;
    const data = collectQuoteData();
    saveCompanyProfile();
    const payload = {
      user_id: context.user.id,
      quote_number: data.quoteNumber || generateQuoteNumber(),
      quote_title: data.quoteTitle,
      customer_name: data.customer.name,
      status: 'draft',
      currency: data.currency,
      direct_cost: round2(data.totals.directCost),
      quoted_total: round2(data.totals.total),
      quote_data: data
    };
    if (state.currentQuoteId) payload.id = state.currentQuoteId;

    const button = $('mq-save-quote');
    button.disabled = true;
    button.textContent = 'Saving…';
    setSaveMessage('Saving quote to the member cloud…');
    try {
      const { data: saved, error } = await context.client
        .from('pcf_member_quotes')
        .upsert(payload)
        .select('id, quote_number')
        .single();
      if (error) throw error;
      state.currentQuoteId = saved.id;
      $('mq-quote-number').value = saved.quote_number;
      setSaveMessage('Quote saved successfully.', 'success');
      await loadSavedQuotes();
    } catch (error) {
      console.error(error);
      setSaveMessage(error?.message || 'The quote could not be saved.', 'error');
    } finally {
      button.disabled = false;
      button.textContent = 'Save Quote';
    }
  }

  async function loadSavedQuotes() {
    const container = $('mq-saved-list');
    if (!state.context || !container) return;
    container.innerHTML = '<p class="mq-empty">Loading saved quotes…</p>';
    try {
      const { data, error } = await state.context.client
        .from('pcf_member_quotes')
        .select('id, quote_number, quote_title, customer_name, currency, quoted_total, updated_at')
        .order('updated_at', { ascending: false })
        .limit(50);
      if (error) throw error;
      if (!data?.length) {
        container.innerHTML = '<p class="mq-empty">No saved quotes yet.</p>';
        return;
      }
      container.innerHTML = data.map((quote) => `
        <article class="mq-saved-quote">
          <div>
            <strong>${escapeHtml(quote.quote_number)} · ${escapeHtml(quote.customer_name || 'No customer')}</strong>
            <small>${escapeHtml(quote.quote_title || 'Quote')} · ${money(quote.quoted_total, quote.currency)} · Updated ${new Date(quote.updated_at).toLocaleDateString()}</small>
          </div>
          <div class="mq-actions">
            <button class="mq-button secondary" type="button" data-load-quote="${quote.id}">Load</button>
            <button class="mq-button danger" type="button" data-delete-quote="${quote.id}">Delete</button>
          </div>
        </article>`).join('');
      container.querySelectorAll('[data-load-quote]').forEach((button) => button.addEventListener('click', () => loadQuote(button.dataset.loadQuote)));
      container.querySelectorAll('[data-delete-quote]').forEach((button) => button.addEventListener('click', () => deleteQuote(button.dataset.deleteQuote)));
    } catch (error) {
      console.error(error);
      container.innerHTML = '<p class="mq-empty">Saved quotes could not be loaded.</p>';
    }
  }

  async function loadQuote(id) {
    const { data, error } = await state.context.client
      .from('pcf_member_quotes')
      .select('*')
      .eq('id', id)
      .single();
    if (error) {
      setSaveMessage(error.message, 'error');
      return;
    }
    state.currentQuoteId = data.id;
    applyQuoteData(data.quote_data || {});
    setSaveMessage(`Loaded ${data.quote_number}.`, 'success');
    window.scrollTo({ top: 0, behavior: 'smooth' });
  }

  async function deleteQuote(id) {
    if (!window.confirm('Delete this saved quote permanently?')) return;
    const { error } = await state.context.client.from('pcf_member_quotes').delete().eq('id', id);
    if (error) {
      setSaveMessage(error.message, 'error');
      return;
    }
    if (state.currentQuoteId === id) state.currentQuoteId = null;
    setSaveMessage('Saved quote deleted.', 'success');
    await loadSavedQuotes();
  }

  function csvCell(valueToEscape) {
    const text = String(valueToEscape ?? '');
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadBlob(content, type, filename) {
    const blob = new Blob([content], { type });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(url);
  }

  function exportCsv() {
    const data = collectQuoteData();
    const rows = [
      ['Plasma Cut Forge Advanced Quote Builder'],
      ['Quote number', data.quoteNumber],
      ['Quote title', data.quoteTitle],
      ['Customer', data.customer.name],
      ['Currency', data.currency],
      [],
      ['Part', 'Description', 'Material', 'Thickness', 'Quantity', 'Cut length/part mm', 'Pierces/part', 'Machine minutes', 'Machine cost', 'Consumables', 'Material', 'Labor', 'Direct cost', 'Selling total']
    ];
    data.totals.itemCalcs.forEach((item, index) => {
      rows.push([
        index + 1, item.description, item.material, `${item.thickness} ${item.thicknessUnit}`, item.quantity,
        round2(item.lengthMm), item.pierces, round2(item.totalMachineMinutes), round2(item.machineCost),
        round2(item.consumableCost), round2(item.materialCost), round2(item.laborCost), round2(item.directCost), round2(itemSellTotal(item))
      ]);
    });
    rows.push(
      [],
      ['Direct cost', round2(data.totals.directCost)],
      ['Gross selling amount', round2(data.totals.grossSelling)],
      ['Discount', round2(data.totals.discount)],
      ['Minimum adjustment', round2(data.totals.minimumAdjustment)],
      ['Tax / VAT', round2(data.totals.tax)],
      ['Customer total', round2(data.totals.total)],
      ['Gross profit before tax', round2(data.totals.grossProfit)],
      ['Actual margin %', round2(data.totals.actualMargin)],
      ['Deposit', round2(data.totals.deposit)]
    );
    downloadBlob(rows.map((row) => row.map(csvCell).join(',')).join('\n'), 'text/csv;charset=utf-8', `${data.quoteNumber || 'plasma-quote'}-details.csv`);
  }

  function wrapLines(doc, text, width) {
    return doc.splitTextToSize(String(text || ''), width);
  }

  function exportPdf() {
    const data = collectQuoteData();
    const jsPDF = window.jspdf?.jsPDF;
    if (!jsPDF) {
      setSaveMessage('PDF export library is not available. Refresh the page and try again.', 'error');
      return;
    }

    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    const pageWidth = doc.internal.pageSize.getWidth();
    const pageHeight = doc.internal.pageSize.getHeight();
    const left = 16;
    const right = pageWidth - 16;
    let y = 18;

    function ensure(space = 20) {
      if (y + space > pageHeight - 18) {
        doc.addPage();
        y = 18;
      }
    }

    if (state.logoDataUrl) {
      try {
        const format = state.logoDataUrl.includes('image/png') ? 'PNG' : 'JPEG';
        doc.addImage(state.logoDataUrl, format, left, y, 42, 16, undefined, 'FAST');
      } catch (error) {
        console.warn('Logo could not be added to PDF.', error);
      }
    } else {
      doc.setFont('helvetica', 'bold');
      doc.setFontSize(18);
      doc.text('PLASMA CUT FORGE', left, y + 8);
    }

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(20);
    doc.text('QUOTATION', right, y + 7, { align: 'right' });
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    doc.text(`Quote: ${data.quoteNumber}`, right, y + 13, { align: 'right' });
    doc.text(`Date: ${data.quoteDate || '—'}`, right, y + 18, { align: 'right' });
    doc.text(`Valid through: ${data.validThrough || '—'}`, right, y + 23, { align: 'right' });
    y += 32;

    doc.setDrawColor(0, 190, 220);
    doc.line(left, y, right, y);
    y += 9;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text(data.company.name || 'Your Company', left, y);
    doc.text('Prepared for', 112, y);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    const companyText = [data.company.address, data.company.phone, data.company.email, data.company.taxId ? `Tax/VAT: ${data.company.taxId}` : ''].filter(Boolean).join('\n');
    const customerText = [data.customer.name, data.customer.contact, data.customer.address, data.customer.email].filter(Boolean).join('\n');
    const companyLines = wrapLines(doc, companyText, 80);
    const customerLines = wrapLines(doc, customerText, 80);
    doc.text(companyLines, left, y + 6);
    doc.text(customerLines, 112, y + 6);
    y += Math.max(companyLines.length, customerLines.length, 2) * 4.2 + 13;

    doc.setFont('helvetica', 'bold');
    doc.setFontSize(10);
    doc.text('DESCRIPTION', left, y);
    doc.text('QTY', 123, y, { align: 'right' });
    doc.text('UNIT', 151, y, { align: 'right' });
    doc.text('TOTAL', right, y, { align: 'right' });
    y += 3;
    doc.setDrawColor(100, 120, 145);
    doc.line(left, y, right, y);
    y += 6;

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    data.totals.itemCalcs.forEach((item) => {
      ensure(17);
      const sellTotal = itemSellTotal(item);
      const unitPrice = sellTotal / Math.max(1, item.quantity);
      const description = `${item.description} — ${item.material}, ${item.thickness} ${item.thicknessUnit}`;
      const lines = wrapLines(doc, description, 92);
      doc.text(lines, left, y);
      doc.text(String(item.quantity), 123, y, { align: 'right' });
      doc.text(money(unitPrice, data.currency), 151, y, { align: 'right' });
      doc.text(money(sellTotal, data.currency), right, y, { align: 'right' });
      y += Math.max(1, lines.length) * 4.3 + 4;
    });

    const extraSell = sellAdditional(data.totals.additional);
    if (extraSell > 0) {
      ensure(12);
      doc.text('Setup, programming, design, finishing, delivery and other shop charges', left, y);
      doc.text('1', 123, y, { align: 'right' });
      doc.text(money(extraSell, data.currency), 151, y, { align: 'right' });
      doc.text(money(extraSell, data.currency), right, y, { align: 'right' });
      y += 9;
    }

    ensure(48);
    doc.line(110, y, right, y);
    y += 7;
    const totals = [
      ['Subtotal', data.totals.grossSelling],
      ['Discount', -data.totals.discount],
      ['Minimum charge adjustment', data.totals.minimumAdjustment],
      [`Tax / VAT (${fixed(number('mq-tax-rate'), 1)}%)`, data.totals.tax]
    ];
    totals.forEach(([label, amount]) => {
      doc.text(label, 112, y);
      doc.text(money(amount, data.currency), right, y, { align: 'right' });
      y += 6;
    });
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(12);
    doc.text('TOTAL', 112, y + 2);
    doc.text(money(data.totals.total, data.currency), right, y + 2, { align: 'right' });
    y += 12;
    if (data.totals.deposit > 0) {
      doc.setFontSize(10);
      doc.text(`Deposit required: ${money(data.totals.deposit, data.currency)}`, right, y, { align: 'right' });
      y += 9;
    }

    doc.setFont('helvetica', 'normal');
    doc.setFontSize(9);
    if (data.customerNotes) {
      ensure(24);
      doc.setFont('helvetica', 'bold'); doc.text('Notes', left, y); y += 5;
      doc.setFont('helvetica', 'normal');
      const noteLines = wrapLines(doc, data.customerNotes, right - left);
      doc.text(noteLines, left, y); y += noteLines.length * 4.2 + 7;
    }
    if (data.terms) {
      ensure(24);
      doc.setFont('helvetica', 'bold'); doc.text('Terms & Conditions', left, y); y += 5;
      doc.setFont('helvetica', 'normal');
      const termLines = wrapLines(doc, data.terms, right - left);
      doc.text(termLines, left, y); y += termLines.length * 4.2 + 7;
    }

    const pages = doc.getNumberOfPages();
    for (let page = 1; page <= pages; page += 1) {
      doc.setPage(page);
      doc.setFontSize(7.5);
      doc.setTextColor(95, 105, 120);
      doc.text('Generated with the Plasma Cut Forge Advanced Cut Cost & Quote Builder.', left, pageHeight - 9);
      doc.text(`Page ${page} of ${pages}`, right, pageHeight - 9, { align: 'right' });
    }

    doc.save(`${data.quoteNumber || 'plasma-quote'}.pdf`);
  }

  function handleLogo(event) {
    const file = event.target.files?.[0];
    if (!file) return;
    if (!/^image\/(png|jpeg)$/.test(file.type) || file.size > 2_000_000) {
      setSaveMessage('Use a PNG or JPEG logo smaller than 2 MB.', 'error');
      event.target.value = '';
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      state.logoDataUrl = String(reader.result || '');
      $('mq-logo-preview').innerHTML = `<img src="${state.logoDataUrl}" alt="Company logo preview">`;
    };
    reader.readAsDataURL(file);
  }

  function bindGlobalInputs() {
    const ids = [
      'mq-currency', 'mq-pricing-method', 'mq-material-markup', 'mq-processing-markup', 'mq-profit-margin',
      'mq-minimum-charge', 'mq-discount-percent', 'mq-discount-fixed', 'mq-tax-rate', 'mq-deposit-percent',
      'mq-setup-hours', 'mq-setup-rate', 'mq-design-hours', 'mq-design-rate', 'mq-finishing-hours',
      'mq-finishing-rate', 'mq-delivery', 'mq-other-cost'
    ];
    ids.forEach((id) => {
      $(id)?.addEventListener('input', () => {
        if (id === 'mq-pricing-method') updatePricingFields();
        else {
          renderItems();
          calculateQuote();
        }
      });
      $(id)?.addEventListener('change', () => {
        if (id === 'mq-pricing-method') updatePricingFields();
        else {
          renderItems();
          calculateQuote();
        }
      });
    });

    qsa('#mq-company-name, #mq-company-contact, #mq-company-email, #mq-company-phone, #mq-company-address, #mq-company-tax-id').forEach((input) => {
      input.addEventListener('change', saveCompanyProfile);
    });
  }

  function initialize(context) {
    if (state.context) return;
    state.context = context;
    loadCompanyProfile();
    newQuote();
    bindGlobalInputs();
    $('mq-company-logo').addEventListener('change', handleLogo);
    $('mq-add-item').addEventListener('click', () => {
      state.items.push(blankItem(state.items.length + 1));
      renderItems();
      calculateQuote();
    });
    $('mq-new-quote').addEventListener('click', () => {
      if (window.confirm('Start a new quote? Unsaved changes will be cleared.')) newQuote();
    });
    $('mq-save-quote').addEventListener('click', saveQuote);
    $('mq-refresh-quotes').addEventListener('click', loadSavedQuotes);
    $('mq-export-pdf').addEventListener('click', exportPdf);
    $('mq-export-csv').addEventListener('click', exportCsv);
    loadSavedQuotes();
  }

  document.addEventListener('pcf:member-ready', (event) => initialize(event.detail), { once: true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
