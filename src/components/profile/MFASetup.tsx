import { useState, useEffect } from 'react';
import { Shield, ShieldCheck, ShieldOff, Loader2, Copy, CheckCircle } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';

export function MFASetup() {
  const [isEnrolled, setIsEnrolled] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [isEnrolling, setIsEnrolling] = useState(false);
  const [qrCode, setQrCode] = useState('');
  const [secret, setSecret] = useState('');
  const [factorId, setFactorId] = useState('');
  const [verifyCode, setVerifyCode] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [step, setStep] = useState<'idle' | 'scan' | 'verify'>('idle');
  const [enrolledFactorId, setEnrolledFactorId] = useState('');
  const [copied, setCopied] = useState(false);

  useEffect(() => { checkMFAStatus(); }, []);

  const checkMFAStatus = async () => {
    const { data } = await supabase.auth.mfa.listFactors();
    const verified = data?.totp?.find(f => f.status === 'verified');
    if (verified) { setIsEnrolled(true); setEnrolledFactorId(verified.id); }
    setIsLoading(false);
  };

  const startEnrollment = async () => {
    setIsEnrolling(true);
    const { data, error } = await supabase.auth.mfa.enroll({ factorType: 'totp', issuer: 'Egate Shopping' });
    setIsEnrolling(false);
    if (error || !data) { toast.error('Failed to start 2FA setup'); return; }
    setQrCode(data.totp.qr_code);
    setSecret(data.totp.secret);
    setFactorId(data.id);
    setStep('scan');
  };

  const startChallenge = async () => {
    const { data, error } = await supabase.auth.mfa.challenge({ factorId });
    if (error || !data) { toast.error('Failed to create challenge'); return; }
    setChallengeId(data.id);
    setStep('verify');
  };

  const verifyEnrollment = async (e: React.FormEvent) => {
    e.preventDefault();
    if (verifyCode.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    const { error } = await supabase.auth.mfa.verify({ factorId, challengeId, code: verifyCode });
    if (error) { toast.error('Invalid code. Please try again.'); return; }
    toast.success('✅ Two-Factor Authentication enabled!');
    setIsEnrolled(true);
    setEnrolledFactorId(factorId);
    setStep('idle');
    setQrCode(''); setSecret('');
  };

  const disableMFA = async () => {
    if (!confirm('Are you sure you want to disable Two-Factor Authentication?')) return;
    const { error } = await supabase.auth.mfa.unenroll({ factorId: enrolledFactorId });
    if (error) { toast.error('Failed to disable 2FA'); return; }
    toast.success('2FA disabled');
    setIsEnrolled(false); setEnrolledFactorId(''); setStep('idle');
  };

  const copySecret = () => {
    navigator.clipboard.writeText(secret);
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  if (isLoading) return (
    <div className="flex items-center justify-center py-6">
      <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
    </div>
  );

  return (
    <div className="rounded-2xl bg-card border border-border p-6">
      <div className="flex items-center gap-3 mb-5">
        {isEnrolled
          ? <ShieldCheck className="h-5 w-5 text-success" />
          : <Shield className="h-5 w-5 text-muted-foreground" />}
        <div>
          <h3 className="font-semibold">Two-Factor Authentication (2FA)</h3>
          <p className="text-xs text-muted-foreground">
            {isEnrolled ? 'Your account is protected with 2FA' : 'Add an extra layer of security'}
          </p>
        </div>
        {isEnrolled && (
          <span className="ml-auto text-xs font-medium px-2 py-1 bg-success/10 text-success rounded-full">✓ Enabled</span>
        )}
      </div>

      {isEnrolled && (
        <Button variant="outline" size="sm" className="text-destructive border-destructive/30 hover:bg-destructive/5" onClick={disableMFA}>
          <ShieldOff className="h-4 w-4 mr-2" />Disable 2FA
        </Button>
      )}

      {!isEnrolled && step === 'idle' && (
        <Button onClick={startEnrollment} disabled={isEnrolling} className="gradient-hero border-0">
          {isEnrolling ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Setting up...</> : <><Shield className="h-4 w-4 mr-2" />Enable 2FA</>}
        </Button>
      )}

      {step === 'scan' && qrCode && (
        <div className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-xl text-sm space-y-1">
            <p className="font-medium">Step 1: Scan the QR code</p>
            <p className="text-muted-foreground text-xs">Open Google Authenticator or any TOTP app and scan the code below.</p>
          </div>
          <div className="flex justify-center">
            <div className="p-3 bg-white rounded-xl border">
              <img src={qrCode} alt="QR Code" className="w-48 h-48" />
            </div>
          </div>
          <div className="space-y-1">
            <p className="text-xs text-muted-foreground">Or enter manually:</p>
            <div className="flex gap-2">
              <Input value={secret} readOnly className="font-mono text-xs" />
              <Button variant="outline" size="sm" onClick={copySecret}>
                {copied ? <CheckCircle className="h-4 w-4 text-success" /> : <Copy className="h-4 w-4" />}
              </Button>
            </div>
          </div>
          <Button onClick={startChallenge} className="w-full gradient-hero border-0">Next — Verify Code →</Button>
        </div>
      )}

      {step === 'verify' && (
        <form onSubmit={verifyEnrollment} className="space-y-4">
          <div className="p-4 bg-muted/30 rounded-xl text-sm">
            <p className="font-medium">Step 2: Enter the 6-digit code</p>
            <p className="text-muted-foreground text-xs mt-1">Enter the code shown in your authenticator app.</p>
          </div>
          <div className="space-y-2">
            <Label>Authentication Code</Label>
            <Input type="text" inputMode="numeric" maxLength={6} placeholder="000000"
              value={verifyCode} onChange={(e) => setVerifyCode(e.target.value.replace(/\D/g, ''))}
              className="text-center text-2xl tracking-[0.5em] font-mono" autoFocus />
          </div>
          <Button type="submit" disabled={verifyCode.length !== 6} className="w-full gradient-hero border-0">
            <ShieldCheck className="h-4 w-4 mr-2" />Confirm & Enable 2FA
          </Button>
          <button type="button" onClick={() => setStep('scan')}
            className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
            ← Back to QR code
          </button>
        </form>
      )}
    </div>
  );
}
