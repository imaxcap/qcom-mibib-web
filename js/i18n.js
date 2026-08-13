/**
 * Qualcomm MIBIB Web Studio - Internationalization (i18n) Module
 */

const i18nTranslations = {
  en: {
    appTitle: "Qualcomm MIBIB Web Studio",
    appSubtitle: "Visual Partition Studio for Qualcomm IPQ SOCs (IPQ6018 / IPQ807x / IPQ5018 / IPQ5332)",
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
    statusOk: "OK",
    statusUnaligned: "Unaligned Address",
    disclaimerTitle: "⚠️ Disclaimer:",
    disclaimerText: "This tool has not been fully tested across all physical hardware devices. Please test and verify carefully before flashing onto real devices. Use at your own risk."
  },
  'zh-CN': {
    appTitle: "高通 MIBIB 可视化 Web 工作站",
    appSubtitle: "适用于高通 IPQ 全系列 SOC (IPQ6018 / IPQ807x / IPQ5018 / IPQ5332) 的分区表编辑器",
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
