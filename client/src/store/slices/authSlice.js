import { createSlice, createAsyncThunk } from "@reduxjs/toolkit";
import api from "../../services/api";

// Async thunks
export const loginUser = createAsyncThunk(
  "auth/login",
  async ({ email, password }, { rejectWithValue }) => {
    try {
      const response = await api.post("/auth/login", { email, password });
      const { session, user } = response.data.data;

      // Set Supabase session
      const { error } = await supabase.auth.setSession(session);
      if (error) throw error;

      return { user };
    } catch (error) {
      return rejectWithValue(error.message || "Login failed");
    }
  }
);

export const logoutUser = createAsyncThunk(
  "auth/logout",
  async (_, { rejectWithValue }) => {
    try {
      localStorage.removeItem("token");
      return null;
    } catch (error) {
      return rejectWithValue("Logout failed");
    }
  }
);

export const getCurrentUser = createAsyncThunk(
  "auth/getCurrentUser",
  async (_, { rejectWithValue }) => {
    try {
      const token = localStorage.getItem("token");
      if (!token) {
        throw new Error("No token found");
      }

      const response = await api.get("/auth/profile");
      return response.data.data.user;
    } catch (error) {
      localStorage.removeItem("token");
      return rejectWithValue(
        error.response?.data?.message || "Failed to get user"
      );
    }
  }
);

// Initialize state with token from localStorage
const token =
  typeof window !== "undefined" ? localStorage.getItem("token") : null;

const initialState = {
  user: null,
  profile: null,
};

const authSlice = createSlice({
  name: "auth",
  initialState,
  reducers: {
    setUserProfile: (state, action) => {
      state.user = action.payload.user;
      state.profile = action.payload.profile;
    },
    clearUserProfile: (state) => {
      state.user = null;
      state.profile = null;
    },
  },
});

export const { setUserProfile, clearUserProfile } = authSlice.actions;
export default authSlice.reducer;
