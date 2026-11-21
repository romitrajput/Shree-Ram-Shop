"use client";

import { startTransition, useEffect, useRef } from "react";
import { useFormStatus } from "react-dom";

/**
 * React 19 resets a <form action={…}> after every submit, which wipes what the
 * user typed when validation fails. Submitting through onSubmit keeps the values.
 */
export function keepValues(dispatch: (fd: FormData) => void) {
  return (ev: React.FormEvent<HTMLFormElement>) => {
    ev.preventDefault();
    const fd = new FormData(ev.currentTarget);
    startTransition(() => dispatch(fd));
  };
}

/**
 * After a failed submit, move focus to the first invalid field so keyboard and
 * screen-reader users (and phone users at the bottom of a long form) land on it.
 */
export function useFocusFirstError(state: { fieldErrors?: Record<string, string> } | undefined, formRef: React.RefObject<HTMLFormElement | null>) {
  useEffect(() => {
    if (!state?.fieldErrors || !Object.keys(state.fieldErrors).length) return;
    const el = formRef.current?.querySelector<HTMLElement>('[aria-invalid="true"]');
    el?.focus();
  }, [state, formRef]);
}

export function FieldError({ msg, id }: { msg?: string; id?: string }) {
  if (!msg) return null;
  return (
    <p id={id} className="mt-1 text-sm text-khata">
      {msg}
    </p>
  );
}

export function FormError({ msg }: { msg?: string }) {
  const ref = useRef<HTMLParagraphElement>(null);
  useEffect(() => {
    if (msg) ref.current?.focus();
  }, [msg]);
  if (!msg) return null;
  return (
    <p ref={ref} tabIndex={-1} role="alert" className="rounded-lg bg-khata-light px-4 py-3 text-[15px] text-khata focus:outline-none">
      {msg}
    </p>
  );
}

export function Submit({
  children,
  pending,
  busy,
  className = "btn-primary"
}: {
  children: React.ReactNode;
  pending?: string;
  busy?: boolean;
  className?: string;
}) {
  const status = useFormStatus();
  const isPending = busy ?? status.pending;
  return (
    <button type="submit" className={className} disabled={isPending}>
      {isPending ? (pending ?? "Saving…") : children}
    </button>
  );
}

export function Field({
  label,
  name,
  error,
  hint,
  className = "",
  ...input
}: { label: string; name: string; error?: string; hint?: string } & React.InputHTMLAttributes<HTMLInputElement>) {
  return (
    <div className={className}>
      <label htmlFor={name} className="label">
        {label}
      </label>
      <input
        id={name}
        name={name}
        className="input"
        aria-invalid={!!error}
        aria-describedby={error ? `${name}-error` : hint ? `${name}-hint` : undefined}
        {...input}
      />
      {hint && !error ? (
        <p id={`${name}-hint`} className="mt-1 text-sm text-ink-mute">
          {hint}
        </p>
      ) : null}
      <FieldError msg={error} id={`${name}-error`} />
    </div>
  );
}
