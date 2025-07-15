const { supabase } = require("../../config/supabase");
const bcrypt = require("bcryptjs");

class User {
  constructor(data = {}) {
    this.id = data.id;
    this.supabaseUid = data.supabaseUid;
    this.username = data.username;
    this.email = data.email;
    this.fullName = data.fullName;
    this.phone = data.phone;
    this.avatar = data.avatar;
    this.role = data.role || "user";
    this.permissions = data.permissions || [];
    this.selectedRole = data.selectedRole;
    this.organizationId = data.organizationId;
    this.subscriptionStatus = data.subscriptionStatus || "pending";
    this.accessValidTill = data.accessValidTill;
    this.trialEndsAt = data.trialEndsAt;
    this.lastAccessExtension = data.lastAccessExtension;
    this.isTrialUser = data.isTrialUser !== false;
    this.isActive = data.isActive !== false;
    this.isEmailVerified = data.isEmailVerified || false;
    this.lastLogin = data.lastLogin;
    this.loginAttempts = data.loginAttempts || 0;
    this.lockedUntil = data.lockedUntil;
    this.passwordResetToken = data.passwordResetToken;
    this.passwordResetExpires = data.passwordResetExpires;
    this.twoFactorEnabled = data.twoFactorEnabled || false;
    this.twoFactorSecret = data.twoFactorSecret;
    this.preferences = data.preferences || {};
    this.theme = data.theme || "light";
    this.language = data.language || "en";
    this.timezone = data.timezone || "UTC";
    this.notificationSettings = data.notificationSettings || {};
    this.createdBy = data.createdBy;
    this.approvedBy = data.approvedBy;
    this.approvedAt = data.approvedAt;
    this.deactivatedBy = data.deactivatedBy;
    this.deactivatedAt = data.deactivatedAt;
    this.deactivationReason = data.deactivationReason;
    this.roleInPOS = data.roleInPOS;
    this.password = data.password;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
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
        .eq("supabaseUid", supabaseUid)
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
        .eq("organizationId", organizationId);

      if (options.isActive !== undefined) {
        query = query.eq("isActive", options.isActive);
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
      this.updatedAt = new Date().toISOString();

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
      this.lastLogin = new Date().toISOString();
      this.loginAttempts = 0; // Reset login attempts on successful login
      this.lockedUntil = null; // Clear lock if exists

      const { data, error } = await supabase
        .from("users")
        .update({
          lastLogin: this.lastLogin,
          loginAttempts: this.loginAttempts,
          lockedUntil: this.lockedUntil,
          updatedAt: new Date().toISOString(),
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
      this.loginAttempts += 1;

      // Lock account after 5 failed attempts for 15 minutes
      if (this.loginAttempts >= 5) {
        this.lockedUntil = new Date(Date.now() + 15 * 60 * 1000).toISOString();
      }

      const { data, error } = await supabase
        .from("users")
        .update({
          loginAttempts: this.loginAttempts,
          lockedUntil: this.lockedUntil,
          updatedAt: new Date().toISOString(),
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
    if (!this.lockedUntil) return false;
    return new Date() < new Date(this.lockedUntil);
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
        .eq("organizationId", organizationId)
        .eq("isActive", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting users by organization:", error);
      throw error;
    }
  }
}

module.exports = User;
