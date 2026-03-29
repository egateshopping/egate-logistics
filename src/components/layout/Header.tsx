import { Link, useNavigate, useLocation } from 'react-router-dom';
import { User, LogOut, LayoutDashboard, Store, ShieldCheck } from 'lucide-react';
import { Button } from '@/components/ui/button';
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from '@/components/ui/dropdown-menu';
import { useAuth } from '@/contexts/AuthContext';
import { useLanguage } from '@/contexts/LanguageContext';
import { useTheme } from '@/contexts/ThemeContext';
import egateLogo from '@/assets/egate-logo.png';

export function Header() {
  const { user, profile, isAdmin, signOut } = useAuth();
  const { lang, setLang, t } = useLanguage();
  const { isDark, toggleTheme } = useTheme();
  const navigate = useNavigate();
  const location = useLocation();

  const handleSignOut = async () => { await signOut(); navigate('/'); };
  const isActive = (path: string) => location.pathname === path;

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border/40 bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between">
        <Link to="/" className="flex items-center">
          <img src={egateLogo} alt="Egate Shopping" className="h-10 w-auto object-contain" />
        </Link>

        <nav className="hidden md:flex items-center gap-1">
          <Link to="/">
            <Button variant={isActive('/') ? 'secondary' : 'ghost'} size="sm" className="text-sm">
              {t('home')}
            </Button>
          </Link>
          <Link to="/stores">
            <Button variant={isActive('/stores') ? 'secondary' : 'ghost'} size="sm" className="text-sm">
              <Store className="h-4 w-4 mr-1.5" />
              {t('stores')}
            </Button>
          </Link>
          {user && (
            <Link to="/dashboard">
              <Button variant={isActive('/dashboard') ? 'secondary' : 'ghost'} size="sm" className="text-sm">
                <LayoutDashboard className="h-4 w-4 mr-1.5" />
                {t('myOrders')}
              </Button>
            </Link>
          )}
          {isAdmin && (
            <Link to="/admin">
              <Button variant={isActive('/admin') ? 'secondary' : 'ghost'} size="sm" className="text-sm">
                <ShieldCheck className="h-4 w-4 mr-1.5" />
                {t('admin')}
              </Button>
            </Link>
          )}
        </nav>

        <div className="flex items-center gap-2">
          {/* زر الوضع الليلي */}
          <Button
            variant="ghost"
            size="sm"
            onClick={toggleTheme}
            className="text-sm px-2"
            title={isDark ? 'Switch to Light Mode' : 'Switch to Dark Mode'}
          >
            {isDark ? '☀️' : '🌙'}
          </Button>

          {/* زر تبديل اللغة */}
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setLang(lang === 'en' ? 'ar' : 'en')}
            className="text-sm font-semibold px-3"
            title="Switch Language"
          >
            {lang === 'en' ? '🇮🇶 عربي' : '🇺🇸 EN'}
          </Button>

          {user ? (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="sm" className="gap-2">
                  <div className="flex h-8 w-8 items-center justify-center rounded-full bg-primary/10">
                    <User className="h-4 w-4 text-primary" />
                  </div>
                  <span className="hidden sm:inline text-sm font-medium">
                    {profile?.full_name || 'Account'}
                  </span>
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-48">
                <DropdownMenuItem onClick={() => navigate('/dashboard')}>
                  <LayoutDashboard className="h-4 w-4 mr-2" />
                  {t('myOrders')}
                </DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate('/profile')}>
                  <User className="h-4 w-4 mr-2" />
                  {t('profile')}
                </DropdownMenuItem>
                {isAdmin && (
                  <DropdownMenuItem onClick={() => navigate('/admin')}>
                    <ShieldCheck className="h-4 w-4 mr-2" />
                    Admin Panel
                  </DropdownMenuItem>
                )}
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut} className="text-destructive">
                  <LogOut className="h-4 w-4 mr-2" />
                  {t('signOut')}
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          ) : (
            <div className="flex items-center gap-2">
              <Link to="/login">
                <Button variant="ghost" size="sm">{t('signIn')}</Button>
              </Link>
              <Link to="/signup">
                <Button size="sm" className="gradient-accent border-0 text-accent-foreground hover:opacity-90">
                  {t('getStarted')}
                </Button>
              </Link>
            </div>
          )}
        </div>
      </div>
    </header>
  );
}
