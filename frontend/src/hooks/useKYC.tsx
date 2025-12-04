import { useState, useCallback } from 'react';
import { useAccount, useWalletClient, usePublicClient } from 'wagmi';
import { Contract, BrowserProvider, JsonRpcSigner } from 'ethers';
import { toast } from 'sonner';
import { CODED_COMPLIANCE_ABI, CONTRACT_ADDRESS } from '@/lib/contractABI';
import { initializeFHE, encryptKYCData } from '@/lib/fhe';

const BLOCK_EXPLORER_URL = 'https://sepolia.etherscan.io';

const getTxLink = (hash: string) => `${BLOCK_EXPLORER_URL}/tx/${hash}`;

const TxToast = ({ message, hash }: { message: string; hash: string }) => (
  <div className="flex flex-col gap-1">
    <span>{message}</span>
    <a
      href={getTxLink(hash)}
      target="_blank"
      rel="noopener noreferrer"
      className="text-xs text-blue-400 hover:text-blue-300 underline break-all"
    >
      View on Etherscan: {hash.slice(0, 10)}...{hash.slice(-8)}
    </a>
  </div>
);

// Helper to get ethers provider from wagmi wallet client
async function getEthersProvider(walletClient: any): Promise<{ provider: BrowserProvider; signer: JsonRpcSigner }> {
  // Get the underlying provider from the wallet client
  const { account, chain, transport } = walletClient;
  console.log('[KYC] Initializing provider for chain:', chain.name, 'chainId:', chain.id);

  // Create a provider from the transport
  // For EIP-1193 compatible wallets (MetaMask, OKX, Coinbase, Trust, etc.)
  const provider = new BrowserProvider(transport, {
    chainId: chain.id,
    name: chain.name,
  });

  const signer = await provider.getSigner(account.address);
  console.log('[KYC] Signer initialized for address:', account.address);

  return { provider, signer };
}

export const useKYC = () => {
  const { address, isConnected } = useAccount();
  const { data: walletClient } = useWalletClient();
  const publicClient = usePublicClient();
  const [isLoading, setIsLoading] = useState(false);

  const submitKYC = useCallback(async (
    documentHash: string,
    fullName: string,
    countryCode: number,
    birthYear: number
  ) => {
    if (!address || !isConnected) {
      toast.error('Please connect your wallet first');
      return;
    }

    if (!walletClient) {
      toast.error('Wallet not ready. Please try again.');
      return;
    }

    setIsLoading(true);
    let txHash: string | undefined;

    try {
      // Initialize FHE encryption
      toast.info('Initializing encryption...');
      await initializeFHE();

      // Encrypt both values together with shared proof
      toast.info('Encrypting sensitive data...');
      const encrypted = await encryptKYCData(
        countryCode,
        birthYear,
        address
      );

      // Get provider and signer from wagmi wallet client
      const { signer } = await getEthersProvider(walletClient);

      // Create contract instance
      const contract = new Contract(CONTRACT_ADDRESS, CODED_COMPLIANCE_ABI, signer);

      // Submit to blockchain
      toast.info('Submitting KYC to blockchain...');
      const tx = await contract.registerCompliance(
        documentHash,
        fullName,
        encrypted.countryHandle,   // Encrypted country code
        encrypted.birthYearHandle, // Encrypted birth year
        encrypted.proof            // Shared proof for both values
      );

      txHash = tx.hash;

      // Show pending toast with transaction link
      toast.info(
        <TxToast message="Transaction submitted, waiting for confirmation..." hash={tx.hash} />,
        { duration: 10000 }
      );

      // Wait for confirmation
      const receipt = await tx.wait();

      if (receipt.status === 1) {
        toast.success(
          <TxToast message="KYC submitted successfully!" hash={tx.hash} />,
          { duration: 8000 }
        );
      } else {
        toast.error(
          <TxToast message="Transaction failed on-chain" hash={tx.hash} />,
          { duration: 8000 }
        );
      }

      return tx;
    } catch (error: any) {
      console.error('KYC submission error:', error);

      // Check if we have a transaction hash (tx was sent but failed)
      if (txHash) {
        toast.error(
          <TxToast message={`Transaction failed: ${error.reason || error.message || 'Unknown error'}`} hash={txHash} />,
          { duration: 10000 }
        );
      } else {
        // Transaction was not sent
        const errorMsg = error.reason || error.message || 'Failed to submit KYC';
        toast.error(errorMsg);
      }
      throw error;
    } finally {
      setIsLoading(false);
    }
  }, [address, isConnected, walletClient]);

  const checkStatus = useCallback(async (userAddress: string) => {
    try {
      // Use public client for read operations - no wallet needed
      if (!publicClient) {
        throw new Error('Public client not available');
      }

      const result = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CODED_COMPLIANCE_ABI,
        functionName: 'queryRecordState',
        args: [userAddress as `0x${string}`],
      }) as [number, bigint];

      const states = ['Unverified', 'Approved', 'Declined'];
      return {
        status: states[result[0]],
        timestamp: Number(result[1])
      };
    } catch (error: any) {
      console.error('Status check error:', error);
      throw error;
    }
  }, [publicClient]);

  const checkExists = useCallback(async (userAddress: string) => {
    try {
      if (!publicClient) {
        return false;
      }

      const exists = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CODED_COMPLIANCE_ABI,
        functionName: 'recordExists',
        args: [userAddress as `0x${string}`],
      });

      return exists as boolean;
    } catch (error) {
      return false;
    }
  }, [publicClient]);

  return {
    submitKYC,
    checkStatus,
    checkExists,
    isLoading
  };
};
