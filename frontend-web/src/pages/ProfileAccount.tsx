import { useParams, Navigate } from "react-router-dom";
import { useState, useEffect } from "react";
import ProfileHeader from "../components/profile/ProfileHeader";
import ProfileTabs from "../components/profile/ProfileTabs";
import { Settings, Shield, Bell, Lock, HelpCircle, Info } from "lucide-react";
import axios from "axios";
import type { User } from "../types";
import { getCurrentUser } from "../utils/auth";

const API_BASE_URL = "http://localhost:8080/api";

export default function ProfileAccount() {
  const { username } = useParams();

  // Redirect to posts tab by default
  return <Navigate to={`/profile/${username}/posts`} replace />;
}
