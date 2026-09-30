'use client';
import { useEffect, useRef } from 'react';

export function SimulationEngine() {
  const simulationRef = useRef<NodeJS.Timeout | null>(null);
  const isRunningRef = useRef(false);

  useEffect(() => {
    // Inicializar datos si es la primera vez
    const initSimulation = async () => {
      try {
        const res = await fetch('/api/simulation/init', { method: 'POST' });
        console.log('Simulation initialized:', await res.json());
      } catch (e) {
        console.log('Simulation already initialized or error:', e);
      }
    };

    initSimulation();

    // Iniciar simulación automática
    const startSimulation = async () => {
      if (isRunningRef.current) return;
      isRunningRef.current = true;

      const runTick = async () => {
        try {
          await fetch('/api/simulation', {
            method: 'POST',
            body: JSON.stringify({ action: 'tick' }),
          });
        } catch (e) {
          console.error('Simulation tick error:', e);
        }
      };

      // Ejecutar tick cada 2 segundos
      simulationRef.current = setInterval(runTick, 2000);

      // Ejecutar primero inmediatamente
      await runTick();
    };

    startSimulation();

    return () => {
      if (simulationRef.current) {
        clearInterval(simulationRef.current);
      }
      isRunningRef.current = false;
    };
  }, []);

  return null; // Este componente no renderiza nada
}
