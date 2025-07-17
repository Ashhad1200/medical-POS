const { supabase } = require("../../config/supabase");
const bcrypt = require("bcryptjs");

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.supabase_uid = data.supabase_uid;
    this.username = data.username;
    this.email = data.email;
    this.full_name = data.full_name;
    this.phone = data.phone;
    this.avatar_url = data.avatar_url;
    this.role = data.role || "user";
    this.role_in_pos = data.role_in_pos;
    this.permissions = data.permissions || [];
    this.organization_id = data.organization_id;
    this.subscription_status = data.subscription_status || "pending";
    this.access_valid_till = data.access_valid_till;
    this.trial_ends_at = data.trial_ends_at;
    this.last_access_extension = data.last_access_extension;
    this.is_trial_user = data.is_trial_user !== false;
    this.is_active = data.is_active !== false;
    this.is_email_verified = data.is_email_verified || false;
    this.last_login = data.last_login;
    this.login_attempts = data.login_attempts || 0;
    this.locked_until = data.locked_until;
    this.password_reset_token = data.password_reset_token;
    this.password_reset_expires = data.password_reset_expires;
    this.two_factor_enabled = data.two_factor_enabled || false;
    this.two_factor_secret = data.two_factor_secret;
    this.preferences = data.preferences || {};
    this.theme = data.theme || "light";
    this.language = data.language || "en";
    this.timezone = data.timezone || "UTC";
    this.notification_settings = data.notification_settings || {};
    this.created_by = data.created_by;
    this.approved_by = data.approved_by;
    this.approved_at = data.approved_at;
    this.deactivated_by = data.deactivated_by;
    this.deactivated_at = data.deactivated_at;
    this.deactivation_reason = data.deactivation_reason;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new User(data) : null;
    } catch (error) {
      console.error("Error finding user by ID:", error);
      throw error;
    }
  }

  static async findBySupabaseUid(supabaseUid) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("supabase_uid", supabaseUid)
        .single();

      if (error) throw error;
      return data ? new User(data) : null;
    } catch (error) {
      console.error("Error finding user by Supabase UID:", error);
      throw error;
    }
  }

  static async findByUsername(username) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("username", username)
        .single();

      if (error) throw error;
      return data ? new User(data) : null;
    } catch (error) {
      console.error("Error finding user by username:", error);
      throw error;
    }
  }

  static async findByEmail(email) {
    try {
      const { data, error } = await supabase
        .from("users")
        .select("*")
        .eq("email", email)
        .single();

      if (error) throw error;
      return data ? new User(data) : null;
    } catch (error) {
      console.error("Error finding user by email:", error);
      throw error;
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      let query = supabase
        .from("users")
        .select("*")
        .eq("organization_id", organizationId);

      if (options.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      if (options.role) {
        query = query.eq("role", options.role);
      }

      if (options.limit) {
        query = query.limit(options.limit);
      }

      if (options.offset) {
        query = query.range(
          options.offset,
          options.offset + (options.limit || 100) - 1
        );
      }

      const { data, error } = await query;

      if (error) throw error;
      return data ? data.map((user) => new User(user)) : [];
    } catch (error) {
      console.error("Error finding users by organization:", error);
      throw error;
    }
  }

  static async create(userData) {
    try {
      // Hash password if provided
      if (userData.password) {
        const salt = await bcrypt.genSalt(12);
        userData.password = await bcrypt.hash(userData.password, salt);
      }

      const { data, error } = await supabase
        .from("users")
        .insert([userData])
        .select()
        .single();

      if (error) throw error;
      return new User(data);
    } catch (error) {
      console.error("Error creating user:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updated_at = new Date().toISOString();

      if (this.id) {
        // Update existing user
        const { data, error } = await supabase
          .from("users")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new User(data);
      } else {
        // Create new user
        return await User.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving user:", error);
      throw error;
    }
  }

  async updateLastLogin() {
    try {
      this.last_login = new Date().toISOString();
      this.login_attempts = 0; // Reset login attempts on successful login
      this.locked_until = null; // Clear lock if exists

      const { data, error } = await supabase
        .from("users")
        .update({
          last_login: this.last_login,
          login_attempts: this.login_attempts,
          locked_until: this.locked_until,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.id)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error updating last login:", error);
      throw error;
    }
  }

  async comparePassword(candidatePassword) {
    if (!this.password) return false;
    return bcrypt.compare(candidatePassword, this.password);
  }

  async incrementLoginAttempts() {
    try {
      this.login_attempts += 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (this.login_attempts >= 5) {
        this.locked_until = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          login_attempts: this.login_attempts,
          locked_until: this.locked_until,
          updated_at: new Date().toISOString(),
        })
        .eq("id", this.id)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error incrementing login attempts:", error);
      throw error;
    }
  }

  isLocked() {
    if (!this.locked_until) return false;
    return new Date() < new Date(this.locked_until);
  }

  getPermissions() {
    const rolePermissions = {
      admin: ["all"],
      manager: [
        "user:read",
        "user:update",
        "medicine:all",
        "order:all",
        "supplier:all",
        "inventory:all",
        "reports:all",
      ],
      user: ["medicine:read", "order:create", "order:read", "inventory:read"],
      restricted: ["medicine:read"],
    };

    // Return custom permissions if set, otherwise role-based permissions
    if (this.permissions && this.permissions.length > 0) {
      return this.permissions;
    }

    return rolePermissions[this.role] || [];
  }

  hasPermission(permission) {
    const permissions = this.getPermissions();
    return permissions.includes("all") || permissions.includes(permission);
  }

  toJSON() {
    const obj = { ...this };
    delete obj.password; // Never return password in JSON
    return obj;
  }

  // Static method to get user count by organization
  static async countByOrganization(organizationId) {
    try {
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting users by organization:", error);
      throw error;
    }
  }
}

module.exports = User;
