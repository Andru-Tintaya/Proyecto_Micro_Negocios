import { createClient } from 'https://cdn.jsdelivr.net/npm/@supabase/supabase-js@2.45.4/+esm';

const SUPABASE_URL = 'https://eqvkmhimaxgnicokhpdl.supabase.co'; 
const SUPABASE_ANON_KEY = 'sb_publishable_hes3PXFexmXL5kvljFwUsA_Itz18lP2'; 

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY);