import { useState, useEffect, useCallback } from 'react';
import { useAccount, usePublicClient } from 'wagmi';
import { Link } from 'react-router-dom';
import { Header } from '@/components/Header';
import { Footer } from '@/components/Footer';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Badge } from '@/components/ui/badge';
import { Skeleton } from '@/components/ui/skeleton';
import { toast } from 'sonner';
import {
  Shield,
  User,
  FileText,
  MapPin,
  Calendar,
  Lock,
  Unlock,
  AlertCircle,
  CheckCircle2,
  XCircle,
  Clock,
  ArrowLeft,
  Eye,
  EyeOff,
} from 'lucide-react';
import { CODED_COMPLIANCE_ABI, CONTRACT_ADDRESS } from '@/lib/contractABI';
import { initializeFHE, requestReencryption } from '@/lib/fhe';

// Country code mapping (ISO 3166-1 numeric)
const COUNTRY_CODES: Record<number, string> = {
  156: 'China',
  840: 'United States',
  826: 'United Kingdom',
  392: 'Japan',
  410: 'South Korea',
  276: 'Germany',
  250: 'France',
  380: 'Italy',
  724: 'Spain',
  36: 'Australia',
  124: 'Canada',
  76: 'Brazil',
  643: 'Russia',
  356: 'India',
  484: 'Mexico',
  528: 'Netherlands',
  756: 'Switzerland',
  752: 'Sweden',
  578: 'Norway',
  208: 'Denmark',
  56: 'Belgium',
  40: 'Austria',
  620: 'Portugal',
  300: 'Greece',
  616: 'Poland',
  702: 'Singapore',
  458: 'Malaysia',
  764: 'Thailand',
  360: 'Indonesia',
  608: 'Philippines',
  704: 'Vietnam',
};

const getCountryName = (code: number): string => {
  return COUNTRY_CODES[code] || `Country Code: ${code}`;
};

type VerificationStatus = 'Unverified' | 'Approved' | 'Declined';

interface KYCRecord {
  exists: boolean;
  documentRef: string;
  fullName: string;
  countryHandle: bigint;
  birthYearHandle: bigint;
  status: VerificationStatus;
  submissionTime: number;
}

interface DecryptedData {
  countryCode: number | null;
  birthYear: number | null;
}

const Profile = () => {
  const { address, isConnected } = useAccount();
  const publicClient = usePublicClient();

  const [isLoading, setIsLoading] = useState(true);
  const [record, setRecord] = useState<KYCRecord | null>(null);
  const [decryptedData, setDecryptedData] = useState<DecryptedData>({
    countryCode: null,
    birthYear: null,
  });
  const [isDecrypting, setIsDecrypting] = useState(false);
  const [showDecrypted, setShowDecrypted] = useState(false);

  // Fetch KYC record from contract
  const fetchRecord = useCallback(async () => {
    if (!address || !publicClient) {
      setIsLoading(false);
      return;
    }

    try {
      setIsLoading(true);

      // Check if record exists
      const exists = await publicClient.readContract({
        address: CONTRACT_ADDRESS as `0x${string}`,
        abi: CODED_COMPLIANCE_ABI,
        functionName: 'recordExists',
        args: [address],
      }) as boolean;

      if (!exists) {
        setRecord({ exists: false } as KYCRecord);
        setIsLoading(false);
        return;
      }

      // Fetch all data in parallel
      const [stateResult, nameResult, docRefResult, fullRecordResult] = await Promise.all([
        publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CODED_COMPLIANCE_ABI,
          functionName: 'queryRecordState',
          args: [address],
        }) as Promise<[number, bigint]>,
        publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CODED_COMPLIANCE_ABI,
          functionName: 'retrieveName',
          args: [address],
        }) as Promise<string>,
        publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CODED_COMPLIANCE_ABI,
          functionName: 'retrieveDocumentRef',
          args: [address],
        }) as Promise<string>,
        publicClient.readContract({
          address: CONTRACT_ADDRESS as `0x${string}`,
          abi: CODED_COMPLIANCE_ABI,
          functionName: 'retrieveFullRecord',
          args: [address],
        }) as Promise<[string, string, bigint, bigint]>,
      ]);

      const states: VerificationStatus[] = ['Unverified', 'Approved', 'Declined'];

      setRecord({
        exists: true,
        documentRef: docRefResult,
        fullName: nameResult,
        countryHandle: fullRecordResult[2],
        birthYearHandle: fullRecordResult[3],
        status: states[stateResult[0]] || 'Unverified',
        submissionTime: Number(stateResult[1]),
      });
    } catch (error: any) {
      console.error('Failed to fetch KYC record:', error);
      toast.error('Failed to load KYC data');
    } finally {
      setIsLoading(false);
    }
  }, [address, publicClient]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  // Decrypt sensitive data
  const handleDecrypt = async () => {
    if (!address || !record) return;

    setIsDecrypting(true);
    try {
      toast.info('Initializing decryption...');
      await initializeFHE();

      toast.info('Please sign the message to decrypt your data...');
      const decrypted = await requestReencryption(
        [record.countryHandle, record.birthYearHandle],
        address
      );

      setDecryptedData({
        countryCode: decrypted[0],
        birthYear: decrypted[1],
      });
      setShowDecrypted(true);
      toast.success('Data decrypted successfully!');
    } catch (error: any) {
      console.error('Decryption failed:', error);
      toast.error(error.message || 'Failed to decrypt data');
    } finally {
      setIsDecrypting(false);
    }
  };

  const getStatusBadge = (status: VerificationStatus) => {
    switch (status) {
      case 'Approved':
        return (
          <Badge className="bg-green-500/20 text-green-400 border-green-500/30">
            <CheckCircle2 className="w-3 h-3 mr-1" />
            Approved
          </Badge>
        );
      case 'Declined':
        return (
          <Badge className="bg-red-500/20 text-red-400 border-red-500/30">
            <XCircle className="w-3 h-3 mr-1" />
            Declined
          </Badge>
        );
      default:
        return (
          <Badge className="bg-yellow-500/20 text-yellow-400 border-yellow-500/30">
            <Clock className="w-3 h-3 mr-1" />
            Pending Review
          </Badge>
        );
    }
  };

  const formatDate = (timestamp: number) => {
    if (!timestamp) return 'N/A';
    return new Date(timestamp * 1000).toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'long',
      day: 'numeric',
      hour: '2-digit',
      minute: '2-digit',
      timeZoneName: 'short',
    });
  };

  // Not connected state
  if (!isConnected) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-12 pb-12 text-center">
                <AlertCircle className="w-16 h-16 mx-auto mb-4 text-yellow-400" />
                <h2 className="text-2xl font-bold mb-2">Wallet Not Connected</h2>
                <p className="text-muted-foreground mb-6">
                  Please connect your wallet to view your KYC profile.
                </p>
                <Link to="/">
                  <Button>
                    <ArrowLeft className="w-4 h-4 mr-2" />
                    Back to Home
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // Loading state
  if (isLoading) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardHeader>
                <Skeleton className="h-8 w-48" />
                <Skeleton className="h-4 w-64 mt-2" />
              </CardHeader>
              <CardContent className="space-y-6">
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
                <Skeleton className="h-24 w-full" />
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  // No KYC record
  if (!record?.exists) {
    return (
      <div className="min-h-screen bg-background">
        <Header />
        <main className="pt-32 pb-20 px-6">
          <div className="container mx-auto max-w-2xl">
            <Card className="border-border/50 bg-card/50 backdrop-blur">
              <CardContent className="pt-12 pb-12 text-center">
                <User className="w-16 h-16 mx-auto mb-4 text-muted-foreground" />
                <h2 className="text-2xl font-bold mb-2">No KYC Record Found</h2>
                <p className="text-muted-foreground mb-6">
                  You haven't submitted your KYC information yet. Complete your verification to get started.
                </p>
                <Link to="/">
                  <Button className="bg-gradient-to-r from-primary to-secondary">
                    <Shield className="w-4 h-4 mr-2" />
                    Submit KYC
                  </Button>
                </Link>
              </CardContent>
            </Card>
          </div>
        </main>
        <Footer />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-background">
      <Header />
      <main className="pt-32 pb-20 px-6">
        <div className="container mx-auto max-w-2xl">
          {/* Back Button */}
          <Link to="/" className="inline-flex items-center text-muted-foreground hover:text-foreground mb-6 transition-colors">
            <ArrowLeft className="w-4 h-4 mr-2" />
            Back to Home
          </Link>

          {/* Profile Card */}
          <Card className="border-border/50 bg-card/50 backdrop-blur">
            <CardHeader>
              <div className="flex items-center justify-between">
                <div>
                  <CardTitle className="text-2xl flex items-center gap-2">
                    <User className="w-6 h-6 text-primary" />
                    KYC Profile
                  </CardTitle>
                  <CardDescription className="mt-1">
                    Your privacy-preserving identity verification
                  </CardDescription>
                </div>
                {getStatusBadge(record.status)}
              </div>
            </CardHeader>

            <CardContent className="space-y-6">
              {/* Public Information */}
              <div className="space-y-4">
                <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                  Public Information
                </h3>

                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <User className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Full Name</p>
                      <p className="font-medium">{record.fullName}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <FileText className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Document Reference</p>
                      <p className="font-medium font-mono text-sm">{record.documentRef}</p>
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-muted/30 border border-border/50">
                    <Clock className="w-5 h-5 text-primary mt-0.5" />
                    <div>
                      <p className="text-sm text-muted-foreground">Submission Date</p>
                      <p className="font-medium">{formatDate(record.submissionTime)}</p>
                    </div>
                  </div>
                </div>
              </div>

              {/* Encrypted Information */}
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">
                    Encrypted Information (FHE Protected)
                  </h3>
                  <Button
                    variant="outline"
                    size="sm"
                    onClick={showDecrypted ? () => setShowDecrypted(false) : handleDecrypt}
                    disabled={isDecrypting}
                  >
                    {isDecrypting ? (
                      <>
                        <Lock className="w-4 h-4 mr-2 animate-pulse" />
                        Decrypting...
                      </>
                    ) : showDecrypted ? (
                      <>
                        <EyeOff className="w-4 h-4 mr-2" />
                        Hide
                      </>
                    ) : (
                      <>
                        <Eye className="w-4 h-4 mr-2" />
                        Decrypt & View
                      </>
                    )}
                  </Button>
                </div>

                <div className="grid gap-4">
                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                    <MapPin className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Country</p>
                      {showDecrypted && decryptedData.countryCode !== null ? (
                        <p className="font-medium">{getCountryName(decryptedData.countryCode)}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm text-muted-foreground">
                            ••••••••••••
                          </span>
                        </div>
                      )}
                    </div>
                  </div>

                  <div className="flex items-start gap-3 p-4 rounded-lg bg-gradient-to-r from-primary/10 to-secondary/10 border border-primary/20">
                    <Calendar className="w-5 h-5 text-primary mt-0.5" />
                    <div className="flex-1">
                      <p className="text-sm text-muted-foreground">Birth Year</p>
                      {showDecrypted && decryptedData.birthYear !== null ? (
                        <p className="font-medium">{decryptedData.birthYear}</p>
                      ) : (
                        <div className="flex items-center gap-2">
                          <Lock className="w-4 h-4 text-muted-foreground" />
                          <span className="font-mono text-sm text-muted-foreground">
                            ••••
                          </span>
                        </div>
                      )}
                    </div>
                  </div>
                </div>

                {!showDecrypted && (
                  <p className="text-xs text-muted-foreground flex items-center gap-1">
                    <Shield className="w-3 h-3" />
                    Click "Decrypt & View" to reveal your encrypted data. You'll need to sign a message to prove ownership.
                  </p>
                )}
              </div>

              {/* Wallet Address */}
              <div className="pt-4 border-t border-border/50">
                <p className="text-sm text-muted-foreground">Connected Wallet</p>
                <p className="font-mono text-sm break-all">{address}</p>
              </div>
            </CardContent>
          </Card>
        </div>
      </main>
      <Footer />
    </div>
  );
};

export default Profile;
