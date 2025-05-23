"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import { InboxTools, getArbitrumNetwork } from "@arbitrum/sdk";
import { providers } from "ethers";
import { formatEther } from "viem";
import { useAccount, useChainId, usePublicClient, useSwitchChain, useWalletClient } from "wagmi";
import scaffoldConfig from "~~/scaffold.config";
import { clientToSigner } from "~~/utils/arbitrum/ethersAdapters";
import { getL1ChainId, getL2ChainId, getNetworkName, isChainL1 } from "~~/utils/arbitrum/utils";
import { notification } from "~~/utils/scaffold-eth";

interface StoredTransaction {
  signedTx: string;
  contractName: string;
  functionName: string;
  parameters: any[];
  contractAddress: string;
  value: string;
  transactionHash: string;
}

export default function ForcedTxStep2() {
  const router = useRouter();
  const { address } = useAccount();
  const chainId = useChainId();
  const publicClient = usePublicClient();
  const { data: walletClient } = useWalletClient();
  const { switchChain } = useSwitchChain();
  const [isProcessing, setIsProcessing] = useState(false);
  const [storedTx, setStoredTx] = useState<StoredTransaction | null>(null);

  // Check if current chain is an L1
  const isL1Chain = isChainL1(chainId);
  const l1ChainId = getL1ChainId(chainId);

  useEffect(() => {
    // Check if we have a stored transaction
    const stored = localStorage.getItem("forcedTx");
    if (!stored) {
      notification.error("No signed transaction found. Please start from step 1.");
      return;
    }

    try {
      setStoredTx(JSON.parse(stored));
    } catch (error) {
      console.error("Failed to parse stored transaction:", error);
      notification.error("Invalid stored transaction. Please start from step 1.");
    }
  }, [router]);

  const handleSwitchToL1 = async () => {
    if (switchChain) {
      try {
        await switchChain({ chainId: l1ChainId });
      } catch (error) {
        console.error("Failed to switch network:", error);
        notification.error("Failed to switch network");
      }
    }
  };

  const handleSendTransaction = async () => {
    if (!address || !publicClient || !walletClient || !storedTx) return;

    let toastId: string | undefined;
    try {
      setIsProcessing(true);
      toastId = notification.loading("Preparing to send transaction...");

      // Convert viem/wagmi clients to ethers providers/signers
      const l1Signer = clientToSigner(walletClient);
      const l2ChainId = getL2ChainId(chainId);
      const l2Provider = new providers.JsonRpcProvider(
        scaffoldConfig.targetNetworks.find(n => n.id === l2ChainId)?.rpcUrls.default.http[0],
      );

      // Get the Arbitrum network configuration
      const childChainNetwork = await getArbitrumNetwork(l2Provider);
      const inboxTools = new InboxTools(l1Signer, childChainNetwork);

      // Send the transaction through the Delayed Inbox
      notification.remove(toastId);
      toastId = notification.loading("Sending transaction through Delayed Inbox...");
      const sendMessageTx = await inboxTools.sendChildSignedTx(storedTx.signedTx);
      if (!sendMessageTx) {
        throw new Error("Failed to create send message transaction");
      }
      const receipt = await sendMessageTx.wait();
      notification.remove(toastId);

      // Clear the stored transaction
      localStorage.removeItem("forcedTx");

      notification.success(`Transaction sent successfully. Hash: ${receipt.transactionHash}`);

      // Clear the stored transaction if we don't have an L2 transaction hash
      localStorage.removeItem("forcedTx");

      router.push(`/forced-tx/track?txhash=${storedTx.transactionHash}&l1txhash=${receipt.transactionHash}`);
    } catch (error) {
      console.error("Transaction sending error:", error);
      if (toastId) notification.remove(toastId);
      notification.error("Failed to send transaction");
    } finally {
      setIsProcessing(false);
      // Ensure loading notification is removed if present
      if (toastId) notification.remove(toastId);
    }
  };

  if (!isL1Chain) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">Switch to L1 to Send Transaction</h2>
            <div className="flex flex-col gap-4">
              <div className="alert alert-warning">
                <span>
                  You are currently on an L2 network. To send a forced transaction, you need to be on the L1 network.
                </span>
              </div>
              <button className="btn btn-primary" onClick={handleSwitchToL1} disabled={!switchChain}>
                Switch to {getNetworkName(l1ChainId)}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  if (!storedTx) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="card bg-base-100 shadow-xl">
          <div className="card-body">
            <h2 className="card-title">No Transaction Found</h2>
            <div className="flex flex-col gap-4">
              <div className="alert alert-warning">
                <span>No signed transaction found. Please start from step 1.</span>
              </div>
              <button className="btn btn-primary" onClick={() => router.push("/forced-tx/step1")}>
                Go to Step 1
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <h1 className="text-3xl font-bold mb-8">Step 2: Send Transaction on L1</h1>
      <div className="card bg-base-100 shadow-xl">
        <div className="card-body">
          <h2 className="card-title">Send Forced Transaction</h2>
          <div className="flex flex-col gap-4">
            <div className="alert alert-primary">
              <span>You are about to send the L2 transaction to the Arbitrum Delayed Inbox on L1.</span>
            </div>

            <div className="bg-base-300 p-4 rounded-lg">
              <h2 className="text-lg font-bold">L2 Transaction Details:</h2>
              <div className="mt-2">
                <div className="font-medium">Contract:</div>
                <div className="text-sm opacity-70">{storedTx.contractName} ({storedTx.contractAddress})</div>
              </div>
              <div className="mt-2">
                <div className="font-medium">Function:</div>
                <div className="text-sm opacity-70">{storedTx.functionName}</div>
              </div>
              <div className="mt-2">
                <div className="font-medium">Parameters:</div>
                <pre className="text-sm mt-1 bg-base-200 p-2 rounded">
                  {JSON.stringify(storedTx.parameters, null, 2)}
                </pre>
              </div>
              <div className="mt-2">
                <div className="font-medium">ETH Amount:</div>
                <div className="text-sm opacity-70">
                  {storedTx.value === "0" ? "0" : `${formatEther(BigInt(storedTx.value))} ETH`}
                </div>
              </div>
            </div>

            <button className="btn btn-primary" onClick={handleSendTransaction} disabled={!address || isProcessing}>
              {isProcessing ? (
                <>
                  <span className="loading loading-spinner"></span>
                  Processing...
                </>
              ) : (
                "Send Transaction"
              )}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
