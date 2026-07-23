/*
  Plasma Cut Lab - cut-chart data

  IMPORTANT:
  - Publish only records verified against a manufacturer manual and/or controlled test cuts.
  - Keep different torches, consumables, gases, and machine profiles separate.
  - The calculator refuses to display a record unless validated is true.
*/

window.PLASMA_CUT_CHARTS = [
  {
    id: "development-record-ms-6mm",
    machineProfile: "stamos-s-plasma-85",
    machineName: "Stamos S-Plasma 85 CNC",
    material: "mild-steel",
    thicknessMm: 6,
    processAmps: 45,
    qualitySpeedMmMin: 1450,
    productionSpeedMmMin: 2100,
    pierceDelaySeconds: 0.6,
    gasPressureBar: 5.5,
    gas: "compressed-air",
    source: "Development placeholder — replace with validated test data",
    validated: false
  }

  /*
  Add validated records in this format:

  ,{
    id: "unique-record-id",
    machineProfile: "stamos-s-plasma-85",
    machineName: "Stamos S-Plasma 85 CNC",
    material: "mild-steel",
    thicknessMm: 8,
    processAmps: 65,
    qualitySpeedMmMin: 1200,
    productionSpeedMmMin: 1700,
    pierceDelaySeconds: 0.8,
    gasPressureBar: 5.5,
    gas: "compressed-air",
    source: "Manual name, page number, and/or test record",
    validated: true
  }
  */
];
