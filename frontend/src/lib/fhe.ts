import { bytesToHex, getAddress } from "viem";
import type { Address } from "viem";
import { CONTRACT_ADDRESS } from "@/lib/contractABI";

declare global {
    interface Window {
        RelayerSDK?: any;
        relayerSDK?: any;
        ethereum?: any;
        okxwallet?: any;
        coinbaseWalletExtension?: any;
        trustwallet?: any;
    }
}

let fheInstance: any = null;

const getSDK = () => {
    if (typeof window === "undefined") {
        throw new Error("FHE SDK requires a browser environment");
    }
    const sdk = window.RelayerSDK || window.relayerSDK;
    if (!sdk) {
        throw new Error("Relayer SDK not loaded. Ensure the CDN script tag is present.");
    }
    return sdk;
};

export const initializeFHE = async (provider?: any) => {
    if (fheInstance) return fheInstance;
    if (typeof window === "undefined") {
        throw new Error("FHE SDK requires a browser environment");
    }

    const ethereumProvider =
        provider || window.ethereum || window.okxwallet?.provider || window.okxwallet;
    if (!ethereumProvider) {
        throw new Error("No wallet provider detected. Connect a wallet first.");
    }

    const sdk = getSDK();
    const { initSDK, createInstance, SepoliaConfig } = sdk;
    await initSDK();
    const config = { ...SepoliaConfig, network: ethereumProvider };
    fheInstance = await createInstance(config);
    return fheInstance;
};

const getInstance = async (provider?: any) => {
    if (fheInstance) return fheInstance;
    return initializeFHE(provider);
};

export const getFHEInstance = (): any => {
    return fheInstance;
};

export const resetFheInstance = (): void => {
    fheInstance = null;
};

/**
 * Encrypt multiple uint32 values for KYC registration (country code and birth year)
 * @param countryCode - Country code to encrypt
 * @param birthYear - Birth year to encrypt
 * @param userAddress - The user's wallet address
 * @param provider - Optional ethereum provider
 */
export const encryptKYCData = async (
    countryCode: number,
    birthYear: number,
    userAddress: Address,
    provider?: any
): Promise<{
    countryHandle: `0x${string}`;
    birthYearHandle: `0x${string}`;
    proof: `0x${string}`;
}> => {
    console.log('[FHE] Encrypting KYC data:', { countryCode, birthYear });
    const instance = await getInstance(provider);
    const contractAddr = getAddress(CONTRACT_ADDRESS);
    const userAddr = getAddress(userAddress);

    console.log('[FHE] Creating encrypted input for:', {
        contract: contractAddr,
        user: userAddr,
    });

    const input = instance.createEncryptedInput(contractAddr, userAddr);
    input.add32(countryCode);
    input.add32(birthYear);

    console.log('[FHE] Encrypting input...');
    const { handles, inputProof } = await input.encrypt();
    console.log('[FHE] Encryption complete, handles:', handles.length);

    if (handles.length < 2) {
        throw new Error('FHE SDK returned insufficient handles');
    }

    return {
        countryHandle: bytesToHex(handles[0]) as `0x${string}`,
        birthYearHandle: bytesToHex(handles[1]) as `0x${string}`,
        proof: bytesToHex(inputProof) as `0x${string}`,
    };
};

/**
 * Encrypt a single uint32 value
 * @param value - The value to encrypt
 * @param userAddress - The user's wallet address
 * @param provider - Optional ethereum provider
 */
export const encryptUint32 = async (
    value: number,
    userAddress: Address,
    provider?: any
): Promise<{
    handle: `0x${string}`;
    proof: `0x${string}`;
}> => {
    console.log('[FHE] Encrypting uint32 value:', value);
    const instance = await getInstance(provider);
    const contractAddr = getAddress(CONTRACT_ADDRESS);
    const userAddr = getAddress(userAddress);

    const input = instance.createEncryptedInput(contractAddr, userAddr);
    input.add32(value);

    const { handles, inputProof } = await input.encrypt();

    if (handles.length < 1) {
        throw new Error('FHE SDK returned insufficient handles');
    }

    return {
        handle: bytesToHex(handles[0]) as `0x${string}`,
        proof: bytesToHex(inputProof) as `0x${string}`,
    };
};

/**
 * Check if FHE SDK is loaded and ready
 */
export const isFHEReady = (): boolean => {
    if (typeof window === "undefined") return false;
    return !!(window.RelayerSDK || window.relayerSDK);
};

export const isFheInitialized = (): boolean => {
    return fheInstance !== null;
};

export const isSDKLoaded = isFHEReady;

/**
 * Wait for FHE SDK to be loaded (with timeout)
 */
export const waitForFHE = async (timeoutMs: number = 10000): Promise<boolean> => {
    const startTime = Date.now();

    while (Date.now() - startTime < timeoutMs) {
        if (isFHEReady()) {
            return true;
        }
        await new Promise(resolve => setTimeout(resolve, 100));
    }

    return false;
};

/**
 * Get FHE status for debugging
 */
export const getFHEStatus = (): {
    sdkLoaded: boolean;
    instanceReady: boolean;
} => {
    return {
        sdkLoaded: isFHEReady(),
        instanceReady: fheInstance !== null,
    };
};

/**
 * Decrypt an encrypted value using the FHE instance
 * The user must have permission to decrypt (owner of the encrypted data)
 * @param ciphertext - The encrypted handle (euint32)
 * @param userAddress - The user's wallet address
 * @param provider - Optional ethereum provider
 */
export const decryptValue = async (
    ciphertext: bigint | string,
    userAddress: Address,
    provider?: any
): Promise<number> => {
    console.log('[FHE] Decrypting value for user:', userAddress);
    const instance = await getInstance(provider);
    const contractAddr = getAddress(CONTRACT_ADDRESS);
    const userAddr = getAddress(userAddress);

    // Convert ciphertext to the right format if needed
    const ctValue = typeof ciphertext === 'string' ? BigInt(ciphertext) : ciphertext;

    console.log('[FHE] Requesting decryption...');

    // Use the SDK's reencrypt function to get the decrypted value
    // This requires the user to sign a message to prove ownership
    const decrypted = await instance.reencrypt(
        ctValue,
        contractAddr,
        userAddr
    );

    console.log('[FHE] Decryption complete');
    return Number(decrypted);
};

/**
 * Request re-encryption for viewing encrypted data
 * Returns decrypted values for the given handles
 * @param ciphertextHandles - Array of encrypted handles to decrypt
 * @param userAddress - The user's wallet address
 * @param provider - Optional ethereum provider
 */
export const requestReencryption = async (
    ciphertextHandles: (bigint | string)[],
    userAddress: Address,
    provider?: any
): Promise<number[]> => {
    console.log('[FHE] Requesting re-encryption for', ciphertextHandles.length, 'values');
    const instance = await getInstance(provider);
    const contractAddr = getAddress(CONTRACT_ADDRESS);
    const userAddr = getAddress(userAddress);

    const decryptedValues: number[] = [];

    for (const handle of ciphertextHandles) {
        const ctValue = typeof handle === 'string' ? BigInt(handle) : handle;
        try {
            const decrypted = await instance.reencrypt(
                ctValue,
                contractAddr,
                userAddr
            );
            decryptedValues.push(Number(decrypted));
        } catch (error) {
            console.error('[FHE] Failed to decrypt handle:', handle, error);
            decryptedValues.push(0); // Push 0 for failed decryptions
        }
    }

    return decryptedValues;
};
