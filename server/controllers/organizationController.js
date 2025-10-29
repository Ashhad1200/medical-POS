const { query, withTransaction } = require("../config/database");

/**
 * Get all organizations (admin only)
 */
const getOrganizations = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can view all organizations",
      });
    }

    const { search, subscriptionTier, isActive } = req.query;

    let whereClause = "1=1";
    const params = [];

    if (search) {
      whereClause += ` AND (name ILIKE $${params.length + 1} OR code ILIKE $${params.length + 1})`;
      params.push(`%${search}%`);
    }

    if (subscriptionTier) {
      whereClause += ` AND subscription_tier = $${params.length + 1}`;
      params.push(subscriptionTier);
    }

    if (isActive !== undefined) {
      whereClause += ` AND is_active = $${params.length + 1}`;
      params.push(isActive === 'true');
    }

    const result = await query(
      `SELECT id, name, code, description, address, phone, email, website, logo_url,
              is_active, subscription_tier, max_users, current_users, trial_ends_at,
              access_valid_till, billing_email, tax_id, currency, timezone,
              created_at, updated_at
       FROM organizations
       WHERE ${whereClause}
       ORDER BY created_at DESC`,
      params
    );

    res.json({
      success: true,
      data: result.rows,
    });
  } catch (error) {
    console.error("Error fetching organizations:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organizations",
    });
  }
};

/**
 * Get single organization by ID
 */
const getOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin or belongs to this organization
    if (req.user.role_in_pos !== "admin" && req.user.organization_id !== id) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view this organization",
      });
    }

    const result = await query(
      `SELECT id, name, code, description, address, phone, email, website, logo_url,
              is_active, subscription_tier, max_users, current_users, trial_ends_at,
              access_valid_till, billing_email, tax_id, currency, timezone,
              created_at, updated_at
       FROM organizations
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    res.json({
      success: true,
      data: result.rows[0],
    });
  } catch (error) {
    console.error("Error fetching organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch organization",
    });
  }
};

/**
 * Create new organization (admin only)
 */
const createOrganization = async (req, res) => {
  try {
    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can create organizations",
      });
    }

    const {
      name,
      code,
      description,
      address,
      phone,
      email,
      website,
      logo_url,
      subscription_tier = "basic",
      max_users = 5,
      billing_email,
      tax_id,
      currency = "USD",
      timezone = "UTC",
    } = req.body;

    if (!name || !code) {
      return res.status(400).json({
        success: false,
        message: "Name and code are required",
      });
    }

    // Check if code already exists
    const existingOrg = await query(
      "SELECT id FROM organizations WHERE code = $1",
      [code]
    );

    if (existingOrg.rows.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Organization code already exists",
      });
    }

    const result = await query(
      `INSERT INTO organizations 
       (name, code, description, address, phone, email, website, logo_url,
        subscription_tier, max_users, billing_email, tax_id, currency, timezone, is_active)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13, $14, true)
       RETURNING *`,
      [
        name,
        code,
        description,
        address,
        phone,
        email,
        website,
        logo_url,
        subscription_tier,
        max_users,
        billing_email,
        tax_id,
        currency,
        timezone,
      ]
    );

    res.status(201).json({
      success: true,
      data: result.rows[0],
      message: "Organization created successfully",
    });
  } catch (error) {
    console.error("Error creating organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to create organization",
    });
  }
};

/**
 * Update organization (admin only)
 */
const updateOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update organizations",
      });
    }

    // Check if organization exists
    const orgCheck = await query(
      "SELECT id FROM organizations WHERE id = $1",
      [id]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const {
      name,
      code,
      description,
      address,
      phone,
      email,
      website,
      logo_url,
      subscription_tier,
      max_users,
      is_active,
      billing_email,
      tax_id,
      currency,
      timezone,
    } = req.body;

    // If code is being changed, check it doesn't already exist
    if (code) {
      const existingOrg = await query(
        "SELECT id FROM organizations WHERE code = $1 AND id != $2",
        [code, id]
      );

      if (existingOrg.rows.length > 0) {
        return res.status(400).json({
          success: false,
          message: "Organization code already exists",
        });
      }
    }

    const updates = [];
    const values = [];
    let paramIndex = 1;

    if (name !== undefined) {
      updates.push(`name = $${paramIndex}`);
      values.push(name);
      paramIndex++;
    }

    if (code !== undefined) {
      updates.push(`code = $${paramIndex}`);
      values.push(code);
      paramIndex++;
    }

    if (description !== undefined) {
      updates.push(`description = $${paramIndex}`);
      values.push(description);
      paramIndex++;
    }

    if (address !== undefined) {
      updates.push(`address = $${paramIndex}`);
      values.push(address);
      paramIndex++;
    }

    if (phone !== undefined) {
      updates.push(`phone = $${paramIndex}`);
      values.push(phone);
      paramIndex++;
    }

    if (email !== undefined) {
      updates.push(`email = $${paramIndex}`);
      values.push(email);
      paramIndex++;
    }

    if (website !== undefined) {
      updates.push(`website = $${paramIndex}`);
      values.push(website);
      paramIndex++;
    }

    if (logo_url !== undefined) {
      updates.push(`logo_url = $${paramIndex}`);
      values.push(logo_url);
      paramIndex++;
    }

    if (subscription_tier !== undefined) {
      updates.push(`subscription_tier = $${paramIndex}`);
      values.push(subscription_tier);
      paramIndex++;
    }

    if (max_users !== undefined) {
      updates.push(`max_users = $${paramIndex}`);
      values.push(max_users);
      paramIndex++;
    }

    if (is_active !== undefined) {
      updates.push(`is_active = $${paramIndex}`);
      values.push(is_active);
      paramIndex++;
    }

    if (billing_email !== undefined) {
      updates.push(`billing_email = $${paramIndex}`);
      values.push(billing_email);
      paramIndex++;
    }

    if (tax_id !== undefined) {
      updates.push(`tax_id = $${paramIndex}`);
      values.push(tax_id);
      paramIndex++;
    }

    if (currency !== undefined) {
      updates.push(`currency = $${paramIndex}`);
      values.push(currency);
      paramIndex++;
    }

    if (timezone !== undefined) {
      updates.push(`timezone = $${paramIndex}`);
      values.push(timezone);
      paramIndex++;
    }

    updates.push(`updated_at = now()`);

    values.push(id);

    const result = await query(
      `UPDATE organizations SET ${updates.join(", ")} WHERE id = $${paramIndex} RETURNING *`,
      values
    );

    res.json({
      success: true,
      data: result.rows[0],
      message: "Organization updated successfully",
    });
  } catch (error) {
    console.error("Error updating organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update organization",
    });
  }
};

/**
 * Delete organization (admin only)
 */
const deleteOrganization = async (req, res) => {
  try {
    const { id } = req.params;

    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can delete organizations",
      });
    }

    // Check if organization exists
    const orgCheck = await query(
      "SELECT id, current_users FROM organizations WHERE id = $1",
      [id]
    );

    if (orgCheck.rows.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Organization not found",
      });
    }

    const org = orgCheck.rows[0];

    if (org.current_users > 0) {
      return res.status(400).json({
        success: false,
        message: `Cannot delete organization with ${org.current_users} active users. Delete all users first.`,
      });
    }

    await withTransaction(async (client) => {
      // Delete organization
      await client.query("DELETE FROM organizations WHERE id = $1", [id]);

      // Delete related data if needed
      await client.query("DELETE FROM organization_ledger WHERE organization_id = $1", [id]);
    });

    res.json({
      success: true,
      message: "Organization deleted successfully",
    });
  } catch (error) {
    console.error("Error deleting organization:", error);
    res.status(500).json({
      success: false,
      message: "Failed to delete organization",
    });
  }
};

/**
 * Get organization permissions
 */
const getOrganizationPermissions = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Check if user is admin or belongs to this organization
    if (req.user.role_in_pos !== "admin" && req.user.organization_id !== organizationId) {
      return res.status(403).json({
        success: false,
        message: "You don't have permission to view these permissions",
      });
    }

    // Get all users for this organization and their permissions
    const result = await query(
      `SELECT id, username, email, role_in_pos as role, permissions
       FROM users WHERE organization_id = $1 AND is_active = true
       ORDER BY created_at`,
      [organizationId]
    );

    res.json({
      success: true,
      data: {
        organizationId,
        users: result.rows,
      },
    });
  } catch (error) {
    console.error("Error fetching permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to fetch permissions",
    });
  }
};

/**
 * Update organization permissions
 */
const updateOrganizationPermissions = async (req, res) => {
  try {
    const { organizationId } = req.params;
    const { userPermissions } = req.body;

    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can update permissions",
      });
    }

    if (!userPermissions || typeof userPermissions !== "object") {
      return res.status(400).json({
        success: false,
        message: "Invalid permissions data",
      });
    }

    // Update permissions for each user
    for (const userId in userPermissions) {
      const permissions = userPermissions[userId];
      await query(
        `UPDATE users SET permissions = $1, updated_at = now() 
         WHERE id = $2 AND organization_id = $3`,
        [JSON.stringify(permissions), userId, organizationId]
      );
    }

    res.json({
      success: true,
      message: "Permissions updated successfully",
    });
  } catch (error) {
    console.error("Error updating permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to update permissions",
    });
  }
};

/**
 * Reset organization permissions to defaults
 */
const resetOrganizationPermissions = async (req, res) => {
  try {
    const { organizationId } = req.params;

    // Check if user is admin
    if (req.user.role_in_pos !== "admin") {
      return res.status(403).json({
        success: false,
        message: "Only admins can reset permissions",
      });
    }

    // Reset all users' permissions to empty object
    await query(
      `UPDATE users SET permissions = '{}', updated_at = now() 
       WHERE organization_id = $1`,
      [organizationId]
    );

    res.json({
      success: true,
      message: "Permissions reset successfully",
    });
  } catch (error) {
    console.error("Error resetting permissions:", error);
    res.status(500).json({
      success: false,
      message: "Failed to reset permissions",
    });
  }
};

module.exports = {
  getOrganizations,
  getOrganization,
  createOrganization,
  updateOrganization,
  deleteOrganization,
  getOrganizationPermissions,
  updateOrganizationPermissions,
  resetOrganizationPermissions,
};
