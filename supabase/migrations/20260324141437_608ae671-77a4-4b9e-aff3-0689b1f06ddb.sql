
-- Create profiles table
CREATE TABLE public.profiles (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL UNIQUE REFERENCES auth.users(id) ON DELETE CASCADE,
  company_name TEXT NOT NULL DEFAULT '',
  phone TEXT NOT NULL DEFAULT '',
  client_code TEXT NOT NULL DEFAULT '',
  email TEXT NOT NULL DEFAULT '',
  approved BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own profile" ON public.profiles FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can insert their own profile" ON public.profiles FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own profile" ON public.profiles FOR UPDATE USING (auth.uid() = user_id);

-- Create user_roles table for admin access
CREATE TYPE public.app_role AS ENUM ('admin', 'dealer', 'user');

CREATE TABLE public.user_roles (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID REFERENCES auth.users(id) ON DELETE CASCADE NOT NULL,
  role app_role NOT NULL,
  UNIQUE (user_id, role)
);

ALTER TABLE public.user_roles ENABLE ROW LEVEL SECURITY;

CREATE OR REPLACE FUNCTION public.has_role(_user_id UUID, _role app_role)
RETURNS BOOLEAN
LANGUAGE sql
STABLE
SECURITY DEFINER
SET search_path = public
AS $$
  SELECT EXISTS (
    SELECT 1 FROM public.user_roles WHERE user_id = _user_id AND role = _role
  )
$$;

CREATE POLICY "Users can view their own roles" ON public.user_roles FOR SELECT USING (auth.uid() = user_id);

-- Create measurements table
CREATE TABLE public.measurements (
  id UUID NOT NULL DEFAULT gen_random_uuid() PRIMARY KEY,
  user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
  status TEXT NOT NULL DEFAULT 'submitted' CHECK (status IN ('submitted', 'in_review', 'quoted', 'ordered', 'completed')),
  product_type TEXT NOT NULL CHECK (product_type IN ('finestra', 'porta_finestra', 'basculante', 'zanzariera', 'persiana')),
  client_name TEXT NOT NULL DEFAULT '',
  client_address TEXT NOT NULL DEFAULT '',
  survey_type TEXT NOT NULL CHECK (survey_type IN ('foro_muro', 'luce_netta', 'controtelaio', 'vecchio_infisso')),
  width_mm INTEGER NOT NULL,
  height_mm INTEGER NOT NULL,
  depth_mm INTEGER,
  is_square BOOLEAN DEFAULT true,
  out_of_square_mm INTEGER,
  is_plumb BOOLEAN DEFAULT true,
  is_level BOOLEAN DEFAULT true,
  internal_space_mm INTEGER,
  external_space_mm INTEGER,
  num_panels INTEGER DEFAULT 1,
  panel_type TEXT CHECK (panel_type IN ('anta_ribalta', 'vasistas', 'scorrevole', 'battente')),
  opening_direction TEXT CHECK (opening_direction IN ('destra', 'sinistra')),
  frame_type TEXT CHECK (frame_type IN ('standard', 'ridotto', 'maggiorato')),
  material TEXT CHECK (material IN ('pvc', 'alluminio', 'legno')),
  color_internal TEXT,
  color_external TEXT,
  handle_type TEXT CHECK (handle_type IN ('standard', 'design', 'con_chiave')),
  glass_type TEXT CHECK (glass_type IN ('doppio', 'triplo', 'basso_emissivo', 'antisfondamento', 'satinato', 'selettivo')),
  has_mosquito_net BOOLEAN DEFAULT false,
  has_shutter BOOLEAN DEFAULT false,
  has_box BOOLEAN DEFAULT false,
  has_motorization BOOLEAN DEFAULT false,
  installation_type TEXT CHECK (installation_type IN ('solo_fornitura', 'con_installazione')),
  laying_type TEXT CHECK (laying_type IN ('standard', 'certificata')),
  remove_old BOOLEAN DEFAULT false,
  notes TEXT,
  photo_urls TEXT[],
  created_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now(),
  updated_at TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT now()
);

ALTER TABLE public.measurements ENABLE ROW LEVEL SECURITY;

CREATE POLICY "Users can view their own measurements" ON public.measurements FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY "Users can create measurements" ON public.measurements FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY "Users can update their own measurements" ON public.measurements FOR UPDATE USING (auth.uid() = user_id);
CREATE POLICY "Admins can view all measurements" ON public.measurements FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all measurements" ON public.measurements FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can view all profiles" ON public.profiles FOR SELECT USING (public.has_role(auth.uid(), 'admin'));
CREATE POLICY "Admins can update all profiles" ON public.profiles FOR UPDATE USING (public.has_role(auth.uid(), 'admin'));

-- Trigger for updated_at
CREATE OR REPLACE FUNCTION public.update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SET search_path = public;

CREATE TRIGGER update_profiles_updated_at BEFORE UPDATE ON public.profiles FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();
CREATE TRIGGER update_measurements_updated_at BEFORE UPDATE ON public.measurements FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- Auto-create profile on signup
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
  INSERT INTO public.profiles (user_id, email)
  VALUES (NEW.id, NEW.email);
  INSERT INTO public.user_roles (user_id, role)
  VALUES (NEW.id, 'dealer');
  RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER SET search_path = public;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- Storage bucket for measurement photos
INSERT INTO storage.buckets (id, name, public) VALUES ('measurement-photos', 'measurement-photos', true);

CREATE POLICY "Authenticated users can upload photos" ON storage.objects FOR INSERT WITH CHECK (bucket_id = 'measurement-photos' AND auth.role() = 'authenticated');
CREATE POLICY "Anyone can view measurement photos" ON storage.objects FOR SELECT USING (bucket_id = 'measurement-photos');
