import { ethers } from "ethers";
import Safe, {
  EthersAdapter,
  ContractNetworksConfig,
} from "@safe-global/protocol-kit";
import * as dotenv from "dotenv";
import { SafeTransactionDataPartial } from "@safe-global/safe-core-sdk-types";

dotenv.config();

async function main() {
  const provider = new ethers.providers.JsonRpcProvider(process.env.RPC_URL!);

  const owner2 = new ethers.Wallet(process.env.PRIV_KEY!, provider);

  const ethAdapterOwner2 = new EthersAdapter({
    ethers,
    signerOrProvider: owner2,
  });

  const chainId = await ethAdapterOwner2.getChainId();
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

  const safeAddress = "0x3EF46072FfEc4D6Bc6b4A3566038D13c7D9b64c0";
  const safeTransactionData: SafeTransactionDataPartial = {
    to: "0x428ff5B0A9B91f4066a7073a1988a5EC4F69FDc8",
    value: ethers.utils.parseEther("0.005").toString(),
    data: "0x",
  };
  console.log("Owner2 Approve Transaction...");
  const safeSdkOwner2 = await Safe.create({
    ethAdapter: ethAdapterOwner2,
    safeAddress,
    contractNetworks,
  });

  const safeBalance = await safeSdkOwner2.getBalance();
  console.log(
    `Balance of the safe is ${ethers.utils.formatEther(safeBalance)} ETH`
  );

  const safeTransaction = await safeSdkOwner2.createTransaction({
    safeTransactionData,
  });

  const safeTxnHash =
    "0x59673c82dcfee78352cc10fac7e60e835c6eef55f5466510a8c4ffdfeaa0ff68";
  const approveTxnOwner2Resp = await safeSdkOwner2.approveTransactionHash(
    safeTxnHash
  );
  await approveTxnOwner2Resp.transactionResponse?.wait();

  console.log("Owner2 Exec Transaction...");
  const execTxnOwner2Resp = await safeSdkOwner2.executeTransaction(
    safeTransaction
  );
  await execTxnOwner2Resp.transactionResponse?.wait();

  const safeBalanceAfterTxn = await safeSdkOwner2.getBalance();
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
