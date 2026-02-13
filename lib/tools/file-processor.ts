/**
 * Extract readable text from uploaded files.
 * Supports text/plain, text/csv, text/markdown, application/json, and basic PDF text extraction.
 * Max output: 100K characters.
 */

const MAX_CHARS = 100_000;

const TEXT_MIME_TYPES = new Set([
  'text/plain',
  'text/csv',
  'text/markdown',
  'text/html',
  'text/xml',
  'application/json',
  'application/xml',
  'application/javascript',
  'application/typescript',
]);

/**
 * Fetch a file from a URL and extract text content.
 * Returns the extracted text or an error message.
 */
export async function extractTextFromFile(url: string, mimeType: string): Promise<string> {
  try {
    const response = await fetch(url);
    if (!response.ok) {
      return `[Error: Failed to fetch file (${response.status})]`;
    }

    // Text-based formats — return content directly
    if (TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith('text/')) {
      const text = await response.text();
      return text.slice(0, MAX_CHARS);
    }

    // PDF — attempt basic text extraction
    if (mimeType === 'application/pdf') {
      return await extractPdfText(response);
    }

    return `[Unsupported file type: ${mimeType}. Supported: text, CSV, Markdown, JSON, PDF]`;
  } catch (error) {
    console.error('File extraction error:', error);
    return `[Error extracting file content: ${error instanceof Error ? error.message : 'unknown error'}]`;
  }
}

/**
 * Basic PDF text extraction.
 * Extracts readable ASCII/UTF-8 strings from the PDF binary.
 * This is a lightweight approach — no external PDF library needed.
 */
async function extractPdfText(response: Response): Promise<string> {
  const buffer = await response.arrayBuffer();
  const bytes = new Uint8Array(buffer);

  // Extract text between BT (begin text) and ET (end text) operators,
  // and also grab strings in parentheses (PDF text objects)
  const raw = new TextDecoder('latin1').decode(bytes);
  const textParts: string[] = [];

  // Match text inside parentheses (Tj and TJ operators)
  const parenRegex = /\(([^)]*)\)/g;
  let match;
  while ((match = parenRegex.exec(raw)) !== null) {
    const text = match[1]
      .replace(/\\n/g, '\n')
      .replace(/\\r/g, '\r')
      .replace(/\\t/g, '\t')
      .replace(/\\\\/g, '\\')
      .replace(/\\\(/g, '(')
      .replace(/\\\)/g, ')');
    // Filter out binary noise — only keep strings with mostly printable chars
    const printable = text.replace(/[^\x20-\x7E\n\r\t]/g, '');
    if (printable.length > 3 && printable.length / text.length > 0.7) {
      textParts.push(printable);
    }
  }

  if (textParts.length === 0) {
    return '[PDF text extraction returned no readable text. The file may be image-based or encrypted.]';
  }

  return textParts.join(' ').slice(0, MAX_CHARS);
}

/**
 * Check if a mime type is supported for text extraction.
 */
export function isExtractable(mimeType: string): boolean {
  return TEXT_MIME_TYPES.has(mimeType) || mimeType.startsWith('text/') || mimeType === 'application/pdf';
}
