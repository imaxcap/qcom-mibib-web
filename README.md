# Qualcomm MIBIB Web Studio (`qcom-mibib-web`)

[![GitHub Pages Deployment](https://img.shields.io/badge/Live-GitHub%20Pages-brightgreen?logo=github)](https://imaxcap.github.io/qcom-mibib-web/)
[![License: MIT](https://img.shields.io/badge/License-MIT-blue.svg)](LICENSE)
[![Zero Dependencies](https://img.shields.io/badge/Dependencies-Vanilla%20JS%2FCSS-orange)](#)

A modern, high-performance, zero-dependency visual partition studio and binary editor for Qualcomm IPQ SOCs (IPQ6018 / IPQ807x / IPQ5018 / IPQ5332 / IPQ6000 / IPQ806x).

🌐 **Online Live Studio**: [https://imaxcap.github.io/qcom-mibib-web/](https://imaxcap.github.io/qcom-mibib-web/)

> [!CAUTION]
> **Disclaimer / 免责声明**:
> This tool has not been fully tested across all physical hardware devices and flash memory configurations. Please test and verify your partition layouts/binaries carefully before flashing onto real hardware. Use at your own risk.
>
> 本软件/工具未经全量物理设备与闪存硬件测试，请使用者自行测试验证。刷机有风险，使用本工具生成/修改的分区产物产生的一切后果与风险需自行承担。

---

## 🌟 Key Features

* **Zero Backend & Pure Client-Side**: 100% browser-based Vanilla JavaScript (`DataView`, `TextDecoder`). Operates fully offline without server roundtrips, sensitive data transmission, or external npm dependencies.
* **Full-Flash Deep Scanning Engine (< 16MB)**:
  * Accepts raw full-flash binary dumps or standalone `partition.mbn` / `mibib.bin` binaries under 16 MB.
  * Automatically scans for Qualcomm `0xFE569FAC` MIBIB Headers and `0x55EE73AA` System Partition Tables with 64KB sector-alignment validation.
* **Multi-Flash Architecture Support (NOR / NAND / NORPLUSNAND)**:
  * Seamlessly parses and generates single NOR (64KB block), single QSPI-NAND (128KB/256KB block), and dual-flash **NORPLUSNAND** layouts.
  * Auto-detects dedicated XML root tags (`<nandboot>`, `<norboot>`) and `which_flash` partition attributes.
  * **Dual Flash Visual Distribution Map**: Renders Flash 0 (Primary NOR) and Flash 1 (Secondary NAND) in independent visual sector distribution bars.
* **2K Page (128KB Block) vs 4K Page (256KB Block) Auto-Perception**:
  * Automatically measures physical MIBIB header copy distance ($\Delta \text{Offset}$) in binary dumps to auto-select 2K/4K page configurations.
  * Page Size (2K vs 4K) is fully decoupled from SOC presets.
  * Toggling 2K/4K preserves physical 16-hex start/end addresses and KB/MB sizes, recomputing physical `startBlock` and `sizeBlocks`.
* **Bi-directional Live Calculation & Collision Guard**:
  * Real-time bi-directional conversion between Hex Start Addr $\leftrightarrow$ Size (MB/KB) $\leftrightarrow$ Physical Eraseblocks.
  * Real-time physical space overlap collision detection with visual error badges.
  * Auto-alignment & offset cascade mode (disabled by default to preserve custom partition offsets).
* **Export Customization**:
  * Export binary `partition.mbn` (System Partition Table with `0x55EE73AA` headers) or standard Qualcomm `nand-partition.xml`.
  * Modal dialog for custom export file naming (`.mbn`, `.bin`, `.xml`).
* **Modern UI & i18n**:
  * Browser language auto-detection (Simplified Chinese `zh-CN` / English `en`).
  * Browser color scheme auto-adaptation (Light / Dark mode `@media (prefers-color-scheme)`).
  * Clean default browser typography with custom 4.0% visual width protection for tiny partitions and dashed compressed rendering for large partitions (`rootfs`).

---

## 🛠️ Binary MIBIB Specification

Qualcomm MIBIB binaries follow a strict 28-byte partition entry structure:

| Structural Header / Entry | Magic 1 | Magic 2 | Key Fields |
| :--- | :--- | :--- | :--- |
| **MIBIB Header** | `0xFE569FAC` | `0xCD7F127A` | `mibibVersion` (3), `mibibAge` (1) |
| **System Partition Table** | `0x55EE73AA` | `0xE35EBDDB` | `tableVersion` (3), `numParts` ($\le 128$) |
| **Partition Entry (28B)** | - | - | `Name[16]`, `start_block` (u32), `size_blocks` (u32), `attr1..3` (u8), `which_flash` (u8) |

---

## 🚀 Local Usage

Since `qcom-mibib-web` is a static zero-dependency web application, you can simply clone and open `index.html` in any modern web browser:

```bash
git clone https://github.com/imaxcap/qcom-mibib-web.git
cd qcom-mibib-web
# Open index.html in browser, or serve using python:
python3 -m http.server 8000
```

---

## 📄 License

This project is licensed under the [MIT License](LICENSE).
