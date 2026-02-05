 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import { Textarea } from "@/components/ui/textarea";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import {
   Select,
   SelectContent,
   SelectItem,
   SelectTrigger,
   SelectValue,
 } from "@/components/ui/select";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Plus, Trash2, Loader2, Calendar, Pencil } from "lucide-react";
 import { toast } from "sonner";
 import { format } from "date-fns";
 
 interface Consultation {
   id: string;
   user_id: string;
   case_id: string | null;
   title: string;
   scheduled_date: string;
   duration_minutes: number | null;
   consultation_type: string | null;
   status: string | null;
   notes: string | null;
   created_at: string;
   profile?: {
     full_name: string | null;
     email: string | null;
   };
 }
 
 interface TravelClient {
   user_id: string;
   profile?: {
     full_name: string | null;
     email: string | null;
   };
 }
 
 const consultationTypes = [
   "Visa Strategy",
   "Document Review",
   "Academic Guidance",
   "Refusal Analysis",
   "Admission Counseling",
   "General Consultation",
 ];
 
 const statusOptions = [
   { value: "scheduled", label: "Scheduled", color: "bg-blue-500" },
   { value: "in_progress", label: "In Progress", color: "bg-travel" },
   { value: "completed", label: "Completed", color: "bg-green-500" },
   { value: "cancelled", label: "Cancelled", color: "bg-red-500" },
   { value: "rescheduled", label: "Rescheduled", color: "bg-yellow-500" },
 ];
 
 const TravelConsultationManagement = () => {
   const [consultations, setConsultations] = useState<Consultation[]>([]);
   const [clients, setClients] = useState<TravelClient[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingConsultation, setEditingConsultation] = useState<Consultation | null>(null);
   const [formData, setFormData] = useState({
     user_id: "",
     title: "",
     scheduled_date: "",
     scheduled_time: "",
     duration_minutes: 60,
     consultation_type: "",
     status: "scheduled",
     notes: "",
   });
   const [submitting, setSubmitting] = useState(false);
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     setLoading(true);
     try {
       // Fetch consultations
       const { data: consultationsData, error: consultationsError } = await supabase
         .from("consultations")
         .select("*")
         .order("scheduled_date", { ascending: true });
 
       if (consultationsError) throw consultationsError;
 
       // Fetch profiles for consultations
       const consultationsWithProfiles = await Promise.all(
         (consultationsData || []).map(async (consultation) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name, email")
             .eq("user_id", consultation.user_id)
             .maybeSingle();
           return { ...consultation, profile: profile || undefined };
         })
       );
 
       setConsultations(consultationsWithProfiles);
 
       // Fetch clients
       const { data: clientsData, error: clientsError } = await supabase
         .from("travel_clients")
         .select("user_id");
 
       if (clientsError) throw clientsError;
 
       const clientsWithProfiles = await Promise.all(
         (clientsData || []).map(async (client) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name, email")
             .eq("user_id", client.user_id)
             .maybeSingle();
           return { ...client, profile: profile || undefined };
         })
       );
 
       setClients(clientsWithProfiles);
     } catch (error: any) {
       toast.error("Failed to fetch data: " + error.message);
     } finally {
       setLoading(false);
     }
   };
 
   const resetForm = () => {
     setFormData({
       user_id: "",
       title: "",
       scheduled_date: "",
       scheduled_time: "",
       duration_minutes: 60,
       consultation_type: "",
       status: "scheduled",
       notes: "",
     });
     setEditingConsultation(null);
   };
 
   const handleSubmit = async () => {
     if (!formData.user_id || !formData.title || !formData.scheduled_date || !formData.scheduled_time) {
       toast.error("Please fill in all required fields");
       return;
     }
 
     const scheduledDateTime = new Date(`${formData.scheduled_date}T${formData.scheduled_time}`);
 
     setSubmitting(true);
     try {
       if (editingConsultation) {
         const { error } = await supabase
           .from("consultations")
           .update({
             title: formData.title,
             scheduled_date: scheduledDateTime.toISOString(),
             duration_minutes: formData.duration_minutes,
             consultation_type: formData.consultation_type || null,
             status: formData.status,
             notes: formData.notes || null,
           })
           .eq("id", editingConsultation.id);
 
         if (error) throw error;
         toast.success("Consultation updated successfully");
       } else {
         const { error } = await supabase
           .from("consultations")
           .insert({
             user_id: formData.user_id,
             title: formData.title,
             scheduled_date: scheduledDateTime.toISOString(),
             duration_minutes: formData.duration_minutes,
             consultation_type: formData.consultation_type || null,
             status: formData.status,
             notes: formData.notes || null,
           });
 
         if (error) throw error;
         toast.success("Consultation scheduled successfully");
       }
 
       setDialogOpen(false);
       resetForm();
       fetchData();
     } catch (error: any) {
       toast.error("Failed to save consultation: " + error.message);
     } finally {
       setSubmitting(false);
     }
   };
 
   const handleEdit = (consultation: Consultation) => {
     setEditingConsultation(consultation);
     const scheduledDate = new Date(consultation.scheduled_date);
     setFormData({
       user_id: consultation.user_id,
       title: consultation.title,
       scheduled_date: format(scheduledDate, "yyyy-MM-dd"),
       scheduled_time: format(scheduledDate, "HH:mm"),
       duration_minutes: consultation.duration_minutes || 60,
       consultation_type: consultation.consultation_type || "",
       status: consultation.status || "scheduled",
       notes: consultation.notes || "",
     });
     setDialogOpen(true);
   };
 
   const handleDelete = async (consultationId: string) => {
     if (!confirm("Are you sure you want to delete this consultation?")) return;
 
     try {
       const { error } = await supabase
         .from("consultations")
         .delete()
         .eq("id", consultationId);
 
       if (error) throw error;
       toast.success("Consultation deleted successfully");
       fetchData();
     } catch (error: any) {
       toast.error("Failed to delete consultation: " + error.message);
     }
   };
 
   const getStatusBadge = (status: string | null) => {
     const statusOption = statusOptions.find((s) => s.value === status);
     return (
       <Badge
         variant="secondary"
         className={`${statusOption?.color || "bg-gray-500"} text-white`}
       >
         {statusOption?.label || status || "Unknown"}
       </Badge>
     );
   };
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-2xl font-bold">Consultations</h2>
           <p className="text-muted-foreground">Manage consultation appointments</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
           <DialogTrigger asChild>
             <Button variant="travel">
               <Plus className="w-4 h-4 mr-2" />
               Schedule Consultation
             </Button>
           </DialogTrigger>
           <DialogContent className="max-w-lg">
             <DialogHeader>
               <DialogTitle>{editingConsultation ? "Edit Consultation" : "Schedule Consultation"}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
               <div className="space-y-2">
                 <Label>Client *</Label>
                 <Select
                   value={formData.user_id}
                   onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                   disabled={!!editingConsultation}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select a client" />
                   </SelectTrigger>
                   <SelectContent>
                     {clients.map((client) => (
                       <SelectItem key={client.user_id} value={client.user_id}>
                         {client.profile?.full_name || client.profile?.email || "Unknown"}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="title">Title *</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="e.g., Visa Strategy Session"
                 />
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label htmlFor="date">Date *</Label>
                   <Input
                     id="date"
                     type="date"
                     value={formData.scheduled_date}
                     onChange={(e) => setFormData({ ...formData, scheduled_date: e.target.value })}
                   />
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="time">Time *</Label>
                   <Input
                     id="time"
                     type="time"
                     value={formData.scheduled_time}
                     onChange={(e) => setFormData({ ...formData, scheduled_time: e.target.value })}
                   />
                 </div>
               </div>
               <div className="grid grid-cols-2 gap-4">
                 <div className="space-y-2">
                   <Label>Type</Label>
                   <Select
                     value={formData.consultation_type}
                     onValueChange={(value) => setFormData({ ...formData, consultation_type: value })}
                   >
                     <SelectTrigger>
                       <SelectValue placeholder="Select type" />
                     </SelectTrigger>
                     <SelectContent>
                       {consultationTypes.map((type) => (
                         <SelectItem key={type} value={type}>
                           {type}
                         </SelectItem>
                       ))}
                     </SelectContent>
                   </Select>
                 </div>
                 <div className="space-y-2">
                   <Label htmlFor="duration">Duration (mins)</Label>
                   <Input
                     id="duration"
                     type="number"
                     min={15}
                     step={15}
                     value={formData.duration_minutes}
                     onChange={(e) => setFormData({ ...formData, duration_minutes: parseInt(e.target.value) })}
                   />
                 </div>
               </div>
               <div className="space-y-2">
                 <Label>Status</Label>
                 <Select
                   value={formData.status}
                   onValueChange={(value) => setFormData({ ...formData, status: value })}
                 >
                   <SelectTrigger>
                     <SelectValue />
                   </SelectTrigger>
                   <SelectContent>
                     {statusOptions.map((status) => (
                       <SelectItem key={status.value} value={status.value}>
                         {status.label}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="notes">Notes</Label>
                 <Textarea
                   id="notes"
                   value={formData.notes}
                   onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                   placeholder="Additional notes..."
                   rows={3}
                 />
               </div>
               <Button
                 variant="travel"
                 className="w-full"
                 onClick={handleSubmit}
                 disabled={submitting}
               >
                 {submitting ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Saving...
                   </>
                 ) : editingConsultation ? (
                   "Update Consultation"
                 ) : (
                   "Schedule Consultation"
                 )}
               </Button>
             </div>
           </DialogContent>
         </Dialog>
       </div>
 
       <Card>
         <CardContent className="p-0">
           {loading ? (
             <div className="flex items-center justify-center py-12">
               <Loader2 className="w-8 h-8 animate-spin text-travel" />
             </div>
           ) : consultations.length === 0 ? (
             <div className="text-center py-12">
               <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">No consultations scheduled</p>
               <p className="text-sm text-muted-foreground">Schedule your first consultation to get started</p>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Client</TableHead>
                   <TableHead>Title</TableHead>
                   <TableHead>Date & Time</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Duration</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead className="w-[100px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {consultations.map((consultation) => (
                   <TableRow key={consultation.id}>
                     <TableCell className="font-medium">
                       {consultation.profile?.full_name || "Unknown"}
                     </TableCell>
                     <TableCell>{consultation.title}</TableCell>
                     <TableCell>
                       <div>
                         <p className="font-medium">
                           {format(new Date(consultation.scheduled_date), "MMM d, yyyy")}
                         </p>
                         <p className="text-sm text-muted-foreground">
                           {format(new Date(consultation.scheduled_date), "h:mm a")}
                         </p>
                       </div>
                     </TableCell>
                     <TableCell>
                       <Badge variant="outline">{consultation.consultation_type || "-"}</Badge>
                     </TableCell>
                     <TableCell>{consultation.duration_minutes || 60} mins</TableCell>
                     <TableCell>{getStatusBadge(consultation.status)}</TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleEdit(consultation)}
                         >
                           <Pencil className="w-4 h-4 text-muted-foreground" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleDelete(consultation.id)}
                         >
                           <Trash2 className="w-4 h-4 text-destructive" />
                         </Button>
                       </div>
                     </TableCell>
                   </TableRow>
                 ))}
               </TableBody>
             </Table>
           )}
         </CardContent>
       </Card>
     </div>
   );
 };
 
 export default TravelConsultationManagement;