/**
 * formulaEvaluator.ts — Simple expression evaluator for computed properties.
 *
 * Resolves formulas like "Allocated Hours * Effective Rate" against
 * a Nord's properties JSONB object. Supports basic arithmetic with
 * property name references and numeric constants.
 *
 * Supported operations: +, -, *, /, parentheses, and numeric constants.
 * Property names are resolved by exact match against the properties object.
 */

type Properties = Record<string, unknown>;

/**
 * Tokenize a formula string into property names, operators, and numbers.
 */
function tokenize(formula: string): string[] {
  const tokens: string[] = [];
  let i = 0;

  while (i < formula.length) {
    // Skip whitespace
    if (/\s/.test(formula[i])) { i++; continue; }

    // Operators and parens
    if ('+-*/()'.includes(formula[i])) {
      tokens.push(formula[i]);
      i++;
      continue;
    }

    // Numbers (including decimals)
    if (/[0-9.]/.test(formula[i])) {
      let num = '';
      while (i < formula.length && /[0-9.]/.test(formula[i])) {
        num += formula[i];
        i++;
      }
      tokens.push(num);
      continue;
    }

    // Property name — everything else until an operator or end
    let name = '';
    while (i < formula.length && !'+-*/()'.includes(formula[i])) {
      name += formula[i];
      i++;
    }
    name = name.trim();
    if (name) tokens.push(name);
  }

  return tokens;
}

/**
 * Recursive descent parser for simple arithmetic expressions.
 *
 * Grammar:
 *   expr     → term (('+' | '-') term)*
 *   term     → factor (('*' | '/') factor)*
 *   factor   → '(' expr ')' | NUMBER | PROPERTY_NAME
 */
function parseExpr(tokens: string[], pos: { idx: number }, properties: Properties): number | null {
  let left = parseTerm(tokens, pos, properties);
  if (left === null) return null;

  while (pos.idx < tokens.length && (tokens[pos.idx] === '+' || tokens[pos.idx] === '-')) {
    const op = tokens[pos.idx];
    pos.idx++;
    const right = parseTerm(tokens, pos, properties);
    if (right === null) return null;
    left = op === '+' ? left + right : left - right;
  }

  return left;
}

function parseTerm(tokens: string[], pos: { idx: number }, properties: Properties): number | null {
  let left = parseFactor(tokens, pos, properties);
  if (left === null) return null;

  while (pos.idx < tokens.length && (tokens[pos.idx] === '*' || tokens[pos.idx] === '/')) {
    const op = tokens[pos.idx];
    pos.idx++;
    const right = parseFactor(tokens, pos, properties);
    if (right === null) return null;
    if (op === '/' && right === 0) return null; // Division by zero
    left = op === '*' ? left * right : left / right;
  }

  return left;
}

function parseFactor(tokens: string[], pos: { idx: number }, properties: Properties): number | null {
  if (pos.idx >= tokens.length) return null;

  const token = tokens[pos.idx];

  // Parenthesized expression
  if (token === '(') {
    pos.idx++;
    const result = parseExpr(tokens, pos, properties);
    if (pos.idx < tokens.length && tokens[pos.idx] === ')') {
      pos.idx++;
    }
    return result;
  }

  // Numeric constant
  if (/^[0-9]/.test(token)) {
    pos.idx++;
    const num = parseFloat(token);
    return isNaN(num) ? null : num;
  }

  // Property name reference
  pos.idx++;
  const value = properties[token];
  if (value === null || value === undefined || value === '') return null;
  const num = typeof value === 'number' ? value : parseFloat(String(value));
  return isNaN(num) ? null : num;
}

/**
 * Evaluate a formula string against a properties object.
 *
 * @param formula - Expression like "Allocated Hours * Effective Rate"
 * @param properties - The Nord's properties JSONB object
 * @returns The computed numeric result, or null if any referenced property is missing
 *
 * @example
 * evaluateFormula("Allocated Hours * Effective Rate", { "Allocated Hours": 120, "Effective Rate": 260 })
 * // → 31200
 *
 * evaluateFormula("(Total Price - Total Cost) / Total Price * 100", { "Total Price": 50000, "Total Cost": 35000 })
 * // → 30 (margin percentage)
 */
export function evaluateFormula(formula: string, properties: Properties): number | null {
  if (!formula || !properties) return null;

  try {
    const tokens = tokenize(formula);
    if (tokens.length === 0) return null;

    const pos = { idx: 0 };
    const result = parseExpr(tokens, pos, properties);

    return result !== null && isFinite(result) ? result : null;
  } catch {
    return null;
  }
}

/**
 * Format a computed value for display based on output type.
 */
export function formatComputedValue(
  value: number | null,
  outputType?: string,
  outputConfig?: Record<string, unknown>,
): string {
  if (value === null) return '—';

  switch (outputType) {
    case 'currency': {
      const symbol = (outputConfig?.symbol as string) || '$';
      return `${symbol}${value.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
    }
    case 'percentage':
      return `${value.toFixed(1)}%`;
    case 'number':
    default:
      return value.toLocaleString(undefined, { maximumFractionDigits: 2 });
  }
}
