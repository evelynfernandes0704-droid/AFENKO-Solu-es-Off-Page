/**
 * Firestore Security Rules Test Specification (Dirty Dozen Verification)
 * Verifies that all 12 adversarial payloads in security_spec.md are denied.
 */

export interface DirtyDozenTestCase {
  id: number;
  name: string;
  collection: 'leads' | 'dispatches';
  operation: 'get' | 'list' | 'create' | 'update' | 'delete';
  expectedResult: 'PERMISSION_DENIED';
}

export const DIRTY_DOZEN_TESTS: DirtyDozenTestCase[] = [
  { id: 1, name: 'Unauthenticated Lead Read', collection: 'leads', operation: 'get', expectedResult: 'PERMISSION_DENIED' },
  { id: 2, name: 'Unverified Email Lead Write', collection: 'leads', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 3, name: 'Cross-Tenant PII Leak (Get)', collection: 'leads', operation: 'get', expectedResult: 'PERMISSION_DENIED' },
  { id: 4, name: 'Cross-Tenant List Scraping', collection: 'leads', operation: 'list', expectedResult: 'PERMISSION_DENIED' },
  { id: 5, name: 'Identity Spoofing on Create', collection: 'leads', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 6, name: 'Shadow Field Injection on Create', collection: 'leads', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 7, name: 'Shadow Field Injection on Update', collection: 'leads', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 8, name: 'Ownership Transfer Attack on Update', collection: 'leads', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 9, name: 'Timestamp Forgery (Backdating)', collection: 'leads', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
  { id: 10, name: 'Value Poisoning (Oversized String)', collection: 'leads', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 11, name: 'Invalid Enum State Transition', collection: 'leads', operation: 'update', expectedResult: 'PERMISSION_DENIED' },
  { id: 12, name: 'Orphaned Dispatch Creation', collection: 'dispatches', operation: 'create', expectedResult: 'PERMISSION_DENIED' },
];
