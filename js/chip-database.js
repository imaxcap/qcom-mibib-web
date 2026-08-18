/**
 * Qualcomm MIBIB Web Studio - NAND Chip Database & Timing Calculator
 * Embedded parallel and SPI chip definitions with FSMC HAL timing generation.
 */

const NAND_CHIP_DATABASE = (function() {
  const HCLK_PERIOD_NS = 13.88;
  const DATA_SETUP_TO_NOE_NS = 25.0;

  // Raw Parallel NAND Chips
  const PARALLEL_CHIPS = [
    {
      name: "K9F2G08U0C",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0xDA, 0x10, 0x95, 0x44]
    },
    {
      name: "K9F1G08U0E",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 134217728,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0xF1, 0x00, 0x95, 0x41]
    },
    {
      name: "K9F1208U0B",
      pageSize: 512,
      blockSize: 16384,
      totalSize: 67108864,
      spareSize: 16,
      badBlockMarkOffset: 5,
      tCS: 0, tCLS: 0, tALS: 0, tCLR: 10, tAR: 10, tWP: 25, tRP: 25, tDS: 20,
      tCH: 10, tCLH: 10, tALH: 10, tWC: 45, tRC: 50, tREA: 30,
      rowCycles: 3, colCycles: 1,
      read1: 0x00, read2: 0xFF, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0x76, 0xA5, 0xC0]
    },
    {
      name: "K9G8G08U0A",
      pageSize: 2048,
      blockSize: 262144,
      totalSize: 1073741824,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0xD3, 0x14, 0xA5, 0x64]
    },
    {
      name: "K9G8G08U0M",
      pageSize: 2048,
      blockSize: 262144,
      totalSize: 1073741824,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 15, tALS: 15, tCLR: 10, tAR: 10, tWP: 15, tRP: 15, tDS: 15,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 30, tRC: 30, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0xD3, 0x14, 0x25, 0x64]
    },
    {
      name: "K9F4G08U0A",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 536870912,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEC, 0xDC, 0x10, 0x95, 0x54]
    },
    {
      name: "TC58NVG2S3E",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 536870912,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0x98, 0xDC, 0x90, 0x15, 0x76]
    },
    {
      name: "TC58NVG1S3E",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 12, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0x98, 0xDA, 0x90, 0x15, 0x76]
    },
    {
      name: "F59L2G81A",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 12, tALS: 5, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 12,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xC8, 0xDA, 0x90, 0x95, 0x44]
    },
    {
      name: "MT29F2G08ABAEA",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 15, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 10, tRP: 10, tDS: 7,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 20, tRC: 20, tREA: 16,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xEF, enEccAddr: 0x90, enEccVal: 0x08, disEccVal: 0x00,
      id: [0x2C, 0xDA, 0x90, 0x95]
    },
    {
      name: "MT29F4G08ABAD",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 536870912,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 15, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 10, tRP: 10, tDS: 7,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 20, tRC: 20, tREA: 16,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xEF, enEccAddr: 0x90, enEccVal: 0x08, disEccVal: 0x00,
      id: [0x2C, 0xDC, 0x90, 0x95]
    },
    {
      name: "MX30LF2G18AC",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 15, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 10, tRP: 10, tDS: 7,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 20, tRC: 20, tREA: 16,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xC2, 0xDA, 0x90, 0x95, 0x06]
    },
    {
      name: "MX30UF1G18AC",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 134217728,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 10,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 22,
      rowCycles: 2, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xC2, 0xA1, 0x80, 0x15, 0x02]
    },
    {
      name: "S34ML01G1",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 134217728,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 10,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0x01, 0xF1, 0x00, 0x1D]
    },
    {
      name: "S34ML02G1",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 10,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0x01, 0xDA, 0x90, 0x95, 0x44]
    },
    {
      name: "S34ML04G1",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 536870912,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 10,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 25, tRC: 25, tREA: 20,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0x01, 0xDC, 0x90, 0x95, 0x54]
    },
    {
      name: "W29N02GZS1BA",
      pageSize: 2048,
      blockSize: 131072,
      totalSize: 268435456,
      spareSize: 64,
      badBlockMarkOffset: 0,
      tCS: 20, tCLS: 10, tALS: 10, tCLR: 10, tAR: 10, tWP: 12, tRP: 12, tDS: 10,
      tCH: 5, tCLH: 5, tALH: 5, tWC: 35, tRC: 35, tREA: 25,
      rowCycles: 3, colCycles: 2,
      read1: 0x00, read2: 0x30, readSpare: 0xFF, readId: 0x90, reset: 0xFF,
      write1: 0x80, write2: 0x10, erase1: 0x60, erase2: 0xD0, status: 0x70,
      setFeatures: 0xFF, enEccAddr: 0xFF, enEccVal: 0xFF, disEccVal: 0xFF,
      id: [0xEF, 0xAA, 0x90, 0x15, 0x04]
    }
  ];

  function calcFsmcTiming(chip) {
    let setup = Math.max(chip.tCS, chip.tCLS, chip.tALS, chip.tCLR, chip.tAR) - chip.tWP;
    setup = setup / HCLK_PERIOD_NS - 1.0;
    setup = setup <= 0.0 ? 1.0 : Math.ceil(setup);

    let wait = Math.max(chip.tWP, chip.tRP) / HCLK_PERIOD_NS - 1.0;
    wait = wait <= 0.0 ? 0.0 : Math.ceil(wait);

    let readWait = (chip.tREA + DATA_SETUP_TO_NOE_NS) / HCLK_PERIOD_NS - 1.0;
    readWait = readWait <= 0.0 ? 0.0 : Math.ceil(readWait);
    wait = Math.max(wait, readWait);

    let hiz = Math.max(chip.tCS, chip.tALS, chip.tCLS) + chip.tWP - chip.tDS;
    hiz = hiz / HCLK_PERIOD_NS - 1.0;
    hiz = hiz <= 0.0 ? 0.0 : Math.ceil(hiz);

    let hold = Math.max(chip.tCH, chip.tCLH, chip.tALH) / HCLK_PERIOD_NS - 1.0;
    hold = hold <= 0.0 ? 2.0 : Math.ceil(hold);

    while (((setup + 1.0) + (wait + 1.0) + (hold + 1.0)) * HCLK_PERIOD_NS < Math.max(chip.tWC, chip.tRC)) {
      setup += 1.0;
    }

    let ar = chip.tAR / HCLK_PERIOD_NS - 4.0 - setup;
    let clr = chip.tCLR / HCLK_PERIOD_NS - 4.0 - setup;

    const clampByte = (val) => {
      val = Math.ceil(val < 0.0 ? 0.0 : val);
      return Math.min(255, Math.max(0, val));
    };

    return new Uint8Array([
      clampByte(setup),
      clampByte(wait),
      clampByte(hold),
      clampByte(hiz),
      clampByte(clr),
      clampByte(ar),
      chip.rowCycles & 0xFF,
      chip.colCycles & 0xFF,
      chip.read1 & 0xFF,
      chip.read2 & 0xFF,
      chip.readSpare & 0xFF,
      chip.readId & 0xFF,
      chip.reset & 0xFF,
      chip.write1 & 0xFF,
      chip.write2 & 0xFF,
      chip.erase1 & 0xFF,
      chip.erase2 & 0xFF,
      chip.status & 0xFF,
      chip.setFeatures & 0xFF,
      chip.enEccAddr & 0xFF,
      chip.enEccVal & 0xFF,
      chip.disEccVal & 0xFF
    ]);
  }

  function findChipById(idBytes) {
    if (!idBytes || idBytes.length === 0) return null;
    for (const chip of PARALLEL_CHIPS) {
      if (chip.id && chip.id.length > 0) {
        let match = true;
        for (let i = 0; i < chip.id.length; i++) {
          if (i >= idBytes.length || chip.id[i] !== idBytes[i]) {
            match = false;
            break;
          }
        }
        if (match) return chip;
      }
    }
    return null;
  }

  function findChipByName(name) {
    return PARALLEL_CHIPS.find(c => c.name.toUpperCase() === name.toUpperCase()) || null;
  }

  function getAllChips() {
    return PARALLEL_CHIPS;
  }

  function getDefaultChip() {
    return PARALLEL_CHIPS[0];
  }

  return {
    PARALLEL_CHIPS,
    calcFsmcTiming,
    findChipById,
    findChipByName,
    getAllChips,
    getDefaultChip
  };
})();
