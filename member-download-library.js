(() => {
  'use strict';

  const BUCKET = 'member-downloads';
  const resources = [
  {
    "title": "Printable Cut-Chart Worksheet",
    "category": "Planning Worksheets",
    "file": "printable-cut-chart-worksheet.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Blank equipment, test-condition and machine-specific cut-chart worksheet with a full landscape settings table.",
    "size": 6872
  },
  {
    "title": "Machine Setup Checklist",
    "category": "Inspection & Troubleshooting",
    "file": "machine-setup-checklist.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Pre-start checks for safety, compressed air, power, grounding, torch consumables, motion, software and first-cut verification.",
    "size": 5906
  },
  {
    "title": "Cut-Quality Inspection Sheet",
    "category": "Inspection & Troubleshooting",
    "file": "cut-quality-inspection-sheet.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Measure kerf and bevel, classify dross and cut-face defects, and document one-variable-at-a-time corrective actions.",
    "size": 6478
  },
  {
    "title": "Consumable Inspection Guide",
    "category": "Inspection & Troubleshooting",
    "file": "consumable-inspection-guide.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Inspection checklist and service record for electrodes, nozzles, shields, swirl rings, O-rings, torch bodies and leads.",
    "size": 6569
  },
  {
    "title": "Air-Quality Troubleshooting Checklist",
    "category": "Inspection & Troubleshooting",
    "file": "air-quality-troubleshooting-checklist.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Systematic checks for moisture, oil, pressure loss, restricted flow, filtration, dryers and point-of-use problems.",
    "size": 6554
  },
  {
    "title": "Compressor Sizing Worksheet",
    "category": "Planning Worksheets",
    "file": "compressor-sizing-worksheet.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Calculate combined airflow demand, reserve margin, delivered airflow, distribution loss, receiver behavior and duty cycle.",
    "size": 6293
  },
  {
    "title": "THC Tuning Worksheet",
    "category": "Planning Worksheets",
    "file": "thc-tuning-worksheet.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Record IHS, pierce sequence, target voltage, physical cut height, anti-dive behavior and Z-axis response tests.",
    "size": 6455
  },
  {
    "title": "Grounding and EMI Checklist",
    "category": "Inspection & Troubleshooting",
    "file": "grounding-and-emi-checklist.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Inspect protective earth, bonding, cable separation, shield termination and controlled EMI troubleshooting tests.",
    "size": 6020
  },
  {
    "title": "Preventive-Maintenance Schedule",
    "category": "Maintenance",
    "file": "preventive-maintenance-schedule.pdf",
    "type": "PDF",
    "detail": "3 pages",
    "description": "Daily, weekly, monthly, quarterly and annual maintenance schedule with a repair and service-history log.",
    "size": 9886
  },
  {
    "title": "Job-Costing Workbook",
    "category": "Spreadsheets",
    "file": "job-costing-workbook.xlsx",
    "type": "XLSX",
    "detail": "5 worksheets",
    "description": "Formula-driven part costing, shop charges, quote summary, deposits, tax, direct cost, gross profit and margin.",
    "size": 14870
  },
  {
    "title": "Material Test-Cut Record Sheet",
    "category": "Planning Worksheets",
    "file": "material-test-cut-record-sheet.pdf",
    "type": "PDF",
    "detail": "2 pages",
    "description": "Structured coupon test matrix with final approved settings and production-verification records.",
    "size": 7349
  },
  {
    "title": "Material Test-Cut Log",
    "category": "Spreadsheets",
    "file": "material-test-cut-log.xlsx",
    "type": "XLSX",
    "detail": "4 worksheets",
    "description": "Searchable test history, controlled dropdowns, approval status, dashboard metrics and an approved-settings register.",
    "size": 22103
  }
];
  const completePack = {
    title: 'Complete Member Download Library',
    file: 'plasma-cut-forge-member-download-library-complete-v1.0.zip',
    type: 'ZIP',
    detail: '12 professional resources',
    size: 74246
  };

  const state = { context: null, category: 'All', search: '' };
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => Array.from(root.querySelectorAll(selector));

  function escapeHtml(value) {
    return String(value ?? '').replace(/[&<>"']/g, (char) => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'})[char]);
  }

  function formatBytes(bytes) {
    if (!Number.isFinite(bytes) || bytes <= 0) return '';
    const units = ['B','KB','MB','GB'];
    const index = Math.min(Math.floor(Math.log(bytes) / Math.log(1024)), units.length - 1);
    const value = bytes / Math.pow(1024, index);
    return `${value >= 10 || index === 0 ? value.toFixed(0) : value.toFixed(1)} ${units[index]}`;
  }

  function setMessage(text, type = '') {
    const target = $('#mdl-message');
    if (!target) return;
    target.textContent = text;
    target.className = `pcf-member-message${type ? ` is-${type}` : ''}`;
  }

  function visibleResources() {
    const term = state.search.trim().toLowerCase();
    return resources.filter((item) => {
      const categoryMatch = state.category === 'All' || item.category === state.category;
      const text = `${item.title} ${item.category} ${item.description} ${item.type}`.toLowerCase();
      return categoryMatch && (!term || text.includes(term));
    });
  }

  function render() {
    const grid = $('#mdl-resource-grid');
    if (!grid) return;
    const items = visibleResources();
    $('#mdl-result-count').textContent = `${items.length} resource${items.length === 1 ? '' : 's'}`;
    if (!items.length) {
      grid.innerHTML = '<p class="mdl-empty">No downloads match that search or filter.</p>';
      return;
    }
    grid.innerHTML = items.map((item, index) => `
      <article class="mdl-card">
        <div class="mdl-card-top">
          <span class="mdl-number">${String(resources.indexOf(item) + 1).padStart(2, '0')}</span>
          <span class="mdl-file-badge">${escapeHtml(item.type)}</span>
        </div>
        <p class="mdl-category">${escapeHtml(item.category)}</p>
        <h3>${escapeHtml(item.title)}</h3>
        <p>${escapeHtml(item.description)}</p>
        <div class="mdl-meta">
          <span>${escapeHtml(item.detail)}</span>
          <span>${formatBytes(item.size)}</span>
        </div>
        <button class="pcf-button mdl-download" type="button" data-download-file="${escapeHtml(item.file)}">Download ${escapeHtml(item.type)}</button>
      </article>`).join('');
    $$('[data-download-file]', grid).forEach((button) => {
      button.addEventListener('click', () => download(button.dataset.downloadFile, button));
    });
  }

  async function download(file, button) {
    if (!state.context?.client) {
      setMessage('Member access is not ready. Refresh the page and sign in again.', 'error');
      return;
    }
    const original = button?.textContent || 'Download';
    if (button) {
      button.disabled = true;
      button.textContent = 'Preparing…';
    }
    setMessage(`Preparing ${file}…`);
    try {
      const { data, error } = await state.context.client.storage.from(BUCKET).download(file);
      if (error) throw error;
      const url = URL.createObjectURL(data);
      const anchor = document.createElement('a');
      anchor.href = url;
      anchor.download = file.split('/').pop();
      document.body.appendChild(anchor);
      anchor.click();
      anchor.remove();
      window.setTimeout(() => URL.revokeObjectURL(url), 30000);
      setMessage(`${file} downloaded.`, 'success');
    } catch (error) {
      console.error(error);
      const detail = error?.message || 'The protected file could not be downloaded.';
      setMessage(`${detail} Confirm the file is uploaded to the private member-downloads bucket.`, 'error');
    } finally {
      if (button) {
        button.disabled = false;
        button.textContent = original;
      }
    }
  }

  function bindControls() {
    const search = $('#mdl-search');
    search?.addEventListener('input', () => {
      state.search = search.value;
      render();
    });
    $$('[data-library-category]').forEach((button) => {
      button.addEventListener('click', () => {
        state.category = button.dataset.libraryCategory;
        $$('[data-library-category]').forEach((item) => item.classList.toggle('active', item === button));
        render();
      });
    });
    $('#mdl-download-all')?.addEventListener('click', (event) => download(completePack.file, event.currentTarget));
  }

  function initialize(context) {
    state.context = context;
    const email = $('#mdl-member-email');
    if (email) email.textContent = context.user?.email || 'Forge Member';
    $('#mdl-total-count').textContent = String(resources.length);
    $('#mdl-complete-size').textContent = formatBytes(completePack.size);
    bindControls();
    render();
    setMessage('Private download library ready.', 'success');
  }

  document.addEventListener('pcf:member-ready', (event) => initialize(event.detail), { once: true });
  if (window.PCF_MEMBER_CONTEXT) initialize(window.PCF_MEMBER_CONTEXT);
})();
