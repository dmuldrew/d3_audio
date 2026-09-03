const fs = require('fs');
const path = require('path');

const btnHtml = '<button id="btn-audio-activate" class="btn-enable-audio" style="background: #f59e0b; color: #030712; font-weight: 800; border: none; padding: 0.4rem 0.85rem; border-radius: 6px; cursor: pointer; font-size: 0.8rem; display: inline-flex; align-items: center; gap: 0.35rem; transition: background 0.2s;">🔊 Enable Audio</button>';

const scriptTag = '  <script src="../enable-audio.js"></script>';

const dirs = fs.readdirSync('examples').filter(f => fs.statSync(path.join('examples', f)).isDirectory()).sort();

dirs.forEach(d => {
  const file = path.join('examples', d, 'index.html');
  let content = fs.readFileSync(file, 'utf8');

  // 1. Add script before </body> if not present
  if (!content.includes('enable-audio.js')) {
    content = content.replace(/<\/body>/, scriptTag + '\n</body>');
  }

  // 2. Check header
  const headerMatch = content.match(/<header>([\s\S]*?)<\/header>/);
  if (!headerMatch) return;

  const origHeader = headerMatch[0];
  let newHeader = origHeader;

  const inner = headerMatch[1];
  const firstDivEnd = inner.indexOf('</div>');
  if (firstDivEnd !== -1) {
    const titleDiv = inner.slice(0, firstDivEnd + 6);
    const rest = inner.slice(firstDivEnd + 6).trim();

    // Check if button is already inside this header
    if (!origHeader.includes('btn-audio-activate')) {
      if (rest.length > 0) {
        if (rest.startsWith('<div') && rest.endsWith('</div>')) {
          const innerRest = rest.replace(/^<div[^>]*>/, '').replace(/<\/div>$/, '').trim();
          newHeader = '<header>' + titleDiv + '\n      <div style="display: flex; gap: 0.75rem; align-items: center;">\n        ' + btnHtml + '\n        ' + innerRest + '\n      </div>\n    </header>';
        } else {
          newHeader = '<header>' + titleDiv + '\n      <div style="display: flex; gap: 0.75rem; align-items: center;">\n        ' + btnHtml + '\n        ' + rest + '\n      </div>\n    </header>';
        }
      } else {
        newHeader = '<header>' + titleDiv + '\n      <div>\n        ' + btnHtml + '\n      </div>\n    </header>';
      }
    }
  }

  content = content.replace(origHeader, newHeader);
  fs.writeFileSync(file, content, 'utf8');
  console.log('Processed', d);
});
console.log('All example pages updated with Enable Audio button!');
