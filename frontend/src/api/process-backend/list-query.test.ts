import { describe, expect, it } from 'vitest';

import { withoutDefaults } from './list-query';

describe('withoutDefaults', () => {
  it('sends only what differs from the API defaults', () => {
    expect(withoutDefaults({ page: 1, pageSize: 15, q: '  ' })).toEqual({});
    expect(withoutDefaults({ page: 2, pageSize: 25, q: ' ravi ', sort: '-name' })).toEqual({
      page: 2,
      pageSize: 25,
      q: 'ravi',
      sort: '-name',
    });
  });
});
