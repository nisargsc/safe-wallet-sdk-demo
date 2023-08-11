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
import { getTxnResp, proposeTxnResp } from "./apiRespTypes";

dotenv.config();

async function main() {
  const apiUrl = process.env.API_URL!;
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);

  const owner1 = new ethers.Wallet(process.env.PRIV_KEY1!, provider);
  const owner2 = new ethers.Wallet(process.env.PRIV_KEY2!, provider);
  const owner3 = new ethers.Wallet(process.env.PRIV_KEY3!, provider);

  const ethAdapterOwner1 = new EthersAdapter({
    ethers,
    signerOrProvider: owner1,
  });

  const ethAdapterOwner2 = new EthersAdapter({
    ethers,
    signerOrProvider: owner2,
  });

  const ethAdapterOwner3 = new EthersAdapter({
    ethers,
    signerOrProvider: owner3,
  });

  const chainId = await ethAdapterOwner1.getChainId();
  const contractNetworks: ContractNetworksConfig = {
    [chainId]: {
      safeMasterCopyAddress: "0xd9Db270c1B5E3Bd161E8c8503c55cEABeE709552",
      safeProxyFactoryAddress: "0xa6B71E26C5e0845f74c812102Ca7114b6a896AB2",
      multiSendAddress: "0xA238CBeb142c10Ef7Ad8442C6D1f9E89e07e7761",
      multiSendCallOnlyAddress: "0x40A2aCCbd92BCA938b02010E17A5b8929b49130D",
      fallbackHandlerAddress: "0xf48f2B2d2a534e402487b3ee7C18c33Aec0Fe5e4",
      signMessageLibAddress: "0xA65387F16B013cf2Af4605Ad8aA5ec25a2cbA3a2",
      createCallAddress: "0x7cbB62EaA69F79e6873cD1ecB2392971036cFAa4",
      simulateTxAccessorAddress: "0x59AD6735bCd8152B84860Cb256dD9e96b85F69Da",
    },
  };

  console.log("Creating safeFactory...");
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

  // const safeAddress = "0xf02CFBC2a82BA2E3145faBccdDe1aa5D3c9A5b7F";
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

  const safeTransactionData: SafeTransactionDataPartial = {
    to: await owner3.getAddress(),
    value: amountOut,
    data: "0x",
  };

  const safeTransaction = await safeSdkOwner1.createTransaction({
    safeTransactionData,
  });

  const respOwner1: proposeTxnResp = await sendRequest({
    url: `${apiUrl}/propose-txn`,
    method: HttpMethod.Post,
    body: {
      safeAddress,
      txnData: safeTransactionData,
    },
  });

  console.log("Owner1 Approve Transaction...");
  const safeTxnHash = respOwner1.txnHash;
  const approveTxnOwner1Resp = await safeSdkOwner1.approveTransactionHash(
    safeTxnHash
  );
  await approveTxnOwner1Resp.transactionResponse?.wait();

  console.log("Owner2 Approve Transaction...");
  const respOwner2: getTxnResp = await sendRequest({
    url: `${apiUrl}/get-txn`,
    method: HttpMethod.Get,
    query: {
      safeAddress,
      txnHash: safeTxnHash,
    },
  });

  const safeSdkOwner2 = await Safe.create({
    ethAdapter: ethAdapterOwner2,
    safeAddress,
    contractNetworks,
  });

  const approveTxnOwner2Resp = await safeSdkOwner2.approveTransactionHash(
    respOwner2.txnHash
  );
  await approveTxnOwner2Resp.transactionResponse?.wait();

  console.log("Owner3 Approve Transaction...");
  const respOwner3: getTxnResp = await sendRequest({
    url: `${apiUrl}/get-txn`,
    method: HttpMethod.Get,
    query: {
      safeAddress,
      txnHash: safeTxnHash,
    },
  });

  const safeSdkOwner3 = await Safe.create({
    ethAdapter: ethAdapterOwner3,
    safeAddress,
    contractNetworks,
  });

  const approveTxnOwner3Resp = await safeSdkOwner3.approveTransactionHash(
    respOwner3.txnHash
  );
  await approveTxnOwner3Resp.transactionResponse?.wait();

  console.log("Owner3 Exec Transaction...");
  const safeTransactionOwner3 = await safeSdkOwner3.createTransaction({
    safeTransactionData: respOwner3.txnData,
  });

  const execTxnOwner1Resp = await safeSdkOwner1.executeTransaction(
    safeTransactionOwner3
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
