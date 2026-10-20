import { useCallback, useEffect, useRef, useState } from 'react';

import type { WorkItemDetail, WorkItemDetailWithLinks } from '@/core/api/types';
import { isAbortedRequest, toWorkItemError, type WorkItemError } from '@/services/work-item-error';
import { getWorkItemDetail } from '@/services/work-items-service';

type DetailState = {
  id: string | undefined;
  detail: WorkItemDetailWithLinks | null;
  loading: boolean;
};

export function useWorkItemDetail(id: string | undefined) {
  const [state, setState] = useState<DetailState>({
    id: undefined,
    detail: null,
    loading: true,
  });
  const [errorState, setErrorState] = useState<{ id: string; error: WorkItemError } | null>(null);
  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!id) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let active = true;

    getWorkItemDetail(id, controller.signal)
      .then((result) => {
        if (active) {
          setState({ id, detail: result, loading: false });
          setErrorState(null);
        }
      })
      .catch((loadError: unknown) => {
        if (!active || controller.signal.aborted || isAbortedRequest(loadError)) {
          return;
        }
        setState({ id, detail: null, loading: false });
        setErrorState({ id, error: toWorkItemError(loadError, 'detail') });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [id]);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!id) {
      return false;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    try {
      const result = await getWorkItemDetail(id, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) {
        return false;
      }
      setState({ id, detail: result, loading: false });
      setErrorState(null);
      return true;
    } catch (refreshError) {
      if (
        controller.signal.aborted ||
        isAbortedRequest(refreshError) ||
        !mountedRef.current
      ) {
        return false;
      }
      setState((current) => (current.id === id ? { ...current, loading: false } : current));
      setErrorState({ id, error: toWorkItemError(refreshError, 'detail') });
      return false;
    }
  }, [id]);

  const applyWorkItem = useCallback((updated: WorkItemDetail) => {
    setState((current) =>
      current.detail ? { ...current, detail: { ...current.detail, ...updated } } : current
    );
  }, []);

  const matches = state.id === id;
  const detail = matches ? state.detail : null;
  const error = id !== undefined && errorState?.id === id ? errorState.error : null;
  const loading = id !== undefined && (!matches || state.loading);

  return { detail, loading, error, refresh, applyWorkItem };
}
