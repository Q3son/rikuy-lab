import { useEffect, useState } from 'react';
import { almacenPlan, type AlmacenPlan } from './almacenPlan.ts';
import type { PlanClase } from './revision.ts';

/** The stored plan, read once (null while loading or when there is none). */
export function usePlanClase(almacen: AlmacenPlan = almacenPlan()): PlanClase | undefined {
  const [plan, setPlan] = useState<PlanClase>();
  useEffect(() => {
    let vivo = true;
    almacen.leer().then(
      (p) => vivo && setPlan(p),
      () => undefined,
    );
    return () => {
      vivo = false;
    };
  }, [almacen]);
  return plan;
}
