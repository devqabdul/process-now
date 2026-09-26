import { UnprocessableEntityException } from '@nestjs/common';
import { type ListSpec, listArgs, paged } from './list-query.dto.js';

const spec: ListSpec<object, object> = {
  search: (term) => [{ name: term }, { phone: term }],
  sortable: {
    name: (dir) => [{ name: dir }],
    active: (dir) => [{ isActive: 'desc' }, { name: dir }],
  },
  defaultSort: '-name',
};
const base = { companyId: 'c1' };
const query = { page: 1, pageSize: 15 } as const;

describe('listArgs', () => {
  it('always ANDs the base scope, with or without a search', () => {
    expect(listArgs(base, query, spec).where).toEqual({ AND: [base] });
    expect(listArgs(base, { ...query, q: '  ravi ' }, spec).where).toEqual({
      AND: [base],
      OR: [{ name: 'ravi' }, { phone: 'ravi' }],
    });
  });

  it('parses the sort and appends id in the same direction', () => {
    expect(listArgs(base, query, spec).orderBy).toEqual([
      { name: 'desc' },
      { id: 'desc' },
    ]);
    expect(listArgs(base, { ...query, sort: 'active' }, spec).orderBy).toEqual([
      { isActive: 'desc' },
      { name: 'asc' },
      { id: 'asc' },
    ]);
  });

  it('rejects an unknown sort key as a field error', () => {
    for (const sort of ['phone', '-constructor']) {
      expect(() => listArgs(base, { ...query, sort }, spec)).toThrow(
        UnprocessableEntityException,
      );
    }
  });

  it('turns a page number into skip/take', () => {
    expect(listArgs(base, { page: 3, pageSize: 25 }, spec)).toMatchObject({
      skip: 50,
      take: 25,
    });
  });
});

describe('paged', () => {
  it('wraps items with the total and the page asked for', () => {
    expect(paged(['a'], 16, { page: 2, pageSize: 15 })).toEqual({
      items: ['a'],
      total: 16,
      page: 2,
      pageSize: 15,
    });
  });
});
