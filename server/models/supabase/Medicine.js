const { supabase } = require("../../config/supabase");

class Medicine {
  constructor(data = {}) {
    this.id = data.id;
    this.name = data.name;
    this.genericName = data.genericName;
    this.manufacturer = data.manufacturer;
    this.batchNumber = data.batchNumber;
    this.sellingPrice = data.sellingPrice;
    this.costPrice = data.costPrice;
    this.gstPerUnit = data.gstPerUnit || 0;
    this.gstRate = data.gstRate || 0;
    this.quantity = data.quantity || 0;
    this.lowStockThreshold = data.lowStockThreshold || 10;
    this.expiryDate = data.expiryDate;
    this.category = data.category;
    this.description = data.description;
    this.isActive = data.isActive !== false;
    this.organizationId = data.organizationId;
    this.supplierId = data.supplierId;
    this.createdAt = data.createdAt || new Date().toISOString();
    this.updatedAt = data.updatedAt || new Date().toISOString();
  }

  // Static methods for database operations
  static async findById(id) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("id", id)
        .single();

      if (error) throw error;
      return data ? new Medicine(data) : null;
    } catch (error) {
      console.error("Error finding medicine by ID:", error);
      throw error;
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      let query = supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId);

      if (options.isActive !== undefined) {
        query = query.eq("isActive", options.isActive);
      }

      if (options.category) {
        query = query.eq("category", options.category);
      }

      if (options.manufacturer) {
        query = query.eq("manufacturer", options.manufacturer);
      }

      if (options.supplierId) {
        query = query.eq("supplierId", options.supplierId);
      }

      if (options.lowStock) {
        query = query.lte("quantity", supabase.raw("lowStockThreshold"));
      }

      if (options.outOfStock) {
        query = query.eq("quantity", 0);
      }

      if (options.expired) {
        query = query.lt("expiryDate", new Date().toISOString());
      }

      if (options.expiringSoon) {
        const thirtyDaysFromNow = new Date();
        thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
        query = query
          .gte("expiryDate", new Date().toISOString())
          .lte("expiryDate", thirtyDaysFromNow.toISOString());
      }

      // Search functionality
      if (options.search) {
        const searchTerm = options.search.toLowerCase();
        query = query.or(`
          name.ilike.%${searchTerm}%,
          genericName.ilike.%${searchTerm}%,
          manufacturer.ilike.%${searchTerm}%,
          category.ilike.%${searchTerm}%,
          batchNumber.ilike.%${searchTerm}%
        `);
      }

      // Sorting
      if (options.sortBy) {
        const sortOrder = options.sortOrder || "asc";
        query = query.order(options.sortBy, { ascending: sortOrder === "asc" });
      } else {
        query = query.order("createdAt", { ascending: false });
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
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error finding medicines by organization:", error);
      throw error;
    }
  }

  static async searchMedicines(searchTerm, organizationId, limit = 10) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .gt("quantity", 0)
        .or(
          `
          name.ilike.%${searchTerm}%,
          genericName.ilike.%${searchTerm}%,
          manufacturer.ilike.%${searchTerm}%,
          category.ilike.%${searchTerm}%,
          batchNumber.ilike.%${searchTerm}%
        `
        )
        .limit(limit);

      if (error) throw error;
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error searching medicines:", error);
      throw error;
    }
  }

  static async findLowStock(organizationId) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .gt("quantity", 0)
        .lte("quantity", supabase.raw("lowStockThreshold"));

      if (error) throw error;
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error finding low stock medicines:", error);
      throw error;
    }
  }

  static async findOutOfStock(organizationId) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .eq("quantity", 0);

      if (error) throw error;
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error finding out of stock medicines:", error);
      throw error;
    }
  }

  static async findExpired(organizationId) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .lt("expiryDate", new Date().toISOString());

      if (error) throw error;
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error finding expired medicines:", error);
      throw error;
    }
  }

  static async findExpiringSoon(organizationId, days = 30) {
    try {
      const currentDate = new Date();
      const futureDate = new Date();
      futureDate.setDate(futureDate.getDate() + days);

      const { data, error } = await supabase
        .from("medicines")
        .select(
          `
          *,
          suppliers (
            id,
            name,
            contactPerson,
            phone,
            email
          )
        `
        )
        .eq("organizationId", organizationId)
        .eq("isActive", true)
        .gte("expiryDate", currentDate.toISOString())
        .lte("expiryDate", futureDate.toISOString());

      if (error) throw error;
      return data ? data.map((medicine) => new Medicine(medicine)) : [];
    } catch (error) {
      console.error("Error finding medicines expiring soon:", error);
      throw error;
    }
  }

  static async create(medicineData) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .insert([medicineData])
        .select()
        .single();

      if (error) throw error;
      return new Medicine(data);
    } catch (error) {
      console.error("Error creating medicine:", error);
      throw error;
    }
  }

  async save() {
    try {
      this.updatedAt = new Date().toISOString();

      if (this.id) {
        // Update existing medicine
        const { data, error } = await supabase
          .from("medicines")
          .update(this.toJSON())
          .eq("id", this.id)
          .select()
          .single();

        if (error) throw error;
        return new Medicine(data);
      } else {
        // Create new medicine
        return await Medicine.create(this.toJSON());
      }
    } catch (error) {
      console.error("Error saving medicine:", error);
      throw error;
    }
  }

  async updateQuantity(newQuantity) {
    try {
      this.quantity = Math.max(0, newQuantity);
      this.updatedAt = new Date().toISOString();

      const { data, error } = await supabase
        .from("medicines")
        .update({
          quantity: this.quantity,
          updatedAt: this.updatedAt,
        })
        .eq("id", this.id)
        .select()
        .single();

      if (error) throw error;
      Object.assign(this, data);
      return this;
    } catch (error) {
      console.error("Error updating medicine quantity:", error);
      throw error;
    }
  }

  async reduceQuantity(amount) {
    if (this.quantity < amount) {
      throw new Error("Insufficient stock");
    }
    return this.updateQuantity(this.quantity - amount);
  }

  async addQuantity(amount) {
    return this.updateQuantity(this.quantity + amount);
  }

  // Computed properties
  get isLowStock() {
    return this.quantity > 0 && this.quantity <= this.lowStockThreshold;
  }

  get isOutOfStock() {
    return this.quantity === 0;
  }

  get isExpired() {
    return new Date(this.expiryDate) < new Date();
  }

  get isExpiringSoon() {
    const thirtyDaysFromNow = new Date();
    thirtyDaysFromNow.setDate(thirtyDaysFromNow.getDate() + 30);
    return (
      new Date(this.expiryDate) <= thirtyDaysFromNow &&
      new Date(this.expiryDate) > new Date()
    );
  }

  get stockStatus() {
    if (this.quantity === 0) return "Out of Stock";
    if (this.isLowStock) return "Low Stock";
    if (this.isExpired) return "Expired";
    if (this.isExpiringSoon) return "Expiring Soon";
    return "In Stock";
  }

  get profitMargin() {
    if (this.costPrice === 0) return 0;
    return Math.round(
      ((this.sellingPrice - this.costPrice) / this.costPrice) * 100
    );
  }

  get totalValue() {
    return this.quantity * this.sellingPrice;
  }

  get daysToExpiry() {
    const today = new Date();
    const expiry = new Date(this.expiryDate);
    const diffTime = expiry - today;
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    return diffDays;
  }

  toJSON() {
    return {
      id: this.id,
      name: this.name,
      genericName: this.genericName,
      manufacturer: this.manufacturer,
      batchNumber: this.batchNumber,
      sellingPrice: this.sellingPrice,
      costPrice: this.costPrice,
      gstPerUnit: this.gstPerUnit,
      gstRate: this.gstRate,
      quantity: this.quantity,
      lowStockThreshold: this.lowStockThreshold,
      expiryDate: this.expiryDate,
      category: this.category,
      description: this.description,
      isActive: this.isActive,
      organizationId: this.organizationId,
      supplierId: this.supplierId,
      createdAt: this.createdAt,
      updatedAt: this.updatedAt,
      // Computed properties
      isLowStock: this.isLowStock,
      isOutOfStock: this.isOutOfStock,
      isExpired: this.isExpired,
      isExpiringSoon: this.isExpiringSoon,
      stockStatus: this.stockStatus,
      profitMargin: this.profitMargin,
      totalValue: this.totalValue,
      daysToExpiry: this.daysToExpiry,
    };
  }

  // Static method to get medicine count by organization
  static async countByOrganization(organizationId) {
    try {
      const { count, error } = await supabase
        .from("medicines")
        .select("*", { count: "exact", head: true })
        .eq("organizationId", organizationId)
        .eq("isActive", true);

      if (error) throw error;
      return count || 0;
    } catch (error) {
      console.error("Error counting medicines by organization:", error);
      throw error;
    }
  }

  // Static method to get total inventory value by organization
  static async getTotalInventoryValue(organizationId) {
    try {
      const { data, error } = await supabase
        .from("medicines")
        .select("quantity, sellingPrice")
        .eq("organizationId", organizationId)
        .eq("isActive", true);

      if (error) throw error;

      const totalValue = data.reduce((sum, medicine) => {
        return sum + medicine.quantity * medicine.sellingPrice;
      }, 0);

      return totalValue;
    } catch (error) {
      console.error("Error calculating total inventory value:", error);
      throw error;
    }
  }
}

module.exports = Medicine;
