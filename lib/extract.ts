const DOCX_MIME = "application/vnd.openxmlformats-officedocument.wordprocessingml.document";

export async function extractText(buffer: Buffer, mimeType: string): Promise<string> {
  if (mimeType === "application/pdf") {
    // Dynamic import to avoid module-load failure in Vercel serverless (pdf-parse uses dynamic worker)
    const mod = await import("pdf-parse");
    const pdfParse: (buf: Buffer) => Promise<{ text: string }> =
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      (mod as any).default ?? mod;
    const data = await pdfParse(buffer);
    return data.text.trim();
  }
  if (mimeType === DOCX_MIME) {
    const { default: mammoth } = await import("mammoth");
    const result = await mammoth.extractRawText({ buffer });
    return result.value.trim();
  }
  if (mimeType === "text/plain") {
    return buffer.toString("utf8").trim();
  }
  throw new Error(`Unsupported mime type: ${mimeType}`);
}

export const SUPPORTED_MIME_TYPES: Record<string, string> = {
  "application/pdf": "application/pdf",
  "text/plain": "text/plain",
  [DOCX_MIME]: DOCX_MIME,
  "application/vnd.google-apps.document": "text/plain",
};
