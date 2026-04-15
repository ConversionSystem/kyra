'use client';

import { CommandPalette } from './command-palette';

interface Props {
  clients: Array<{ id: string; name: string; gateway_status?: string }>;
}

export function CommandPaletteWrapper({ clients }: Props) {
  return <CommandPalette clients={clients} />;
}
