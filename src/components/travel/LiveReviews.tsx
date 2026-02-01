import { useState, useEffect } from "react";
import { motion } from "framer-motion";
import { Star, MessageSquare, User, ThumbsUp, Send, Filter } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Textarea } from "@/components/ui/textarea";
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
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Badge } from "@/components/ui/badge";
import { supabase } from "@/integrations/supabase/client";
import { toast } from "sonner";

interface Review {
  id: string;
  user_id: string;
  rating: number;
  title: string | null;
  review_text: string;
  service_type: string | null;
  is_approved: boolean;
  created_at: string;
  user_name?: string;
}

interface LiveReviewsProps {
  showPublicForm?: boolean;
}

const LiveReviews = ({ showPublicForm = false }: LiveReviewsProps) => {
  const [reviews, setReviews] = useState<Review[]>([]);
  const [loading, setLoading] = useState(true);
  const [isWriteDialogOpen, setIsWriteDialogOpen] = useState(false);
  const [filterService, setFilterService] = useState<string>("all");
  const [newReview, setNewReview] = useState({
    title: "",
    review_text: "",
    rating: 5,
    service_type: "visa_consultation",
    name: "",
  });
  const [user, setUser] = useState<any>(null);

  const serviceTypes = [
    { value: "visa_consultation", label: "Visa Consultation" },
    { value: "visa_refusal_review", label: "Visa Refusal Review" },
    { value: "academic_guidance", label: "Academic Guidance" },
    { value: "travel_planning", label: "Travel Planning" },
    { value: "booking_assistance", label: "Booking Assistance" },
    { value: "admission_support", label: "Admission & Visits" },
  ];

  useEffect(() => {
    fetchReviews();
    checkAuth();
  }, [filterService]);

  const checkAuth = async () => {
    const { data: { session } } = await supabase.auth.getSession();
    setUser(session?.user || null);
  };

  const fetchReviews = async () => {
    setLoading(true);
    try {
      let query = supabase
        .from("reviews")
        .select("*")
        .order("created_at", { ascending: false });

      if (filterService !== "all") {
        query = query.eq("service_type", filterService);
      }

      const { data, error } = await query;
      if (error) throw error;
      setReviews(data || []);
    } catch (error: any) {
      console.error("Error fetching reviews:", error);
      toast.error("Failed to load reviews");
    } finally {
      setLoading(false);
    }
  };

  const handleSubmitReview = async () => {
    // For public form, don't require login
    if (!showPublicForm && !user) {
      toast.error("Please log in to submit a review");
      return;
    }

    if (!newReview.review_text.trim()) {
      toast.error("Please write your review");
      return;
    }

    try {
      // For public submissions, user_id can be null
      const reviewData: any = {
        title: newReview.title || (newReview.name ? `Review by ${newReview.name}` : null),
        review_text: newReview.review_text,
        rating: newReview.rating,
        service_type: newReview.service_type,
        is_approved: true, // Auto-approved - no admin approval needed
      };
      
      // Only add user_id if user is logged in
      if (user?.id) {
        reviewData.user_id = user.id;
      }
      
      const { error } = await supabase.from("reviews").insert(reviewData);

      if (error) throw error;

      toast.success("Review submitted successfully! Thank you for your feedback.");
      setIsWriteDialogOpen(false);
      setNewReview({
        title: "",
        review_text: "",
        rating: 5,
        service_type: "visa_consultation",
        name: "",
      });
      
      // Refresh reviews
      fetchReviews();
    } catch (error: any) {
      console.error("Error submitting review:", error);
      toast.error(error.message || "Failed to submit review");
    }
  };

  const renderStars = (rating: number, interactive = false, onChange?: (rating: number) => void) => {
    return (
      <div className="flex gap-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <button
            key={star}
            type="button"
            disabled={!interactive}
            onClick={() => onChange?.(star)}
            className={`${interactive ? "cursor-pointer hover:scale-110 transition-transform" : ""}`}
          >
            <Star
              className={`w-5 h-5 ${
                star <= rating
                  ? "fill-warning text-warning"
                  : "text-muted-foreground"
              }`}
            />
          </button>
        ))}
      </div>
    );
  };

  const getServiceLabel = (type: string | null) => {
    return serviceTypes.find(s => s.value === type)?.label || type || "General";
  };

  const formatDate = (dateString: string) => {
    return new Date(dateString).toLocaleDateString("en-US", {
      month: "short",
      day: "numeric",
      year: "numeric",
    });
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4">
        <div>
          <h2 className="font-heading text-xl font-bold text-foreground flex items-center gap-2">
            <MessageSquare className="w-6 h-6 text-travel" />
            Client Reviews
          </h2>
          <p className="text-sm text-muted-foreground">
            See what our clients say about our services
          </p>
        </div>
        <div className="flex items-center gap-3">
          <Select value={filterService} onValueChange={setFilterService}>
            <SelectTrigger className="w-48">
              <Filter className="w-4 h-4 mr-2" />
              <SelectValue placeholder="Filter by service" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Services</SelectItem>
              {serviceTypes.map((type) => (
                <SelectItem key={type.value} value={type.value}>
                  {type.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
          
          <Dialog open={isWriteDialogOpen} onOpenChange={setIsWriteDialogOpen}>
            <DialogTrigger asChild>
              <Button variant="travel">
                <Send className="w-4 h-4 mr-2" />
                Write Review
              </Button>
            </DialogTrigger>
            <DialogContent className="sm:max-w-lg">
              <DialogHeader>
                <DialogTitle>Share Your Experience</DialogTitle>
              </DialogHeader>
              <div className="space-y-4 py-4">
                <div className="space-y-2">
                  <Label>Service Type</Label>
                  <Select
                    value={newReview.service_type}
                    onValueChange={(v) => setNewReview({ ...newReview, service_type: v })}
                  >
                    <SelectTrigger>
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {serviceTypes.map((type) => (
                        <SelectItem key={type.value} value={type.value}>
                          {type.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>

                <div className="space-y-2">
                  <Label>Your Rating</Label>
                  <div className="flex items-center gap-2">
                    {renderStars(newReview.rating, true, (rating) => 
                      setNewReview({ ...newReview, rating })
                    )}
                    <span className="text-sm text-muted-foreground ml-2">
                      {newReview.rating}/5
                    </span>
                  </div>
                </div>

                <div className="space-y-2">
                  <Label>Review Title (Optional)</Label>
                  <Input
                    placeholder="Summarize your experience"
                    value={newReview.title}
                    onChange={(e) => setNewReview({ ...newReview, title: e.target.value })}
                  />
                </div>

                <div className="space-y-2">
                  <Label>Your Review</Label>
                  <Textarea
                    placeholder="Tell us about your experience with our services..."
                    rows={4}
                    value={newReview.review_text}
                    onChange={(e) => setNewReview({ ...newReview, review_text: e.target.value })}
                  />
                </div>

                <Button variant="travel" className="w-full" onClick={handleSubmitReview}>
                  Submit Review
                </Button>
                <p className="text-xs text-muted-foreground text-center">
                  Your review will be published immediately
                </p>
              </div>
            </DialogContent>
          </Dialog>
        </div>
      </div>

      {/* Reviews Grid */}
      {loading ? (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {[1, 2, 3].map((i) => (
            <Card key={i} className="animate-pulse">
              <CardContent className="p-6">
                <div className="h-4 bg-muted rounded w-3/4 mb-4" />
                <div className="h-20 bg-muted rounded mb-4" />
                <div className="h-4 bg-muted rounded w-1/2" />
              </CardContent>
            </Card>
          ))}
        </div>
      ) : reviews.length === 0 ? (
        <Card>
          <CardContent className="py-16 text-center">
            <MessageSquare className="w-16 h-16 mx-auto text-muted-foreground mb-4" />
            <h3 className="font-semibold text-lg mb-2">No Reviews Yet</h3>
            <p className="text-muted-foreground mb-4">
              Be the first to share your experience with our services!
            </p>
            <Button variant="travel" onClick={() => setIsWriteDialogOpen(true)}>
              Write the First Review
            </Button>
          </CardContent>
        </Card>
      ) : (
        <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {reviews.map((review, index) => (
            <motion.div
              key={review.id}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.05 }}
            >
              <Card className="h-full card-hover">
                <CardContent className="p-6">
                  <div className="flex items-start justify-between mb-3">
                    <div className="flex items-center gap-3">
                      <div className="w-10 h-10 rounded-full bg-travel-light flex items-center justify-center">
                        <User className="w-5 h-5 text-travel" />
                      </div>
                      <div>
                        <p className="font-medium text-sm">Client</p>
                        <p className="text-xs text-muted-foreground">
                          {formatDate(review.created_at)}
                        </p>
                      </div>
                    </div>
                    {renderStars(review.rating)}
                  </div>

                  <Badge variant="secondary" className="mb-3 bg-travel-light text-travel border-0">
                    {getServiceLabel(review.service_type)}
                  </Badge>

                  {review.title && (
                    <h4 className="font-semibold mb-2">{review.title}</h4>
                  )}

                  <p className="text-sm text-muted-foreground line-clamp-4">
                    {review.review_text}
                  </p>

                  <div className="flex items-center gap-2 mt-4 pt-4 border-t border-border">
                    <Button variant="ghost" size="sm" className="text-xs">
                      <ThumbsUp className="w-3 h-3 mr-1" />
                      Helpful
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </motion.div>
          ))}
        </div>
      )}

      {/* Stats Summary */}
      {reviews.length > 0 && (
        <Card className="bg-gradient-to-r from-travel/10 to-travel/5 border-travel/20">
          <CardContent className="p-6">
            <div className="flex flex-wrap items-center justify-between gap-6">
              <div className="flex items-center gap-4">
                <div className="w-14 h-14 rounded-xl bg-travel flex items-center justify-center">
                  <Star className="w-7 h-7 text-white fill-white" />
                </div>
                <div>
                  <p className="text-2xl font-bold">
                    {(reviews.reduce((acc, r) => acc + r.rating, 0) / reviews.length).toFixed(1)}
                  </p>
                  <p className="text-sm text-muted-foreground">Average Rating</p>
                </div>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">{reviews.length}</p>
                <p className="text-sm text-muted-foreground">Total Reviews</p>
              </div>
              <div className="text-center">
                <p className="text-2xl font-bold">
                  {reviews.filter(r => r.rating >= 4).length}
                </p>
                <p className="text-sm text-muted-foreground">Happy Clients</p>
              </div>
            </div>
          </CardContent>
        </Card>
      )}
    </div>
  );
};

export default LiveReviews;
