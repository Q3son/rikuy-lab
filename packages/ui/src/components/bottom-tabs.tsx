import { useRef, type KeyboardEvent, type ReactNode } from 'react';
import { cn } from '../lib/cn.ts';

export interface TabItem {
  id: string;
  label: string;
  href: string;
  icon: ReactNode;
}

/**
 * Bottom nav (DESIGN.md 11): 64 px bar, 4 or 5 items, 24 px icon over a 13 px label. Selected = ink,
 * 800 weight, a 36 x 5 px indicator bar and a Laguna icon. It is a tablist with aria-selected; the
 * items are real links, so the hash router and the browser history keep working. The caller decides
 * the item set per role. Labels may ellipsize as a last resort (Quechua is longer).
 */
export function BottomTabs({ items, activeId, ariaLabel, className, onSelect }: { items: TabItem[]; activeId: string | null; ariaLabel: string; className?: string; onSelect?: (item: TabItem) => void }) {
  const refs = useRef<(HTMLAnchorElement | null)[]>([]);

  const onKeyDown = (e: KeyboardEvent<HTMLAnchorElement>, index: number) => {
    const last = items.length - 1;
    const target = e.key === 'ArrowRight' ? Math.min(index + 1, last) : e.key === 'ArrowLeft' ? Math.max(index - 1, 0) : e.key === 'Home' ? 0 : e.key === 'End' ? last : null;
    if (target === null) return;
    e.preventDefault();
    refs.current[target]?.focus();
  };

  return (
    <nav className={cn('border-t-2 border-line bg-surface pb-[env(safe-area-inset-bottom)]', className)}>
      <div role="tablist" aria-label={ariaLabel} className="mx-auto flex h-16 max-w-[var(--rk-w-tablet)]">
        {items.map((item, i) => {
          const selected = item.id === activeId;
          return (
            <a
              key={item.id}
              ref={(el) => {
                refs.current[i] = el;
              }}
              role="tab"
              id={`tab-${item.id}`}
              href={item.href}
              aria-selected={selected}
              aria-current={selected ? 'page' : undefined}
              onKeyDown={(e) => onKeyDown(e, i)}
              onClick={(e) => {
                if (!onSelect || e.metaKey || e.ctrlKey || e.shiftKey || e.button !== 0) return;
                e.preventDefault();
                onSelect(item);
              }}
              className={cn(
                'relative flex min-w-0 flex-1 flex-col items-center justify-center gap-0.5 px-1 text-[0.8125rem] leading-4 no-underline',
                selected ? 'font-extrabold text-ink' : 'font-medium text-ink-2',
              )}
            >
              <span className={cn('inline-flex [&_svg]:size-6', selected ? 'text-primary' : '')} aria-hidden="true">
                {item.icon}
              </span>
              <span className="max-w-full truncate">{item.label}</span>
              {selected ? <span aria-hidden="true" className="absolute top-0 h-[5px] w-9 rounded-b-chip bg-primary" /> : null}
            </a>
          );
        })}
      </div>
    </nav>
  );
}
