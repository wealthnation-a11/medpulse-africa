-- Create storage bucket for medical images
INSERT INTO storage.buckets (id, name, public) VALUES ('medical-images', 'medical-images', false);

-- Allow authenticated users to upload medical images
CREATE POLICY "Users can upload medical images"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'medical-images');

-- Allow users to view their own or accessible medical images
CREATE POLICY "Users can view medical images"
ON storage.objects FOR SELECT
TO authenticated
USING (bucket_id = 'medical-images');

-- Allow users to delete their own medical images
CREATE POLICY "Users can delete own medical images"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'medical-images' AND auth.uid()::text = (storage.foldername(name))[1]);