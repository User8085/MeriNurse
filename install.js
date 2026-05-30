const { execSync } = require('child_process');
const path = require('path');

const options = { stdio: 'inherit', shell: true };

console.log('Installing client dependencies...');
try {
  execSync('npm install', { ...options, cwd: path.join(__dirname, 'client') });
} catch (err) {
  console.error('Failed to install client dependencies:', err);
  process.exit(1);
}

console.log('Installing server dependencies...');
try {
  execSync('npm install', { ...options, cwd: path.join(__dirname, 'server') });
} catch (err) {
  console.error('Failed to install server dependencies:', err);
  process.exit(1);
}

console.log('All dependencies installed successfully!');
