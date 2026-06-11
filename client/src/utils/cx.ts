/**
 * cx — Tiny utility for combining CSS Module class names.
 *
 * Usage:
 *   cx(styles.root, isActive && styles.active, className)
 *   cx(styles.btn, { [styles.primary]: isPrimary, [styles.disabled]: disabled })
 */
export function cx(
  ...args: Array<string | undefined | null | false | Record<string, boolean | undefined | null>>
): string {
  const classes: string[] = [];
  for (const arg of args) {
    if (!arg) continue;
    if (typeof arg === 'string') {
      classes.push(arg);
    } else {
      for (const [key, value] of Object.entries(arg)) {
        if (value) classes.push(key);
      }
    }
  }
  return classes.join(' ');
}
