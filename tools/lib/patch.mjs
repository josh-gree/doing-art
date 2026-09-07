// Exact-string patching of a sketch, with the assertion that makes a variation
// study trustworthy.
//
// The failure this guards against is silent: a patch whose anchor does not
// match leaves the source untouched, the render succeeds, and you get a
// baseline frame wearing a variant's label. Fourteen of those look exactly like
// a study that worked. Assert on the match COUNT, not on presence — an anchor
// that hits in twelve places patches all twelve, which is the same failure
// wearing a different hat.

export function countMatches(source, find) {
  return source.split(find).length - 1;
}

// Check anchors before you build a study on them. This is the mechanical form
// of `grep -c 'const N = 48,' sketch.js` — run it once and you never bisect a
// study to find out which anchor was ambiguous.
export function checkAnchors(source, anchors) {
  const bad = [];
  for (const [name, find] of Object.entries(anchors)) {
    const hits = countMatches(source, find);
    if (hits !== 1) bad.push({ name, hits });
  }
  return bad;
}

export function applyReps(source, reps, id = "patch") {
  let s = source;
  for (const [find, replacement] of reps) {
    const hits = countMatches(s, find);
    if (hits !== 1) {
      throw new Error(
        `${id}: ${hits} matches (want exactly 1) for anchor:\n${find}\n` +
          (hits === 0
            ? "  → the anchor is not in the source. Check whitespace and line breaks."
            : "  → the anchor is ambiguous. Extend it upward, usually to the enclosing `function` line."),
      );
    }
    s = s.split(find).join(replacement);
  }
  return s;
}
