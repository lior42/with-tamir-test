/**
 * an efficient way of checking if a record is empty.
 * works a lot faster then: Object.keys(record).length > 0
 */
export function isEmptyRecord(rec: Record<any, any>) {
  for (const _ in rec) {
    return false;
  }
  return true;
}
