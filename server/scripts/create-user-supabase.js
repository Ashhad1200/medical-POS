const { supabase } = require("../config/supabase");
require("dotenv").config({ path: "../.env" }); // Load server .env

const createUserInSupabase = async () => {
const email = "testuser@example.com";
const password = "counter123"; // Updated password to match documentation
const username = "expuser";
const fullName = "Experiment User";
const role = "counter"; // Default role for the new user
const defaultOrgCode = "MOIZ001"; // Default organization code

try {
  console.log(`Attempting to create user: ${email}`);

  // Fetch the default organization ID
  const { data: organization, error: orgError } = await supabase
    .from("organizations")
    .select("id")
    .eq("code", defaultOrgCode)
    .single();

  if (orgError) {
    console.error(`❌ Error fetching organization ${defaultOrgCode}:`, orgError.message);
    throw new Error(`Organization with code ${defaultOrgCode} not found. Please ensure it exists.`);
  }

  const organizationId = organization.id;
  console.log(`Found organization '${defaultOrgCode}' with ID: ${organizationId}`);

  // 1. Create user in Supabase Auth
  const { data: authData, error: authError } =
    await supabase.auth.admin.createUser({
      email,
      password,
      email_confirm: true, // Set to true for immediate confirmation
      user_metadata: {
        username,
        full_name: fullName,
        role: role,
        organization_id: organizationId, // Include organization_id in user_metadata
      },
    });

  if (authError) {
    if (authError.message.includes("already exists")) {
      console.warn(`User ${email} already exists in Supabase Auth. Skipping auth creation.`);
      // If user already exists in auth, try to fetch their profile to ensure it's in our 'users' table
      const { data: existingAuthUser } = await supabase.auth.admin.getUserByEmail(email);
      if (existingAuthUser?.user) {
        authData.user = existingAuthUser.user;
      } else {
        throw new Error("Failed to retrieve existing user from Supabase Auth.");
      }
    } else {
      throw authError;
    }
  }

  console.log(`User ${email} created/found in Supabase Auth with ID: ${authData.user.id}`);

  // 2. Create user profile in the 'users' table if it doesn't exist
  const { data: existingProfile, error: fetchProfileError } = await supabase
    .from("users")
    .select("id")
    .eq("supabase_uid", authData.user.id)
    .single();

  if (fetchProfileError && fetchProfileError.code !== 'PGRST116') { // PGRST116 means no rows found
    throw fetchProfileError;
  }

  if (existingProfile) {
    console.log(`User profile for ${email} already exists in 'users' table.`);
  } else {
    console.log(`Creating user profile for ${email} in 'users' table...`);
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .insert({
        supabase_uid: authData.user.id,
        username,
        email,
        full_name: fullName,
        role: role,
        role_in_pos: role, // Assuming role_in_pos is the same as role for simplicity
        is_active: true,
        permissions: ["medicine:read", "order:create", "order:read"], // Default permissions
        organization_id: organizationId, // Assign organization_id
        // created_by: null, // Assuming this script runs independently, no creator
      })
      .select()
      .single();

    if (profileError) {
      // If profile creation fails, attempt to delete the auth user to prevent orphaned records
      await supabase.auth.admin.deleteUser(authData.user.id);
      throw profileError;
    }
    console.log(`User profile for ${email} created successfully in 'users' table.`);
  }

  console.log("\n🎉 User creation process completed!");
  console.log(`You can now try logging in with: Email: ${email} | Password: ${password}`);
  process.exit(0);
} catch (error) {
  console.error("❌ Error creating user:", error.message);
  process.exit(1);
}
};

createUserInSupabase();
