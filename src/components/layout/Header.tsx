import { useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import { Menu, X, ChevronDown, Users, Plane, Shield } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const Header = () => {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const navigate = useNavigate();

  const services = [
    {
      name: "Contribution System",
      description: "Join a contribution group and manage loans",
      href: "/login/contribution",
      icon: Users,
      color: "text-contribution",
    },
    {
      name: "Travel & Academic",
      description: "Visa consultation and academic guidance",
      href: "/login/travel",
      icon: Plane,
      color: "text-travel",
    },
  ];

  return (
    <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
      <nav className="container mx-auto px-4 lg:px-8">
        <div className="flex items-center justify-between h-16 lg:h-20">
          {/* Logo */}
          <Link to="/" className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-primary to-primary/80 flex items-center justify-center">
              <Shield className="w-5 h-5 text-primary-foreground" />
            </div>
            <span className="font-heading text-xl font-bold text-foreground">
              ServiPro
            </span>
          </Link>

          {/* Desktop Navigation */}
          <div className="hidden lg:flex items-center gap-8">
            <Link
              to="/"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Home
            </Link>
            
            <DropdownMenu>
              <DropdownMenuTrigger className="flex items-center gap-1 text-sm font-medium text-foreground/80 hover:text-foreground transition-colors">
                Services
                <ChevronDown className="w-4 h-4" />
              </DropdownMenuTrigger>
              <DropdownMenuContent align="center" className="w-64">
                {services.map((service) => (
                  <DropdownMenuItem
                    key={service.name}
                    onClick={() => navigate(service.href)}
                    className="flex items-start gap-3 p-3 cursor-pointer"
                  >
                    <service.icon className={`w-5 h-5 mt-0.5 ${service.color}`} />
                    <div>
                      <div className="font-medium">{service.name}</div>
                      <div className="text-xs text-muted-foreground">
                        {service.description}
                      </div>
                    </div>
                  </DropdownMenuItem>
                ))}
              </DropdownMenuContent>
            </DropdownMenu>

            <Link
              to="/about"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              About
            </Link>

            <Link
              to="/contact"
              className="text-sm font-medium text-foreground/80 hover:text-foreground transition-colors"
            >
              Contact
            </Link>
          </div>

          {/* Desktop CTA */}
          <div className="hidden lg:flex items-center gap-4">
            <Button
              variant="ghost"
              size="sm"
              onClick={() => navigate("/login/admin")}
            >
              Admin
            </Button>
            <Button
              variant="contribution"
              size="sm"
              onClick={() => navigate("/login/contribution")}
            >
              Member Login
            </Button>
            <Button
              variant="travel"
              size="sm"
              onClick={() => navigate("/login/travel")}
            >
              Client Login
            </Button>
          </div>

          {/* Mobile Menu Button */}
          <button
            className="lg:hidden p-2 rounded-lg hover:bg-accent transition-colors"
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
          >
            {mobileMenuOpen ? (
              <X className="w-6 h-6" />
            ) : (
              <Menu className="w-6 h-6" />
            )}
          </button>
        </div>

        {/* Mobile Menu */}
        <AnimatePresence>
          {mobileMenuOpen && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              exit={{ opacity: 0, height: 0 }}
              className="lg:hidden border-t border-border/50"
            >
              <div className="py-4 space-y-4">
                <Link
                  to="/"
                  className="block text-sm font-medium text-foreground/80 hover:text-foreground"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  Home
                </Link>
                
                <div className="space-y-2">
                  <div className="text-xs font-semibold text-muted-foreground uppercase tracking-wider">
                    Services
                  </div>
                  {services.map((service) => (
                    <Link
                      key={service.name}
                      to={service.href}
                      className="flex items-center gap-3 p-2 rounded-lg hover:bg-accent transition-colors"
                      onClick={() => setMobileMenuOpen(false)}
                    >
                      <service.icon className={`w-5 h-5 ${service.color}`} />
                      <span className="text-sm font-medium">{service.name}</span>
                    </Link>
                  ))}
                </div>

                <div className="pt-4 space-y-2 border-t border-border/50">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => {
                      navigate("/login/admin");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Admin Login
                  </Button>
                  <Button
                    variant="contribution"
                    className="w-full"
                    onClick={() => {
                      navigate("/login/contribution");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Member Login
                  </Button>
                  <Button
                    variant="travel"
                    className="w-full"
                    onClick={() => {
                      navigate("/login/travel");
                      setMobileMenuOpen(false);
                    }}
                  >
                    Client Login
                  </Button>
                </div>
              </div>
            </motion.div>
          )}
        </AnimatePresence>
      </nav>
    </header>
  );
};

export default Header;
