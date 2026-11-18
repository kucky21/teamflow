import { useCallback } from 'react';
import { useSearchParams } from 'react-router';

const PARAM = 'task';

/**
 * Rychlý náhled úkolu je řízen parametrem `?task=TF-12` v URL –
 * odkaz lze sdílet a tlačítko Zpět panel zavře.
 */
export function useTaskPreview() {
  const [params, setParams] = useSearchParams();
  const current = params.get(PARAM);

  const open = useCallback(
    (ref: string) =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.set(PARAM, ref);
        return next;
      }),
    [setParams],
  );

  const close = useCallback(
    () =>
      setParams((prev) => {
        const next = new URLSearchParams(prev);
        next.delete(PARAM);
        return next;
      }),
    [setParams],
  );

  return { current, open, close };
}
