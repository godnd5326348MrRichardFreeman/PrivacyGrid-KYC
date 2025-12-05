import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Contract, BrowserProvider } from 'ethers';
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

export const useKYC = () => {
  const { address } = useAccount();
  const [isLoading, setIsLoading] = useState(false);

  const submitKYC = useCallback(async (
    documentHash: string,
    fullName: string,
    countryCode: number,
    birthYear: number
  ) => {
    if (!address) {
      toast.error('Please connect your wallet first');
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

      // Get provider and signer
      const provider = new BrowserProvider(window.ethereum);
      const signer = await provider.getSigner();

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
  }, [address]);

  const checkStatus = useCallback(async (userAddress: string) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CODED_COMPLIANCE_ABI, provider);

      const [state, timestamp] = await contract.queryRecordState(userAddress);

      const states = ['Unverified', 'Approved', 'Declined'];
      return {
        status: states[state],
        timestamp: Number(timestamp)
      };
    } catch (error: any) {
      console.error('Status check error:', error);
      throw error;
    }
  }, []);

  const checkExists = useCallback(async (userAddress: string) => {
    try {
      const provider = new BrowserProvider(window.ethereum);
      const contract = new Contract(CONTRACT_ADDRESS, CODED_COMPLIANCE_ABI, provider);

      return await contract.recordExists(userAddress);
    } catch (error) {
      return false;
    }
  }, []);

  return {
    submitKYC,
    checkStatus,
    checkExists,
    isLoading
  };
};
