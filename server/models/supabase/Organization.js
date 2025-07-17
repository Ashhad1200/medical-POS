const { supabase } = require("../../config/supabase");

class Organization {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.code = data.code;
    this.description = data.description;
    this.address = data.address;
    this.phone = data.phone;
    this.email = data.email;
    this.website = data.website;
    this.logo_url = data.logo_url;
    this.is_active = data.is_active !== false;
    this.subscription_tier = data.subscription_tier || "basic";
    this.max_users = data.max_users || 5;
    this.current_users = data.current_users || 0;
    this.trial_ends_at = data.trial_ends_at;
    this.billing_email = data.billing_email;
    this.tax_id = data.tax_id;
    this.currency = data.currency || "USD";
    this.timezone = data.timezone || "UTC";
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new Organization(data) : null;
    } catch (error) {
      console.error("Error finding organization by ID:", error);
      throw error;
    }
  }

  static async findByCode(code) {
    try {
      const { data, error } = await supabase
        .from("organizations")
        .select("*")
        .eq("code", code)
        .single();

      if (error) throw error;
      return data ? new Organization(data) : null;
    } catch (error) {
      console.error("Error finding organization by code:", error);
      throw error;
    }
  }

  static async findAll(options = {}) {
    try {
      let query = supabase.from("organizations").select("*");

      if (options.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      if (options.subscriptionTier) {
        query = query.eq("subscription_tier", options.subscriptionTier);
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        query = query.or(`
          name.ilike.%${searchTerm}%,
          code.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%
        `);
      }

      // Sorting
      if (options.sortBy) {
        const sortOrder = options.sortOrder || "asc";
        query = query.order(options.sortBy, { ascending: sortOrder === "asc" });
      } else {
        query = query.order("created_at", { ascending: false });
      }

      // Pagination
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
      return data ? data.map((org) => new Organization(org)) : [];
    } catch (error) {
      console.error("Error finding organizations:", error);
      throw error;
    }
  }

  static async create(organizationData) {
    try {
      // Generate unique code if not provided
      if (!organizationData.code) {
        organizationData.code = await this.generateUniqueCode(
          organizationData.name
        );
      }

      const { data, error } = await supabase
        .from("organizations")
        .insert([organizationData])
        .select()
        .single();

      if (error) throw error;
      return new Organization(data);
    } catch (error) {
      console.error("Error creating organization:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updated_at = new Date().toISOString();

      if (this.id) {
        // Update existing organization
        const { data, error } = await supabase
          .from("organizations")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new Organization(data);
      } else {
        // Create new organization
        return await Organization.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving organization:", error);
      throw error;
    }
  }

  async updateUserCount() {
    try {
      // Count active users for this organization
      const { count, error } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", this.id)
        .eq("is_active", true);

      if (error) throw error;

      this.current_users = count || 0;
      this.updated_at = new Date().toISOString();

      const { data, updateError } = await supabase
        .from("organizations")
        .update({
          current_users: this.current_users,
          updated_at: this.updated_at,
        })
        .eq("id", this.id)
        .select()
        .single();

      if (updateError) throw updateError;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error updating user count:", error);
      throw error;
    }
  }

  async checkUserLimit() {
    await this.updateUserCount();
    return this.current_users < this.max_users;
  }

  async canAddUser() {
    return await this.checkUserLimit();
  }

  // Static method to generate unique organization code
  static async generateUniqueCode(name) {
    try {
      // Create base code from name
      let baseCode = name
        .replace(/[^a-zA-Z0-9]/g, "")
        .toUpperCase()
        .substring(0, 6);

      if (baseCode.length < 3) {
        baseCode = "ORG" + baseCode;
      }

      // Check if code exists
      const { data, error } = await supabase
        .from("organizations")
        .select("code")
        .eq("code", baseCode)
        .single();

      if (error && error.code !== "PGRST116") {
        // PGRST116 = no rows returned
        throw error;
      }

      if (data) {
        // Code exists, add random suffix
        const suffix = Math.random().toString(36).substring(2, 5).toUpperCase();
        return baseCode + suffix;
      }

      return baseCode;
    } catch (error) {
      console.error("Error generating unique code:", error);
      // Fallback to timestamp-based code
      return "ORG" + Date.now().toString().slice(-6);
    }
  }

  // Static method to get organization statistics
  static async getStatistics(organizationId) {
    try {
      // Get user count
      const { count: userCount, error: userError } = await supabase
        .from("users")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (userError) throw userError;

      // Get medicine count
      const { count: medicineCount, error: medicineError } = await supabase
        .from("medicines")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (medicineError) throw medicineError;

      // Get order count
      const { count: orderCount, error: orderError } = await supabase
        .from("orders")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId);

      if (orderError) throw orderError;

      // Get supplier count
      const { count: supplierCount, error: supplierError } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (supplierError) throw supplierError;

      return {
        userCount: userCount || 0,
        medicineCount: medicineCount || 0,
        orderCount: orderCount || 0,
        supplierCount: supplierCount || 0,
      };
    } catch (error) {
      console.error("Error getting organization statistics:", error);
      throw error;
    }
  }

  // Static method to get organization with statistics
  static async findByIdWithStats(id) {
    try {
      const organization = await this.findById(id);
      if (!organization) return null;

      const stats = await this.getStatistics(id);
      return {
        ...organization.toJSON(),
        statistics: stats,
      };
    } catch (error) {
      console.error("Error finding organization with stats:", error);
      throw error;
    }
  }

  // Static method to get organization count
  static async count(options = {}) {
    try {
      let query = supabase
        .from("organizations")
        .select("*", { count: "exact", head: true });

      if (options.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      if (options.subscriptionTier) {
        query = query.eq("subscription_tier", options.subscriptionTier);
      }

      const { count, error } = await query;

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting organizations:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      code: this.code,
      description: this.description,
      address: this.address,
      phone: this.phone,
      email: this.email,
      website: this.website,
      logo_url: this.logo_url,
      is_active: this.is_active,
      subscription_tier: this.subscription_tier,
      max_users: this.max_users,
      current_users: this.current_users,
      trial_ends_at: this.trial_ends_at,
      billing_email: this.billing_email,
      tax_id: this.tax_id,
      currency: this.currency,
      timezone: this.timezone,
      created_at: this.created_at,
      updated_at: this.updated_at,
    };
  }
}

module.exports = Organization;
