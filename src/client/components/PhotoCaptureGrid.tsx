import React, { useRef } from 'react';
import { compressAuditPhoto } from '../utils/compression';
import { useUploadFoto } from '../hooks/useAuditData';
import { Camera, RefreshCw, CheckCircle, Loader2, Sparkles, Image as ImageIcon, Trash2 } from 'lucide-react';
import { TIPOS_FOTO } from '../../shared/constants';

export interface PhotoState {
  tipo: string;
  url?: string;
  previewUrl?: string;
  status: 'idle' | 'compressing' | 'uploading' | 'success' | 'error';
  originalKb?: number;
  compressedKb?: number;
  reductionPercentage?: number;
  errorMessage?: string;
}

interface Props {
  cnpj: string;
  isInoperante: boolean;
  photos: Record<string, PhotoState>;
  onPhotoUploaded: (tipo: string, data: { url: string; size: number; previewUrl: string }) => void;
  onPhotoReset: (tipo: string) => void;
}

export const PhotoCaptureGrid: React.FC<Props> = ({
  cnpj,
  isInoperante,
  photos,
  onPhotoUploaded,
  onPhotoReset
}) => {
  const uploadMutation = useUploadFoto();
  const fileInputRefs = useRef<Record<string, HTMLInputElement | null>>({});

  const listToRender = isInoperante
    ? TIPOS_FOTO.filter((f) => f.obrigatoriaInoperante)
    : TIPOS_FOTO;

  const handleFileChange = async (tipo: string, e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    try {
      const compressionResult = await compressAuditPhoto(file);

      const uploadRes = await uploadMutation.mutateAsync({
        cnpj,
        tipo,
        base64: compressionResult.base64
      });

      onPhotoUploaded(tipo, {
        url: uploadRes.url,
        size: uploadRes.tamanhoBytes,
        previewUrl: compressionResult.base64
      });
    } catch (err: any) {
      console.error('Falha no processamento da foto:', err);
      alert(`Erro no upload da foto: ${err.message || 'Tente novamente'}`);
    } finally {
      if (fileInputRefs.current[tipo]) {
        fileInputRefs.current[tipo]!.value = '';
      }
    }
  };

  return (
    <div className="space-y-3.5">
      <div className="flex flex-wrap items-center justify-between gap-2">
        <label className="text-[13px] font-bold text-blue-900 dark:text-blue-300 tracking-wide flex items-center gap-2 font-roboto min-w-0">
          <div className="h-7 w-7 rounded-full bg-blue-50 dark:bg-blue-950/60 border border-blue-100 dark:border-blue-900/50 flex items-center justify-center text-blue-600 dark:text-blue-400 shrink-0">
            <Camera className="w-4 h-4" />
          </div>
          <span className="leading-tight">{isInoperante ? 'Registro Fotográfico (Fachada Obrigatória)' : 'Fotos Obrigatórias da Auditoria (Mínimo 6)'}</span>
        </label>
        <span className="text-[11px] text-blue-700 dark:text-blue-300 flex items-center gap-1 font-semibold bg-blue-50 dark:bg-blue-950/40 px-2.5 py-0.5 rounded-full border border-blue-200/60 dark:border-blue-800/40 shrink-0">
          <Sparkles className="w-3 h-3 text-blue-600 dark:text-blue-400" /> Compressão WebP Ativa
        </span>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-3">
        {listToRender.map((tipoObj, index) => {
          const photoState = photos[tipoObj.id];
          const hasPhoto = !!photoState?.url || !!photoState?.previewUrl;
          const isUploading = uploadMutation.isPending && uploadMutation.variables?.tipo === tipoObj.id;

          return (
            // Android M3 Outlined Card
            <div
              key={tipoObj.id}
              className={`relative border rounded-3xl p-3.5 flex flex-col justify-between transition-all shadow-sm ${
                hasPhoto
                  ? 'bg-emerald-50/50 dark:bg-emerald-950/20 border-emerald-400 dark:border-emerald-700/60'
                  : 'bg-white dark:bg-[#131B2B] border-slate-200/90 dark:border-slate-800 hover:border-blue-400/80'
              }`}
            >
              {/* Header do Card com Número e Título */}
              <div className="flex items-start justify-between gap-2 mb-2.5 min-w-0">
                <span className="text-xs font-bold text-slate-900 dark:text-slate-100 flex items-center gap-2 min-w-0 flex-1">
                  <span className="h-5 w-5 rounded-full bg-blue-50 dark:bg-blue-950 text-blue-700 dark:text-blue-300 border border-blue-200 dark:border-blue-800 text-[11px] font-mono flex items-center justify-center font-bold shrink-0">
                    {index + 1}
                  </span>
                  <span className="truncate">{tipoObj.label.replace(/^Foto \d+: /, '')}</span>
                </span>
                {hasPhoto && !isUploading && (
                  <CheckCircle className="w-4 h-4 text-emerald-600 dark:text-emerald-400 shrink-0" />
                )}
              </div>

              {/* Área de Visualização com cantos arredondados M3 */}
              <div className="relative aspect-[4/3] rounded-2xl overflow-hidden bg-slate-100 dark:bg-[#0B0F19] border border-slate-200 dark:border-slate-800 flex items-center justify-center">
                {hasPhoto ? (
                  <>
                    <img
                      src={photoState?.previewUrl || photoState?.url}
                      alt={tipoObj.label}
                      className="w-full h-full object-cover"
                    />
                    {isUploading && (
                      <div className="absolute inset-0 bg-slate-950/75 backdrop-blur-xs flex flex-col items-center justify-center p-2 text-center text-xs text-white">
                        <Loader2 className="w-6 h-6 animate-spin text-blue-400 mb-1.5" />
                        <span className="font-medium">Enviando foto compactada...</span>
                      </div>
                    )}
                  </>
                ) : (
                  <div className="flex flex-col items-center justify-center p-4 text-center">
                    <ImageIcon className="w-8 h-8 text-slate-400 dark:text-slate-600 mb-1.5" />
                    <span className="text-xs text-slate-600 dark:text-slate-400 font-medium">Nenhuma foto registrada</span>
                    <span className="text-[11px] text-slate-400 dark:text-slate-500 mt-0.5">Toque abaixo para abrir câmera</span>
                  </div>
                )}
              </div>

              {/* Ações de Tirar Foto / Refazer (Android M3 Buttons) */}
              <div className="mt-3 flex items-center gap-2">
                <input
                  ref={(el) => { fileInputRefs.current[tipoObj.id] = el; }}
                  type="file"
                  accept="image/*"
                  capture="environment"
                  className="hidden"
                  onChange={(e) => handleFileChange(tipoObj.id, e)}
                  disabled={isUploading}
                />

                {!hasPhoto ? (
                  // M3 Filled Button (pill shape, h-11)
                  <button
                    type="button"
                    onClick={() => fileInputRefs.current[tipoObj.id]?.click()}
                    disabled={isUploading}
                    className="w-full h-11 px-4 bg-blue-600 hover:bg-blue-700 active:bg-blue-800 text-white font-medium text-xs rounded-full flex items-center justify-center gap-2 touch-manipulation transition shadow-sm"
                  >
                    <Camera className="w-4 h-4" />
                    <span>Tirar Foto {index + 1}</span>
                  </button>
                ) : (
                  <div className="w-full flex items-center gap-2">
                    {/* M3 Tonal Button */}
                    <button
                      type="button"
                      onClick={() => fileInputRefs.current[tipoObj.id]?.click()}
                      disabled={isUploading}
                      className="flex-1 h-9 px-3 bg-slate-100 hover:bg-slate-200 dark:bg-slate-800 dark:hover:bg-slate-700 text-slate-700 dark:text-slate-200 text-xs rounded-full font-medium flex items-center justify-center gap-1.5 transition touch-manipulation whitespace-nowrap"
                    >
                      <RefreshCw className="w-3 h-3 text-blue-600 dark:text-blue-400 shrink-0" /> Refazer
                    </button>
                    {/* M3 Error Outlined Button */}
                    <button
                      type="button"
                      onClick={() => onPhotoReset(tipoObj.id)}
                      disabled={isUploading}
                      className="h-9 px-3 bg-rose-50 hover:bg-rose-100 dark:bg-rose-950/40 dark:hover:bg-rose-900/60 text-rose-700 dark:text-rose-300 border border-rose-200/80 dark:border-rose-800/40 text-xs rounded-full font-medium transition flex items-center gap-1 touch-manipulation shrink-0 whitespace-nowrap"
                    >
                      <Trash2 className="w-3 h-3 shrink-0" /> Remover
                    </button>
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
