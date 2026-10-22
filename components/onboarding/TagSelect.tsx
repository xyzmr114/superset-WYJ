"use client";
import styles from './onboarding.module.css';

// Controlled multi-select chip group. Values are drawn from the frozen
// SKILLS / INTERESTS vocabularies so published cards stay predictable.
export default function TagSelect({
  legend,
  options,
  selected,
  onChange,
}: {
  legend: string;
  options: readonly string[];
  selected: string[];
  onChange: (next: string[]) => void;
}) {
  const toggle = (option: string) =>
    onChange(selected.includes(option) ? selected.filter(o => o !== option) : [...selected, option]);

  return (
    <fieldset className={styles.tagset}>
      <legend>{legend}</legend>
      <div className={styles.chips}>
        {options.map(option => {
          const active = selected.includes(option);
          return (
            <button
              type="button"
              key={option}
              className={active ? `${styles.chip} ${styles.chipOn}` : styles.chip}
              aria-pressed={active}
              onClick={() => toggle(option)}
            >
              {option}
            </button>
          );
        })}
      </div>
    </fieldset>
  );
}
