/**
 * Qualcomm MIBIB Web Studio - Main App Controller
 */

let calculator;
let currentPartitions = [];
let pendingExportType = null; // 'mbn' or 'xml'

// Default IPQ6018 Partition Layout Preset
const DEFAULT_PRESET_IPQ6018 = [
  { name: '0:SBL1', sizeKb: 768, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:MIBIB', sizeKb: 64, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x10, attr3: 0x40, attr4: 0xFF },
  { name: '0:QSEE', sizeKb: 1664, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:DEVCFG', sizeKb: 64, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:RPM', sizeKb: 128, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:CDT', sizeKb: 64, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:APPSBLENV', sizeKb: 64, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:APPSBL', sizeKb: 640, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:ART', sizeKb: 256, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: '0:HLOS', sizeKb: 6144, padKb: 0, whichFlash: 0, attr1: 0x00, attr2: 0x00, attr3: 0xFF, attr4: 0xFF },
  { name: 'rootfs', sizeKb: 2048 * 1024, padKb: 0, whichFlash: 0, attr1: 0x01, attr2: 0x00, attr3: 0xFF, attr4: 0xFF }
];

document.addEventListener('DOMContentLoaded', () => {
  initLanguageAndTheme();
  initCalculator();
  bindUIEvents();
  loadDefaultPreset();
  if (typeof ProgrammerStudio !== 'undefined') {
    ProgrammerStudio.init();
  }
});

function initLanguageAndTheme() {
  // 1. Language Auto Detection
  const detectedLang = detectUserLanguage();
  setLanguage(detectedLang);

  document.getElementById('select-language').addEventListener('change', (e) => {
    setLanguage(e.target.value);
    recalculateAndRender();
  });

  // 2. Light / Dark Theme Auto Adaptation
  const themeSelect = document.getElementById('select-theme');
  
  function applyTheme(theme) {
    if (theme === 'dark') {
      document.documentElement.setAttribute('data-theme', 'dark');
    } else if (theme === 'light') {
      document.documentElement.setAttribute('data-theme', 'light');
    } else {
      document.documentElement.removeAttribute('data-theme'); // Follow system prefers-color-scheme
    }
  }

  themeSelect.addEventListener('change', (e) => {
    applyTheme(e.target.value);
  });

  // Listen to OS theme changes
  window.matchMedia('(prefers-color-scheme: light)').addEventListener('change', () => {
    if (themeSelect.value === 'auto') {
      applyTheme('auto');
    }
  });
}

function initCalculator() {
  const pageSizeVal = parseInt(document.getElementById('select-pagesize').value, 10) || 2048;
  const flashType = document.getElementById('select-flashtype').value;

  // Default Block Size Calculation (Default 2K -> 128KB, 4K -> 256KB)
  const primaryBlockSize = (pageSizeVal === 4096) ? 256 * 1024 : 128 * 1024;

  calculator = new PartitionCalculator({
    pageSize: pageSizeVal,
    primaryBlockSize: primaryBlockSize,
    norBlockSize: 64 * 1024,
    flashType: flashType
  });
}

function bindUIEvents() {
  // Config Controls
  document.getElementById('select-pagesize').addEventListener('change', () => {
    initCalculator();
    recalculateAndRender(false);
    showToast('Updated Block Size config', 'info');
  });

  document.getElementById('select-flashtype').addEventListener('change', () => {
    initCalculator();
    recalculateAndRender(false);
    showToast('Updated Flash Type config', 'info');
  });

  // Dropzone Events
  const dropzone = document.getElementById('dropzone');
  const fileInput = document.getElementById('file-input');

  if (dropzone && fileInput) {
    dropzone.addEventListener('click', () => fileInput.click());
    dropzone.addEventListener('dragover', (e) => {
      e.preventDefault();
      dropzone.classList.add('dragover');
    });
    dropzone.addEventListener('dragleave', () => dropzone.classList.remove('dragover'));
    dropzone.addEventListener('drop', (e) => {
      e.preventDefault();
      dropzone.classList.remove('dragover');
      if (e.dataTransfer.files.length > 0) {
        handleFileImport(e.dataTransfer.files[0]);
      }
    });
    fileInput.addEventListener('change', (e) => {
      if (e.target.files.length > 0) {
        handleFileImport(e.target.files[0]);
      }
    });
  }

  // Tab Navigation
  const tabButtons = document.querySelectorAll('.tab-btn');
  tabButtons.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTabId = btn.getAttribute('data-tab');
      tabButtons.forEach(b => b.classList.remove('active'));
      document.querySelectorAll('.tab-pane').forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const targetPane = document.getElementById(targetTabId);
      if (targetPane) {
        targetPane.classList.add('active');
      }
    });
  });

  // Action Buttons
  document.getElementById('btn-add-part').addEventListener('click', addNewPartitionEnd);
  document.getElementById('btn-auto-align').addEventListener('click', autoAlignPartitions);
  document.getElementById('btn-export-mbn').addEventListener('click', () => openFilenameModal('mbn'));
  document.getElementById('btn-export-xml').addEventListener('click', () => openFilenameModal('xml'));

  // Modal Buttons
  document.getElementById('btn-modal-cancel').addEventListener('click', closeFilenameModal);
  document.getElementById('btn-modal-confirm').addEventListener('click', confirmFilenameExport);

  // Load Preset Manifest
  initPresetManifest();
}

let presetManifest = [];
let defaultPresetId = 'ipq807x_nand';

function initPresetManifest() {
  fetch('presets/manifest.json')
    .then(resp => {
      if (!resp.ok) throw new Error("Manifest load failed");
      return resp.json();
    })
    .then(data => {
      if (Array.isArray(data)) {
        presetManifest = data;
      } else {
        presetManifest = data.presets || [];
        defaultPresetId = data.default || defaultPresetId;
      }
      renderPresetDropdown();
    })
    .catch(err => {
      // Fallback manifest for direct local file:// opening
      presetManifest = [
        { id: "ipq807x_nand", name: "IPQ807x NAND (nand-partition.xml)", file: "ipq807x-nand-partition.xml" }
      ];
      defaultPresetId = "ipq807x_nand";
      renderPresetDropdown();
    });
}

function renderPresetDropdown() {
  const selectPreset = document.getElementById('select-preset');
  if (!selectPreset) return;

  selectPreset.innerHTML = '<option value="custom" data-i18n="optionCustom">Custom Layout</option>';
  
  presetManifest.forEach(item => {
    const opt = document.createElement('option');
    opt.value = item.id;
    opt.textContent = item.name;
    if (item.id === defaultPresetId) opt.selected = true;
    selectPreset.appendChild(opt);
  });

  loadDefaultPreset();
}

function loadPresetLayout() {
  const presetVal = document.getElementById('select-preset').value;
  if (presetVal === 'custom') return;

  const foundItem = presetManifest.find(item => item.id === presetVal);
  const targetFile = foundItem ? foundItem.file : 'ipq807x-nand-partition.xml';

  fetch('presets/' + targetFile)
    .then(resp => {
      if (!resp.ok) throw new Error("Network response error loading XML preset");
      return resp.text();
    })
    .then(xmlText => {
      const result = parseMibibXml(xmlText);
      currentPartitions = result.entries;
      recalculateAndRender(true);
      showToast(`Loaded ${foundItem ? foundItem.name : targetFile} preset template`, "success");
    })
    .catch(err => {
      loadEmbeddedXmlPreset();
    });
}

function loadDefaultPreset() {
  loadPresetLayout();
}

function loadEmbeddedXmlPreset() {
  const rawXml = `<?xml version="1.0" encoding="UTF-8"?>
<nandboot>
	<magic_numbers><usr_part_magic1>0xAA7D1B9A</usr_part_magic1><usr_part_magic2>0x1F7D48BC</usr_part_magic2></magic_numbers>
	<partition_version length="4">0x4</partition_version>
	<partitions>
		<partition><name length="16" type="string">0:SBL1</name><size_kb length="4">512</size_kb><pad_kb length="2">512</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:MIBIB</name><size_kb length="4">512</size_kb><pad_kb length="2">512</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:BOOTCONFIG</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:BOOTCONFIG1</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:QSEE</name><size_kb length="4">2048</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:QSEE_1</name><size_kb length="4">2048</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:DEVCFG</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:DEVCFG_1</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:APDP</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:APDP_1</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:RPM</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:RPM_1</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:CDT</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:CDT_1</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:APPSBLENV</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:APPSBL</name><size_kb length="4">512</size_kb><pad_kb length="2">512</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:APPSBL_1</name><size_kb length="4">512</size_kb><pad_kb length="2">512</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:ART</name><size_kb length="4">256</size_kb><pad_kb length="2">256</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">rootfs</name><size_kb length="4">46080</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:WIFIFW</name><size_kb length="4">8192</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">rootfs_1</name><size_kb length="4">46080</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
		<partition><name length="16" type="string">0:WIFIFW_1</name><size_kb length="4">8192</size_kb><pad_kb length="2">1024</pad_kb><which_flash length="2">0</which_flash><attr>0xFF</attr><attr>0xFF</attr><attr>0x00</attr><attr>0xFF</attr></partition>
	</partitions>
</nandboot>`;
  const result = parseMibibXml(rawXml);
  currentPartitions = result.entries;
  recalculateAndRender(true);
}

function handleFileImport(file) {
  const fileName = file.name.toLowerCase();
  const reader = new FileReader();

  const markPresetAsCustom = () => {
    const presetSelect = document.getElementById('select-preset');
    if (presetSelect) presetSelect.value = 'custom';
  };

  const autoSelectFlashType = (flashType) => {
    if (flashType) {
      const flashSelect = document.getElementById('select-flashtype');
      if (flashSelect) {
        flashSelect.value = flashType;
        initCalculator();
      }
    }
  };

  const autoSelectPageSize = (pageSize) => {
    if (pageSize) {
      const pageSelect = document.getElementById('select-pagesize');
      if (pageSelect) {
        pageSelect.value = pageSize.toString();
        initCalculator();
      }
    }
  };

  if (fileName.endsWith('.xml')) {
    reader.onload = (e) => {
      try {
        const result = parseMibibXml(e.target.result);
        currentPartitions = result.entries;
        markPresetAsCustom();
        autoSelectFlashType(result.detectedFlashType);
        recalculateAndRender(false);
        showToast(t('toastImportSuccess', { count: result.entries.length, file: file.name }), 'success');
      } catch (err) {
        showToast(`XML Parsing Error: ${err.message}`, 'error');
      }
    };
    reader.readAsText(file);
  } else {
    reader.onload = (e) => {
      try {
        const result = parseMibibBin(e.target.result);
        currentPartitions = result.entries;
        markPresetAsCustom();

        let pageSource = "header";
        if (!result.detectedPageSize) {
          if (fileName.includes("256k") || fileName.includes("4k") || fileName.includes("-p256")) {
            result.detectedPageSize = 4096;
            pageSource = "filename";
          } else if (fileName.includes("128k") || fileName.includes("2k") || fileName.includes("-p128")) {
            result.detectedPageSize = 2048;
            pageSource = "filename";
          } else {
            result.detectedPageSize = 2048;
            pageSource = "default";
          }
        }

        autoSelectPageSize(result.detectedPageSize);

        // Binary Flash Type Detection: check whichFlash & detectedBlockSize
        const hasSecondary = currentPartitions.some(e => e.whichFlash === 1);
        if (hasSecondary) {
          autoSelectFlashType('norplusnand');
        } else {
          if (result.detectedBlockSize === 64 * 1024) {
            autoSelectFlashType('nor');
          } else {
            autoSelectFlashType('nand');
          }
        }

        recalculateAndRender(false);

        if (pageSource === "default") {
          showToast(`Loaded with default 2K Page (128KB Block). You can switch to 4K anytime in top panel.`, 'info');
        } else if (result.mibibOffset && result.mibibOffset > 0) {
          const hexOffset = result.mibibOffset.toString(16).toUpperCase();
          showToast(t('toastAutoDetected', { offset: hexOffset, count: result.entries.length }), 'success');
        } else {
          showToast(t('toastImportSuccess', { count: result.entries.length, file: file.name }), 'success');
        }
      } catch (err) {
        showToast(`Binary Parsing Error: ${err.message}`, 'error');
      }
    };
    reader.readAsArrayBuffer(file);
  }
}

function recalculateAndRender(cascadeOffsets = false) {
  calculator.recalculatePartitions(currentPartitions, { cascadeOffsets: cascadeOffsets });
  renderTable();
  renderFlashBar();
}

function renderTable() {
  const tbody = document.getElementById('partition-tbody');
  tbody.innerHTML = '';

  currentPartitions.forEach((part, index) => {
    const tr = document.createElement('tr');
    if (part.errors.length > 0) tr.classList.add('has-error');
    else if (part.warnings.length > 0) tr.classList.add('has-warning');

    const statusHtml = part.errors.length > 0
      ? `<span class="status-badge badge-error">${escapeHtml(part.errors[0])}</span>`
      : (part.warnings.length > 0
          ? `<span class="status-badge badge-warning">${escapeHtml(part.warnings[0])}</span>`
          : `<span class="status-badge badge-ok">${t('statusOk')}</span>`);

    const isSingleFlash = (calculator.flashType !== 'norplusnand');
    const disabledAttr = isSingleFlash ? 'disabled style="opacity: 0.65; cursor: not-allowed;"' : '';
    const whichFlashVal = isSingleFlash ? 0 : part.whichFlash;
    if (isSingleFlash) {
      part.whichFlash = 0;
    }

    tr.innerHTML = `
      <td>${index + 1}</td>
      <td class="col-name">
        <input type="text" class="input-table" value="${escapeHtml(part.name)}" data-field="name" data-index="${index}">
      </td>
      <td class="col-hex">
        <input type="text" class="input-table" value="${part.hexStartAddr}" data-field="hexStartAddr" data-index="${index}">
      </td>
      <td class="col-hex">
        <input type="text" class="input-table" value="${part.hexEndAddr}" readonly style="opacity: 0.7;">
      </td>
      <td class="col-mb">
        <input type="number" step="0.01" class="input-table" value="${part.sizeMb}" data-field="sizeMb" data-index="${index}">
      </td>
      <td class="col-kb">
        <input type="number" step="1" class="input-table" value="${part.sizeKb}" data-field="sizeKb" data-index="${index}">
      </td>
      <td>${part.sizeBlocks}</td>
      <td>
        <select class="input-table" data-field="whichFlash" data-index="${index}" ${disabledAttr}>
          <option value="0" ${whichFlashVal === 0 ? 'selected' : ''}>${t('optPrimary')}</option>
          <option value="1" ${whichFlashVal === 1 ? 'selected' : ''}>${t('optSecondary')}</option>
        </select>
      </td>
      <td>${statusHtml}</td>
      <td>
        <div class="action-buttons">
          <button class="icon-btn btn-add-before" data-index="${index}" title="Insert Partition Before">+</button>
          <button class="icon-btn btn-delete" data-index="${index}" title="Delete Partition">✕</button>
        </div>
      </td>
    `;

    tbody.appendChild(tr);
  });

  // Attach Table Inputs Listeners
  tbody.querySelectorAll('input, select').forEach(input => {
    input.addEventListener('change', (e) => handleTableInputChange(e));
  });

  tbody.querySelectorAll('.btn-add-before').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      insertPartitionBefore(idx);
    });
  });

  tbody.querySelectorAll('.btn-delete').forEach(btn => {
    btn.addEventListener('click', (e) => {
      const idx = parseInt(e.target.dataset.index, 10);
      currentPartitions.splice(idx, 1);
      recalculateAndRender(false);
      showToast('Deleted partition', 'info');
    });
  });
}

function handleTableInputChange(e) {
  const index = parseInt(e.target.dataset.index, 10);
  const field = e.target.dataset.field;
  const val = e.target.value;
  const part = currentPartitions[index];

  try {
    if (field === 'name') {
      part.name = val.trim();
    } else if (field === 'hexStartAddr') {
      calculator.updateHexStartAddr(part, val);
    } else if (field === 'sizeMb') {
      calculator.updateSize(part, val, 'MB');
    } else if (field === 'sizeKb') {
      calculator.updateSize(part, val, 'KB');
    } else if (field === 'whichFlash') {
      part.whichFlash = parseInt(val, 10);
    }
    recalculateAndRender(false);
  } catch (err) {
    showToast(`Error: ${err.message}`, 'error');
    recalculateAndRender(false); // Reset to valid
  }
}

/**
 * Render Flash Visual Distribution Bar.
 * For NORPLUSNAND mode: Render NOR (Flash 0) and NAND (Flash 1) separately in 2 dedicated bars!
 */
function renderFlashBar() {
  const flashMapContainer = document.getElementById('flash-map-container');
  if (!flashMapContainer) return;
  flashMapContainer.innerHTML = '';

  if (currentPartitions.length === 0) return;

  const flashType = calculator.flashType;
  const colors = [
    '#1f6feb', '#238636', '#8957e5', '#d29922', '#db61a2',
    '#388bfd', '#3fb950', '#bc8cff', '#bb8009', '#f0883e'
  ];

  if (flashType === 'norplusnand') {
    // Separate partitions into Flash 0 (NOR) and Flash 1 (NAND)
    const flash0Parts = currentPartitions.filter(p => p.whichFlash === 0);
    const flash1Parts = currentPartitions.filter(p => p.whichFlash === 1);

    // 1. Render Flash 0 (First Flash: NOR)
    renderSingleFlashBar(flashMapContainer, "First Flash: NOR (Block Size: 64KB)", flash0Parts, colors, 0);

    // 2. Render Flash 1 (Second Flash: NAND)
    renderSingleFlashBar(flashMapContainer, `Second Flash: NAND (Block Size: ${calculator.primaryBlockSize / 1024}KB)`, flash1Parts, colors, flash0Parts.length);
  } else {
    // Single Flash Bar
    const barLabel = flashType === 'nor' ? "Flash 0: SPI-NOR (Block Size: 64KB)" : `Flash 0: QSPI-NAND (Block Size: ${calculator.primaryBlockSize / 1024}KB)`;
    renderSingleFlashBar(flashMapContainer, barLabel, currentPartitions, colors, 0);
  }
}

function renderSingleFlashBar(container, labelText, partitions, colors, colorOffset) {
  const labelDiv = document.createElement('div');
  labelDiv.style.fontSize = '0.8rem';
  labelDiv.style.fontWeight = '600';
  labelDiv.style.color = 'var(--text-secondary)';
  labelDiv.style.marginTop = '8px';
  labelDiv.style.marginBottom = '4px';
  labelDiv.innerText = labelText;
  container.appendChild(labelDiv);

  const barDiv = document.createElement('div');
  barDiv.className = 'flash-bar';

  if (partitions.length === 0) {
    const emptyDiv = document.createElement('div');
    emptyDiv.style.padding = '4px 12px';
    emptyDiv.style.fontSize = '0.8rem';
    emptyDiv.style.color = 'var(--text-secondary)';
    emptyDiv.innerText = '(No partitions assigned to this Flash)';
    barDiv.appendChild(emptyDiv);
    container.appendChild(barDiv);
    return;
  }

  const totalBlocks = partitions.reduce((acc, p) => acc + (p.sizeBlocks || 0), 0) || 1;
  const visualWeights = partitions.map(p => Math.sqrt(p.sizeBlocks || 1));
  const totalWeight = visualWeights.reduce((acc, w) => acc + w, 0);

  partitions.forEach((part, index) => {
    const rawRatio = (part.sizeBlocks || 0) / totalBlocks;
    const widthPct = Math.max(4.0, (visualWeights[index] / totalWeight) * 100);

    const div = document.createElement('div');
    div.className = 'flash-segment';

    if (rawRatio > 0.25) {
      div.classList.add('large-compressed');
    }

    if (part.errors.length > 0) {
      div.classList.add('overlap');
    }

    div.style.width = `${widthPct}%`;
    div.style.backgroundColor = colors[(index + colorOffset) % colors.length];

    let sizeDisplayStr = (part.sizeKb < 1024) ? `${part.sizeKb} KB` : `${part.sizeMb} MB`;
    const isCompressedMsg = rawRatio > 0.25 ? ' [Visual Scale Compressed ✂️]' : '';
    div.title = `${part.name} | Start: ${part.hexStartAddr} | Size: ${sizeDisplayStr}${isCompressedMsg}`;
    div.innerText = part.name;

    barDiv.appendChild(div);
  });

  container.appendChild(barDiv);
}

function insertPartitionBefore(index) {
  const targetPart = currentPartitions[index];

  const newPart = {
    id: 'part_' + Math.random().toString(36).substring(2, 9),
    name: `PART_${index + 1}`,
    startBlock: targetPart ? targetPart.startBlock : 0,
    sizeKb: 0, // Default size is 0 KB
    sizeBlocks: 0,
    whichFlash: targetPart ? targetPart.whichFlash : 0,
    attr1: 0x00,
    attr2: 0x00,
    attr3: 0xFF,
    attr4: 0xFF,
    errors: [],
    warnings: []
  };

  currentPartitions.splice(index, 0, newPart);
  recalculateAndRender(false); // Do NOT auto-cascade; preserve user's existing offsets
  showToast(`Inserted new partition before #${index + 1} (Default size: 0 KB)`, 'success');
}

function addNewPartitionEnd() {
  const lastPart = currentPartitions[currentPartitions.length - 1];
  const nextStartBlock = lastPart ? (lastPart.startBlock + lastPart.sizeBlocks) : 0;

  currentPartitions.push({
    id: 'part_' + Math.random().toString(36).substring(2, 9),
    name: `NEW_PART_${currentPartitions.length + 1}`,
    startBlock: nextStartBlock,
    sizeKb: 0, // Default size is 0 KB
    sizeBlocks: 0,
    whichFlash: 0,
    attr1: 0x00,
    attr2: 0x00,
    attr3: 0xFF,
    attr4: 0xFF,
    errors: [],
    warnings: []
  });

  recalculateAndRender(false);
  showToast('Added new partition (Default size: 0 KB)', 'success');
}

function autoAlignPartitions() {
  recalculateAndRender(true); // Force sequential cascade offsets ONLY when user clicks auto-align
  showToast(t('toastAlignedSuccess'), 'success');
}

// Modal Filename Customization
function openFilenameModal(exportType) {
  if (currentPartitions.length === 0) {
    showToast('No partitions to export', 'error');
    return;
  }
  pendingExportType = exportType;
  const inputFilename = document.getElementById('input-filename');
  inputFilename.value = (exportType === 'mbn') ? 'partition.mbn' : 'nand-partition.xml';

  const modal = document.getElementById('filename-modal');
  modal.classList.add('active');
  inputFilename.focus();
}

function closeFilenameModal() {
  const modal = document.getElementById('filename-modal');
  modal.classList.remove('active');
  pendingExportType = null;
}

function confirmFilenameExport() {
  const inputFilename = document.getElementById('input-filename');
  let filename = inputFilename.value.trim();

  if (!filename) {
    filename = (pendingExportType === 'mbn') ? 'partition.mbn' : 'nand-partition.xml';
  }

  const calcOptions = {
    pageSize: calculator.pageSize,
    primaryBlockSize: calculator.primaryBlockSize,
    norBlockSize: calculator.norBlockSize,
    flashType: calculator.flashType
  };

  if (pendingExportType === 'mbn') {
    if (!filename.includes('.')) filename += '.mbn';
    const blob = buildSystemMbn(currentPartitions, calcOptions);
    triggerDownload(blob, filename);
    showToast(t('toastExportMbnSuccess', { filename: filename }), 'success');
  } else if (pendingExportType === 'xml') {
    if (!filename.includes('.')) filename += '.xml';
    const blob = buildPartitionXml(currentPartitions, calcOptions);
    triggerDownload(blob, filename);
    showToast(t('toastExportXmlSuccess', { filename: filename }), 'success');
  }

  closeFilenameModal();
}

function triggerDownload(blob, filename) {
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
  URL.revokeObjectURL(url);
}

function showToast(message, type = 'info') {
  const container = document.getElementById('toast-container');
  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerText = message;
  container.appendChild(toast);
  setTimeout(() => {
    toast.remove();
  }, 3500);
}

function escapeHtml(str) {
  return str.replace(/[&<>"']/g, function(m) {
    return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#039;' }[m];
  });
}
