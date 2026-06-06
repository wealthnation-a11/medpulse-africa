// LOINC → internal biomarker key + unit conversion factor to canonical unit
export const LOINC_MAP: Record<string, { key: string; canonicalUnit: string; convert?: (v: number, unit: string) => number }> = {
  "4548-4":  { key: "hba1c", canonicalUnit: "%" },
  "2339-0":  { key: "glucose", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 18 : v },
  "2093-3":  { key: "cholesterol_total", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "13457-7": { key: "ldl", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "2085-9":  { key: "hdl", canonicalUnit: "mg/dL", convert: (v, u) => /mmol/i.test(u) ? v * 38.67 : v },
  "2160-0":  { key: "creatinine", canonicalUnit: "mg/dL", convert: (v, u) => /µmol|umol/i.test(u) ? v / 88.4 : v },
  "2857-1":  { key: "psa", canonicalUnit: "ng/mL" },
  "6598-7":  { key: "troponin", canonicalUnit: "ng/mL" },
  "1988-5":  { key: "crp", canonicalUnit: "mg/L" },
  "3016-3":  { key: "tsh", canonicalUnit: "mIU/L" },
  "2276-4":  { key: "ferritin", canonicalUnit: "ng/mL" },
  "1989-3":  { key: "vitamin_d", canonicalUnit: "ng/mL" },
  "718-7":   { key: "hemoglobin", canonicalUnit: "g/dL" },
  "6690-2":  { key: "wbc", canonicalUnit: "×10³/µL" },
};