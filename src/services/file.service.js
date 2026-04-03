const fs      = require("fs");
const pdf     = require("pdf-parse");
const mammoth = require("mammoth");

/**
 * Extracts plain text from a PDF or DOCX file.
 * @param {string} filepath - Absolute path to the uploaded file
 * @param {string} mimetype - MIME type of the file
 * @returns {Promise<string>} Extracted text
 */
const extractText = async (filepath, mimetype) => {
  const buffer = fs.readFileSync(filepath);

  if (mimetype === "application/pdf") {
    const data = await pdf(buffer);
    return data.text;
  }

  if (mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document") {
    const result = await mammoth.extractRawText({ buffer });
    return result.value;
  }

  throw new Error("Unsupported file type for text extraction");
};

/**
 * Cleans up uploaded file from disk after processing.
 * @param {string} filepath
 */
const deleteFile = (filepath) => {
  try {
    if (fs.existsSync(filepath)) fs.unlinkSync(filepath);
  } catch (err) {
    console.warn(`[FileService] Could not delete file: ${filepath}`);
  }
};

module.exports = { extractText, deleteFile };
