'use client';

import { CommandPalette } from './command-palette';
import { KeyboardShortcutsDialogWithRef } from './keyboard-shortcuts-dialog';
import { useKeyboardNavigation } from '@/hooks/use-keyboard-navigation';

interface Props {
  clients: Array<{ id: string; name: string; gateway_status?: string }>;
}

export function CommandPaletteWrapper({ clients }: Props) {
  useKeyboardNavigation();

  return (
    <>
      <CommandPalette clients={clients} />
      <KeyboardShortcutsDialogWithRef />
    </>
  );
}
