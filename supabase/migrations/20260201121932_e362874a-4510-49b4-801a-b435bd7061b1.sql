-- Create enum for user roles
CREATE TYPE public.app_role AS ENUM ('admin', 'contributor', 'travel_client');

-- Create user_roles table for role management
CREATE TABLE public.user_roles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    role app_role NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, role)
);

-- Create profiles table
CREATE TABLE public.profiles (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    full_name TEXT,
    email TEXT,
    phone TEXT,
    avatar_url TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create contribution groups table
CREATE TABLE public.contribution_groups (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name TEXT NOT NULL,
    description TEXT,
    contribution_amount DECIMAL(10,2) NOT NULL DEFAULT 500.00,
    is_active BOOLEAN DEFAULT true,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create group memberships table
CREATE TABLE public.group_memberships (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.contribution_groups(id) ON DELETE CASCADE NOT NULL,
    is_active BOOLEAN DEFAULT true,
    joined_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (user_id, group_id)
);

-- Create monthly contributions table
CREATE TABLE public.monthly_contributions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    group_id UUID REFERENCES public.contribution_groups(id) ON DELETE CASCADE NOT NULL,
    month INTEGER NOT NULL CHECK (month >= 1 AND month <= 12),
    year INTEGER NOT NULL,
    beneficiary_user_id UUID REFERENCES auth.users(id),
    beneficiary_account_number TEXT,
    beneficiary_bank_name TEXT,
    total_expected DECIMAL(10,2),
    total_collected DECIMAL(10,2) DEFAULT 0,
    is_finalized BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (group_id, month, year)
);

-- Create contribution payments table
CREATE TABLE public.contribution_payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    monthly_contribution_id UUID REFERENCES public.monthly_contributions(id) ON DELETE CASCADE NOT NULL,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    payment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    status TEXT DEFAULT 'pending' CHECK (status IN ('pending', 'paid', 'overdue')),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    UNIQUE (monthly_contribution_id, user_id)
);

-- Create loans table
CREATE TABLE public.loans (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    group_id UUID REFERENCES public.contribution_groups(id) ON DELETE CASCADE NOT NULL,
    principal_amount DECIMAL(10,2) NOT NULL,
    outstanding_balance DECIMAL(10,2) NOT NULL,
    monthly_repayment DECIMAL(10,2),
    status TEXT DEFAULT 'active' CHECK (status IN ('active', 'paid', 'defaulted')),
    issued_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create loan repayments table
CREATE TABLE public.loan_repayments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    loan_id UUID REFERENCES public.loans(id) ON DELETE CASCADE NOT NULL,
    amount DECIMAL(10,2) NOT NULL,
    repayment_type TEXT DEFAULT 'manual' CHECK (repayment_type IN ('manual', 'auto_deduct')),
    repayment_date TIMESTAMP WITH TIME ZONE DEFAULT now(),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create travel clients table (for additional client info)
CREATE TABLE public.travel_clients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL UNIQUE,
    service_type TEXT[] DEFAULT ARRAY['visa_consultation'],
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consultation cases table
CREATE TABLE public.consultation_cases (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    case_type TEXT NOT NULL CHECK (case_type IN ('visa_application', 'visa_refusal_review', 'academic_guidance', 'travel_planning')),
    title TEXT NOT NULL,
    description TEXT,
    status TEXT DEFAULT 'open' CHECK (status IN ('open', 'in_progress', 'under_review', 'completed', 'closed')),
    progress INTEGER DEFAULT 0 CHECK (progress >= 0 AND progress <= 100),
    assigned_to TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
    updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create case documents table
CREATE TABLE public.case_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.consultation_cases(id) ON DELETE CASCADE NOT NULL,
    file_name TEXT NOT NULL,
    file_url TEXT NOT NULL,
    file_type TEXT,
    uploaded_by UUID REFERENCES auth.users(id),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create consultations/appointments table
CREATE TABLE public.consultations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    case_id UUID REFERENCES public.consultation_cases(id) ON DELETE CASCADE,
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    consultation_type TEXT DEFAULT 'video_call' CHECK (consultation_type IN ('video_call', 'phone_call', 'in_person')),
    scheduled_date TIMESTAMP WITH TIME ZONE NOT NULL,
    duration_minutes INTEGER DEFAULT 60,
    status TEXT DEFAULT 'scheduled' CHECK (status IN ('scheduled', 'completed', 'cancelled', 'rescheduled')),
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create reviews table (public reviews from travel clients)
CREATE TABLE public.reviews (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    rating INTEGER NOT NULL CHECK (rating >= 1 AND rating <= 5),
    title TEXT,
    review_text TEXT NOT NULL,
    service_type TEXT CHECK (service_type IN ('visa_consultation', 'visa_refusal_review', 'academic_guidance', 'travel_planning')),
    is_approved BOOLEAN DEFAULT false,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Create notifications table
CREATE TABLE public.notifications (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
    title TEXT NOT NULL,
    message TEXT NOT NULL,
    type TEXT DEFAULT 'info' CHECK (type IN ('info', 'warning', 'success', 'error')),
    is_read BOOLEAN DEFAULT false,
    link TEXT,
    created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

-- Enable RLS on all tables
ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_groups ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.group_memberships ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.monthly_contributions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.contribution_payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.loan_repayments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.travel_clients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultation_cases ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.case_documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.consultations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.reviews ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.notifications ENABLE ROW LEVEL SECURITY;

-- Helper function to check if user is admin
CREATE OR REPLACE FUNCTION public.is_admin(_user_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = 'admin'
  )
$$;

-- Helper function to check if user has a specific role
CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles
    WHERE user_id = _user_id AND role = _role
  )
$$;

-- Helper function to check if user is a member of a contribution group
CREATE OR REPLACE FUNCTION public.is_group_member(_user_id UUID, _group_id UUID)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.group_memberships
    WHERE user_id = _user_id AND group_id = _group_id AND is_active = true
  )
$$;

-- RLS Policies for user_roles
CREATE POLICY "Admins can manage roles"
ON public.user_roles FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

CREATE POLICY "Users can view their own roles"
ON public.user_roles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

-- RLS Policies for profiles
CREATE POLICY "Users can view their own profile"
ON public.profiles FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own profile"
ON public.profiles FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can insert their own profile"
ON public.profiles FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can view all profiles"
ON public.profiles FOR SELECT
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for contribution_groups
CREATE POLICY "Anyone can view active groups"
ON public.contribution_groups FOR SELECT
TO authenticated
USING (is_active = true OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage groups"
ON public.contribution_groups FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for group_memberships
CREATE POLICY "Users can view their own memberships"
ON public.group_memberships FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage memberships"
ON public.group_memberships FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for monthly_contributions
CREATE POLICY "Members can view their group contributions"
ON public.monthly_contributions FOR SELECT
TO authenticated
USING (
  public.is_admin(auth.uid()) OR 
  public.is_group_member(auth.uid(), group_id)
);

CREATE POLICY "Admins can manage monthly contributions"
ON public.monthly_contributions FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for contribution_payments
CREATE POLICY "Users can view their own payments"
ON public.contribution_payments FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage payments"
ON public.contribution_payments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for loans
CREATE POLICY "Users can view their own loans"
ON public.loans FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage loans"
ON public.loans FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for loan_repayments
CREATE POLICY "Users can view their own loan repayments"
ON public.loan_repayments FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.loans 
    WHERE loans.id = loan_repayments.loan_id 
    AND (loans.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Admins can manage loan repayments"
ON public.loan_repayments FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for travel_clients
CREATE POLICY "Users can view their own client record"
ON public.travel_clients FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage travel clients"
ON public.travel_clients FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for consultation_cases
CREATE POLICY "Users can view their own cases"
ON public.consultation_cases FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create their own cases"
ON public.consultation_cases FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Admins can manage all cases"
ON public.consultation_cases FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for case_documents
CREATE POLICY "Users can view documents for their cases"
ON public.case_documents FOR SELECT
TO authenticated
USING (
  EXISTS (
    SELECT 1 FROM public.consultation_cases 
    WHERE consultation_cases.id = case_documents.case_id 
    AND (consultation_cases.user_id = auth.uid() OR public.is_admin(auth.uid()))
  )
);

CREATE POLICY "Users can upload documents to their cases"
ON public.case_documents FOR INSERT
TO authenticated
WITH CHECK (
  EXISTS (
    SELECT 1 FROM public.consultation_cases 
    WHERE consultation_cases.id = case_documents.case_id 
    AND consultation_cases.user_id = auth.uid()
  ) OR public.is_admin(auth.uid())
);

CREATE POLICY "Admins can manage documents"
ON public.case_documents FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for consultations
CREATE POLICY "Users can view their own consultations"
ON public.consultations FOR SELECT
TO authenticated
USING (user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Admins can manage consultations"
ON public.consultations FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for reviews
CREATE POLICY "Anyone can view approved reviews"
ON public.reviews FOR SELECT
TO authenticated
USING (is_approved = true OR user_id = auth.uid() OR public.is_admin(auth.uid()));

CREATE POLICY "Users can create reviews"
ON public.reviews FOR INSERT
TO authenticated
WITH CHECK (user_id = auth.uid());

CREATE POLICY "Users can update their own reviews"
ON public.reviews FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can manage reviews"
ON public.reviews FOR ALL
TO authenticated
USING (public.is_admin(auth.uid()));

-- RLS Policies for notifications
CREATE POLICY "Users can view their own notifications"
ON public.notifications FOR SELECT
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Users can update their own notifications"
ON public.notifications FOR UPDATE
TO authenticated
USING (user_id = auth.uid());

CREATE POLICY "Admins can create notifications"
ON public.notifications FOR INSERT
TO authenticated
WITH CHECK (public.is_admin(auth.uid()));

-- Function to update updated_at timestamp
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

-- Create triggers for updated_at
CREATE TRIGGER update_profiles_updated_at
  BEFORE UPDATE ON public.profiles
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_contribution_groups_updated_at
  BEFORE UPDATE ON public.contribution_groups
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_monthly_contributions_updated_at
  BEFORE UPDATE ON public.monthly_contributions
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_loans_updated_at
  BEFORE UPDATE ON public.loans
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TRIGGER update_consultation_cases_updated_at
  BEFORE UPDATE ON public.consultation_cases
  FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Function to create profile on user signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, full_name, email)
  VALUES (
    NEW.id,
    NEW.raw_user_meta_data->>'full_name',
    NEW.email
  );
  
  -- Add role based on signup metadata
  IF NEW.raw_user_meta_data->>'role' = 'contributor' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'contributor');
  ELSIF NEW.raw_user_meta_data->>'role' = 'travel_client' THEN
    INSERT INTO public.user_roles (user_id, role)
    VALUES (NEW.id, 'travel_client');
    INSERT INTO public.travel_clients (user_id) VALUES (NEW.id);
  END IF;
  
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

-- Create trigger for new user signup
CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();