import { useState } from "react";
import { motion } from "framer-motion";
import { Link } from "react-router-dom";
import {
  Plane,
  Calendar,
  MessageSquare,
  MapPin,
  FileCheck,
  GraduationCap,
  Users,
  Shield,
  Phone,
  Mail,
  Send,
  Star,
  CheckCircle,
  ArrowLeft,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import LiveReviews from "@/components/travel/LiveReviews";

const WHATSAPP_NUMBER = "447824812923";
const CONTACT_EMAIL = "musashamsy@gmail.com";

interface Service {
  id: string;
  icon: React.ElementType;
  title: string;
  description: string;
  features: string[];
}

const TeemahTravelsPage = () => {
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const services: Service[] = [
    {
      id: "travel-planning",
      icon: MapPin,
      title: "Travel Planning & Itinerary Creation",
      description:
        "We craft personalized travel itineraries tailored to your preferences, budget, and schedule. From destination research to day-by-day planning, we ensure your trip is seamless and memorable.",
      features: [
        "Custom itinerary design",
        "Budget optimization",
        "Local insights & hidden gems",
        "Travel timeline coordination",
      ],
    },
    {
      id: "consultation",
      icon: MessageSquare,
      title: "Personalized Travel Consultation",
      description:
        "One-on-one consultations to understand your travel goals and provide expert advice on destinations, timing, and logistics. We answer all your questions and address concerns before you travel.",
      features: [
        "Destination recommendations",
        "Travel timing advice",
        "Cultural guidance",
        "Health & safety tips",
      ],
    },
    {
      id: "booking",
      icon: Calendar,
      title: "Booking Assistance",
      description:
        "Leave the booking hassles to us. We handle flights, hotels, tours, and transportation to get you the best deals and ensure a stress-free booking experience.",
      features: [
        "Flight reservations",
        "Hotel bookings",
        "Tour packages",
        "Airport transfers",
      ],
    },
    {
      id: "visa-assistance",
      icon: FileCheck,
      title: "Visa Assistance & Documentation",
      description:
        "Navigate complex visa requirements with our expert guidance. We provide step-by-step assistance for visa applications, document preparation, and interview coaching.",
      features: [
        "Visa requirement analysis",
        "Document checklist",
        "Application review",
        "Interview preparation",
      ],
    },
    {
      id: "travel-tips",
      icon: Shield,
      title: "Travel Tips & Safety Guidelines",
      description:
        "Stay safe and informed with our comprehensive travel tips. We provide destination-specific safety guidelines, local customs, and essential travel know-how.",
      features: [
        "Safety protocols",
        "Local customs & etiquette",
        "Emergency contacts",
        "Packing guides",
      ],
    },
    {
      id: "admission-visits",
      icon: Users,
      title: "Admission & Visits Support",
      description:
        "We support international students upon arrival with orientation, accommodation assistance, and settling-in services. Make your transition smooth and stress-free.",
      features: [
        "Airport pickup coordination",
        "Accommodation assistance",
        "Orientation support",
        "Local registration help",
      ],
    },
    {
      id: "academic-support",
      icon: GraduationCap,
      title: "Academic Support Services",
      description:
        "Struggling with assignments, dissertations, or theses? Our academic experts provide tutoring, editing, and structuring support to help you excel in your studies.",
      features: [
        "Dissertation structuring",
        "Assignment reviews",
        "Thesis coaching",
        "Academic writing guidance",
      ],
    },
    {
      id: "visa-refusal",
      icon: Plane,
      title: "Visa Refusal Review",
      description:
        "Had a visa refusal? We analyze your case, identify weaknesses, and provide a strategic plan for successful reapplication. We support you until you get approved.",
      features: [
        "Refusal analysis",
        "Case assessment",
        "Reapplication strategy",
        "Ongoing support until approval",
      ],
    },
  ];

  const generateWhatsAppLink = (serviceName: string) => {
    const message = encodeURIComponent(
      `Hello, I would like to book ${serviceName} consultation with Teemah Travels.`
    );
    return `https://wa.me/${WHATSAPP_NUMBER}?text=${message}`;
  };

  const handleInputChange = (
    e: React.ChangeEvent<HTMLInputElement | HTMLTextAreaElement>
  ) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitForm = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.name.trim() || !formData.email.trim() || !formData.message.trim()) {
      toast.error("Please fill in all required fields");
      return;
    }

    // Basic email validation
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    // Create mailto link
    const subject = encodeURIComponent(`Consultation Request from ${formData.name}`);
    const body = encodeURIComponent(
      `Name: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || "Not provided"}\n\nMessage:\n${formData.message}`
    );
    
    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;
    
    toast.success("Opening your email client...");
    setIsSubmitting(false);
    setFormData({ name: "", email: "", phone: "", message: "" });
  };

  const containerVariants = {
    hidden: { opacity: 0 },
    visible: {
      opacity: 1,
      transition: { staggerChildren: 0.1 },
    },
  };

  const itemVariants = {
    hidden: { opacity: 0, y: 20 },
    visible: { opacity: 1, y: 0 },
  };

  return (
    <div className="min-h-screen bg-background">
      {/* Header */}
      <header className="fixed top-0 left-0 right-0 z-50 glass border-b border-border/50">
        <nav className="container mx-auto px-4 lg:px-8">
          <div className="flex items-center justify-between h-16 lg:h-20">
            <Link to="/" className="flex items-center gap-2">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <span className="font-heading text-xl font-bold text-foreground">
                  Teemah Travels
                </span>
                <p className="text-xs text-muted-foreground">by AMANA MARKET</p>
              </div>
            </Link>

            <div className="flex items-center gap-4">
              <Link to="/">
                <Button variant="ghost" size="sm">
                  <ArrowLeft className="w-4 h-4 mr-2" />
                  Back to Home
                </Button>
              </Link>
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="travel" size="sm">
                  <Phone className="w-4 h-4 mr-2" />
                  Contact Us
                </Button>
              </a>
            </div>
          </div>
        </nav>
      </header>

      {/* Hero Section */}
      <section className="pt-24 pb-16 relative overflow-hidden">
        <div
          className="absolute inset-0 z-0"
          style={{ background: "var(--gradient-hero)" }}
        >
          <div className="absolute top-20 left-10 w-72 h-72 bg-travel/20 rounded-full blur-3xl" />
          <div className="absolute bottom-10 right-10 w-96 h-96 bg-teal-400/10 rounded-full blur-3xl" />
        </div>

        <div className="container mx-auto px-4 lg:px-8 relative z-10">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            className="text-center max-w-4xl mx-auto"
          >
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary-foreground/10 backdrop-blur-sm border border-primary-foreground/20 mb-6">
              <Plane className="w-4 h-4 text-travel" />
              <span className="text-sm font-medium text-primary-foreground/90">
                Your Travel Dreams, Our Expertise
              </span>
            </div>

            <h1 className="font-heading text-4xl md:text-5xl lg:text-6xl font-bold text-primary-foreground mb-6">
              Welcome to{" "}
              <span className="gradient-text-travel">Teemah Travels</span>
            </h1>

            <p className="text-lg md:text-xl text-primary-foreground/70 mb-8 max-w-2xl mx-auto">
              Expert travel consultation, visa assistance, and academic support
              services. We turn your travel and educational aspirations into
              reality.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello, I would like to inquire about your services.")}`}
                target="_blank"
                rel="noopener noreferrer"
              >
                <Button variant="travel" size="xl" className="w-full sm:w-auto">
                  <Phone className="w-5 h-5 mr-2" />
                  Chat on WhatsApp
                </Button>
              </a>
              <a href="#services">
                <Button variant="hero-outline" size="xl" className="w-full sm:w-auto">
                  Explore Services
                </Button>
              </a>
            </div>
          </motion.div>
        </div>
      </section>

      {/* Services Section */}
      <section id="services" className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true }}
            className="text-center mb-16"
          >
            <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
              Our Services
            </h2>
            <p className="text-lg text-muted-foreground max-w-2xl mx-auto">
              Comprehensive travel and academic support services tailored to your needs
            </p>
          </motion.div>

          <motion.div
            variants={containerVariants}
            initial="hidden"
            whileInView="visible"
            viewport={{ once: true }}
            className="grid md:grid-cols-2 gap-6"
          >
            {services.map((service) => (
              <motion.div key={service.id} variants={itemVariants}>
                <Card className="h-full card-hover border-travel/20 hover:border-travel/40 transition-colors">
                  <CardHeader>
                    <div className="flex items-start gap-4">
                      <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center shrink-0">
                        <service.icon className="w-7 h-7 text-white" />
                      </div>
                      <div>
                        <CardTitle className="text-xl mb-2">{service.title}</CardTitle>
                        <p className="text-muted-foreground text-sm">
                          {service.description}
                        </p>
                      </div>
                    </div>
                  </CardHeader>
                  <CardContent>
                    <div className="space-y-2 mb-6">
                      {service.features.map((feature, index) => (
                        <div key={index} className="flex items-center gap-2 text-sm">
                          <CheckCircle className="w-4 h-4 text-travel shrink-0" />
                          <span>{feature}</span>
                        </div>
                      ))}
                    </div>
                    <a
                      href={generateWhatsAppLink(service.title)}
                      target="_blank"
                      rel="noopener noreferrer"
                    >
                      <Button variant="travel" className="w-full">
                        <Phone className="w-4 h-4 mr-2" />
                        Book Consultation
                      </Button>
                    </a>
                  </CardContent>
                </Card>
              </motion.div>
            ))}
          </motion.div>
        </div>
      </section>

      {/* Contact Form Section */}
      <section className="py-24 bg-muted/30">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="grid lg:grid-cols-2 gap-12 items-start">
            <motion.div
              initial={{ opacity: 0, x: -20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <h2 className="font-heading text-3xl md:text-4xl font-bold text-foreground mb-4">
                Get in Touch
              </h2>
              <p className="text-lg text-muted-foreground mb-8">
                Have questions or ready to start your journey? Fill out the form
                or reach out directly via WhatsApp.
              </p>

              <div className="space-y-6">
                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-travel-light flex items-center justify-center">
                    <Phone className="w-6 h-6 text-travel" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">WhatsApp</p>
                    <a
                      href={`https://wa.me/${WHATSAPP_NUMBER}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="font-semibold text-foreground hover:text-travel transition-colors"
                    >
                      +44 7824 812923
                    </a>
                  </div>
                </div>

                <div className="flex items-center gap-4">
                  <div className="w-12 h-12 rounded-xl bg-travel-light flex items-center justify-center">
                    <Mail className="w-6 h-6 text-travel" />
                  </div>
                  <div>
                    <p className="text-sm text-muted-foreground">Email</p>
                    <a
                      href={`mailto:${CONTACT_EMAIL}`}
                      className="font-semibold text-foreground hover:text-travel transition-colors"
                    >
                      {CONTACT_EMAIL}
                    </a>
                  </div>
                </div>
              </div>

              <div className="mt-8">
                <a
                  href={`https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent("Hello, I would like to inquire about your services.")}`}
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  <Button variant="travel" size="lg" className="w-full sm:w-auto">
                    <Phone className="w-5 h-5 mr-2" />
                    Chat on WhatsApp
                  </Button>
                </a>
              </div>
            </motion.div>

            <motion.div
              initial={{ opacity: 0, x: 20 }}
              whileInView={{ opacity: 1, x: 0 }}
              viewport={{ once: true }}
            >
              <Card>
                <CardHeader>
                  <CardTitle>Email Consultation Request</CardTitle>
                </CardHeader>
                <CardContent>
                  <form onSubmit={handleSubmitForm} className="space-y-4">
                    <div className="space-y-2">
                      <Label htmlFor="name">Name *</Label>
                      <Input
                        id="name"
                        name="name"
                        placeholder="Your full name"
                        value={formData.name}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="email">Email *</Label>
                      <Input
                        id="email"
                        name="email"
                        type="email"
                        placeholder="your@email.com"
                        value={formData.email}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="phone">Phone Number</Label>
                      <Input
                        id="phone"
                        name="phone"
                        placeholder="+44 123 456 7890"
                        value={formData.phone}
                        onChange={handleInputChange}
                      />
                    </div>

                    <div className="space-y-2">
                      <Label htmlFor="message">Message / Inquiry *</Label>
                      <Textarea
                        id="message"
                        name="message"
                        placeholder="Tell us about your travel or academic needs..."
                        rows={4}
                        value={formData.message}
                        onChange={handleInputChange}
                        required
                      />
                    </div>

                    <Button
                      type="submit"
                      variant="travel"
                      className="w-full"
                      disabled={isSubmitting}
                    >
                      <Send className="w-4 h-4 mr-2" />
                      {isSubmitting ? "Sending..." : "Send Inquiry"}
                    </Button>
                  </form>
                </CardContent>
              </Card>
            </motion.div>
          </div>
        </div>
      </section>

      {/* Live Reviews Section */}
      <section id="reviews" className="py-24 bg-background">
        <div className="container mx-auto px-4 lg:px-8">
          <LiveReviews showPublicForm />
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-sidebar text-sidebar-foreground py-12">
        <div className="container mx-auto px-4 lg:px-8">
          <div className="flex flex-col md:flex-row justify-between items-center gap-6">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-travel to-teal-400 flex items-center justify-center">
                <Plane className="w-5 h-5 text-white" />
              </div>
              <div>
                <h3 className="font-semibold">Teemah Travels</h3>
                <p className="text-sm text-sidebar-foreground/60">by AMANA MARKET</p>
              </div>
            </div>

            <div className="flex items-center gap-6 text-sm">
              <a
                href={`https://wa.me/${WHATSAPP_NUMBER}`}
                target="_blank"
                rel="noopener noreferrer"
                className="flex items-center gap-2 hover:text-travel transition-colors"
              >
                <Phone className="w-4 h-4" />
                +44 7824 812923
              </a>
              <a
                href={`mailto:${CONTACT_EMAIL}`}
                className="flex items-center gap-2 hover:text-travel transition-colors"
              >
                <Mail className="w-4 h-4" />
                {CONTACT_EMAIL}
              </a>
            </div>

            <Link to="/">
              <Button variant="ghost" size="sm">
                Back to AMANA MARKET
              </Button>
            </Link>
          </div>

          <div className="mt-8 pt-8 border-t border-sidebar-border text-center text-sm text-sidebar-foreground/60">
            <p>© {new Date().getFullYear()} AMANA MARKET. All rights reserved.</p>
          </div>
        </div>
      </footer>
    </div>
  );
};

export default TeemahTravelsPage;
