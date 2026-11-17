import type {
  ITranslationAdapter,
  SupportedLanguagesResult,
  TranslationRequest,
  TranslationResult,
} from './interfaces.js';

export class MockBhashiniAdapter implements ITranslationAdapter {
  private readonly glossary: Record<string, Record<string, string>> = {
    'Scholarship Application': {
      hi: 'छात्रवृत्ति आवेदन',
      sat: 'ᱥᱠᱚᱞᱟᱨᱥᱤᱯ ᱟᱨᱫᱟᱥ',
      or: 'ଛାତ୍ରବୃତ୍ତି ଆବେଦନ',
      bn: 'বৃত্তি আবেদন',
      te: 'స్కాలర్‌షిప్ దరఖాస్తు',
    },
    'National Fellowship for ST Students': {
      hi: 'अनुसूचित जनजाति छात्रों के लिए राष्ट्रीय फैलोशिप (एनएफएसटी)',
      sat: 'ᱮᱥᱴᱤ ᱯᱟᱹᱴᱷᱩᱣᱟᱹ ᱠᱚ ᱞᱟᱹᱜᱤᱫ ᱡᱟᱹᱛᱤᱭᱟᱹᱨᱤ ᱯᱷᱮᱞᱳᱥᱤᱯ',
      or: 'ଅନୁସୂଚିତ ଜନଜାତି ଛାତ୍ରଙ୍କ ପାଇଁ ଜାତୀୟ ଫେଲୋସିପ୍',
      bn: 'এসটি শিক্ষার্থীদের জন্য জাতীয় ফেলোশিপ',
      te: 'ఎస్టీ విద్యార్థులకు జాతీయ ఫెలోషిప్',
    },
    'Caste Certificate': {
      hi: 'जाति प्रमाण पत्र',
      sat: 'ᱡᱟᱹᱛ ᱥᱟᱨᱴᱤᱯᱷᱤᱠᱮᱴ',
      or: 'ଜାତି ପ୍ରମାଣପତ୍ର',
      bn: 'জাতি শংসাপত্র',
      te: 'కుల ధృవీకరణ పత్రం',
    },
    'Income Certificate': {
      hi: 'आय प्रमाण पत्र',
      sat: 'ᱟᱨᱡᱟᱣ ᱥᱟᱨᱴᱤᱯᱷᱤᱠᱮᱴ',
      or: 'ଆୟ ପ୍ରମାଣପତ୍ର',
      bn: 'আয় শংসাপত্র',
      te: 'ఆదాయ ధృవీకరణ పత్రం',
    },
    'Document deficiency flagged': {
      hi: 'दस्तावेज़ में त्रुटि चिह्नित की गई है',
      sat: 'ᱫᱚᱞᱤᱞ ᱨᱮ ᱠᱷᱟᱹᱢᱛᱤ ᱪᱤᱱᱦᱟᱹᱣ ᱟᱠᱟᱱᱟ',
      or: 'ଦଲିଲରେ ତ୍ରୁଟି ଚିହ୍ନଟ ହୋଇଛି',
      bn: 'নথিতে ত্রুটি চিহ্নিত করা হয়েছে',
      te: 'పత్రంలో లోపం గుర్తించబడింది',
    },
    'Application Verified Successfully': {
      hi: 'आवेदन सफलतापूर्वक सत्यापित किया गया',
      sat: 'ᱟᱨᱫᱟᱥ ᱥᱟᱹᱛ ᱞᱮᱠᱟᱛᱮ ᱪᱷᱟᱹᱴᱭᱟᱹᱨ ᱮᱱᱟ',
      or: 'ଆବେଦନ ସଫଳତାର ସହିତ ଯାଞ୍ଚ ହୋଇଛି',
      bn: 'আবেদন সফলভাবে যাচাই করা হয়েছে',
      te: 'దరఖాస్తు విజయవంతంగా ధృవీకరించబడింది',
    },
  };

  /**
   * Deterministically translates text using the BHASHINI mock engine.
   */
  async translateText(params: TranslationRequest): Promise<TranslationResult> {
    const trimmedText = params.text.trim();
    const targetLang = params.targetLanguage.toLowerCase().trim();
    const sourceLang = params.sourceLanguage.toLowerCase().trim();

    let translatedText: string;

    if (sourceLang === targetLang) {
      translatedText = trimmedText;
    } else if (this.glossary[trimmedText]?.[targetLang]) {
      translatedText = this.glossary[trimmedText][targetLang]!;
    } else {
      // Deterministic synthetic translation string
      translatedText = `[BHASHINI-${targetLang.toUpperCase()}]: ${trimmedText}`;
    }

    return {
      isSimulatedMock: true,
      sourceLanguage: sourceLang,
      targetLanguage: targetLang,
      originalText: trimmedText,
      translatedText,
      confidenceScore: 0.94,
      engine: 'BHASHINI-NMT-TRIBAL-V2 (Simulated)',
    };
  }

  /**
   * Returns catalog of supported Indic and regional Scheduled Tribe languages.
   */
  async getSupportedLanguages(): Promise<SupportedLanguagesResult> {
    return {
      isSimulatedMock: true,
      languages: [
        { code: 'en', name: 'English', nativeName: 'English', isTribalLanguage: false },
        { code: 'hi', name: 'Hindi', nativeName: 'हिन्दी', isTribalLanguage: false },
        { code: 'sat', name: 'Santali (Ol Chiki)', nativeName: 'ᱥᱟᱱᱛᱟᱲᱤ', isTribalLanguage: true },
        { code: 'or', name: 'Odia', nativeName: 'ଓଡ଼ିଆ', isTribalLanguage: false },
        { code: 'bn', name: 'Bengali', nativeName: 'বাংলা', isTribalLanguage: false },
        { code: 'te', name: 'Telugu', nativeName: 'తెలుగు', isTribalLanguage: false },
        { code: 'mr', name: 'Marathi', nativeName: 'मराठी', isTribalLanguage: false },
        { code: 'gu', name: 'Gujarati', nativeName: 'ગુજરાતી', isTribalLanguage: false },
        { code: 'gon', name: 'Gondi', nativeName: 'गोण्डी', isTribalLanguage: true },
        { code: 'hoc', name: 'Ho', nativeName: '𑢹𑣉', isTribalLanguage: true },
        { code: 'unr', name: 'Mundari', nativeName: 'मुंडारी', isTribalLanguage: true },
        { code: 'brx', name: 'Bodo', nativeName: 'बड़ो', isTribalLanguage: true },
      ],
    };
  }
}

export const mockBhashiniAdapter = new MockBhashiniAdapter();
