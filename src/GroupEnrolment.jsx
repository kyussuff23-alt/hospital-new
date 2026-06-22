import { useState, useEffect } from "react";
import { supabase } from "./supabaseClient";
import RegisterGroup from "./RegisterGroup";
import UpdateGroup from "./UpdateGroup";

export default function GroupEnrolment() {
  const [groups, setGroups] = useState([]);
  const [selectedGroup, setSelectedGroup] = useState(null);
  const [showRegisterModal, setShowRegisterModal] = useState(false);
  const [showUpdateModal, setShowUpdateModal] = useState(false);
  const [notifications, setNotifications] = useState([]);

  useEffect(() => {
    fetchGroups();
  }, []);

  async function fetchGroups() {
    const { data, error } = await supabase.from("mygroup").select("*").order("id");
    if (error) {
      console.error(error);
    } else {
      setGroups(data);
      checkPremiumNotifications(data); // run automatic check
    }
  }

  // ✅ Difference between today and premiumend
  function getDaysUntilExpiry(endDate) {
    if (!endDate) return null;
    const today = new Date();
    const end = new Date(endDate);
    const diffTime = end - today;
    return Math.floor(diffTime / (1000 * 60 * 60 * 24)); // days
  }

  function checkPremiumNotifications(data) {
    const notes = [];
    data.forEach((g) => {
      const diff = getDaysUntilExpiry(g.premiumend);
      if (diff !== null) {
        if (diff <= 10 && diff > 0) {
          notes.push(`⚠️ Premium for ${g.name} is about to expire (${diff} days left).`);
        }
        if (diff === 0) {
          notes.push(`❌ Premium for ${g.name} has expired today.`);
        }
        if (diff < 0) {
          notes.push(`❌ Premium for ${g.name} expired ${Math.abs(diff)} days ago.`);
        }
      }
    });
    setNotifications(notes);
  }

  async function handleDeactivate(id) {
    if (window.confirm("Deactivate this group?")) {
      const { error } = await supabase
        .from("mygroup")
        .update({ activate: "Inactive" })
        .eq("id", id);
      if (error) console.error(error);
      else fetchGroups();
    }
  }

  return (
    <div className="container mt-4">
      {/* ⚠️ CORRECTION: Transformed the stock primary button into an elegant action link */}
<div className="mb-3">
  <span
    className="text-primary fw-semibold d-inline-flex align-items-center"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={() => setShowRegisterModal(true)}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Professional darker blue on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-plus-circle-fill me-2" style={{ fontSize: "1.1rem" }}></i> 
    Register Client
  </span>
</div>


      {/* Automatic Notifications */}
      {notifications.length > 0 && (
        <div className="alert alert-warning">
          {notifications.map((n, i) => (
            <div key={i}>{n}</div>
          ))}
        </div>
      )}

      <table className="table table-bordered table-striped">
        <thead className="table-dark">
          <tr>
            <th>S/N</th>
            <th>Name</th>
            <th>Policy Status</th>
            <th>Plan</th>
            <th>Premium Start</th>
            <th>Premium End</th>
            <th>Effective Date</th>
            <th>Premium</th>
            <th>Family Status</th>
            <th>Band Allowed</th>
         
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          {groups.map((g, i) => (
            <tr key={g.id}>
              <td>{i + 1}</td>
              <td>{g.name}</td>
              <td>{g.policystatus}</td>
              <td>{g.plan}</td>
              <td>{g.premiumstart}</td>
              <td>{g.premiumend}</td>
              <td>{g.effectivedate}</td>
              <td>
  {g.premium !== null && g.premium !== undefined
    ? `₦${g.premium.toLocaleString()}`
    : ""}
</td>

              <td>{g.familystatus}</td>
              <td>{g.bandallowed}</td>
            
              <td>
               {/* ⚠️ CORRECTION: Transformed grouped action buttons into clean, inline text action links */}
<div className="d-flex align-items-center gap-3">
  
  {/* Update Action Link */}
  <span
    className="text-primary fw-medium d-inline-flex align-items-center small"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={() => {
      setSelectedGroup(g);
      setShowUpdateModal(true);
    }}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#0a58ca")} // Darker dashboard blue on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-pencil-square me-1"></i> Update
  </span>

  {/* Deactivate Action Link */}
  <span
    className="text-danger fw-medium d-inline-flex align-items-center small"
    style={{ cursor: "pointer", transition: "color 0.2s ease" }}
    onClick={() => handleDeactivate(g.id)}
    onMouseEnter={(e) => (e.currentTarget.style.color = "#a51d24")} // Darker red on hover
    onMouseLeave={(e) => (e.currentTarget.style.color = "")}
  >
    <i className="bi bi-dash-circle-fill me-1"></i> Deactivate
  </span>

</div>

              </td>
            </tr>
          ))}
        </tbody>
      </table>

      {showRegisterModal && (
        <RegisterGroup
          onClose={() => setShowRegisterModal(false)}
          onRegistered={fetchGroups}
        />
      )}
      {showUpdateModal && (
        <UpdateGroup
          group={selectedGroup}
          onClose={() => setShowUpdateModal(false)}
          onUpdated={fetchGroups}
        />
      )}
    </div>
  );
}
