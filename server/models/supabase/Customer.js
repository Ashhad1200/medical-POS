const { supabase } = require("../../config/supabase");

class Customer {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.phone = data.phone;
    this.email = data.email;
    this.address = data.address;
    this.city = data.city;
    this.state = data.state;
    this.country = data.country;
    this.postal_code = data.postal_code;
    this.date_of_birth = data.date_of_birth;
    this.gender = data.gender;
    this.medical_history = data.medical_history;
    this.allergies = data.allergies;
    this.emergency_contact = data.emergency_contact;
    this.emergency_phone = data.emergency_phone;
    this.is_active = data.is_active !== false;
    this.organization_id = data.organization_id;
    this.created_by = data.created_by;
    this.created_at = data.created_at || new Date().toISOString();
    this.updated_at = data.updated_at || new Date().toISOString();
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new Customer(data) : null;
    } catch (error) {
      console.error("Error finding customer by ID:", error);
      throw error;
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      let query = supabase
        .from("customers")
        .select("*")
        .eq("organization_id", organizationId);

      if (options.isActive !== undefined) {
        query = query.eq("is_active", options.isActive);
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        query = query.or(`
          name.ilike.%${searchTerm}%,
          phone.ilike.%${searchTerm}%,
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
      return data ? data.map((customer) => new Customer(customer)) : [];
    } catch (error) {
      console.error("Error finding customers by organization:", error);
      throw error;
    }
  }

  static async create(customerData) {
    try {
      const { data, error } = await supabase
        .from("customers")
        .insert([customerData])
        .select()
        .single();

      if (error) throw error;
      return new Customer(data);
    } catch (error) {
      console.error("Error creating customer:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updated_at = new Date().toISOString();

      if (this.id) {
        // Update existing customer
        const { data, error } = await supabase
          .from("customers")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new Customer(data);
      } else {
        // Create new customer
        return await Customer.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving customer:", error);
      throw error;
    }
  }

  async delete() {
    try {
      const { error } = await supabase
        .from("customers")
        .delete()
        .eq("id", this.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting customer:", error);
      throw error;
    }
  }

  toJSON() {
    return { ...this };
  }

  // Static method to get customer count by organization
  static async countByOrganization(organizationId) {
    try {
      const { count, error } = await supabase
        .from("customers")
        .select("*", { count: "exact", head: true })
        .eq("organization_id", organizationId)
        .eq("is_active", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting customers by organization:", error);
      throw error;
    }
  }
}

module.exports = Customer;