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
 import { Progress } from "@/components/ui/progress";
 import { Plus, Trash2, Loader2, FileCheck, Pencil } from "lucide-react";
 import { toast } from "sonner";
 
 interface ConsultationCase {
   id: string;
   user_id: string;
   title: string;
   case_type: string;
   description: string | null;
   status: string | null;
   progress: number | null;
   assigned_to: string | null;
   created_at: string;
   updated_at: string;
   profile?: {
     full_name: string | null;
     email: string | null;
   };
 }
 
 interface TravelClient {
   id: string;
   user_id: string;
   profile?: {
     full_name: string | null;
     email: string | null;
   };
 }
 
 const caseTypes = [
   "UK Student Visa",
   "US B1/B2 Visa",
   "Canada PR",
   "Schengen Visa",
   "Australia Visa",
   "Visa Refusal Review",
   "Academic Support",
   "Dissertation Review",
   "Admission Guidance",
   "Other",
 ];
 
 const statusOptions = [
   { value: "open", label: "Open", color: "bg-blue-500" },
   { value: "in_progress", label: "In Progress", color: "bg-travel" },
   { value: "documents_pending", label: "Documents Pending", color: "bg-yellow-500" },
   { value: "under_review", label: "Under Review", color: "bg-purple-500" },
   { value: "interview_scheduled", label: "Interview Scheduled", color: "bg-indigo-500" },
   { value: "approved", label: "Approved", color: "bg-green-500" },
   { value: "rejected", label: "Rejected", color: "bg-red-500" },
   { value: "closed", label: "Closed", color: "bg-gray-500" },
 ];
 
 const TravelCaseManagement = () => {
   const [cases, setCases] = useState<ConsultationCase[]>([]);
   const [clients, setClients] = useState<TravelClient[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [editingCase, setEditingCase] = useState<ConsultationCase | null>(null);
   const [formData, setFormData] = useState({
     user_id: "",
     title: "",
     case_type: "",
     description: "",
     status: "open",
     progress: 0,
     assigned_to: "",
   });
   const [submitting, setSubmitting] = useState(false);
 
   useEffect(() => {
     fetchData();
   }, []);
 
   const fetchData = async () => {
     setLoading(true);
     try {
       // Fetch cases
       const { data: casesData, error: casesError } = await supabase
         .from("consultation_cases")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (casesError) throw casesError;
 
       // Fetch profiles for cases
       const casesWithProfiles = await Promise.all(
         (casesData || []).map(async (caseItem) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name, email")
             .eq("user_id", caseItem.user_id)
             .maybeSingle();
           return { ...caseItem, profile: profile || undefined };
         })
       );
 
       setCases(casesWithProfiles);
 
       // Fetch clients
       const { data: clientsData, error: clientsError } = await supabase
         .from("travel_clients")
         .select("id, user_id");
 
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
       case_type: "",
       description: "",
       status: "open",
       progress: 0,
       assigned_to: "",
     });
     setEditingCase(null);
   };
 
   const handleSubmit = async () => {
     if (!formData.user_id || !formData.title || !formData.case_type) {
       toast.error("Please fill in all required fields");
       return;
     }
 
     setSubmitting(true);
     try {
       if (editingCase) {
         const { error } = await supabase
           .from("consultation_cases")
           .update({
             title: formData.title,
             case_type: formData.case_type,
             description: formData.description || null,
             status: formData.status,
             progress: formData.progress,
             assigned_to: formData.assigned_to || null,
           })
           .eq("id", editingCase.id);
 
         if (error) throw error;
         toast.success("Case updated successfully");
       } else {
         const { error } = await supabase
           .from("consultation_cases")
           .insert({
             user_id: formData.user_id,
             title: formData.title,
             case_type: formData.case_type,
             description: formData.description || null,
             status: formData.status,
             progress: formData.progress,
             assigned_to: formData.assigned_to || null,
           });
 
         if (error) throw error;
         toast.success("Case created successfully");
       }
 
       setDialogOpen(false);
       resetForm();
       fetchData();
     } catch (error: any) {
       toast.error("Failed to save case: " + error.message);
     } finally {
       setSubmitting(false);
     }
   };
 
   const handleEdit = (caseItem: ConsultationCase) => {
     setEditingCase(caseItem);
     setFormData({
       user_id: caseItem.user_id,
       title: caseItem.title,
       case_type: caseItem.case_type,
       description: caseItem.description || "",
       status: caseItem.status || "open",
       progress: caseItem.progress || 0,
       assigned_to: caseItem.assigned_to || "",
     });
     setDialogOpen(true);
   };
 
   const handleDelete = async (caseId: string) => {
     if (!confirm("Are you sure you want to delete this case?")) return;
 
     try {
       const { error } = await supabase
         .from("consultation_cases")
         .delete()
         .eq("id", caseId);
 
       if (error) throw error;
       toast.success("Case deleted successfully");
       fetchData();
     } catch (error: any) {
       toast.error("Failed to delete case: " + error.message);
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
           <h2 className="text-2xl font-bold">Consultation Cases</h2>
           <p className="text-muted-foreground">Track visa and travel consultation cases</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={(open) => { setDialogOpen(open); if (!open) resetForm(); }}>
           <DialogTrigger asChild>
             <Button variant="travel">
               <Plus className="w-4 h-4 mr-2" />
               New Case
             </Button>
           </DialogTrigger>
           <DialogContent className="max-w-lg">
             <DialogHeader>
               <DialogTitle>{editingCase ? "Edit Case" : "Create New Case"}</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4 max-h-[60vh] overflow-y-auto">
               <div className="space-y-2">
                 <Label>Client *</Label>
                 <Select
                   value={formData.user_id}
                   onValueChange={(value) => setFormData({ ...formData, user_id: value })}
                   disabled={!!editingCase}
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
                 <Label htmlFor="title">Case Title *</Label>
                 <Input
                   id="title"
                   value={formData.title}
                   onChange={(e) => setFormData({ ...formData, title: e.target.value })}
                   placeholder="e.g., UK Student Visa Application"
                 />
               </div>
               <div className="space-y-2">
                 <Label>Case Type *</Label>
                 <Select
                   value={formData.case_type}
                   onValueChange={(value) => setFormData({ ...formData, case_type: value })}
                 >
                   <SelectTrigger>
                     <SelectValue placeholder="Select case type" />
                   </SelectTrigger>
                   <SelectContent>
                     {caseTypes.map((type) => (
                       <SelectItem key={type} value={type}>
                         {type}
                       </SelectItem>
                     ))}
                   </SelectContent>
                 </Select>
               </div>
               <div className="space-y-2">
                 <Label htmlFor="description">Description</Label>
                 <Textarea
                   id="description"
                   value={formData.description}
                   onChange={(e) => setFormData({ ...formData, description: e.target.value })}
                   placeholder="Case details..."
                   rows={3}
                 />
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
                 <Label>Progress: {formData.progress}%</Label>
                 <Input
                   type="range"
                   min="0"
                   max="100"
                   value={formData.progress}
                   onChange={(e) => setFormData({ ...formData, progress: parseInt(e.target.value) })}
                   className="w-full"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="assigned_to">Assigned To</Label>
                 <Input
                   id="assigned_to"
                   value={formData.assigned_to}
                   onChange={(e) => setFormData({ ...formData, assigned_to: e.target.value })}
                   placeholder="Consultant name"
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
                 ) : editingCase ? (
                   "Update Case"
                 ) : (
                   "Create Case"
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
           ) : cases.length === 0 ? (
             <div className="text-center py-12">
               <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">No cases yet</p>
               <p className="text-sm text-muted-foreground">Create your first case to get started</p>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Client</TableHead>
                   <TableHead>Title</TableHead>
                   <TableHead>Type</TableHead>
                   <TableHead>Status</TableHead>
                   <TableHead>Progress</TableHead>
                   <TableHead>Updated</TableHead>
                   <TableHead className="w-[100px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {cases.map((caseItem) => (
                   <TableRow key={caseItem.id}>
                     <TableCell className="font-medium">
                       {caseItem.profile?.full_name || "Unknown"}
                     </TableCell>
                     <TableCell>{caseItem.title}</TableCell>
                     <TableCell>
                       <Badge variant="outline">{caseItem.case_type}</Badge>
                     </TableCell>
                     <TableCell>{getStatusBadge(caseItem.status)}</TableCell>
                     <TableCell>
                       <div className="flex items-center gap-2 min-w-[100px]">
                         <Progress value={caseItem.progress || 0} className="h-2" />
                         <span className="text-xs text-muted-foreground">
                           {caseItem.progress || 0}%
                         </span>
                       </div>
                     </TableCell>
                     <TableCell className="text-muted-foreground text-sm">
                       {new Date(caseItem.updated_at).toLocaleDateString()}
                     </TableCell>
                     <TableCell>
                       <div className="flex items-center gap-1">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleEdit(caseItem)}
                         >
                           <Pencil className="w-4 h-4 text-muted-foreground" />
                         </Button>
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={() => handleDelete(caseItem.id)}
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
 
 export default TravelCaseManagement;