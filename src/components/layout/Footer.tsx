import { Mail, Phone, MapPin, Globe } from 'lucide-react';
import { Link } from 'react-router-dom';

export function Footer() {
  return (
    <footer className="border-t border-border bg-muted/30">
      <div className="container py-12">
        <div className="grid gap-8 md:grid-cols-4">
          <div className="space-y-4">
            <Link to="/" className="flex flex-col gap-1">
              <span className="text-2xl font-extrabold tracking-tight">
                <span className="text-primary">e</span>
                <span className="text-primary">g</span>
                <span className="text-primary">ate</span>
              </span>
              <span className="text-xs font-medium text-accent tracking-widest uppercase">
                Discover, Share & Buy
              </span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your trusted shopping partner connecting US stores to the Middle East.
            </p>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Quick Links</h4>
            <ul className="space-y-2 text-sm">
              <li>
                <Link to="/" className="text-muted-foreground hover:text-foreground transition-colors">
                  Home
                </Link>
              </li>
              <li>
                <Link to="/stores" className="text-muted-foreground hover:text-foreground transition-colors">
                  Store Directory
                </Link>
              </li>
              <li>
                <Link to="/dashboard" className="text-muted-foreground hover:text-foreground transition-colors">
                  My Orders
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Support</h4>
            <ul className="space-y-2 text-sm">
              <li className="text-muted-foreground">FAQ</li>
              <li className="text-muted-foreground">Shipping Policy</li>
              <li className="text-muted-foreground">Terms of Service</li>
              <li className="text-muted-foreground">Privacy Policy</li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">Contact</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4" />
                www.egateshopping.com
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4" />
                support@egateshopping.com
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4" />
                +1 (555) 123-4567
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <MapPin className="h-4 w-4" />
                Delaware, USA
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border text-center text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Egate Shopping. All rights reserved.</p>
        </div>
      </div>
    </footer>
  );
}
