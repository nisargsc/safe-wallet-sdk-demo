import { ethers } from "ethers";
import Safe, {
  EthersAdapter,
  SafeFactory,
  SafeAccountConfig,
  ContractNetworksConfig,
} from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";
import { HttpMethod, sendRequest } from "./apiUtil";
import { apiResp  } from "./apiRespTypes";
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
  //   ethAdapter: ethAdapterOwner2,
  //   safeAddress,
  //   contractNetworks,
  // });

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

  console.log("Owner1 Creating Transaction...");
  const amountOut = ethers.utils.parseEther("0.005").toString();

  const initTxnData: SafeTransactionDataPartial = {
    to: await owner3.getAddress(),
    value: amountOut,
    data: "0x",
  };

  const safeTransaction = await safeSdkOwner1.createTransaction({
    safeTransactionData: initTxnData,
  });
  console.log({ txnData: safeTransaction.data });

  const respOwner1: apiResp = await sendRequest({
    url: `${apiUrl}/propose-txn`,
    method: HttpMethod.Post,
    body: {
      safeAddress,
      txnData: safeTransaction.data,
    },
  });
  console.log({ resp: respOwner1.txn });
  const safeTxnHash = respOwner1.txn.txnHash;

  console.log("Owner1 Sign Transaction Off-chain...");
  const signOwner1 = await ethAdapterOwner1.signMessage(safeTxnHash);
  console.log({ signOwner1 });

  console.log("Owner1 Call add-sign API...");
  const respAddSignOwner1: apiResp = await sendRequest({
    url: `${apiUrl}/add-sign`,
    method: HttpMethod.Post,
    body: {
      safeAddress,
      txnData: safeTransaction.data,
      ownerAddress: owner1.address,
      sign: signOwner1,
    },
  });
  console.log({ resp: respAddSignOwner1.txn });

  console.log("Owner2 Call get-txn API...");
  const respOwner2: apiResp = await sendRequest({
    url: `${apiUrl}/get-txn`,
    method: HttpMethod.Get,
    query: {
      safeAddress,
      txnHash: safeTxnHash,
    },
  });
  console.log({ resp: respOwner2.txn });

  console.log("Owner2 Sign Transaction Off-chain...");
  const signOwner2 = await ethAdapterOwner2.signMessage(safeTxnHash);
  console.log({ signOwner2 });

  console.log("Owner2 Call add-sign API...");
  const respAddSignOwner2: apiResp = await sendRequest({
    url: `${apiUrl}/add-sign`,
    method: HttpMethod.Post,
    body: {
      safeAddress,
      txnData: safeTransaction.data,
      ownerAddress: owner2.address,
      sign: signOwner2,
    },
  });
  console.log({ resp: respAddSignOwner2.txn });

  console.log("Owner3 Call get-txn API...");
  const respOwner3: apiResp = await sendRequest({
    url: `${apiUrl}/get-txn`,
    method: HttpMethod.Get,
    query: {
      safeAddress,
      txnHash: safeTxnHash,
    },
  });
  console.log({ resp: respOwner3.txn });

  const safeSdkOwner3 = await Safe.create({
    ethAdapter: ethAdapterOwner3,
    safeAddress,
    contractNetworks,
  });

  console.log("Owner3 Sign Transaction Off-chain...");
  const signOwner3 = await ethAdapterOwner3.signMessage(safeTxnHash);
  console.log({ signOwner3 });

  console.log("Owner3 Call add-sign API...");
  const respAddSignOwner3: apiResp = await sendRequest({
    url: `${apiUrl}/add-sign`,
    method: HttpMethod.Post,
    body: {
      safeAddress,
      txnData: safeTransaction.data,
      ownerAddress: owner2.address,
      sign: signOwner3,
    },
  });
  console.log({ resp: respAddSignOwner3.txn });

  console.log("Owner3 Call checkzicute API...");
  const respCheckzicuteOwner3: apiResp = await sendRequest({
    url: `${apiUrl}/checkzicute`,
    method: HttpMethod.Get,
    query: {
      safeAddress,
      txnHash: safeTxnHash,
      executor: owner3.address
    },
  });
  console.log({ resp: respCheckzicuteOwner3.txn });

  // This we will replace with checkNSignatures and execute flow i.e. checkzicute
  // const execTxnOwner1Resp = await safeSdkOwner1.executeTransaction(
  //   safeTransactionOwner3
  // );
  // await execTxnOwner1Resp.transactionResponse?.wait();

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
