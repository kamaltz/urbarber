/**
 * Batch 09F-1: P1_SYNC_UNOPENED_SNAP_500 -- unit tests for the error classifier that
 * distinguishes "Midtrans doesn't recognize this transaction yet" (expected,
 * non-destructive) from a genuine gateway failure.
 */
import { describe, expect, it } from 'vitest';
import { isUnrecognizedTransactionError } from '../src/payments/midtrans-error.js';

describe('isUnrecognizedTransactionError', () => {
  it('K. classifies a Midtrans 404 "Transaction doesn\'t exist" MidtransError as unrecognized', () => {
    const err = {
      name: 'MidtransError',
      message: `Midtrans API is returning API error. HTTP status code: 404. API response: {"status_code":"404","status_message":"Transaction doesn't exist."}`,
      httpStatusCode: 404,
      ApiResponse: { status_code: '404', status_message: "Transaction doesn't exist." },
    };
    expect(isUnrecognizedTransactionError(err)).toBe(true);
  });

  it('classifies by message text alone when httpStatusCode is absent', () => {
    const err = { message: "Transaction doesn't exist." };
    expect(isUnrecognizedTransactionError(err)).toBe(true);
  });

  it('does not classify an unrelated Midtrans error (e.g. auth failure) as unrecognized', () => {
    const err = {
      name: 'MidtransError',
      message: 'Midtrans API is returning API error. HTTP status code: 401. API response: {}',
      httpStatusCode: 401,
      ApiResponse: { status_message: 'Access denied.' },
    };
    expect(isUnrecognizedTransactionError(err)).toBe(false);
  });

  it('does not classify a generic network/connection error as unrecognized', () => {
    const err = new Error('Midtrans API request failed. HTTP response not found, likely connection failure.');
    expect(isUnrecognizedTransactionError(err)).toBe(false);
  });
});
