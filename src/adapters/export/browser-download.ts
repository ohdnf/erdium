export function downloadTextFile(input: {
  filename: string;
  mimeType: string;
  contents: string;
}): void {
  const blob = new Blob([input.contents], { type: input.mimeType });
  const objectUrl = window.URL.createObjectURL(blob);

  try {
    downloadUrl({
      filename: input.filename,
      url: objectUrl
    });
  } finally {
    window.setTimeout(() => {
      window.URL.revokeObjectURL(objectUrl);
    }, 0);
  }
}

export function downloadDataUrl(input: {
  filename: string;
  dataUrl: string;
}): void {
  downloadUrl({
    filename: input.filename,
    url: input.dataUrl
  });
}

function downloadUrl(input: { filename: string; url: string }): void {
  const link = document.createElement("a");
  link.download = input.filename;
  link.href = input.url;
  link.rel = "noopener";
  document.body.append(link);
  link.click();
  link.remove();
}
