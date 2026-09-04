/**
 * Construction Contract & Handover Protocol (Protokół Odbioru Robót) Generator.
 * Generates legally sound, printable and exportable construction contracts and
 * completion acceptance protocols tailored for self-employed contractors in Szczecin.
 */

export interface ContractParty {
  name: string;
  idNumber?: string; // PESEL or NIP
  phone: string;
  city?: string;
}

export interface ContractScopeItem {
  description: string;
  quantity: number;
  unit: string;
  unitPricePLN: number;
}

export interface ConstructionContractData {
  contractNumber: string;
  date: string;
  city: string;
  contractor: ContractParty;
  client: ContractParty;
  siteAddress: string;
  startDate: string;
  completionDate: string;
  items: ContractScopeItem[];
  advancePaymentPLN?: number;
  warrantyMonths: number;
}

export interface HandoverProtocolData {
  protocolNumber: string;
  contractNumber: string;
  date: string;
  siteAddress: string;
  contractor: ContractParty;
  client: ContractParty;
  workStatus: 'approved_without_remarks' | 'approved_with_minor_remarks' | 'rejected';
  remarks?: string;
  finalSettlementAmountPLN: number;
}

/**
 * Calculates financial summary for a construction contract.
 */
export function calculateContractTotal(items: ContractScopeItem[]): {
  netTotal: number;
  grossTotal: number;
  itemsCount: number;
} {
  const netTotal = items.reduce((acc, item) => acc + (item.quantity * item.unitPricePLN), 0);
  return {
    netTotal,
    grossTotal: netTotal,
    itemsCount: items.length,
  };
}

/**
 * Generates a clean HTML/Printable draft of the Construction Agreement (Umowa o roboty budowlano-remontowe).
 */
export function generateContractHtml(data: ConstructionContractData): string {
  const total = calculateContractTotal(data.items);
  const itemsRows = data.items.map((item, idx) => `
    <tr>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: center;">${idx + 1}</td>
      <td style="padding: 6px; border: 1px solid #ccc;">${item.description}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">${item.quantity} ${item.unit}</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: right;">${item.unitPricePLN.toFixed(2)} zł</td>
      <td style="padding: 6px; border: 1px solid #ccc; text-align: right; font-weight: bold;">${(item.quantity * item.unitPricePLN).toFixed(2)} zł</td>
    </tr>
  `).join('');

  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Umowa o Roboty Remontowo-Budowlane - ${data.contractNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; padding: 20px; line-height: 1.5; }
    h1 { font-size: 16px; text-align: center; margin-bottom: 4px; text-transform: uppercase; }
    .header { display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; }
    .parties { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
    .party-box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 6px; }
    table { width: 100%; border-collapse: collapse; margin: 12px 0; }
    th { background: #f4f4f5; padding: 6px; border: 1px solid #ccc; text-align: left; }
    .signatures { display: flex; justify-content: space-between; margin-top: 40px; padding-top: 20px; }
    .sig-box { width: 45%; text-align: center; border-top: 1px dashed #666; padding-top: 6px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>Miejscowość:</strong> ${data.city}</div>
    <div><strong>Data:</strong> ${data.date}</div>
    <div><strong>Numer:</strong> ${data.contractNumber}</div>
  </div>

  <h1>Umowa o Roboty Wykończeniowo-Budowlane</h1>

  <div class="parties">
    <div class="party-box">
      <strong>Wykonawca:</strong><br>
      ${data.contractor.name}<br>
      ${data.contractor.idNumber ? `NIP/PESEL: ${data.contractor.idNumber}<br>` : ''}
      Tel: ${data.contractor.phone}
    </div>
    <div class="party-box">
      <strong>Zamawiający (Inwestor):</strong><br>
      ${data.client.name}<br>
      ${data.client.idNumber ? `NIP/PESEL: ${data.client.idNumber}<br>` : ''}
      Tel: ${data.client.phone}
    </div>
  </div>

  <p><strong>Miejsce robót:</strong> ${data.siteAddress}</p>
  <p><strong>Termin realizacji:</strong> od ${data.startDate} do ${data.completionDate}</p>

  <h3>Zakres prac i wynagrodzenie:</h3>
  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">Lp.</th>
        <th>Opis robót</th>
        <th style="text-align: right;">Ilość</th>
        <th style="text-align: right;">Cena jedn.</th>
        <th style="text-align: right;">Razem</th>
      </tr>
    </thead>
    <tbody>
      ${itemsRows}
      <tr>
        <td colspan="4" style="padding: 8px; text-align: right; font-weight: bold; border: 1px solid #ccc;">ŁĄCZNA KWOTA WYNAGRODZENIA:</td>
        <td style="padding: 8px; text-align: right; font-weight: 900; font-size: 14px; border: 1px solid #ccc;">${total.netTotal.toFixed(2)} zł</td>
      </tr>
    </tbody>
  </table>

  ${data.advancePaymentPLN ? `<p><strong>Wpłacona zaliczka:</strong> ${data.advancePaymentPLN.toFixed(2)} zł</p>` : ''}
  <p><strong>Gwarancja wykonawcy:</strong> ${data.warrantyMonths} miesięcy od daty protokołu odbioru.</p>

  <div class="signatures">
    <div class="sig-box">Podpis Wykonawcy</div>
    <div class="sig-box">Podpis Zamawiającego</div>
  </div>
</body>
</html>
  `.trim();
}

/**
 * Generates completion handover protocol (Protokół Odbioru Robót) HTML.
 */
export function generateHandoverProtocolHtml(data: HandoverProtocolData): string {
  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Protokół Odbioru Robót - ${data.protocolNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; padding: 20px; line-height: 1.5; }
    h1 { font-size: 16px; text-align: center; margin-bottom: 12px; text-transform: uppercase; }
    .box { border: 1px solid #ddd; padding: 12px; border-radius: 6px; margin-bottom: 14px; }
    .status { font-weight: bold; font-size: 13px; color: ${data.workStatus === 'approved_without_remarks' ? '#15803d' : '#b45309'}; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
    .sig-box { width: 45%; text-align: center; border-top: 1px dashed #666; padding-top: 6px; font-weight: bold; font-size: 11px; }
  </style>
</head>
<body>
  <h1>Protokół Końcowego Odbioru Robót</h1>
  <div class="box">
    <p><strong>Numer protokołu:</strong> ${data.protocolNumber}</p>
    <p><strong>Do umowy nr:</strong> ${data.contractNumber} z dnia ${data.date}</p>
    <p><strong>Adres inwestycji:</strong> ${data.siteAddress}</p>
    <p><strong>Wykonawca:</strong> ${data.contractor.name} (tel. ${data.contractor.phone})</p>
    <p><strong>Zamawiający:</strong> ${data.client.name} (tel. ${data.client.phone})</p>
  </div>

  <div class="box">
    <h3>Ocena jakości i odbiór:</h3>
    <p class="status">
      ${data.workStatus === 'approved_without_remarks'
        ? '✓ Roboty odebrane BEZ ZASTRZEŻEŃ jakościowych i terminowych.'
        : data.workStatus === 'approved_with_minor_remarks'
        ? '⚠ Roboty odebrane Z UWAGAMI do usunięcia.'
        : '✗ Roboty NIEODEBRANE.'}
    </p>
    ${data.remarks ? `<p><strong>Uwagi / Usterki:</strong> ${data.remarks}</p>` : ''}
    <p><strong>Kwota do końcowego rozliczenia:</strong> <span style="font-size: 14px; font-weight: 900;">${data.finalSettlementAmountPLN.toFixed(2)} zł</span></p>
  </div>

  <div class="signatures">
    <div class="sig-box">Wykonawca (Oddający)</div>
    <div class="sig-box">Zamawiający (Odbierający)</div>
  </div>
</body>
</html>
  `.trim();
}

export interface TradeBidQuotePdfData {
  quoteNumber: string;
  date: string;
  city: string;
  contractorName: string;
  contractorPhone: string;
  contractorId?: string; // NIP
  clientName: string;
  jobTitle: string;
  siteAddress: string;
  tradeName: string;
  scopeQuantity: number;
  scopeUnit: string;
  ratePerUnitPLN: number;
  laborTotalPLN: number;
  materialsTotalPLN?: number;
  grandTotalPLN: number;
  estimatedDays: number;
  validDays: number;
}

/**
 * Generates a formal, printable Quotation / Cost Estimate (Kosztorys Ofertowy)
 * suitable for printing or saving to PDF via browser print.
 */
export function generateTradeBidQuoteHtml(data: TradeBidQuotePdfData): string {
  return `
<!DOCTYPE html>
<html lang="pl">
<head>
  <meta charset="utf-8">
  <title>Kosztorys Ofertowy - ${data.quoteNumber}</title>
  <style>
    body { font-family: -apple-system, BlinkMacSystemFont, "Segoe UI", Roboto, sans-serif; font-size: 12px; color: #111; padding: 24px; line-height: 1.5; }
    h1 { font-size: 18px; text-align: center; margin-bottom: 2px; text-transform: uppercase; letter-spacing: 0.5px; }
    .sub { text-align: center; font-size: 11px; color: #555; margin-bottom: 20px; }
    .header { display: flex; justify-content: space-between; margin-bottom: 16px; border-bottom: 1px solid #ddd; padding-bottom: 8px; font-size: 11px; }
    .parties { display: flex; justify-content: space-between; gap: 20px; margin-bottom: 16px; }
    .party-box { flex: 1; border: 1px solid #ddd; padding: 10px; border-radius: 6px; background-color: #fafafa; }
    .party-box h4 { margin: 0 0 6px 0; font-size: 11px; text-transform: uppercase; color: #555; }
    table { width: 100%; border-collapse: collapse; margin: 16px 0; }
    th { background: #f4f4f5; padding: 8px; border: 1px solid #ccc; text-align: left; font-size: 11px; text-transform: uppercase; }
    td { padding: 8px; border: 1px solid #ccc; }
    .total-box { margin-top: 16px; padding: 12px; border: 2px solid #10b981; border-radius: 6px; background: #f0fdf4; display: flex; justify-content: space-between; align-items: center; }
    .notes { margin-top: 20px; font-size: 11px; color: #555; border-left: 3px solid #0284c7; padding-left: 10px; }
    .signatures { display: flex; justify-content: space-between; margin-top: 50px; padding-top: 20px; }
    .sig-box { width: 45%; text-align: center; border-top: 1px dashed #666; padding-top: 6px; font-weight: bold; font-size: 11px; }
    @media print {
      body { padding: 0; }
      .no-print { display: none; }
    }
  </style>
</head>
<body>
  <div class="header">
    <div><strong>Miejscowość:</strong> ${data.city}</div>
    <div><strong>Data sporządzenia:</strong> ${data.date}</div>
    <div><strong>Nr oferty:</strong> ${data.quoteNumber}</div>
  </div>

  <h1>Wstępny Kosztorys Ofertowy Robót</h1>
  <div class="sub">Wygenerowano dla inwestycji: <strong>${data.jobTitle}</strong></div>

  <div class="parties">
    <div class="party-box">
      <h4>Wykonawca (Oferent):</h4>
      <strong>${data.contractorName}</strong><br>
      ${data.contractorId ? `NIP: ${data.contractorId}<br>` : ''}
      Tel: ${data.contractorPhone}
    </div>
    <div class="party-box">
      <h4>Zamawiający (Inwestor):</h4>
      <strong>${data.clientName}</strong><br>
      Adres inwestycji: ${data.siteAddress}
    </div>
  </div>

  <table>
    <thead>
      <tr>
        <th style="width: 30px; text-align: center;">Lp.</th>
        <th>Pozycja kosztorysowa / Zakres prac</th>
        <th style="text-align: right; width: 90px;">Ilość</th>
        <th style="text-align: right; width: 100px;">Stawka jedn.</th>
        <th style="text-align: right; width: 120px;">Wartość robocizny</th>
      </tr>
    </thead>
    <tbody>
      <tr>
        <td style="text-align: center;">1</td>
        <td>
          <strong>${data.tradeName}</strong><br>
          <span style="font-size: 10.5px; color: #555;">Wykonanie robót zgodnie ze sztuką budowlaną, w tym przygotowanie stanowiska i sprzątanie pobudowlane.</span>
        </td>
        <td style="text-align: right;">${data.scopeQuantity} ${data.scopeUnit}</td>
        <td style="text-align: right;">${data.ratePerUnitPLN.toFixed(2)} zł/${data.scopeUnit}</td>
        <td style="text-align: right; font-weight: bold;">${data.laborTotalPLN.toFixed(2)} zł</td>
      </tr>
      ${data.materialsTotalPLN ? `
      <tr>
        <td style="text-align: center;">2</td>
        <td>
          <strong>Szacunkowy pakiet materiałów budowlanych</strong><br>
          <span style="font-size: 10.5px; color: #555;">Klej, grunty, profile, taśmy, zaprawy, chemia budowlana (orientacyjnie).</span>
        </td>
        <td style="text-align: right;">1 kpl</td>
        <td style="text-align: right;">${data.materialsTotalPLN.toFixed(2)} zł</td>
        <td style="text-align: right; font-weight: bold;">${data.materialsTotalPLN.toFixed(2)} zł</td>
      </tr>
      ` : ''}
    </tbody>
  </table>

  <div class="total-box">
    <div>
      <span style="font-size: 11px; text-transform: uppercase; font-weight: bold; color: #047857;">Łączna kwota kosztorysu:</span><br>
      <span style="font-size: 10.5px; color: #555;">Szacowany czas realizacji: ok. <strong>${data.estimatedDays} dni roboczych</strong></span>
    </div>
    <div style="font-size: 18px; font-weight: 900; color: #065f46;">
      ${data.grandTotalPLN.toFixed(2)} zł
    </div>
  </div>

  <div class="notes">
    <p><strong>Warunki oferty:</strong></p>
    <ul>
      <li>Oferta jest ważna przez ${data.validDays} dni od daty wystawienia.</li>
      <li>Wiążące potwierdzenie kwoty następuje po bezpłatnej wizji lokalnej na miejscu budowy.</li>
      <li>Rozliczenie na podstawie protokołu odbioru robót. Możliwość wystawienia faktury VAT.</li>
    </ul>
  </div>

  <div class="signatures">
    <div class="sig-box">Podpis Wykonawcy (Oferenta)</div>
    <div class="sig-box">Akceptacja Inwestora</div>
  </div>
</body>
</html>
  `.trim();
}

