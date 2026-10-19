import { apiClient } from '@/core/api/client';
import type { paths } from '@/core/api/generated/schema';

export type ApiPath = keyof paths;
export type ApiMethod = 'get' | 'put' | 'post' | 'delete' | 'patch';

type PathItem<M extends ApiMethod, P extends ApiPath> = paths[P][M];

type JsonBody<T> = T extends { content: { 'application/json': infer B } } ? B : never;

type OkBody<O> = O extends { responses: infer R }
  ? 200 extends keyof R
    ? JsonBody<R[200]>
    : 201 extends keyof R
      ? JsonBody<R[201]>
      : 204 extends keyof R
        ? void
        : void
  : void;

type RequestBody<O> = O extends { requestBody?: infer RB } ? JsonBody<RB> : never;

type QueryParams<O> = O extends { parameters: { query?: infer Q } } ? Q : never;

type RequestOptions<M extends ApiMethod, P extends ApiPath> = {
  query?: QueryParams<PathItem<M, P>>;
  body?: RequestBody<PathItem<M, P>>;
  signal?: AbortSignal;
};

export async function request<M extends ApiMethod, P extends ApiPath>(
  method: M,
  path: P,
  options: RequestOptions<M, P> = {}
): Promise<OkBody<PathItem<M, P>>> {
  const { query, body, signal } = options;
  const response = await apiClient.request<OkBody<PathItem<M, P>>>({
    method,
    url: path,
    params: query,
    data: body,
    signal,
  });
  return response.data;
}
