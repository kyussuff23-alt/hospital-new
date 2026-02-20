import { useState, useEffect } from "react";
import { useNavigate } from "react-router-dom";
import Provider from "./Provider";
import Batch from "./Batch";
import Account from "./Account";
import "bootstrap-icons/font/bootstrap-icons.css";
import logo from "./assets/nonsuch.jpg";
import { supabase } from "./supabaseClient";
import { useAuth } from "./AuthContext";
import Utilization from "./Utilization";
import GroupEnrolment from "./GroupEnrolment";
import Enrolment from "./Enrolment";
import { Bar } from "react-chartjs-2";
import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend,
} from "chart.js";

ChartJS.register(CategoryScale, LinearScale, BarElement, Title, Tooltip, Legend);

const CLOUD_NAME = import.meta.env.VITE_CLOUDINARY_NAME;
const UPLOAD_PRESET = import.meta.env.VITE_UPLOAD_PRESET;
const MAX_SIZE = 1024 * 1024; // 1 MB limit

export default function Dashboard() {
  const { setIsAuthenticated } = useAuth();
  const navigate = useNavigate();

  const [activePage, setActivePage] = useState("provider");
  const [showMenu, setShowMenu] = useState(false);
  const [profilePhoto, setProfilePhoto] = useState("https://via.placeholder.com/50");
  const [user, setUser] = useState(null);

  useEffect(() => {
    const getUser = async () => {
      const { data: { user }, error } = await supabase.auth.getUser();
      if (error) console.error("Error fetching user:", error.message);
      setUser(user);
    };
    getUser();
  }, []);

  useEffect(() => {
    const fetchProfilePhoto = async () => {
      if (!user) return;
      const { data: profile, error } = await supabase
        .from("profiles_photo")
        .select("profile_photo_url")
        .eq("id", user.id)
        .single();

      if (error) console.error("Error fetching profile photo:", error.message);
      if (profile?.profile_photo_url) setProfilePhoto(profile.profile_photo_url);
    };
    fetchProfilePhoto();
  }, [user]);

  async function handleLogout() {
    await supabase.auth.signOut();
    if (setIsAuthenticated) setIsAuthenticated(false);
    navigate("/");
  }

  const handleProfileClick = () => setShowMenu(!showMenu);

  const handleProfileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file) return;
    if (file.size > MAX_SIZE) {
      alert("File must be smaller than 1 MB");
      return;
    }
    try {
      const formData = new FormData();
      formData.append("file", file);
      formData.append("upload_preset", UPLOAD_PRESET);

      const res = await fetch(
        `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
        { method: "POST", body: formData }
      );

      const cloudinaryData = await res.json();
      const imageUrl = cloudinaryData.secure_url;
      if (!imageUrl) {
        alert("Upload failed: no URL returned from Cloudinary");
        return;
      }
      setProfilePhoto(imageUrl);
      if (user) {
        await supabase
          .from("profiles_photo")
          .upsert({ id: user.id, profile_photo_url: imageUrl });
      }
    } catch (error) {
      console.error("Upload error:", error);
    }
  };

  const chartData = {
    labels: ["Jan", "Feb", "Mar", "Apr"],
    datasets: [
      {
        label: "Claims Processed",
        data: [30, 45, 60, 40],
        backgroundColor: "rgba(54, 162, 235, 0.6)",
      },
    ],
  };

  return (
    <div className="d-flex">
      {/* Sidebar */}
      <div
        className="bg-dark text-white d-flex flex-column justify-content-between p-3"
        style={{ width: "220px", minHeight: "100vh" }}
      >
        <div>
          <div className="text-start mb-4">
            <img
              src={logo}
              alt="NONSUCH Logo"
              style={{ height: "40px", width: "120px" }}
            />
            <h6 className="mt-2">Nonsuch Portal</h6>
          </div>
          <ul className="nav flex-column">
            {[
              { key: "provider", icon: "bi-people-fill", label: "Provider" },
              { key: "batch", icon: "bi-box-seam", label: "Batch" },
              { key: "account", icon: "bi-person-circle", label: "Account" },
              { key: "claims", icon: "bi-file-earmark-medical", label: "Claims" },
              { key: "underwriting", icon: "bi-shield-check", label: "Underwriting" },
              { key: "groupEnrolment", icon: "bi-people", label: "Group Enrolment" },
              { key: "enrolment", icon: "bi-pencil-square", label: "Enrolment" },
              { key: "authorization", icon: "bi-check2-circle", label: "Authorization" },
            ].map((item) => (
              <li
                key={item.key}
                className="nav-item mb-2 p-2 rounded text-white"
                style={{ cursor: "pointer", transition: "0.3s" }}
                onClick={() => setActivePage(item.key)}
                onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "#0d6efd")}
                onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "")}
              >
                <i className={`${item.icon} me-2`}></i> {item.label}
              </li>
            ))}
          </ul>
        </div>

        {/* Profile at bottom of sidebar */}
        <div className="text-center mt-4">
          <img
            src={profilePhoto}
            alt="Profile"
            className="rounded-circle border border-primary mb-2"
            style={{ width: "60px", height: "60px", cursor: "pointer" }}
            onClick={handleProfileClick}
          />
          {showMenu && (
            <div className="mt-2">
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

      {/* Main Content */}
      <div className="flex-grow-1 p-4">
        {/* Header */}
        <div className="d-flex justify-content-between align-items-center mb-4">
          <h2 className="text-capitalize">{activePage}</h2>
        </div>

        {/* Analytics Cards */}
        <div className="row mb-4 g-3">
          <div className="col-md-4">
            <div className="card text-center shadow-sm h-100">
              <div className="card-body">
                <h6>Analytics soon </h6>
                <p className="display-6 text-primary">0000</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card text-center shadow-sm h-100">
              <div className="card-body">
                <h6>Analytics soon</h6>
                <p className="display-6 text-danger">45</p>
              </div>
            </div>
          </div>
          <div className="col-md-4">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h6>Analytics soon</h6>
                <Bar
                  data={chartData}
                  options={{
                    responsive: true,
                    plugins: { legend: { display: false } },
                  }}
                />
              </div>
            </div>
          </div>
        </div>
        {/* Dynamic content */}
        {activePage === "provider" && <Provider />}
        {activePage === "batch" && <Batch />}
        {activePage === "account" && <Account />}
        {activePage === "claims" && (
          <div className="card p-4 shadow-sm">
            <h5>Claims Section</h5>
            <p>This is where claims management will be displayed.</p>
          </div>
        )}
        {activePage === "underwriting" && <Utilization />}
        {activePage === "groupEnrolment" && <GroupEnrolment />}
        {activePage === "enrolment" && <Enrolment />}
        {activePage === "authorization" && (
          <div className="card p-4 shadow-sm">
            <h5>Authorization Section</h5>
            <p>This is where authorization workflows will be displayed.</p>
          </div>
        )}
      </div>
    </div>
  );
}
