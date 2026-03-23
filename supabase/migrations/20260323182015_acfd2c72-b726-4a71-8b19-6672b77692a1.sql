
-- Delete duplicate clearbit entries where wikipedia versions exist
DELETE FROM public.stores WHERE id IN (
  '80b72517-a252-458f-90e1-4b2f4d4004dd', -- Adidas clearbit dupe
  '913bace9-14b4-44a0-9b5a-bae213d8b4ba', -- Amazon clearbit dupe
  '4138afd2-8a7d-458b-940d-3bb2db425bec', -- Apple clearbit dupe
  '5125fad1-7f56-41b2-b4ad-4769a766bc70', -- Best Buy clearbit dupe
  '7d7e8a33-7e0d-4bf2-aa01-b75a930a5454', -- eBay clearbit dupe
  '8f6d6f53-7011-4b24-8ddc-158602314295', -- Nike clearbit dupe
  '7333b3d3-d667-46b4-b2d0-04484672e25e'  -- Sephora clearbit dupe
);

-- Update remaining stores with broken clearbit logos to working Wikipedia/brand URLs
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/e/ea/6pm_logo.svg' WHERE id = '35fcb0cd-e5fc-48da-be3f-c574a9996a0e';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/d/d8/ASOS_logo.svg' WHERE id = '0ff5ea5e-daa0-422c-a06c-aebe5cb09b28';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/4/48/AutoZone_logo.svg' WHERE id = 'e0edc6ac-7331-4d4b-8146-32ee99741e06';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/2/20/Adidas_Logo.svg' WHERE id = '6c300e86-534d-4b0b-a997-6d6408f9c916';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a9/Amazon_logo.svg' WHERE id = '57b56db9-f06a-401e-b1eb-130d7c1b6b11';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/f/fa/Apple_logo_black.svg' WHERE id = 'f8624b11-76d1-4e9c-983a-326b8ef6daa8';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/f/f5/Best_Buy_Logo.svg' WHERE id = 'a661c365-5d06-492d-94f2-87b3cfe40fd0';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/1/1b/EBay_logo.svg' WHERE id = '194b39f6-46e1-4d08-bb43-227f14d83c49';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/a/a6/Logo_NIKE.svg' WHERE id = '6bca5c16-64ca-4ebf-afb1-28804d885ea3';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/3/3c/Nordstrom_logo.svg' WHERE id = 'd67380c3-374b-4623-a74c-58db00bf0e78';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/en/9/95/Rolex_logo.svg' WHERE id = '71847a4e-cd6a-4a80-94de-d22cf0328298';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/2/28/Sephora_logo.svg' WHERE id = 'df49e359-ebe4-4d77-872a-ccd538459400';

-- Fix clearbit-only stores with reliable favicon/brand URLs
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=bhphotovideo.com&sz=128' WHERE id = '793cb3a6-0749-4644-8a6f-34e72acf856e';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=bathandbodyworks.com&sz=128' WHERE id = 'e33e25e7-3cd1-4d38-8dba-85ec7066afe7';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=carters.com&sz=128' WHERE id = '69081768-6cd5-4f6f-8a9a-9ffdb81991c7';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=colourpop.com&sz=128' WHERE id = 'bcdbe6fd-973d-4306-89aa-e90bb463895c';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=farfetch.com&sz=128' WHERE id = 'caf8e6b2-39f0-4856-9dca-eef86b8fd94c';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=jomashop.com&sz=128' WHERE id = '392a105e-8283-415e-b10b-3e0892dfa4ac';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/3/39/Macys_logo.svg' WHERE id = '6481e4d0-f85b-4ba8-ac12-6e2f44ba5efe';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=newegg.com&sz=128' WHERE id = 'd7250639-1d11-4211-bdb8-b8cbc9e8b0f6';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/4/44/Puma-logo.svg' WHERE id = 'bb127eef-f06d-4176-9d5b-ab6c4a1c38a5';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/2/21/Ralph_Lauren_logo.svg' WHERE id = '507f73bd-04de-4b5c-b0f6-9db08090f018';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=shein.com&sz=128' WHERE id = '1160b08c-13e5-4a81-81af-6998141e157f';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/c/c5/Target_Corporation_logo_%28vector%29.svg' WHERE id = 'd4abb322-e5bd-4bd7-9588-4357fbbd5b33';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=ulta.com&sz=128' WHERE id = '05db734f-c7a3-4cd5-a169-337147bf282f';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/4/44/Under_armour_logo.svg' WHERE id = 'e9cda88e-319a-47e7-8d89-112066c7dc9b';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=victoriassecret.com&sz=128' WHERE id = 'd7063364-fa61-423b-bbfd-7084cd56ba9f';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/1/14/Walmart_Spark.svg' WHERE id = 'e74d5e0b-ee6e-4fee-84fa-863e37fcc690';
UPDATE public.stores SET logo_url = 'https://upload.wikimedia.org/wikipedia/commons/f/fd/Zara_Logo.svg' WHERE id = 'd80df918-4b00-43a3-b776-b1568616ee64';
UPDATE public.stores SET logo_url = 'https://www.google.com/s2/favicons?domain=ashford.com&sz=128' WHERE id = 'ff08d6f5-5b77-4e21-813c-433d69ab6cd7';
