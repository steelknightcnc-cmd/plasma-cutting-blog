(() => {
  'use strict';

  const $ = (selector) => document.querySelector(selector);
  const currencySymbols = { EUR: '€', USD: '$', GBP: '£', CAD: 'CA$', AUD: 'A$' };
  let lastResult = null;

  const numberValue = (id, fallback = 0) => {
    const value = Number.parseFloat($(id)?.value ?? '');
    return Number.isFinite(value) ? value : fallback;
  };

  const clamp = (value, min, max) => Math.min(max, Math.max(min, value));

  const money = (value, currency = $('#basic-currency')?.value || 'EUR', digits = 2) => {
    const safe = Number.isFinite(value) ? value : 0;
    try {
      return new Intl.NumberFormat(undefined, {
        style: 'currency', currency, minimumFractionDigits: digits, maximumFractionDigits: digits
      }).format(safe);
    } catch {
      return `${currencySymbols[currency] || ''}${safe.toFixed(digits)}`;
    }
  };

  function updateBaseMode() {
    const mode = $('#basic-base-mode').value;
    document.querySelectorAll('.base-mode-field').forEach((field) => {
      field.hidden = field.dataset.baseMode !== mode;
    });
    calculate();
  }

  function collect() {
    const quantity = Math.max(1, Math.round(numberValue('#basic-quantity', 1)));
    const currency = $('#basic-currency').value;
    const baseMode = $('#basic-base-mode').value;
    const packQuantity = Math.max(1, numberValue('#basic-pack-quantity', 1));
    const packTotal = Math.max(0, numberValue('#basic-pack-total'));
    const baseUnitCost = baseMode === 'bulk'
      ? packTotal / packQuantity
      : Math.max(0, numberValue('#basic-base-cost'));

    const materialUnit = Math.max(0, numberValue('#basic-material-cost'));
    const packagingUnit = Math.max(0, numberValue('#basic-packaging-cost'));
    const machineMinutes = Math.max(0, numberValue('#basic-machine-minutes'));
    const machineRate = Math.max(0, numberValue('#basic-machine-rate'));
    const laborMinutes = Math.max(0, numberValue('#basic-labor-minutes'));
    const laborRate = Math.max(0, numberValue('#basic-labor-rate'));
    const setupMinutes = Math.max(0, numberValue('#basic-setup-minutes'));
    const fixedCost = Math.max(0, numberValue('#basic-fixed-cost'));
    const feeRate = clamp(numberValue('#basic-fee-rate') / 100, 0, 0.95);
    const targetMargin = clamp(numberValue('#basic-margin-target') / 100, 0, 0.95);
    const taxRate = clamp(numberValue('#basic-tax-rate') / 100, 0, 1);

    const baseOrder = baseUnitCost * quantity;
    const materialOrder = materialUnit * quantity;
    const packagingOrder = packagingUnit * quantity;
    const machineUnit = (machineMinutes / 60) * machineRate;
    const machineOrder = machineUnit * quantity;
    const laborUnit = (laborMinutes / 60) * laborRate;
    const setupOrder = (setupMinutes / 60) * laborRate;
    const laborOrder = laborUnit * quantity + setupOrder;
    const productionCost = baseOrder + materialOrder + packagingOrder + machineOrder + laborOrder + fixedCost;
    const costPerItem = productionCost / quantity;

    const breakEvenDenominator = 1 - feeRate;
    const targetDenominator = 1 - feeRate - targetMargin;
    const breakEvenOrderRevenue = breakEvenDenominator > 0 ? productionCost / breakEvenDenominator : 0;
    const recommendedOrderRevenue = targetDenominator > 0 ? productionCost / targetDenominator : 0;
    const breakEvenUnit = breakEvenOrderRevenue / quantity;
    const recommendedUnit = recommendedOrderRevenue / quantity;

    const enteredActual = Math.max(0, numberValue('#basic-actual-price'));
    const priceUsed = enteredActual > 0 ? enteredActual : recommendedUnit;
    const salesRevenue = priceUsed * quantity;
    const sellingFees = salesRevenue * feeRate;
    const profitOrder = salesRevenue - sellingFees - productionCost;
    const profitItem = profitOrder / quantity;
    const actualMargin = salesRevenue > 0 ? profitOrder / salesRevenue : 0;
    const tax = salesRevenue * taxRate;
    const customerTotal = salesRevenue + tax;

    return {
      name: $('#basic-name').value.trim() || 'Unnamed product',
      operation: $('#basic-operation').value,
      currency, quantity, baseMode, packQuantity, packTotal, baseUnitCost,
      materialUnit, packagingUnit, machineMinutes, machineRate, machineUnit,
      laborMinutes, laborRate, laborUnit, setupMinutes, setupOrder, fixedCost,
      feeRate, targetMargin, taxRate, baseOrder, materialOrder, packagingOrder,
      machineOrder, laborOrder, productionCost, costPerItem, breakEvenUnit,
      recommendedUnit, priceUsed, salesRevenue, sellingFees, profitOrder,
      profitItem, actualMargin, tax, customerTotal, targetDenominator
    };
  }

  function setText(id, text) {
    const element = $(id);
    if (element) element.textContent = text;
  }

  function calculate() {
    const result = collect();
    lastResult = result;

    setText('#basic-base-unit-cost', money(result.baseUnitCost, result.currency, 4));
    setText('#sum-base', money(result.baseOrder, result.currency));
    setText('#sum-material', money(result.materialOrder, result.currency));
    setText('#sum-machine', money(result.machineOrder, result.currency));
    setText('#sum-labor', money(result.laborOrder, result.currency));
    setText('#sum-packaging', money(result.packagingOrder, result.currency));
    setText('#sum-fixed', money(result.fixedCost, result.currency));
    setText('#sum-production', money(result.productionCost, result.currency));
    setText('#sum-cost-item', money(result.costPerItem, result.currency));
    setText('#sum-break-even', result.targetDenominator > 0 ? money(result.breakEvenUnit, result.currency) : '—');
    setText('#sum-recommended', result.targetDenominator > 0 ? money(result.recommendedUnit, result.currency) : '—');
    setText('#sum-price-used', result.targetDenominator > 0 ? money(result.priceUsed, result.currency) : '—');
    setText('#sum-fees', money(result.sellingFees, result.currency));
    setText('#sum-profit-item', money(result.profitItem, result.currency));
    setText('#sum-profit-order', money(result.profitOrder, result.currency));
    setText('#sum-margin', `${(result.actualMargin * 100).toFixed(1)}%`);
    setText('#sum-tax', money(result.tax, result.currency));
    setText('#sum-customer-total', money(result.customerTotal, result.currency));

    const warning = $('#basic-warning');
    if (result.targetDenominator <= 0) {
      warning.hidden = false;
      warning.textContent = 'The selling-fee percentage plus target profit margin must be less than 100% before a recommended price can be calculated.';
    } else if (result.profitOrder < 0) {
      warning.hidden = false;
      warning.textContent = 'The price being used produces a loss. Increase the selling price or reduce the entered costs.';
    } else {
      warning.hidden = true;
      warning.textContent = '';
    }
  }

  function useRecommended() {
    const result = collect();
    if (result.targetDenominator <= 0) return;
    $('#basic-actual-price').value = result.recommendedUnit.toFixed(2);
    calculate();
  }

  function resetCalculator() {
    $('#basic-name').value = '';
    $('#basic-quantity').value = '1';
    $('#basic-currency').value = 'EUR';
    $('#basic-base-mode').value = 'per-item';
    $('#basic-base-cost').value = '0';
    $('#basic-pack-quantity').value = '20';
    $('#basic-pack-total').value = '19.79';
    $('#basic-material-cost').value = '0';
    $('#basic-packaging-cost').value = '0';
    $('#basic-operation').value = 'Laser engraving';
    $('#basic-machine-minutes').value = '0';
    $('#basic-machine-rate').value = '0';
    $('#basic-labor-minutes').value = '0';
    $('#basic-labor-rate').value = '20';
    $('#basic-setup-minutes').value = '0';
    $('#basic-fixed-cost').value = '0';
    $('#basic-fee-rate').value = '0';
    $('#basic-margin-target').value = '35';
    $('#basic-actual-price').value = '0';
    $('#basic-tax-rate').value = '20';
    updateBaseMode();
  }

  function addPdfHeader(doc, title) {
    doc.setFillColor(7, 17, 29);
    doc.rect(0, 0, 210, 34, 'F');
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(18);
    doc.setTextColor(255, 255, 255);
    doc.text('PLASMA', 14, 16);
    const plasmaWidth = doc.getTextWidth('PLASMA');
    doc.setTextColor(0, 207, 239);
    doc.text('CUT', 14 + plasmaWidth, 16);
    const cutWidth = doc.getTextWidth('CUT');
    doc.setTextColor(255, 255, 255);
    doc.text('FORGE', 14 + plasmaWidth + cutWidth, 16);
    doc.setFontSize(7.5);
    doc.setTextColor(165, 184, 205);
    doc.text('CNC PLASMA TOOLS & SHOP-FLOOR GUIDES', 14, 24);
    doc.setTextColor(0, 207, 239);
    doc.setFontSize(8);
    doc.text('FREE BASIC CALCULATOR REPORT', 196, 24, { align: 'right' });
    doc.setFillColor(0, 207, 239);
    doc.rect(0, 34, 210, 1.2, 'F');
    doc.setTextColor(7, 17, 29);
    doc.setFontSize(17);
    doc.text(title.toUpperCase(), 14, 49);
  }

  function sectionTitle(doc, title, y) {
    doc.setFillColor(13, 27, 42);
    doc.roundedRect(14, y, 182, 9, 1.5, 1.5, 'F');
    doc.setTextColor(0, 207, 239);
    doc.setFont('helvetica', 'bold');
    doc.setFontSize(9);
    doc.text(title.toUpperCase(), 18, y + 6.2);
    return y + 14;
  }

  function addPdfFooter(doc, page, total) {
    doc.setDrawColor(194, 208, 221);
    doc.line(14, 278, 196, 278);
    doc.setTextColor(82, 104, 128);
    doc.setFont('helvetica', 'normal');
    doc.setFontSize(6.7);
    const disclaimer = 'Estimate only. Verify actual material costs, machine rates, labor, marketplace fees, taxes, and business requirements before quoting or selling.';
    doc.text(doc.splitTextToSize(disclaimer, 145), 14, 284);
    doc.text(`PlasmaCutForge.com  |  ${page}/${total}`, 196, 286, { align: 'right' });
  }

  function row(doc, label, value, y, strong = false) {
    doc.setTextColor(75, 98, 124);
    doc.setFont('helvetica', strong ? 'bold' : 'normal');
    doc.setFontSize(8.5);
    doc.text(label, 18, y);
    doc.setTextColor(7, 17, 29);
    doc.setFont('helvetica', strong ? 'bold' : 'normal');
    doc.text(String(value), 192, y, { align: 'right' });
    doc.setDrawColor(211, 222, 232);
    doc.line(18, y + 3, 192, y + 3);
    return y + 9;
  }

  function downloadPdf() {
    calculate();
    const r = lastResult;
    if (!r || r.targetDenominator <= 0) return;
    if (!window.jspdf?.jsPDF) {
      alert('The PDF library has not finished loading. Please try again in a moment.');
      return;
    }

    const { jsPDF } = window.jspdf;
    const doc = new jsPDF({ unit: 'mm', format: 'a4' });
    addPdfHeader(doc, 'Product Selling Price Summary');

    let y = 60;
    y = sectionTitle(doc, 'Product', y);
    y = row(doc, 'Product / object', r.name, y, true);
    y = row(doc, 'Quantity', r.quantity, y);
    y = row(doc, 'Operation', r.operation, y);
    y = row(doc, 'Base cost per item', money(r.baseUnitCost, r.currency, r.baseMode === 'bulk' ? 4 : 2), y);
    if (r.baseMode === 'bulk') {
      y = row(doc, 'Bulk purchase', `${r.packQuantity} items for ${money(r.packTotal, r.currency)}`, y);
    }

    y += 4;
    y = sectionTitle(doc, 'Cost Breakdown', y);
    y = row(doc, 'Base objects / blanks', money(r.baseOrder, r.currency), y);
    y = row(doc, 'Extra materials', money(r.materialOrder, r.currency), y);
    y = row(doc, 'Machine operation', money(r.machineOrder, r.currency), y);
    y = row(doc, 'Labor and setup', money(r.laborOrder, r.currency), y);
    y = row(doc, 'Packaging', money(r.packagingOrder, r.currency), y);
    y = row(doc, 'Other fixed cost', money(r.fixedCost, r.currency), y);
    y = row(doc, 'Total production cost', money(r.productionCost, r.currency), y, true);
    y = row(doc, 'Production cost per item', money(r.costPerItem, r.currency), y, true);
    addPdfFooter(doc, 1, 2);

    doc.addPage();
    addPdfHeader(doc, 'Product Selling Price Summary');
    y = 60;
    y = sectionTitle(doc, 'Selling Price and Profit', y);
    y = row(doc, 'Selling / payment fees', `${(r.feeRate * 100).toFixed(2)}%`, y);
    y = row(doc, 'Target profit margin', `${(r.targetMargin * 100).toFixed(1)}%`, y);
    y = row(doc, 'Break-even price per item', money(r.breakEvenUnit, r.currency), y);
    y = row(doc, 'Recommended price per item', money(r.recommendedUnit, r.currency), y, true);
    y = row(doc, 'Price used per item', money(r.priceUsed, r.currency), y, true);
    y = row(doc, 'Total selling fees', money(r.sellingFees, r.currency), y);
    y = row(doc, 'Profit per item', money(r.profitItem, r.currency), y);
    y = row(doc, 'Total order profit', money(r.profitOrder, r.currency), y, true);
    y = row(doc, 'Actual profit margin', `${(r.actualMargin * 100).toFixed(1)}%`, y);
    y = row(doc, 'Tax / VAT', money(r.tax, r.currency), y);
    y = row(doc, 'Customer order total', money(r.customerTotal, r.currency), y, true);

    addPdfFooter(doc, 2, 2);

    const safeName = r.name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '') || 'product';
    doc.save(`PCF-${safeName}-basic-pricing.pdf`);
  }

  function initialize() {
    $('#basic-base-mode').addEventListener('change', updateBaseMode);
    document.querySelectorAll('input, select').forEach((field) => {
      field.addEventListener('input', calculate);
      field.addEventListener('change', calculate);
    });
    $('#basic-use-recommended').addEventListener('click', useRecommended);
    $('#basic-reset').addEventListener('click', resetCalculator);
    $('#basic-pdf').addEventListener('click', downloadPdf);
    updateBaseMode();
  }

  window.addEventListener('DOMContentLoaded', initialize);
})();
