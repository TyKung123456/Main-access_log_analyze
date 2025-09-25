export const downloadFile = (filename, content, contentType) => {
  const blob = new Blob([content], { type: contentType });
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  document.body.removeChild(link);
  URL.revokeObjectURL(url);
};

export const downloadMarkdown = (filename, markdown) => {
  downloadFile(filename, markdown, 'text/markdown;charset=utf-8');
};

export const downloadHTML = (filename, html) => {
  downloadFile(filename, html, 'text/html;charset=utf-8');
};

// Export as legacy Word .doc (Word-compatible HTML)
export const downloadDOC = (filename, html) => {
  const docHtml = `<!DOCTYPE html><html><head><meta charset="utf-8"></head><body>${html}</body></html>`;
  downloadFile(filename, docHtml, 'application/msword;charset=utf-8');
};

export default {
  downloadFile,
  downloadMarkdown,
  downloadHTML,
  downloadDOC,
};
