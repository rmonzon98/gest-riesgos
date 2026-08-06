import ExcelJS from "exceljs";

const escapeHtml = (value) =>
  String(value ?? "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;");

const cellToText = (cell) => {
  const value = cell?.value;
  if (value == null) return "";
  if (value instanceof Date) return value.toLocaleDateString();
  if (typeof value === "object") {
    if (Array.isArray(value.richText)) {
      return value.richText.map((part) => part.text ?? "").join("");
    }
    if (value.text != null) return String(value.text);
    if (value.result != null) return String(value.result);
    if (value.hyperlink && value.text) return String(value.text);
    return String(value.result ?? value.formula ?? "");
  }
  return String(value);
};

export const readWorkbookFromArrayBuffer = async (arrayBuffer) => {
  const workbook = new ExcelJS.Workbook();
  await workbook.xlsx.load(arrayBuffer);
  return workbook;
};

export const worksheetToAoA = (worksheet) => {
  const rows = [];
  const columnCount = worksheet.columnCount || 0;

  worksheet.eachRow({ includeEmpty: false }, (row) => {
    const values = [];
    for (let col = 1; col <= columnCount; col += 1) {
      values.push(cellToText(row.getCell(col)));
    }
    if (values.some((value) => String(value ?? "").trim() !== "")) {
      rows.push(values);
    }
  });

  return rows;
};

export const worksheetToHtml = (worksheet) => {
  const aoa = worksheetToAoA(worksheet);
  const rows = aoa
    .map((row, rowIndex) => {
      const tag = rowIndex === 0 ? "th" : "td";
      const cells = row.map((cell) => `<${tag}>${escapeHtml(cell)}</${tag}>`).join("");
      return `<tr>${cells}</tr>`;
    })
    .join("");

  return `<table>${rows}</table>`;
};

export const buildExcelHTMLsFromArrayBuffer = async (arrayBuffer) => {
  const workbook = await readWorkbookFromArrayBuffer(arrayBuffer);
  return workbook.worksheets.map((worksheet) => ({
    name: worksheet.name,
    html: worksheetToHtml(worksheet),
  }));
};
