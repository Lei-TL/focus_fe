import { apiClient } from '@/core/api/client';
import { request } from '@/core/api/request';

afterEach(() => {
  apiClient.defaults.adapter = undefined;
});

test('requires path params at the type level for templated paths', () => {
  const callWithoutPathParams = () => {
    // @ts-expect-error pathParams is required when the path has a placeholder
    return request('get', '/work-items/{id}', {});
  };

  expect(callWithoutPathParams).toBeDefined();
});

test('throws instead of sending an unresolved placeholder', async () => {
  await expect(
    request('get', '/work-items/{id}', { pathParams: {} as { id: string } })
  ).rejects.toThrow(/path parameter/i);
});
