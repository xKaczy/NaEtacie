import { describe, it, expect } from 'vitest';
import {
  calculateContractTotal,
  generateContractHtml,
  generateHandoverProtocolHtml,
} from '@/lib/contracts/contractGenerator';

describe('Construction Contract & Handover Protocol Generator', () => {
  it('calculates totals correctly from scope items', () => {
    const items = [
      { description: 'Gładzie gipsowe', quantity: 100, unit: 'm²', unitPricePLN: 50 },
      { description: 'Malowanie ścian', quantity: 100, unit: 'm²', unitPricePLN: 20 },
    ];
    const total = calculateContractTotal(items);
    expect(total.netTotal).toBe(7000);
    expect(total.itemsCount).toBe(2);
  });

  it('generates contract HTML containing contractor, client and total price', () => {
    const html = generateContractHtml({
      contractNumber: 'U/SZC/2026/01',
      date: '03.09.2026',
      city: 'Szczecin',
      contractor: { name: 'Jan Budowlaniec Usługi', phone: '500111222' },
      client: { name: 'Marek Inwestor', phone: '600333444' },
      siteAddress: 'ul. Krzywoustego 12, Szczecin',
      startDate: '05.09.2026',
      completionDate: '25.09.2026',
      items: [
        { description: 'Układanie gresu 60x60', quantity: 30, unit: 'm²', unitPricePLN: 140 },
      ],
      warrantyMonths: 24,
    });

    expect(html).toContain('Umowa o Roboty Wykończeniowo-Budowlane');
    expect(html).toContain('U/SZC/2026/01');
    expect(html).toContain('Jan Budowlaniec');
    expect(html).toContain('4200.00 zł');
    expect(html).toContain('24 miesięcy');
  });

  it('generates handover protocol HTML with approved status', () => {
    const html = generateHandoverProtocolHtml({
      protocolNumber: 'P/SZC/2026/01',
      contractNumber: 'U/SZC/2026/01',
      date: '25.09.2026',
      siteAddress: 'ul. Krzywoustego 12, Szczecin',
      contractor: { name: 'Jan Budowlaniec Usługi', phone: '500111222' },
      client: { name: 'Marek Inwestor', phone: '600333444' },
      workStatus: 'approved_without_remarks',
      finalSettlementAmountPLN: 4200,
    });

    expect(html).toContain('Protokół Końcowego Odbioru Robót');
    expect(html).toContain('BEZ ZASTRZEŻEŃ');
    expect(html).toContain('4200.00 zł');
  });
});
