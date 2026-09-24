'use client';

import Link from 'next/link';
import * as Dialog from '@radix-ui/react-dialog';
import { appUrls } from '@/config/site';
import { CloseIcon } from './icons';

// Loaded on demand by the header: phones and tablets are the only screens
// that ever open it, so desktop visitors never download the dialog code.
export default function MobileMenu({
  open,
  onOpenChange,
  items,
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  items: { href: string; label: string }[];
}) {
  const close = () => onOpenChange(false);
  return (
    <Dialog.Root open={open} onOpenChange={onOpenChange}>
      <Dialog.Portal>
        <Dialog.Content className="pf on-ink fixed inset-0 z-50 flex flex-col bg-ink text-paper">
          <div className="pf-wrap flex h-[var(--pf-header-h)] items-center justify-between">
            <Dialog.Title className="text-[0.95rem] font-semibold text-ink-mute">
              Menu
            </Dialog.Title>
            <Dialog.Close asChild>
              <button
                type="button"
                className="inline-flex size-11 items-center justify-center rounded-full shadow-[inset_0_0_0_1.5px_rgb(255_255_255/0.2)]"
                aria-label="Close menu"
              >
                <CloseIcon className="size-5" />
              </button>
            </Dialog.Close>
          </div>
          <Dialog.Description className="sr-only">
            Site navigation
          </Dialog.Description>
          <nav
            aria-label="Mobile"
            className="pf-wrap mt-6 flex flex-1 flex-col"
          >
            {items.map((item) => (
              <a
                key={item.href}
                href={item.href}
                onClick={close}
                className="pf-display border-b border-white/10 py-4 text-[2.6rem]"
              >
                {item.label}
              </a>
            ))}
            <div className="mt-auto flex flex-col gap-3 pb-10 pt-8">
              <Link href="/signup" className="pf-btn w-full" onClick={close}>
                Start free trial
              </Link>
              <a href={appUrls.pos} className="pf-btn pf-btn--paper w-full">
                Sign in
              </a>
            </div>
          </nav>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
