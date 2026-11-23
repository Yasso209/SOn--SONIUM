-- Limit private crew proof uploads to common image formats and a 10 MiB maximum.
update storage.buckets
set file_size_limit = 10485760,
    allowed_mime_types = array['image/jpeg','image/png','image/webp']
where id = 'proofs'
  and (file_size_limit is distinct from 10485760
       or allowed_mime_types is distinct from array['image/jpeg','image/png','image/webp']);
