const fs = require('fs');
const path = require('path');

function resolveCoreRoot() {
  const candidates = [
    path.resolve(process.cwd(), 'prophet-core'),
    path.resolve(process.cwd(), '..', 'prophet-core'),
    path.resolve(process.cwd(), 'node_modules', 'prophet-core'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) {
      return candidate;
    }
  }

  throw new Error('Could not locate prophet-core. Add it as a submodule at ./prophet-core or keep it beside prophet-automation.');
}

function readTemplate(templateKey = 'follow_up') {
  const normalized = String(templateKey || 'follow_up').trim().toLowerCase().replace(/\s+/g, '_');
  const root = resolveCoreRoot();

  const templatePath = path.join(root, 'templates', 'email', `${normalized}.md`);
  if (fs.existsSync(templatePath)) {
    return fs.readFileSync(templatePath, 'utf8');
  }

  const fallbackPath = path.join(root, 'templates', 'email', 'follow_up.md');
  if (fs.existsSync(fallbackPath)) {
    return fs.readFileSync(fallbackPath, 'utf8');
  }

  throw new Error(`No template found for key '${normalized}' and no follow_up fallback in prophet-core.`);
}

module.exports = {
  readTemplate,
};
