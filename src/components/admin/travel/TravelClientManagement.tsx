 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Button } from "@/components/ui/button";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Input } from "@/components/ui/input";
 import { Label } from "@/components/ui/label";
 import {
   Dialog,
   DialogContent,
   DialogHeader,
   DialogTitle,
   DialogTrigger,
 } from "@/components/ui/dialog";
 import {
   Table,
   TableBody,
   TableCell,
   TableHead,
   TableHeader,
   TableRow,
 } from "@/components/ui/table";
 import { Badge } from "@/components/ui/badge";
 import { Plus, Trash2, Loader2, UserPlus } from "lucide-react";
 import { toast } from "sonner";
 
 interface TravelClient {
   id: string;
   user_id: string;
   service_type: string[] | null;
   created_at: string;
   profile?: {
     full_name: string | null;
     email: string | null;
     phone: string | null;
   };
 }
 
 const TravelClientManagement = () => {
   const [clients, setClients] = useState<TravelClient[]>([]);
   const [loading, setLoading] = useState(true);
   const [dialogOpen, setDialogOpen] = useState(false);
   const [formData, setFormData] = useState({
     full_name: "",
     email: "",
     phone: "",
     password: "",
   });
   const [submitting, setSubmitting] = useState(false);
 
   useEffect(() => {
     fetchClients();
   }, []);
 
   const fetchClients = async () => {
     setLoading(true);
     try {
       const { data: clientsData, error: clientsError } = await supabase
         .from("travel_clients")
         .select("*")
         .order("created_at", { ascending: false });
 
       if (clientsError) throw clientsError;
 
       // Fetch profiles for each client
       const clientsWithProfiles = await Promise.all(
         (clientsData || []).map(async (client) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name, email, phone")
             .eq("user_id", client.user_id)
             .maybeSingle();
           return { ...client, profile: profile || undefined };
         })
       );
 
       setClients(clientsWithProfiles);
     } catch (error: any) {
       toast.error("Failed to fetch clients: " + error.message);
     } finally {
       setLoading(false);
     }
   };
 
   const handleAddClient = async () => {
     if (!formData.full_name || !formData.email || !formData.password) {
       toast.error("Please fill in all required fields");
       return;
     }
 
     setSubmitting(true);
     try {
       // Create user via edge function or use supabase auth
       const { data: authData, error: authError } = await supabase.auth.signUp({
         email: formData.email,
         password: formData.password,
         options: {
           data: {
             full_name: formData.full_name,
             role: "travel_client",
           },
         },
       });
 
       if (authError) throw authError;
 
       if (authData.user) {
         // Update profile with phone
         if (formData.phone) {
           await supabase
             .from("profiles")
             .update({ phone: formData.phone })
             .eq("user_id", authData.user.id);
         }
       }
 
       toast.success("Client added successfully! They will receive an email to verify their account.");
       setDialogOpen(false);
       setFormData({ full_name: "", email: "", phone: "", password: "" });
       fetchClients();
     } catch (error: any) {
       toast.error("Failed to add client: " + error.message);
     } finally {
       setSubmitting(false);
     }
   };
 
   const handleDeleteClient = async (clientId: string, userId: string) => {
     if (!confirm("Are you sure you want to remove this client?")) return;
 
     try {
       const { error } = await supabase
         .from("travel_clients")
         .delete()
         .eq("id", clientId);
 
       if (error) throw error;
 
       toast.success("Client removed successfully");
       fetchClients();
     } catch (error: any) {
       toast.error("Failed to remove client: " + error.message);
     }
   };
 
   return (
     <div className="space-y-6">
       <div className="flex items-center justify-between">
         <div>
           <h2 className="text-2xl font-bold">Travel Clients</h2>
           <p className="text-muted-foreground">Manage your travel consultation clients</p>
         </div>
         <Dialog open={dialogOpen} onOpenChange={setDialogOpen}>
           <DialogTrigger asChild>
             <Button variant="travel">
               <UserPlus className="w-4 h-4 mr-2" />
               Add Client
             </Button>
           </DialogTrigger>
           <DialogContent>
             <DialogHeader>
               <DialogTitle>Add New Travel Client</DialogTitle>
             </DialogHeader>
             <div className="space-y-4 py-4">
               <div className="space-y-2">
                 <Label htmlFor="full_name">Full Name *</Label>
                 <Input
                   id="full_name"
                   value={formData.full_name}
                   onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
                   placeholder="Enter client's full name"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="email">Email *</Label>
                 <Input
                   id="email"
                   type="email"
                   value={formData.email}
                   onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                   placeholder="client@example.com"
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="phone">Phone Number</Label>
                 <Input
                   id="phone"
                   value={formData.phone}
                   onChange={(e) => setFormData({ ...formData, phone: e.target.value })}
                   placeholder="+234..."
                 />
               </div>
               <div className="space-y-2">
                 <Label htmlFor="password">Temporary Password *</Label>
                 <Input
                   id="password"
                   type="password"
                   value={formData.password}
                   onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                   placeholder="Set a temporary password"
                 />
               </div>
               <Button
                 variant="travel"
                 className="w-full"
                 onClick={handleAddClient}
                 disabled={submitting}
               >
                 {submitting ? (
                   <>
                     <Loader2 className="w-4 h-4 mr-2 animate-spin" />
                     Adding...
                   </>
                 ) : (
                   "Add Client"
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
           ) : clients.length === 0 ? (
             <div className="text-center py-12">
               <UserPlus className="w-12 h-12 text-muted-foreground mx-auto mb-4" />
               <p className="text-muted-foreground">No clients yet</p>
               <p className="text-sm text-muted-foreground">Add your first travel client to get started</p>
             </div>
           ) : (
             <Table>
               <TableHeader>
                 <TableRow>
                   <TableHead>Name</TableHead>
                   <TableHead>Email</TableHead>
                   <TableHead>Phone</TableHead>
                   <TableHead>Services</TableHead>
                   <TableHead>Joined</TableHead>
                   <TableHead className="w-[100px]">Actions</TableHead>
                 </TableRow>
               </TableHeader>
               <TableBody>
                 {clients.map((client) => (
                   <TableRow key={client.id}>
                     <TableCell className="font-medium">
                       {client.profile?.full_name || "N/A"}
                     </TableCell>
                     <TableCell>{client.profile?.email || "N/A"}</TableCell>
                     <TableCell>{client.profile?.phone || "-"}</TableCell>
                     <TableCell>
                       <div className="flex flex-wrap gap-1">
                         {client.service_type?.map((service) => (
                           <Badge key={service} variant="secondary" className="text-xs">
                             {service.replace(/_/g, " ")}
                           </Badge>
                         )) || <span className="text-muted-foreground">-</span>}
                       </div>
                     </TableCell>
                     <TableCell>
                       {new Date(client.created_at).toLocaleDateString()}
                     </TableCell>
                     <TableCell>
                       <Button
                         variant="ghost"
                         size="icon"
                         onClick={() => handleDeleteClient(client.id, client.user_id)}
                       >
                         <Trash2 className="w-4 h-4 text-destructive" />
                       </Button>
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
 
 export default TravelClientManagement;