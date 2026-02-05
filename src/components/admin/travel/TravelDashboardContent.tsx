 import { useState, useEffect } from "react";
 import { supabase } from "@/integrations/supabase/client";
 import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
 import { Badge } from "@/components/ui/badge";
 import { Progress } from "@/components/ui/progress";
 import { Loader2, Users, FileCheck, Calendar, TrendingUp } from "lucide-react";
 import { format, isToday } from "date-fns";
 
 interface DashboardStats {
   activeClients: number;
   openCases: number;
   todayConsultations: number;
   approvalRate: number;
 }
 
 interface CaseItem {
   id: string;
   title: string;
   case_type: string;
   progress: number | null;
   status: string | null;
   profile?: { full_name: string | null };
 }
 
 interface ConsultationItem {
   id: string;
   title: string;
   scheduled_date: string;
   consultation_type: string | null;
   status: string | null;
   profile?: { full_name: string | null };
 }
 
 const TravelDashboardContent = () => {
   const [stats, setStats] = useState<DashboardStats>({
     activeClients: 0,
     openCases: 0,
     todayConsultations: 0,
     approvalRate: 0,
   });
   const [recentCases, setRecentCases] = useState<CaseItem[]>([]);
   const [todayConsultations, setTodayConsultations] = useState<ConsultationItem[]>([]);
   const [loading, setLoading] = useState(true);
 
   useEffect(() => {
     fetchDashboardData();
   }, []);
 
   const fetchDashboardData = async () => {
     setLoading(true);
     try {
       // Fetch clients count
       const { count: clientsCount } = await supabase
         .from("travel_clients")
         .select("*", { count: "exact", head: true });
 
       // Fetch open cases count
       const { count: openCasesCount } = await supabase
         .from("consultation_cases")
         .select("*", { count: "exact", head: true })
         .not("status", "in", '("closed","approved","rejected")');
 
       // Fetch today's consultations
       const today = new Date();
       const startOfDay = new Date(today.setHours(0, 0, 0, 0)).toISOString();
       const endOfDay = new Date(today.setHours(23, 59, 59, 999)).toISOString();
 
       const { data: consultationsData, count: consultationsCount } = await supabase
         .from("consultations")
         .select("*", { count: "exact" })
         .gte("scheduled_date", startOfDay)
         .lte("scheduled_date", endOfDay);
 
       // Fetch approval rate
       const { count: totalCases } = await supabase
         .from("consultation_cases")
         .select("*", { count: "exact", head: true });
 
       const { count: approvedCases } = await supabase
         .from("consultation_cases")
         .select("*", { count: "exact", head: true })
         .eq("status", "approved");
 
       const approvalRate = totalCases && totalCases > 0 
         ? Math.round((approvedCases || 0) / totalCases * 100) 
         : 0;
 
       setStats({
         activeClients: clientsCount || 0,
         openCases: openCasesCount || 0,
         todayConsultations: consultationsCount || 0,
         approvalRate,
       });
 
       // Fetch recent cases with profiles
       const { data: casesData } = await supabase
         .from("consultation_cases")
         .select("id, title, case_type, progress, status, user_id")
         .not("status", "in", '("closed")')
         .order("updated_at", { ascending: false })
         .limit(4);
 
       const casesWithProfiles = await Promise.all(
         (casesData || []).map(async (caseItem) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name")
             .eq("user_id", caseItem.user_id)
             .maybeSingle();
           return { ...caseItem, profile: profile || undefined };
         })
       );
       setRecentCases(casesWithProfiles);
 
       // Fetch today's consultations with profiles
       const consultationsWithProfiles = await Promise.all(
         (consultationsData || []).map(async (consultation) => {
           const { data: profile } = await supabase
             .from("profiles")
             .select("full_name")
             .eq("user_id", consultation.user_id)
             .maybeSingle();
           return { ...consultation, profile: profile || undefined };
         })
       );
       setTodayConsultations(consultationsWithProfiles);
 
     } catch (error: any) {
       console.error("Failed to fetch dashboard data:", error);
     } finally {
       setLoading(false);
     }
   };
 
   const getStatusLabel = (status: string | null) => {
     const statusMap: Record<string, string> = {
       open: "Open",
       in_progress: "In Progress",
       documents_pending: "Documents Pending",
       under_review: "Under Review",
       interview_scheduled: "Interview Scheduled",
       approved: "Approved",
       rejected: "Rejected",
       closed: "Closed",
       scheduled: "Scheduled",
       completed: "Completed",
       cancelled: "Cancelled",
     };
     return statusMap[status || ""] || status || "Unknown";
   };
 
   const getStatusColor = (status: string | null) => {
     const colorMap: Record<string, string> = {
       completed: "text-green-500",
       in_progress: "text-travel",
       scheduled: "text-blue-500",
       cancelled: "text-red-500",
     };
     return colorMap[status || ""] || "text-muted-foreground";
   };
 
   if (loading) {
     return (
       <div className="flex items-center justify-center py-20">
         <Loader2 className="w-8 h-8 animate-spin text-travel" />
       </div>
     );
   }
 
   const statsDisplay = [
     { title: "Active Clients", value: stats.activeClients.toString(), icon: Users, change: "", positive: true },
     { title: "Open Cases", value: stats.openCases.toString(), icon: FileCheck, change: "", positive: true },
     { title: "Consultations Today", value: stats.todayConsultations.toString(), icon: Calendar, change: "", positive: true },
     { title: "Visa Approvals", value: `${stats.approvalRate}%`, icon: TrendingUp, change: "", positive: true },
   ];
 
   return (
     <div className="space-y-6">
       {/* Stats Grid */}
       <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
         {statsDisplay.map((stat, index) => (
           <Card key={index} className="card-hover">
             <CardContent className="p-6">
               <div className="flex items-center justify-between mb-4">
                 <div className="w-12 h-12 rounded-xl bg-travel-light flex items-center justify-center">
                   <stat.icon className="w-6 h-6 text-travel" />
                 </div>
               </div>
               <p className="text-sm text-muted-foreground mb-1">{stat.title}</p>
               <p className="text-2xl font-bold text-foreground">{stat.value}</p>
             </CardContent>
           </Card>
         ))}
       </div>
 
       {/* Active Cases & Today's Consultations */}
       <div className="grid lg:grid-cols-2 gap-6">
         {/* Active Visa Cases */}
         <Card>
           <CardHeader>
             <CardTitle>Active Visa Cases</CardTitle>
           </CardHeader>
           <CardContent>
             {recentCases.length === 0 ? (
               <div className="text-center py-8">
                 <FileCheck className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                 <p className="text-muted-foreground">No active cases</p>
                 <p className="text-sm text-muted-foreground">Create a case from the Cases tab</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {recentCases.map((item) => (
                   <div key={item.id} className="p-3 rounded-lg bg-muted/50">
                     <div className="flex items-center justify-between mb-2">
                       <div>
                         <p className="font-medium text-sm">{item.profile?.full_name || "Unknown Client"}</p>
                         <p className="text-xs text-muted-foreground">{item.case_type}</p>
                       </div>
                       <span className="text-xs text-travel font-medium">{getStatusLabel(item.status)}</span>
                     </div>
                     <div className="space-y-1">
                       <div className="flex justify-between text-xs">
                         <span className="text-muted-foreground">Progress</span>
                         <span>{item.progress || 0}%</span>
                       </div>
                       <Progress value={item.progress || 0} className="h-1.5" />
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
 
         {/* Today's Consultations */}
         <Card>
           <CardHeader>
             <CardTitle>Today's Consultations</CardTitle>
           </CardHeader>
           <CardContent>
             {todayConsultations.length === 0 ? (
               <div className="text-center py-8">
                 <Calendar className="w-12 h-12 text-muted-foreground mx-auto mb-3" />
                 <p className="text-muted-foreground">No consultations today</p>
                 <p className="text-sm text-muted-foreground">Schedule consultations from the Consultations tab</p>
               </div>
             ) : (
               <div className="space-y-3">
                 {todayConsultations.map((item) => (
                   <div key={item.id} className="flex items-center justify-between p-3 rounded-lg bg-muted/50">
                     <div className="flex items-center gap-3">
                       <div className="w-10 h-10 rounded-lg bg-travel-light flex items-center justify-center">
                         <Calendar className="w-5 h-5 text-travel" />
                       </div>
                       <div>
                         <p className="font-medium text-sm">{item.profile?.full_name || "Unknown"}</p>
                         <p className="text-xs text-muted-foreground">{item.consultation_type || "Consultation"}</p>
                       </div>
                     </div>
                     <div className="text-right">
                       <p className="font-medium text-sm">
                         {format(new Date(item.scheduled_date), "h:mm a")}
                       </p>
                       <span className={`text-xs ${getStatusColor(item.status)}`}>
                         {getStatusLabel(item.status)}
                       </span>
                     </div>
                   </div>
                 ))}
               </div>
             )}
           </CardContent>
         </Card>
       </div>
     </div>
   );
 };
 
 export default TravelDashboardContent;