import React, { useEffect, useRef, useState } from 'react';
import { X, SwitchCamera, Loader2, CameraOff } from 'lucide-react';

interface Props {
  titulo: string;
  onCapture: (file: File) => void;
  onClose: () => void;
  /** Câmera do navegador indisponível: usar o app de câmera do celular */
  onFallback: () => void;
}

/**
 * Câmera dentro do próprio app (getUserMedia).
 * Evita abrir o app de câmera do celular: no Android, com pouca memória,
 * o sistema fecha a página enquanto a câmera está aberta e a foto se perde.
 */
export const InAppCamera: React.FC<Props> = ({ titulo, onCapture, onClose, onFallback }) => {
  const videoRef = useRef<HTMLVideoElement>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const [facing, setFacing] = useState<'environment' | 'user'>('environment');
  const [pronta, setPronta] = useState(false);
  const [capturando, setCapturando] = useState(false);
  const [erro, setErro] = useState<string | null>(null);
  const [variasCameras, setVariasCameras] = useState(false);

  const pararStream = () => {
    streamRef.current?.getTracks().forEach((t) => t.stop());
    streamRef.current = null;
  };

  useEffect(() => {
    if (!navigator.mediaDevices?.getUserMedia) {
      onFallback();
      return;
    }

    let cancelado = false;
    setPronta(false);
    // Muitos celulares não abrem duas câmeras ao mesmo tempo: libera a atual antes de trocar
    pararStream();

    navigator.mediaDevices
      .getUserMedia({
        video: { facingMode: { ideal: facing }, width: { ideal: 1920 }, height: { ideal: 1080 } },
        audio: false
      })
      .then(async (stream) => {
        if (cancelado) {
          stream.getTracks().forEach((t) => t.stop());
          return;
        }
        streamRef.current = stream;
        if (videoRef.current) {
          videoRef.current.srcObject = stream;
          await videoRef.current.play().catch(() => {});
        }
        setPronta(true);
        navigator.mediaDevices
          .enumerateDevices?.()
          .then((devs) => setVariasCameras(devs.filter((d) => d.kind === 'videoinput').length > 1))
          .catch(() => {});
      })
      .catch((err: any) => {
        if (cancelado) return;
        console.warn('Câmera do navegador indisponível:', err);
        // Mostra um botão em vez de abrir direto: o seletor de arquivo exige um toque do usuário
        setErro(
          err?.name === 'NotAllowedError' || err?.name === 'SecurityError'
            ? 'O acesso à câmera foi bloqueado. Permita a câmera nas configurações do navegador, ou use o app de câmera do celular.'
            : 'Não foi possível abrir a câmera por aqui. Use o app de câmera do celular.'
        );
      });

    return () => {
      cancelado = true;
    };
  }, [facing]);

  // Libera a câmera ao fechar
  useEffect(() => pararStream, []);

  const disparar = () => {
    const video = videoRef.current;
    if (!video || !video.videoWidth || capturando) return;
    setCapturando(true);

    const canvas = document.createElement('canvas');
    canvas.width = video.videoWidth;
    canvas.height = video.videoHeight;
    const ctx = canvas.getContext('2d');
    if (!ctx) {
      setCapturando(false);
      onFallback();
      return;
    }
    ctx.drawImage(video, 0, 0, canvas.width, canvas.height);
    canvas.toBlob(
      (blob) => {
        if (!blob) {
          setCapturando(false);
          alert('Não foi possível capturar a foto. Tente novamente.');
          return;
        }
        pararStream();
        onCapture(new File([blob], `camera_${Date.now()}.jpg`, { type: 'image/jpeg' }));
      },
      'image/jpeg',
      0.92
    );
  };

  return (
    <div className="fixed inset-0 z-[60] bg-black flex flex-col" role="dialog" aria-modal="true" aria-label={`Câmera: ${titulo}`}>
      <div className="flex items-center justify-between gap-2 px-4 py-3 text-white">
        <span className="text-sm font-semibold truncate">{titulo}</span>
        <button
          type="button"
          onClick={onClose}
          className="h-10 w-10 rounded-full bg-white/10 hover:bg-white/20 flex items-center justify-center shrink-0"
          aria-label="Fechar câmera"
        >
          <X className="w-5 h-5" />
        </button>
      </div>

      <div className="relative flex-1 min-h-0 flex items-center justify-center overflow-hidden">
        {erro ? (
          <div className="max-w-xs px-6 text-center text-white space-y-4">
            <CameraOff className="w-10 h-10 mx-auto text-slate-400" />
            <p className="text-sm">{erro}</p>
            <button
              type="button"
              onClick={onFallback}
              className="w-full h-11 rounded-full bg-blue-600 hover:bg-blue-700 text-white text-sm font-medium"
            >
              Abrir câmera do celular
            </button>
          </div>
        ) : (
          <>
            <video ref={videoRef} autoPlay playsInline muted className="w-full h-full object-contain" />
            {!pronta && (
              <div className="absolute inset-0 flex flex-col items-center justify-center text-white text-sm gap-2">
                <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                Abrindo câmera...
              </div>
            )}
          </>
        )}
      </div>

      {!erro && (
        <div className="relative flex items-center justify-center px-6 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))]">
          <button
            type="button"
            onClick={disparar}
            disabled={!pronta || capturando}
            className="h-[72px] w-[72px] rounded-full border-4 border-white flex items-center justify-center disabled:opacity-40 touch-manipulation"
            aria-label="Tirar foto"
          >
            <span className="h-14 w-14 rounded-full bg-white active:bg-slate-300 transition" />
          </button>
          {variasCameras && (
            <button
              type="button"
              onClick={() => setFacing((f) => (f === 'environment' ? 'user' : 'environment'))}
              disabled={capturando}
              className="absolute right-6 h-12 w-12 rounded-full bg-white/10 hover:bg-white/20 text-white flex items-center justify-center"
              aria-label="Trocar câmera"
            >
              <SwitchCamera className="w-5 h-5" />
            </button>
          )}
        </div>
      )}
    </div>
  );
};
