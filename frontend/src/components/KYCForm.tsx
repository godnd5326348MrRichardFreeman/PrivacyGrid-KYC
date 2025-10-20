import { useState } from 'react';
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { useKYC } from '@/hooks/useKYC';
import { Loader2 } from 'lucide-react';

interface KYCFormProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

const COUNTRIES = [
  { code: 840, name: 'United States' },
  { code: 156, name: 'China' },
  { code: 826, name: 'United Kingdom' },
  { code: 392, name: 'Japan' },
  { code: 276, name: 'Germany' },
  { code: 250, name: 'France' },
  { code: 124, name: 'Canada' },
  { code: 36, name: 'Australia' },
  { code: 356, name: 'India' },
  { code: 410, name: 'South Korea' },
  { code: 380, name: 'Italy' },
  { code: 724, name: 'Spain' },
  { code: 528, name: 'Netherlands' },
  { code: 756, name: 'Switzerland' },
  { code: 702, name: 'Singapore' },
];

export const KYCForm = ({ open, onOpenChange }: KYCFormProps) => {
  const { submitKYC, isLoading } = useKYC();
  const [formData, setFormData] = useState({
    fullName: '',
    countryCode: '',
    birthYear: ''
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.countryCode) {
      return;
    }

    try {
      // 传递空字符串作为 documentReference
      await submitKYC(
        '',
        formData.fullName,
        parseInt(formData.countryCode),
        parseInt(formData.birthYear)
      );

      // 成功后关闭对话框并重置表单
      onOpenChange(false);
      setFormData({
        fullName: '',
        countryCode: '',
        birthYear: ''
      });
    } catch (error) {
      // 错误已在 hook 中处理
    }
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[500px]">
        <DialogHeader>
          <DialogTitle>FHE Encryption Demo - KYC Form</DialogTitle>
          <DialogDescription>
            Demonstrate FHE encryption by submitting sample data. Country code and birth year will be encrypted on-chain.
            <br />
            <span className="text-amber-400 text-xs mt-1 block">
              ⚠️ Demo purposes only - No real identity verification is performed
            </span>
          </DialogDescription>
        </DialogHeader>

        <form onSubmit={handleSubmit} className="space-y-4 mt-4">
          <div className="space-y-2">
            <Label htmlFor="fullName">Full Name (Sample Data)</Label>
            <Input
              id="fullName"
              placeholder="John Doe"
              value={formData.fullName}
              onChange={(e) => setFormData({ ...formData, fullName: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Stored as plain text for demo purposes
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="countryCode">Country (FHE Encrypted)</Label>
            <Select
              value={formData.countryCode}
              onValueChange={(value) => setFormData({ ...formData, countryCode: value })}
              required
            >
              <SelectTrigger>
                <SelectValue placeholder="Select your country" />
              </SelectTrigger>
              <SelectContent>
                {COUNTRIES.map((country) => (
                  <SelectItem key={country.code} value={country.code.toString()}>
                    {country.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Will be encrypted using FHE before on-chain storage
            </p>
          </div>

          <div className="space-y-2">
            <Label htmlFor="birthYear">Birth Year (FHE Encrypted)</Label>
            <Input
              id="birthYear"
              type="number"
              placeholder="1990"
              min="1900"
              max={new Date().getFullYear()}
              value={formData.birthYear}
              onChange={(e) => setFormData({ ...formData, birthYear: e.target.value })}
              required
            />
            <p className="text-xs text-muted-foreground">
              Will be encrypted using FHE before on-chain storage
            </p>
          </div>

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
            >
              Cancel
            </Button>
            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Processing...
                </>
              ) : (
                'Submit KYC'
              )}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
};
