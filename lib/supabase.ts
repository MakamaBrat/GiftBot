import { createClient } from "@supabase/supabase-js";

const url = process.env.SUPABASE_URL as string;
const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY as string;

if (!url || !serviceKey) {
  throw new Error("SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY не заданы в env");
}

// service role key — так как пишем/читаем из серверной функции, RLS можно обойти
export const supabase = createClient(url, serviceKey, {
  auth: { persistSession: false },
});
