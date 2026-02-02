import { forwardRef } from "react";
import { Link } from "react-router-dom";
import { Shield, Users, Plane, Mail, Phone, Moon, Sun } from "lucide-react";
import { useTheme } from "@/hooks/useTheme";

const WHATSAPP_NUMBER = "447824812923";
const CONTACT_EMAIL = "musashamsy@gmail.com";

const Footer = forwardRef<HTMLElement>((_, ref) => {
  const { theme, toggleTheme } = useTheme();

  return (
    <footer ref={ref} className="bg-sidebar text-sidebar-foreground pt-16 pb-8">
      <div className="container mx-auto px-4 lg:px-8">
        <div className="grid md:grid-cols-2 lg:grid-cols-4 gap-12 mb-12">
          {/* Brand */}
          <div>
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
                <Shield className="w-5 h-5 text-primary-foreground" />
              </div>
              <span className="font-heading text-xl font-bold text-sidebar-primary">
                AMANA MARKET
              </span>
            </div>
            <p className="text-sidebar-foreground/70 text-sm mb-6">
              Your trusted partner for community contributions and travel consulting services.
            </p>
            <div className="flex gap-4">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-travel transition-colors"
              >
                <Phone className="w-5 h-5" />
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-travel transition-colors"
              >
                <Mail className="w-5 h-5" />
              </a>
              {/* Theme Toggle */}
              <button
                onClick={toggleTheme}
                className="w-10 h-10 rounded-lg bg-sidebar-accent flex items-center justify-center hover:bg-travel transition-colors"
                aria-label="Toggle theme"
              >
                {theme === "light" ? (
                  <Moon className="w-5 h-5" />
                ) : (
                  <Sun className="w-5 h-5" />
                )}
              </button>
            </div>
          </div>

          {/* Services */}
          <div>
            <h4 className="font-semibold mb-4 text-sidebar-primary">Our Services</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <Link to="/login/contribution" className="flex items-center gap-2 hover:text-contribution transition-colors">
                  <Users className="w-4 h-4" />
                  Amana Market Contribution
                </Link>
              </li>
              <li>
                <Link to="/teemah-travels" className="flex items-center gap-2 hover:text-travel transition-colors">
                  <Plane className="w-4 h-4" />
                  Teemah Travels
                </Link>
              </li>
            </ul>
          </div>

          {/* Quick Links */}
          <div>
            <h4 className="font-semibold mb-4 text-sidebar-primary">Quick Links</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <Link to="/" className="hover:text-sidebar-primary transition-colors">Home</Link>
              </li>
              <li>
                <Link to="/teemah-travels" className="hover:text-sidebar-primary transition-colors">Teemah Travels</Link>
              </li>
              <li>
                <Link to="/login/admin" className="hover:text-sidebar-primary transition-colors">Admin Portal</Link>
              </li>
            </ul>
          </div>

          {/* Contact */}
          <div>
            <h4 className="font-semibold mb-4 text-sidebar-primary">Contact Us</h4>
            <ul className="space-y-3 text-sm text-sidebar-foreground/70">
              <li>
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="flex items-center gap-2 hover:text-travel transition-colors"
                >
                  <Phone className="w-4 h-4" />
                  +44 7824 812923
                </a>
              </li>
              <li>
                <a
                  href={`mailto:${CONTACT_EMAIL}`}
                  className="flex items-center gap-2 hover:text-travel transition-colors"
                >
                  <Mail className="w-4 h-4" />
                  {CONTACT_EMAIL}
                </a>
              </li>
            </ul>
          </div>
        </div>

        {/* Bottom */}
        <div className="pt-8 border-t border-sidebar-border flex flex-col md:flex-row justify-between items-center gap-4">
          <p className="text-sm text-sidebar-foreground/60">
            © {new Date().getFullYear()} AMANA MARKET. All rights reserved.
          </p>
          <div className="flex gap-6 text-sm text-sidebar-foreground/60">
            <span>Privacy Policy</span>
            <span>Terms of Service</span>
          </div>
        </div>
      </div>
    </footer>
  );
});

Footer.displayName = "Footer";

export default Footer;
