import { createClient } from "https://cdn.jsdelivr.net/npm/@supabase/supabase-js/+esm";

const supabaseUrl = "https://lqdlcmbfvplgntatqeqt.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxxZGxjbWJmdnBsZ250YXRxZXF0Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3NjU4MzI4MzksImV4cCI6MjA4MTQwODgzOX0.D6hU2K7-zwGgRR-AJKn_TMg7RwknCdSzWXfBCRnmaKg";

export const supabase = createClient(supabaseUrl, supabaseAnonKey);
