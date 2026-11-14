import { db, getTodayLocalDate } from './storage';

export type FitnessGoal = 'aggressive_cut' | 'lean_cut' | 'maintenance' | 'lean_bulk' | 'aggressive_bulk';
export type ActivityLevel = 'sedentary' | 'light' | 'moderate' | 'very_active' | 'athlete';
export type BiologicalSex = 'male' | 'female';

export interface FitnessGoalMeta {
  id: FitnessGoal;
  label: string;
  deltaKcal: number;
  badge: string;
  description: string;
}

export interface ActivityLevelMeta {
  id: ActivityLevel;
  label: string;
  multiplier: number;
  description: string;
}

export interface MacroTargetResult {
  weightKg: number;
  heightCm: number;
  age: number;
  sex: BiologicalSex;
  activityLevel: ActivityLevel;
  goal: FitnessGoal;

  bmrKcal: number;
  tdeeKcal: number;
  targetKcal: number;
  calorieDeltaKcal: number;

  proteinGrams: number;
  proteinKcal: number;
  proteinPercent: number;

  fatGrams: number;
  fatKcal: number;
  fatPercent: number;

  carbGrams: number;
  carbKcal: number;
  carbPercent: number;
}

export class MacroService {
  static readonly GOALS: Record<FitnessGoal, FitnessGoalMeta> = {
    aggressive_cut: {
      id: 'aggressive_cut',
      label: 'Aggressive Fat Loss (-500 kcal)',
      deltaKcal: -500,
      badge: 'Aggressive Cut',
      description: 'Rapid fat loss deficit while sparing lean contractile muscle mass.',
    },
    lean_cut: {
      id: 'lean_cut',
      label: 'Steady Lean Cut (-300 kcal)',
      deltaKcal: -300,
      badge: 'Lean Cut',
      description: 'Gentle caloric deficit preserving maximum gym strength and performance.',
    },
    maintenance: {
      id: 'maintenance',
      label: 'Body Recomposition & Maintenance (0 kcal)',
      deltaKcal: 0,
      badge: 'Maintenance',
      description: 'Energy balance to optimize workout recovery and recomposition.',
    },
    lean_bulk: {
      id: 'lean_bulk',
      label: 'Controlled Hypertrophy Bulk (+250 kcal)',
      deltaKcal: 250,
      badge: 'Lean Bulk',
      description: 'Clean caloric surplus for steady muscle gain with minimal fat accumulation.',
    },
    aggressive_bulk: {
      id: 'aggressive_bulk',
      label: 'High-Volume Mass Gain (+500 kcal)',
      deltaKcal: 500,
      badge: 'Mass Bulk',
      description: 'Maximum surplus for hardgainers or heavy high-volume strength blocks.',
    },
  };

  static readonly ACTIVITY_LEVELS: Record<ActivityLevel, ActivityLevelMeta> = {
    sedentary: {
      id: 'sedentary',
      label: 'Sedentary (1.2x)',
      multiplier: 1.2,
      description: 'Desk job, minimal daily movement, no formal gym training.',
    },
    light: {
      id: 'light',
      label: 'Lightly Active (1.375x)',
      multiplier: 1.375,
      description: 'Light exercise or 1–3 gym sessions per week.',
    },
    moderate: {
      id: 'moderate',
      label: 'Moderately Active (1.55x)',
      multiplier: 1.55,
      description: 'Consistent strength training 3–5 days per week.',
    },
    very_active: {
      id: 'very_active',
      label: 'Very Active (1.725x)',
      multiplier: 1.725,
      description: 'Heavy lifting or athletic training 6–7 days per week.',
    },
    athlete: {
      id: 'athlete',
      label: 'Extremely Active / Athlete (1.9x)',
      multiplier: 1.9,
      description: 'Physical occupation combined with high-intensity two-a-day training.',
    },
  };

  /**
   * Retrieves the user's latest recorded bodyweight from storage
   */
  static getLatestBodyweightKg(): number {
    const state = db.getState();
    const entries = state.bodyweightEntries || [];
    if (entries.length === 0) return 78.5; // sensible default
    // Find latest by local_date or created_at
    const sorted = [...entries].sort((a, b) => (b.local_date || '').localeCompare(a.local_date || ''));
    return sorted[0].weight_kg || 78.5;
  }

  /**
   * Calculates BMR using Mifflin-St Jeor equation
   */
  static calculateBMR(weightKg: number, heightCm: number, age: number, sex: BiologicalSex): number {
    const s = sex === 'male' ? 5 : -161;
    return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + s);
  }

  /**
   * Calculates TDEE and tailored Macro split
   */
  static calculateMacros(params: {
    weightKg: number;
    heightCm: number;
    age: number;
    sex: BiologicalSex;
    activityLevel: ActivityLevel;
    goal: FitnessGoal;
    proteinPerKg?: number;
    fatPerKg?: number;
  }): MacroTargetResult {
    const {
      weightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      goal,
      proteinPerKg = 2.2,
      fatPerKg = 0.9,
    } = params;

    const bmrKcal = this.calculateBMR(weightKg, heightCm, age, sex);
    const multiplier = this.ACTIVITY_LEVELS[activityLevel]?.multiplier || 1.55;
    const tdeeKcal = Math.round(bmrKcal * multiplier);

    const goalMeta = this.GOALS[goal] || this.GOALS.maintenance;
    const targetKcal = Math.max(1200, tdeeKcal + goalMeta.deltaKcal);

    // Protein: 2.2g / kg (4 kcal / g)
    const proteinGrams = Math.round(weightKg * proteinPerKg);
    const proteinKcal = proteinGrams * 4;

    // Fats: 0.9g / kg (9 kcal / g)
    const fatGrams = Math.round(weightKg * fatPerKg);
    const fatKcal = fatGrams * 9;

    // Carbohydrates: remaining calories divided by 4 kcal/g
    const remainingForCarbs = Math.max(0, targetKcal - proteinKcal - fatKcal);
    const carbGrams = Math.round(remainingForCarbs / 4);
    const carbKcal = carbGrams * 4;

    // Percentage of total calories
    const proteinPercent = Math.round((proteinKcal / targetKcal) * 100);
    const fatPercent = Math.round((fatKcal / targetKcal) * 100);
    const carbPercent = Math.max(0, 100 - proteinPercent - fatPercent);

    return {
      weightKg,
      heightCm,
      age,
      sex,
      activityLevel,
      goal,
      bmrKcal,
      tdeeKcal,
      targetKcal,
      calorieDeltaKcal: goalMeta.deltaKcal,
      proteinGrams,
      proteinKcal,
      proteinPercent,
      fatGrams,
      fatKcal,
      fatPercent,
      carbGrams,
      carbKcal,
      carbPercent,
    };
  }

  static exportNutritionPlanMd(res: MacroTargetResult): string {
    const today = getTodayLocalDate();
    return `# Personalized Nutrition & Daily Macro Plan
**Date:** ${today}
**Application:** GreenDream Body & Gym Analytics

---

## ⚡ Energy & Metabolic Targets
| Parameter | Value |
| :--- | :--- |
| **Current Bodyweight** | **${res.weightKg} kg** |
| **Height & Age** | **${res.heightCm} cm** • **${res.age} years old (${res.sex})** |
| **Activity Level** | **${this.ACTIVITY_LEVELS[res.activityLevel].label}** |
| **Selected Goal** | **${this.GOALS[res.goal].label}** |
| **Basal Metabolic Rate (BMR)** | **${res.bmrKcal} kcal / day** |
| **Total Daily Energy Expenditure (TDEE)** | **${res.tdeeKcal} kcal / day** |
| **Target Daily Calorie Intake** | **${res.targetKcal} kcal / day** (${res.calorieDeltaKcal >= 0 ? '+' : ''}${res.calorieDeltaKcal} kcal) |

---

## 🍗 Daily Macronutrient Split
| Macronutrient | Grams Target | Calories | % of Total Energy | Ideal Sources |
| :--- | :--- | :--- | :--- | :--- |
| **Protein (2.2g/kg)** | **${res.proteinGrams} g** | ${res.proteinKcal} kcal | ${res.proteinPercent}% | Chicken breast, eggs, whey, tuna, Greek yogurt, beef |
| **Carbohydrates** | **${res.carbGrams} g** | ${res.carbKcal} kcal | ${res.carbPercent}% | Oats, basmati rice, sweet potatoes, bananas, whole wheat |
| **Fats (0.9g/kg)** | **${res.fatGrams} g** | ${res.fatKcal} kcal | ${res.fatPercent}% | Extra virgin olive oil, almonds, avocados, peanut butter, whole eggs |

---

### 💡 Execution Directives
- **Pre-Workout Fuel**: Consume 30–50g complex carbohydrates 60–90 minutes before heavy lifting.
- **Post-Workout Recovery**: Prioritize 30–40g fast-digesting protein within 2 hours post-session.
- **Hydration Protocol**: Maintain minimum 2.5–3.5 Liters of water daily to support glycogen synthesis and creatine transport.

*Generated autonomously via GreenDream Sports Science Engine.*
`;
  }

  static exportMacroCsv(res: MacroTargetResult): string {
    const headers = ['Metric', 'Value', 'Unit', 'Percentage'];
    const rows = [
      ['Bodyweight', res.weightKg.toString(), 'kg', ''],
      ['Height', res.heightCm.toString(), 'cm', ''],
      ['Age', res.age.toString(), 'years', ''],
      ['BMR', res.bmrKcal.toString(), 'kcal', ''],
      ['TDEE', res.tdeeKcal.toString(), 'kcal', ''],
      ['Target Calories', res.targetKcal.toString(), 'kcal', ''],
      ['Calorie Delta', res.calorieDeltaKcal.toString(), 'kcal', ''],
      ['Protein', res.proteinGrams.toString(), 'grams', `${res.proteinPercent}%`],
      ['Fats', res.fatGrams.toString(), 'grams', `${res.fatPercent}%`],
      ['Carbohydrates', res.carbGrams.toString(), 'grams', `${res.carbPercent}%`],
    ];

    return [headers.join(','), ...rows.map(r => r.join(','))].join('\n');
  }
}
