const jwt = require('jsonwebtoken');
const { createClient } = require('@supabase/supabase-js');
const { supabase } = require('../config/supabase');

const auth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (!token) {
      return res.status(401).json({
        success: false,
        message: "Access token is required",
      });
    }

    // Verify token with Supabase
    const {
      data: { user },
      error,
    } = await supabase.auth.getUser(token);

    if (error || !user) {
      return res.status(401).json({
        success: false,
        message: "Invalid token",
      });
    }

    // Get user profile from database with organization data
    const { data: profile, error: profileError } = await supabase
      .from("users")
      .select(`
        *,
        organization:organizations!inner(
          id,
          name,
          access_valid_till,
          is_active
        )
      `)
      .eq("supabase_uid", user.id)
      .single();

    if (profileError || !profile) {
      return res.status(401).json({
        success: false,
        message: "User profile not found",
      });
    }

    if (!profile.is_active) {
      return res.status(401).json({
        success: false,
        message: "Account is deactivated",
      });
    }

    // Check organization access validity
    const now = new Date();
    const orgAccessValidTill = profile.organization?.access_valid_till;
    const isOrgActive = profile.organization?.is_active;
    
    if (isOrgActive === false) {
      return res.status(403).json({
        success: false,
        message: "Organization has been deactivated",
      });
    }
    
    if (orgAccessValidTill && new Date(orgAccessValidTill) < now) {
      return res.status(403).json({
        success: false,
        message: "Organization access has expired",
      });
    }

    // For server-side operations, we'll use the service role client
    // which has full access and doesn't require user sessions
    req.supabase = supabase;
    req.token = token;
    req.user = profile;
    
    console.log('Auth middleware - Using service role client for user:', {
      userId: user.id,
      organizationId: profile.organization_id,
      clientType: 'service_role'
    });
    next();
  } catch (error) {
    console.error("Auth middleware error:", error);
    res.status(401).json({
      success: false,
      message: "Please authenticate",
    });
  }
};

const checkRole = (roles) => {
  return (req, res, next) => {
    if (!req.user) {
      return res.status(401).json({
        success: false,
        message: "Authentication required",
      });
    }

    if (!roles.includes(req.user.role_in_pos)) {
      return res.status(403).json({
        success: false,
        message: "Access denied - insufficient permissions",
      });
    }
    next();
  };
};

// Optional middleware - doesn't fail if no token
const optionalAuth = async (req, res, next) => {
  try {
    const token = req.header("Authorization")?.replace("Bearer ", "");

    if (token) {
      const {
        data: { user },
        error,
      } = await supabase.auth.getUser(token);

      if (!error && user) {
        const { data: profile } = await supabase
          .from("users")
          .select(`
            *,
            organization:organizations!inner(
              id,
              name,
              access_valid_till,
              is_active
            )
          `)
          .eq("supabase_uid", user.id)
          .single();

        if (profile && profile.is_active) {
          // Check organization access validity for optional auth too
          const now = new Date();
          const orgAccessValidTill = profile.organization?.access_valid_till;
          const isOrgActive = profile.organization?.is_active;
          
          if (isOrgActive !== false && (!orgAccessValidTill || new Date(orgAccessValidTill) >= now)) {
            req.token = token;
            req.user = profile;
          }
        }
      }
    }

    next();
  } catch (error) {
    // Continue without auth if token is invalid
    next();
  }
};

module.exports = { auth, checkRole, optionalAuth };
