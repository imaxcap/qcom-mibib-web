/**
 * Qualcomm MIBIB Web Studio - Web Serial NAND Programmer Client
 * Pure JavaScript Web Serial Protocol implementation supporting v3.5.0 & v3.6.0+
 */

class NandProgrammerClient {
  constructor() {
    this.port = null;
    this.reader = null;
    this.writer = null;
    this.rxBuffer = new Uint8Array(0);
    this.readLoopPromise = null;
    this.isReading = false;
    this.currentChip = null;
    this.firmwareVersion = null;
    this.isAborted = false;
  }

  static get Command() {
    return {
      READ_ID: 0x00,
      ERASE: 0x01,
      READ: 0x02,
      WRITE_START: 0x03,
      WRITE_DATA: 0x04,
      WRITE_END: 0x05,
      CONFIGURE: 0x06,
      READ_BAD_BLOCKS: 0x07,
      VERSION_GET: 0x08,
      SCRUB: 0x10,
      TEST: 0x11,
      PROBE_ONFI: 0x12
    };
  }

  static get Status() {
    return {
      OK: 0x00,
      ERROR: 0x01,
      BAD_BLOCK: 0x02,
      WRITE_ACK: 0x03,
      BAD_BLOCK_SKIP: 0x04,
      PROGRESS: 0x05
    };
  }

  static get ResponseCode() {
    return {
      DATA: 0x00,
      STATUS: 0x01
    };
  }

  static get TestMode() {
    return {
      FULL_BLOCK: 0,
      WRITE_ONLY: 1,
      VERIFY_ONLY: 2,
      FULL_CHIP: 3
    };
  }

  static isSupported() {
    return 'serial' in navigator;
  }

  async connect(existingPort = null) {
    if (!NandProgrammerClient.isSupported()) {
      throw new Error("Web Serial API is not supported in this browser. Please use Chrome, Edge, or Opera.");
    }

    if (existingPort) {
      this.port = existingPort;
    } else {
      this.port = await navigator.serial.requestPort({
        filters: [
          { usbVendorId: 0x0483, usbProductId: 0x5740 } // STMicroelectronics Virtual COM Port
        ]
      });
    }

    await this.port.open({
      baudRate: 115200,
      bufferSize: 65536
    });

    this.writer = this.port.writable.getWriter();
    this.isReading = true;
    this.rxBuffer = new Uint8Array(0);
    this.readLoopPromise = this._startReadLoop();

    // Small delay to allow port stabilization
    await this._sleep(100);

    // Initial handshake - query version
    this.firmwareVersion = await this.getFirmwareVersion();
    return this.firmwareVersion;
  }

  async disconnect() {
    this.isAborted = true;
    this.isReading = false;

    if (this.reader) {
      try {
        await this.reader.cancel();
      } catch (_) {}
      try {
        this.reader.releaseLock();
      } catch (_) {}
      this.reader = null;
    }

    if (this.writer) {
      try {
        this.writer.releaseLock();
      } catch (_) {}
      this.writer = null;
    }

    if (this.readLoopPromise) {
      try {
        await this.readLoopPromise;
      } catch (_) {}
      this.readLoopPromise = null;
    }

    if (this.port) {
      try {
        await this.port.close();
      } catch (_) {}
      this.port = null;
    }

    this.rxBuffer = new Uint8Array(0);
    this.currentChip = null;
    this.firmwareVersion = null;
    this.isAborted = false;
  }

  isConnected() {
    return this.port !== null && this.port.readable !== null;
  }

  abort() {
    this.isAborted = true;
  }

  async _startReadLoop() {
    while (this.isReading && this.port && this.port.readable) {
      try {
        this.reader = this.port.readable.getReader();
        while (this.isReading) {
          const { value, done } = await this.reader.read();
          if (done) break;
          if (value && value.length > 0) {
            const next = new Uint8Array(this.rxBuffer.length + value.length);
            next.set(this.rxBuffer, 0);
            next.set(value, this.rxBuffer.length);
            this.rxBuffer = next;
          }
        }
      } catch (err) {
        if (!this.isReading) break;
      } finally {
        if (this.reader) {
          try {
            this.reader.releaseLock();
          } catch (_) {}
          this.reader = null;
        }
      }
    }
  }

  async _writePacket(dataUint8) {
    if (!this.writer) throw new Error("Serial port writer not available");
    await this.writer.write(dataUint8);
  }

  async _readResponse(timeoutMs = 10000) {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
      if (this.isAborted) throw new Error("Operation cancelled by user");

      if (this.rxBuffer.length >= 2) {
        const code = this.rxBuffer[0];
        const info = this.rxBuffer[1];

        let payloadLen = 0;
        if (code === NandProgrammerClient.ResponseCode.DATA) {
          payloadLen = info;
        } else if (code === NandProgrammerClient.ResponseCode.STATUS) {
          switch (info) {
            case NandProgrammerClient.Status.OK:
              payloadLen = 0;
              break;
            case NandProgrammerClient.Status.ERROR:
            case NandProgrammerClient.Status.BAD_BLOCK:
            case NandProgrammerClient.Status.BAD_BLOCK_SKIP:
              payloadLen = 12;
              break;
            case NandProgrammerClient.Status.WRITE_ACK:
            case NandProgrammerClient.Status.PROGRESS:
              payloadLen = 8;
              break;
            default:
              throw new Error(`Unknown status code: 0x${info.toString(16)}`);
          }
        } else {
          // Frame sync recovery: discard leading garbage byte
          this.rxBuffer = this.rxBuffer.slice(1);
          continue;
        }

        const totalPacketSize = 2 + payloadLen;
        if (this.rxBuffer.length >= totalPacketSize) {
          const payload = this.rxBuffer.slice(2, totalPacketSize);
          this.rxBuffer = this.rxBuffer.slice(totalPacketSize);
          return { code, info, payload };
        }
      }

      await this._sleep(2);
    }

    throw new Error(`Timeout waiting for response from programmer (${timeoutMs}ms)`);
  }

  async _expectOk(timeoutMs = 5000) {
    const resp = await this._readResponse(timeoutMs);
    if (resp.code !== NandProgrammerClient.ResponseCode.STATUS || resp.info !== NandProgrammerClient.Status.OK) {
      throw new Error(`Expected OK status, got response code=${resp.code}, info=${resp.info}`);
    }
    return resp;
  }

  async _expectData(timeoutMs = 5000) {
    const resp = await this._readResponse(timeoutMs);
    if (resp.code !== NandProgrammerClient.ResponseCode.DATA) {
      throw new Error(`Expected DATA response, got code=${resp.code}, info=${resp.info}`);
    }
    return resp;
  }

  _sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  _encodeU64(value) {
    const buf = new Uint8Array(8);
    let v = BigInt(value);
    for (let i = 0; i < 8; i++) {
      buf[i] = Number(v & 0xFFn);
      v >>= 8n;
    }
    return buf;
  }

  _decodeU64(buf, offset = 0) {
    let v = 0n;
    for (let i = 7; i >= 0; i--) {
      v = (v << 8n) | BigInt(buf[offset + i]);
    }
    return Number(v);
  }

  _encodeU32(value) {
    const buf = new Uint8Array(4);
    let v = value >>> 0;
    buf[0] = v & 0xFF;
    buf[1] = (v >> 8) & 0xFF;
    buf[2] = (v >> 16) & 0xFF;
    buf[3] = (v >> 24) & 0xFF;
    return buf;
  }

  _decodeU32(buf, offset = 0) {
    return (buf[offset] | (buf[offset + 1] << 8) | (buf[offset + 2] << 16) | (buf[offset + 3] << 24)) >>> 0;
  }

  // --- Programmer Protocol Commands ---

  async getFirmwareVersion() {
    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(new Uint8Array([NandProgrammerClient.Command.VERSION_GET]));
    const resp = await this._expectData(3000);
    if (resp.payload.length < 4) {
      throw new Error("Invalid firmware version packet length");
    }
    const major = resp.payload[0];
    const minor = resp.payload[1];
    const build = resp.payload[2] | (resp.payload[3] << 8);
    const versionString = `${major}.${minor}.${build}`;
    return { major, minor, build, string: versionString, isV360: major > 3 || (major === 3 && minor >= 6) };
  }

  async readId() {
    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(new Uint8Array([NandProgrammerClient.Command.READ_ID]));
    const resp = await this._expectData(3000);
    return resp.payload; // Uint8Array of ID bytes
  }

  async probeOnfi() {
    if (!this.firmwareVersion || !this.firmwareVersion.isV360) {
      return null; // ONFI hardware probe requires v3.6.0+
    }
    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(new Uint8Array([NandProgrammerClient.Command.PROBE_ONFI]));
    try {
      const resp = await this._readResponse(3000);
      if (resp.code === NandProgrammerClient.ResponseCode.DATA && resp.payload.length >= 60) {
        const mfg = new TextDecoder().decode(resp.payload.slice(0, 12)).replace(/\0/g, '').trim();
        const model = new TextDecoder().decode(resp.payload.slice(12, 32)).replace(/\0/g, '').trim();
        const pageSize = this._decodeU32(resp.payload, 32);
        const blockSize = this._decodeU32(resp.payload, 36);
        const totalSize = this._decodeU64(resp.payload, 40);
        const spareSize = this._decodeU32(resp.payload, 48);
        const rowCycles = resp.payload[52];
        const colCycles = resp.payload[53];

        return {
          name: `${mfg} ${model}`,
          manufacturer: mfg,
          model: model,
          pageSize,
          blockSize,
          totalSize,
          spareSize,
          rowCycles,
          colCycles,
          isOnfi: true
        };
      }
    } catch (_) {
      return null;
    }
    return null;
  }

  async configure(chip) {
    const halConfig = chip.halConfig || NAND_CHIP_DATABASE.calcFsmcTiming(chip);
    const packet = new Uint8Array(23 + halConfig.length);
    packet[0] = NandProgrammerClient.Command.CONFIGURE;
    packet[1] = 0; // hal = 0 (FSMC)
    packet.set(this._encodeU32(chip.pageSize), 2);
    packet.set(this._encodeU32(chip.blockSize), 6);
    packet.set(this._encodeU64(chip.totalSize), 10);
    packet.set(this._encodeU32(chip.spareSize), 18);
    packet[22] = chip.badBlockMarkOffset || 0;
    packet.set(halConfig, 23);

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(packet);
    await this._expectOk(5000);
    this.currentChip = chip;
  }

  async probe(forcedChipName = null) {
    this.isAborted = false;
    this.firmwareVersion = await this.getFirmwareVersion();

    if (forcedChipName) {
      const chip = NAND_CHIP_DATABASE.findChipByName(forcedChipName);
      if (!chip) throw new Error(`Chip ${forcedChipName} not found in database`);
      await this.configure(chip);
      return chip;
    }

    // Attempt ONFI 1.0 auto-probe first if v3.6.0+
    if (this.firmwareVersion.isV360) {
      const onfi = await this.probeOnfi();
      if (onfi && onfi.pageSize > 0) {
        this.currentChip = onfi;
        return onfi;
      }
    }

    // Configure with default timing to read NAND ID
    const defaultChip = NAND_CHIP_DATABASE.getDefaultChip();
    await this.configure(defaultChip);

    const idBytes = await this.readId();
    const matchedChip = NAND_CHIP_DATABASE.findChipById(idBytes);
    if (!matchedChip) {
      const hexId = Array.from(idBytes).map(b => '0x' + b.toString(16).padStart(2, '0').toUpperCase()).join(' ');
      throw new Error(`Read NAND ID [${hexId}], but no matching chip found in database.`);
    }

    await this.configure(matchedChip);
    matchedChip.idBytes = idBytes;
    return matchedChip;
  }

  async readBadBlocks() {
    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(new Uint8Array([NandProgrammerClient.Command.READ_BAD_BLOCKS]));
    const resp = await this._expectData(10000);
    const badBlocks = [];
    for (let i = 0; i < resp.payload.length; i += 4) {
      badBlocks.push(this._decodeU32(resp.payload, i));
    }
    return badBlocks;
  }

  async read(address, length, flags = {}, onProgress = null, onBadBlock = null, onDataChunk = null) {
    if (length <= 0) throw new Error("Read length must be greater than zero");

    const flagByte = (flags.skipBad ? 1 : 0) |
                     (flags.includeSpare ? 2 : 0) |
                     (flags.enableEcc ? 4 : 0) |
                     (flags.qpicBch4 ? 8 : 0) |
                     (flags.qpicBch8 ? 16 : 0);
    const packet = new Uint8Array(18);
    packet[0] = NandProgrammerClient.Command.READ;
    packet.set(this._encodeU64(address), 1);
    packet.set(this._encodeU64(length), 9);
    packet[17] = flagByte;

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(packet);

    let receivedBytes = 0;
    const chunks = [];

    while (receivedBytes < length) {
      const resp = await this._readResponse(30000);

      if (resp.code === NandProgrammerClient.ResponseCode.DATA) {
        if (resp.payload.length === 0) continue;
        chunks.push(resp.payload);
        receivedBytes += resp.payload.length;
        if (onDataChunk) onDataChunk(resp.payload, receivedBytes, length);
        if (onProgress) onProgress(receivedBytes, length);
      } else if (resp.code === NandProgrammerClient.ResponseCode.STATUS) {
        switch (resp.info) {
          case NandProgrammerClient.Status.ERROR:
            throw new Error(`Firmware read error at byte ${receivedBytes}`);
          case NandProgrammerClient.Status.BAD_BLOCK:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), false);
            break;
          case NandProgrammerClient.Status.BAD_BLOCK_SKIP:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), true);
            break;
          case NandProgrammerClient.Status.PROGRESS:
            if (onProgress) onProgress(this._decodeU64(resp.payload, 0), length);
            break;
        }
      }
    }

    // Merge chunks into single Uint8Array
    const fullData = new Uint8Array(receivedBytes);
    let offset = 0;
    for (const chunk of chunks) {
      fullData.set(chunk, offset);
      offset += chunk.length;
    }
    return fullData;
  }

  async erase(address, length, flags = {}, onProgress = null, onBadBlock = null) {
    if (length <= 0) throw new Error("Erase length must be greater than zero");

    const flagByte = (flags.skipBad ? 1 : 0) | (flags.includeSpare ? 2 : 0);
    const packet = new Uint8Array(18);
    packet[0] = NandProgrammerClient.Command.ERASE;
    packet.set(this._encodeU64(address), 1);
    packet.set(this._encodeU64(length), 9);
    packet[17] = flagByte;

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(packet);

    while (true) {
      const resp = await this._readResponse(30000);
      if (resp.code === NandProgrammerClient.ResponseCode.STATUS) {
        switch (resp.info) {
          case NandProgrammerClient.Status.OK:
            return true;
          case NandProgrammerClient.Status.ERROR:
            throw new Error("Firmware erase operation failed");
          case NandProgrammerClient.Status.BAD_BLOCK:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), false);
            break;
          case NandProgrammerClient.Status.BAD_BLOCK_SKIP:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), true);
            break;
          case NandProgrammerClient.Status.PROGRESS:
            if (onProgress) onProgress(this._decodeU64(resp.payload, 0), length);
            break;
        }
      }
    }
  }

  async write(dataUint8, address, flags = {}, onProgress = null, onBadBlock = null) {
    const totalLength = dataUint8.length;
    if (totalLength === 0) throw new Error("Write data is empty");

    const flagByte = (flags.skipBad ? 1 : 0) |
                     (flags.includeSpare ? 2 : 0) |
                     (flags.enableEcc ? 4 : 0) |
                     (flags.qpicBch4 ? 8 : 0) |
                     (flags.qpicBch8 ? 16 : 0);

    // 1. Send WRITE_START
    const startPacket = new Uint8Array(18);
    startPacket[0] = NandProgrammerClient.Command.WRITE_START;
    startPacket.set(this._encodeU64(address), 1);
    startPacket.set(this._encodeU64(totalLength), 9);
    startPacket[17] = flagByte;

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(startPacket);
    await this._expectOk(10000);

    // 2. Stream WRITE_DATA in 62-byte payloads with 1984-byte flow control
    const MAX_CHUNK = 62;
    const WRITE_ACK_BYTES = 1984;
    let bytesSent = 0;
    let bytesAcked = 0;

    while (bytesSent < totalLength) {
      if (this.isAborted) throw new Error("Write operation cancelled by user");

      const chunkSize = Math.min(MAX_CHUNK, totalLength - bytesSent);
      const chunkPacket = new Uint8Array(2 + chunkSize);
      chunkPacket[0] = NandProgrammerClient.Command.WRITE_DATA;
      chunkPacket[1] = chunkSize;
      chunkPacket.set(dataUint8.subarray(bytesSent, bytesSent + chunkSize), 2);

      await this._writePacket(chunkPacket);
      bytesSent += chunkSize;

      // Handle ACK flow control when buffer threshold reached
      if (bytesSent - bytesAcked >= WRITE_ACK_BYTES || bytesSent === totalLength) {
        const resp = await this._readResponse(15000);
        if (resp.code === NandProgrammerClient.ResponseCode.STATUS) {
          if (resp.info === NandProgrammerClient.Status.WRITE_ACK) {
            bytesAcked = this._decodeU64(resp.payload, 0);
            if (onProgress) onProgress(bytesAcked, totalLength);
          } else if (resp.info === NandProgrammerClient.Status.ERROR) {
            throw new Error(`Write failed at address 0x${this._decodeU64(resp.payload, 0).toString(16)}`);
          } else if (resp.info === NandProgrammerClient.Status.BAD_BLOCK) {
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), false);
          } else if (resp.info === NandProgrammerClient.Status.BAD_BLOCK_SKIP) {
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), true);
          }
        }
      }
    }

    // 3. Send WRITE_END
    await this._writePacket(new Uint8Array([NandProgrammerClient.Command.WRITE_END]));
    await this._expectOk(10000);
    return true;
  }

  async scrub(address, length, onProgress = null, onBadBlock = null) {
    if (!this.firmwareVersion || !this.firmwareVersion.isV360) {
      throw new Error("Physical Scrub requires Firmware v3.6.0+");
    }

    const packet = new Uint8Array(17);
    packet[0] = NandProgrammerClient.Command.SCRUB;
    packet.set(this._encodeU64(address), 1);
    packet.set(this._encodeU64(length), 9);

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(packet);

    while (true) {
      const resp = await this._readResponse(30000);
      if (resp.code === NandProgrammerClient.ResponseCode.STATUS) {
        switch (resp.info) {
          case NandProgrammerClient.Status.OK:
            return true;
          case NandProgrammerClient.Status.ERROR:
            throw new Error("Firmware scrub operation failed");
          case NandProgrammerClient.Status.BAD_BLOCK:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), false);
            break;
          case NandProgrammerClient.Status.BAD_BLOCK_SKIP:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), true);
            break;
          case NandProgrammerClient.Status.PROGRESS:
            if (onProgress) onProgress(this._decodeU64(resp.payload, 0), length);
            break;
        }
      }
    }
  }

  async test(address, length, mode = 3, markBad = true, seed = 0xA5A55A5A, onProgress = null, onBadBlock = null) {
    if (!this.firmwareVersion || !this.firmwareVersion.isV360) {
      throw new Error("Hardware SSD RDT Testing requires Firmware v3.6.0+");
    }

    const packet = new Uint8Array(23);
    packet[0] = NandProgrammerClient.Command.TEST;
    packet.set(this._encodeU64(address), 1);
    packet.set(this._encodeU64(length), 9);
    packet[17] = mode;
    packet[18] = markBad ? 1 : 0;
    packet.set(this._encodeU32(seed), 19);

    this.rxBuffer = new Uint8Array(0);
    await this._writePacket(packet);

    while (true) {
      const resp = await this._readResponse(45000);
      if (resp.code === NandProgrammerClient.ResponseCode.STATUS) {
        switch (resp.info) {
          case NandProgrammerClient.Status.OK:
            return true;
          case NandProgrammerClient.Status.ERROR:
            throw new Error("Firmware SSD RDT test operation failed");
          case NandProgrammerClient.Status.BAD_BLOCK:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), false);
            break;
          case NandProgrammerClient.Status.BAD_BLOCK_SKIP:
            if (onBadBlock) onBadBlock(this._decodeU64(resp.payload, 0), true);
            break;
          case NandProgrammerClient.Status.PROGRESS:
            if (onProgress) onProgress(this._decodeU64(resp.payload, 0), length);
            break;
        }
      }
    }
  }
}

// Global client instance
const programmerClient = new NandProgrammerClient();
