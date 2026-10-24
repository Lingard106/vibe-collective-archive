import postcss from 'postcss';

// Keep source order and media boundaries. An identical selector later in the
// same conditional scope supersedes the same property at the same importance.
// Preserve vendor/fallback declarations with different values conservatively.
export function dedupeCss(source) {
  const root = postcss.parse(source);
  let removed = 0;
  function visit(container) {
    const later = new Map();
    for (const node of [...(container.nodes || [])].reverse()) {
      if (node.type === 'atrule') {if (node.nodes) visit(node); continue;}
      if (node.type !== 'rule') continue;
      for (const declaration of [...node.nodes].reverse()) {
        if (declaration.type !== 'decl') continue;
        const key = `${node.selector}|${declaration.prop}|${Boolean(declaration.important)}`;
        const next = later.get(key);
        if (next === declaration.value) {declaration.remove(); removed++;}
        else later.set(key, declaration.value);
      }
      if (!node.nodes.length) node.remove();
    }
  }
  visit(root);
  return {css: root.toString(), removed};
}
