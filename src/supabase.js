import { createClient } from "@supabase/supabase-js"

const supabaseUrl ="https://xiqfsqqyztofrtzkbowo.supabase.co"
const supabaseKey = "sb_publishable_AuQ55BYh02wi_58tEEIhkQ_PoUxuV_9"

export const supabase = createClient(
  supabaseUrl,
  supabaseKey
)