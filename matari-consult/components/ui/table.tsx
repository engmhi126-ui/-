import { cn } from "@/lib/utils";

export function Table({ children, className }: { children: React.ReactNode; className?: string }) {
  return (
    <div className="overflow-x-auto rounded-xl border border-slate-200 dark:border-slate-700">
      <table className={cn("w-full text-sm text-right", className)}>{children}</table>
    </div>
  );
}

export function Thead({ children }: { children: React.ReactNode }) {
  return (
    <thead className="bg-slate-50 dark:bg-slate-800/60 text-slate-600 dark:text-slate-400 text-xs uppercase">
      {children}
    </thead>
  );
}

export function Tbody({ children }: { children: React.ReactNode }) {
  return (
    <tbody className="bg-white dark:bg-slate-800 divide-y divide-slate-100 dark:divide-slate-700">
      {children}
    </tbody>
  );
}

export function Th({ children, className }: { children?: React.ReactNode; className?: string }) {
  return <th className={cn("px-4 py-3 font-medium whitespace-nowrap", className)}>{children}</th>;
}

export function Td({ children, className }: { children?: React.ReactNode; className?: string }) {
  return (
    <td className={cn("px-4 py-3 text-slate-700 dark:text-slate-300 whitespace-nowrap", className)}>
      {children}
    </td>
  );
}

export function Tr({ children, className, onClick }: { children: React.ReactNode; className?: string; onClick?: () => void }) {
  return (
    <tr
      onClick={onClick}
      className={cn(
        "transition-colors hover:bg-slate-50 dark:hover:bg-slate-750",
        onClick && "cursor-pointer",
        className
      )}
    >
      {children}
    </tr>
  );
}

export function EmptyState({ message = "لا توجد بيانات" }: { message?: string }) {
  return (
    <tr>
      <td colSpan={100} className="px-4 py-16 text-center text-slate-400">
        <div className="flex flex-col items-center gap-2">
          <svg className="w-12 h-12 text-slate-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.5} d="M9 13h6m-3-3v6m-9 1V7a2 2 0 012-2h6l2 2h6a2 2 0 012 2v8a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
          </svg>
          <p>{message}</p>
        </div>
      </td>
    </tr>
  );
}
