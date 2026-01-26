import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Provider from "./Provider";
import Batch from "./Batch";
import Account from "./Account";
import "bootstrap-icons/font/bootstrap-icons.css";
import logo from "./assets/nonsuch.jpg";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";

// Cloudinary config
const CLOUD_NAME = "dqtqyiwt7"; // your cloud name
const UPLOAD_PRESET = "UPLOAD_PRESET"; // the preset you created in Cloudinary
const MAX_SIZE = 1024 * 1024; // 1 MB limit

export default function Dashboard() {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState(null);
  const [showMenu, setShowMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("https://via.placeholder.com/50");

  // ✅ Fetch profile photo from Supabase on mount
  useEffect(() => {
    const fetchProfilePhoto = async () => {
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data: profile, error } = await supabase
          .from("profiles_photo")
          .select("profile_photo_url")
          .eq("id", user.id)
          .single();

        if (error) {
          console.error("Error fetching profile photo:", error.message);
        }

        if (profile?.profile_photo_url) {
          setProfilePhoto(profile.profile_photo_url);
        }
      }
    };

    fetchProfilePhoto();
  }, []);

  async function handleLogout() {
    await supabase.auth.signOut();
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/");
  }

  const handleProfileClick = () => {
    setShowMenu(!showMenu);
  };

  // ✅ Upload to Cloudinary with size restriction
  const handleProfileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;

    // Restrict file size
    if (file.size > MAX_SIZE) {
      alert("File must be smaller than 1 MB");
      return;
    }

    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      // Upload to Cloudinary
      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        {
          method: "POST",
          body: formData,
        }
      );

      const cloudinaryData = await res.json();
      console.log("Cloudinary response:", cloudinaryData);

      const imageUrl = cloudinaryData.secure_url;

      if (!imageUrl) {
        alert("Upload failed: no URL returned from Cloudinary");
        return;
      }

      // Update UI immediately
      setProfilePhoto(imageUrl);

      // Save URL in Supabase
      const {
        data: { user },
      } = await supabase.auth.getUser();

      if (user) {
        const { data, error } = await supabase
          .from("profiles_photo")
          .upsert({ id: user.id, profile_photo_url: imageUrl });

        if (error) {
          console.error("Supabase insert error:", error.message);
        } else {
          console.log("Supabase insert success:", data);
        }
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  return (
    <div className="container mt-4">
      {/* Header with centered logo/title and profile circle */}
      <div className="d-flex justify-content-between align-items-center mb-4">
        <h1 className="mx-auto text-center">
          <img
            src={logo}
            alt="NONSUCH Logo"
            style={{ height: "80px", width: "200px", marginRight: "10px" }}
          />
          Nonsuch Operation Portal
        </h1>

        {/* Profile circle */}
        <div className="position-relative">
          <img
            src={profilePhoto}
            alt="Profile"
            className="rounded-circle"
            style={{ width: "50px", height: "50px", cursor: "pointer" }}
            onClick={handleProfileClick}
          />

          {/* Dropdown menu */}
          {showMenu && (
            <div
              className="position-absolute end-0 mt-2 p-2 bg-white shadow rounded"
              style={{ minWidth: "150px" }}
            >
              <label
                className="btn btn-sm btn-outline-primary w-100 mb-2"
                htmlFor="profileInput"
              >
                Upload Photo
              </label>
              <input
                type="file"
                id="profileInput"
                accept="image/*"
                style={{ display: "none" }}
                onChange={handleProfileUpload}
              />
              <button
                className="btn btn-sm btn-danger w-100"
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>
          )}
        </div>
      </div>

      {/* Icon grid for navigation */}
      <div className="row text-center g-4">
        <div className="col-4 col-md-2" onClick={() => setActivePage("provider")}>
          <i className="bi bi-people-fill display-4 text-primary"></i>
          <p className="small">Provider</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("batch")}>
          <i className="bi bi-box-seam display-4 text-success"></i>
          <p className="small">Batch</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("account")}>
          <i className="bi bi-person-circle display-4 text-warning"></i>
          <p className="small">Account</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("claims")}>
          <i className="bi bi-file-earmark-medical display-4 text-danger"></i>
          <p className="small">Claims</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("underwriting")}>
          <i className="bi bi-shield-check display-4 text-info"></i>
          <p className="small">Underwriting</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("groupEnrolment")}>
          <i className="bi bi-people display-4 text-secondary"></i>
          <p className="small">Group Enrolment</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("enrolment")}>
          <i className="bi bi-pencil-square display-4 text-dark"></i>
          <p className="small">Enrolment</p>
        </div>
        <div className="col-4 col-md-2" onClick={() => setActivePage("authorization")}>
          <i className="bi bi-check2-circle display-4 text-success"></i>
          <p className="small">Authorization</p>
        </div>
      </div>

      {/* Dynamic content */}
      <div className="mt-4">
        {activePage === "provider" && <Provider />}
        {activePage === "batch" && <Batch />}
        {activePage === "account" && <Account />}
        {/* Add components for Claims, Underwriting, Group Enrolment, Enrolment, Authorization */}
      </div>
    </div>
  );
}
