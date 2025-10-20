import { getAddress, hexlify } from 'ethers';

let fheInstance: any = null;

export const initializeFHE = async (): Promise<any> => {
  if (fheInstance) {
    return fheInstance;
  }

  if (typeof window === 'undefined' || !window.ethereum) {
    throw new Error('Ethereum provider not found');
  }

  try {
    const { createInstance, initSDK, SepoliaConfig } = await import('@zama-fhe/relayer-sdk/bundle');
    await initSDK();
    fheInstance = await createInstance(SepoliaConfig);
    return fheInstance;
  } catch (error) {
    const errorMsg = error instanceof Error ? error.message : String(error);
    if (errorMsg.includes('getKmsSigners') || errorMsg.includes('BAD_DATA')) {
      throw new Error('FHE configuration error');
    }
    throw new Error(`FHE initialization failed: ${errorMsg}`);
  }
};

export const getFHEInstance = (): any => {
  return fheInstance;
};

export const resetFheInstance = (): void => {
  fheInstance = null;
};

export const encryptMultipleUint32 = async (
  values: number[],
  contractAddress: string,
  userAddress: string
): Promise<{ handles: string[]; signature: string }> => {
  let fhe = getFHEInstance();
  if (!fhe) {
    fhe = await initializeFHE();
  }
  if (!fhe) throw new Error('Failed to initialize FHE');

  const contractAddressChecksum = getAddress(contractAddress);
  const ciphertext = await fhe.createEncryptedInput(contractAddressChecksum, userAddress);

  // Add multiple values to encrypt together
  values.forEach(value => ciphertext.add32(value));

  const { handles, inputProof } = await ciphertext.encrypt();

  // Convert all handles to hex strings
  const hexHandles = handles.map((handle: any) => hexlify(handle));
  const proof = hexlify(inputProof);

  return { handles: hexHandles, signature: proof };
};

export const isFheInitialized = (): boolean => {
  return fheInstance !== null;
};
