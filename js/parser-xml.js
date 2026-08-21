/**
 * Qualcomm Flash Partition XML Parser with Root Tag Flash Type Detection
 */
function parseMibibXml(xmlText) {
  const parser = new DOMParser();
  const xmlDoc = parser.parseFromString(xmlText, "text/xml");

  const parseError = xmlDoc.querySelector("parsererror");
  if (parseError) {
    throw new Error("XML Parsing Failed: " + parseError.textContent);
  }

  // 1. Check Root Tag for Dedicated Flash Type Indicators
  const rootTag = xmlDoc.documentElement ? xmlDoc.documentElement.tagName.toLowerCase() : "";
  let detectedFlashType = null;

  if (rootTag === "nandboot") {
    detectedFlashType = "nand";
  } else if (rootTag === "norboot") {
    detectedFlashType = "nor";
  } else if (rootTag === "norplusnandboot") {
    detectedFlashType = "norplusnand";
  }

  const entries = [];
  const partitionNodes = xmlDoc.querySelectorAll("partition");

  partitionNodes.forEach((node, index) => {
    const nameNode = node.querySelector("name");
    const name = nameNode ? nameNode.textContent.trim() : `PART_${index}`;

    const sizeKbNode = node.querySelector("size_in_kb") || node.querySelector("size_kb");
    const sizeKb = sizeKbNode ? parseInt(sizeKbNode.textContent, 10) || 0 : 0;

    const padKbNode = node.querySelector("pad_in_kb") || node.querySelector("pad_kb");
    const padKb = padKbNode ? parseInt(padKbNode.textContent, 10) || 0 : 0;

    const whichFlashNode = node.querySelector("which_flash");
    const whichFlash = whichFlashNode ? parseInt(whichFlashNode.textContent, 10) || 0 : 0;

    const attrNodes = node.querySelectorAll("attr");
    let attr1 = 0xFF, attr2 = 0xFF, attr3 = 0x00, attr4 = 0xFF;

    if (attrNodes.length >= 4) {
      attr1 = parseHexOrDec(attrNodes[0].textContent);
      attr2 = parseHexOrDec(attrNodes[1].textContent);
      attr3 = parseHexOrDec(attrNodes[2].textContent);
      attr4 = parseHexOrDec(attrNodes[3].textContent);
    } else {
      const attr1Node = node.querySelector("attr1");
      if (attr1Node) attr1 = parseHexOrDec(attr1Node.textContent);

      const attr2Node = node.querySelector("attr2");
      if (attr2Node) attr2 = parseHexOrDec(attr2Node.textContent);

      const attr3Node = node.querySelector("attr3");
      if (attr3Node) attr3 = parseHexOrDec(attr3Node.textContent);

      const attr4Node = node.querySelector("attr4");
      if (attr4Node) attr4 = parseHexOrDec(attr4Node.textContent);
    }

    entries.push({
      id: 'part_' + Math.random().toString(36).substring(2, 9),
      name: name,
      sizeKb: sizeKb,
      padKb: padKb,
      whichFlash: whichFlash,
      attr1: attr1,
      attr2: attr2,
      attr3: attr3,
      attr4: attr4
    });
  });

  // If root tag didn't specify, check if any entry has whichFlash === 1
  if (!detectedFlashType) {
    const hasSecondary = entries.some(e => e.whichFlash === 1);
    if (hasSecondary) {
      detectedFlashType = "norplusnand";
    }
  }

  return {
    tableType: 'xml',
    rootTag: rootTag,
    detectedFlashType: detectedFlashType,
    entries: entries
  };
}

function parseHexOrDec(str) {
  if (!str) return 0xFF;
  str = str.trim();
  if (str.startsWith("0x") || str.startsWith("0X")) {
    return parseInt(str, 16);
  }
  return parseInt(str, 10);
}
