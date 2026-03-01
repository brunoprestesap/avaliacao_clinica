import { createClient } from '@supabase/supabase-js';

const supabase = createClient(
  'https://ojtzwmjwtasxnzuyrrfy.supabase.co',
  'sb_publishable_CwsAtAghCbACPyyZxlwitw_XDryX0pu'
);

async function run() {
  const { data, error } = await supabase.from('consultas').select('*');
  console.dir(data, { depth: null });
}
run();
