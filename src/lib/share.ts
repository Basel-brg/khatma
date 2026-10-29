import { isValidKhatmaId } from './validation';

/**
 * Returns the absolute, clean URL to share for a given Khatma.
 * Guarantees that the URL matches the current domain or production domain,
 * without double slashes, trailing slashes, or placeholder routes.
 */
export function getKhatmaShareUrl(khatmaId: string): string {
  if (!khatmaId || khatmaId === 'view' || !isValidKhatmaId(khatmaId)) {
    return '';
  }

  const origin =
    typeof window !== 'undefined' && window.location?.origin
      ? window.location.origin
      : (process.env.NEXT_PUBLIC_APP_URL || 'https://khatma-a9e15.web.app').replace(/\/+$/, '');

  return `${origin}/khatma/${khatmaId}`;
}

/**
 * Formats a clean Arabic invitation message with the title, optional intention,
 * and the URL placed cleanly on its own line after a blank line.
 * This ensures that RTL text does not merge with the URL on WhatsApp, Telegram, or SMS.
 */
export function getKhatmaShareMessage(
  khatma: { title?: string; intention?: string } | null,
  shareUrl: string
): string {
  const title = khatma?.title?.trim() || 'ختمة القرآن الكريم المباركة';
  const intention = khatma?.intention?.trim();

  const lines: string[] = [
    `📖 انضم معنا في ${title}`,
  ];

  if (intention) {
    lines.push(`🤲 النية: ${intention}`);
  }

  lines.push('');
  lines.push('✨ رابط المشاركة وحجز الأجزاء:');
  lines.push(shareUrl);

  return lines.join('\n');
}

/**
 * Multi-tier reliable copy to clipboard.
 * Tier 1: Modern navigator.clipboard.writeText
 * Tier 2: Hidden textarea with document.execCommand('copy')
 */
export async function copyTextToClipboard(text: string): Promise<boolean> {
  if (!text) return false;

  // Tier 1: Clipboard API
  if (typeof navigator !== 'undefined' && navigator.clipboard && typeof navigator.clipboard.writeText === 'function') {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch {
      // Fall through to Tier 2
    }
  }

  // Tier 2: Hidden textarea + execCommand
  if (typeof document !== 'undefined') {
    try {
      const textarea = document.createElement('textarea');
      textarea.value = text;
      textarea.style.position = 'fixed';
      textarea.style.right = '-9999px';
      textarea.style.top = (typeof window !== 'undefined' ? window.pageYOffset || document.documentElement.scrollTop : 0) + 'px';
      textarea.style.fontSize = '16px'; // Prevent zoom on iOS
      textarea.style.opacity = '0';
      textarea.setAttribute('readonly', '');
      document.body.appendChild(textarea);
      textarea.select();
      textarea.setSelectionRange(0, textarea.value.length);
      const successful = document.execCommand('copy');
      document.body.removeChild(textarea);
      if (successful) return true;
    } catch {}
  }

  return false;
}

/**
 * Native share or clipboard copy.
 * Crucially puts the URL directly inside the text property as well as the url property,
 * so WhatsApp, Telegram, Twitter, and other apps that discard the url field still receive the full link.
 */
export async function shareKhatma(
  khatma: { title?: string; intention?: string } | null,
  khatmaId: string
): Promise<{ success: boolean; method: 'native' | 'clipboard' | 'none'; error?: string }> {
  const url = getKhatmaShareUrl(khatmaId);
  if (!url) {
    return { success: false, method: 'none', error: 'معرّف الختمة غير صالح' };
  }

  const message = getKhatmaShareMessage(khatma, url);
  const title = khatma?.title || 'ختمة القرآن الكريم';

  if (typeof navigator !== 'undefined' && typeof navigator.share === 'function') {
    try {
      await navigator.share({
        title,
        text: message, // URL is explicitly inside the message
        url,
      });
      return { success: true, method: 'native' };
    } catch (err: any) {
      if (err?.name === 'AbortError') {
        return { success: false, method: 'none' };
      }
      // If native share failed for reasons other than cancellation, fall through to clipboard
    }
  }

  const copied = await copyTextToClipboard(url);
  return { success: copied, method: copied ? 'clipboard' : 'none' };
}
