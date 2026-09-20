import type { Company } from './companies.types';

export const COMPANIES: Company[] = [
  {
    id: 'cmp_1',
    name: 'FuseNow',
    numberPrefix: 'FN',
    gstNo: '27AABCF1234M1Z5',
    createdAt: '2026-01-12T06:20:00.000Z',
    isActive: true,
    admin: {
      id: 'usr_1',
      name: 'Asha Rao',
      phone: '9800022222',
      email: 'asha@fusenow.in',
    },
  },
  {
    id: 'cmp_2',
    name: 'CrushNow',
    numberPrefix: 'CN',
    gstNo: '27AACCC5678N1Z2',
    createdAt: '2026-03-03T09:05:00.000Z',
    isActive: true,
    admin: {
      id: 'usr_2',
      name: 'Meera Joshi',
      phone: '9820071144',
      email: 'meera@crushnow.in',
    },
  },
  {
    id: 'cmp_3',
    name: 'GrainLoop Milling',
    numberPrefix: 'GL',
    gstNo: null,
    createdAt: '2026-05-22T11:40:00.000Z',
    isActive: false,
    admin: {
      id: 'usr_3',
      name: 'Rakesh Patil',
      phone: '9762233410',
      email: null,
    },
  },
  {
    id: 'cmp_4',
    name: 'Shree Laminates',
    numberPrefix: 'SL',
    gstNo: '24AAECS9012P1ZQ',
    createdAt: '2026-07-08T04:15:00.000Z',
    isActive: true,
    admin: {
      id: 'usr_4',
      name: 'Nilesh Shah',
      phone: '9909112233',
      email: 'nilesh@shreelaminates.in',
    },
  },
  {
    id: 'cmp_5',
    name: 'Anand Poly Recycling',
    numberPrefix: 'AP',
    gstNo: '29AAFCA3456R1ZK',
    createdAt: '2026-08-19T07:55:00.000Z',
    isActive: true,
    admin: {
      id: 'usr_5',
      name: 'Divya Menon',
      phone: null,
      email: 'divya@anandpoly.co.in',
    },
  },
];
