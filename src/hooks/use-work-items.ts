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
};

type ErrorState = {
  key: string;
  token: number;
  message: string;
};

function filtersKey(filters: WorkItemFilters): string {
  return `${filters.status ?? ''}|${filters.type ?? ''}`;
}

export function useWorkItems() {
  const [filters, setFilters] = useState<WorkItemFilters>(emptyWorkItemFilters);
  const [token, setToken] = useState(0);
  const [state, setState] = useState<LoadedPage>({
    key: '',
    token: -1,
    items: [],
    totalCount: 0,
    page: 0,
  });
  const [errorState, setErrorState] = useState<ErrorState | null>(null);
  const [refreshing, setRefreshing] = useState(false);
  const [loadingMore, setLoadingMore] = useState(false);

  const controllerRef = useRef<AbortController | null>(null);
  const key = filtersKey(filters);

  useEffect(() => {
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
            : { key, token, items: [], totalCount: 0, page: 0 }
        );
        setErrorState({ key, token, message: toWorkItemError(loadError, 'list').message });
      });

    return () => {
      active = false;
      controller.abort();
    };
  }, [filters, key, token]);

  const reload = useCallback(() => {
    setToken((current) => current + 1);
  }, []);

  const refresh = useCallback(async () => {
    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setRefreshing(true);
    try {
      const result = await fetchWorkItemsPage(1, filters, controller.signal);
      if (!controller.signal.aborted) {
        setState({
          key,
          token,
          items: result.items,
          totalCount: result.totalCount,
          page: result.page,
        });
        setErrorState(null);
      }
    } catch (refreshError) {
      if (!controller.signal.aborted && !isAbortedRequest(refreshError)) {
        setErrorState({ key, token, message: toWorkItemError(refreshError, 'list').message });
      }
    } finally {
      setRefreshing(false);
    }
  }, [filters, key, token]);

  const loaded = state.key === key && state.token === token;
  const error =
    errorState && errorState.key === key && errorState.token === token
      ? errorState.message
      : null;
  const loading = !loaded && error === null;
  const items = loaded ? state.items : [];
  const totalCount = loaded ? state.totalCount : 0;
  const page = loaded ? state.page : 0;
  const hasMore = loaded && page > 0 && items.length < totalCount;
  const loadMoreDisabled = loading || refreshing || loadingMore || error !== null;

  const loadMore = useCallback(async () => {
    if (!loaded || loadMoreDisabled) {
      return;
    }
    if (items.length >= totalCount) {
      return;
    }

    controllerRef.current?.abort();
    const controller = new AbortController();
    controllerRef.current = controller;
    setLoadingMore(true);
    try {
      const result = await fetchWorkItemsPage(page + 1, filters, controller.signal);
      if (!controller.signal.aborted) {
        setState((current) =>
          current.key === key && current.token === token
            ? {
                ...current,
                items: mergeWorkItems(current.items, result.items),
                totalCount: result.totalCount,
                page: result.page,
              }
            : current
        );
      }
    } catch (loadError) {
      if (!controller.signal.aborted && !isAbortedRequest(loadError)) {
        setErrorState({ key, token, message: toWorkItemError(loadError, 'list').message });
      }
    } finally {
      setLoadingMore(false);
    }
  }, [
    loaded,
    loadMoreDisabled,
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
