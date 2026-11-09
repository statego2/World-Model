export interface ParseLimits {
  maxBytes: number;
  maxDepth: number;
  maxCollection: number;
  maxString: number;
  maxObjectKeys: number;
  maxBindings: number;
}

/** Aligned with the M2 file cap and the first measured workspace size. */
export const DEFAULT_PARSE_LIMITS: ParseLimits = {
  maxBytes: 10 * 1024 * 1024,
  maxDepth: 8,
  maxCollection: 5000,
  maxString: 4000,
  maxObjectKeys: 64,
  maxBindings: 200,
};

/** Action fingerprints serialize the whole action, so a normal import exceeds the workspace string cap. */
export const ENVELOPE_PARSE_LIMITS: ParseLimits = {
  ...DEFAULT_PARSE_LIMITS,
  maxString: 250_000,
};
