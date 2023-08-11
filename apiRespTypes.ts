export interface proposeTxnResp {
  safeAddress: string;
  txnHash: string;
  txnData: {
    to: string;
    value: string;
    data: string;
  };
}

export interface getTxnResp {
  safeAddress: string;
  txnHash: string;
  txnData: {
    to: string;
    value: string;
    data: string;
  };
}
