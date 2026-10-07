"use client";

import { useCallback, useEffect, useRef, useState } from "react";

export function useContagemCaptura(aoTerminar: () => void | Promise<void>, segundos = 3) {
  const [contagem, setContagem] = useState<number | null>(null);
  const [flash, setFlash] = useState(0);
  const aoTerminarRef = useRef(aoTerminar);

  useEffect(() => {
    aoTerminarRef.current = aoTerminar;
  });

  useEffect(() => {
    if (contagem === null) return;
    const timer = setTimeout(() => {
      if (contagem > 1) {
        setContagem(contagem - 1);
        return;
      }
      setContagem(null);
      setFlash((n) => n + 1);
      void aoTerminarRef.current();
    }, 1000);
    return () => clearTimeout(timer);
  }, [contagem]);

  const iniciar = useCallback(() => setContagem(segundos), [segundos]);

  return { contagem, contando: contagem !== null, flash, iniciar };
}
