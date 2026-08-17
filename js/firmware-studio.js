/**
 * Firmware & Programmer Studio Engine (js/firmware-studio.js)
 * High-performance pure-frontend firmware processor for Qualcomm IPQ NAND/NOR
 */

const FirmwareStudio = {
  state: {
    file: null,
    fileName: '',
    fileSize: 0,
    rawBuffer: null,
    flatBuffer: null,
    baselineBuffer: null,
    baselinePartitions: null,
    detectedLayout: null,
    parsedMibib: null,
    partitions: [],
    blockSize: 128 * 1024, // Default 128KB block size
    pageSize: 2048,
    mibibOffset: 0,
    isMibibModified: false,
  },

  init() {
    this.bindEvents();
  },

  bindEvents() {
    const dropzone = document.getElementById('fw-dropzone');
    const fileInput = document.getElementById('fw-file-input');

    if (dropzone && fileInput) {
      dropzone.addEventListener('click', () => fileInput.click());
      fileInput.addEventListener('change', (e) => {
        if (e.target.files && e.target.files.length > 0) {
          this.loadFirmwareFile(e.target.files[0]);
        }
      });

      dropzone.addEventListener('dragover', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.add('drag-active');
      });

      dropzone.addEventListener('dragleave', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
      });

      dropzone.addEventListener('drop', (e) => {
        e.preventDefault();
        e.stopPropagation();
        dropzone.classList.remove('drag-active');
        if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
          this.loadFirmwareFile(e.dataTransfer.files[0]);
        }
      });
    }

    // Reload MIBIB Button
    const btnReloadMibib = document.getElementById('btn-fw-reload-mibib');
    if (btnReloadMibib) {
      btnReloadMibib.addEventListener('click', () => {
        this.reloadMibib(true);
      });
    }

    // Auto Convert MIBIB Button
    const btnConvertMibib = document.getElementById('btn-fw-convert-mibib');
    if (btnConvertMibib) {
      btnConvertMibib.addEventListener('click', () => {
        this.showConvertMibibModal();
      });
    }

    // Export Flat Firmware
    const btnExportFlat = document.getElementById('btn-fw-export-flat');
    if (btnExportFlat) {
      btnExportFlat.addEventListener('click', () => {
        this.exportFlatBinary();
      });
    }

    // Export QPIC Raw Dump
    const btnExportQpic = document.getElementById('btn-fw-export-qpic');
    if (btnExportQpic) {
      btnExportQpic.addEventListener('click', () => {
        this.showQpicExportModal();
      });
    }
  },

  showLoading(text = 'Processing...', progress = null) {
    let overlay = document.getElementById('fw-loading-overlay');
    if (!overlay) {
      overlay = document.createElement('div');
      overlay.id = 'fw-loading-overlay';
      overlay.className = 'modal-overlay active';
      overlay.innerHTML = `
        <div class="modal-content" style="text-align: center; max-width: 420px; padding: 24px;">
          <div class="spinner" style="margin: 0 auto 16px;"></div>
          <div id="fw-loading-text" style="font-weight: 600; font-size: 1.1rem; margin-bottom: 12px;">${text}</div>
          <div id="fw-loading-bar-container" style="background: var(--bg-tertiary); border-radius: 6px; overflow: hidden; height: 10px; display: none;">
            <div id="fw-loading-bar" style="background: var(--accent-blue); width: 0%; height: 100%; transition: width 0.1s;"></div>
          </div>
          <div id="fw-loading-pct" style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 8px; display: none;">0%</div>
        </div>
      `;
      document.body.appendChild(overlay);
    } else {
      overlay.classList.add('active');
      document.getElementById('fw-loading-text').innerText = text;
    }

    const barContainer = document.getElementById('fw-loading-bar-container');
    const bar = document.getElementById('fw-loading-bar');
    const pct = document.getElementById('fw-loading-pct');

    if (progress !== null && barContainer && bar && pct) {
      barContainer.style.display = 'block';
      pct.style.display = 'block';
      const percent = Math.min(100, Math.max(0, Math.round(progress * 100)));
      bar.style.width = `${percent}%`;
      pct.innerText = `${percent}%`;
    }
  },

  hideLoading() {
    const overlay = document.getElementById('fw-loading-overlay');
    if (overlay) {
      overlay.classList.remove('active');
    }
  },

  async loadFirmwareFile(file) {
    if (!file) return;

    // 136 MB max file size limit
    const MAX_SIZE = 136 * 1024 * 1024;
    if (file.size > MAX_SIZE) {
      alert(`File size (${(file.size / 1024 / 1024).toFixed(2)} MB) exceeds maximum allowed limit of 136 MB.`);
      return;
    }

    this.showLoading(i18n.t('msgLoadingFw') || 'Reading and analyzing firmware...');

    try {
      const arrayBuffer = await file.arrayBuffer();
      const rawUint8 = new Uint8Array(arrayBuffer);

      this.state.file = file;
      this.state.fileName = file.name;
      this.state.fileSize = file.size;
      this.state.rawBuffer = rawUint8;

      // Detect layout
      const layout = QpicCodec.detectLayout(rawUint8);
      this.state.detectedLayout = layout;

      if (layout.isQpic) {
        this.showLoading(i18n.t('msgDeinterleaving') || 'De-interleaving QPIC Codewords...', 0);
        await new Promise((resolve) => setTimeout(resolve, 50)); // Allow UI to update

        this.state.flatBuffer = QpicCodec.deinterleaveQpic(rawUint8, layout.geometry, (prog) => {
          this.showLoading(i18n.t('msgDeinterleaving') || 'De-interleaving QPIC Codewords...', prog);
        });
      } else {
        this.state.flatBuffer = new Uint8Array(arrayBuffer);
      }

      // Parse MIBIB from flatBuffer
      this.reloadMibib(false);

      // Save initial baseline snapshot
      this.state.baselineBuffer = new Uint8Array(this.state.flatBuffer);
      this.state.baselinePartitions = this.state.partitions.map((p) => ({ ...p }));

      // Render workspace
      this.renderWorkspace();
      this.hideLoading();

      showToast(i18n.t('toastFwLoaded') || `Firmware loaded successfully! (${(this.state.flatBuffer.length / 1024 / 1024).toFixed(2)} MB)`, 'success');
    } catch (err) {
      this.hideLoading();
      console.error(err);
      alert(`Failed to process firmware: ${err.message}`);
    }
  },

  /**
   * Calculate effective data length by trimming trailing 0xFF / 0x00 bytes
   */
  getEffectiveDataLength(buffer, startOffset, endOffset) {
    if (!buffer || startOffset >= buffer.length) return 0;
    const availEnd = Math.min(endOffset, buffer.length);
    let lastValid = startOffset - 1;
    for (let i = availEnd - 1; i >= startOffset; i--) {
      if (buffer[i] !== 0xff && buffer[i] !== 0x00) {
        lastValid = i;
        break;
      }
    }
    return lastValid >= startOffset ? (lastValid - startOffset + 1) : 0;
  },

  /**
   * Inspect partition data in flat buffer to determine if it is original data, completely empty, or out of range
   */
  inspectPartitionContent(startOffset, endOffset) {
    if (!this.state.flatBuffer) return 'none';
    if (startOffset >= this.state.flatBuffer.length) return 'none';

    const availableEnd = Math.min(endOffset, this.state.flatBuffer.length);
    let isAllFf = true;
    let isAll00 = true;

    for (let i = startOffset; i < availableEnd; i++) {
      const b = this.state.flatBuffer[i];
      if (b !== 0xff) isAllFf = false;
      if (b !== 0x00) isAll00 = false;
      if (!isAllFf && !isAll00) return 'original';
    }

    if (isAllFf || isAll00) return 'empty';
    return 'original';
  },

  /**
   * Check for 0: partition physical start offset or size shifts relative to baseline
   */
  checkZeroPartitionShifts(newEntries, blockSize) {
    if (!this.state.baselinePartitions || this.state.baselinePartitions.length === 0) {
      return { hasChanges: false, changes: [], hasOverflow: false };
    }

    const oldMap = new Map();
    this.state.baselinePartitions
      .filter((p) => p.name.toUpperCase().startsWith('0:'))
      .forEach((p) => {
        oldMap.set(p.name.toUpperCase(), p);
      });

    const changes = [];
    let hasOverflow = false;

    newEntries
      .filter((p) => p.name.toUpperCase().startsWith('0:'))
      .forEach((newP) => {
        const newStart = newP.startBlock * blockSize;
        const newSize = newP.sizeBlocks * blockSize;
        const newEnd = newStart + newSize;

        const oldP = oldMap.get(newP.name.toUpperCase());
        if (oldP) {
          if (oldP.startOffset !== newStart || oldP.sizeBytes !== newSize) {
            const effLen = this.getEffectiveDataLength(
              this.state.baselineBuffer,
              oldP.startOffset,
              oldP.endOffset
            );
            const isOverflow = effLen > newSize;
            if (isOverflow) hasOverflow = true;

            changes.push({
              name: newP.name,
              oldStart: oldP.startOffset,
              newStart: newStart,
              oldSize: oldP.sizeBytes,
              newSize: newSize,
              effectiveDataLen: effLen,
              isOverflow: isOverflow,
            });
          }
        }
      });

    return {
      hasChanges: changes.length > 0,
      changes: changes,
      hasOverflow: hasOverflow,
    };
  },

  reloadMibib(showSuccessToast = true) {
    if (!this.state.flatBuffer) return;

    try {
      const parsed = parseMibibBin(this.state.flatBuffer.buffer);
      this.state.parsedMibib = parsed;
      this.state.mibibOffset = parsed.mibibOffset;

      // Determine block size & page size: Prioritize MIBIB header spacing, then current state
      let blockSize = parsed.detectedBlockSize || this.state.blockSize || (128 * 1024);
      let pageSize = parsed.detectedPageSize || this.state.pageSize || 2048;

      if (!parsed.detectedBlockSize && this.state.detectedLayout && this.state.detectedLayout.isQpic) {
        pageSize = this.state.detectedLayout.pageSize;
        blockSize = pageSize === 4096 ? 256 * 1024 : 128 * 1024;
      }

      this.state.blockSize = blockSize;
      this.state.pageSize = pageSize;

      // Build enriched partition list
      let lastMandatoryIndex = -1;

      this.state.partitions = parsed.entries.map((entry, index) => {
        let startBlock = entry.startBlock;
        let sizeBlocks = entry.sizeBlocks;

        if (parsed.tableType === 'user') {
          startBlock = Math.floor((entry.sizeKb * 1024) / blockSize);
          sizeBlocks = Math.ceil((entry.padKb * 1024) / blockSize) || 1;
        }

        const startOffset = startBlock * blockSize;
        const sizeBytes = sizeBlocks * blockSize;
        const endOffset = startOffset + sizeBytes;
        const isMandatory = entry.name.toUpperCase().startsWith('0:');
        const contentStatus = this.inspectPartitionContent(startOffset, endOffset);

        if (isMandatory) {
          lastMandatoryIndex = Math.max(lastMandatoryIndex, index);
        }

        return {
          index: index + 1,
          name: entry.name,
          startBlock: startBlock,
          sizeBlocks: sizeBlocks,
          startOffset: startOffset,
          endOffset: endOffset,
          sizeBytes: sizeBytes,
          sizeKb: sizeBytes / 1024,
          sizeMb: (sizeBytes / (1024 * 1024)).toFixed(2),
          whichFlash: entry.whichFlash !== undefined ? entry.whichFlash : 0,
          attr1: entry.attr1 !== undefined ? entry.attr1 : 0xff,
          attr2: entry.attr2 !== undefined ? entry.attr2 : 0xff,
          attr3: entry.attr3 !== undefined ? entry.attr3 : 0xff,
          attr4: entry.attr4 !== undefined ? entry.attr4 : 0xff,
          isMandatory: isMandatory,
          contentStatus: contentStatus,
          selected: isMandatory || (contentStatus === 'original'),
          status: 'original',
          modifiedInfo: null,
        };
      });

      // Auto-select all preceding partitions up to the highest mandatory 0: partition
      const selectLimit = Math.max(lastMandatoryIndex, 0);
      for (let i = 0; i <= selectLimit; i++) {
        if (this.state.partitions[i]) {
          this.state.partitions[i].selected = true;
        }
      }

      this.renderPartitionTable();
      this.renderFlashBar();
      this.renderExportScopeBanner();

      // Reset reload button highlight
      const btnReload = document.getElementById('btn-fw-reload-mibib');
      if (btnReload) {
        btnReload.classList.remove('btn-pulse-highlight');
      }

      if (showSuccessToast) {
        showToast(i18n.t('toastMibibReloaded') || `MIBIB Partition Table reloaded! (${this.state.partitions.length} partitions found)`, 'success');
      }
    } catch (err) {
      console.warn('Could not parse MIBIB:', err);
      this.state.partitions = [];
      this.renderPartitionTable();
      this.renderFlashBar();
      this.renderExportScopeBanner();
      if (showSuccessToast) {
        showToast(`Could not find valid MIBIB table in binary: ${err.message}`, 'error');
      }
    }
  },

  renderWorkspace() {
    const workspace = document.getElementById('fw-workspace');
    if (workspace) {
      workspace.style.display = 'block';
    }

    // Fill firmware info badge
    const infoCard = document.getElementById('fw-info-card');
    if (infoCard && this.state.flatBuffer) {
      const layout = this.state.detectedLayout;
      const isQpic = layout && layout.isQpic;
      const rawMb = (this.state.fileSize / 1024 / 1024).toFixed(2);
      const flatMb = (this.state.flatBuffer.length / 1024 / 1024).toFixed(2);

      infoCard.innerHTML = `
        <div style="display: flex; flex-wrap: wrap; gap: 16px; align-items: center; justify-content: space-between;">
          <div>
            <div style="font-size: 1.1rem; font-weight: 700; color: var(--text-primary);">
              📁 ${this.state.fileName}
            </div>
            <div style="font-size: 0.85rem; color: var(--text-secondary); margin-top: 4px;">
              <span><strong>Input Size:</strong> ${rawMb} MB (${this.state.fileSize.toLocaleString()} bytes)</span> | 
              <span><strong>De-interleaved Flat Size:</strong> ${flatMb} MB (${this.state.flatBuffer.length.toLocaleString()} bytes)</span>
            </div>
          </div>
          <div>
            <span class="badge ${isQpic ? 'badge-blue' : 'badge-green'}" style="font-size: 0.9rem; padding: 6px 12px;">
              ${layout ? layout.formatName : 'Flat Binary'}
            </span>
          </div>
        </div>
      `;
    }

    this.renderPartitionTable();
    this.renderFlashBar();
    this.renderExportScopeBanner();
  },

  renderExportScopeBanner() {
    let banner = document.getElementById('fw-export-scope-banner');
    if (!banner) {
      banner = document.createElement('div');
      banner.id = 'fw-export-scope-banner';
      banner.className = 'panel';
      banner.style.backgroundColor = 'var(--bg-tertiary)';
      banner.style.padding = '10px 16px';
      banner.style.marginBottom = '16px';
      banner.style.display = 'flex';
      banner.style.flexWrap = 'wrap';
      banner.style.justifyContent = 'space-between';
      banner.style.alignItems = 'center';
      banner.style.fontSize = '0.9rem';

      const actionsBar = document.querySelector('#tab-firmware .actions-bar');
      if (actionsBar && actionsBar.parentNode) {
        actionsBar.parentNode.insertBefore(banner, actionsBar);
      }
    }

    if (this.state.partitions.length === 0) {
      banner.style.display = 'none';
      return;
    }

    banner.style.display = 'flex';
    const selectedParts = this.state.partitions.filter((p) => p.selected);
    const selectedCount = selectedParts.length;
    const totalCount = this.state.partitions.length;

    let maxEndOffset = 0;
    selectedParts.forEach((p) => {
      if (p.endOffset > maxEndOffset) maxEndOffset = p.endOffset;
    });

    const sizeMb = (maxEndOffset / (1024 * 1024)).toFixed(2);
    const sizeBlocks = Math.ceil(maxEndOffset / this.state.blockSize);
    const endHex = maxEndOffset.toString(16).toUpperCase().padStart(8, '0');

    const geomTag = (this.state.pageSize === 4096 || this.state.blockSize >= 256 * 1024)
      ? (i18n.t('tag4kLayout') || '4K Structure (256KB Block)')
      : (i18n.t('tag2kLayout') || '2K Structure (128KB Block)');

    banner.innerHTML = `
      <div style="display: flex; align-items: center; gap: 8px;">
        <span style="font-weight: 700; color: var(--accent-blue);">📦</span>
        <span>
          ${i18n.t('fwExportScope', {
            geomTag: geomTag,
            count: selectedCount,
            total: totalCount,
            endOffset: endHex,
            sizeMb: sizeMb,
            sizeBlocks: sizeBlocks,
          })}
        </span>
      </div>
      <div style="font-size: 0.8rem; color: var(--text-secondary);">
        ⚡ Range: <strong>0x00000000</strong> ➔ <strong>0x${endHex}</strong>
      </div>
    `;
  },

  handleCheckboxToggle(index, isChecked) {
    const targetPart = this.state.partitions[index];
    if (!targetPart) return;

    if (isChecked) {
      // Check target and automatically select all preceding partitions
      for (let i = 0; i <= index; i++) {
        this.state.partitions[i].selected = true;
      }
    } else {
      // Uncheck target
      if (targetPart.isMandatory) {
        showToast(i18n.t('fwMandatoryBoot') || 'Mandatory Boot Partition (0: prefixed)', 'warning');
        targetPart.selected = true;
      } else {
        // Uncheck all following non-mandatory partitions
        for (let i = index; i < this.state.partitions.length; i++) {
          if (!this.state.partitions[i].isMandatory) {
            this.state.partitions[i].selected = false;
          }
        }
      }
    }

    this.renderPartitionTable();
    this.renderExportScopeBanner();
  },

  renderPartitionTable() {
    const tbody = document.getElementById('fw-partition-tbody');
    if (!tbody) return;

    tbody.innerHTML = '';

    if (this.state.partitions.length === 0) {
      tbody.innerHTML = `
        <tr>
          <td colspan="10" style="text-align: center; padding: 24px; color: var(--text-secondary);">
            ⚠️ No MIBIB partition table found. Please check if this is an encrypted or raw non-MIBIB firmware.
          </td>
        </tr>
      `;
      return;
    }

    this.state.partitions.forEach((part, index) => {
      const tr = document.createElement('tr');
      const isModified = part.status === 'modified';
      const isMibibPart = part.name.toUpperCase().includes('MIBIB');

      let statusBadgeHtml = '';
      if (isModified) {
        const tip = i18n.t('tooltipModified', {
          file: part.modifiedInfo.fileName,
          size: (part.modifiedInfo.newSize / 1024).toFixed(1),
        });
        statusBadgeHtml = `<span class="badge badge-green" title="${tip}">${i18n.t('statusModified')}</span>`;
      } else if (part.contentStatus === 'none') {
        const tip = i18n.t('tooltipNone', {
          fileSize: (this.state.flatBuffer.length / 1024 / 1024).toFixed(2),
        });
        statusBadgeHtml = `<span class="badge badge-none" title="${tip}">${i18n.t('statusNone')}</span>`;
      } else if (part.contentStatus === 'empty') {
        const tip = i18n.t('tooltipEmpty');
        statusBadgeHtml = `<span class="badge badge-empty" title="${tip}">${i18n.t('statusEmpty')}</span>`;
      } else {
        const tip = i18n.t('tooltipOriginal');
        statusBadgeHtml = `<span class="badge badge-gray" title="${tip}">${i18n.t('statusOriginal')}</span>`;
      }

      tr.innerHTML = `
        <td style="text-align: center; width: 48px;">
          <input type="checkbox" 
                 ${part.selected ? 'checked' : ''} 
                 onchange="FirmwareStudio.handleCheckboxToggle(${index}, this.checked)"
                 style="cursor: pointer; transform: scale(1.2);"
                 title="${part.isMandatory ? 'Mandatory Boot Partition' : 'Select partition for export'}">
        </td>
        <td>${part.index}</td>
        <td class="col-name">
          <span style="font-weight: 700; color: ${isMibibPart ? 'var(--accent-orange)' : 'var(--text-primary)'};">
            ${part.name}
          </span>
        </td>
        <td class="col-block" style="font-size: 0.85rem; text-align: center;">${part.startBlock}</td>
        <td class="col-block" style="font-size: 0.85rem; text-align: center;">${part.sizeBlocks}</td>
        <td class="col-hex" style="font-size: 0.85rem;">0x${part.startOffset.toString(16).toUpperCase().padStart(8, '0')}</td>
        <td class="col-hex" style="font-size: 0.85rem;">0x${part.endOffset.toString(16).toUpperCase().padStart(8, '0')}</td>
        <td class="col-size">${part.sizeMb} MB <span style="color: var(--text-secondary); font-size: 0.8rem;">(${part.sizeKb.toLocaleString()} KB)</span></td>
        <td class="col-status">
          ${statusBadgeHtml}
        </td>
        <td class="col-actions">
          <div style="display: flex; gap: 6px;">
            <button class="btn btn-sm" onclick="FirmwareStudio.exportSinglePartition(${index})" title="Extract and download this partition as standalone binary">
              📥 Export
            </button>
            <button class="btn btn-sm btn-blue" onclick="FirmwareStudio.triggerPartitionReplace(${index})" title="Upload a new file to replace this partition content">
              🔄 Replace
            </button>
          </div>
        </td>
      `;
      tbody.appendChild(tr);
    });
  },

  renderFlashBar() {
    const container = document.getElementById('fw-flash-bar');
    if (!container || !this.state.flatBuffer || this.state.partitions.length === 0) return;

    container.innerHTML = '';
    const partitions = this.state.partitions;
    const totalBlocks = partitions.reduce((acc, p) => acc + (p.sizeBlocks || 0), 0) || 1;
    const visualWeights = partitions.map((p) => Math.sqrt(p.sizeBlocks || 1));
    const totalWeight = visualWeights.reduce((acc, w) => acc + w, 0);

    const colors = [
      '#58a6ff', '#3fb950', '#d29922', '#db61a2', '#f0883e',
      '#a371f7', '#79c0ff', '#56d364', '#e3b341', '#bc8cff',
      '#f778ba', '#388bfd', '#2ea043', '#bb8009', '#8957e5'
    ];

    partitions.forEach((part, index) => {
      const rawRatio = (part.sizeBlocks || 0) / totalBlocks;
      const widthPct = Math.max(4.0, (visualWeights[index] / totalWeight) * 100);

      const div = document.createElement('div');
      div.className = 'flash-segment';

      if (rawRatio > 0.25) {
        div.classList.add('large-compressed');
      }

      div.style.width = `${widthPct}%`;
      div.style.backgroundColor = colors[index % colors.length];

      const sizeDisplayStr = (part.sizeKb < 1024) ? `${part.sizeKb} KB` : `${part.sizeMb} MB`;
      const isCompressedMsg = rawRatio > 0.25 ? ' [Visual Scale Compressed ✂️]' : '';
      const hexStart = '0x' + part.startOffset.toString(16).toUpperCase().padStart(8, '0');
      const hexEnd = '0x' + part.endOffset.toString(16).toUpperCase().padStart(8, '0');
      div.title = `${part.name} | Start: ${hexStart} - ${hexEnd} | Size: ${sizeDisplayStr}${isCompressedMsg}`;
      div.innerText = part.name;

      container.appendChild(div);
    });
  },

  triggerPartitionReplace(index) {
    const part = this.state.partitions[index];
    if (!part) return;

    const input = document.createElement('input');
    input.type = 'file';
    input.accept = '.bin,.mbn,.img,.raw';
    input.onchange = async (e) => {
      if (e.target.files && e.target.files.length > 0) {
        const file = e.target.files[0];
        await this.replacePartition(index, file);
      }
    };
    input.click();
  },

  async replacePartition(index, file) {
    const part = this.state.partitions[index];
    if (!part || !this.state.flatBuffer) return;

    if (file.size > part.sizeBytes) {
      alert(`⚠️ Cannot replace partition [${part.name}]!\n\nUploaded file size (${(file.size / 1024).toFixed(2)} KB) exceeds partition capacity (${(part.sizeBytes / 1024).toFixed(2)} KB).\n\nPlease resize the partition table first or provide a smaller image.`);
      return;
    }

    try {
      this.showLoading(`Writing ${file.name} to [${part.name}]...`);
      const fileBuffer = await file.arrayBuffer();
      const fileBytes = new Uint8Array(fileBuffer);

      const isMibibPart = part.name.toUpperCase().includes('MIBIB');

      if (isMibibPart) {
        // Parse new MIBIB to check for 0: partition shifts
        let parsedNew;
        try {
          parsedNew = parseMibibBin(fileBuffer);
        } catch (e) {
          console.warn('Uploaded file is not a complete MIBIB binary or failed to parse:', e);
        }

        if (parsedNew && parsedNew.entries) {
          const shiftResult = this.checkZeroPartitionShifts(parsedNew.entries, this.state.blockSize);
          if (shiftResult.hasChanges) {
            this.hideLoading();
            this.showZeroMigrationModal(shiftResult, fileBytes, parsedNew, part, file.name);
            return;
          }
        }
      }

      // Standard single partition write
      this.applyPartitionWrite(part, fileBytes, file.name, isMibibPart);
      this.hideLoading();
    } catch (err) {
      this.hideLoading();
      console.error(err);
      alert(`Failed to replace partition: ${err.message}`);
    }
  },

  applyPartitionWrite(part, fileBytes, fileName, isMibibPart) {
    // If writing to a partition that was previously out of bounds, expand flatBuffer
    if (part.startOffset + part.sizeBytes > this.state.flatBuffer.length) {
      const newFlat = new Uint8Array(part.startOffset + part.sizeBytes);
      newFlat.fill(0xff);
      newFlat.set(this.state.flatBuffer, 0);
      this.state.flatBuffer = newFlat;
    }

    // Write into flatBuffer
    this.state.flatBuffer.set(fileBytes, part.startOffset);

    // Pad remainder with 0xFF
    const remainderOffset = part.startOffset + fileBytes.length;
    const remainderLength = part.sizeBytes - fileBytes.length;
    if (remainderLength > 0) {
      this.state.flatBuffer.subarray(remainderOffset, remainderOffset + remainderLength).fill(0xff);
    }

    // Mark partition status
    part.status = 'modified';
    part.contentStatus = 'original';
    part.selected = true;
    part.modifiedInfo = {
      fileName: fileName,
      newSize: fileBytes.length,
    };

    if (isMibibPart) {
      this.reloadMibib(false);
      showToast(`Partition [${part.name}] updated with new MIBIB! Partition table reloaded.`, 'success');
    } else {
      this.renderPartitionTable();
      this.renderExportScopeBanner();
      showToast(`Partition [${part.name}] replaced successfully with ${fileName}!`, 'success');
    }
  },

  showZeroMigrationModal(shiftResult, newMbnBytes, parsedNew, mibibPart, fileName) {
    let modal = document.getElementById('fw-migration-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fw-migration-modal';
      modal.className = 'modal-overlay';
      document.body.appendChild(modal);
    }

    const rowsHtml = shiftResult.changes
      .map((c) => {
        const oldHex = `0x${c.oldStart.toString(16).toUpperCase()} (${(c.oldSize / 1024).toFixed(0)} KB)`;
        const newHex = `0x${c.newStart.toString(16).toUpperCase()} (${(c.newSize / 1024).toFixed(0)} KB)`;
        const payloadKb = `${(c.effectiveDataLen / 1024).toFixed(1)} KB`;
        const statusBadge = c.isOverflow
          ? `<span class="badge badge-orange">⚠️ 溢出 (${payloadKb} > ${(c.newSize / 1024).toFixed(0)} KB)</span>`
          : `<span class="badge badge-green">✅ 可迁移 (${payloadKb})</span>`;

        return `
          <tr>
            <td style="font-weight: 700;">${c.name}</td>
            <td style="font-size: 0.85rem;">${oldHex}</td>
            <td style="font-size: 0.85rem; color: var(--accent-blue);">${newHex}</td>
            <td style="font-size: 0.85rem;">${payloadKb}</td>
            <td>${statusBadge}</td>
          </tr>
        `;
      })
      .join('');

    modal.innerHTML = `
      <div class="modal-content" style="max-width: 680px;">
        <div class="modal-title" style="color: var(--accent-orange);">
          ${i18n.t('modalMigrationTitle')}
        </div>
        <div class="modal-body">
          <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 14px; line-height: 1.5;">
            ${i18n.t('modalMigrationDesc')}
          </p>
          <div style="max-height: 240px; overflow-y: auto; border: 1px solid var(--border-color); border-radius: 6px; margin-bottom: 16px;">
            <table style="width: 100%; border-collapse: collapse;">
              <thead>
                <tr style="background: var(--bg-tertiary);">
                  <th style="padding: 8px 10px; font-size: 0.8rem;">分区</th>
                  <th style="padding: 8px 10px; font-size: 0.8rem;">原物理地址</th>
                  <th style="padding: 8px 10px; font-size: 0.8rem;">新物理地址</th>
                  <th style="padding: 8px 10px; font-size: 0.8rem;">有效数据</th>
                  <th style="padding: 8px 10px; font-size: 0.8rem;">状态</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml}
              </tbody>
            </table>
          </div>
        </div>
        <div class="modal-footer" style="display: flex; justify-content: flex-end; gap: 10px;">
          <button class="btn" id="btn-cancel-migration">${i18n.t('btnCancelImport')}</button>
          <button class="btn btn-primary" id="btn-confirm-migration">${i18n.t('btnAutoMigrate')}</button>
        </div>
      </div>
    `;

    modal.classList.add('active');

    // Cancel Button
    document.getElementById('btn-cancel-migration').onclick = () => {
      modal.classList.remove('active');
      showToast(i18n.t('toastMigrationCancelled'), 'info');
    };

    // Confirm Auto-Migrate Button
    document.getElementById('btn-confirm-migration').onclick = () => {
      if (shiftResult.hasOverflow) {
        const overflowPart = shiftResult.changes.find((c) => c.isOverflow);
        alert(
          i18n.t('errMigrationOverflow', {
            name: overflowPart.name,
            effSize: (overflowPart.effectiveDataLen / 1024).toFixed(1),
            newSize: (overflowPart.newSize / 1024).toFixed(1),
          })
        );
        return;
      }

      this.executeZeroPartitionMigration(parsedNew, newMbnBytes, mibibPart, fileName);
      modal.classList.remove('active');
    };
  },

  executeZeroPartitionMigration(parsedNew, newMbnBytes, mibibPart, fileName) {
    try {
      this.showLoading('Executing 0: Boot Partitions Binary Migration...');

      const blockSize = this.state.blockSize;
      const oldMap = new Map();
      this.state.baselinePartitions
        .filter((p) => p.name.toUpperCase().startsWith('0:'))
        .forEach((p) => {
          oldMap.set(p.name.toUpperCase(), p);
        });

      const newZeroEntries = parsedNew.entries
        .filter((p) => p.name.toUpperCase().startsWith('0:'))
        .map((p) => ({
          name: p.name,
          startOffset: p.startBlock * blockSize,
          sizeBytes: p.sizeBlocks * blockSize,
          endOffset: (p.startBlock + p.sizeBlocks) * blockSize,
        }));

      // Determine required buffer size
      let maxEnd = this.state.flatBuffer.length;
      newZeroEntries.forEach((p) => {
        if (p.endOffset > maxEnd) maxEnd = p.endOffset;
      });

      const migratedBuffer = new Uint8Array(maxEnd);
      migratedBuffer.fill(0xff);

      // Copy non-0: baseline buffer contents
      migratedBuffer.set(
        this.state.baselineBuffer.subarray(0, Math.min(this.state.baselineBuffer.length, maxEnd)),
        0
      );

      // Clear all new 0: partition spaces with 0xFF
      newZeroEntries.forEach((p) => {
        migratedBuffer.subarray(p.startOffset, p.startOffset + p.sizeBytes).fill(0xff);
      });

      // Migrate effective payload from baselineBuffer for each 0: partition
      newZeroEntries.forEach((newP) => {
        const oldP = oldMap.get(newP.name.toUpperCase());
        if (oldP) {
          const effLen = this.getEffectiveDataLength(
            this.state.baselineBuffer,
            oldP.startOffset,
            oldP.endOffset
          );
          if (effLen > 0) {
            const slice = this.state.baselineBuffer.subarray(oldP.startOffset, oldP.startOffset + effLen);
            migratedBuffer.set(slice, newP.startOffset);
          }
        }
      });

      // Write new MIBIB binary at its new location
      const newMibibEntry = newZeroEntries.find((p) => p.name.toUpperCase().includes('MIBIB'));
      const targetMibibOffset = newMibibEntry ? newMibibEntry.startOffset : (mibibPart ? mibibPart.startOffset : (64 * 1024));
      migratedBuffer.set(newMbnBytes, targetMibibOffset);

      // Apply new buffer as current state and new baseline
      this.state.flatBuffer = migratedBuffer;
      this.state.baselineBuffer = new Uint8Array(migratedBuffer);

      // Reload MIBIB
      this.reloadMibib(false);
      this.state.baselinePartitions = this.state.partitions.map((p) => ({ ...p }));

      this.hideLoading();
      showToast(i18n.t('toastMigrationSuccess'), 'success');
    } catch (err) {
      this.hideLoading();
      console.error(err);
      alert(`Migration failed: ${err.message}`);
    }
  },

  exportSinglePartition(index) {
    const part = this.state.partitions[index];
    if (!part || !this.state.flatBuffer) return;

    if (part.contentStatus === 'none' && part.startOffset >= this.state.flatBuffer.length) {
      alert(`Partition [${part.name}] is not present in this firmware dump (beyond file boundary).`);
      return;
    }

    const availableEnd = Math.min(part.startOffset + part.sizeBytes, this.state.flatBuffer.length);
    const slice = new Uint8Array(part.sizeBytes);
    slice.fill(0xff);
    if (part.startOffset < availableEnd) {
      slice.set(this.state.flatBuffer.subarray(part.startOffset, availableEnd), 0);
    }

    const blob = new Blob([slice], { type: 'application/octet-stream' });
    const cleanName = part.name.replace(/[^a-zA-Z0-9_-]/g, '_');
    const filename = `${cleanName}.bin`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);

    showToast(`Exported partition [${part.name}] as ${filename}`, 'success');
  },

  showConvertMibibModal() {
    let modal = document.getElementById('fw-convert-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fw-convert-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 480px;">
          <div class="modal-title">⚙️ Auto-Convert MIBIB (Block Size Re-alignment)</div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
              Recalculates all partition <code>start_block</code> and <code>size_blocks</code> based on your target NAND flash physical block size (e.g. 2K page = 128KB, 4K page = 256KB or 512KB) and writes the new MIBIB back into the firmware.
            </p>
            <div class="form-group">
              <label for="select-fw-target-block">Target Physical Block Size</label>
              <select id="select-fw-target-block" style="width: 100%;">
                <option value="262144" selected>256 KiB Block Size (4K Page NAND / 4K Upgrade)</option>
                <option value="524288">512 KiB Block Size (4K Page NAND Large Block)</option>
                <option value="131072">128 KiB Block Size (2K Page Standard NAND)</option>
                <option value="65536">64 KiB Block Size (SPI-NOR Flash)</option>
              </select>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="document.getElementById('fw-convert-modal').classList.remove('active')">Cancel</button>
            <button class="btn btn-primary" id="btn-fw-confirm-convert">Convert & Update MIBIB</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      document.getElementById('btn-fw-confirm-convert').addEventListener('click', () => {
        const select = document.getElementById('select-fw-target-block');
        const targetBlockSize = parseInt(select.value, 10);
        modal.classList.remove('active');
        this.autoConvertMibib(targetBlockSize);
      });
    }

    modal.classList.add('active');
  },

  autoConvertMibib(targetBlockSizeBytes) {
    if (!this.state.flatBuffer || this.state.partitions.length === 0) return;

    try {
      this.showLoading('Recalculating and updating MIBIB binary...');

      const targetPageSize = targetBlockSizeBytes >= 262144 ? 4096 : 2048;

      // Recalculate partitions
      const convertedPartitions = this.state.partitions.map((part) => {
        const newStartBlock = Math.floor(part.startOffset / targetBlockSizeBytes);
        const newSizeBlocks = Math.max(1, Math.ceil(part.sizeBytes / targetBlockSizeBytes));
        return {
          name: part.name,
          startBlock: newStartBlock,
          sizeBlocks: newSizeBlocks,
          whichFlash: part.whichFlash,
          attr1: part.attr1,
          attr2: part.attr2,
          attr3: part.attr3,
          attr4: part.attr4,
          sizeKb: (newSizeBlocks * targetBlockSizeBytes) / 1024,
          padKb: 0,
        };
      });

      // Build new MIBIB binary
      const newMbnBytes = buildSystemMbnBytes(convertedPartitions, {
        primaryBlockSize: targetBlockSizeBytes,
        pageSize: targetPageSize,
        flashType: 'nand',
      });

      // Write into flatBuffer at MIBIB offset
      const offset = this.state.mibibOffset || (64 * 1024);
      if (offset + newMbnBytes.length <= this.state.flatBuffer.length) {
        this.state.flatBuffer.set(newMbnBytes, offset);
      }

      this.state.blockSize = targetBlockSizeBytes;
      this.state.pageSize = targetPageSize;

      // Reload MIBIB
      this.reloadMibib(false);
      this.state.baselineBuffer = new Uint8Array(this.state.flatBuffer);
      this.state.baselinePartitions = this.state.partitions.map((p) => ({ ...p }));

      this.hideLoading();
      showToast(`MIBIB converted successfully for ${(targetBlockSizeBytes / 1024)} KiB Block Size!`, 'success');
    } catch (err) {
      this.hideLoading();
      console.error(err);
      alert(`Failed to convert MIBIB: ${err.message}`);
    }
  },

  getSelectedExportBuffer() {
    if (!this.state.flatBuffer || this.state.partitions.length === 0) {
      return this.state.flatBuffer;
    }

    const selectedParts = this.state.partitions.filter((p) => p.selected);
    if (selectedParts.length === 0) {
      return this.state.flatBuffer;
    }

    let maxEndOffset = 0;
    selectedParts.forEach((p) => {
      if (p.endOffset > maxEndOffset) maxEndOffset = p.endOffset;
    });

    if (maxEndOffset >= this.state.flatBuffer.length) {
      return this.state.flatBuffer;
    }

    return this.state.flatBuffer.slice(0, maxEndOffset);
  },

  exportFlatBinary() {
    if (!this.state.flatBuffer) return;

    const exportBuffer = this.getSelectedExportBuffer();
    const blob = new Blob([exportBuffer], { type: 'application/octet-stream' });
    const baseName = this.state.fileName.replace(/\.[^/.]+$/, '');
    const isPartial = exportBuffer.length < this.state.flatBuffer.length;
    const filename = `${baseName}${isPartial ? '_selected' : ''}_flat.bin`;

    const a = document.createElement('a');
    a.href = URL.createObjectURL(blob);
    a.download = filename;
    a.click();
    URL.revokeObjectURL(a.href);

    showToast(`Exported Flat Firmware: ${filename} (${(exportBuffer.length / 1024 / 1024).toFixed(2)} MB)`, 'success');
  },

  showQpicExportModal() {
    if (!this.state.flatBuffer) return;

    let modal = document.getElementById('fw-qpic-export-modal');
    if (!modal) {
      modal = document.createElement('div');
      modal.id = 'fw-qpic-export-modal';
      modal.className = 'modal-overlay';
      modal.innerHTML = `
        <div class="modal-content" style="max-width: 540px;">
          <div class="modal-title">⚡ Export Qualcomm QPIC Raw Programmer Dump</div>
          <div class="modal-body">
            <p style="font-size: 0.85rem; color: var(--text-secondary); margin-bottom: 16px;">
              Encodes the selected partition range into Qualcomm QPIC interleaved layout for direct flashing with T48, RT809H, or STM32 programmer.
            </p>
            <div class="form-group" style="margin-bottom: 14px;">
              <label for="select-qpic-target-geom">Target NAND Flash Geometry</label>
              <select id="select-qpic-target-geom" style="width: 100%;">
                <option value="0" selected>2K Page + 64B OOB (BCH4) — e.g. Xiaomi AX5 Original 128MB</option>
                <option value="1">2K Page + 128B OOB (BCH8) — e.g. 2K SLC 128B Spare</option>
                <option value="2">4K Page + 128B OOB (BCH4) — e.g. 4K 128B OOB Upgrade Flash</option>
                <option value="custom" data-i18n="optCustomGeom">⚙️ Custom Flash Geometry (User-defined OOB / Page)...</option>
              </select>
            </div>

            <!-- Custom OOB / Geometry Configuration Section -->
            <div id="fw-custom-geom-panel" style="display: none; background: var(--bg-tertiary); padding: 14px; border-radius: 6px; border: 1px solid var(--border-color); margin-bottom: 14px;">
              <div style="font-weight: 600; font-size: 0.9rem; margin-bottom: 10px; color: var(--accent-blue);">
                🔧 Custom Geometry Parameters
              </div>
              <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px; margin-bottom: 10px;">
                <div class="form-group">
                  <label for="input-custom-pagesize" data-i18n="labelCustomPage">Page Size (Bytes)</label>
                  <select id="input-custom-pagesize" style="width: 100%;">
                    <option value="2048" selected>2048 (2K Page)</option>
                    <option value="4096">4096 (4K Page)</option>
                  </select>
                </div>
                <div class="form-group">
                  <label for="input-custom-oobsize" data-i18n="labelCustomOob">Custom OOB / Spare Size (Bytes)</label>
                  <input type="number" id="input-custom-oobsize" value="64" min="16" max="2048" step="16" style="width: 100%;">
                </div>
              </div>
              <div class="form-group" style="margin-bottom: 10px;">
                <label for="select-custom-ecc" data-i18n="labelCustomEcc">ECC Algorithm Mode</label>
                <select id="select-custom-ecc" style="width: 100%;">
                  <option value="auto" selected data-i18n="optEccAuto">Auto-Detect (Recommended)</option>
                  <option value="bch4">BCH4 (4-bit ECC, 528B Codeword)</option>
                  <option value="bch8">BCH8 (8-bit ECC, 532B Codeword)</option>
                </select>
              </div>
              <div id="fw-custom-geom-preview" style="font-size: 0.8rem; color: var(--text-secondary); line-height: 1.5; background: var(--bg-secondary); padding: 8px 12px; border-radius: 4px; border: 1px solid var(--border-color);">
              </div>
            </div>
          </div>
          <div class="modal-footer">
            <button class="btn" onclick="document.getElementById('fw-qpic-export-modal').classList.remove('active')">Cancel</button>
            <button class="btn btn-primary" id="btn-confirm-qpic-export">Encode & Download Dump</button>
          </div>
        </div>
      `;
      document.body.appendChild(modal);

      const geomSelect = document.getElementById('select-qpic-target-geom');
      const customPanel = document.getElementById('fw-custom-geom-panel');
      const customPage = document.getElementById('input-custom-pagesize');
      const customOob = document.getElementById('input-custom-oobsize');
      const customEcc = document.getElementById('select-custom-ecc');
      const previewDiv = document.getElementById('fw-custom-geom-preview');

      const updateCustomPreview = () => {
        try {
          const pSize = parseInt(customPage.value, 10);
          const oSize = parseInt(customOob.value, 10);
          const geom = QpicCodec.createCustomGeometry(pSize, oSize, customEcc.value);
          previewDiv.innerHTML = `
            <div><strong>Codewords:</strong> ${geom.cwCount} × ${geom.cwSize}B (${geom.eccMode.toUpperCase()}) | <strong>BBM Offset:</strong> ${geom.bbmPos}B</div>
            <div><strong>Raw Page Size:</strong> ${geom.rawPageSize} Bytes (${pSize}B Data + ${oSize}B OOB)</div>
            <div><strong>Trailing Spare Padding:</strong> ${geom.rawPageSize - (geom.cwCount * geom.cwSize)} Bytes (0xFF)</div>
          `;
          previewDiv.style.color = 'var(--text-secondary)';
        } catch (e) {
          previewDiv.innerHTML = `<span style="color: var(--accent-red);">⚠️ ${e.message}</span>`;
        }
      };

      geomSelect.addEventListener('change', () => {
        if (geomSelect.value === 'custom') {
          customPanel.style.display = 'block';
          updateCustomPreview();
        } else {
          customPanel.style.display = 'none';
        }
      });

      customPage.addEventListener('change', updateCustomPreview);
      customOob.addEventListener('input', updateCustomPreview);
      customEcc.addEventListener('change', updateCustomPreview);

      document.getElementById('btn-confirm-qpic-export').addEventListener('click', () => {
        const val = geomSelect.value;
        modal.classList.remove('active');

        if (val === 'custom') {
          try {
            const pSize = parseInt(customPage.value, 10);
            const oSize = parseInt(customOob.value, 10);
            const customGeom = QpicCodec.createCustomGeometry(pSize, oSize, customEcc.value);
            this.exportQpicRawWithGeom(customGeom);
          } catch (err) {
            alert(`Custom Geometry Error: ${err.message}`);
          }
        } else {
          const geomIdx = parseInt(val, 10);
          const geom = QpicCodec.geometries[geomIdx];
          this.exportQpicRawWithGeom(geom);
        }
      });
    }

    modal.classList.add('active');
  },

  async exportQpicRawWithGeom(geom) {
    if (!geom || !this.state.flatBuffer) return;

    const exportBuffer = this.getSelectedExportBuffer();
    this.showLoading(`Encoding QPIC Raw Dump (${geom.name})...`, 0);
    await new Promise((resolve) => setTimeout(resolve, 50)); // Allow UI to update

    try {
      const rawBuffer = QpicCodec.encodeQpic(exportBuffer, geom, (prog) => {
        this.showLoading(`Encoding QPIC Raw Dump (${geom.name})...`, prog);
      });

      const blob = new Blob([rawBuffer], { type: 'application/octet-stream' });
      const baseName = this.state.fileName.replace(/\.[^/.]+$/, '');
      const eccTag = geom.eccMode.toUpperCase();
      const pageTag = geom.pageSize === 4096 ? '4k' : '2k';
      const oobTag = `${geom.oobSize}oob`;
      const isPartial = exportBuffer.length < this.state.flatBuffer.length;
      const filename = `${baseName}${isPartial ? '_selected' : ''}_qpic_${pageTag}_${oobTag}_${eccTag.toLowerCase()}.raw`;

      const a = document.createElement('a');
      a.href = URL.createObjectURL(blob);
      a.download = filename;
      a.click();
      URL.revokeObjectURL(a.href);

      this.hideLoading();
      showToast(`QPIC Raw Dump generated: ${filename} (${(rawBuffer.length / 1024 / 1024).toFixed(2)} MB)`, 'success');
    } catch (err) {
      this.hideLoading();
      console.error(err);
      alert(`Failed to encode QPIC: ${err.message}`);
    }
  },
};

// Auto-initialize when DOM is ready
document.addEventListener('DOMContentLoaded', () => {
  FirmwareStudio.init();
});
