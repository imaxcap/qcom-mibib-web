/**
 * Qualcomm MIBIB Web Studio - Internationalization (i18n) Module
 */

const i18nTranslations = {
  en: {
    appTitle: "Qualcomm MIBIB & Firmware Studio",
    appSubtitle: "Visual Partition & Firmware Studio for Qualcomm IPQ SOCs (IPQ9574 / IPQ807x / IPQ6018 / IPQ5018 / IPQ5332 / IPQ4019)",
    tabFirmwareStudio: "🛠️ Firmware & Programmer Studio",
    tabMibibStudio: "📐 MIBIB Partition Studio",
    
    // Firmware Studio
    fwDropzoneTitle: "Click or Drag & Drop <strong>Programmer Raw Dump / Flat Firmware (Max 136MB)</strong> here",
    fwDropzoneHint: "Supports auto-detecting Qualcomm QPIC 2K/4K BCH4/BCH8 layouts, automatic OOB stripping, partition inspection, single partition replace & dual-mode export",
    fwVisualHeader: "Physical Firmware Flash Layout",
    fwVisualSub: "Visual memory map of partitions inside the active firmware image",
    btnReloadMibib: "🔄 Reload MIBIB Table",
    btnConvertMibib: "⚙️ Auto-Convert MIBIB (2K ➔ 4K / Block Size)",
    btnExportFlatFw: "💾 Export Flat Firmware (.bin)",
    btnExportQpicFw: "⚡ Export Qualcomm QPIC Raw Dump (.raw)",
    thFwSelect: "Export",
    thFwPartNum: "#",
    thFwPartName: "Partition Name",
    thFwStartBlock: "Start Block",
    thFwBlocks: "Blocks",
    thFwHexStart: "Hex Start",
    thFwHexEnd: "Hex End",
    thFwSize: "Size",
    thFwStatus: "Status",
    thFwActions: "Actions",
    fwExportScope: "Selected Export Scope: [{geomTag}] {count}/{total} Partitions (0x0 ➔ 0x{endOffset}, {sizeMb} MB / {sizeBlocks} Blocks)",
    fwMandatoryBoot: "Mandatory Boot Partition (0: prefixed)",
    labelCustomOob: "Custom OOB / Spare Size (Bytes)",
    labelCustomPage: "Page Size (Bytes)",
    labelCustomEcc: "ECC Algorithm Mode",
    optEccAuto: "Auto-Detect (Recommended)",
    optCustomGeom: "⚙️ Custom Flash Geometry (User-defined OOB / Page)...",
    tag2kLayout: "2K Structure (128KB Block)",
    tag4kLayout: "4K Structure (256KB Block)",
    tagCustomLayout: "{blockSize}KB Block Structure",

    statusNone: "NONE",
    statusEmpty: "Empty",
    statusOriginal: "Original",
    statusModified: "Modified",
    tooltipNone: "Beyond firmware dump boundary (File size: {fileSize} MB)",
    tooltipEmpty: "Partition data is completely blank (0xFF)",
    tooltipOriginal: "Contains valid original firmware data",
    tooltipModified: "Replaced with: {file} ({size} KB)",

    // Migration Modal
    modalMigrationTitle: "⚠️ 0: Boot Partitions Shift Detected",
    modalMigrationDesc: "The newly loaded MIBIB partition table changed the physical address or size of critical 0: boot partitions. To prevent boot failure caused by unaligned data, you can attempt to automatically migrate the effective binary payload to the new offsets, or cancel the import.",
    btnAutoMigrate: "🚀 Auto-Migrate 0: Partitions",
    btnCancelImport: "❌ Cancel Import",
    toastMigrationSuccess: "🎉 All 0: boot partitions effective payload successfully migrated to new physical offsets!",
    toastMigrationCancelled: "Cancelled MIBIB import. Restored original firmware baseline.",
    errMigrationOverflow: "Auto-migration failed: Partition [{name}] payload ({effSize} KB) exceeds new capacity ({newSize} KB)!",

    // MIBIB Studio
    hardwareHeader: "Hardware & Flash Geometry Profile",
    hardwareSub: "Set independent hardware sector parameters for live calculation",
    labelPageSize: "Flash Page & Block Size (Independent)",
    option4k: "4K Page (256 KiB Block Size)",
    option2k: "2K Page (128 KiB Block Size)",
    labelFlashType: "Flash Device Type",
    optionNand: "QSPI NAND Flash (Single Flash)",
    optionNor: "SPI NOR Flash (Single Flash)",
    optionDual: "NOR + NAND Dual Flash (NORPLUSNAND)",
    labelPreset: "Preset Layouts",
    optionCustom: "Custom Layout",
    optionPresetIpq807x: "IPQ807x NAND (nand-partition.xml)",
    dropzoneText: "Click or Drag & Drop <strong>partition.mbn / mibib.bin / full dump (&lt; 16MB)</strong> or <strong>nand-partition.xml</strong> here",
    dropzoneHint: "Supports parsing System Partition MBN binaries (0x55EE73AA), full NOR/NAND flash dumps under 16MB, and official Qualcomm XML configs",
    visualHeader: "Visual Flash Sector Distribution",
    visualSub: "Live map of physical offsets, gaps, and collisions",
    btnAddPart: "+ Add Partition",
    btnAutoAlign: "⚙️ Auto-Align & Cascade Offsets",
    btnExportMbn: "💾 Export Binary (.mbn / .bin)",
    btnExportXml: "📄 Export Config (.xml)",
    thNum: "#",
    thName: "Partition Name",
    thHexStart: "Hex Start",
    thHexEnd: "Hex End",
    thSizeMb: "Size (MB)",
    thSizeKb: "Size (KB)",
    thBlocks: "Blocks",
    thFlashRegion: "Flash Region",
    thStatus: "Status & Collision Check",
    thActions: "Actions",
    optPrimary: "0 (Primary Flash)",
    optSecondary: "1 (Secondary Flash)",
    filenameModalTitle: "Customize Export Filename",
    promptFilename: "Enter filename for export:",
    btnConfirm: "Confirm & Download",
    btnCancel: "Cancel",
    toastImportSuccess: "Imported {count} partitions from {file}",
    toastAutoDetected: "Auto-detected MIBIB partition table at offset 0x{offset} in flash dump ({count} partitions)",
    toastExportMbnSuccess: "Exported binary: {filename}",
    toastExportXmlSuccess: "Exported XML: {filename}",
    toastAddSuccess: "Added new partition",
    toastAlignedSuccess: "Auto-aligned all partitions sequentially",
    toastFwLoaded: "Firmware loaded successfully!",
    toastMibibReloaded: "MIBIB Partition Table reloaded!",
    msgLoadingFw: "Reading and analyzing firmware...",
    msgDeinterleaving: "De-interleaving QPIC Codewords...",
    statusOk: "OK",
    statusUnaligned: "Unaligned Address",
    disclaimerTitle: "⚠️ Disclaimer:",
    disclaimerText: "This tool has not been fully tested across all physical hardware devices. Please test and verify carefully before flashing onto real devices. Use at your own risk."
  },
  'zh-CN': {
    appTitle: "高通 MIBIB 与固件可视化 Web 工作站",
    appSubtitle: "适用于高通 IPQ 全系列 (IPQ9574 / IPQ807x / IPQ6018 / IPQ5018 / IPQ5332 / IPQ4019) 的分区表与编程器固件工坊",
    tabFirmwareStudio: "🛠️ 固件与编程器工坊 (Firmware Studio)",
    tabMibibStudio: "📐 MIBIB 分区表设计器 (Partition Studio)",
    
    // Firmware Studio
    fwDropzoneTitle: "点击或拖拽 <strong>编程器 Raw 镜像 / 普通平坦固件 (最大限制 136MB)</strong> 到此处",
    fwDropzoneHint: "支持自动识别高通 QPIC 2K/4K BCH4/BCH8 布局、自动解交织剥离 OOB、实时解析分区表、单分区安全替换与双模导出",
    fwVisualHeader: "固件物理闪存分布图",
    fwVisualSub: "当前载入固件内部各分区的物理内存映射与空间占用全景",
    btnReloadMibib: "🔄 重新加载分区表 (Reload MIBIB)",
    btnConvertMibib: "⚙️ 自动转换 MIBIB 适配 (2K ➔ 4K 块大小)",
    btnExportFlatFw: "💾 导出普通固件 (Flat Binary)",
    btnExportQpicFw: "⚡ 导出高通专用编程器固件 (QPIC Raw Dump)",
    thFwSelect: "导出勾选",
    thFwPartNum: "序号",
    thFwPartName: "分区名称",
    thFwStartBlock: "起始 Block",
    thFwBlocks: "物理 Blocks",
    thFwHexStart: "16 进制起始",
    thFwHexEnd: "16 进制结束",
    thFwSize: "容量",
    thFwStatus: "状态",
    thFwActions: "操作",
    fwExportScope: "当前导出范围: [{geomTag}] 已勾选 {count}/{total} 个分区 (0x0 ➔ 0x{endOffset}, {sizeMb} MB / {sizeBlocks} 物理块)",
    fwMandatoryBoot: "系统引导必选分区 (以 0: 开头)",
    labelCustomOob: "自定义 OOB (Spare) 大小 (字节)",
    labelCustomPage: "Page 页面大小 (字节)",
    labelCustomEcc: "ECC 校验算法",
    optEccAuto: "自动识别 (推荐，按 OOB 空间推导)",
    optCustomGeom: "⚙️ 自定义闪存规格 (手动指定 OOB / Page 大小)...",
    tag2kLayout: "2K 结构 (128KB 块)",
    tag4kLayout: "4K 结构 (256KB 块)",
    tagCustomLayout: "{blockSize}KB 块结构",

    statusNone: "NONE",
    statusEmpty: "空白",
    statusOriginal: "原厂",
    statusModified: "已替换",
    tooltipNone: "超出固件文件范围 (文件仅至 {fileSize} MB)",
    tooltipEmpty: "分区内容全为 0xFF (空白未写入状态)",
    tooltipOriginal: "包含有效原厂数据",
    tooltipModified: "已替换为新文件: {file} ({size} KB)",

    // Migration Modal
    modalMigrationTitle: "⚠️ 检测到 0: 引导分区物理地址/大小变动",
    modalMigrationDesc: "检测到新加载的 MIBIB 中有 0: 关键引导分区的起始地址或容量发生变动。为防止因物理数据未搬移导致系统无法启动变砖，您可以选择自动迁移物理有效数据，或取消导入。",
    btnAutoMigrate: "🚀 尝试自动迁移 (Auto-Migrate)",
    btnCancelImport: "❌ 取消导入 (Cancel)",
    toastMigrationSuccess: "🎉 所有 0: 引导分区的有效数据已成功自动迁移至新物理地址！",
    toastMigrationCancelled: "已取消新 MIBIB 导入，已恢复原始固件状态。",
    errMigrationOverflow: "自动迁移失败：分区 [{name}] 的有效数据大小 ({effSize} KB) 超出了新分区规划容量 ({newSize} KB)！",

    // MIBIB Studio
    hardwareHeader: "闪存物理硬件规格配置",
    hardwareSub: "独立设置物理扇区参数，与具体 SOC 完全解绑",
    labelPageSize: "闪存 Page & 擦除块 Block 大小 (独立选项)",
    option4k: "4K Page (256 KiB Block 大小)",
    option2k: "2K Page (128 KiB Block 大小)",
    labelFlashType: "闪存硬件存储类型",
    optionNand: "QSPI NAND 闪存 (单 Flash 模式)",
    optionNor: "SPI NOR 闪存 (单 Flash 模式)",
    optionDual: "NOR + NAND 双闪存混合 (NORPLUSNAND)",
    labelPreset: "预设分区模板",
    optionCustom: "自定义布局",
    optionPresetIpq807x: "IPQ807x 原厂 NAND 模板 (nand-partition.xml)",
    optionPresetAx5: "红米 AX5 (IPQ6000/IPQ6018 NAND 布局)",
    optionPresetAx18: "移动 AX18 (IPQ6000 NAND 布局)",
    dropzoneText: "点击或拖拽 <strong>partition.mbn / mibib.bin / 全 Flash 备份镜像 (&lt; 16MB)</strong> 或 <strong>nand-partition.xml</strong> 到此处",
    dropzoneHint: "支持解析系统物理分区表 MBN 二进制 (0x55EE73AA)、16MB 以内全 Flash 镜像自动扫描定位，及高通官方 XML 配置文件",
    visualHeader: "闪存物理扇区分布图",
    visualSub: "物理偏移、缝隙 Gap 与物理空间重叠冲突的实时可视化全景图",
    btnAddPart: "+ 新增分区",
    btnAutoAlign: "⚙️ 物理对齐与自动级联推移",
    btnExportMbn: "💾 导出二进制镜像 (.mbn / .bin)",
    btnExportXml: "📄 导出配置文件 (.xml)",
    thNum: "序号",
    thName: "分区名称",
    thHexStart: "16 进制起始",
    thHexEnd: "16 进制结束",
    thSizeMb: "容量 (MB)",
    thSizeKb: "容量 (KB)",
    thBlocks: "物理 Blocks 数",
    thFlashRegion: "Flash 分区归属",
    thStatus: "状态与防碰撞校验",
    thActions: "操作",
    optPrimary: "0 (第一 Flash)",
    optSecondary: "1 (第二 Flash)",
    filenameModalTitle: "自定义导出文件名",
    promptFilename: "请输入要导出的文件名：",
    btnConfirm: "确认并下载",
    btnCancel: "取消",
    toastImportSuccess: "成功从 {file} 导入 {count} 个分区",
    toastAutoDetected: "已成功在全闪存镜像中自动扫描探测到 MIBIB 分区 (物理偏移 0x{offset})，共提取 {count} 个分区！",
    toastExportMbnSuccess: "已成功导出二进制文件：{filename}",
    toastExportXmlSuccess: "已成功导出 XML 配置文件：{filename}",
    toastAddSuccess: "已成功添加新分区",
    toastAlignedSuccess: "已完成所有分区的顺序物理块自动对齐与级联推移",
    toastFwLoaded: "固件解析成功！",
    toastMibibReloaded: "已成功重新加载 MIBIB 分区表！",
    msgLoadingFw: "正在读取与分析固件...",
    msgDeinterleaving: "正在执行高通 QPIC 解交织与剥离 OOB...",
    statusOk: "正常",
    statusUnaligned: "未 Block 对齐",
    disclaimerTitle: "⚠️ 免责声明 (Disclaimer):",
    disclaimerText: "本软件/工具未经全量物理设备与闪存硬件测试，请使用者自行测试验证。刷机有风险，使用本工具生成/修改的分区产物产生的一切后果与风险需自行承担。"
  }
};

let currentLang = 'en';

function detectUserLanguage() {
  const userLang = navigator.language || navigator.userLanguage || 'en';
  if (userLang.toLowerCase().startsWith('zh')) {
    return 'zh-CN';
  }
  return 'en';
}

function setLanguage(lang) {
  if (!i18nTranslations[lang]) lang = 'en';
  currentLang = lang;
  document.documentElement.lang = lang;

  const elements = document.querySelectorAll('[data-i18n]');
  elements.forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (i18nTranslations[lang][key]) {
      if (el.tagName === 'INPUT' && el.type === 'placeholder') {
        el.placeholder = i18nTranslations[lang][key];
      } else {
        el.innerHTML = i18nTranslations[lang][key];
      }
    }
  });

  const langSelect = document.getElementById('select-language');
  if (langSelect) langSelect.value = lang;
}

function t(key, params = {}) {
  let str = (i18nTranslations[currentLang] && i18nTranslations[currentLang][key]) || i18nTranslations['en'][key] || key;
  Object.keys(params).forEach(p => {
    str = str.replace(`{${p}}`, params[p]);
  });
  return str;
}

const i18n = { t, setLanguage, currentLang };
