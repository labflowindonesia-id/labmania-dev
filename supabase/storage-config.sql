-- Supabase Storage Configuration
-- Run this in Supabase SQL Editor

-- =============================================
-- STORAGE BUCKETS
-- =============================================

-- Create storage buckets for documents and images
INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
VALUES 
  ('documents', 'documents', false, 10485760, ARRAY['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document']),
  ('images', 'images', true, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/gif']),
  ('calibration-reports', 'calibration-reports', false, 10485760, ARRAY['application/pdf']),
  ('maintenance-photos', 'maintenance-photos', false, 5242880, ARRAY['image/jpeg', 'image/png', 'image/webp'])
ON CONFLICT (id) DO NOTHING;

-- =============================================
-- STORAGE POLICIES
-- =============================================

-- Documents bucket policies
CREATE POLICY "Authenticated users can upload documents"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'documents');

CREATE POLICY "Authenticated users can view documents"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'documents');

CREATE POLICY "Authenticated users can update own documents"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'documents' AND auth.uid()::text = (storage.foldername(name))[1]);

CREATE POLICY "Admin can delete documents"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'documents' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Images bucket policies (public read)
CREATE POLICY "Anyone can view images"
ON storage.objects FOR SELECT TO public
USING (bucket_id = 'images');

CREATE POLICY "Authenticated users can upload images"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'images');

CREATE POLICY "Authenticated users can update images"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'images');

CREATE POLICY "Admin can delete images"
ON storage.objects FOR DELETE TO authenticated
USING (
  bucket_id = 'images' AND
  EXISTS (SELECT 1 FROM public.profiles WHERE id = auth.uid() AND role = 'admin')
);

-- Calibration reports bucket policies
CREATE POLICY "Authenticated users can upload calibration reports"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'calibration-reports');

CREATE POLICY "Authenticated users can view calibration reports"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'calibration-reports');

CREATE POLICY "Authenticated users can update calibration reports"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'calibration-reports');

-- Maintenance photos bucket policies
CREATE POLICY "Authenticated users can upload maintenance photos"
ON storage.objects FOR INSERT TO authenticated
WITH CHECK (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can view maintenance photos"
ON storage.objects FOR SELECT TO authenticated
USING (bucket_id = 'maintenance-photos');

CREATE POLICY "Authenticated users can update maintenance photos"
ON storage.objects FOR UPDATE TO authenticated
USING (bucket_id = 'maintenance-photos');
