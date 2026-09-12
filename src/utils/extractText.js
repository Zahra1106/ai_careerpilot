const pdfParse = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extracts plain text from an uploaded CV file buffer.
 * Supports PDF and DOCX. Throws a descriptive error for unsupported types.
 */
async function extractTextFromFile(buffer, mimetype, originalname = "") {
  const lowerName = originalname.toLowerCase();

  if (mimetype === "application/pdf" || lowerName.endsWith(".pdf")) {
    const result = await pdfParse(buffer);
    return cleanText(result.text);
  }

  if (
    mimetype ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    lowerName.endsWith(".docx")
  ) {
    const result = await mammoth.extractRawText({ buffer });
    return cleanText(result.value);
  }

  if (mimetype === "text/plain" || lowerName.endsWith(".txt")) {
    return cleanText(buffer.toString("utf-8"));
  }

  const err = new Error(
    "Unsupported file type. Please upload a PDF, DOCX, or TXT file."
  );
  err.statusCode = 400;
  err.code = "UNSUPPORTED_FILE_TYPE";
  throw err;
}

function cleanText(text) {
  return text
    .replace(/\r\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

module.exports = { extractTextFromFile };
