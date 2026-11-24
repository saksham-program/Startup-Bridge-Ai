/** A tiny generated PDF used for "documents" in Local Demo Mode (no real files exist). */
const content = "BT /F1 16 Tf 24 100 Td (StartupBridge AI - sample document for Local Demo Mode) Tj ET";
const pdf = [
  "%PDF-1.4",
  "1 0 obj<</Type/Catalog/Pages 2 0 R>>endobj",
  "2 0 obj<</Type/Pages/Kids[3 0 R]/Count 1>>endobj",
  "3 0 obj<</Type/Page/Parent 2 0 R/MediaBox[0 0 460 200]/Contents 4 0 R/Resources<</Font<</F1 5 0 R>>>>>>endobj",
  `4 0 obj<</Length ${content.length}>>stream`,
  content,
  "endstream endobj",
  "5 0 obj<</Type/Font/Subtype/Type1/BaseFont/Helvetica>>endobj",
  "trailer<</Root 1 0 R/Size 6>>",
  "%%EOF",
].join("\n");

export const SAMPLE_PDF_DATA_URL = `data:application/pdf;base64,${btoa(pdf)}`;
