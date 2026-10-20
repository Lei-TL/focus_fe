import { useEffect, useState } from 'react';

import type { WorkItemDetail } from '@/core/api/types';
import { isAbortedRequest } from '@/services/work-item-error';
import { getDependencyItems } from '@/services/work-items-service';

type DependencyState = {
  key: string;
  items: Record<string, WorkItemDetail | null>;
};

export function useDependencyItems(ids: string[]) {
  const key = ids.join('|');
  const [state, setState] = useState<DependencyState>({ key: '', items: {} });

  useEffect(() => {
    if (!key) {
      return;
    }
    const currentIds = key.split('|');
    const controller = new AbortController();
    let active = true;

    getDependencyItems(currentIds, controller.signal)
      .then((result) => {
        if (active) {
          setState({ key, items: result });
        }
      })
      .catch((error: unknown) => {
        if (active && !controller.signal.aborted && !isAbortedRequest(error)) {
          setState({ key, items: {} });
        }
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [key]);

  const loaded = state.key === key;
  return {
    items: loaded ? state.items : {},
    loading: key !== '' && !loaded,
  };
}
