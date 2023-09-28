//@ts-ignore
import { ethers, network } from "hardhat";
import Safe, {
  EthersAdapter,
  SafeAccountConfig,
  SafeFactory,
} from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import * as ethUtils from "./ethUtils";
import SafeApiKit from "@safe-global/api-kit";

dotenv.config();

async function main() {
  const owner1 = "0x428ff5B0A9B91f4066a7073a1988a5EC4F69FDc8";
  await network.provider.request({
    method: "hardhat_impersonateAccount",
    params: [owner1],
  });
  const signer = await ethers.getSigner(owner1);

  const ethAdapter = new EthersAdapter({ ethers, signerOrProvider: signer });

  const safeApiKit = new SafeApiKit({
    txServiceUrl: "https://safe-transaction-polygon.safe.global/",
    ethAdapter,
  });

  const safeAddress = "0x3EF46072FfEc4D6Bc6b4A3566038D13c7D9b64c0";
  const safeSdk = await Safe.create({
    ethAdapter,
    safeAddress,
  });

  const pendingTransactions = (
    await safeApiKit.getPendingTransactions(safeAddress)
  ).results;

  const txn = pendingTransactions[0];
  console.log({ confirmation: txn.confirmations });
  const txnHash = txn.safeTxHash;
  const sign = safeSdk.signTransactionHash(txnHash);
  console.log(sign);
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
