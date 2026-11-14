const fs = require('fs');
let code = fs.readFileSync('src/services/i18n.ts', 'utf8');

const enTarget = "      textSize: 'Text Size',";
const enAddition = `      displaySize: 'Display size',
      displaySizeDesc: 'Choose layout size or adapt automatically to screen width',
      displayAuto: 'Auto',
      displayAutoDesc: 'Follows device screen width dynamically',
      displayPhone: 'Phone',
      displayPhoneDesc: 'Compact single-column layout (max 430px)',
      displayWide: 'Wide',
      displayWideDesc: 'Spacious single column with grid cards (max 760px)',
      displayTablet: 'Tablet',
      displayTabletDesc: 'Multi-pane layout with side navigation rail (max 1280px)',
      displayDowngradedTabletToPhone: 'Tablet layout needs a wider screen, using Phone',
      displayDowngradedTabletToWide: 'Tablet layout needs a wider screen, using Wide',
      displayDowngradedWideToPhone: 'Wide layout needs a wider screen, using Phone',
      textSize: 'Text Size',`;

const frTarget = "      textSize: 'Taille du Texte',";
const frAddition = `      displaySize: "Taille d'affichage",
      displaySizeDesc: "Choisir la disposition ou adapter selon la largeur d'écran",
      displayAuto: 'Auto',
      displayAutoDesc: "S'adapte dynamiquement à la largeur de l'écran",
      displayPhone: 'Téléphone',
      displayPhoneDesc: 'Disposition compacte à colonne unique (max 430px)',
      displayWide: 'Large',
      displayWideDesc: 'Colonne spacieuse avec cartes en grille (max 760px)',
      displayTablet: 'Tablette',
      displayTabletDesc: 'Disposition multi-volets avec rail de navigation (max 1280px)',
      displayDowngradedTabletToPhone: 'La disposition Tablette nécessite un écran plus large, affichage en Téléphone',
      displayDowngradedTabletToWide: 'La disposition Tablette nécessite un écran plus large, affichage en Large',
      displayDowngradedWideToPhone: 'La disposition Large nécessite un écran plus large, affichage en Téléphone',
      textSize: 'Taille du Texte',`;

const arTarget = "      textSize: 'حجم الخط',";
const arAddition = `      displaySize: 'حجم العرض والتخطيط',
      displaySizeDesc: 'اختر حجم التخطيط أو التكيف تلقائياً مع عرض الشاشة',
      displayAuto: 'تلقائي',
      displayAutoDesc: 'يتكيف تلقائياً حسب عرض الشاشة الحالي',
      displayPhone: 'هاتف',
      displayPhoneDesc: 'تخطيط عمود واحد مدمج للهواتف (أقصى عرض 430px)',
      displayWide: 'عريض',
      displayWideDesc: 'عمود متسع مع شبكة بطاقات (أقصى عرض 760px)',
      displayTablet: 'جهاز لوحي',
      displayTabletDesc: 'تخطيط واسع مع شريط تنقل جانبي (أقصى عرض 1280px)',
      displayDowngradedTabletToPhone: 'تخطيط الجهاز اللوحي يتطلب شاشة أوسع، يتم استخدام تخطيط الهاتف',
      displayDowngradedTabletToWide: 'تخطيط الجهاز اللوحي يتطلب شاشة أوسع، يتم استخدام تخطيط العريض',
      displayDowngradedWideToPhone: 'تخطيط العريض يتطلب شاشة أوسع، يتم استخدام تخطيط الهاتف',
      textSize: 'حجم الخط',`;

if (code.includes(enTarget)) {
  code = code.replace(enTarget, enAddition);
  console.log('EN keys inserted');
} else {
  console.error('EN target not found');
}

if (code.includes(frTarget)) {
  code = code.replace(frTarget, frAddition);
  console.log('FR keys inserted');
} else {
  console.error('FR target not found');
}

if (code.includes(arTarget)) {
  code = code.replace(arTarget, arAddition);
  console.log('AR keys inserted');
} else {
  console.error('AR target not found');
}

fs.writeFileSync('src/services/i18n.ts', code, 'utf8');
console.log('Successfully updated src/services/i18n.ts');
