/**
 * "Dicta tu dato" (FUNCIONES_EXTRA §3 f.5): the student says "diez coma tres" and the app writes it,
 * shows it and says it back; nothing is saved until the group confirms. The typed field with an
 * audio echo is the main path where there is no speech recognition (and in Quechua).
 */
import { useState } from 'react';
import { listenOnce, recognitionSupported, speak } from '../../platform/voz/speech.ts';
import { dictado } from './audio.ts';

export function DictaTuDato({ velocidad, onConfirmado }: { velocidad: number; onConfirmado: (segundos: number) => void }) {
  const [estado, setEstado] = useState<{ tipo: 'idle' } | { tipo: 'escuchando' } | { tipo: 'confirmar'; valor: number; eco: string } | { tipo: 'error'; texto: string }>({ tipo: 'idle' });
  if (!recognitionSupported()) return null;

  async function escuchar() {
    setEstado({ tipo: 'escuchando' });
    const texto = await listenOnce().result;
    const d = texto ? dictado(texto) : null;
    if (!d) {
      const msg = texto ? `No entendí un tiempo en «${texto}». Di por ejemplo «catorce coma dos», o escríbelo.` : 'No te escuché. Prueba otra vez o escríbelo.';
      setEstado({ tipo: 'error', texto: msg });
      speak(msg, velocidad);
      return;
    }
    setEstado({ tipo: 'confirmar', ...d });
    speak(d.eco, velocidad);
  }

  return (
    <div className="flex flex-col gap-2">
      <button type="button" onClick={() => void escuchar()} disabled={estado.tipo === 'escuchando'} className="h-12 rounded-xl border-2 border-[#075E6C] bg-white font-semibold text-[#075E6C]">
        {estado.tipo === 'escuchando' ? 'Escuchando…' : '🎙 Dicta tu dato'}
      </button>
      <p className="text-xs text-[#4D6368]">El reconocimiento de voz del navegador puede usar internet.</p>
      {estado.tipo === 'confirmar' && (
        <div role="alertdialog" aria-label="Confirmar el dato dictado" className="flex flex-col gap-2 rounded-xl border-2 border-[#F5B301] bg-[#FFF1CC] p-3">
          <p className="text-[17px] font-bold text-[#6B4300]">{estado.eco}</p>
          <div className="grid grid-cols-2 gap-2">
            <button
              type="button"
              onClick={() => {
                onConfirmado(estado.valor);
                setEstado({ tipo: 'idle' });
              }}
              className="h-12 rounded-xl bg-[#075E6C] font-semibold text-white"
            >
              Sí, guardar
            </button>
            <button type="button" onClick={() => void escuchar()} className="h-12 rounded-xl border-2 border-[#6A7568] bg-white font-semibold">
              No, repetir
            </button>
          </div>
        </div>
      )}
      {estado.tipo === 'error' && <p role="alert" className="text-[#96102F]">{estado.texto}</p>}
    </div>
  );
}
