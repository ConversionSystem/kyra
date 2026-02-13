const DISCORD_BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;

/**
 * Send a message to a Discord channel via the REST API.
 */
export async function sendDiscordMessage(channelId: string, content: string) {
  if (!DISCORD_BOT_TOKEN) {
    console.warn('[discord] DISCORD_BOT_TOKEN not set');
    return;
  }

  // Discord has a 2000 character limit per message
  const trimmed = content.length > 2000 ? content.slice(0, 1997) + '...' : content;

  const resp = await fetch(`https://discord.com/api/v10/channels/${channelId}/messages`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bot ${DISCORD_BOT_TOKEN}`,
    },
    body: JSON.stringify({ content: trimmed }),
  });

  if (!resp.ok) {
    console.error('[discord] send failed:', resp.status, await resp.text());
  }
}
