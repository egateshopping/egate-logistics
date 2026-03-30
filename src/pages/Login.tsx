import { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import { Eye, EyeOff, Loader2, Shield } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useAuth } from '@/contexts/AuthContext';
import { supabase } from '@/lib/supabase';
import { toast } from 'sonner';
import egateLogo from '@/assets/egate-logo.png';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  // MFA state
  const [mfaRequired, setMfaRequired] = useState(false);
  const [mfaCode, setMfaCode] = useState('');
  const [factorId, setFactorId] = useState('');
  const [challengeId, setChallengeId] = useState('');
  const [isMfaLoading, setIsMfaLoading] = useState(false);

  const { signIn } = useAuth();
  const navigate = useNavigate();
  const location = useLocation();
  const from = (location.state as { from?: string })?.from || '/dashboard';

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsLoading(true);

    const { error } = await signIn(email, password);

    if (error) {
      toast.error(error.message);
      setIsLoading(false);
      return;
    }

    // Check if MFA is required
    const { data: aalData } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
    if (aalData?.nextLevel === 'aal2' && aalData?.currentLevel === 'aal1') {
      // MFA required — get factors
      const { data: factors } = await supabase.auth.mfa.listFactors();
      const totpFactor = factors?.totp?.[0];
      if (totpFactor) {
        const { data: challenge } = await supabase.auth.mfa.challenge({ factorId: totpFactor.id });
        if (challenge) {
          setFactorId(totpFactor.id);
          setChallengeId(challenge.id);
          setMfaRequired(true);
          setIsLoading(false);
          return;
        }
      }
    }

    toast.success('Welcome back!');
    navigate(from);
    setIsLoading(false);
  };

  const handleMfaVerify = async (e: React.FormEvent) => {
    e.preventDefault();
    if (mfaCode.length !== 6) { toast.error('Enter the 6-digit code'); return; }
    setIsMfaLoading(true);

    const { error } = await supabase.auth.mfa.verify({
      factorId,
      challengeId,
      code: mfaCode,
    });

    setIsMfaLoading(false);
    if (error) { toast.error('Invalid code. Please try again.'); return; }

    toast.success('Welcome back!');
    navigate(from);
  };

  return (
    <div className="min-h-screen flex">
      {/* Left side — Form */}
      <div className="flex-1 flex items-center justify-center p-8">
        <div className="w-full max-w-md space-y-8">

          <div className="text-center">
            <Link to="/" className="inline-block mb-8">
              <img src={egateLogo} alt="Egate Shopping" className="h-14 w-auto mx-auto object-contain" />
            </Link>

            {!mfaRequired ? (
              <>
                <h1 className="text-2xl font-extrabold">Welcome back</h1>
                <p className="text-muted-foreground mt-2 font-light">Sign in to your account to continue</p>
              </>
            ) : (
              <>
                <div className="flex items-center justify-center w-14 h-14 rounded-2xl bg-primary/10 mx-auto mb-3">
                  <Shield className="h-7 w-7 text-primary" />
                </div>
                <h1 className="text-2xl font-extrabold">Two-Factor Authentication</h1>
                <p className="text-muted-foreground mt-2 font-light">
                  Enter the 6-digit code from your authenticator app
                </p>
              </>
            )}
          </div>

          {!mfaRequired ? (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input id="email" type="email" placeholder="you@example.com"
                  value={email} onChange={(e) => setEmail(e.target.value)} required />
              </div>

              <div className="space-y-2">
                <Label htmlFor="password">Password</Label>
                <div className="relative">
                  <Input id="password" type={showPassword ? 'text' : 'password'}
                    placeholder="••••••••" value={password}
                    onChange={(e) => setPassword(e.target.value)} required />
                  <button type="button" onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-3 top-1/2 -translate-y-1/2 text-muted-foreground hover:text-foreground">
                    {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                  </button>
                </div>
              </div>

              <Button type="submit" disabled={isLoading}
                className="w-full gradient-accent border-0 text-accent-foreground hover:opacity-90">
                {isLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Signing in...</> : 'Sign In'}
              </Button>
            </form>
          ) : (
            <form onSubmit={handleMfaVerify} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="mfa_code">Authentication Code</Label>
                <Input
                  id="mfa_code"
                  type="text"
                  inputMode="numeric"
                  maxLength={6}
                  placeholder="000000"
                  value={mfaCode}
                  onChange={(e) => setMfaCode(e.target.value.replace(/\D/g, ''))}
                  className="text-center text-2xl tracking-[0.5em] font-mono"
                  autoFocus
                />
                <p className="text-xs text-muted-foreground text-center">
                  Open your authenticator app and enter the current code
                </p>
              </div>

              <Button type="submit" disabled={isMfaLoading || mfaCode.length !== 6}
                className="w-full gradient-hero border-0">
                {isMfaLoading ? <><Loader2 className="h-4 w-4 mr-2 animate-spin" />Verifying...</> : <>
                  <Shield className="h-4 w-4 mr-2" />Verify & Sign In
                </>}
              </Button>

              <button type="button" onClick={() => { setMfaRequired(false); setMfaCode(''); }}
                className="w-full text-sm text-muted-foreground hover:text-foreground transition-colors">
                ← Back to login
              </button>
            </form>
          )}

          {!mfaRequired && (
            <p className="text-center text-sm text-muted-foreground">
              Don't have an account?{' '}
              <Link to="/signup" className="text-primary hover:underline font-medium">Create one</Link>
            </p>
          )}
        </div>
      </div>

      {/* Right side — Decoration */}
      <div className="hidden lg:flex flex-1 gradient-hero items-center justify-center p-12">
        <div className="max-w-md text-center text-primary-foreground">
          <img src={egateLogo} alt="Egate Shopping"
            className="h-20 w-auto mx-auto mb-8 brightness-0 invert object-contain" />
          <h2 className="text-3xl font-extrabold mb-4">Shop from America,<br />Delivered to You</h2>
          <p className="text-white/70 font-light">
            Access thousands of US stores and get your products shipped directly to your doorstep in the Middle East.
          </p>
        </div>
      </div>
    </div>
  );
}
