import { useHydration } from '../../issuance-components/useHydration';
import { useReducedMotion } from '../useReducedMotion';
import { GenericComponent } from '../../generic-component/GenericComponent';
import {
  GenericComponentPrototype,
  type GenericComponentVariant,
} from '../../generic-component/GenericComponentPrototypes';
import type { GenericComponentPayload } from '../../generic-component/contract';
import type { IssuanceComponentProps } from '../types';

/**
 * Thin studio adapter: bridges the studio's staged hydration (mode/runId/delay)
 * onto the portable GenericComponent's optional `reveal` prop. The portable
 * component itself has no dependency on the studio — this is the only seam.
 */
export function GenericComponentCard({
  data,
  mode,
  runId,
  delay = 0,
  variant,
}: IssuanceComponentProps<GenericComponentPayload> & { variant?: GenericComponentVariant }) {
  const { atLeast } = useHydration({ mode, runId, delay });
  const reducedMotion = useReducedMotion();
  const reveal = { labels: atLeast('labels'), data: atLeast('data') };

  if (variant) {
    return (
      <GenericComponentPrototype
        payload={data}
        variant={variant}
        reveal={reveal}
        reducedMotion={reducedMotion}
      />
    );
  }

  return (
    <GenericComponent
      payload={data}
      reveal={reveal}
      reducedMotion={reducedMotion}
    />
  );
}
