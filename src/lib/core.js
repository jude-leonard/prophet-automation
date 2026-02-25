const fs = require('fs');
const path = require('path');

const BUILTIN_FOLLOW_UP_TEMPLATE = [
  'Hi {{first_name}},',
  '',
  'Quick follow-up on your recent request.',
  '',
  'If you are still interested, reply here and we can get everything lined up for next steps.',
  '',
  'Best,',
  '{{last_name}}',
].join('\n');

function resolveCoreRoot() {
  const candidates = [
    path.resolve(process.cwd(), 'prophet-core'),
    path.resolve(process.cwd(), '..', 'prophet-core'),
    path.resolve(process.cwd(), 'node_modules', 'prophet-core'),
  ];

  for (const candidate of candidates) {
    if (fs.existsSync(candidate)) return candidate;
  }
  return null;
}

function readIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) return null;
  return fs.readFileSync(filePath, 'utf8');
}

function readTemplate(templateKey = 'follow_up') {
  const normalized = String(templateKey || 'follow_up').trim().toLowerCase().replace(/\s+/g, '_');

  const localTemplatePath = path.join(process.cwd(), 'templates', 'email', `${normalized}.md`);
  const localFallbackPath = path.join(process.cwd(), 'templates', 'email', 'follow_up.md');
  const localTemplate = readIfExists(localTemplatePath) || readIfExists(localFallbackPath);
  if (localTemplate) return localTemplate;

  const root = resolveCoreRoot();
  if (root) {
    const coreTemplatePath = path.join(root, 'templates', 'email', `${normalized}.md`);
    const coreFallbackPath = path.join(root, 'templates', 'email', 'follow_up.md');
    const coreTemplate = readIfExists(coreTemplatePath) || readIfExists(coreFallbackPath);
    if (coreTemplate) return coreTemplate;
  }

  if (normalized === 'follow_up') return BUILTIN_FOLLOW_UP_TEMPLATE;
  throw new Error(`No template found for key '${normalized}' and no follow_up fallback.`);
}

module.exports = { readTemplate };
