import { ethers } from "ethers";
import Safe, {
  EthersAdapter,
  SafeAccountConfig,
  SafeFactory,
} from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import {
  SafeTransactionDataPartial,
} from "@safe-global/safe-core-sdk-types";
import * as ethUtils from "./ethUtils";

dotenv.config();

async function main() {
  const apiUrl = process.env.API_URL!;
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);

  const owner1 = new ethers.Wallet(process.env.PRIV_KEY1!, provider);
  const owner2 = new ethers.Wallet(process.env.PRIV_KEY2!, provider);
  const owner3 = new ethers.Wallet(process.env.PRIV_KEY3!, provider);

  const ethAdapterOwner2 = ethUtils.getEthAdapter(owner2);
  const ethAdapterOwner3 = ethUtils.getEthAdapter(owner3);
  const ethAdapterOwner1 = new EthersAdapter({
    ethers,
    signerOrProvider: owner1,
  });

  console.log("Creating safeFactory...");
  const chainId = await ethAdapterOwner1.getChainId();
  const contractNetworks = ethUtils.getContractNetworks(chainId);
  console.log({ contractNetworks });
  const safeFactory = await SafeFactory.create({
    ethAdapter: ethAdapterOwner1,
    contractNetworks,
  });

  console.log("Deploying safe Account...");
  const safeAccountConfig: SafeAccountConfig = {
    owners: [
      await owner1.getAddress(),
      await owner2.getAddress(),
      await owner3.getAddress(),
    ],
    threshold: 2,
  };

  const safeSdkOwner1 = await safeFactory.deploySafe({ safeAccountConfig });
  const safeAddress = await safeSdkOwner1.getAddress();

  // const safeAddress = "0xd4DF7080DcC3a1422A0CD1C9DB43a7Cc7CF1BE0C";
  // const safeSdkOwner1 = await Safe.create({
  //   ethAdapter: ethAdapterOwner1,
  //   safeAddress,
  //   contractNetworks,
  // });
  const safeSdkOwner2 = await Safe.create({
    ethAdapter: ethAdapterOwner2,
    safeAddress,
    contractNetworks,
  });
  const safeSdkOwner3 = await Safe.create({
    ethAdapter: ethAdapterOwner3,
    safeAddress,
    contractNetworks,
  });

  console.log("Safe Address:", safeAddress);

  const amountIn = ethers.utils.parseEther("0.01").toString();
  console.log(
    `Sending ${ethers.utils.formatEther(amountIn)} ETH to safe wallet...`
  );
  const tx1 = await owner2.sendTransaction({
    to: safeAddress,
    value: amountIn,
  });
  await tx1.wait();
  const safeBalance = await safeSdkOwner1.getBalance();
  console.log(
    `Balance of the safe is ${ethers.utils.formatEther(safeBalance)} ETH`
  );

  console.log("--------owner1---------");
  console.log("Owner1 Creating Transaction...");
  const amountOut = ethers.utils.parseEther("0.005").toString();

  const initTxnData: SafeTransactionDataPartial = {
    to: await owner3.getAddress(),
    value: amountOut,
    data: "0x",
  };

  let safeTransaction = await safeSdkOwner1.createTransaction({
    safeTransactionData: initTxnData,
  });
  console.log({ txnData: safeTransaction.data });

  const safeTxnHash = await safeSdkOwner1.getTransactionHash(safeTransaction);

  console.log("Owner1 Sign Transaction Off-chain...");
  const signOwner1 = await safeSdkOwner1.signTransactionHash(safeTxnHash);
  console.log({ signOwner1 });

  safeTransaction.addSignature(signOwner1);
  console.log({ signCombo: safeTransaction.encodedSignatures() });

  console.log("--------owner2---------");
  console.log("Owner2 Sign Transaction Off-chain...");
  const signOwner2 = await safeSdkOwner2.signTransactionHash(safeTxnHash);
  console.log({ signOwner2 });
  safeTransaction.addSignature(signOwner2);
  console.log({ signCombo: safeTransaction.encodedSignatures() });

  console.log("--------owner3---------");
  console.log("Owner3 Sign Transaction Off-chain...");
  const signOwner3 = await safeSdkOwner3.signTransactionHash(safeTxnHash);
  console.log({ signOwner3 });
  safeTransaction.addSignature(signOwner3);
  console.log({ signCombo: safeTransaction.encodedSignatures() });

  console.log("--------execute now---------");
  console.log("Owner1 Call executesTxn...");
  const execTxnOwner1Resp = await safeSdkOwner1.executeTransaction(
    safeTransaction
  );
  await execTxnOwner1Resp.transactionResponse?.wait();

  const safeBalanceAfterTxn = await safeSdkOwner1.getBalance();
  console.log(
    `Balance of the safe is ${ethers.utils.formatEther(
      safeBalanceAfterTxn
    )} ETH`
  );
}

main()
  .then(() => {
    process.exit(0);
  })
  .catch((err) => {
    console.error(err);
    process.exit(1);
  });
