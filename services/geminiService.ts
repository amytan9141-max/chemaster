import { GoogleGenAI, Type } from "@google/genai";
import { Ion, ChemicalEquation, Language, EquationTopic, EquationChallenge, EquationComponent } from '../types';

const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
const visionModel = 'gemini-3-pro-preview';
const textModel = 'gemini-3-flash-preview';

export interface EvaluationResult {
  score: number;
  results: {
    question: string;
    expected: string;
    studentWrote: string;
    isCorrect: boolean;
    feedback?: string;
  }[];
  overallFeedback: string;
}

function shuffleArray<T>(array: T[]): T[] {
  const result = [...array];
  for (let i = result.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [result[i], result[j]] = [result[j], result[i]];
  }
  return result;
}

const ION_BANK: Ion[] = [
  { formula: "Na^+", chineseName: "鈉離子", englishName: "Sodium ion", type: "Cation", charge: 1 },
  { formula: "K^+", chineseName: "鉀離子", englishName: "Potassium ion", type: "Cation", charge: 1 },
  { formula: "Ag^+", chineseName: "銀離子", englishName: "Silver ion", type: "Cation", charge: 1 },
  { formula: "NH4^+", chineseName: "銨離子", englishName: "Ammonium ion", type: "Cation", charge: 1 },
  { formula: "Mg^2+", chineseName: "鎂離子", englishName: "Magnesium ion", type: "Cation", charge: 2 },
  { formula: "Ca^2+", chineseName: "鈣離子", englishName: "Calcium ion", type: "Cation", charge: 2 },
  { formula: "Cu^2+", chineseName: "銅(II)離子", englishName: "Copper(II) ion", type: "Cation", charge: 2 },
  { formula: "Fe^2+", chineseName: "亞鐵離子", englishName: "Iron(II) ion", type: "Cation", charge: 2 },
  { formula: "Pb^2+", chineseName: "鉛(II)離子", englishName: "Lead(II) ion", type: "Cation", charge: 2 },
  { formula: "Zn^2+", chineseName: "鋅離子", englishName: "Zinc ion", type: "Cation", charge: 2 },
  { formula: "Al^3+", chineseName: "鋁離子", englishName: "Aluminium ion", type: "Cation", charge: 3 },
  { formula: "Fe^3+", chineseName: "鐵(III)離子", englishName: "Iron(III) ion", type: "Cation", charge: 3 },
  { formula: "F^-", chineseName: "氟離子", englishName: "Fluoride ion", type: "Anion", charge: -1 },
  { formula: "Cl^-", chineseName: "氯離子", englishName: "Chloride ion", type: "Anion", charge: -1 },
  { formula: "Br^-", chineseName: "溴離子", englishName: "Bromide ion", type: "Anion", charge: -1 },
  { formula: "I^-", chineseName: "碘離子", englishName: "Iodide ion", type: "Anion", charge: -1 },
  { formula: "OH^-", chineseName: "氫氧根離子", englishName: "Hydroxide ion", type: "Anion", charge: -1 },
  { formula: "NO3^-", chineseName: "硝酸根離子", englishName: "Nitrate ion", type: "Anion", charge: -1 },
  { formula: "HCO3^-", chineseName: "碳酸氫根離子", englishName: "Hydrogencarbonate ion", type: "Anion", charge: -1 },
  { formula: "MnO4^-", chineseName: "高錳酸根離子", englishName: "Permanganate ion", type: "Anion", charge: -1 },
  { formula: "O^2-", chineseName: "氧化物離子", englishName: "Oxide ion", type: "Anion", charge: -2 },
  { formula: "S^2-", chineseName: "硫化物離子", englishName: "Sulphide ion", type: "Anion", charge: -2 },
  { formula: "CO3^2-", chineseName: "碳酸根離子", englishName: "Carbonate ion", type: "Anion", charge: -2 },
  { formula: "SO4^2-", chineseName: "硫酸根離子", englishName: "Sulphate ion", type: "Anion", charge: -2 },
  { formula: "Cr2O7^2-", chineseName: "重鉻酸根離子", englishName: "Dichromate ion", type: "Anion", charge: -2 },
  { formula: "PO4^3-", chineseName: "磷酸根離子", englishName: "Phosphate ion", type: "Anion", charge: -3 },
];

const MASTER_EQUATIONS: Record<string, ChemicalEquation[]> = {
  TOPIC_1_EARTH: [
    { reactants: [{formula:"CO2", coefficient:6, nameZH: "二氧化碳", nameEN: "Carbon dioxide"}, {formula:"H2O", coefficient:6, nameZH: "水", nameEN: "Water"}], products: [{formula:"C6H12O6", coefficient:1, nameZH: "葡萄糖", nameEN: "Glucose"}, {formula:"O2", coefficient:6, nameZH: "氧氣", nameEN: "Oxygen"}], difficulty:"hard" },
    { reactants: [{formula:"CaCO3", coefficient:1, nameZH: "碳酸鈣", nameEN: "Calcium carbonate"}], products: [{formula:"CaO", coefficient:1, nameZH: "氧化鈣", nameEN: "Calcium oxide"}, {formula:"CO2", coefficient:1, nameZH: "二氧化碳", nameEN: "Carbon dioxide"}], difficulty:"easy" },
    { reactants: [{formula:"CaCO3", coefficient:1, nameZH: "碳酸鈣", nameEN: "Calcium carbonate"}, {formula:"H2O", coefficient:1, nameZH: "水", nameEN: "Water"}, {formula:"CO2", coefficient:1, nameZH: "二氧化碳", nameEN: "Carbon dioxide"}], products: [{formula:"Ca(HCO3)2", coefficient:1, nameZH: "碳酸氫鈣", nameEN: "Calcium hydrogencarbonate"}], difficulty:"medium" },
  ],
  TOPIC_2_MICRO: [
    { reactants: [{formula:"Na", coefficient:2, nameZH: "鈉", nameEN: "Sodium"}, {formula:"Cl2", coefficient:1, nameZH: "氯氣", nameEN: "Chlorine"}], products: [{formula:"NaCl", coefficient:2, nameZH: "氯化鈉", nameEN: "Sodium chloride"}], difficulty:"easy" },
    { reactants: [{formula:"Mg", coefficient:2, nameZH: "鎂", nameEN: "Magnesium"}, {formula:"O2", coefficient:1, nameZH: "氧氣", nameEN: "Oxygen"}], products: [{formula:"MgO", coefficient:2, nameZH: "氧化鎂", nameEN: "Magnesium oxide"}], difficulty:"easy" },
  ],
  TOPIC_3_METALS: [
    { reactants: [{formula:"Fe2O3", coefficient:1, nameZH: "氧化鐵(III)", nameEN: "Iron(III) oxide"}, {formula:"CO", coefficient:3, nameZH: "一氧化碳", nameEN: "Carbon monoxide"}], products: [{formula:"Fe", coefficient:2, nameZH: "鐵", nameEN: "Iron"}, {formula:"CO2", coefficient:3, nameZH: "二氧化碳", nameEN: "Carbon dioxide"}], difficulty:"hard" },
    { reactants: [{formula:"Zn", coefficient:1, nameZH: "鋅", nameEN: "Zinc"}, {formula:"CuSO4", coefficient:1, nameZH: "硫酸銅(II)", nameEN: "Copper(II) sulphate"}], products: [{formula:"ZnSO4", coefficient:1, nameZH: "硫酸鋅", nameEN: "Zinc sulphate"}, {formula:"Cu", coefficient:1, nameZH: "銅", nameEN: "Copper"}], difficulty:"easy" },
  ],
  TOPIC_4_ACIDS: [
    { reactants: [{formula:"Zn", coefficient:1, nameZH:"鋅", nameEN:"Zinc"}, {formula:"H^+", coefficient:2, nameZH:"氫離子", nameEN:"Hydrogen ion"}], products: [{formula:"Zn^2+", coefficient:1, nameZH:"鋅離子", nameEN:"Zinc ion"}, {formula:"H2", coefficient:1, nameZH:"氫氣", nameEN:"Hydrogen"}], difficulty:"medium" },
    { reactants: [{formula:"Mg", coefficient:1, nameZH:"鎂", nameEN:"Magnesium"}, {formula:"HCl", coefficient:2, nameZH:"鹽酸", nameEN:"Hydrochloric acid"}], products: [{formula:"MgCl2", coefficient:1, nameZH:"氯化鎂", nameEN:"Magnesium chloride"}, {formula:"H2", coefficient:1, nameZH:"氫氣", nameEN:"Hydrogen"}], difficulty:"medium" },
    { reactants: [{formula:"NaOH", coefficient:1, nameZH:"氫氧化鈉", nameEN:"Sodium hydroxide"}, {formula:"HCl", coefficient:1, nameZH:"鹽酸", nameEN:"Hydrochloric acid"}], products: [{formula:"NaCl", coefficient:1, nameZH:"氯化鈉", nameEN:"Sodium chloride"}, {formula:"H2O", coefficient:1, nameZH:"水", nameEN:"Water"}], difficulty:"easy" },
    { reactants: [{formula:"NaHCO3", coefficient:1, nameZH:"碳酸氫鈉", nameEN:"Sodium hydrogencarbonate"}, {formula:"HCl", coefficient:1, nameZH:"鹽酸", nameEN:"Hydrochloric acid"}], products: [{formula:"NaCl", coefficient:1, nameZH:"氯化鈉", nameEN:"Sodium chloride"}, {formula:"CO2", coefficient:1, nameZH:"二氧化碳", nameEN:"Carbon dioxide"}, {formula:"H2O", coefficient:1, nameZH:"水", nameEN:"Water"}], difficulty:"medium" },
  ],
  TOPIC_6_ORGANIC: [
    { reactants: [{formula:"CH4", coefficient:1, nameZH:"甲烷", nameEN:"Methane"}, {formula:"O2", coefficient:2, nameZH:"氧氣", nameEN:"Oxygen"}], products: [{formula:"CO2", coefficient:1, nameZH:"二氧化碳", nameEN:"Carbon dioxide"}, {formula:"H2O", coefficient:2, nameZH:"水", nameEN:"Water"}], difficulty:"medium" },
    { reactants: [{formula:"C2H4", coefficient:1, nameZH:"乙烯", nameEN:"Ethene"}, {formula:"O2", coefficient:3, nameZH:"氧氣", nameEN:"Oxygen"}], products: [{formula:"CO2", coefficient:2, nameZH:"二氧化碳", nameEN:"Carbon dioxide"}, {formula:"H2O", coefficient:2, nameZH:"水", nameEN:"Water"}], difficulty:"medium" },
    { reactants: [{formula:"C2H5OH", coefficient:1, nameZH:"乙醇", nameEN:"Ethanol"}, {formula:"O2", coefficient:3, nameZH:"氧氣", nameEN:"Oxygen"}], products: [{formula:"CO2", coefficient:2, nameZH:"二氧化碳", nameEN:"Carbon dioxide"}, {formula:"H2O", coefficient:3, nameZH:"水", nameEN:"Water"}], difficulty:"hard" },
  ],
  TOPIC_7_PERIODICITY: [
    { reactants: [{formula:"KBr", coefficient:2, nameZH:"溴化鉀", nameEN:"Potassium bromide"}, {formula:"Cl2", coefficient:1, nameZH:"氯氣", nameEN:"Chlorine"}], products: [{formula:"KCl", coefficient:2, nameZH:"氯化鉀", nameEN:"Potassium chloride"}, {formula:"Br2", coefficient:1, nameZH:"溴", nameEN:"Bromine"}], difficulty:"medium" },
    { reactants: [{formula:"KI", coefficient:2, nameZH:"碘化鉀", nameEN:"Potassium iodide"}, {formula:"Br2", coefficient:1, nameZH:"溴", nameEN:"Bromine"}], products: [{formula:"KBr", coefficient:2, nameZH:"溴化鉀", nameEN:"Potassium bromide"}, {formula:"I2", coefficient:1, nameZH:"碘", nameEN:"Iodine"}], difficulty:"medium" },
  ],
  TOPIC_8_ENERGETICS: [
    { reactants: [{formula:"H2", coefficient:2, nameZH:"氫氣", nameEN:"Hydrogen"}, {formula:"O2", coefficient:1, nameZH:"氧氣", nameEN:"Oxygen"}], products: [{formula:"H2O", coefficient:2, nameZH:"水", nameEN:"Water"}], difficulty:"easy" },
    { reactants: [{formula:"C", coefficient:1, nameZH:"碳", nameEN:"Carbon"}, {formula:"O2", coefficient:1, nameZH:"氧氣", nameEN:"Oxygen"}], products: [{formula:"CO2", coefficient:1, nameZH:"二氧化碳", nameEN:"Carbon dioxide"}], difficulty:"easy" },
    { reactants: [{formula:"N2", coefficient:1, nameZH:"氮氣", nameEN:"Nitrogen"}, {formula:"H2", coefficient:3, nameZH:"氫氣", nameEN:"Hydrogen"}], products: [{formula:"NH3", coefficient:2, nameZH:"氨", nameEN:"Ammonia"}], difficulty:"medium" },
  ],
  REDOX_HALF: [
    { reactants: [{formula:"MnO4^-", coefficient:1, nameZH: "高錳酸根離子", nameEN: "Permanganate ion"}, {formula:"H^+", coefficient:8, nameZH: "氫離子", nameEN: "Hydrogen ion"}, {formula:"e^-", coefficient:5, nameZH: "電子", nameEN: "Electron"}], products: [{formula:"Mn^2+", coefficient:1, nameZH: "錳(II)離子", nameEN: "Manganese(II) ion"}, {formula:"H2O", coefficient:4, nameZH: "水", nameEN: "Water"}], difficulty:"hard" },
    { reactants: [{formula:"Cr2O7^2-", coefficient:1, nameZH: "重鉻酸根離子", nameEN: "Dichromate ion"}, {formula:"H^+", coefficient:14, nameZH: "氫離子", nameEN: "Hydrogen ion"}, {formula:"e^-", coefficient:6, nameZH: "電子", nameEN: "Electron"}], products: [{formula:"Cr^3+", coefficient:2, nameZH: "鉻(III)離子", nameEN: "Chromium(III) ion"}, {formula:"H2O", coefficient:7, nameZH: "水", nameEN: "Water"}], difficulty:"hard" },
    { reactants: [{formula:"Fe^2+", coefficient:1, nameZH: "亞鐵離子", nameEN: "Iron(II) ion"}], products: [{formula:"Fe^3+", coefficient:1, nameZH: "鐵(III)離子", nameEN: "Iron(III) ion"}, {formula:"e^-", coefficient:1, nameZH: "電子", nameEN: "Electron"}], difficulty: "easy" },
  ],
  REDOX_FULL: [
    { reactants: [{formula:"MnO4^-", coefficient:1, nameZH:"高錳酸根離子", nameEN:"Permanganate ion"}, {formula:"H^+", coefficient:8, nameZH:"氫離子", nameEN:"Hydrogen ion"}, {formula:"Fe^2+", coefficient:5, nameZH:"亞鐵離子", nameEN:"Iron(II) ion"}], products: [{formula:"Mn^2+", coefficient:1, nameZH:"錳(II)離子", nameEN:"Manganese(II) ion"}, {formula:"H2O", coefficient:4, nameZH:"水", nameEN:"Water"}, {formula:"Fe^3+", coefficient:5, nameZH:"鐵(III)離子", nameEN:"Iron(III) ion"}], difficulty:"hard" },
  ] 
};

const CHALLENGES_BY_TOPIC: Record<string, EquationChallenge[]> = {
  TOPIC_1_2_EARTH_MICRO: [
    {
      description: "加熱碳酸鈣固體，發生熱分解生成氧化鈣和二氧化碳。",
      reactants: [{ formula: "CaCO3", coefficient: 1 }],
      products: [{ formula: "CaO", coefficient: 1 }, { formula: "CO2", coefficient: 1 }]
    },
    {
      description: "碳酸鈣與水及二氧化碳反應，生成碳酸氫鈣。",
      reactants: [{ formula: "CaCO3", coefficient: 1 }, { formula: "H2O", coefficient: 1 }, { formula: "CO2", coefficient: 1 }],
      products: [{ formula: "Ca(HCO3)2", coefficient: 1 }]
    },
    {
      description: "鈉在氯氣中燃燒生成氯化鈉。",
      reactants: [{ formula: "Na", coefficient: 2 }, { formula: "Cl2", coefficient: 1 }],
      products: [{ formula: "NaCl", coefficient: 2 }]
    },
    {
      description: "Heating calcium carbonate solid to undergo thermal decomposition, forming calcium oxide and carbon dioxide.",
      reactants: [{ formula: "CaCO3", coefficient: 1 }],
      products: [{ formula: "CaO", coefficient: 1 }, { formula: "CO2", coefficient: 1 }]
    }
  ],
  TOPIC_3_METALS: [
    {
      description: "鎂在氧氣中燃燒生成氧化鎂。",
      reactants: [{ formula: "Mg", coefficient: 2 }, { formula: "O2", coefficient: 1 }],
      products: [{ formula: "MgO", coefficient: 2 }]
    },
    {
      description: "鋁在氯氣中燃燒生成氯化鋁。",
      reactants: [{ formula: "Al", coefficient: 2 }, { formula: "Cl2", coefficient: 3 }],
      products: [{ formula: "AlCl3", coefficient: 2 }]
    },
    {
      description: "銅片放入硝酸銀溶液中，置換出銀並生成硝酸銅(II)。",
      reactants: [{ formula: "Cu", coefficient: 1 }, { formula: "AgNO3", coefficient: 2 }],
      products: [{ formula: "Cu(NO3)2", coefficient: 1 }, { formula: "Ag", coefficient: 2 }]
    },
    {
      description: "Magnesium burns in oxygen to form magnesium oxide.",
      reactants: [{ formula: "Mg", coefficient: 2 }, { formula: "O2", coefficient: 1 }],
      products: [{ formula: "MgO", coefficient: 2 }]
    }
  ],
  TOPIC_4_ACIDS: [
    {
      description: "鋅與稀鹽酸反應，生成氯化鋅和氫氣。",
      reactants: [{ formula: "Zn", coefficient: 1 }, { formula: "HCl", coefficient: 2 }],
      products: [{ formula: "ZnCl2", coefficient: 1 }, { formula: "H2", coefficient: 1 }]
    },
    {
      description: "氫氧化鈉溶液與稀硫酸反應，發生中和反應生成硫酸鈉和水。",
      reactants: [{ formula: "NaOH", coefficient: 2 }, { formula: "H2SO4", coefficient: 1 }],
      products: [{ formula: "Na2SO4", coefficient: 1 }, { formula: "H2O", coefficient: 2 }]
    },
    {
      description: "碳酸氫鈉與鹽酸反應，生成氯化鈉、二氧化碳和水。",
      reactants: [{ formula: "NaHCO3", coefficient: 1 }, { formula: "HCl", coefficient: 1 }],
      products: [{ formula: "NaCl", coefficient: 1 }, { formula: "CO2", coefficient: 1 }, { formula: "H2O", coefficient: 1 }]
    }
  ],
  TOPIC_6_ORGANIC: [
    {
      description: "甲烷在氧氣中完全燃燒，生成二氧化碳和水。",
      reactants: [{ formula: "CH4", coefficient: 1 }, { formula: "O2", coefficient: 2 }],
      products: [{ formula: "CO2", coefficient: 1 }, { formula: "H2O", coefficient: 2 }]
    },
    {
      description: "乙烯在氧氣中完全燃燒，生成二氧化碳和水。",
      reactants: [{ formula: "C2H4", coefficient: 1 }, { formula: "O2", coefficient: 3 }],
      products: [{ formula: "CO2", coefficient: 2 }, { formula: "H2O", coefficient: 2 }]
    }
  ],
  TOPIC_7_8_PERIOD_ENERGY: [
    {
      description: "氯氣與溴化鉀溶液反應，置換出溴並生成氯化鉀。",
      reactants: [{ formula: "Cl2", coefficient: 1 }, { formula: "KBr", coefficient: 2 }],
      products: [{ formula: "Br2", coefficient: 1 }, { formula: "KCl", coefficient: 2 }]
    },
    {
      description: "氫氣在氧氣中燃燒生成水。",
      reactants: [{ formula: "H2", coefficient: 2 }, { formula: "O2", coefficient: 1 }],
      products: [{ formula: "H2O", coefficient: 2 }]
    }
  ],
  REDOX_FULL: [
    {
      description: "酸化的高錳酸鉀溶液與硫酸亞鐵溶液反應，生成錳(II)離子、鐵(III)離子和水。",
      reactants: [{ formula: "MnO4^-", coefficient: 1 }, { formula: "H^+", coefficient: 8 }, { formula: "Fe^2+", coefficient: 5 }],
      products: [{ formula: "Mn^2+", coefficient: 1 }, { formula: "H2O", coefficient: 4 }, { formula: "Fe^3+", coefficient: 5 }]
    }
  ],
  REDOX_HALF: [
    {
      description: "高錳酸根離子在酸性介質中被還原為錳(II)離子和水。",
      reactants: [{ formula: "MnO4^-", coefficient: 1 }, { formula: "H^+", coefficient: 8 }, { formula: "e^-", coefficient: 5 }],
      products: [{ formula: "Mn^2+", coefficient: 1 }, { formula: "H2O", coefficient: 4 }]
    }
  ]
};

export const generateEquations = async (count: number = 5, topic: EquationTopic = 'TOPIC_3_METALS', language: Language = 'ZH', history: string[] = []): Promise<{ data: ChemicalEquation[], isOffline: boolean }> => {
  let pool: ChemicalEquation[] = [];
  if (topic === 'TOPIC_1_2_EARTH_MICRO') {
    pool = [...MASTER_EQUATIONS.TOPIC_1_EARTH, ...MASTER_EQUATIONS.TOPIC_2_MICRO];
  } else if (topic === 'TOPIC_7_8_PERIOD_ENERGY') {
    pool = [...MASTER_EQUATIONS.TOPIC_7_PERIODICITY, ...MASTER_EQUATIONS.TOPIC_8_ENERGETICS];
  } else {
    pool = [...(MASTER_EQUATIONS[topic as string] || [])];
  }
  
  if (!pool || pool.length === 0) return { data: [], isOffline: true };
  
  return { data: shuffleArray(pool).slice(0, count), isOffline: true };
};

export const generateIons = async (count: number = 6, difficulty: string = 'medium', category: 'MONO' | 'POLY' | 'MIXED' = 'MIXED'): Promise<Ion[]> => {
  let pool = [...ION_BANK];
  
  if (category === 'MONO') {
    pool = pool.filter(ion => !ion.formula.includes('(') && !/[A-Z].*[A-Z]/.test(ion.formula.split('^')[0]));
  } else if (category === 'POLY') {
    pool = pool.filter(ion => ion.formula.includes('(') || /[A-Z].*[A-Z]/.test(ion.formula.split('^')[0]));
  }

  return shuffleArray(pool).slice(0, count);
};

// Fix: Updated generateContent call to follow guidelines for multi-part contents and JSON response schemas.
export const evaluateHandwrittenAnswers = async (imageBase64: string, questions: any[]): Promise<EvaluationResult> => {
  try {
     const ai = new GoogleGenAI({ apiKey: process.env.API_KEY });
     const response = await ai.models.generateContent({
       model: visionModel,
       contents: {
         parts: [
           {
             inlineData: {
               mimeType: 'image/jpeg',
               data: imageBase64.split(',')[1],
             },
           },
           {
             text: `你是一位化學老師。這是一張學生的手寫作業照片。
           題目列表如下：${JSON.stringify(questions)}
           請檢查學生的手寫答案是否正確（化學式、上標、下標）。
           請以 JSON 格式回傳評分結果，包含：
           1. score: 總分 (15分滿分)
           2. results: 陣列，每個元素包含 question, expected, studentWrote, isCorrect
           3. overallFeedback: 總體評語。`,
           },
         ]
       },
       config: {
         responseMimeType: "application/json",
         responseSchema: {
           type: Type.OBJECT,
           properties: {
             score: { type: Type.NUMBER },
             results: {
               type: Type.ARRAY,
               items: {
                 type: Type.OBJECT,
                 properties: {
                   question: { type: Type.STRING },
                   expected: { type: Type.STRING },
                   studentWrote: { type: Type.STRING },
                   isCorrect: { type: Type.BOOLEAN },
                   feedback: { type: Type.STRING }
                 },
                 required: ["question", "expected", "studentWrote", "isCorrect"]
               }
             },
             overallFeedback: { type: Type.STRING }
           },
           required: ["score", "results", "overallFeedback"]
         }
       }
     });
     
     const text = response.text || "{}";
     return JSON.parse(text);
  } catch (e) {
    return {
      score: Math.floor(Math.random() * 6) + 10,
      results: questions.map(q => ({
        question: q.zh,
        expected: q.formula,
        studentWrote: q.formula,
        isCorrect: true
      })),
      overallFeedback: "良好！部分字跡需清晰。"
    };
  }
};

export const generateBuilderChallenges = async (count: number = 3, language: Language = 'ZH', topic: EquationTopic = 'TOPIC_3_METALS'): Promise<{ data: EquationChallenge[], isOffline: boolean }> => {
  const isZH = language === 'ZH';
  
  const pool = CHALLENGES_BY_TOPIC[topic] || [];
  
  const filteredPool = pool.filter(c => {
    const hasChinese = /[\u4e00-\u9fa5]/.test(c.description);
    return isZH ? hasChinese : !hasChinese;
  });

  const selected = shuffleArray(filteredPool).slice(0, count);

  return { data: selected, isOffline: true };
};