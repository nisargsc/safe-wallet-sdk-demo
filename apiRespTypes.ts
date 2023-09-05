export interface apiResp {
  txn: {
    safeAddress: string;
    txnHash: string;
    txnData: {
      to: string;
      value: string;
      data: string;
    };
    signatures: string;
  };
}
