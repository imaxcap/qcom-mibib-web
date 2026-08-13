/**
 * Qualcomm MIBIB Partition Binary Parser & Full-Flash Auto-Discovery Engine
 * Includes Physical MIBIB Header Distance Measurement for Auto Page/Block Size Detection (2K vs 4K)
 */
const MIBIB_HEADER_MAGIC1 = 0xFE569FAC;
const MIBIB_HEADER_MAGIC2 = 0xCD7F127A;
const SYS_TABLE_MAGIC1    = 0x55EE73AA;
const SYS_TABLE_MAGIC2    = 0xE35EBDDB;
const USR_TABLE_MAGIC1    = 0xAA7D1B9A;
const USR_TABLE_MAGIC2    = 0x1F7D48BC;

const MAX_SUPPORTED_FILE_SIZE = 16 * 1024 * 1024; // 16 MB Safety Limit
const BLOCK_SIZE_ALIGN_64K    = 64 * 1024;         // 64 KB (65536 bytes) Block Alignment

function parseMibibBin(buffer) {
  const dataLen = buffer.byteLength;

  // 1. 16MB File Size Safety Check
  if (dataLen > MAX_SUPPORTED_FILE_SIZE) {
    throw new Error(`File size (${(dataLen / (1024 * 1024)).toFixed(2)} MB) exceeds 16 MB limit. Please provide a full dump under 16 MB or standalone MIBIB binary.`);
  }

  if (dataLen < 32) {
    throw new Error("File size is too small to contain a valid MIBIB header.");
  }

  const dataView = new DataView(buffer);
  const uint8Data = new Uint8Array(buffer);

  let mibibOffset = -1;
  let tableOffset = -1;
  let isSysTable = true;
  let numParts = 0;
  const mibibCopyOffsets = [];

  // 2. Scan for ALL MIBIB Header Copies (0xFE569FAC / 0xCD7F127A) to infer physical Block Size
  for (let offset = 0; offset <= dataLen - 32; offset += 4) {
    if (dataView.getUint32(offset, true) === MIBIB_HEADER_MAGIC1 &&
        dataView.getUint32(offset + 4, true) === MIBIB_HEADER_MAGIC2) {
      mibibCopyOffsets.push(offset);
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
      detectedPageSize = 2048;
    }
  }

  // 3. Priority 1: 64KB Block-Aligned Sector Scan for MIBIB Header
  for (let offset = 0; offset <= dataLen - 32; offset += BLOCK_SIZE_ALIGN_64K) {
    if (dataView.getUint32(offset, true) === MIBIB_HEADER_MAGIC1 &&
        dataView.getUint32(offset + 4, true) === MIBIB_HEADER_MAGIC2) {
      mibibOffset = offset;
      
      const testTableOffset = mibibOffset + 16;
      if (testTableOffset + 16 <= dataLen) {
        const m1 = dataView.getUint32(testTableOffset, true);
        const m2 = dataView.getUint32(testTableOffset + 4, true);
        const parts = dataView.getUint32(testTableOffset + 12, true);

        if (m1 === SYS_TABLE_MAGIC1 && m2 === SYS_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
          tableOffset = testTableOffset;
          isSysTable = true;
          numParts = parts;
          break;
        } else if (m1 === USR_TABLE_MAGIC1 && m2 === USR_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
          tableOffset = testTableOffset;
          isSysTable = false;
          numParts = parts;
          break;
        }
      }
    }
  }

  // 4. Priority 2: Unaligned MIBIB Header Scan
  if (mibibOffset < 0 || tableOffset < 0) {
    for (let offset = 0; offset <= dataLen - 32; offset += 4) {
      if (dataView.getUint32(offset, true) === MIBIB_HEADER_MAGIC1 &&
          dataView.getUint32(offset + 4, true) === MIBIB_HEADER_MAGIC2) {
        mibibOffset = offset;
        const testTableOffset = mibibOffset + 16;
        if (testTableOffset + 16 <= dataLen) {
          const m1 = dataView.getUint32(testTableOffset, true);
          const m2 = dataView.getUint32(testTableOffset + 4, true);
          const parts = dataView.getUint32(testTableOffset + 12, true);

          if (m1 === SYS_TABLE_MAGIC1 && m2 === SYS_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
            tableOffset = testTableOffset;
            isSysTable = true;
            numParts = parts;
            break;
          } else if (m1 === USR_TABLE_MAGIC1 && m2 === USR_TABLE_MAGIC2 && parts > 0 && parts <= 128) {
            tableOffset = testTableOffset;
            isSysTable = false;
            numParts = parts;
            break;
          }
        }
      }
    }
  }

  // 5. Priority 3: Standalone Partition Table Header Scan (No MIBIB Header)
  if (tableOffset < 0) {
    for (let offset = 0; offset <= dataLen - 16; offset += BLOCK_SIZE_ALIGN_64K) {
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

  // 6. Priority 4: Fallback 4-byte fine scan for standalone table header
  if (tableOffset < 0) {
    for (let offset = 0; offset <= dataLen - 16; offset += 4) {
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

  return {
    tableType: isSysTable ? 'system' : 'user',
    mibibOffset: mibibOffset >= 0 ? mibibOffset : tableOffset,
    mibibVersion: mibibOffset >= 0 ? dataView.getUint32(mibibOffset + 8, true) : 3,
    tableVersion: tableVersion,
    numParts: numParts,
    detectedBlockSize: detectedBlockSize,
    detectedPageSize: detectedPageSize,
    entries: entries
  };
}
