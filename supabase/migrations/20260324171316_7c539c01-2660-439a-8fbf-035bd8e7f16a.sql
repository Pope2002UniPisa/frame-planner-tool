
-- Create storage bucket for company logos
INSERT INTO storage.buckets (id, name, public) VALUES ('logos', 'logos', true) ON CONFLICT (id) DO NOTHING;

-- Allow authenticated users to upload to logos bucket
CREATE POLICY "Users can upload logos" ON storage.objects
  FOR INSERT TO authenticated WITH CHECK (bucket_id = 'logos');

CREATE POLICY "Anyone can view logos" ON storage.objects
  FOR SELECT TO authenticated USING (bucket_id = 'logos');

CREATE POLICY "Users can update own logos" ON storage.objects
  FOR UPDATE TO authenticated USING (bucket_id = 'logos');
