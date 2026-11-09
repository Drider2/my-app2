// ========================================================
// Voice Intent Service: Spoken Confirmation & Intent Parsing
// Detects YES/NO confirmation intents in EN, FR, AR
// Generates natural tri-lingual voice prompts for write actions
// ========================================================

export type SpokenIntent = 'yes' | 'no' | 'neutral';

/**
 * Normalizes text by removing diacritics, punctuation, extra spaces, and lowercase
 */
export function normalizeVoiceInput(text: string): string {
  if (!text) return '';
  return text
    .toLowerCase()
    // Normalize Arabic letters (hamzas, alefs, teh marbuta)
    .replace(/[أإآٱ]/g, 'ا')
    .replace(/ة/g, 'ه')
    .replace(/ى/g, 'ي')
    // Remove punctuation
    .replace(/[.,\/#!$%\^&\*;:{}=\-_`~()؟?،!]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

/**
 * Detects whether spoken input represents an affirmation (YES) or rejection (NO)
 * Works across English, French, and Arabic.
 */
export function detectConfirmationIntent(text: string): SpokenIntent {
  const normalized = normalizeVoiceInput(text);
  if (!normalized) return 'neutral';

  const tokens = normalized.split(' ');

  // English affirmative
  const enAffirmative = [
    'yes', 'yeah', 'yep', 'yup', 'sure', 'ok', 'okay', 
    'confirm', 'confirmed', 'proceed', 'do it', 'go ahead', 
    'affirmative', 'accept', 'save', 'save it', 'add it', 'correct', 'right'
  ];

  // English negative
  const enNegative = [
    'no', 'nope', 'nah', 'cancel', 'stop', 'dont', "don't", 
    'abort', 'nevermind', 'never mind', 'refuse', 'discard', 'negative'
  ];

  // French affirmative
  const frAffirmative = [
    'oui', 'ouais', 'daccord', "d'accord", 'confirmer', 'confirme', 
    'fais le', 'fais-le', 'vas y', 'vas-y', 'valider', 'valide', 
    'enregistre', 'enregistrer', 'bien sur', 'exact', 'c est bon'
  ];

  // French negative
  const frNegative = [
    'non', 'annuler', 'annule', 'stop', 'arrete', 'arrête', 
    'ne fais pas ca', 'ne fais pas ça', 'laisse tomber', 'refuse', 'refuser'
  ];

  // Arabic affirmative (normalized)
  const arAffirmative = [
    'نعم', 'موافق', 'تاكيد', 'اكد', 'سجل', 'نفذ', 'تمام', 
    'حسنا', 'ايوه', 'ايوة', 'اجل', 'واصل', 'سجلها', 'ضيفها', 'احفظ'
  ];

  // Arabic negative (normalized)
  const arNegative = [
    'لا', 'الغاء', 'توقف', 'تراجع', 'ارفض', 'لا تفعل', 'بلاش', 
    'ما تسجلش', 'ما تسجل', 'كلا', 'الغي'
  ];

  // Check exact token or phrase matches
  for (const token of tokens) {
    if (arAffirmative.includes(token) || frAffirmative.includes(token) || enAffirmative.includes(token)) {
      return 'yes';
    }
    if (arNegative.includes(token) || frNegative.includes(token) || enNegative.includes(token)) {
      return 'no';
    }
  }

  // Check multi-word phrase contains
  const fullText = ` ${normalized} `;
  for (const phrase of [...enAffirmative, ...frAffirmative, ...arAffirmative]) {
    if (fullText.includes(` ${phrase} `)) return 'yes';
  }
  for (const phrase of [...enNegative, ...frNegative, ...arNegative]) {
    if (fullText.includes(` ${phrase} `)) return 'no';
  }

  return 'neutral';
}

/**
 * Generates natural spoken summaries for tool proposals in EN, FR, and AR
 */
export function generateSpokenSummaryForTool(
  toolName: string,
  params: Record<string, any> = {},
  lang: 'en' | 'fr' | 'ar' = 'en',
  currency: string = 'DA'
): string {
  switch (toolName) {
    case 'add_expense': {
      const amount = params.amount || 0;
      const note = params.note || (lang === 'fr' ? 'Dépense' : lang === 'ar' ? 'مصروف' : 'Expense');
      if (lang === 'fr') {
        return `J'ai préparé l'enregistrement d'une dépense de ${amount} ${currency} pour ${note}. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت تسجيل مصروف بقيمة ${amount} ${currency} لـ ${note}. هل أؤكد ذلك؟`;
      }
      return `I've prepared to log an expense of ${amount} ${currency} for ${note}. Should I confirm this?`;
    }

    case 'add_income': {
      const amount = params.amount || 0;
      const note = params.note || (lang === 'fr' ? 'Revenu' : lang === 'ar' ? 'دخل' : 'Income');
      if (lang === 'fr') {
        return `J'ai préparé l'enregistrement d'un revenu de ${amount} ${currency} pour ${note}. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت تسجيل دخل بقيمة ${amount} ${currency} لـ ${note}. هل أؤكد ذلك؟`;
      }
      return `I've prepared to log an income of ${amount} ${currency} for ${note}. Should I confirm this?`;
    }

    case 'mark_prayer': {
      const prayer = params.prayer || 'prayer';
      if (lang === 'fr') {
        return `J'ai préparé la confirmation de la prière de ${prayer}. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت تسجيل صلاة ${prayer} كمكتملة. هل أؤكد ذلك؟`;
      }
      return `I've prepared to mark ${prayer} prayer as completed. Should I confirm this?`;
    }

    case 'log_weight': {
      const weight = params.weight_kg || params.weight || 0;
      if (lang === 'fr') {
        return `J'ai préparé l'enregistrement de votre poids à ${weight} kilos. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت تسجيل وزنك ${weight} كغ. هل أؤكد ذلك؟`;
      }
      return `I've prepared to log your weight as ${weight} kilograms. Should I confirm this?`;
    }

    case 'add_task': {
      const title = params.title || 'Task';
      if (lang === 'fr') {
        return `J'ai préparé l'ajout de la tâche : ${title}. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت إضافة المهمة : ${title}. هل أؤكد ذلك؟`;
      }
      return `I've prepared to add the task "${title}". Should I confirm this?`;
    }

    case 'create_goal': {
      const name = params.name || 'Savings Goal';
      const target = params.target_amount || 0;
      if (lang === 'fr') {
        return `J'ai préparé l'objectif d'épargne "${name}" de ${target} ${currency}. Dois-je confirmer ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت هدف الادخار "${name}" بمبلغ ${target} ${currency}. هل أؤكد ذلك؟`;
      }
      return `I've prepared to create a savings goal "${name}" for ${target} ${currency}. Should I confirm this?`;
    }

    case 'save_memory_note': {
      const note = params.note || '';
      if (lang === 'fr') {
        return `Je vais mémoriser : "${note}". Dois-je enregistrer cette note ?`;
      }
      if (lang === 'ar') {
        return `سأحفظ في الذاكرة : "${note}". هل أؤكد الحفظ؟`;
      }
      return `I'll remember: "${note}". Should I save this memory?`;
    }

    default: {
      const readableName = toolName.replace(/_/g, ' ');
      if (lang === 'fr') {
        return `J'ai préparé l'action : ${readableName}. Dois-je exécuter ?`;
      }
      if (lang === 'ar') {
        return `لقد جهزت الإجراء : ${readableName}. هل أقوم بالتنفيذ؟`;
      }
      return `I've prepared the action: ${readableName}. Should I proceed?`;
    }
  }
}
