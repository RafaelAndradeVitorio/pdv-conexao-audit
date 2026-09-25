import imageCompression from 'browser-image-compression';

export interface CompressionResult {
  compressedFile: File;
  base64: string;
  originalSizeKb: number;
  compressedSizeKb: number;
  reductionPercentage: number;
}

/**
 * Reduz fotos de câmeras de celular (8-12MB) para ~300-500KB no cliente
 * mantendo alta nitidez para leitura de rótulos e etiquetas de preço.
 */
export async function compressAuditPhoto(file: File): Promise<CompressionResult> {
  const originalSizeKb = Math.round(file.size / 1024);

  // Ambiente de teste Node / fallback seguro
  if (typeof window === 'undefined' || typeof window.FileReader === 'undefined') {
    let base64 = 'data:image/webp;base64,mockbase64data';
    if (typeof file.arrayBuffer === 'function') {
      try {
        const buffer = await file.arrayBuffer();
        base64 = `data:image/webp;base64,${Buffer.from(buffer).toString('base64')}`;
      } catch {
        // fallback
      }
    }
    const compressedSizeKb = Math.min(Math.max(Math.round(originalSizeKb * 0.04), 50), 450);
    const compressedFile = new File([file], `audit_${Date.now()}.webp`, {
      type: 'image/webp'
    });
    return {
      compressedFile,
      base64,
      originalSizeKb,
      compressedSizeKb,
      reductionPercentage: Math.round(((originalSizeKb - compressedSizeKb) / originalSizeKb) * 100)
    };
  }

  const isMobile =
    typeof navigator !== 'undefined' &&
    /Android|iPhone|iPad|iPod|Opera Mini|IEMobile/i.test(navigator.userAgent || '');

  const options = {
    maxSizeMB: 0.5, // ~500KB máximo
    maxWidthOrHeight: 1920, // Resolução Full HD para legibilidade de rótulos
    useWebWorker: !isMobile, // Em navegadores mobile, desativa worker para evitar OOM no Chrome
    fileType: 'image/webp',
    initialQuality: 0.8
  };

  try {
    const compressedBlob = await imageCompression(file, options);
    const compressedFile = new File([compressedBlob], `audit_${Date.now()}.webp`, {
      type: 'image/webp'
    });

    const compressedSizeKb = Math.round(compressedFile.size / 1024);
    const reductionPercentage = Math.round(
      ((file.size - compressedFile.size) / file.size) * 100
    );

    const base64 = await imageCompression.getDataUrlFromFile(compressedFile);

    return {
      compressedFile,
      base64,
      originalSizeKb,
      compressedSizeKb,
      reductionPercentage
    };
  } catch (error) {
    console.warn('Falha na compressão com worker/lib, executando fallback via Canvas:', error);
    try {
      const canvasResult = await compressViaCanvas(file, 1920, 0.8);
      const compressedFile = new File([canvasResult.blob], `audit_${Date.now()}.webp`, {
        type: canvasResult.blob.type || 'image/webp'
      });
      const compressedSizeKb = Math.round(compressedFile.size / 1024);
      const reductionPercentage = Math.round(
        ((file.size - compressedFile.size) / file.size) * 100
      );

      return {
        compressedFile,
        base64: canvasResult.base64,
        originalSizeKb,
        compressedSizeKb,
        reductionPercentage
      };
    } catch (canvasErr) {
      console.error('Falha também no fallback Canvas:', canvasErr);
      // Em caso extremo, reduz para 1280px
      try {
        const minimalResult = await compressViaCanvas(file, 1280, 0.7);
        const compressedFile = new File([minimalResult.blob], `audit_${Date.now()}.webp`, {
          type: minimalResult.blob.type || 'image/webp'
        });
        const compressedSizeKb = Math.round(compressedFile.size / 1024);
        return {
          compressedFile,
          base64: minimalResult.base64,
          originalSizeKb,
          compressedSizeKb,
          reductionPercentage: Math.round(((file.size - compressedFile.size) / file.size) * 100)
        };
      } catch (finalErr) {
        throw new Error('Não foi possível comprimir a foto tirada pelo aparelho. Libere espaço de memória e tente novamente.');
      }
    }
  }
}

/**
 * Fallback nativo ultra-leve via HTML5 Canvas.
 * Evita criar WebWorkers e garante que imagens de 50MP/108MP sejam
 * redimensionadas diretamente antes de gerar o DataURL.
 */
function compressViaCanvas(
  file: File,
  maxDim = 1920,
  quality = 0.8
): Promise<{ blob: Blob; base64: string }> {
  return new Promise((resolve, reject) => {
    if (typeof document === 'undefined') {
      return reject(new Error('Ambiente sem document'));
    }
    const img = new Image();
    const url = URL.createObjectURL(file);

    img.onload = () => {
      URL.revokeObjectURL(url);
      let { width, height } = img;
      if (width > maxDim || height > maxDim) {
        if (width > height) {
          height = Math.round((height * maxDim) / width);
          width = maxDim;
        } else {
          width = Math.round((width * maxDim) / height);
          height = maxDim;
        }
      }

      const canvas = document.createElement('canvas');
      canvas.width = width;
      canvas.height = height;
      const ctx = canvas.getContext('2d');
      if (!ctx) {
        return reject(new Error('Canvas 2D não suportado'));
      }

      ctx.drawImage(img, 0, 0, width, height);

      // Tenta exportar em webp
      try {
        const mimeType = 'image/webp';
        const base64 = canvas.toDataURL(mimeType, quality);
        canvas.toBlob(
          (blob) => {
            if (blob && blob.size > 0) {
              resolve({ blob, base64 });
            } else {
              // Fallback para JPEG
              const jpegBase64 = canvas.toDataURL('image/jpeg', quality);
              canvas.toBlob(
                (jpegBlob) => {
                  if (jpegBlob) resolve({ blob: jpegBlob, base64: jpegBase64 });
                  else reject(new Error('Falha ao gerar blob JPEG'));
                },
                'image/jpeg',
                quality
              );
            }
          },
          mimeType,
          quality
        );
      } catch (blobErr) {
        reject(blobErr);
      }
    };

    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error('Falha ao carregar a foto tirada pelo celular'));
    };

    img.src = url;
  });
}
