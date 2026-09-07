// Tiny spec-driven flag parser, shared by the CLIs in tools/.
//
// Both `--flag value` and `--flag=value` work. Flag names map to camelCase
// keys, so `--sheet-px 300` lands as `opts.sheetPx`. Unknown flags throw rather
// than being ignored: a typo'd flag that silently does nothing is how you end
// up rendering a batch at the wrong size and not noticing until the sheet.

const CAMEL = (name) => name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());

// spec: { name: { type: "string"|"number"|"boolean"|"list", default, help } }
// Pass `_positional: "dir"` to collect the first bare argument under that key.
export function parseFlags(argv, spec, usage) {
  const positionalKey = spec._positional;
  const flags = { ...spec };
  delete flags._positional;

  const opts = {};
  for (const [name, def] of Object.entries(flags)) opts[CAMEL(name)] = def.default;
  if (positionalKey) opts[positionalKey] = null;

  for (let i = 0; i < argv.length; i++) {
    const arg = argv[i];
    if (arg === "-h" || arg === "--help") {
      if (usage) console.log(usage);
      process.exit(0);
    }
    if (!arg.startsWith("--")) {
      if (positionalKey && opts[positionalKey] === null) {
        opts[positionalKey] = arg;
        continue;
      }
      throw new Error(`unexpected argument: ${arg}`);
    }
    const eq = arg.indexOf("=");
    const name = (eq === -1 ? arg : arg.slice(0, eq)).slice(2);
    const inline = eq === -1 ? null : arg.slice(eq + 1);
    const def = flags[name];
    if (!def) throw new Error(`unknown option: --${name}`);
    const key = CAMEL(name);

    if (def.type === "boolean") {
      opts[key] = inline === null ? true : inline !== "false";
      continue;
    }
    const raw = inline !== null ? inline : argv[++i];
    if (raw === undefined) throw new Error(`--${name} needs a value`);
    if (def.type === "number") {
      const n = Number(raw);
      if (!Number.isFinite(n)) throw new Error(`--${name} needs a number, got "${raw}"`);
      opts[key] = n;
    } else if (def.type === "list") {
      opts[key] = raw.split(",").map((s) => s.trim()).filter(Boolean);
    } else {
      opts[key] = raw;
    }
  }
  return opts;
}

export function requireOpts(opts, names) {
  const missing = names.filter((n) => opts[n] === null || opts[n] === undefined || opts[n] === "");
  if (missing.length) throw new Error(`missing required option(s): ${missing.map((n) => `--${n}`).join(", ")}`);
}
