import { Mail, Phone, Globe, Facebook, Instagram } from "lucide-react";
import { Link } from "react-router-dom";

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
              <span className="text-xs font-medium text-accent tracking-widest uppercase">Discover, Share & Buy</span>
            </Link>
            <p className="text-sm text-muted-foreground">
              Your trusted shopping partner connecting US stores to the Middle East.
            </p>
            {/* Social Media */}
            <div className="flex items-center gap-3 pt-1">
              <a
                href="https://www.facebook.com/egate.shopping1/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Facebook"
              >
                <Facebook className="h-4 w-4" />
              </a>
              <a
                href="https://www.instagram.com/egate.shopping/"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-primary/10 text-primary hover:bg-primary/20 transition-colors"
                title="Instagram"
              >
                <Instagram className="h-4 w-4" />
              </a>
              <a
                href="https://wa.me/9647709651092"
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center justify-center w-9 h-9 rounded-lg bg-success/10 text-success hover:bg-success/20 transition-colors"
                title="WhatsApp"
              >
                <Phone className="h-4 w-4" />
              </a>
            </div>
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
            <h4 className="font-semibold mb-4">Contact Us</h4>
            <ul className="space-y-3 text-sm">
              <li className="flex items-center gap-2 text-muted-foreground">
                <Globe className="h-4 w-4 shrink-0" />
                <a
                  href="https://www.egateshopping.com"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  www.egateshopping.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Mail className="h-4 w-4 shrink-0" />
                <a href="mailto:support@egateshopping.com" className="hover:text-foreground transition-colors">
                  support@egateshopping.com
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Phone className="h-4 w-4 shrink-0 text-success" />
                <a
                  href="https://wa.me/9647709651092"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  WhatsApp: +964 770 965 1092
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Facebook className="h-4 w-4 shrink-0" />
                <a
                  href="https://www.facebook.com/egate.shopping1/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  egate.shopping1
                </a>
              </li>
              <li className="flex items-center gap-2 text-muted-foreground">
                <Instagram className="h-4 w-4 shrink-0" />
                <a
                  href="https://www.instagram.com/egate.shopping/"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-foreground transition-colors"
                >
                  @egate.shopping
                </a>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="font-semibold mb-4">How It Works</h4>
            <ul className="space-y-2 text-sm text-muted-foreground">
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">1.</span>
                Paste any US product link
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">2.</span>
                We purchase & ship to our warehouse
              </li>
              <li className="flex items-start gap-2">
                <span className="text-primary font-bold shrink-0">3.</span>
                We ship directly to your door
              </li>
              <li className="mt-3 text-xs">📦 Delivery in 7–14 business days</li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-border flex flex-col sm:flex-row items-center justify-between gap-2 text-sm text-muted-foreground">
          <p>© {new Date().getFullYear()} Egate Shopping. All rights reserved.</p>
          <p className="text-xs">🇺🇸 US Stores → 🌍 Middle East Delivery</p>
        </div>
      </div>
    </footer>
  );
}
