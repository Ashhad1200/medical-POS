const { supabase } = require("../../config/supabase");

class Supplier {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.contactPerson = data.contactPerson;
    this.phone = data.phone;
    this.email = data.email;
    this.address = data.address;
    this.isActive = data.isActive !== false;
    this.organizationId = data.organizationId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new Supplier(data) : null;
    } catch (error) {
      console.error("Error finding supplier by ID:", error);
      throw error;
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      let query = supabase
        .from("suppliers")
        .select("*")
        .eq("organizationId", organizationId);

      if (options.isActive !== undefined) {
        query = query.eq("isActive", options.isActive);
      }

      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        query = query.or(`
          name.ilike.%${searchTerm}%,
          contactPerson.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%,
          phone.ilike.%${searchTerm}%
        `);
      }

      // Sorting
      if (options.sortBy) {
        const sortOrder = options.sortOrder || "asc";
        query = query.order(options.sortBy, { ascending: sortOrder === "asc" });
      } else {
        query = query.order("name", { ascending: true });
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
      return data ? data.map((supplier) => new Supplier(supplier)) : [];
    } catch (error) {
      console.error("Error finding suppliers by organization:", error);
      throw error;
    }
  }

  static async searchSuppliers(searchTerm, organizationId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select("*")
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .or(
          `
          name.ilike.%${searchTerm}%,
          contactPerson.ilike.%${searchTerm}%,
          email.ilike.%${searchTerm}%,
          phone.ilike.%${searchTerm}%
        `
        )
        .limit(limit);

      if (error) throw error;
      return data ? data.map((supplier) => new Supplier(supplier)) : [];
    } catch (error) {
      console.error("Error searching suppliers:", error);
      throw error;
    }
  }

  static async create(supplierData) {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .insert([supplierData])
        .select()
        .single();

      if (error) throw error;
      return new Supplier(data);
    } catch (error) {
      console.error("Error creating supplier:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updatedAt = new Date().toISOString();

      if (this.id) {
        // Update existing supplier
        const { data, error } = await supabase
          .from("suppliers")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new Supplier(data);
      } else {
        // Create new supplier
        return await Supplier.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving supplier:", error);
      throw error;
    }
  }

  async delete() {
    try {
      const { error } = await supabase
        .from("suppliers")
        .delete()
        .eq("id", this.id);

      if (error) throw error;
      return true;
    } catch (error) {
      console.error("Error deleting supplier:", error);
      throw error;
    }
  }

  // Static method to get supplier count by organization
  static async countByOrganization(organizationId) {
    try {
      const { count, error } = await supabase
        .from("suppliers")
        .select("*", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("isActive", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting suppliers by organization:", error);
      throw error;
    }
  }

  // Static method to get suppliers with medicine count
  static async getSuppliersWithMedicineCount(organizationId) {
    try {
      const { data, error } = await supabase
        .from("suppliers")
        .select(
          `
          *,
          medicines (
            id
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true);

      if (error) throw error;

      return data.map((supplier) => ({
        ...supplier,
        medicineCount: supplier.medicines ? supplier.medicines.length : 0,
      }));
    } catch (error) {
      console.error("Error getting suppliers with medicine count:", error);
      throw error;
    }
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      contactPerson: this.contactPerson,
      phone: this.phone,
      email: this.email,
      address: this.address,
      isActive: this.isActive,
      organizationId: this.organizationId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
    };
  }
}

module.exports = Supplier;
