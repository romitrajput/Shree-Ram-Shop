"use client";

/** Re-sorts as soon as a new order is picked (no extra "Search" tap needed). */
export function SortSelect({ value, options }: { value: string; options: { value: string; label: string }[] }) {
  return (
    <select
      name="sort"
      defaultValue={value}
      aria-label="Sort products"
      className="input sm:w-56"
      onChange={(e) => e.currentTarget.form?.requestSubmit()}
    >
      {options.map((s) => (
        <option key={s.value} value={s.value}>
          {s.label}
        </option>
      ))}
    </select>
  );
}
