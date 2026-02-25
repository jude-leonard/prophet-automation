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

  return null;
}

function readIfExists(filePath) {
  if (!filePath || !fs.existsSync(filePath)) {
    return null;
  }

  return fs.readFileSync(filePath, 'utf8');
}

function readTemplate(templateKey = 'follow_up') {
  const normalized = String(templateKey || 'follow_up')
    .trim()
    .toLowerCase()
    .replace(/\s+/g, '_');

  const localTemplatePath = path.join(process.cwd(), 'templates', 'email', `${normalized}.md`);
  const localFallbackPath = path.join(process.cwd(), 'templates', 'email', 'follow_up.md');

  const localTemplate = readIfExists(localTemplatePath) || readIfExists(localFallbackPath);
  if (localTemplate) {
    return localTemplate;
  }

  const root = resolveCoreRoot();
  if (!root) {
    throw new Error(
      'No templates available. Add templates/email/*.md locally or include prophet-core as submodule.'
    );
  }

  const coreTemplatePath = path.join(root, 'templates', 'email', `${normalized}.md`);
  const coreFallbackPath = path.join(root, 'templates', 'email', 'follow_up.md');

  const coreTemplate = readIfExists(coreTemplatePath) || readIfExists(coreFallbackPath);
  if (coreTemplate) {
    return coreTemplate;
  }

  throw new Error(`No template found for key '${normalized}' and no follow_up fallback.`);
}

module.exports = {
  readTemplate,
};
