/** Copy text the browser way (works in Electron without Node APIs). Falls back to a hidden textarea. */
export async function copyText(text: string): Promise<void> {
  try {
    await navigator.clipboard.writeText(text);
    return;
  } catch {
    // Clipboard API unavailable (insecure context, permissions): fall back below.
  }
  const area = document.createElement('textarea');
  area.value = text;
  area.setAttribute('readonly', '');
  area.style.position = 'fixed';
  area.style.opacity = '0';
  document.body.appendChild(area);
  area.select();
  const ok = document.execCommand('copy');
  area.remove();
  if (!ok) throw new Error('Copying is not allowed here. Select the text and copy it yourself.');
}

/**
 * Copy an image (PNG) so it can be pasted into a ClickUp task (D90). The image may still be in the making: passing the
 * promise keeps the copy inside the click, which browsers require.
 */
export async function copyImage(png: Blob | Promise<Blob>): Promise<void> {
  if (typeof ClipboardItem === 'undefined' || !navigator.clipboard?.write) {
    throw new Error("Copying images isn't allowed here. Use Save instead.");
  }
  await navigator.clipboard.write([new ClipboardItem({ 'image/png': png })]);
}
