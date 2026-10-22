"use client";
import {useState} from 'react';
import styles from './onboarding.module.css';

// A type-ahead combobox: start typing to filter a long suggestion list, pick a
// suggestion, OR add any custom value you type that isn't listed. Selected
// values show below as removable tags. Multiple selections allowed.
export default function MultiSelect({
  legend,
  suggestions,
  selected,
  onChange,
  placeholder = 'Type a skill…',
}: {
  legend: string;
  suggestions?: readonly string[];
  selected?: string[];
  onChange: (next: string[]) => void;
  placeholder?: string;
}) {
  // Default so a transient hot-reload / missing prop can never crash the page.
  suggestions ??= [];
  selected ??= [];
  const [query, setQuery] = useState('');
  const [open, setOpen] = useState(false);
  const norm = (s: string) => s.trim().toLowerCase();

  const add = (raw: string) => {
    const value = raw.trim();
    if (!value) return;
    if (!selected.some(s => norm(s) === norm(value))) onChange([...selected, value]);
    setQuery('');
    setOpen(false);
  };
  const remove = (value: string) => onChange(selected.filter(o => o !== value));

  const q = norm(query);
  const matches = suggestions
    .filter(s => (q ? norm(s).includes(q) : true) && !selected.some(x => norm(x) === norm(s)))
    .slice(0, 8);
  const canAddCustom =
    q.length > 0 && !suggestions.some(s => norm(s) === q) && !selected.some(s => norm(s) === q);

  return (
    <fieldset className={styles.tagset}>
      <legend>{legend}</legend>

      {selected.length > 0 && (
        <div className={styles.selected}>
          {selected.map(value => (
            <button
              type="button"
              key={value}
              className={styles.selectedChip}
              onClick={() => remove(value)}
              aria-label={`Remove ${value}`}
            >
              {value} <span aria-hidden>×</span>
            </button>
          ))}
        </div>
      )}

      <div className={styles.combo}>
        <input
          type="text"
          value={query}
          placeholder={placeholder}
          onChange={e => {
            setQuery(e.target.value);
            setOpen(true);
          }}
          onFocus={() => setOpen(true)}
          // Let a click on a menu item register before the menu closes.
          onBlur={() => setTimeout(() => setOpen(false), 120)}
          onKeyDown={e => {
            if (e.key === 'Enter') {
              e.preventDefault();
              add(matches[0] ?? query);
            }
          }}
        />
        {open && (matches.length > 0 || canAddCustom) && (
          <div className={styles.menu}>
            {matches.map(match => (
              <button type="button" key={match} className={styles.menuItem} onClick={() => add(match)}>
                {match}
              </button>
            ))}
            {canAddCustom && (
              <button type="button" className={styles.menuItemAdd} onClick={() => add(query)}>
                + Add “{query.trim()}”
              </button>
            )}
          </div>
        )}
      </div>
    </fieldset>
  );
}
