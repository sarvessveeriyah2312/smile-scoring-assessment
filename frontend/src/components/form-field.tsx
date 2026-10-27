// A labelled input with room underneath for a hint or an error. Shared by the
// register and login forms so they look and behave the same.
export function FormField({
  label,
  name,
  error,
  hint,
  ...input
}: { label: string; name: string; error?: string; hint?: string } & React.ComponentProps<"input">) {
  const describedBy = error ? `${name}-error` : hint ? `${name}-hint` : undefined;

  return (
    <div className="flex flex-col gap-1.5">
      <label htmlFor={name} className="text-sm font-medium">
        {label}
      </label>
      <input
        id={name}
        name={name}
        aria-invalid={!!error}
        aria-describedby={describedBy}
        className="h-11 rounded-lg border border-black/[.12] bg-transparent px-3 outline-none focus:border-foreground aria-[invalid=true]:border-red-500 dark:border-white/[.18]"
        {...input}
      />
      {error ? (
        <p id={`${name}-error`} className="text-sm text-red-600 dark:text-red-400">
          {error}
        </p>
      ) : (
        hint && (
          <p id={`${name}-hint`} className="text-sm text-zinc-500">
            {hint}
          </p>
        )
      )}
    </div>
  );
}
