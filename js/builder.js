/**
 * Qualcomm MIBIB Binary (partition.mbn) and XML Export Generator
 * 100% Ported from Qualcomm Official partition_tool.py Specification
 */

/**
 * Qualcomm MIBIB CRC-32/MPEG-2 Algorithm, chained across pages
 */
function crc32Mpeg2(uint8Array, initialCrc = 0) {
  let crc = initialCrc >>> 0;
  for (let i = 0; i < uint8Array.length; i++) {
    crc ^= (uint8Array[i] << 24);
    for (let j = 0; j < 8; j++) {
      if (crc & 0x80000000) {
        crc = ((crc << 1) ^ 0x04C11DB7) >>> 0;
      } else {
        crc = (crc << 1) >>> 0;
      }
    }
  }
  return crc >>> 0;
}

/**
 * Build Official Qualcomm Binary MIBIB (partition.mbn / mibib.bin)
 */
function buildSystemMbnBytes(partitions, calculatorOptions = {}) {
  const flashType = calculatorOptions.flashType || 'nand';

  // NOR & NORPLUSNAND: Flash 0 is NOR, page size 256 bytes (0x100), block size 64KB, 1 MIBIB copy (-c 1) -> 64KB total
  // Pure NAND: Flash 0 is NAND, page size 2048 (2K) or 4096 (4K) bytes, block size 128KB (2K) or 256KB (4K), 2 MIBIB copies (-c 2) -> 256KB (2K) or 512KB (4K)
  let pageSize = calculatorOptions.pageSize || 2048;
  let blockSizeBytes = calculatorOptions.primaryBlockSize || (128 * 1024);
  let numCopies = 2;

  if (flashType === 'nor' || flashType === 'norplusnand') {
    pageSize = 256; // SPI-NOR page size is fixed to 256 bytes (0x100)
    blockSizeBytes = calculatorOptions.norBlockSize || (64 * 1024);
    numCopies = 1;
  }

  const pagesPerBlock = Math.floor(blockSizeBytes / pageSize) || 64;

  const maxPartitions = 32;
  const numParts = Math.min(partitions.length, maxPartitions);

  // 1. Build System Partition Entries & User Partition Entries (28 bytes each)
  const sysEntriesBuffer = new ArrayBuffer(maxPartitions * 28);
  const sysEntriesView = new DataView(sysEntriesBuffer);
  const sysEntriesUint8 = new Uint8Array(sysEntriesBuffer);

  const usrEntriesBuffer = new ArrayBuffer(maxPartitions * 28);
  const usrEntriesView = new DataView(usrEntriesBuffer);
  const usrEntriesUint8 = new Uint8Array(usrEntriesBuffer);

  const encoder = new TextEncoder();

  for (let i = 0; i < numParts; i++) {
    const part = partitions[i];
    const sysOffset = i * 28;
    const usrOffset = i * 28;

    // ASCII Name (16 bytes)
    const nameBytes = encoder.encode(part.name.substring(0, 15));
    for (let b = 0; b < 16; b++) {
      const val = b < nameBytes.length ? nameBytes[b] : 0x00;
      sysEntriesUint8[sysOffset + b] = val;
      usrEntriesUint8[usrOffset + b] = val;
    }

    // System Entry: offset (startBlock), length (sizeBlocks), attr1, attr2, attr3, which_flash
    sysEntriesView.setUint32(sysOffset + 16, part.startBlock || 0, true);
    sysEntriesView.setUint32(sysOffset + 20, part.sizeBlocks || 0, true);
    sysEntriesUint8[sysOffset + 24] = part.attr1 !== undefined ? part.attr1 : 0xFF;
    sysEntriesUint8[sysOffset + 25] = part.attr2 !== undefined ? part.attr2 : 0xFF;
    sysEntriesUint8[sysOffset + 26] = part.attr3 !== undefined ? part.attr3 : 0xFF;
    sysEntriesUint8[sysOffset + 27] = part.whichFlash !== undefined ? part.whichFlash : 0x00;

    // User Entry: size_kb, pad_kb, which_flash, attr1, attr2, attr3, attr4
    usrEntriesView.setUint32(usrOffset + 16, part.sizeKb || 0, true);
    usrEntriesView.setUint16(usrOffset + 20, part.padKb || 0, true);
    usrEntriesView.setUint16(usrOffset + 22, part.whichFlash || 0, true);
    usrEntriesUint8[usrOffset + 24] = part.attr1 !== undefined ? part.attr1 : 0xFF;
    usrEntriesUint8[usrOffset + 25] = part.attr2 !== undefined ? part.attr2 : 0xFF;
    usrEntriesUint8[usrOffset + 26] = part.attr3 !== undefined ? part.attr3 : 0xFF;
    usrEntriesUint8[usrOffset + 27] = part.attr4 !== undefined ? part.attr4 : 0xFF;
  }

  // 2. Build System Table & User Table Headers (16 bytes each)
  const sysHeaderBuffer = new ArrayBuffer(16);
  const sysHeaderView = new DataView(sysHeaderBuffer);
  sysHeaderView.setUint32(0, 0x55EE73AA, true); // SYS_TABLE_MAGIC1
  sysHeaderView.setUint32(4, 0xE35EBDDB, true); // SYS_TABLE_MAGIC2
  sysHeaderView.setUint32(8, 0x00000004, true); // Version 4
  sysHeaderView.setUint32(12, numParts, true);

  const usrHeaderBuffer = new ArrayBuffer(16);
  const usrHeaderView = new DataView(usrHeaderBuffer);
  usrHeaderView.setUint32(0, 0xAA7D1B9A, true); // USR_TABLE_MAGIC1
  usrHeaderView.setUint32(4, 0x1F7D48BC, true); // USR_TABLE_MAGIC2
  usrHeaderView.setUint32(8, 0x00000004, true); // Version 4
  usrHeaderView.setUint32(12, numParts, true);

  // Combine Headers and Entries
  const sysTableBytes = concatUint8Arrays(new Uint8Array(sysHeaderBuffer), sysEntriesUint8);
  const usrTableBytes = concatUint8Arrays(new Uint8Array(usrHeaderBuffer), usrEntriesUint8);

  const sysPages = Math.ceil(sysTableBytes.length / pageSize);
  const usrPages = Math.ceil(usrTableBytes.length / pageSize);
  const pagesUsed = 1 + sysPages + usrPages + 1; // Page0 + SysPages + UsrPages + CrcPage

  const sysData = padUint8Array(sysTableBytes, sysPages * pageSize, 0xFF);
  const usrData = padUint8Array(usrTableBytes, usrPages * pageSize, 0xFF);

  // 3. Assemble Blocks for each MIBIB Copy
  const totalBinaryBytes = new Uint8Array(numCopies * blockSizeBytes);
  totalBinaryBytes.fill(0xFF);

  for (let copyIdx = 0; copyIdx < numCopies; copyIdx++) {
    const blockOffset = copyIdx * blockSizeBytes;

    // Page 0: MIBIB Header
    const page0Header = new ArrayBuffer(16);
    const page0View = new DataView(page0Header);
    page0View.setUint32(0, 0xFE569FAC, true); // MIBIB_HEADER_MAGIC1
    page0View.setUint32(4, 0xCD7F127A, true); // MIBIB_HEADER_MAGIC2
    page0View.setUint32(8, 0x00000004, true); // Version 4
    page0View.setUint32(12, copyIdx, true);   // Age / Copy Index

    const page0Data = padUint8Array(new Uint8Array(page0Header), pageSize, 0xFF);

    // Compute Qualcomm Chained CRC-32/MPEG-2 across Page0, SysData, and UsrData
    let crcVal = crc32Mpeg2(page0Data, 0);
    crcVal = crc32Mpeg2(sysData, crcVal);
    crcVal = crc32Mpeg2(usrData, crcVal);

    // CRC Page Header (0x9D41BEA1 / 0xF1DED2EA)
    const crcHeader = new ArrayBuffer(16);
    const crcView = new DataView(crcHeader);
    crcView.setUint32(0, 0x9D41BEA1, true); // CRC_MAGIC1
    crcView.setUint32(4, 0xF1DED2EA, true); // CRC_MAGIC2
    crcView.setUint32(8, 0x00000001, true); // Version 1
    crcView.setUint32(12, crcVal, true);    // Computed CRC

    const crcPageData = padUint8Array(new Uint8Array(crcHeader), pageSize, 0xFF);

    // Assembly Block Data
    let currBlockPos = blockOffset;
    totalBinaryBytes.set(page0Data, currBlockPos);
    currBlockPos += page0Data.length;

    totalBinaryBytes.set(sysData, currBlockPos);
    currBlockPos += sysData.length;

    totalBinaryBytes.set(usrData, currBlockPos);
    currBlockPos += usrData.length;

    totalBinaryBytes.set(crcPageData, currBlockPos);
    currBlockPos += crcPageData.length;
  }

  return totalBinaryBytes;
}

function buildSystemMbn(partitions, calculatorOptions = {}) {
  const bytes = buildSystemMbnBytes(partitions, calculatorOptions);
  return new Blob([bytes.buffer], { type: 'application/octet-stream' });
}

function buildPartitionXml(partitions, calculatorOptions = {}) {
  const flashType = calculatorOptions.flashType || 'nand';
  let rootTag = 'nandboot';
  if (flashType === 'nor') {
    rootTag = 'norboot';
  } else if (flashType === 'norplusnand') {
    rootTag = 'norplusnandboot';
  }

  let xml = `<?xml version="1.0" encoding="utf-8"?>\n<${rootTag}>\n`;
  xml += `  <magic_numbers>\n    <usr_part_magic1>0xAA7D1B9A</usr_part_magic1>\n    <usr_part_magic2>0x1F7D48BC</usr_part_magic2>\n  </magic_numbers>\n`;
  xml += `  <partition_version length="4">0x4</partition_version>\n`;
  xml += `  <partitions>\n`;

  partitions.forEach((part) => {
    xml += `    <partition>\n`;
    xml += `      <name length="16" type="string">${escapeXml(part.name)}</name>\n`;
    xml += `      <size_kb length="4">${part.sizeKb || 0}</size_kb>\n`;
    xml += `      <pad_kb length="2">${part.padKb || 0}</pad_kb>\n`;
    xml += `      <which_flash length="2">${part.whichFlash || 0}</which_flash>\n`;
    xml += `      <attr>0x${(part.attr1 !== undefined ? part.attr1 : 0xFF).toString(16).toUpperCase().padStart(2, '0')}</attr>\n`;
    xml += `      <attr>0x${(part.attr2 !== undefined ? part.attr2 : 0xFF).toString(16).toUpperCase().padStart(2, '0')}</attr>\n`;
    xml += `      <attr>0x${(part.attr3 !== undefined ? part.attr3 : 0xFF).toString(16).toUpperCase().padStart(2, '0')}</attr>\n`;
    xml += `      <attr>0x${(part.attr4 !== undefined ? part.attr4 : 0xFF).toString(16).toUpperCase().padStart(2, '0')}</attr>\n`;
    xml += `    </partition>\n`;
  });

  xml += `  </partitions>\n</${rootTag}>\n`;
  return new Blob([xml], { type: 'text/xml' });
}

function concatUint8Arrays(a, b) {
  const c = new Uint8Array(a.length + b.length);
  c.set(a, 0);
  c.set(b, a.length);
  return c;
}

function padUint8Array(array, targetLength, fillByte = 0xFF) {
  if (array.length >= targetLength) return array;
  const padded = new Uint8Array(targetLength);
  padded.fill(fillByte);
  padded.set(array, 0);
  return padded;
}

function escapeXml(unsafe) {
  return unsafe.replace(/[<>&'"]/g, (c) => {
    switch (c) {
      case '<': return '&lt;';
      case '>': return '&gt;';
      case '&': return '&amp;';
      case '\'': return '&apos;';
      case '"': return '&quot;';
    }
  });
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { buildSystemMbn, buildSystemMbnBytes, buildPartitionXml, crc32Mpeg2 };
}
