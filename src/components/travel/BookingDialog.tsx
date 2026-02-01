import { useState } from "react";
import { Phone, Mail, Send, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";

const WHATSAPP_NUMBER = "447824812923";
const CONTACT_EMAIL = "musashamsy@gmail.com";

interface BookingDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  serviceName: string;
}

const BookingDialog = ({ open, onOpenChange, serviceName }: BookingDialogProps) => {
  const [showEmailForm, setShowEmailForm] = useState(false);
  const [formData, setFormData] = useState({
    name: "",
    email: "",
    phone: "",
    message: "",
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  const generateWhatsAppLink = () => {
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

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      toast.error("Please enter a valid email address");
      return;
    }

    setIsSubmitting(true);

    const subject = encodeURIComponent(`${serviceName} Booking Request from ${formData.name}`);
    const body = encodeURIComponent(
      `Service: ${serviceName}\n\nName: ${formData.name}\nEmail: ${formData.email}\nPhone: ${formData.phone || "Not provided"}\n\nMessage:\n${formData.message}`
    );

    window.location.href = `mailto:${CONTACT_EMAIL}?subject=${subject}&body=${body}`;

    toast.success("Opening your email client...");
    setIsSubmitting(false);
    setFormData({ name: "", email: "", phone: "", message: "" });
    setShowEmailForm(false);
    onOpenChange(false);
  };

  const handleClose = () => {
    setShowEmailForm(false);
    setFormData({ name: "", email: "", phone: "", message: "" });
    onOpenChange(false);
  };

  return (
    <Dialog open={open} onOpenChange={handleClose}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle className="text-center">
            {showEmailForm ? "Email Booking" : "Book Consultation"}
          </DialogTitle>
        </DialogHeader>

        {!showEmailForm ? (
          <div className="space-y-4 py-4">
            <p className="text-center text-muted-foreground text-sm mb-6">
              Choose how you'd like to book your <span className="font-semibold text-foreground">{serviceName}</span> consultation
            </p>
            
            <a
              href={generateWhatsAppLink()}
              target="_blank"
              rel="noopener noreferrer"
              className="block"
            >
              <Button 
                variant="travel" 
                className="w-full h-14 text-base"
                onClick={() => onOpenChange(false)}
              >
                <Phone className="w-5 h-5 mr-3" />
                Book via WhatsApp
              </Button>
            </a>
            
            <Button
              variant="outline"
              className="w-full h-14 text-base border-travel text-travel hover:bg-travel hover:text-white"
              onClick={() => setShowEmailForm(true)}
            >
              <Mail className="w-5 h-5 mr-3" />
              Book via Email
            </Button>
          </div>
        ) : (
          <form onSubmit={handleSubmitForm} className="space-y-4 py-4">
            <Button
              type="button"
              variant="ghost"
              size="sm"
              onClick={() => setShowEmailForm(false)}
              className="mb-2"
            >
              ← Back to options
            </Button>
            
            <p className="text-sm text-muted-foreground">
              Booking: <span className="font-semibold text-foreground">{serviceName}</span>
            </p>

            <div className="space-y-2">
              <Label htmlFor="booking-name">Name *</Label>
              <Input
                id="booking-name"
                name="name"
                placeholder="Your full name"
                value={formData.name}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-email">Email *</Label>
              <Input
                id="booking-email"
                name="email"
                type="email"
                placeholder="your@email.com"
                value={formData.email}
                onChange={handleInputChange}
                required
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-phone">Phone Number</Label>
              <Input
                id="booking-phone"
                name="phone"
                placeholder="+44 123 456 7890"
                value={formData.phone}
                onChange={handleInputChange}
              />
            </div>

            <div className="space-y-2">
              <Label htmlFor="booking-message">Message *</Label>
              <Textarea
                id="booking-message"
                name="message"
                placeholder="Tell us about your needs and preferred consultation time..."
                rows={3}
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
              {isSubmitting ? "Sending..." : "Send Booking Request"}
            </Button>
          </form>
        )}
      </DialogContent>
    </Dialog>
  );
};

export default BookingDialog;
