import { Tabs as TabsPrimitive } from 'radix-ui';
import type { ComponentProps } from 'react';
import { cn } from '../../lib/cn.ts';

export const Tabs = TabsPrimitive.Root;

/** Segmented control / format selector (not the bottom nav, see BottomTabs). */
export function TabsList({ className, ...props }: ComponentProps<typeof TabsPrimitive.List>) {
  return <TabsPrimitive.List className={cn('flex gap-1 overflow-x-auto rounded-ctl bg-surface-2 p-1', className)} {...props} />;
}

export function TabsTrigger({ className, ...props }: ComponentProps<typeof TabsPrimitive.Trigger>) {
  return (
    <TabsPrimitive.Trigger
      className={cn(
        'inline-flex h-12 flex-1 items-center justify-center whitespace-nowrap rounded-ctl border-2 border-transparent px-3 text-small font-semibold text-ink-2',
        'data-[state=active]:border-line-strong data-[state=active]:bg-surface data-[state=active]:font-extrabold data-[state=active]:text-ink',
        className,
      )}
      {...props}
    />
  );
}

export function TabsContent({ className, ...props }: ComponentProps<typeof TabsPrimitive.Content>) {
  return <TabsPrimitive.Content className={cn('mt-3', className)} {...props} />;
}
