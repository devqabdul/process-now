/** Saves a blob through a throwaway link; the browser names it `filename`. */
export const downloadBlob = (filename: string, blob: Blob) => {
  const url = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = url;
  link.download = filename;
  link.click();
  setTimeout(() => URL.revokeObjectURL(url), 0);
};

/** A file the API sent as base64 inside the JSON envelope, ready to save or share. */
export const base64ToFile = (base64: string, filename: string, type: string) => {
  const bytes = Uint8Array.from(atob(base64), (char) => char.charCodeAt(0));
  return new File([bytes], filename, { type });
};
