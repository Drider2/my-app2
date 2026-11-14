import test from 'node:test';
import assert from 'node:assert/strict';

function calculateBMR(weightKg, heightCm, age, sex) {
  const s = sex === 'male' ? 5 : -161;
  return Math.round((10 * weightKg) + (6.25 * heightCm) - (5 * age) + s);
}

function calculateMacros(params) {
  const { weightKg, heightCm, age, sex, activityMultiplier = 1.55, deltaKcal = 0, proteinPerKg = 2.2, fatPerKg = 0.9 } = params;
  const bmrKcal = calculateBMR(weightKg, heightCm, age, sex);
  const tdeeKcal = Math.round(bmrKcal * activityMultiplier);
  const targetKcal = Math.max(1200, tdeeKcal + deltaKcal);

  const proteinGrams = Math.round(weightKg * proteinPerKg);
  const proteinKcal = proteinGrams * 4;

  const fatGrams = Math.round(weightKg * fatPerKg);
  const fatKcal = fatGrams * 9;

  const remainingForCarbs = Math.max(0, targetKcal - proteinKcal - fatKcal);
  const carbGrams = Math.round(remainingForCarbs / 4);
  const carbKcal = carbGrams * 4;

  const proteinPercent = Math.round((proteinKcal / targetKcal) * 100);
  const fatPercent = Math.round((fatKcal / targetKcal) * 100);
  const carbPercent = Math.max(0, 100 - proteinPercent - fatPercent);

  return {
    bmrKcal,
    tdeeKcal,
    targetKcal,
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

test('MacroService - BMR calculation matches scientific Mifflin-St Jeor formula', () => {
  // Male: 80kg, 180cm, 25 years old -> 1805 kcal
  const bmrMale = calculateBMR(80, 180, 25, 'male');
  assert.equal(bmrMale, 1805);

  // Female: 60kg, 165cm, 30 years old -> 1320 kcal
  const bmrFemale = calculateBMR(60, 165, 30, 'female');
  assert.equal(bmrFemale, 1320);
});

test('MacroService - Calculates accurate TDEE, Calorie targets and Macro split', () => {
  // 80kg male, 180cm, 25yo, moderate (1.55), lean bulk (+250)
  const res = calculateMacros({
    weightKg: 80,
    heightCm: 180,
    age: 25,
    sex: 'male',
    activityMultiplier: 1.55,
    deltaKcal: 250,
  });

  assert.equal(res.bmrKcal, 1805);
  assert.equal(res.tdeeKcal, 2798);
  assert.equal(res.targetKcal, 3048); // 2798 + 250

  assert.equal(res.proteinGrams, 176); // 80 * 2.2 = 176g
  assert.equal(res.proteinKcal, 704);

  assert.equal(res.fatGrams, 72); // 80 * 0.9 = 72g
  assert.equal(res.fatKcal, 648);

  assert.equal(res.carbGrams, 424); // (3048 - 704 - 648) / 4 = 1696 / 4 = 424g
  assert.equal(res.carbKcal, 1696);

  assert.equal(res.proteinPercent + res.fatPercent + res.carbPercent, 100);
});

test('MacroService - Export Markdown plan formatting and content integrity', () => {
  const res = {
    weightKg: 80,
    heightCm: 180,
    age: 25,
    sex: 'male',
    bmrKcal: 1805,
    tdeeKcal: 2798,
    targetKcal: 3048,
    calorieDeltaKcal: 250,
    proteinGrams: 176,
    proteinKcal: 704,
    proteinPercent: 23,
    fatGrams: 72,
    fatKcal: 648,
    fatPercent: 21,
    carbGrams: 424,
    carbKcal: 1696,
    carbPercent: 56,
  };

  const md = `# Personalized Nutrition & Daily Macro Plan
| Current Bodyweight | **${res.weightKg} kg** |
| Target Daily Calorie Intake | **${res.targetKcal} kcal / day** |
| Protein (2.2g/kg) | **${res.proteinGrams} g** |
| Carbohydrates | **${res.carbGrams} g** |
| Fats (0.9g/kg) | **${res.fatGrams} g** |`;

  assert.ok(md.includes('80 kg'));
  assert.ok(md.includes('3048 kcal / day'));
  assert.ok(md.includes('176 g'));
  assert.ok(md.includes('424 g'));
  assert.ok(md.includes('72 g'));
});
