/**
 * Qualcomm MIBIB Partition Binary Parser & Full-Flash Auto-Discovery Engine
 * Supports both ArrayBuffer and Uint8Array/TypedArray inputs
 * Includes Physical MIBIB Header Distance Measurement for Auto Page/Block Size Detection (2K vs 4K)
 * 100% Ported from Qualcomm Official partition_tool.py Specification & nandprog C++ core
 */
const MIBIB_HEADER_MAGIC1 = 0xFE569FAC;
const MIBIB_HEADER_MAGIC2 = 0xCD7F127A;
const SYS_TABLE_MAGIC1    = 0x55EE73AA;
const SYS_TABLE_MAGIC2    = 0xE35EBDDB;
const USR_TABLE_MAGIC1    = 0xAA7D1B9A;
const USR_TABLE_MAGIC2    = 0x1F7D48BC;

const MAX_SUPPORTED_FILE_SIZE = 136 * 1024 * 1024; // 136 MB Full-Dump Limit
const BLOCK_SIZE_ALIGN_64K    = 64 * 1024;        // 64 KB (65536 bytes) Block Alignment

function parseMibibBin(inputBuffer) {
  let arrayBuffer;
  let byteOffset = 0;
  let dataLen = 0;

  if (inputBuffer instanceof ArrayBuffer) {
    arrayBuffer = inputBuffer;
    byteOffset = 0;
    dataLen = inputBuffer.byteLength;
  } else if (ArrayBuffer.isView(inputBuffer)) {
    arrayBuffer = inputBuffer.buffer;
    byteOffset = inputBuffer.byteOffset;
    dataLen = inputBuffer.byteLength;
  } else {
    throw new Error("Input must be an ArrayBuffer or Uint8Array");
  }

  if (dataLen > MAX_SUPPORTED_FILE_SIZE) {
    throw new Error(`File size (${(dataLen / (1024 * 1024)).toFixed(2)} MB) exceeds 136 MB limit. Please provide a dump under 136 MB or standalone MIBIB binary.`);
  }

  if (dataLen < 32) {
    throw new Error("File size is too small to contain a valid MIBIB header.");
  }

  // Scan window: MIBIB is always located in the boot sector (first 8MB)
  const scanLimit = Math.min(dataLen, 8 * 1024 * 1024);

  const dataView = new DataView(arrayBuffer, byteOffset, dataLen);
  const uint8Data = new Uint8Array(arrayBuffer, byteOffset, dataLen);

  let mibibOffset = -1;
  let tableOffset = -1;
  let isSysTable = true;
  let numParts = 0;
  const mibibCopyOffsets = [];

  // 1. Scan for ALL MIBIB Header Copies (0xFE569FAC / 0xCD7F127A) to infer physical Block Size
  for (let offset = 0; offset <= scanLimit - 16; offset += 4) {
    if (dataView.getUint32(offset, true) === MIBIB_HEADER_MAGIC1 &&
        dataView.getUint32(offset + 4, true) === MIBIB_HEADER_MAGIC2) {
      mibibCopyOffsets.push(offset);
      if (mibibOffset < 0) {
        mibibOffset = offset;
      }
    }
  }

  // Infer Primary Block Size & Page Size from physical distance between MIBIB Header copies
  let detectedBlockSize = null;
  let detectedPageSize = null;

  if (mibibCopyOffsets.length >= 2) {
    const spacing = mibibCopyOffsets[1] - mibibCopyOffsets[0];
    if (spacing === 256 * 1024) {
      detectedBlockSize = 256 * 1024;
      detectedPageSize = 4096; // 4K Page
    } else if (spacing === 128 * 1024) {
      detectedBlockSize = 128 * 1024;
      detectedPageSize = 2048; // 2K Page
    } else if (spacing === 64 * 1024) {
      detectedBlockSize = 64 * 1024;
      detectedPageSize = 256;  // SPI-NOR Page (256 bytes)
    }
  }

  // 2. If MIBIB header was found, check standard relative positions for Table Header
  if (mibibOffset >= 0) {
    const candidateOffsets = [
      { offset: mibibOffset + 16,   pageSize: null, blockSize: null },           // Contiguous table (compact standalone)
      { offset: mibibOffset + 256,  pageSize: 256,  blockSize: 64 * 1024 },      // SPI NOR page 1 (0x100)
      { offset: mibibOffset + 2048, pageSize: 2048, blockSize: 128 * 1024 },     // 2K NAND page 1 (0x800)
      { offset: mibibOffset + 4096, pageSize: 4096, blockSize: 256 * 1024 },     // 4K NAND page 1 (0x1000)
    ];

    for (const candidate of candidateOffsets) {
      const testOffset = candidate.offset;
      if (testOffset + 16 <= dataLen) {
        const m1 = dataView.getUint32(testOffset, true);
        const m2 = dataView.getUint32(testOffset + 4, true);
        const parts = dataView.getUint32(testOffset + 12, true);

        if (m1 === SYS_TABLE_MAGIC1 && m2 === SYS_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
          tableOffset = testOffset;
          isSysTable = true;
          numParts = parts;
          if (candidate.blockSize) detectedBlockSize = candidate.blockSize;
          if (candidate.pageSize) detectedPageSize = candidate.pageSize;
          break;
        } else if (m1 === USR_TABLE_MAGIC1 && m2 === USR_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
          tableOffset = testOffset;
          isSysTable = false;
          numParts = parts;
          if (candidate.blockSize) detectedBlockSize = candidate.blockSize;
          if (candidate.pageSize) detectedPageSize = candidate.pageSize;
          break;
        }
      }
    }
  }

  // 3. Fallback: 4-byte sliding scan across the entire scan window for Table Header
  if (tableOffset < 0) {
    for (let offset = 0; offset <= scanLimit - 16; offset += 4) {
      const m1 = dataView.getUint32(offset, true);
      const m2 = dataView.getUint32(offset + 4, true);
      const parts = dataView.getUint32(offset + 12, true);

      if (m1 === SYS_TABLE_MAGIC1 && m2 === SYS_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
        tableOffset = offset;
        isSysTable = true;
        numParts = parts;
        break;
      } else if (m1 === USR_TABLE_MAGIC1 && m2 === USR_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
        tableOffset = offset;
        isSysTable = false;
        numParts = parts;
        break;
      }
    }
  }

  if (tableOffset < 0) {
    throw new Error("Could not detect a valid Qualcomm MIBIB Partition Table in the provided binary.");
  }

  // Priority geometry inference: Page 1 Table distance from MIBIB Header (0x100 / 0x800 / 0x1000)
  // This is the absolute physical geometry indicator on all Qualcomm IPQ architectures.
  if (mibibOffset >= 0) {
    const diff = tableOffset - mibibOffset;
    if (diff === 256) {
      detectedPageSize = 256;
      detectedBlockSize = 64 * 1024;
    } else if (diff === 2048) {
      detectedPageSize = 2048;
      detectedBlockSize = 128 * 1024;
    } else if (diff === 4096) {
      detectedPageSize = 4096;
      detectedBlockSize = 256 * 1024;
    }
  } else {
    // If no standalone MIBIB header, check alignment of tableOffset itself
    if (tableOffset === 256 || tableOffset % (64 * 1024) === 256) {
      detectedPageSize = 256;
      detectedBlockSize = 64 * 1024;
    } else if (tableOffset === 2048 || tableOffset % (128 * 1024) === 2048) {
      detectedPageSize = 2048;
      detectedBlockSize = 128 * 1024;
    } else if (tableOffset === 4096 || tableOffset % (256 * 1024) === 4096) {
      detectedPageSize = 4096;
      detectedBlockSize = 256 * 1024;
    }
  }

  // Standalone 64KB file size hint
  if (!detectedBlockSize && dataLen === 64 * 1024) {
    detectedBlockSize = 64 * 1024;
    detectedPageSize = 256;
  }

  const tableVersion = dataView.getUint32(tableOffset + 8, true);
  const headerSize = 16;
  const sysEntrySize = 28; // 16s II BBBB
  const usrEntrySize = 28; // 16s IHH BBBB

  const entries = [];
  const decoder = new TextDecoder('ascii');

  for (let i = 0; i < numParts; i++) {
    const entryOffset = tableOffset + headerSize + i * (isSysTable ? sysEntrySize : usrEntrySize);
    if (entryOffset + 28 > dataLen) {
      throw new Error(`Partition entry #${i} extends past the end of binary data.`);
    }

    // Extract 16 bytes ASCII name
    const nameBytes = uint8Data.subarray(entryOffset, entryOffset + 16);
    let nameLen = 16;
    for (let k = 0; k < 16; k++) {
      if (nameBytes[k] === 0) {
        nameLen = k;
        break;
      }
    }
    const name = decoder.decode(nameBytes.subarray(0, nameLen)).trim();

    if (isSysTable) {
      const startBlock = dataView.getUint32(entryOffset + 16, true);
      const sizeBlocks = dataView.getUint32(entryOffset + 20, true);
      const attr1 = uint8Data[entryOffset + 24];
      const attr2 = uint8Data[entryOffset + 25];
      const attr3 = uint8Data[entryOffset + 26];
      const whichFlash = uint8Data[entryOffset + 27];

      entries.push({
        id: 'part_' + Math.random().toString(36).substring(2, 9),
        name: name || `PART_${i}`,
        startBlock: startBlock,
        sizeBlocks: sizeBlocks,
        whichFlash: whichFlash,
        attr1: attr1,
        attr2: attr2,
        attr3: attr3,
        attr4: 0xFF
      });
    } else {
      // User Partition Table format
      const sizeKb = dataView.getUint32(entryOffset + 16, true);
      const padKb = dataView.getUint16(entryOffset + 20, true);
      const whichFlash = dataView.getUint16(entryOffset + 22, true);
      const attr1 = uint8Data[entryOffset + 24];
      const attr2 = uint8Data[entryOffset + 25];
      const attr3 = uint8Data[entryOffset + 26];
      const attr4 = uint8Data[entryOffset + 27];

      entries.push({
        id: 'part_' + Math.random().toString(36).substring(2, 9),
        name: name || `PART_${i}`,
        sizeKb: sizeKb,
        padKb: padKb,
        whichFlash: whichFlash,
        attr1: attr1,
        attr2: attr2,
        attr3: attr3,
        attr4: attr4
      });
    }
  }

  // Infer Flash Architecture Type
  let detectedFlashType = null;
  const hasSecondary = entries.some(e => e.whichFlash === 1);
  if (hasSecondary) {
    detectedFlashType = 'norplusnand';
  } else if (detectedBlockSize === 64 * 1024 || detectedPageSize === 256 || (mibibOffset >= 0 && (tableOffset - mibibOffset) === 256) || (tableOffset === 256) || (tableOffset % (64 * 1024) === 256)) {
    detectedFlashType = 'nor';
  } else if (detectedBlockSize === 128 * 1024 || detectedBlockSize === 256 * 1024 || detectedPageSize === 2048 || detectedPageSize === 4096) {
    detectedFlashType = 'nand';
  } else {
    detectedFlashType = 'nand';
  }

  return {
    tableType: isSysTable ? 'system' : 'user',
    mibibOffset: mibibOffset >= 0 ? mibibOffset : tableOffset,
    mibibVersion: mibibOffset >= 0 ? dataView.getUint32(mibibOffset + 8, true) : 3,
    tableVersion: tableVersion,
    numParts: numParts,
    detectedBlockSize: detectedBlockSize,
    detectedPageSize: detectedPageSize,
    detectedFlashType: detectedFlashType,
    entries: entries
  };
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { parseMibibBin };
}
