const { query, withTransaction } = require("../config/database");
const { validateEmail, validatePhone } = require("../utils/validators");
const { AppError } = require("../utils/errors");
const { randomUUID } = require("crypto");

class RefactoredSupplier {
  constructor(data = {}) {
    this.id = data.id;
    this.organizationId = data.organization_id || data.organizationId;
    this.supplierCode = data.supplier_code || data.supplierCode || null;
    this.name = data.name;
    this.contactPerson = data.contact_person || data.contactPerson;
    this.email = data.email;
    this.phone = data.phone;
    this.address = data.address;
    this.city = data.city;
    this.state = data.state;
    this.postalCode = data.postal_code || data.postalCode;
    this.country = data.country || "Pakistan";
    this.taxNumber = data.tax_number || data.taxNumber || null;
    this.creditLimit = parseFloat(data.credit_limit || data.creditLimit || 0);
    this.paymentTerms = parseInt(data.payment_terms || data.paymentTerms || 30);
    this.isActive =
      data.is_active !== undefined
        ? data.is_active
        : data.isActive !== undefined
        ? data.isActive
        : true;
    this.notes = data.notes;
    this.createdAt = data.created_at || data.createdAt;
    this.updatedAt = data.updated_at || data.updatedAt;
    this.createdBy = data.created_by || data.createdBy;
    // this.updatedBy = data.updated_by || data.updatedBy; // Column doesn't exist in database
  }

  // Validation methods
  validate() {
    const errors = [];

    if (!this.name || this.name.trim().length === 0) {
      errors.push("Supplier name is required");
    }

    if (!this.organizationId) {
      errors.push("Organization ID is required");
    }

    if (this.email && !validateEmail(this.email)) {
      errors.push("Invalid email format");
    }

    if (this.phone && !validatePhone(this.phone)) {
      errors.push("Invalid phone number format");
    }

    if (this.creditLimit < 0) {
      errors.push("Credit limit cannot be negative");
    }

    if (this.paymentTerms < 0) {
      errors.push("Payment terms cannot be negative");
    }

    if (errors.length > 0) {
      throw new AppError("Validation failed: " + errors.join(", "), 400);
    }

    return true;
  }

  // Convert to database format
  toDbFormat() {
    const baseData = {
      id: this.id,
      organization_id: this.organizationId,
      name: this.name?.trim(),
      contact_person: this.contactPerson?.trim(),
      email: this.email?.toLowerCase().trim(),
      phone: this.phone?.trim(),
      address: this.address?.trim(),
      is_active: this.isActive,
      created_by: this.createdBy,
    };

    // Add optional fields that might not exist in all database schemas
    if (this.supplierCode) {
      baseData.supplier_code = this.supplierCode;
    }
    if (this.city) {
      baseData.city = this.city.trim();
    }
    if (this.state) {
      baseData.state = this.state.trim();
    }
    if (this.postalCode) {
      baseData.postal_code = this.postalCode.trim();
    }
    if (this.country) {
      baseData.country = this.country.trim();
    }
    if (this.taxNumber) {
      baseData.tax_number = this.taxNumber.trim();
    }
    if (this.creditLimit !== undefined && this.creditLimit !== null) {
      baseData.credit_limit = parseFloat(this.creditLimit) || 0;
    }
    if (this.paymentTerms !== undefined && this.paymentTerms !== null) {
      baseData.payment_terms = parseInt(this.paymentTerms) || 30;
    }
    if (this.notes) {
      baseData.notes = this.notes.trim();
    }

    return baseData;
  }

  // Static methods for database operations
  static async findById(id, organizationId) {
    try {
      const result = await query(
        `SELECT * FROM suppliers WHERE id = $1 AND organization_id = $2`,
        [id, organizationId]
      );

      if (result.rows.length === 0) {
        throw new AppError("Supplier not found", 404);
      }

      return new RefactoredSupplier(result.rows[0]);
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch supplier: " + error.message, 500);
    }
  }

  static async findByOrganization(organizationId, options = {}) {
    try {
      const {
        page = 1,
        limit = 10,
        search = "",
        isActive = null,
        sortBy = "name",
        sortOrder = "asc",
      } = options;

      let whereConditions = ["organization_id = $1"];
      let params = [organizationId];
      let paramCount = 2;

      if (isActive !== null) {
        whereConditions.push(`is_active = $${paramCount}`);
        params.push(isActive);
        paramCount++;
      }

      if (search) {
        const searchTerm = `%${search}%`;
        whereConditions.push(
          `(name ILIKE $${paramCount} OR contact_person ILIKE $${
            paramCount + 1
          } OR email ILIKE $${paramCount + 2} OR phone ILIKE $${
            paramCount + 3
          })`
        );
        params.push(searchTerm, searchTerm, searchTerm, searchTerm);
        paramCount += 4;
      }

      const whereClause = whereConditions.join(" AND ");
      const validSortBy = ["name", "created_at", "is_active", "city"].includes(
        sortBy
      )
        ? sortBy
        : "name";
      const sortDirection = sortOrder === "asc" ? "ASC" : "DESC";
      const offset = (page - 1) * limit;

      // Get total count
      const countResult = await query(
        `SELECT COUNT(*) as total FROM suppliers WHERE ${whereClause}`,
        params
      );
      const total = parseInt(countResult.rows[0].total);

      // Get paginated results
      const result = await query(
        `SELECT * FROM suppliers 
                 WHERE ${whereClause}
                 ORDER BY ${validSortBy} ${sortDirection}
                 LIMIT $${paramCount} OFFSET $${paramCount + 1}`,
        [...params, limit, offset]
      );

      const suppliers = result.rows.map((row) => new RefactoredSupplier(row));

      return {
        suppliers,
        pagination: {
          page,
          limit,
          total,
          totalPages: Math.ceil(total / limit),
        },
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to fetch suppliers: " + error.message, 500);
    }
  }

  static async searchSuppliers(organizationId, searchTerm) {
    try {
      const searchPattern = `%${searchTerm}%`;
      const result = await query(
        `SELECT id, name, contact_person, email, phone, is_active FROM suppliers
                 WHERE organization_id = $1 
                 AND is_active = true
                 AND (name ILIKE $2 OR contact_person ILIKE $2 OR email ILIKE $2 OR phone ILIKE $2)
                 ORDER BY name ASC
                 LIMIT 20`,
        [organizationId, searchPattern]
      );

      return result.rows.map((row) => new RefactoredSupplier(row));
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to search suppliers: " + error.message, 500);
    }
  }

  static async getStats(organizationId) {
    try {
      const result = await query(
        `SELECT 
                    COUNT(*) as total,
                    SUM(CASE WHEN is_active = true THEN 1 ELSE 0 END) as active,
                    SUM(CASE WHEN is_active = false THEN 1 ELSE 0 END) as inactive
                 FROM suppliers 
                 WHERE organization_id = $1`,
        [organizationId]
      );

      const row = result.rows[0];
      return {
        total: parseInt(row.total),
        active: parseInt(row.active || 0),
        inactive: parseInt(row.inactive || 0),
      };
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to get supplier stats: " + error.message, 500);
    }
  }

  static async checkDuplicateEmail(email, organizationId, excludeId = null) {
    try {
      let query_text = `SELECT id FROM suppliers WHERE organization_id = $1 AND email = $2`;
      let params = [organizationId, email.toLowerCase().trim()];

      if (excludeId) {
        query_text += ` AND id != $3`;
        params.push(excludeId);
      }

      const result = await query(query_text, params);
      return result.rows.length > 0;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to check duplicate email: " + error.message,
        500
      );
    }
  }

  static async generateSupplierCode(organizationId, supplierName) {
    try {
      // Generate supplier code format: SUP-ORG_ID-TIMESTAMP-COUNTER
      const timestamp = Date.now().toString().slice(-8);

      // Find max counter for this org
      const result = await query(
        `SELECT COUNT(*) as count FROM suppliers WHERE organization_id = $1`,
        [organizationId]
      );

      const counter = (parseInt(result.rows[0].count) + 1)
        .toString()
        .padStart(5, "0");
      const supplierCode = `SUP-${organizationId.slice(
        0,
        4
      )}-${timestamp}-${counter}`;

      return supplierCode;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to generate supplier code: " + error.message,
        500
      );
    }
  }

  async save(userId) {
    try {
      this.validate();

      // Check for duplicate email
      if (this.email) {
        const isDuplicate = await RefactoredSupplier.checkDuplicateEmail(
          this.email,
          this.organizationId,
          this.id
        );
        if (isDuplicate) {
          throw new AppError("Email already exists for another supplier", 400);
        }
      }

      const dbData = this.toDbFormat();

      if (this.id) {
        // Update existing supplier
        delete dbData.id;
        delete dbData.created_by;

        const updates = [];
        const values = [];
        let paramCount = 1;

        Object.entries(dbData).forEach(([key, value]) => {
          updates.push(`${key} = $${paramCount++}`);
          values.push(value);
        });

        values.push(this.id, this.organizationId);

        const result = await query(
          `UPDATE suppliers SET ${updates.join(", ")}, updated_at = NOW()
                     WHERE id = $${paramCount++} AND organization_id = $${paramCount++}
                     RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to update supplier", 500);
        }

        // Log audit trail
        await this.logAudit("updated", userId, dbData);

        Object.assign(this, new RefactoredSupplier(result.rows[0]));
      } else {
        // Create new supplier
        // Generate UUID for new supplier if not provided
        if (!dbData.id) {
          dbData.id = randomUUID();
          this.id = dbData.id;
        }

        if (!this.supplierCode) {
          try {
            this.supplierCode = await RefactoredSupplier.generateSupplierCode(
              this.organizationId,
              this.name
            );
            dbData.supplier_code = this.supplierCode;
          } catch (codeError) {
            console.warn(
              "Failed to generate supplier code:",
              codeError.message
            );
            delete dbData.supplier_code;
          }
        }

        dbData.created_by = userId;

        const columns = Object.keys(dbData);
        const values = Object.values(dbData);
        const placeholders = values.map((_, i) => `$${i + 1}`).join(", ");

        const result = await query(
          `INSERT INTO suppliers (${columns.join(", ")}, created_at, updated_at)
                     VALUES (${placeholders}, NOW(), NOW())
                     RETURNING *`,
          values
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to create supplier", 500);
        }

        // Log audit trail
        try {
          await this.logAudit("created", userId, result.rows[0]);
        } catch (auditError) {
          console.warn("Failed to log audit trail:", auditError.message);
        }

        Object.assign(this, new RefactoredSupplier(result.rows[0]));
      }

      return this;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to save supplier: " + error.message, 500);
    }
  }

  async delete(userId) {
    try {
      // Check if supplier has any purchase orders
      const poResult = await query(
        `SELECT id FROM purchase_orders WHERE supplier_id = $1 LIMIT 1`,
        [this.id]
      );

      if (poResult.rows.length > 0) {
        // Soft delete - deactivate supplier
        this.isActive = false;
        await this.save(userId);
        await this.logAudit("deactivated", userId, { is_active: false });
        return { deleted: false, deactivated: true };
      } else {
        // Hard delete
        const result = await query(
          `DELETE FROM suppliers WHERE id = $1 AND organization_id = $2 RETURNING id`,
          [this.id, this.organizationId]
        );

        if (result.rows.length === 0) {
          throw new AppError("Failed to delete supplier", 500);
        }

        await this.logAudit("deleted", userId, this.toDbFormat());
        return { deleted: true, deactivated: false };
      }
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError("Failed to delete supplier: " + error.message, 500);
    }
  }

  async toggleStatus(userId) {
    try {
      this.isActive = !this.isActive;
      await this.save(userId);
      await this.logAudit(this.isActive ? "activated" : "deactivated", userId, {
        is_active: this.isActive,
      });
      return this;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to toggle supplier status: " + error.message,
        500
      );
    }
  }

  async logAudit(action, userId, changes = {}) {
    try {
      await query(
        `INSERT INTO supplier_audit_log (supplier_id, action, new_values, changed_by, created_at)
                 VALUES ($1, $2, $3, $4, NOW())`,
        [this.id, action, JSON.stringify(changes), userId]
      );
    } catch (error) {
      console.error("Failed to log audit trail:", error);
    }
  }

  // Get supplier's purchase order summary
  async getPurchaseOrderSummary() {
    try {
      const result = await query(
        `SELECT 
                    COUNT(*) as total_orders,
                    COALESCE(SUM(total_amount), 0) as total_amount,
                    status
                 FROM purchase_orders
                 WHERE supplier_id = $1
                 GROUP BY status`,
        [this.id]
      );

      const summary = {
        totalOrders: 0,
        totalAmount: 0,
        statusBreakdown: {},
      };

      result.rows.forEach((row) => {
        summary.totalOrders += parseInt(row.total_orders);
        summary.totalAmount += parseFloat(row.total_amount);
        summary.statusBreakdown[row.status] = parseInt(row.total_orders);
      });

      return summary;
    } catch (error) {
      if (error instanceof AppError) throw error;
      throw new AppError(
        "Failed to get purchase order summary: " + error.message,
        500
      );
    }
  }
}

module.exports = RefactoredSupplier;
