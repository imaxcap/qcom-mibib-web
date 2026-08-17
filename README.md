# Qualcomm MIBIB & Firmware Web Studio (`qcom-mibib-web`)

[![GitHub Pages Deployment](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?logo=github)](https://imaxcap.github.io/qcom-mibib-web/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Vanilla%20JS%2FCSS-orange)](#)

A modern, high-performance, zero-dependency visual partition studio, QPIC de-interleaver, and binary firmware editor for **Qualcomm IPQ SOCs (IPQ9574 / IPQ9554 / IPQ807x / IPQ6018 / IPQ5018 / IPQ5332 / IPQ4019 / IPQ806x)**.

🌐 **Online Live Studio**: [https://imaxcap.github.io/qcom-mibib-web/](https://imaxcap.github.io/qcom-mibib-web/)

> [!CAUTION]
> **Disclaimer / 免责声明**:
> This tool has not been fully tested across all physical hardware devices and flash memory configurations. Please test and verify your partition layouts and binaries carefully before flashing onto real hardware. Use at your own risk.
>
> 本软件/工具未经全量物理设备与闪存硬件测试，请使用者自行测试验证。刷机有风险，使用本工具生成/修改的分区产物产生的一切后果与风险需自行承担。

---

## 🌟 Key Features

### 🛠️ 1. Firmware & Programmer Studio (固件与编程器工坊)
* **Large Programmer Raw Dump Support (< 136MB)**:
  * Directly drag & drop full flash programmer raw dumps (`.raw`, `.dump`, `.bin`, `.img`) or clean flat binaries up to 136 MB.
* **QPIC Codec & Mathematical Auto-Detection Engine**:
  * Automatically detects Qualcomm QPIC interleaved layouts via Galois Field LFSR polynomial parity verification:
    * `2K Page + 64B OOB (BCH4)` (e.g. Xiaomi AX5, AX18, AX3600 128MB original NAND)
    * `2K Page + 128B OOB (BCH8)` (2K SLC 128B Spare NAND)
    * `4K Page + 128B OOB (BCH4)` (4K Page NAND upgrade flash)
    * `⚙️ Custom Flash Geometry` (User-configurable Page Size, OOB / Spare Size, and BCH4/BCH8 ECC modes).
  * Automatically de-interleaves QPIC codewords, strips hardware OOB/ECC and Bad Block Markers (BBM), and recovers pristine flat binary data in memory.
* **Live Partition Inspection & Truncated Header Probe**:
  * Automatically scans and maps all firmware partitions (`0:SBL1`, `0:MIBIB`, `0:QSEE`, `0:DEVCFG`, `0:RPM`, `0:CDT`, `0:APPSBLENV`, `0:APPSBL`, `0:ART`, `bdata`, `rootfs`, etc.).
  * **Four-State Data Integrity Probing**:
    * `Original`: Contains valid binary payload from the loaded firmware.
    * `NONE`: Partition is beyond the file boundary (for small bootloader/header dumps, e.g. 9MB dumps with 112MB partition tables).
    * `Empty`: Partition space is within the file but consists of erased blank state (`0xFF`).
    * `Modified`: Partition has been replaced with a new user image.
* **`0:` Boot Partition Shift Detection & Auto-Migration**:
  * When replacing `0:MIBIB`, the system automatically detects physical address shifts or capacity adjustments for critical boot partitions (`0:SBL1`, `0:QSEE`, `0:APPSBL`, etc.).
  * **Effective Payload Auto-Migration**: Calculates true binary payload size (excluding trailing `0xFF`/`0x00` padding) and automatically relocates valid bootloader code to the new physical offsets without bricking.
  * **One-Click Revert**: Cancel import and restore baseline firmware state with 1 click.
* **Partition Replacement & Single Partition Extraction**:
  * Extract/download individual partition binaries with 1 click.
  * Replace any partition by uploading a new image with strict overflow boundary checks (`upload.size <= partition.size_bytes`).
* **Auto-Convert MIBIB (2K ➔ 4K / Block Size Re-alignment)**:
  * Automatically recalculates `start_block` and `size_blocks` (halving block counts for 128KB ➔ 256KB block size upgrades) and regenerates dual MIBIB copies with chained CRC-32/MPEG2 checksums.
* **Selective Range & Dual-Mode Export**:
  * Forward-cascading checkboxes to select partition export ranges (automatically locks mandatory `0:` boot partitions).
  * **💾 Export Flat Firmware (.bin)**: Clean flat binary firmware without OOB.
  * **⚡ Export Qualcomm QPIC Raw Programmer Dump (.raw)**: Re-encodes selected partition range into specified NAND flash geometry with hardware BCH4/BCH8 parity and BBM alignment for direct offline flashing with T48, RT809H, or STM32 programmers.

---

### 📐 2. MIBIB Partition Studio (分区表设计器)
* **Visual Flash Map & Collision Detector**:
  * Real-time graphical visualization of physical offsets, gaps, and address overlaps.
  * Automatic sequential block auto-alignment and offset cascading.
* **Multi-Format Export & Import**:
  * Supports parsing official Qualcomm XML configuration (`nand-partition.xml`, `emmc-partition.xml`) and binary partition MBNs (`0x55EE73AA`).
  * Exports compliant partition MBN binaries and Qualcomm XML files.

---

## 💻 Technical Compatibility Matrix

| Platform / SOC | Architecture | Primary Bootloader | Flash Support | QPIC / MIBIB Support |
| :--- | :---: | :---: | :---: | :---: |
| **IPQ9574 / IPQ9554 / IPQ9570** | Wi-Fi 7 BE (Networking Pro 1620/1220/820/620) | XBL / CoreBoot | SPI-NAND, SPI-NOR, NOR+NAND, eMMC | ✅ **100% Supported** |
| **IPQ807x (IPQ8072/8074/8078)** | Wi-Fi 6 AX (Networking Pro 1200/800/600/400) | SBL1 / XBL | SPI-NAND, SPI-NOR, NOR+NAND, eMMC | ✅ **100% Supported** |
| **IPQ6018 / IPQ6000 / IPQ6010** | Wi-Fi 6 AX (AX5 / AX18 / AX3600) | SBL1 | SPI-NAND, SPI-NOR, NOR+NAND | ✅ **100% Supported** |
| **IPQ5018 / IPQ5000 / IPQ5332 / IPQ5322** | Wi-Fi 6 / Wi-Fi 7 BE | SBL1 / XBL | SPI-NAND, SPI-NOR, NOR+NAND | ✅ **100% Supported** |
| **IPQ4019 / IPQ4018 / IPQ806x** | Wi-Fi 5 AC | SBL1 | SPI-NOR, SPI-NAND | ✅ **100% Supported** |

---

## 🛠️ Binary MIBIB Specification

Qualcomm MIBIB binaries follow a strict 28-byte partition entry structure:

| Structural Header / Entry | Magic 1 | Magic 2 | Key Fields |
| :--- | :--- | :--- | :--- |
| **MIBIB Header (Page 0)** | `0xFE569FAC` | `0xCD7F127A` | `mibibVersion` (3), `mibibAge` (1) |
| **System Partition Table (Page 1)** | `0x55EE73AA` | `0xE35EBDDB` | `tableVersion` (3), `numParts` ($\le 128$) |
| **User Partition Table (Page 2)** | `0xAA7D1B9A` | `0x1F7D48BC` | `tableVersion` (4), `numParts` ($\le 128$) |
| **Chained CRC-32 Checksum (Page 3)** | MPEG-2 CRC | - | 4-byte CRC over Page 0..2 |
| **Partition Entry (28B)** | - | - | `Name[16]`, `start_block` (u32), `size_blocks` (u32), `attr1..3` (u8), `which_flash` (u8) |

---

## 🚀 Local Usage

Since `qcom-mibib-web` is a 100% pure client-side application without runtime dependencies or server backend, you can clone and run it locally in any modern browser:

```bash
git clone https://github.com/imaxcap/qcom-mibib-web.git
cd qcom-mibib-web
python3 -m http.server 8000
# Open http://localhost:8000 in your browser
```

---

## 📄 License

MIT License. Copyright (c) 2026 imaxcap.
