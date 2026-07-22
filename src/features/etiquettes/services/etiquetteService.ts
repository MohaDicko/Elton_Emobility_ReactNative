// â”€â”€â”€ Service Ã‰tiquettes â€” GÃ©nÃ©ration HTML + Impression A4 â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€
// Format unique : A4 Â· 3 colonnes Ã— 7 rangÃ©es = 21 Ã©tiquettes par feuille
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { LOGO_DATA_URL } from '../assets/logoBase64';

// â”€â”€â”€ Types â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

export interface ILabelData {
  itemCode: string;
  itemName: string;
  barcode: string | null;
  price: number;
  pcb: string | null;
  quantity: number;
}

// â”€â”€â”€ Helpers â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const formatPrice = (price: number): string =>
  Math.round(price)
    .toString()
    .replace(/\B(?=(\d{3})+(?!\d))/g, ' ') + ' F CFA';

// â”€â”€â”€ Encodage code-barres EAN-13 / EAN-8 (SVG inline) â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const L = ['0001101','0011001','0010011','0111101','0100011','0110001','0101111','0111011','0110111','0001011'];
const G = ['0100111','0110011','0011011','0100001','0011101','0111001','0000101','0010001','0001001','0010111'];
const R = ['1110010','1100110','1101100','1000010','1011100','1001110','1010000','1000100','1001000','1110100'];
const P13 = ['LLLLLL','LLGLGG','LLGGLG','LLGGGL','LGLLGG','LGGLLG','LGGGLL','LGLGLG','LGLGGL','LGGLGL'];

const encodeEAN13 = (code: string): string => {
  const first = parseInt(code[0], 10);
  let bits = '101';
  for (let i = 1; i <= 6; i++) {
    const d = parseInt(code[i], 10);
    bits += P13[first][i - 1] === 'L' ? L[d] : G[d];
  }
  bits += '01010';
  for (let i = 7; i <= 12; i++) bits += R[parseInt(code[i], 10)];
  bits += '101';
  return bits;
};

const encodeEAN8 = (code: string): string => {
  let bits = '101';
  for (let i = 0; i < 4; i++) bits += L[parseInt(code[i], 10)];
  bits += '01010';
  for (let i = 4; i < 8; i++) bits += R[parseInt(code[i], 10)];
  bits += '101';
  return bits;
};

const generateBarcodeSVG = (barcode: string): string => {
  let bits = '';
  if (/^\d{13}$/.test(barcode)) {
    bits = encodeEAN13(barcode);
  } else if (/^\d{8}$/.test(barcode)) {
    bits = encodeEAN8(barcode);
  } else {
    return '';
  }
  const W = 170;
  const H = 44;
  const moduleW = W / bits.length;
  const rects = bits
    .split('')
    .map((bit, i) =>
      bit === '1'
        ? `<rect x="${(i * moduleW).toFixed(2)}" y="0" width="${(moduleW + 0.3).toFixed(2)}" height="${H}" fill="#000"/>`
        : ''
    )
    .join('');
  return `<svg width="${W}" height="${H}" xmlns="http://www.w3.org/2000/svg" viewBox="0 0 ${W} ${H}">${rects}</svg>`;
};

// â”€â”€â”€ Rendu d'une Ã©tiquette â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const renderLabel = (
  label: ILabelData,
  printDate: string,
  logoDataUrl: string | null,
): string => {
  const priceStr = label.price > 0 ? formatPrice(label.price) : '';
  const barcodeSVG = label.barcode ? generateBarcodeSVG(label.barcode) : '';

  const logoImg = logoDataUrl
    ? `<img src="${logoDataUrl}" class="logo-img" alt=""/>`
    : '';

  const priceSection = priceStr
    ? `<div class="price-row">
         ${logoImg ? `<div class="logo-block">${logoImg}</div>` : ''}
         <div class="price">${priceStr}</div>
       </div>`
    : logoImg
      ? `<div class="price-row price-row-logo-only"><div class="logo-block">${logoImg}</div></div>`
      : '';

  const barcodeSection = barcodeSVG
    ? `<div class="barcode-row">
         ${barcodeSVG}
         <div class="bc-num">${label.barcode}</div>
       </div>`
    : label.barcode
      ? `<div class="bc-num-only">${label.barcode}</div>`
      : `<div class="no-bc">Pas de code-barres</div>`;

  return `
    <div class="label">
      <div class="name">${label.itemName.toUpperCase()}</div>
      ${priceSection}
      ${barcodeSection}
      <div class="footer">
        <span class="f-pcb">PCB: ${label.pcb ?? '0'}</span>
        <span class="f-code">${label.itemCode}</span>
        <span class="f-date">${printDate}</span>
      </div>
    </div>`;
};


// â”€â”€â”€ GÃ©nÃ©ration HTML A4 Â· 3 colonnes â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

const generateLabelHTML = (
  labels: ILabelData[],
  logoDataUrl: string | null = null,
): string => {
  const printDate = new Date().toLocaleDateString('fr-FR', {
    day: '2-digit', month: '2-digit', year: 'numeric',
  }).replace(/\//g, '-');

  // Expand chaque article selon sa quantitÃ© demandÃ©e
  const expanded = labels.flatMap((l) =>
    Array.from({ length: l.quantity }, () => l)
  );

  const labelsHTML = expanded.map((l) => renderLabel(l, printDate, logoDataUrl)).join('');

  return `<!DOCTYPE html>
<html>
<head>
  <meta charset="utf-8"/>
  <style>
    * { margin: 0; padding: 0; box-sizing: border-box; }
    body { font-family: Arial, Helvetica, sans-serif; background: #fff; }

    @page { size: A4; margin: 10mm 8mm 8mm; }

    /* Grille A4 : 3 colonnes Ã— 7 rangÃ©es = 21 Ã©tiquettes par feuille */
    /* Hauteur utile : 297mm âˆ’ 10mm (haut) âˆ’ 8mm (bas) = 279mm Ã· 7 â‰ˆ 39.8mm */
    .page {
      display: grid;
      grid-template-columns: repeat(3, 1fr);
      grid-auto-rows: 39.8mm;
      gap: 0;
      border-top: 0.15mm solid #444;
      border-left: 0.15mm solid #444;
    }

    /* Cellule Ã©tiquette */
    .label {
      border-right: 0.15mm solid #444;
      border-bottom: 0.15mm solid #444;
      padding: 1.4mm 2mm 1mm;
      display: flex;
      flex-direction: column;
      gap: 0.8mm;
      height: 39.8mm;
      break-inside: avoid;
      page-break-inside: avoid;
      overflow: hidden;
    }

    /* 1. Nom produit : bold uppercase, max 2 lignes */
    .name {
      font-size: 9.2pt;
      font-weight: 800;
      color: #111;
      line-height: 1.15;
      text-transform: uppercase;
      text-align: center;
      word-break: break-word;
      overflow: hidden;
      display: -webkit-box;
      -webkit-line-clamp: 2;
      -webkit-box-orient: vertical;
    }

    /* 2. Prix + logo */
    .price-row {
      display: flex;
      flex-direction: row;
      align-items: center;
      justify-content: center;
      gap: 4mm;
      min-height: 8mm;
    }

    .price-row-logo-only {
      justify-content: flex-start;
    }

    .price {
      font-size: 16pt;
      font-weight: 900;
      color: #111;
      text-align: center;
      line-height: 1.05;
    }

    .logo-block {
      display: flex;
      align-items: center;
      justify-content: center;
      flex-shrink: 0;
      width: 10mm;
      height: 8mm;
      overflow: hidden;
    }

    .logo-img {
      width: 10mm;
      height: 6mm;
      object-fit: contain;
    }

    /* 3. Code-barres sous le prix */
    .barcode-row {
      display: flex;
      flex-direction: column;
      align-items: center;
      gap: 0.5mm;
      min-height: 16mm;
      margin-top: 1.5mm;
    }

    .barcode-row svg {
      width: 100%;
      max-width: 45mm;
      height: 12mm;
    }
    /* 4. Numero sous le code-barres */
    .bc-num {
      font-family: 'Courier New', monospace;
      font-size: 5.4pt;
      color: #333;
      letter-spacing: 0.25pt;
      text-align: center;
    }

    .bc-num-only {
      font-family: 'Courier New', monospace;
      font-size: 9pt;
      font-weight: bold;
      color: #111;
      text-align: center;
      padding: 2mm 0;
    }

    .no-bc {
      font-size: 6pt;
      color: #bbb;
      font-style: italic;
      text-align: center;
      padding: 2mm 0;
    }

    /* 5. Footer : PCB | code article | date */
    .footer {
      display: flex;
      justify-content: space-between;
      align-items: center;
      font-size: 5pt;
      color: #555;
      padding-top: 0.2mm;
      margin-top: auto;
    }

    .f-pcb   { font-weight: 700; color: #111; }
    .f-code  { color: #333; text-align: center; }
    .f-date  { color: #888; }
  </style>
</head>
<body>
  <div class="page">
    ${labelsHTML}
  </div>
</body>
</html>`;
};

// â”€â”€â”€ API publique â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€â”€

// Dimensions A4 en pixels Ã  72 dpi pour expo-print
const A4_WIDTH_PX  = Math.round(210 * 72 / 25.4);  // 595
const A4_HEIGHT_PX = Math.round(297 * 72 / 25.4);  // 842

const printLabels = async (labels: ILabelData[]): Promise<void> => {
  const html = generateLabelHTML(labels, LOGO_DATA_URL);
  await Print.printAsync({ html, width: A4_WIDTH_PX, height: A4_HEIGHT_PX });
};

const shareLabelsAsPDF = async (labels: ILabelData[]): Promise<void> => {
  const html = generateLabelHTML(labels, LOGO_DATA_URL);
  const { uri } = await Print.printToFileAsync({
    html,
    width: A4_WIDTH_PX,
    height: A4_HEIGHT_PX,
    textZoom: 100,
  });
  await Sharing.shareAsync(uri, {
    mimeType: 'application/pdf',
    dialogTitle: 'Partager les Ã©tiquettes',
  });
};

export const etiquetteService = {
  generateLabelHTML,
  printLabels,
  shareLabelsAsPDF,
};








