import { EthSafeSignature } from "@safe-global/protocol-kit";

export interface apiRespType {
  txn: {
    safeAddress: string;
    txnHash: string;
    txnData: {
      to: string;
      value: string;
      data: string;
    };
    signatures: signatureType[];
    signCombo?: string;
  };
}

export interface signatureType {
  signer: string;
  data: string;
}
