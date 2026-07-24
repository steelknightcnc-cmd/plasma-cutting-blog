/*
  Plasma Cut Lab — multi-profile dataset v0.6

  Working chart profiles:
  - Generic air plasma (Hypertherm Powermax65/85 shielded-air reference)
  - Stamos S-Plasma 85 CNC (Hypertherm reference + Stamos 5.5 bar setting)
  - Hypertherm Powermax65 (official 45 A and 65 A chart rows)
  - Hypertherm Powermax85 (official 45 A, 65 A, and 85 A chart rows)

  Listed profiles marked "chart coming soon" do not return calculated settings.
  This prevents one manufacturer's chart from being presented as another
  manufacturer's factory data.

  Source for speed and pierce delay:
  Added field: recommended cut voltage as a practical starting THC value.
  This voltage guidance is an estimate for machine setup and must be verified by test cuts.

  Hypertherm Powermax65/85 Operator Manual 806650, Revision 4,
  shielded-air mechanized cut charts.
*/

(() => {
  const HYPERTHERM_SOURCE =
    "Hypertherm Powermax65/85 Operator Manual 806650 Rev. 4, shielded-air mechanized cut charts.";

  window.PLASMA_MACHINE_PROFILES = [
    {
      id: "generic-air-plasma",
      group: "Generic",
      label: "Generic air plasma — Hypertherm reference",
      defaultMaxAmps: 85,
      supported: true,
      referenceOnly: true,
      help:
        "Generic fallback using Hypertherm shielded-air speeds. Gas pressure remains machine-specific."
    },
    {
      id: "stamos-s-plasma-85",
      group: "Stamos",
      label: "Stamos S-Plasma 85 CNC — reference profile",
      defaultMaxAmps: 85,
      supported: true,
      referenceOnly: true,
      help:
        "Hypertherm-based speed and delay reference with the Stamos 5.5 bar pressure setting."
    },
    {
      id: "hypertherm-powermax65",
      group: "Hypertherm",
      label: "Hypertherm Powermax65",
      defaultMaxAmps: 65,
      supported: true,
      referenceOnly: false,
      help:
        "Official Powermax65 shielded-air chart rows. Gas pressure is normally controlled automatically."
    },
    {
      id: "hypertherm-powermax85",
      group: "Hypertherm",
      label: "Hypertherm Powermax85",
      defaultMaxAmps: 85,
      supported: true,
      referenceOnly: false,
      help:
        "Official Powermax85 shielded-air chart rows. Gas pressure is normally controlled automatically."
    },
    {
      id: "hypertherm-powermax45-xp",
      group: "Hypertherm",
      label: "Hypertherm Powermax45 XP — chart coming soon",
      defaultMaxAmps: 45,
      supported: false,
      help: "Profile is listed, but its separate official chart has not been loaded yet."
    },
    {
      id: "hypertherm-powermax-sync",
      group: "Hypertherm",
      label: "Hypertherm Powermax SYNC — chart coming soon",
      defaultMaxAmps: 85,
      supported: false,
      help: "SYNC cartridge charts are separate from the legacy Powermax65/85 consumable charts."
    },
    {
      id: "esab-cutmaster-60i",
      group: "ESAB / Thermal Dynamics",
      label: "ESAB Thermal Dynamics Cutmaster 60i — chart coming soon",
      defaultMaxAmps: 60,
      supported: false,
      help: "The machine is listed; official Cutmaster 60i table data still needs to be entered."
    },
    {
      id: "esab-cutmaster-82",
      group: "ESAB / Thermal Dynamics",
      label: "ESAB Thermal Dynamics Cutmaster 82 — chart coming soon",
      defaultMaxAmps: 80,
      supported: false,
      help: "The machine is listed; official Cutmaster 82 table data still needs to be entered."
    },
    {
      id: "lincoln-tomahawk-45",
      group: "Lincoln Electric",
      label: "Lincoln Electric Tomahawk 45 — chart coming soon",
      defaultMaxAmps: 45,
      supported: false,
      help: "The machine is listed; official mechanized cut-chart rows still need to be entered."
    },
    {
      id: "lincoln-tomahawk-1000",
      group: "Lincoln Electric",
      label: "Lincoln Electric Tomahawk 1000 — chart coming soon",
      defaultMaxAmps: 60,
      supported: false,
      help: "The machine is listed; official mechanized cut-chart rows still need to be entered."
    },
    {
      id: "miller-spectrum-625",
      group: "Miller",
      label: "Miller Spectrum 625 X-TREME — chart coming soon",
      defaultMaxAmps: 40,
      supported: false,
      help: "The machine is listed; official CNC cut-chart rows still need to be entered."
    },
    {
      id: "miller-spectrum-875",
      group: "Miller",
      label: "Miller Spectrum 875 — chart coming soon",
      defaultMaxAmps: 60,
      supported: false,
      help: "The machine is listed; official CNC cut-chart rows still need to be entered."
    },
    {
      id: "everlast-powerplasma-62i",
      group: "Everlast",
      label: "Everlast PowerPlasma 62i — chart coming soon",
      defaultMaxAmps: 60,
      supported: false,
      help: "The machine is listed; official CNC cut-chart rows still need to be entered."
    },
    {
      id: "everlast-powerplasma-82i",
      group: "Everlast",
      label: "Everlast PowerPlasma 82i — chart coming soon",
      defaultMaxAmps: 80,
      supported: false,
      help: "The machine is listed; official CNC cut-chart rows still need to be entered."
    }
  ];

  const chartSeries = [
    {
      material: "mild-steel",
      processAmps: 45,
      rows: [
        [0.5, 9000, 12500, 0.0, 98],
        [1.0, 9000, 10800, 0.0, 102],
        [1.5, 9000, 10200, 0.1, 108],
        [2.0, 6600, 7800, 0.3, 113],
        [3.0, 3850, 4900, 0.4, 118],
        [4.0, 2200, 3560, 0.4, 122],
        [6.0, 1350, 2050, 0.5, 126]
      ]
    },
    {
      material: "stainless-steel",
      processAmps: 45,
      rows: [
        [0.5, 9000, 12500, 0.0, 100],
        [1.0, 9000, 10800, 0.0, 104],
        [1.5, 9000, 10200, 0.1, 109],
        [2.0, 6000, 8660, 0.3, 114],
        [3.0, 3100, 4400, 0.4, 120],
        [4.0, 2000, 2600, 0.4, 124],
        [6.0, 900, 1020, 0.5, 128]
      ]
    },
    {
      material: "aluminum",
      processAmps: 45,
      rows: [
        [1.0, 8250, 11000, 0.0, 96],
        [2.0, 6600, 9200, 0.1, 101],
        [3.0, 3100, 6250, 0.2, 107],
        [4.0, 2200, 4850, 0.4, 112],
        [6.0, 1500, 2800, 0.5, 118]
      ]
    },
    {
      material: "mild-steel",
      processAmps: 65,
      rows: [
        [3.0, 5200, 6100, 0.2, 116],
        [4.0, 4250, 5100, 0.5, 120],
        [6.0, 2550, 3240, 0.5, 126],
        [8.0, 1700, 2230, 0.5, 132],
        [10.0, 1100, 1500, 0.7, 136],
        [12.0, 850, 1140, 1.2, 141],
        [16.0, 560, 650, 2.0, 148]
      ]
    },
    {
      material: "stainless-steel",
      processAmps: 65,
      rows: [
        [2.0, 8100, 10000, 0.1, 108],
        [3.0, 6700, 8260, 0.2, 113],
        [4.0, 5200, 6150, 0.5, 118],
        [6.0, 2450, 2850, 0.5, 124],
        [8.0, 1500, 1860, 0.7, 130],
        [10.0, 960, 1250, 0.7, 136],
        [12.0, 750, 920, 1.2, 141]
      ]
    },
    {
      material: "aluminum",
      processAmps: 65,
      rows: [
        [2.0, 8800, 10300, 0.1, 103],
        [3.0, 7400, 8800, 0.2, 108],
        [4.0, 6000, 7350, 0.5, 114],
        [6.0, 3200, 4400, 0.5, 120],
        [8.0, 1950, 2750, 0.7, 126],
        [10.0, 1200, 1650, 0.7, 132],
        [12.0, 1000, 1330, 1.2, 137]
      ]
    },
    {
      material: "mild-steel",
      processAmps: 85,
      rows: [
        [3.0, 6800, 9200, 0.1, 117],
        [4.0, 5650, 7300, 0.2, 122],
        [6.0, 3600, 4400, 0.5, 128],
        [8.0, 2500, 3100, 0.5, 134],
        [10.0, 1680, 2070, 0.5, 140],
        [12.0, 1280, 1600, 0.7, 145],
        [16.0, 870, 930, 1.0, 151],
        [20.0, 570, 680, 1.5, 157]
      ]
    },
    {
      material: "stainless-steel",
      processAmps: 85,
      rows: [
        [3.0, 7500, 9200, 0.1, 119],
        [4.0, 6100, 7500, 0.2, 124],
        [6.0, 3700, 4600, 0.5, 130],
        [8.0, 2450, 3050, 0.5, 136],
        [10.0, 1550, 1900, 0.5, 142],
        [12.0, 1100, 1400, 0.7, 147],
        [16.0, 700, 760, 1.0, 154]
      ]
    },
    {
      material: "aluminum",
      processAmps: 85,
      rows: [
        [3.0, 8000, 9400, 0.1, 109],
        [4.0, 6500, 8000, 0.2, 114],
        [6.0, 3800, 4900, 0.5, 120],
        [8.0, 2650, 3470, 0.5, 126],
        [10.0, 1920, 2500, 0.5, 132],
        [12.0, 1450, 1930, 0.7, 138],
        [16.0, 950, 1200, 1.0, 145]
      ]
    }
  ];

  const records = [];

  function pressureFor(profileId) {
    if (profileId === "stamos-s-plasma-85") {
      return {
        gasPressureType: "numeric",
        gasPressureBar: 5.5,
        gasPressurePrimary: "5.5 bar",
        gasPressureSecondary: "79.8 PSI"
      };
    }

    if (
      profileId === "hypertherm-powermax65" ||
      profileId === "hypertherm-powermax85"
    ) {
      return {
        gasPressureType: "automatic",
        gasPressurePrimary: "Automatic",
        gasPressureSecondary: "Smart Sense™ control"
      };
    }

    return {
      gasPressureType: "machine-specific",
      gasPressurePrimary: "Machine-specific",
      gasPressureSecondary: "Use manufacturer setting"
    };
  }

  function sourceFor(profileId) {
    if (profileId === "stamos-s-plasma-85") {
      return `${HYPERTHERM_SOURCE} Stamos pressure specification: 5.5 bar. Reference profile—not a Stamos factory chart.`;
    }

    if (profileId === "generic-air-plasma") {
      return `${HYPERTHERM_SOURCE} Generic fallback profile; gas pressure must follow the selected machine's manual.`;
    }

    return HYPERTHERM_SOURCE;
  }

  function addProfile(profileId, machineName, allowedAmps, referenceOnly) {
    const pressure = pressureFor(profileId);

    for (const series of chartSeries) {
      if (!allowedAmps.includes(series.processAmps)) continue;

      for (const [
        thicknessMm,
        qualitySpeedMmMin,
        productionSpeedMmMin,
        pierceDelaySeconds,
        recommendedCutVoltage
      ] of series.rows) {
        records.push({
          id: `${profileId}-${series.material}-${series.processAmps}a-${String(
            thicknessMm
          ).replace(".", "_")}mm`,
          machineProfile: profileId,
          machineName,
          material: series.material,
          thicknessMm,
          processAmps: series.processAmps,
          qualitySpeedMmMin,
          productionSpeedMmMin,
          pierceDelaySeconds,
          recommendedCutVoltage,
          gas: "compressed-air",
          process: "shielded-air",
          source: sourceFor(profileId),
          validated: true,
          referenceOnly,
          ...pressure
        });
      }
    }
  }

  addProfile(
    "generic-air-plasma",
    "Generic air plasma — Hypertherm reference",
    [45, 65, 85],
    true
  );

  addProfile(
    "stamos-s-plasma-85",
    "Stamos S-Plasma 85 CNC — Hypertherm reference",
    [45, 65, 85],
    true
  );

  addProfile(
    "hypertherm-powermax65",
    "Hypertherm Powermax65",
    [45, 65],
    false
  );

  addProfile(
    "hypertherm-powermax85",
    "Hypertherm Powermax85",
    [45, 65, 85],
    false
  );

  window.PLASMA_CUT_CHARTS = records;
})();
