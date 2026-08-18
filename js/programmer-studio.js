/**
 * Qualcomm MIBIB Web Studio - Hardware Programmer WebGUI Studio
 * High-level interactive controller for STM32 NAND Programmer (v3.5.0 & v3.6.0+)
 */

const ProgrammerStudio = (function() {
  let activeReadData = null;
  let activeReadFilename = "nand_dump.bin";
  let writeStagedBuffer = null;
  let writeStagedFilename = "";
  let isOpRunning = false;
  let opStartTime = 0;

  function init() {
    bindEvents();
    populateChipDropdown();
    updateUIState();
    logConsole("Hardware Programmer WebGUI initialized. Ready to connect via Web Serial.");
  }

  function bindEvents() {
    // Connection Buttons
    const btnConnect = document.getElementById("btn-prog-connect");
    if (btnConnect) btnConnect.addEventListener("click", handleConnect);

    const btnDisconnect = document.getElementById("btn-prog-disconnect");
    if (btnDisconnect) btnDisconnect.addEventListener("click", handleDisconnect);

    const btnReprobe = document.getElementById("btn-prog-reprobe");
    if (btnReprobe) btnReprobe.addEventListener("click", handleReprobe);

    const selectForcedChip = document.getElementById("select-forced-chip");
    if (selectForcedChip) selectForcedChip.addEventListener("change", handleForcedChipChange);

    // Read Actions
    const btnStartRead = document.getElementById("btn-prog-start-read");
    if (btnStartRead) btnStartRead.addEventListener("click", handleStartRead);

    const btnSaveDump = document.getElementById("btn-prog-save-dump");
    if (btnSaveDump) btnSaveDump.addEventListener("click", handleSaveDump);

    const btnSendToStudio = document.getElementById("btn-prog-send-to-studio");
    if (btnSendToStudio) btnSendToStudio.addEventListener("click", handleSendToFirmwareStudio);

    const selectReadRange = document.getElementById("select-read-range");
    if (selectReadRange) selectReadRange.addEventListener("change", handleReadRangeChange);

    // Write / Flash Actions
    const fileInputWrite = document.getElementById("prog-write-file-input");
    if (fileInputWrite) fileInputWrite.addEventListener("change", handleWriteFileSelected);

    const writeDropzone = document.getElementById("prog-write-dropzone");
    if (writeDropzone) {
      writeDropzone.addEventListener("click", () => fileInputWrite && fileInputWrite.click());
      writeDropzone.addEventListener("dragover", (e) => { e.preventDefault(); writeDropzone.classList.add("dragover"); });
      writeDropzone.addEventListener("dragleave", () => writeDropzone.classList.remove("dragover"));
      writeDropzone.addEventListener("drop", handleWriteFileDropped);
    }

    const btnStartWrite = document.getElementById("btn-prog-start-write");
    if (btnStartWrite) btnStartWrite.addEventListener("click", handleStartWrite);

    const btnStageFromStudio = document.getElementById("btn-prog-stage-from-studio");
    if (btnStageFromStudio) btnStageFromStudio.addEventListener("click", handleStageFromFirmwareStudio);

    // Erase Actions
    const btnStartErase = document.getElementById("btn-prog-start-erase");
    if (btnStartErase) btnStartErase.addEventListener("click", handleStartErase);

    // Diagnostics & Advanced Actions
    const btnScanBadBlocks = document.getElementById("btn-prog-scan-bb");
    if (btnScanBadBlocks) btnScanBadBlocks.addEventListener("click", handleScanBadBlocks);

    const btnStartScrub = document.getElementById("btn-prog-start-scrub");
    if (btnStartScrub) btnStartScrub.addEventListener("click", handleStartScrub);

    const btnStartRdt = document.getElementById("btn-prog-start-rdt");
    if (btnStartRdt) btnStartRdt.addEventListener("click", handleStartRdt);

    const btnAbort = document.getElementById("btn-prog-abort");
    if (btnAbort) btnAbort.addEventListener("click", handleAbort);

    const btnClearLog = document.getElementById("btn-prog-clear-log");
    if (btnClearLog) btnClearLog.addEventListener("click", clearConsole);
  }

  function populateChipDropdown() {
    const select = document.getElementById("select-forced-chip");
    if (!select) return;
    select.innerHTML = `<option value="">Auto-Detect (ONFI 1.0 / Database ID)</option>`;
    const chips = NAND_CHIP_DATABASE.getAllChips();
    for (const chip of chips) {
      const opt = document.createElement("option");
      opt.value = chip.name;
      opt.textContent = `${chip.name} (${(chip.totalSize / (1024 * 1024)).toFixed(0)} MB, ${chip.pageSize}B Page)`;
      select.appendChild(opt);
    }
  }

  function updateUIState() {
    const isConnected = programmerClient.isConnected();
    const isV360 = programmerClient.firmwareVersion && programmerClient.firmwareVersion.isV360;

    const bannerOffline = document.getElementById("prog-banner-offline");
    const bannerOnline = document.getElementById("prog-banner-online");
    const controlsArea = document.getElementById("prog-controls-area");

    if (bannerOffline) bannerOffline.style.display = isConnected ? "none" : "block";
    if (bannerOnline) bannerOnline.style.display = isConnected ? "block" : "none";
    if (controlsArea) controlsArea.style.display = isConnected ? "block" : "none";

    const btnConnect = document.getElementById("btn-prog-connect");
    const btnDisconnect = document.getElementById("btn-prog-disconnect");
    if (btnConnect) btnConnect.style.display = isConnected ? "none" : "inline-flex";
    if (btnDisconnect) btnDisconnect.style.display = isConnected ? "inline-flex" : "none";

    // Advanced v3.6.0+ features toggle
    const v360Cards = document.querySelectorAll(".requires-v360");
    v360Cards.forEach(el => {
      if (isV360) {
        el.classList.remove("feature-disabled");
        el.removeAttribute("title");
      } else {
        el.classList.add("feature-disabled");
        el.setAttribute("title", "Feature requires Firmware v3.6.0 or newer");
      }
    });

    const v360Badges = document.querySelectorAll(".badge-v360-feature");
    v360Badges.forEach(b => {
      b.style.display = isV360 ? "inline-block" : "none";
    });

    const v350Notices = document.querySelectorAll(".notice-v350-compat");
    v350Notices.forEach(n => {
      n.style.display = (isConnected && !isV360) ? "block" : "none";
    });

    const btnAbort = document.getElementById("btn-prog-abort");
    if (btnAbort) btnAbort.style.display = isOpRunning ? "inline-flex" : "none";
  }

  async function handleConnect() {
    try {
      logConsole("Requesting Web Serial port access...", "INFO");
      const ver = await programmerClient.connect();
      logConsole(`Connected to STM32 NAND Programmer. Firmware version: v${ver.string}`, "SUCCESS");

      // Auto probe chip
      await handleReprobe();
      updateUIState();
      showToast(`Connected to Programmer (Firmware v${ver.string})`, "success");
    } catch (err) {
      logConsole(`Connection failed: ${err.message}`, "ERROR");
      showToast(`Connection failed: ${err.message}`, "error");
      updateUIState();
    }
  }

  async function handleDisconnect() {
    try {
      await programmerClient.disconnect();
      logConsole("Programmer disconnected.", "WARN");
      updateUIState();
      showToast("Programmer disconnected", "info");
    } catch (err) {
      logConsole(`Disconnect error: ${err.message}`, "ERROR");
    }
  }

  async function handleReprobe() {
    if (!programmerClient.isConnected()) return;
    try {
      logConsole("Probing NAND Flash geometry...", "INFO");
      const forcedSelect = document.getElementById("select-forced-chip");
      const forcedChip = forcedSelect && forcedSelect.value ? forcedSelect.value : null;

      const chip = await programmerClient.probe(forcedChip);
      renderChipCard(chip);

      logConsole(`Flash detected: ${chip.name} | Page: ${chip.pageSize}B | Block: ${chip.blockSize / 1024}KB | Total: ${(chip.totalSize / (1024 * 1024)).toFixed(0)}MB | Spare: ${chip.spareSize}B ${chip.isOnfi ? '(ONFI 1.0)' : ''}`, "SUCCESS");
      showToast(`NAND Flash Detected: ${chip.name}`, "success");
    } catch (err) {
      logConsole(`Flash probe failed: ${err.message}`, "ERROR");
      showToast(`Flash probe failed: ${err.message}`, "error");
    }
  }

  function handleForcedChipChange() {
    if (programmerClient.isConnected()) {
      handleReprobe();
    }
  }

  function renderChipCard(chip) {
    const card = document.getElementById("prog-chip-info-card");
    if (!card) return;

    const totalMb = (chip.totalSize / (1024 * 1024)).toFixed(0);
    const blockKb = (chip.blockSize / 1024).toFixed(0);
    const fwVer = programmerClient.firmwareVersion ? programmerClient.firmwareVersion.string : "3.5.0";
    const isV360 = programmerClient.firmwareVersion && programmerClient.firmwareVersion.isV360;

    card.innerHTML = `
      <div class="grid-4" style="gap: 12px;">
        <div>
          <div class="stat-label">Device / Chip Model</div>
          <div class="stat-value" style="font-weight: bold; color: var(--accent-blue);">${chip.name} ${chip.isOnfi ? '<span class="badge" style="background-color: var(--accent-green); color: white; font-size: 0.7rem; padding: 2px 6px; border-radius: 4px; vertical-align: middle;">ONFI 1.0</span>' : ''}</div>
        </div>
        <div>
          <div class="stat-label">Total Capacity</div>
          <div class="stat-value" style="font-weight: bold;">${totalMb} MB <span style="font-size: 0.8rem; color: var(--text-secondary);">(0x${chip.totalSize.toString(16).toUpperCase()})</span></div>
        </div>
        <div>
          <div class="stat-label">Page / Block Size</div>
          <div class="stat-value" style="font-weight: bold;">${chip.pageSize}B / ${blockKb} KB</div>
        </div>
        <div>
          <div class="stat-label">Spare / OOB Size</div>
          <div class="stat-value" style="font-weight: bold;">${chip.spareSize} Bytes / Page</div>
        </div>
      </div>
      <div style="margin-top: 10px; font-size: 0.85rem; color: var(--text-secondary); display: flex; justify-content: space-between; align-items: center; border-top: 1px solid var(--border-color); padding-top: 8px;">
        <span>Firmware Version: <strong style="color: ${isV360 ? 'var(--accent-green)' : 'var(--accent-orange)'};">v${fwVer}</strong> (${isV360 ? 'FSMC 32-bit Acceleration & ONFI Native Engine Active' : 'Legacy Mode v3.5.0 Compatible'})</span>
        <span>Row/Col Cycles: <strong>${chip.rowCycles || 3}R / ${chip.colCycles || 2}C</strong></span>
      </div>
    `;

    // Populate default read length inputs
    const inputCustomLen = document.getElementById("prog-read-custom-len");
    if (inputCustomLen) inputCustomLen.value = `0x${chip.totalSize.toString(16).toUpperCase()}`;

    const inputEraseLen = document.getElementById("prog-erase-len");
    if (inputEraseLen) inputEraseLen.value = `0x${chip.totalSize.toString(16).toUpperCase()}`;
  }

  function handleReadRangeChange() {
    const select = document.getElementById("select-read-range");
    const customGroup = document.getElementById("prog-read-custom-group");
    if (select && customGroup) {
      customGroup.style.display = select.value === "custom" ? "grid" : "none";
    }
  }

  async function handleStartRead() {
    if (!programmerClient.isConnected()) {
      showToast("Please connect to programmer first", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) {
      showToast("Please probe NAND chip first", "error");
      return;
    }

    const selectRange = document.getElementById("select-read-range");
    let address = 0;
    let length = chip.totalSize;

    if (selectRange && selectRange.value === "custom") {
      const inputAddr = document.getElementById("prog-read-custom-addr");
      const inputLen = document.getElementById("prog-read-custom-len");
      address = parseInt(inputAddr ? inputAddr.value : "0", 16) || 0;
      length = parseInt(inputLen ? inputLen.value : "0", 16) || chip.totalSize;
    }

    const chkSkipBad = document.getElementById("prog-read-skip-bad");
    const chkIncSpare = document.getElementById("prog-read-inc-spare");
    const selectQpic = document.getElementById("select-prog-read-qpic");
    const qpicVal = selectQpic ? selectQpic.value : "none";
    const flags = {
      skipBad: chkSkipBad ? chkSkipBad.checked : false,
      includeSpare: chkIncSpare ? chkIncSpare.checked : false,
      enableEcc: false,
      qpicBch4: qpicVal === "bch4",
      qpicBch8: qpicVal === "bch8"
    };

    setOpRunning(true, `Reading NAND Flash (${qpicVal !== 'none' ? 'Hardware ' + qpicVal.toUpperCase() : 'Flat'})...`);
    logConsole(`Starting Read: Address=0x${address.toString(16).toUpperCase()}, Length=0x${length.toString(16).toUpperCase()} (${(length / (1024*1024)).toFixed(2)} MB), SkipBad=${flags.skipBad}, IncSpare=${flags.includeSpare}, QPIC=${qpicVal.toUpperCase()}`, "INFO");

    try {
      activeReadData = await programmerClient.read(
        address,
        length,
        flags,
        (received, total) => updateProgress(received, total, "Read"),
        (badAddr, isSkip) => logConsole(`Bad block detected at 0x${badAddr.toString(16).toUpperCase()} (${isSkip ? 'Skipped' : 'Warning'})`, "WARN")
      );

      const elapsedSec = ((Date.now() - opStartTime) / 1000).toFixed(1);
      const avgSpeed = (activeReadData.length / (1024 * (elapsedSec > 0 ? elapsedSec : 1))).toFixed(1);
      logConsole(`Read Completed! Received ${activeReadData.length} bytes in ${elapsedSec}s (Avg: ${avgSpeed} KB/s)`, "SUCCESS");
      showToast(`Read Completed successfully (${(activeReadData.length / (1024*1024)).toFixed(2)} MB)`, "success");

      activeReadFilename = `${chip.name}_dump_0x${address.toString(16).toUpperCase()}_0x${length.toString(16).toUpperCase()}${flags.includeSpare ? '_raw.raw' : '.bin'}`;

      let mibibInfo = "";
      try {
        if (typeof scanMibibTable === "function") {
          const scanRes = scanMibibTable(activeReadData, chip.blockSize || 131072);
          if (scanRes && scanRes.partitions && scanRes.partitions.length > 0) {
            mibibInfo = ` | ✨ Detected MIBIB: ${scanRes.partitions.length} Partitions (${scanRes.partitions.slice(0, 3).map(p => p.name).join(', ')}...)`;
            logConsole(`Auto-detected Qualcomm MIBIB partition table in read dump (${scanRes.partitions.length} partitions)`, "SUCCESS");
          }
        }
      } catch (_) {}

      const dumpCard = document.getElementById("prog-dump-ready-card");
      if (dumpCard) {
        dumpCard.style.display = "block";
        const txt = document.getElementById("prog-dump-ready-text");
        if (txt) txt.textContent = `Dump Ready: ${activeReadFilename} (${(activeReadData.length / (1024*1024)).toFixed(2)} MB)${mibibInfo}`;
      }
    } catch (err) {
      logConsole(`Read failed: ${err.message}`, "ERROR");
      showToast(`Read failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  function handleSaveDump() {
    if (!activeReadData) {
      showToast("No active dump data available", "error");
      return;
    }
    const blob = new Blob([activeReadData], { type: "application/octet-stream" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = activeReadFilename;
    a.click();
    URL.revokeObjectURL(url);
    showToast(`Saved ${activeReadFilename}`, "success");
    logConsole(`Exported dump file: ${activeReadFilename}`, "SUCCESS");
  }

  function handleSendToFirmwareStudio() {
    if (!activeReadData) {
      showToast("No active dump data available", "error");
      return;
    }
    logConsole(`Staging ${(activeReadData.length / (1024*1024)).toFixed(2)} MB dump directly into Firmware Studio...`, "INFO");

    const file = new File([activeReadData], activeReadFilename, { type: "application/octet-stream" });
    if (typeof loadFirmwareFile === "function") {
      loadFirmwareFile(file);
      // Switch to Tab 1 (Firmware Studio)
      const tabBtn = document.getElementById("tab-btn-firmware");
      if (tabBtn) tabBtn.click();
      showToast("Loaded dump into Firmware Studio!", "success");
    } else {
      showToast("Firmware Studio loader not available", "error");
    }
  }

  function handleWriteFileSelected(e) {
    const file = e.target.files && e.target.files[0];
    if (file) stageWriteFile(file);
  }

  function handleWriteFileDropped(e) {
    e.preventDefault();
    const writeDropzone = document.getElementById("prog-write-dropzone");
    if (writeDropzone) writeDropzone.classList.remove("dragover");
    const file = e.dataTransfer.files && e.dataTransfer.files[0];
    if (file) stageWriteFile(file);
  }

  async function stageWriteFile(file) {
    writeStagedFilename = file.name;
    const arrayBuffer = await file.arrayBuffer();
    writeStagedBuffer = new Uint8Array(arrayBuffer);

    const label = document.getElementById("prog-staged-write-label");
    if (label) label.textContent = `Staged File: ${writeStagedFilename} (${(writeStagedBuffer.length / (1024*1024)).toFixed(2)} MB)`;

    const btnStart = document.getElementById("btn-prog-start-write");
    if (btnStart) btnStart.disabled = false;

    logConsole(`Staged write file: ${writeStagedFilename} (${writeStagedBuffer.length} bytes)`, "INFO");
    showToast(`Staged ${writeStagedFilename}`, "info");
  }

  function handleStageFromFirmwareStudio() {
    // Check if firmware studio has active workspace data
    if (typeof currentFwData !== "undefined" && currentFwData && currentFwData.length > 0) {
      writeStagedBuffer = new Uint8Array(currentFwData);
      writeStagedFilename = (typeof currentFwFileName !== "undefined" && currentFwFileName) ? `rebuilt_${currentFwFileName}` : "firmware_studio_export.bin";

      const label = document.getElementById("prog-staged-write-label");
      if (label) label.textContent = `Staged from Studio: ${writeStagedFilename} (${(writeStagedBuffer.length / (1024*1024)).toFixed(2)} MB)`;

      const btnStart = document.getElementById("btn-prog-start-write");
      if (btnStart) btnStart.disabled = false;

      logConsole(`Staged active firmware workspace (${(writeStagedBuffer.length / (1024*1024)).toFixed(2)} MB) for flashing`, "SUCCESS");
      showToast("Staged firmware from Studio workspace!", "success");
    } else {
      showToast("No active firmware loaded in Firmware Studio", "error");
    }
  }

  async function handleStartWrite() {
    if (!programmerClient.isConnected()) {
      showToast("Please connect to programmer first", "error");
      return;
    }
    if (!writeStagedBuffer || writeStagedBuffer.length === 0) {
      showToast("Please select a firmware file to flash", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) {
      showToast("Please probe NAND chip first", "error");
      return;
    }

    const inputAddr = document.getElementById("prog-write-addr");
    const address = parseInt(inputAddr ? inputAddr.value : "0", 16) || 0;

    const chkAutoErase = document.getElementById("prog-write-auto-erase");
    const chkIncSpare = document.getElementById("prog-write-inc-spare");
    const chkSkipBad = document.getElementById("prog-write-skip-bad");
    const selectQpic = document.getElementById("select-prog-write-qpic");
    const qpicVal = selectQpic ? selectQpic.value : "none";

    const flags = {
      skipBad: chkSkipBad ? chkSkipBad.checked : true,
      includeSpare: chkIncSpare ? chkIncSpare.checked : false,
      enableEcc: false,
      qpicBch4: qpicVal === "bch4",
      qpicBch8: qpicVal === "bch8"
    };

    setOpRunning(true, `Flashing NAND Flash (${qpicVal !== 'none' ? 'Hardware ' + qpicVal.toUpperCase() : 'Flat'})...`);

    try {
      // Auto-erase blocks if checked
      if (chkAutoErase && chkAutoErase.checked) {
        logConsole(`Auto-erasing flash target area: Address=0x${address.toString(16).toUpperCase()}, Length=0x${writeStagedBuffer.length.toString(16).toUpperCase()}...`, "INFO");
        await programmerClient.erase(
          address,
          writeStagedBuffer.length,
          flags,
          (done, total) => updateProgress(done, total, "Erase Before Write"),
          (badAddr) => logConsole(`Bad block encountered during pre-erase at 0x${badAddr.toString(16).toUpperCase()}`, "WARN")
        );
        logConsole("Pre-erase completed.", "SUCCESS");
      }

      logConsole(`Writing ${writeStagedBuffer.length} bytes to 0x${address.toString(16).toUpperCase()}...`, "INFO");

      await programmerClient.write(
        writeStagedBuffer,
        address,
        flags,
        (sent, total) => updateProgress(sent, total, "Write"),
        (badAddr) => logConsole(`Bad block handled at 0x${badAddr.toString(16).toUpperCase()}`, "WARN")
      );

      const elapsedSec = ((Date.now() - opStartTime) / 1000).toFixed(1);
      const avgSpeed = (writeStagedBuffer.length / (1024 * (elapsedSec > 0 ? elapsedSec : 1))).toFixed(1);
      logConsole(`Flash Write Completed in ${elapsedSec}s (Avg: ${avgSpeed} KB/s)!`, "SUCCESS");
      showToast("NAND Flash Written successfully!", "success");
    } catch (err) {
      logConsole(`Flash Write Failed: ${err.message}`, "ERROR");
      showToast(`Flash Write Failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  async function handleStartErase() {
    if (!programmerClient.isConnected()) {
      showToast("Please connect to programmer first", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) {
      showToast("Please probe NAND chip first", "error");
      return;
    }

    const inputAddr = document.getElementById("prog-erase-addr");
    const inputLen = document.getElementById("prog-erase-len");
    const address = parseInt(inputAddr ? inputAddr.value : "0", 16) || 0;
    const length = parseInt(inputLen ? inputLen.value : "0", 16) || chip.totalSize;

    const chkSkipBad = document.getElementById("prog-erase-skip-bad");
    const flags = { skipBad: chkSkipBad ? chkSkipBad.checked : true };

    if (!confirm(`⚠️ Are you sure you want to ERASE NAND Flash range 0x${address.toString(16).toUpperCase()} -> 0x${(address + length).toString(16).toUpperCase()} (${(length / (1024*1024)).toFixed(0)} MB)? This will permanently destroy all data in this range!`)) {
      return;
    }

    setOpRunning(true, "Erasing NAND Flash...");
    logConsole(`Starting Flash Erase: 0x${address.toString(16).toUpperCase()} -> 0x${(address+length).toString(16).toUpperCase()}`, "INFO");

    try {
      await programmerClient.erase(
        address,
        length,
        flags,
        (done, total) => updateProgress(done, total, "Erase"),
        (badAddr, isSkip) => logConsole(`Bad block at 0x${badAddr.toString(16).toUpperCase()} (${isSkip ? 'Skipped' : 'Warning'})`, "WARN")
      );
      logConsole("Erase Completed successfully!", "SUCCESS");
      showToast("NAND Flash Erased successfully!", "success");
    } catch (err) {
      logConsole(`Erase failed: ${err.message}`, "ERROR");
      showToast(`Erase failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  async function handleScanBadBlocks() {
    if (!programmerClient.isConnected()) {
      showToast("Please connect to programmer first", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) {
      showToast("Please probe NAND chip first", "error");
      return;
    }

    setOpRunning(true, "Scanning Bad Blocks...");
    logConsole("Reading Bad Block Table from programmer memory / factory markers...", "INFO");

    try {
      const badBlocks = await programmerClient.readBadBlocks();
      renderBadBlockGrid(chip, badBlocks);
      logConsole(`Scan complete. Found ${badBlocks.length} bad blocks on chip.`, badBlocks.length > 0 ? "WARN" : "SUCCESS");
      showToast(`Bad Block Scan Complete: ${badBlocks.length} bad blocks found`, "info");
    } catch (err) {
      logConsole(`Bad block scan failed: ${err.message}`, "ERROR");
      showToast(`Bad block scan failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  function renderBadBlockGrid(chip, badBlockPages) {
    const container = document.getElementById("prog-bb-grid-container");
    const summary = document.getElementById("prog-bb-summary");
    if (!container) return;

    const totalBlocks = Math.floor(chip.totalSize / chip.blockSize);
    const pagesPerBlock = Math.floor(chip.blockSize / chip.pageSize);
    const badBlockSet = new Set(badBlockPages.map(page => Math.floor(page / pagesPerBlock)));

    if (summary) {
      summary.innerHTML = `
        <span>Total Physical Blocks: <strong>${totalBlocks}</strong></span> |
        <span style="color: var(--accent-green);">Healthy Blocks: <strong>${totalBlocks - badBlockSet.size}</strong></span> |
        <span style="color: var(--accent-red);">Factory / Marked Bad Blocks: <strong>${badBlockSet.size}</strong></span>
      `;
    }

    container.innerHTML = "";
    // Display up to 2048 blocks as micro-grid cells
    const maxRenderBlocks = Math.min(totalBlocks, 2048);
    for (let b = 0; b < maxRenderBlocks; b++) {
      const cell = document.createElement("div");
      const isBad = badBlockSet.has(b);
      cell.className = `bb-cell ${isBad ? 'bad' : 'good'}`;
      cell.title = `Block #${b} (0x${(b * chip.blockSize).toString(16).toUpperCase()}): ${isBad ? 'BAD BLOCK' : 'Good'}`;
      container.appendChild(cell);
    }
  }

  async function handleStartScrub() {
    if (!programmerClient.firmwareVersion || !programmerClient.firmwareVersion.isV360) {
      showToast("Physical Scrub requires Firmware v3.6.0+", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) return;

    if (!confirm(`⚠️ Execute Physical Scrub across entire NAND (${(chip.totalSize / (1024*1024)).toFixed(0)} MB)? This will deeply clean and verify all physical flash cells.`)) {
      return;
    }

    setOpRunning(true, "Executing Physical Scrub...");
    logConsole("Starting Physical NAND Scrub (v3.6.0 engine)...", "INFO");

    try {
      await programmerClient.scrub(
        0,
        chip.totalSize,
        (done, total) => updateProgress(done, total, "Scrub"),
        (badAddr) => logConsole(`Scrub detected and marked bad block at 0x${badAddr.toString(16).toUpperCase()}`, "WARN")
      );
      logConsole("Physical Scrub Completed Successfully!", "SUCCESS");
      showToast("Physical Scrub Completed!", "success");
    } catch (err) {
      logConsole(`Scrub failed: ${err.message}`, "ERROR");
      showToast(`Scrub failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  async function handleStartRdt() {
    if (!programmerClient.firmwareVersion || !programmerClient.firmwareVersion.isV360) {
      showToast("Hardware SSD RDT Testing requires Firmware v3.6.0+", "error");
      return;
    }
    const chip = programmerClient.currentChip;
    if (!chip) return;

    const selectMode = document.getElementById("select-rdt-mode");
    const mode = selectMode && selectMode.value === "block" ? NandProgrammerClient.TestMode.FULL_BLOCK : NandProgrammerClient.TestMode.FULL_CHIP;

    const inputSeed = document.getElementById("prog-rdt-seed");
    const seed = parseInt(inputSeed ? inputSeed.value : "0xA5A55A5A", 16) || 0xA5A55A5A;

    const chkMarkBad = document.getElementById("prog-rdt-mark-bad");
    const markBad = chkMarkBad ? chkMarkBad.checked : true;

    const inputPasses = document.getElementById("prog-rdt-passes");
    const passes = parseInt(inputPasses ? inputPasses.value : "1", 10) || 1;

    if (!confirm(`⚠️ Start Hardware SSD RDT Test (${mode === NandProgrammerClient.TestMode.FULL_CHIP ? 'Full-Chip Spanned' : 'Per-Block Immediate'} mode, ${passes} passes)? All data will be overwritten with PRBS patterns and verified!`)) {
      return;
    }

    setOpRunning(true, "Running SSD RDT Reliability Test...");

    try {
      for (let pass = 1; pass <= passes; pass++) {
        logConsole(`Starting SSD RDT Pass ${pass}/${passes} (Mode: ${mode === NandProgrammerClient.TestMode.FULL_CHIP ? 'Full-Chip' : 'Per-Block'}, Seed: 0x${seed.toString(16).toUpperCase()}, AutoMarkBad: ${markBad})...`, "INFO");

        await programmerClient.test(
          0,
          chip.totalSize,
          mode,
          markBad,
          seed,
          (done, total) => updateProgress(done, total, `RDT Pass ${pass}/${passes}`),
          (badAddr, isSkip) => logConsole(`RDT flagged Bad Block at 0x${badAddr.toString(16).toUpperCase()}${markBad ? ' (Marked as Bad)' : ''}`, "WARN")
        );
      }
      logConsole("All SSD RDT Reliability Passes Completed Successfully with 0 unhandled bit flips!", "SUCCESS");
      showToast("SSD RDT Reliability Test Completed!", "success");
    } catch (err) {
      logConsole(`SSD RDT Test Failed: ${err.message}`, "ERROR");
      showToast(`SSD RDT Test Failed: ${err.message}`, "error");
    } finally {
      setOpRunning(false);
    }
  }

  function handleAbort() {
    if (confirm("Are you sure you want to cancel the current programmer operation?")) {
      programmerClient.abort();
      logConsole("User cancelled active operation.", "WARN");
      setOpRunning(false);
    }
  }

  function setOpRunning(running, statusText = "") {
    isOpRunning = running;
    if (running) opStartTime = Date.now();

    const progressCard = document.getElementById("prog-progress-card");
    if (progressCard) progressCard.style.display = running ? "block" : "none";

    const labelStatus = document.getElementById("prog-progress-status");
    if (labelStatus) labelStatus.textContent = statusText;

    updateUIState();
  }

  function updateProgress(done, total, opName = "") {
    const percent = total > 0 ? Math.min(100, (done / total) * 100).toFixed(1) : 0;
    const elapsedSec = (Date.now() - opStartTime) / 1000;
    const speedKb = elapsedSec > 0 ? (done / (1024 * elapsedSec)).toFixed(1) : "0.0";
    const remBytes = Math.max(0, total - done);
    const etaSec = speedKb > 0 ? Math.ceil(remBytes / (parseFloat(speedKb) * 1024)) : 0;

    const bar = document.getElementById("prog-progress-bar");
    if (bar) bar.style.width = `${percent}%`;

    const txtPercent = document.getElementById("prog-progress-percent");
    if (txtPercent) txtPercent.textContent = `${percent}%`;

    const txtStats = document.getElementById("prog-progress-stats");
    if (txtStats) {
      txtStats.textContent = `${(done / (1024*1024)).toFixed(2)} / ${(total / (1024*1024)).toFixed(2)} MB | Speed: ${speedKb} KB/s | ETA: ${etaSec}s`;
    }
  }

  function logConsole(message, type = "INFO") {
    const terminal = document.getElementById("prog-console-output");
    if (!terminal) return;

    const now = new Date();
    const timeStr = now.toTimeString().split(' ')[0];

    const line = document.createElement("div");
    line.className = `console-line log-${type.toLowerCase()}`;
    line.textContent = `[${timeStr}] [${type}] ${message}`;

    terminal.appendChild(line);
    terminal.scrollTop = terminal.scrollHeight;
  }

  function clearConsole() {
    const terminal = document.getElementById("prog-console-output");
    if (terminal) terminal.innerHTML = "";
    logConsole("Console cleared.");
  }

  return {
    init,
    logConsole,
    clearConsole
  };
})();
