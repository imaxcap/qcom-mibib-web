/**
 * Qualcomm MIBIB Bi-directional Calculator & Live Overlap Guard Engine
 * Fixed: Automatic sequential allocation for unitialized preset/import entries while locking addresses on 2K/4K toggles.
 */

class PartitionCalculator {
  constructor(config = {}) {
    this.pageSize = config.pageSize || 2048;               // Default 2K (2048) or 4K (4096)
    this.primaryBlockSize = config.primaryBlockSize || 128 * 1024; // Default 128KB (2K) or 256KB (4K)
    this.norBlockSize = config.norBlockSize || 64 * 1024;          // NOR Flash fixed to 64KB
    this.flashType = config.flashType || 'nand';            // 'nand', 'nor', 'norplusnand'
  }

  updateConfig(config) {
    if (config.pageSize !== undefined) this.pageSize = config.pageSize;
    if (config.primaryBlockSize !== undefined) this.primaryBlockSize = config.primaryBlockSize;
    if (config.norBlockSize !== undefined) this.norBlockSize = config.norBlockSize;
    if (config.flashType !== undefined) this.flashType = config.flashType;
  }

  /**
   * Get Block Size for specific Flash Region
   * In NOR or NORPLUSNAND mode, Flash 0 (NOR) is ALWAYS fixed to 64KB, unaffected by 2K/4K NAND Page Size toggles!
   */
  getBlockSize(whichFlash = 0) {
    if (this.flashType === 'nor') {
      return this.norBlockSize; // Pure NOR: All blocks are 64KB
    }
    if (this.flashType === 'norplusnand') {
      if (whichFlash === 0) {
        return this.norBlockSize; // Dual Flash: Flash 0 (NOR) is 64KB, unaffected by 2K/4K toggles
      }
      return this.primaryBlockSize; // Flash 1 (NAND): Uses 128KB (2K) or 256KB (4K)
    }
    // Pure NAND: Flash 0 is NAND, uses 128KB (2K) or 256KB (4K)
    return this.primaryBlockSize;
  }

  /**
   * Recalculate derived fields.
   * Uninitialized entries auto-sequence from currBlocks, while existing entries lock physical byte addrs on 2K/4K toggles!
   */
  recalculatePartitions(partitions, options = { cascadeOffsets: false }) {
    const currBlocks = { 0: 0, 1: 0 };

    partitions.forEach((part, index) => {
      const bs = this.getBlockSize(part.whichFlash);
      const bsKb = Math.max(1, bs / 1024);

      if (options.cascadeOffsets) {
        part.startBlock = currBlocks[part.whichFlash];
        part.startAddrBytes = part.startBlock * bs;
      } else {
        // If entry is completely uninitialized (e.g. preset loading or XML import without startBlock)
        if (part.startBlock === undefined && part.startAddrBytes === undefined && !part.hexStartAddr) {
          part.startBlock = currBlocks[part.whichFlash];
          part.startAddrBytes = part.startBlock * bs;
        } else if (part.startAddrBytes !== undefined) {
          part.startBlock = Math.floor(part.startAddrBytes / bs);
        } else if (part.hexStartAddr) {
          const hexVal = parseInt(part.hexStartAddr, 16);
          part.startAddrBytes = isNaN(hexVal) ? 0 : hexVal;
          part.startBlock = Math.floor(part.startAddrBytes / bs);
        } else {
          part.startBlock = part.startBlock || 0;
          part.startAddrBytes = part.startBlock * bs;
        }
      }

      // Compute physical sizeBlocks from sizeKb & padKb (sizeKb remains locked on 2K/4K toggles)
      if (part.sizeKb !== undefined && part.sizeKb >= 0) {
        const totalKb = part.sizeKb + (part.padKb || 0);
        part.sizeBlocks = totalKb > 0 ? Math.ceil(totalKb / bsKb) : 0;
      } else if (part.sizeBlocks !== undefined && part.sizeBlocks >= 0) {
        part.sizeKb = part.sizeBlocks * bsKb;
      } else {
        part.sizeKb = 0;
        part.sizeBlocks = 0;
      }

      // Compute Size MB
      part.sizeMb = (part.sizeKb / 1024).toFixed(2);

      // Compute Hex Addresses
      const startAddrBytes = part.startAddrBytes;
      const sizeBytes = part.sizeBlocks * bs;
      const endAddrBytes = startAddrBytes + sizeBytes;

      part.startAddrBytes = startAddrBytes;
      part.endAddrBytes = endAddrBytes;
      part.hexStartAddr = '0x' + startAddrBytes.toString(16).toUpperCase();
      part.hexEndAddr = '0x' + endAddrBytes.toString(16).toUpperCase();

      // Alignment & Integrity Status
      part.isAligned = (startAddrBytes % bs === 0);
      part.warnings = [];
      part.errors = [];

      if (!part.isAligned) {
        part.warnings.push(`Address ${part.hexStartAddr} is not aligned to Block size (${bs / 1024}KB)`);
      }

      currBlocks[part.whichFlash] = part.startBlock + part.sizeBlocks;
    });

    // Run Overlap Collision Detection
    this.detectOverlaps(partitions);

    return partitions;
  }

  /**
   * Check for physical space collisions between partitions in the same flash region
   */
  detectOverlaps(partitions) {
    for (let i = 0; i < partitions.length; i++) {
      for (let j = i + 1; j < partitions.length; j++) {
        const p1 = partitions[i];
        const p2 = partitions[j];

        if (p1.whichFlash === p2.whichFlash) {
          const s1 = p1.startAddrBytes;
          const e1 = p1.endAddrBytes;
          const s2 = p2.startAddrBytes;
          const e2 = p2.endAddrBytes;

          if ((e1 > s1) && (e2 > s2) && (Math.max(s1, s2) < Math.min(e1, e2))) {
            const overlapMsg = `Collision: Overlaps with partition '${p2.name}' (${p2.hexStartAddr} - ${p2.hexEndAddr})`;
            p1.errors.push(overlapMsg);
            p2.errors.push(`Collision: Overlaps with partition '${p1.name}' (${p1.hexStartAddr} - ${p1.hexEndAddr})`);
          }
        }
      }
    }
  }

  /**
   * Handle user update of a partition's Hex Start Address
   */
  updateHexStartAddr(part, hexStr) {
    hexStr = hexStr.trim();
    if (!hexStr.startsWith('0x') && !hexStr.startsWith('0X')) {
      hexStr = '0x' + hexStr;
    }

    const addrBytes = parseInt(hexStr, 16);
    if (isNaN(addrBytes) || addrBytes < 0) {
      throw new Error(`Invalid Hex Address string: ${hexStr}`);
    }

    const bs = this.getBlockSize(part.whichFlash);
    part.startAddrBytes = addrBytes;
    part.startBlock = Math.floor(addrBytes / bs);
    part.hexStartAddr = '0x' + addrBytes.toString(16).toUpperCase();
  }

  /**
   * Handle user update of a partition's Size (in KB or MB)
   */
  updateSize(part, val, unit = 'MB') {
    const num = parseFloat(val);
    if (isNaN(num) || num < 0) {
      throw new Error(`Invalid size value: ${val}`);
    }

    const bs = this.getBlockSize(part.whichFlash);
    const bsKb = Math.max(1, bs / 1024);

    let sizeKb = (unit === 'MB') ? Math.round(num * 1024) : Math.round(num);
    part.sizeKb = Math.max(0, sizeKb);
    part.sizeBlocks = sizeKb > 0 ? Math.ceil(sizeKb / bsKb) : 0;
  }
}

if (typeof module !== 'undefined' && module.exports) {
  module.exports = { PartitionCalculator };
}
