import fs from 'fs';
import path from 'path';

const distServerDir = path.resolve('dist-server');
if (!fs.existsSync(distServerDir)) {
  fs.mkdirSync(distServerDir, { recursive: true });
}

fs.writeFileSync(
  path.join(distServerDir, 'package.json'),
  JSON.stringify({ type: 'commonjs' }, null, 2)
);

console.log('✓ dist-server/package.json configurado com { "type": "commonjs" }');
