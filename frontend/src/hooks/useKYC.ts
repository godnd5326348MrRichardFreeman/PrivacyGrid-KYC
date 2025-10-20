import { useState, useCallback } from 'react';
import { useAccount } from 'wagmi';
import { Contract, BrowserProvider } from 'ethers';
import { toast } from 'sonner';
import { CODED_COMPLIANCE_ABI, CONTRACT_ADDRESS } from '@/lib/contractABI';
import { initializeFHE, encryptMultipleUint32 } from '@/lib/fhe';

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
    try {
      // Initialize FHE encryption
      toast.info('Initializing encryption...');
      await initializeFHE();

      // Encrypt both values together with shared proof
      toast.info('Encrypting sensitive data...');
      const encrypted = await encryptMultipleUint32(
        [countryCode, birthYear],
        CONTRACT_ADDRESS,
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
        encrypted.handles[0],  // Encrypted country code
        encrypted.handles[1],  // Encrypted birth year
        encrypted.signature     // Shared proof for both values
      );

      toast.info('Waiting for confirmation...');
      await tx.wait();

      toast.success('KYC submitted successfully!');
      return tx;
    } catch (error: any) {
      console.error('KYC submission error:', error);
      const errorMsg = error.message || 'Failed to submit KYC';
      toast.error(errorMsg);
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
