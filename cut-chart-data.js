/*
  Plasma Cut Lab — Hypertherm reference dataset v0.2

  Cut speed and pierce-delay values:
  Hypertherm Powermax65/85 Operator Manual 806650, Revision 4,
  shielded air cut charts for 45 A, 65 A, and 85 A.

  Gas pressure:
  5.5 bar is the published operating-pressure specification for the
  Stamos S-Plasma 85 CNC. Hypertherm charts specify airflow and the
  Hypertherm machine manages pressure differently.

  IMPORTANT:
  These are reference starting points, not a Stamos factory cut chart.
*/

(() => {
  const MACHINE_PROFILE = "stamos-s-plasma-85";
  const MACHINE_NAME = "Stamos S-Plasma 85 CNC — Hypertherm reference";
  const GAS_PRESSURE_BAR = 5.5;
  const SOURCE =
    "Cut speed and pierce delay: Hypertherm Powermax65/85 Operator Manual 806650 Rev. 4, shielded-air charts. Gas pressure: Stamos S-Plasma 85 CNC specification (5.5 bar). Reference starting point only.";

  const records = [];

  function addSeries(material, processAmps, rows) {
    for (const [thicknessMm, qualitySpeedMmMin, productionSpeedMmMin, pierceDelaySeconds] of rows) {
      records.push({
        id: `${material}-${processAmps}a-${String(thicknessMm).replace(".", "_")}mm`,
        machineProfile: MACHINE_PROFILE,
        machineName: MACHINE_NAME,
        material,
        thicknessMm,
        processAmps,
        qualitySpeedMmMin,
        productionSpeedMmMin,
        pierceDelaySeconds,
        gasPressureBar: GAS_PRESSURE_BAR,
        gas: "compressed-air",
        process: "shielded-air-reference",
        source: SOURCE,
        validated: true,
        referenceOnly: true
      });
    }
  }

  // 45 A shielded — mild steel
  addSeries("mild-steel", 45, [
    [0.5, 9000, 12500, 0.0],
    [1.0, 9000, 10800, 0.0],
    [1.5, 9000, 10200, 0.1],
    [2.0, 6600, 7800, 0.3],
    [3.0, 3850, 4900, 0.4],
    [4.0, 2200, 3560, 0.4],
    [6.0, 1350, 2050, 0.5]
  ]);

  // 45 A shielded — stainless steel
  addSeries("stainless-steel", 45, [
    [0.5, 9000, 12500, 0.0],
    [1.0, 9000, 10800, 0.0],
    [1.5, 9000, 10200, 0.1],
    [2.0, 6000, 8660, 0.3],
    [3.0, 3100, 4400, 0.4],
    [4.0, 2000, 2600, 0.4],
    [6.0, 900, 1020, 0.5]
  ]);

  // 45 A shielded — aluminum
  addSeries("aluminum", 45, [
    [1.0, 8250, 11000, 0.0],
    [2.0, 6600, 9200, 0.1],
    [3.0, 3100, 6250, 0.2],
    [4.0, 2200, 4850, 0.4],
    [6.0, 1500, 2800, 0.5]
  ]);

  // 65 A shielded — mild steel
  addSeries("mild-steel", 65, [
    [3.0, 5200, 6100, 0.2],
    [4.0, 4250, 5100, 0.5],
    [6.0, 2550, 3240, 0.5],
    [8.0, 1700, 2230, 0.5],
    [10.0, 1100, 1500, 0.7],
    [12.0, 850, 1140, 1.2],
    [16.0, 560, 650, 2.0]
  ]);

  // 65 A shielded — stainless steel
  addSeries("stainless-steel", 65, [
    [2.0, 8100, 10000, 0.1],
    [3.0, 6700, 8260, 0.2],
    [4.0, 5200, 6150, 0.5],
    [6.0, 2450, 2850, 0.5],
    [8.0, 1500, 1860, 0.7],
    [10.0, 960, 1250, 0.7],
    [12.0, 750, 920, 1.2]
  ]);

  // 65 A shielded — aluminum
  addSeries("aluminum", 65, [
    [2.0, 8800, 10300, 0.1],
    [3.0, 7400, 8800, 0.2],
    [4.0, 6000, 7350, 0.5],
    [6.0, 3200, 4400, 0.5],
    [8.0, 1950, 2750, 0.7],
    [10.0, 1200, 1650, 0.7],
    [12.0, 1000, 1330, 1.2]
  ]);

  // 85 A shielded — mild steel
  addSeries("mild-steel", 85, [
    [3.0, 6800, 9200, 0.1],
    [4.0, 5650, 7300, 0.2],
    [6.0, 3600, 4400, 0.5],
    [8.0, 2500, 3100, 0.5],
    [10.0, 1680, 2070, 0.5],
    [12.0, 1280, 1600, 0.7],
    [16.0, 870, 930, 1.0],
    [20.0, 570, 680, 1.5]
  ]);

  // 85 A shielded — stainless steel
  addSeries("stainless-steel", 85, [
    [3.0, 7500, 9200, 0.1],
    [4.0, 6100, 7500, 0.2],
    [6.0, 3700, 4600, 0.5],
    [8.0, 2450, 3050, 0.5],
    [10.0, 1550, 1900, 0.5],
    [12.0, 1100, 1400, 0.7],
    [16.0, 700, 760, 1.0]
  ]);

  // 85 A shielded — aluminum
  addSeries("aluminum", 85, [
    [3.0, 8000, 9400, 0.1],
    [4.0, 6500, 8000, 0.2],
    [6.0, 3800, 4900, 0.5],
    [8.0, 2650, 3470, 0.5],
    [10.0, 1920, 2500, 0.5],
    [12.0, 1450, 1930, 0.7],
    [16.0, 950, 1200, 1.0]
  ]);

  window.PLASMA_CUT_CHARTS = records;
})();
