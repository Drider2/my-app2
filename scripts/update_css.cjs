const fs = require('fs');
let css = fs.readFileSync('src/index.css', 'utf8');
const target = '  --z-toast: 70;\r\n}';
const addition = `  --z-toast: 70;
}

/* ======================================================== */
/* 0B. THREE RESPONSIVE LAYOUT SIZES (Phone, Wide, Tablet)  */
/* ======================================================== */
:root,
html[data-layout="phone"],
html:not([data-layout]) {
  --page-max: 430px;
  --gutter: 14px;
  --nav-w: 0px;
  --card-gap: 12px;
}

html[data-layout="wide"] {
  --page-max: 760px;
  --gutter: 20px;
  --nav-w: 0px;
  --card-gap: 14px;
}

html[data-layout="tablet"] {
  --page-max: 1280px;
  --gutter: 28px;
  --nav-w: 96px;
  --card-gap: 16px;
}`;

if (css.includes(target)) {
  css = css.replace(target, addition);
  fs.writeFileSync('src/index.css', css, 'utf8');
  console.log('Successfully updated src/index.css');
} else {
  // Try LF if CRLF did not match
  const targetLF = '  --z-toast: 70;\n}';
  if (css.includes(targetLF)) {
    css = css.replace(targetLF, addition);
    fs.writeFileSync('src/index.css', css, 'utf8');
    console.log('Successfully updated src/index.css with LF');
  } else {
    console.error('Target not found');
  }
}
