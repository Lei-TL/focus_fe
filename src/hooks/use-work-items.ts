import { useCallback, useEffect, useRef, useState } from 'react';

import type { WorkItemDetail } from '@/core/api/types';
import { isAbortedRequest, toWorkItemError } from '@/services/work-item-error';
import {
  emptyWorkItemFilters,
  fetchWorkItemsPage,
  mergeWorkItems,
  type WorkItemFilters,
} from '@/services/work-items-service';

type LoadedPage = {
  key: string;
  token: number;
  items: WorkItemDetail[];
  totalCount: number;
  page: number;
  exhausted: boolean;
};

type ErrorState = {
  key: string;
  token: number;
  message: string;
};

function filtersKey(filters: WorkItemFilters): string {
  return `${filters.status ?? ''}|${filters.type ?? ''}`;
}

type Options = {
  // Screens that hide the list behind another view can pause loading entirely.
  enabled?: boolean;
  // Avoids a second request when a screen only ever needs one filter set.
  initialFilters?: WorkItemFilters;
};

export function useWorkItems(options: Options = {}) {
  const enabled = options.enabled ?? true;
  const [filters, setFilters] = useState<WorkItemFilters>(
    () => options.initialFilters ?? emptyWorkItemFilters()
  );
  const [token, setToken] = useState(0);
  const [state, setState] = useState<LoadedPage>({
    key: '',
    token: -1,
    items: [],
    totalCount: 0,
    page: 0,
    exhausted: false,
  });
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const mountedRef = useRef(true);
  const loadingMoreRef = useRef(false);
  const key = filtersKey(filters);

  useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
      controllerRef.current?.abort();
    };
  }, []);

  useEffect(() => {
    if (!enabled) {
      return;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    let active = true;

    fetchWorkItemsPage(1, filters, controller.signal)
      .then((result) => {
        if (!active) {
          return;
        }
        setState({
          key,
          token,
          items: result.items,
          totalCount: result.totalCount,
          page: result.page,
          exhausted: false,
        });
        setErrorState(null);
      })
      .catch((loadError: unknown) => {
        if (!active || controller.signal.aborted || isAbortedRequest(loadError)) {
          return;
        }
        setState((current) =>
          current.key === key && current.token === token
            ? current
            : { key, token, items: [], totalCount: 0, page: 0, exhausted: false }
        );
        setErrorState({ key, token, message: toWorkItemError(loadError, 'list').message });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [enabled, filters, key, token]);

  const reload = useCallback(() => {
    setToken((current) => current + 1);
  }, []);

  const refresh = useCallback(async (): Promise<boolean> => {
    if (!enabled) {
      return false;
    }
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (mountedRef.current) {
      setRefreshing(true);
    }
    try {
      const result = await fetchWorkItemsPage(1, filters, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) {
        return false;
      }
      setState({
        key,
        token,
        items: result.items,
        totalCount: result.totalCount,
        page: result.page,
        exhausted: false,
      });
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
      setErrorState({ key, token, message: toWorkItemError(refreshError, 'list').message });
      return false;
    } finally {
      if (mountedRef.current) {
        setRefreshing(false);
      }
    }
  }, [enabled, filters, key, token]);

  const loaded = state.key === key && state.token === token;
  const error =
    errorState && errorState.key === key && errorState.token === token
      ? errorState.message
      : null;
  const loading = !loaded && error === null;
  const items = loaded ? state.items : [];
  const totalCount = loaded ? state.totalCount : 0;
  const page = loaded ? state.page : 0;
  const exhausted = loaded ? state.exhausted : false;
  const hasMore = loaded && page > 0 && !exhausted && items.length < totalCount;
  const loadMoreDisabled = loading || refreshing || loadingMore || error !== null;

  const loadMore = useCallback(async () => {
    if (!loaded || loadMoreDisabled || loadingMoreRef.current || !hasMore) {
      return;
    }
    if (items.length >= totalCount) {
      return;
    }

    loadingMoreRef.current = true;
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    if (mountedRef.current) {
      setLoadingMore(true);
    }
    try {
      const result = await fetchWorkItemsPage(page + 1, filters, controller.signal);
      if (controller.signal.aborted || !mountedRef.current) {
        return;
      }
      setState((current) => {
        if (current.key !== key || current.token !== token) {
          return current;
        }
        const merged = mergeWorkItems(current.items, result.items);
        return {
          ...current,
          items: merged,
          totalCount: result.totalCount,
          page: result.page,
          exhausted:
            result.items.length === 0 || merged.length === current.items.length,
        };
      });
    } catch (loadError) {
      if (
        controller.signal.aborted ||
        isAbortedRequest(loadError) ||
        !mountedRef.current
      ) {
        return;
      }
      setErrorState({ key, token, message: toWorkItemError(loadError, 'list').message });
    } finally {
      loadingMoreRef.current = false;
      if (mountedRef.current) {
        setLoadingMore(false);
      }
    }
  }, [
    loaded,
    loadMoreDisabled,
    hasMore,
    items.length,
    totalCount,
    page,
    filters,
    key,
    token,
  ]);

  return {
    items,
    totalCount,
    filters,
    setFilters,
    loading,
    refreshing,
    loadingMore,
    error,
    hasMore,
    reload,
    refresh,
    loadMore,
  };
}
