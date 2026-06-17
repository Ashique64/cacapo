import { createClient } from "@supabase/supabase-js";

const supabaseUrl = "https://lnmmifltzhanjkfxmeuw.supabase.co";
const supabaseAnonKey = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImxubW1pZmx0emhhbmprZnhtZXV3Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3ODE1OTAzOTAsImV4cCI6MjA5NzE2NjM5MH0.b2U43hDyQ0h5y27quO7D17CfR3VwSIdEeGNFx3Smm10";

const supabase = createClient(supabaseUrl, supabaseAnonKey);

async function test() {
  console.log("Fetching profiles...");
  const { data: profiles, error } = await supabase
    .from("profiles")
    .select("*");
  if (error) {
    console.error("Profiles error:", error);
  } else {
    console.log("Profiles found:", JSON.stringify(profiles, null, 2));
  }
}

test();
