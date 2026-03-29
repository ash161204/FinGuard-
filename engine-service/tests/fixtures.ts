export const taxDocumentsFixture = [
  {
    salary: 1800000,
    basic: 900000,
    hra_received: 240000,
    rent_paid: 300000,
    tax_deducted: 210000,
    epf: 108000,
    health_insurance: 15000,
    nps_80ccd1b: 50000,
  },
];

export const mfDocumentsFixture = [
  {
    holdings: [
      {
        fund_name: 'Alpha Index Fund Direct',
        category: 'Index',
        invested: 100000,
        current: 125000,
        purchase_date: '2021-01-10',
        plan: 'Direct',
      },
      {
        fund_name: 'Beta Mid Cap Regular',
        category: 'Mid Cap',
        invested: 50000,
        current: 65000,
        purchase_date: '2020-04-01',
        plan: 'Regular',
      },
    ],
  },
];
