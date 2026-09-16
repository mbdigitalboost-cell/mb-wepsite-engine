------------------------------------------------
-- PLATFORM MIGRATION 0021
-- Remove anon EXECUTE privilege from product image
-- storage helper function.
------------------------------------------------

revoke execute
on function public.extract_store_id_from_object_path(text)
from anon;
