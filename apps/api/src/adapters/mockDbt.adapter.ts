import type {
  DbtDisbursementRecord,
  DbtStatusRequest,
  DbtStatusResult,
  DbtTriggerRequest,
  DbtTriggerResult,
  IDbtAdapter,
} from './interfaces.js';

export class MockDbtAdapter implements IDbtAdapter {
  /**
   * Deterministically queries Direct Benefit Transfer (DBT) / PFMS payment status.
   * If applicationId contains 'FAILED', returns failed status.
   */
  async getDisbursementStatus(params: DbtStatusRequest): Promise<DbtStatusResult> {
    const isFailed = params.applicationId.toUpperCase().includes('FAILED');
    const isPending = params.applicationId.toUpperCase().includes('PENDING');

    const totalSanctionedAmount = 350000.0; // ₹3.5 Lakhs fellowship allocation

    let disbursements: DbtDisbursementRecord[];

    if (isFailed) {
      disbursements = [
        {
          disbursementCycle: '2026-Q1',
          installmentNumber: 1,
          amount: 87500.0,
          status: 'FAILED',
          pfmsTransactionId: `PFMS-ERR-${params.applicationId.slice(0, 8)}`,
          creditDate: null,
          bankReferenceNumber: null,
          failureReason: 'Account Inactive or Aadhaar-NPCI Mapping Missing (Simulated)',
        },
      ];
    } else if (isPending) {
      disbursements = [
        {
          disbursementCycle: '2026-Q1',
          installmentNumber: 1,
          amount: 87500.0,
          status: 'PENDING',
          pfmsTransactionId: `PFMS-PND-${params.applicationId.slice(0, 8)}`,
          creditDate: null,
          bankReferenceNumber: null,
        },
      ];
    } else {
      disbursements = [
        {
          disbursementCycle: '2026-Q1',
          installmentNumber: 1,
          amount: 87500.0,
          status: 'CREDITED',
          pfmsTransactionId: `PFMS-TXN-${params.applicationId.slice(0, 8)}-01`,
          creditDate: '2026-02-10T11:30:00.000Z',
          bankReferenceNumber: 'UTR-SBIN202602100098',
        },
        {
          disbursementCycle: '2026-Q2',
          installmentNumber: 2,
          amount: 87500.0,
          status: 'PROCESSED',
          pfmsTransactionId: `PFMS-TXN-${params.applicationId.slice(0, 8)}-02`,
          creditDate: null,
          bankReferenceNumber: 'UTR-SBIN202605150012',
        },
      ];
    }

    const totalDisbursedAmount = disbursements
      .filter((d) => d.status === 'CREDITED')
      .reduce((acc, curr) => acc + curr.amount, 0);

    return {
      isSimulatedMock: true,
      applicationId: params.applicationId,
      beneficiaryId: params.beneficiaryId || `BEN-${params.applicationId.slice(0, 6)}`,
      totalSanctionedAmount,
      totalDisbursedAmount,
      pendingAmount: totalSanctionedAmount - totalDisbursedAmount,
      disbursements,
      lastCheckedAt: new Date().toISOString(),
    };
  }

  /**
   * Deterministically simulates a payment trigger order to PFMS gateway.
   */
  async simulatePaymentTrigger(params: DbtTriggerRequest): Promise<DbtTriggerResult> {
    const trackingId = `DBT-TRK-${Date.now()}-${Math.floor(Math.random() * 1000)}`;
    const pfmsReference = `PFMS-ORD-${params.applicationId.slice(0, 8)}-INST${params.installmentNumber}`;

    return {
      isSimulatedMock: true,
      trackingId,
      applicationId: params.applicationId,
      amount: params.amount,
      status: 'INITIATED',
      pfmsReference,
      initiatedAt: new Date().toISOString(),
    };
  }
}

export const mockDbtAdapter = new MockDbtAdapter();
