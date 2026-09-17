const { execSync } = require('child_process');

const name = process.argv[2];

if (!name) {
  console.error('Usage: npm run generate-module -- <name>');
  process.exit(1);
}

const path = `modules/${name}`;

try {
  execSync(`npx nest g module ${path}`, { stdio: 'inherit' });
  execSync(`npx nest g controller ${path} --no-spec`, { stdio: 'inherit' });
  execSync(`npx nest g service ${path} --no-spec`, { stdio: 'inherit' });
  execSync(`npx nest g class ${path}/dto/create-${name}.dto --no-spec --flat`, {
    stdio: 'inherit',
  });
  execSync(`npx nest g class ${path}/dto/update-${name}.dto --no-spec --flat`, {
    stdio: 'inherit',
  });
  console.log(`Module created at src/${path}`);
} catch (error) {
  console.error(error.message);
  process.exit(1);
}
