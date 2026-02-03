export async function compressImage(
  file: File,
  quality = 0.7,
  maxWidth = 1920,
): Promise<File> {
  // If not an image, return original
  if (!file.type.startsWith("image/")) {
    return file;
  }

  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.readAsDataURL(file);
    reader.onload = (event) => {
      const img = new Image();
      img.src = event.target?.result as string;
      img.onload = () => {
        const canvas = document.createElement("canvas");
        let width = img.width;
        let height = img.height;

        // Resize if too large
        if (width > maxWidth) {
          height = Math.round((height * maxWidth) / width);
          width = maxWidth;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext("2d");
        if (!ctx) {
          resolve(file); // fallback
          return;
        }
        ctx.drawImage(img, 0, 0, width, height);

        // Compress
        canvas.toBlob(
          (blob) => {
            if (!blob) {
              resolve(file);
              return;
            }
            // If compressed is larger than original (rare but possible with low quality original), keep original
            if (blob.size > file.size) {
              resolve(file);
              return;
            }

            const compressedFile = new File([blob], file.name, {
              type: "image/jpeg",
              lastModified: Date.now(),
            });
            resolve(compressedFile);
          },
          "image/jpeg",
          quality,
        );
      };
      img.onerror = (error) => reject(error);
    };
    reader.onerror = (error) => reject(error);
  });
}
